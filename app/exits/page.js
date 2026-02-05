'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/database';
import { Helpers } from '../lib/utils/helpers';

export default function ExitsPage() {
    const [showForm, setShowForm] = useState(false);
    const [exits, setExits] = useState([]);
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [warehouse, setWarehouse] = useState('2'); // Default to Instrumentacion
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [requester, setRequester] = useState('');
    const [notes, setNotes] = useState('');
    const [availableStock, setAvailableStock] = useState('');

    const [availableProducts, setAvailableProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [requesterMode, setRequesterMode] = useState('select'); // 'select' or 'text'
    const [fullInventory, setFullInventory] = useState([]);
    const [isTransfer, setIsTransfer] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('currentUser');
            if (saved) {
                const user = JSON.parse(saved);
                setCurrentUser(user);
                // Auto-fill requester for non-admins
                if (user.rol !== 'ADMIN' && user.rol !== 'SUPERVISOR') {
                    setRequester(user.nombre_completo);
                }
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            updateProductOptions();
        }
    }, [warehouse, fullInventory]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [movementsData, inventoryData, usersData] = await Promise.all([
                DB.getAllMovements(),
                DB.getInventory(),
                DB.getAllUsers()
            ]);

            const exitMovements = movementsData
                .filter(m => m.tipo === 'SAL' && m.estado !== 'R')
                .sort((a, b) => new Date(b.fechaHoraSolicitud) - new Date(a.fechaHoraSolicitud));

            setExits(exitMovements);
            setFullInventory(inventoryData || []);
            setUsers((usersData || []).filter(u => u.rol !== 'ADMIN')); // Filter out admins for requester list if desired? 

        } catch (error) {
            console.error("Error loading exits data:", error);
            showToast('Error', 'No se pudieron cargar los datos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const isOperator = currentUser && currentUser.rol !== 'ADMIN' && currentUser.rol !== 'SUPERVISOR';

    const updateProductOptions = () => {
        const idBodega = parseInt(warehouse);
        // Filter inventory for selected warehouse and positive stock
        const validInventory = fullInventory.filter(i => i.id_bodega === idBodega && i.stock > 0);

        const products = validInventory.map(i => {
            // i.producto is already hydrated by DB.getInventory
            const p = i.producto;
            return p ? { ...p, stock: i.stock } : null;
        }).filter(Boolean);

        setAvailableProducts(products);

        // Reset selection if it's no longer valid
        if (productId) {
            const stillAvailable = products.find(p => String(p.id) === String(productId) || String(p.codigo_producto) === String(productId));
            if (!stillAvailable) {
                setProductId('');
                setAvailableStock('');
            } else {
                setAvailableStock(`${stillAvailable.stock} ${stillAvailable.unidad_medida?.toLowerCase() || ''}`);
            }
        }
    };

    const handleProductChange = (e) => {
        const id = e.target.value;
        setProductId(id);

        const productWithStock = availableProducts.find(p => String(p.id) === String(id) || String(p.codigo_producto) === String(id));

        if (productWithStock) {
            setAvailableStock(`${productWithStock.stock} ${productWithStock.unidad_medida?.toLowerCase() || ''}`);
        } else {
            setAvailableStock('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!productId || !quantity || parseFloat(quantity) <= 0 || !requester) {
            showToast('Datos Incompletos', 'Completa todos los campos requeridos', 'error');
            return;
        }

        const productWithStock = availableProducts.find(p => String(p.id) === String(productId) || String(p.codigo_producto) === String(productId));

        if (!productWithStock || productWithStock.stock < parseFloat(quantity)) {
            showToast('Stock Insuficiente', `Solo hay ${productWithStock?.stock || 0} ${productWithStock?.unidad_medida?.toLowerCase() || ''} disponibles`, 'error');
            return;
        }

        const currentUserLocal = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('currentUser') || '{}') : {};
        const canCreateDirect = currentUserLocal.rol === 'ADMIN' || currentUserLocal.rol === 'SUPERVISOR';

        setIsLoading(true);
        try {
            const movementData = {
                tipo: 'SAL',
                codigo_producto: productWithStock.codigo_producto,
                cantidad: parseFloat(quantity),
                id_bodega_origen: parseInt(warehouse),
                id_bodega_destino: null,
                id_solicitante: currentUserLocal.id_usuario || 1,
                // We need to store extra info? DB schema for movimiento has solicitante FK. 
                // If requester is external/text, we might need to handle it.
                // Assuming schema supports arbitrary text if FK is null?
                // Looking at DB schema: id_solicitante is FK to usuario. 
                // We probably need to map "Other" to a specific generic user or rely on 'notas' if schema doesn't have solicitante_nombre text field.
                // Wait, previous code used `solicitante_nombre: requester`. Let's assume DB has generic `id_solicitante` OR we just use current user as solicitante and put the real name in notes if it's external.
                // For now, let's use current user as id_solicitante, and append requester name to notes if it's different.

                // Correction: The UI allows selecting a USER. If user, use their ID. If external, use null? 
                // Previous mock code: `solicitante_nombre: requester`. 
                // DB.createExit will strip unknown fields?
                // Let's pass `id_solicitante` as the selected user ID if found, else maybe generic.

                id_responsable: currentUserLocal.id_usuario || 1,
                notas: `${notes} - Solicitado por: ${requester}`,
                id_responsable: currentUserLocal.id_usuario || 1,
                notas: `${notes} - Solicitado por: ${requester}`,
                estado: canCreateDirect ? 'C' : 'P',
                isTransfer: isTransfer // Flag for backend to trigger auto-entry
            };

            // Try to find if requester is a known user
            const knownUser = users.find(u => u.nombre_completo === requester);
            if (knownUser) {
                movementData.id_solicitante = knownUser.id_usuario;
            } else {
                // External requester. DB schema requires id_solicitante?
                // `id_solicitante` is nullable in many schemas but checked in yours. 
                // Let's assume it IS nullable or we use current user as proxy.
                // I will set it to currentUser.id_usuario if external, to satisfy FK if strict.
                movementData.id_solicitante = currentUserLocal.id_usuario || 1;
            }

            const result = await DB.createExit(movementData);

            if (canCreateDirect) {
                showToast('Salida Registrada', `${quantity} ${productWithStock?.unidad_medida?.toLowerCase()} entregados`, 'success');
            } else {
                showToast('Solicitud Enviada', 'Solicitud de salida enviada para aprobación', 'info');
            }

            // Reset form
            setProductId('');
            setQuantity('');
            setRequester('');
            setNotes('');
            setAvailableStock('');
            setShowForm(false);

            await loadData();
        } catch (error) {
            console.error("Error creating exit:", error);
            showToast('Error', `No se pudo registrar la salida: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showExitDetails = (exit) => {
        // Hydrate details
        const product = exit.producto; // Should be populated by DB join
        const creador = exit.responsable; // Should be populated
        const solicitanteName = exit.solicitante?.nombre_completo || 'Externo/Otro';
        // Or extract from notes if we appended it?

        openModal(
            'Detalle de Salida',
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Código de Salida</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{exit.codigo_movimiento}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Estado</div>
                        <StatusBadge status={exit.estado} />
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>{product?.nombre || 'N/A'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Código:</span> {product?.codigo_visible || exit.codigo_producto}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Cantidad Entregada</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-danger)' }}>-{exit.cantidad} {product?.unidad_medida?.toLowerCase() || ''}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Fecha</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{Helpers.formatDateTime(exit.fechaHoraSolicitud)}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Bodega Origen</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{exit.bodega_origen?.nombre || (exit.id_bodega_origen === 1 ? 'Principal' : 'Instrumentacion')}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Generado por</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{creador?.nombre_completo || 'Sistema'}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Solicitante</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{solicitanteName}</div>
                    </div>
                </div>

                {exit.notas && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Notas</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', fontStyle: 'italic' }}>
                            "{exit.notas}"
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
                </div>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Salidas</h1>
                    <p className="page-subtitle">Registro de material entregado a cliente final</p>
                </div>
                <div className="page-actions">
                    <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                        <Icons.ArrowUp size={18} />
                        Nueva Salida
                    </Button>
                </div>
            </div>

            {/* Exit Form */}
            {showForm && (
                <Card className="movement-form-card" style={{ marginBottom: 'var(--spacing-6)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--color-danger)', padding: 'var(--spacing-4)' }}>
                        <Icons.ArrowUp size={24} />
                        Registrar Salida a Cliente
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Bodega Origen *</label>
                                <select value={warehouse} onChange={(e) => {
                                    setWarehouse(e.target.value);
                                    if (e.target.value !== '1') setIsTransfer(false); // Reset transfer if not Principal
                                }} required>
                                    <option value="2">Bodega Instrumentación</option>
                                    <option value="1">Bodega Principal</option>
                                </select>
                            </div>
                        </div>

                        {/* Transfer Checkbox - Only for Principal */}
                        {warehouse === '1' && (
                            <div style={{
                                marginBottom: '20px',
                                padding: '15px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid var(--color-info)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <input
                                    type="checkbox"
                                    id="isTransfer"
                                    checked={isTransfer}
                                    onChange={(e) => setIsTransfer(e.target.checked)}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                                <div>
                                    <label htmlFor="isTransfer" style={{ fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                                        Traspaso a Instrumentación
                                    </label>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Si se marca, se generará una <strong>ENTRADA</strong> automática en Bodega Instrumentación además de esta salida.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Producto *</label>
                            <select value={productId} onChange={handleProductChange} required>
                                <option value="">Seleccionar producto...</option>
                                {availableProducts.map(p => (
                                    <option key={p.id || p.codigo_producto} value={p.codigo_producto}>
                                        {p.codigo_visible} - {p.nombre} ({p.stock} disponibles)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Stock Disponible</label>
                                <input type="text" value={availableStock} readOnly placeholder="Seleccione un producto" />
                            </div>
                            <div className="form-group">
                                <label>Cantidad *</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    min="1"
                                    step="1"
                                    required
                                    placeholder="Cantidad a entregar"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Solicitante *</label>
                            {isOperator ? (
                                <input
                                    type="text"
                                    value={requester}
                                    readOnly
                                    className="form-control"
                                    style={{ backgroundColor: 'var(--bg-subtle)', cursor: 'not-allowed' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {requesterMode === 'select' ? (
                                        <select
                                            value={users.some(u => u.nombre_completo === requester) ? requester : 'other'}
                                            onChange={(e) => {
                                                if (e.target.value === 'other') {
                                                    setRequesterMode('text');
                                                    setRequester('');
                                                } else {
                                                    setRequester(e.target.value);
                                                }
                                            }}
                                            required={requesterMode === 'select'}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Seleccionar solicitante...</option>
                                            {users.map(u => (
                                                <option key={u.id_usuario} value={u.nombre_completo}>{u.nombre_completo}</option>
                                            ))}
                                            <option value="other" style={{ fontWeight: 'bold' }}>+ Otro / Externo</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={requester}
                                            onChange={(e) => setRequester(e.target.value)}
                                            placeholder="Nombre del solicitante"
                                            required={requesterMode === 'text'}
                                            style={{ flex: 1 }}
                                            autoFocus
                                        />
                                    )}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            if (requesterMode === 'select') {
                                                setRequesterMode('text');
                                                setRequester('');
                                            } else {
                                                setRequesterMode('select');
                                                setRequester('');
                                            }
                                        }}
                                        title={requesterMode === 'select' ? "Escribir nombre manual" : "Seleccionar de la lista"}
                                    >
                                        <Icons.Users size={18} />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Notas</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Proyecto, orden de trabajo, observaciones..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant={isTransfer ? "info" : "danger"} disabled={isLoading}>
                                <Icons.ArrowUp size={18} />
                                {isLoading ? 'Registrando...' : (isTransfer ? 'Registrar Traspaso' : 'Registrar Salida')}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}


            {/* Exits Table */}
            <Card>
                <div className="table-header">
                    <h3 style={{ margin: 0 }}>Historial de Salidas</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Bodega</th>
                            <th>Solicitante</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                        ) : exits.map(exit => {
                            const product = exit.producto;
                            const solicitanteName = exit.solicitante?.nombre_completo || 'Externo/Otro';

                            return (
                                <tr key={exit.id_movimiento} onClick={() => showExitDetails(exit)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{exit.codigo_movimiento}</span>
                                    </td>
                                    <td>
                                        <div className="product-info">
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{product?.nombre || 'Producto'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{product?.codigo_visible || exit.codigo_producto}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>-{exit.cantidad}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{product?.unidad_medida?.toLowerCase()}</span>
                                    </td>
                                    <td>{exit.bodega_origen?.nombre || (exit.id_bodega_origen === 1 ? 'Principal' : 'Instrumentacion')}</td>
                                    <td>{solicitanteName}</td>
                                    <td>{Helpers.formatDateTime(exit.fechaHoraSolicitud)}</td>
                                    <td><StatusBadge status={exit.estado} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!isLoading && exits.length === 0 && (
                    <div className="table-empty">
                        <Icons.Truck size={48} />
                        <p>No hay salidas registradas</p>
                    </div>
                )}
            </Card>
        </MainLayout >
    );
}
