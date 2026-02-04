'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/db';
import { Helpers } from '../lib/utils/helpers';
import { MockData } from '../lib/mockData';

export default function ExitsPage() {
    const [showForm, setShowForm] = useState(false);
    const [exits, setExits] = useState([]);
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();

    // Form state
    const [warehouse, setWarehouse] = useState('2'); // Default to Instrumentacion
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [requester, setRequester] = useState('');
    const [notes, setNotes] = useState('');
    const [availableStock, setAvailableStock] = useState('');

    const [availableProducts, setAvailableProducts] = useState([]);
    const users = DB.getAllUsers().filter(u => u.rol !== 'A');
    const [requesterMode, setRequesterMode] = useState('select'); // 'select' or 'text'

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
        loadExits();
    }, []);



    useEffect(() => {
        updateProductOptions();
    }, [warehouse]);

    const loadExits = () => {
        const movements = DB.getAllMovements()
            .filter(m => m.tipo === 'SAL' && m.estado !== 'R')
            .sort((a, b) => new Date(b.fechaHoraSolicitud) - new Date(a.fechaHoraSolicitud));
        setExits(movements);
    };

    const isOperator = currentUser && currentUser.rol !== 'ADMIN' && currentUser.rol !== 'SUPERVISOR';

    const updateProductOptions = () => {
        const idBodega = parseInt(warehouse);
        const inventory = DB.getAllInventory()
            .filter(i => i.id_bodega === idBodega && i.stock > 0);

        const products = inventory.map(i => {
            const p = Helpers.getProduct(i.codigo_producto);
            return p ? { ...p, stock: i.stock } : null;
        }).filter(Boolean);

        setAvailableProducts(products);
        setProductId('');
        setAvailableStock('');
    };

    const handleProductChange = (e) => {
        const id = e.target.value;
        setProductId(id);

        const idBodega = parseInt(warehouse);
        const inv = Helpers.getInventory(id, idBodega);
        const product = DB.getProductById(id);

        if (inv && product) {
            setAvailableStock(`${inv.stock} ${product.unidad_medida?.toLowerCase() || ''}`);
        } else {
            setAvailableStock('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!productId || !quantity || parseFloat(quantity) <= 0 || !requester) {
            showToast('Datos Incompletos', 'Completa todos los campos requeridos', 'error');
            return;
        }

        const product = DB.getProductById(productId);
        const idBodega = parseInt(warehouse);
        const inv = Helpers.getInventory(productId, idBodega);

        if (!inv || inv.stock < parseFloat(quantity)) {
            showToast('Stock Insuficiente', `Solo hay ${inv?.stock || 0} ${product?.unidad_medida?.toLowerCase() || ''} disponibles`, 'error');
            return;
        }

        const currentUser = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('currentUser') || '{}') : {};
        const canCreateDirect = currentUser.rol === 'ADMIN' || currentUser.rol === 'SUPERVISOR';

        const movementData = {
            tipo: 'SAL',
            codigo_producto: productId,
            cantidad: parseFloat(quantity),
            id_bodega_origen: idBodega,
            id_bodega_destino: null,
            id_solicitante: currentUser.id_usuario || 1,
            solicitante_nombre: requester,
            notas: notes,
            estado: canCreateDirect ? 'C' : 'P',
        };

        const result = DB.createMovement(movementData);

        if (canCreateDirect) {
            showToast('Salida Registrada', `${result.codigo_movimiento}: ${quantity} ${product?.unidad_medida?.toLowerCase()} entregados`, 'success');
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
        loadExits();
        updateProductOptions();
    };

    const showExitDetails = (exit) => {
        const product = Helpers.getProduct(exit.codigo_producto);
        const creador = DB.getUserById(exit.id_solicitante);

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
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{Helpers.getWarehouseName(exit.id_bodega_origen)}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Generado por</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{creador?.nombre_completo || 'Sistema'}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Solicitante</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{exit.solicitante_nombre || 'Externo'}</div>
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
                                <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} required>
                                    <option value="2">Bodega Instrumentación</option>
                                    <option value="1">Bodega Principal</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Producto *</label>
                            <select value={productId} onChange={handleProductChange} required>
                                <option value="">Seleccionar producto...</option>
                                {availableProducts.map(p => (
                                    <option key={p.id} value={p.id}>
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
                            <Button type="submit" variant="danger">
                                <Icons.ArrowUp size={18} />
                                Registrar Salida
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
                        {exits.map(exit => {
                            const product = Helpers.getProduct(exit.codigo_producto);
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
                                    <td>{Helpers.getWarehouseName(exit.id_bodega_origen)}</td>
                                    <td>{exit.solicitante_nombre || '-'}</td>
                                    <td>{Helpers.formatDateTime(exit.fechaHoraSolicitud)}</td>
                                    <td><StatusBadge status={exit.estado} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {exits.length === 0 && (
                    <div className="table-empty">
                        <Icons.Truck size={48} />
                        <p>No hay salidas registradas</p>
                    </div>
                )}
            </Card>
        </MainLayout >
    );
}
