'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/database';
import { Helpers } from '../lib/utils/helpers';

export default function EntriesPage() {
    const [showForm, setShowForm] = useState(false);
    const [entries, setEntries] = useState([]);
    const [products, setProducts] = useState([]); // Loaded from DB
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [warehouse, setWarehouse] = useState('1');
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [unit, setUnit] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [movements, fetchedProducts] = await Promise.all([
                DB.getAllMovements(),
                DB.getAllProducts()
            ]);

            const entMoves = movements
                .filter(m => m.tipo === 'ENT')
                .sort((a, b) => new Date(b.fechaHoraSolicitud) - new Date(a.fechaHoraSolicitud));

            setEntries(entMoves);
            setProducts(fetchedProducts || []);
        } catch (error) {
            console.error("Error loading entries data:", error);
            showToast('Error', 'No se pudieron cargar los datos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProductChange = (e) => {
        const id = e.target.value;
        setProductId(id);
        const product = products.find(p => p.id === id || p.codigo_producto === id);
        if (product) {
            setUnit(product.unidad_medida || '');
        } else {
            setUnit('');
        }
    };

    const getCurrentUser = () => {
        if (typeof window !== 'undefined') {
            return JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        }
        return {};
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!productId || !quantity || parseFloat(quantity) <= 0) {
            showToast('Datos Incompletos', 'Completa todos los campos requeridos', 'error');
            return;
        }

        const product = products.find(p => p.id === productId || p.codigo_producto === productId);
        const currentUser = getCurrentUser();
        // Assuming roles are simple strings. Adjust if object.
        const canCreateDirect = currentUser.rol === 'ADMIN' || currentUser.rol === 'SUPERVISOR';

        setIsLoading(true);
        try {
            const entryData = {
                cantidad: parseFloat(quantity),
                id_bodega_destino: parseInt(warehouse),
                id_solicitante: currentUser.id_usuario || 1, // Fallback to 1 if not logged in (dev)
                id_responsable: currentUser.id_usuario || 1,
                notas: notes,
                estado: canCreateDirect ? 'C' : 'P',
                codigo_producto: product.codigo_producto // Ensure we use the raw code
            };

            await DB.createEntry(entryData);

            if (canCreateDirect) {
                showToast('Entrada Registrada', `${quantity} ${product?.unidad_medida?.toLowerCase() || ''} ingresados a ${warehouse === '1' ? 'Bodega Principal' : 'Bodega Inst.'}`, 'success');
            } else {
                showToast('Solicitud Enviada', 'Solicitud de entrada enviada para aprobación', 'info');
            }

            // Reset form
            setProductId('');
            setQuantity('');
            setNotes('');
            setUnit('');
            setShowForm(false);

            // Reload
            await loadData();
        } catch (error) {
            console.error("Error creating entry:", error);
            showToast('Error', 'No se pudo registrar la entrada', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showEntryDetails = (entry) => {
        // Product might be populated in entry or found in list
        const product = entry.producto || products.find(p => p.codigo_producto === entry.codigo_producto);
        const creador = entry.solicitante;

        openModal(
            'Detalle de Entrada',
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Código de Entrada</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{entry.codigo_movimiento}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Estado</div>
                        <StatusBadge status={entry.estado} />
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>{product?.nombre || 'N/A'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Código:</span> {product?.codigo_visible || entry.codigo_producto}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Cantidad Recibida</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-success)' }}>+{Helpers.formatNumber(entry.cantidad, 2)} {product?.unidad_medida?.toLowerCase() || ''}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Fecha</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{Helpers.formatDateTime(entry.fechaHoraSolicitud)}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Bodega Destino</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{entry.bodega_destino?.nombre || (entry.id_bodega_destino === 1 ? 'Principal' : 'Instrumentacion')}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Registrado por</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{creador?.nombre_completo || 'Sistema'}</div>
                    </div>
                </div>

                {entry.notas && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Notas</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', fontStyle: 'italic' }}>
                            "{entry.notas}"
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
                    <h1 className="page-title">Entradas</h1>
                    <p className="page-subtitle">Registro de material recibido</p>
                </div>
                <div className="page-actions">
                    <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                        <Icons.ArrowDown size={18} />
                        Nueva Entrada
                    </Button>
                </div>
            </div>

            {/* Entry Form */}
            {showForm && (
                <Card className="movement-form-card" style={{ marginBottom: 'var(--spacing-6)', padding: 'var(--spacing-5)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--color-success)' }}>
                        <Icons.ArrowDown size={24} />
                        Registrar Nueva Entrada
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Bodega Destino *</label>
                                <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} required>
                                    <option value="1">Bodega Principal</option>
                                    <option value="2">Bodega Instrumentación</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Producto *</label>
                            <select value={productId} onChange={handleProductChange} required>
                                <option value="">Seleccionar producto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.codigo_producto}>
                                        {p.codigo_visible} - {p.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Cantidad *</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    min="0.01"
                                    step="0.01"
                                    required
                                    placeholder="Cantidad a ingresar"
                                />
                            </div>
                            <div className="form-group">
                                <label>Unidad</label>
                                <input type="text" value={unit} readOnly placeholder="Seleccione un producto" style={{ background: 'var(--bg-subtle)' }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Notas</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: Orden de compra #1234, Proveedor XYZ"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="success" disabled={isLoading}>
                                <Icons.Check size={18} />
                                {isLoading ? 'Registrando...' : 'Registrar Entrada'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Entries Table */}
            <Card>
                <div className="table-header" style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--border-light)' }}>
                    <h3 style={{ margin: 0 }}>Historial de Entradas</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '120px' }}>Código</th>
                            <th>Producto</th>
                            <th style={{ width: '120px' }}>Cantidad</th>
                            <th style={{ width: '150px' }}>Bodega</th>
                            <th style={{ width: '150px' }}>Fecha</th>
                            <th style={{ width: '120px' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr>
                        ) : entries.map(entry => {
                            const product = entry.producto || products.find(p => p.codigo_producto === entry.codigo_producto);
                            const isPending = entry.estado === 'P';
                            const bodegaName = entry.bodega_destino?.nombre || (entry.id_bodega_destino === 1 ? 'Principal' : 'Instrumentacion');

                            return (
                                <tr key={entry.id_movimiento} onClick={() => showEntryDetails(entry)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        {isPending ? (
                                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pendiente</span>
                                        ) : (
                                            <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{entry.codigo_movimiento}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="product-info">
                                            <div className="product-details">
                                                <div className="product-name">{product?.nombre || 'Producto'}</div>
                                                <div className="product-code">{product?.codigo_visible || entry.codigo_producto}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>+{Helpers.formatNumber(entry.cantidad, 2)}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{product?.unidad_medida?.toLowerCase()}</span>
                                    </td>
                                    <td>{bodegaName}</td>
                                    <td>{Helpers.formatDateTime(entry.fechaHoraSolicitud)}</td>
                                    <td><StatusBadge status={entry.estado} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!isLoading && entries.length === 0 && (
                    <div className="empty-state" style={{ padding: '60px 20px' }}>
                        <Icons.ArrowDown size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                        <h3 className="empty-state-title">No hay entradas registradas</h3>
                        <p className="empty-state-text">Registra una nueva entrada usando el botón de arriba</p>
                    </div>
                )}
            </Card>
        </MainLayout>
    );
}
