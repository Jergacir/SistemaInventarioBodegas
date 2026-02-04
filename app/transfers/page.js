'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/db';
import { Helpers } from '../lib/utils/helpers';
import { MockData } from '../lib/mockData';

export default function TransfersPage() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [transfers, setTransfers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();

    // Form state
    const [origin, setOrigin] = useState('PRINCIPAL');
    const [destination, setDestination] = useState('INSTRUMENTACION');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [requester, setRequester] = useState('');
    const [notes, setNotes] = useState('');
    const [availableProducts, setAvailableProducts] = useState([]);
    const [stockInfo, setStockInfo] = useState('');

    useEffect(() => {
        loadTransfers();
        updateProductOptions('PRINCIPAL');
    }, []);

    useEffect(() => {
        loadTransfers();
    }, [statusFilter]);

    const loadTransfers = () => {
        let movements = DB.getAllMovements()
            .filter(m => m.tipo === 'TRF' && m.estado !== 'R'); // Exclude Rejected

        if (statusFilter !== 'all') {
            movements = movements.filter(m => m.estado === statusFilter);
        }
        setTransfers(movements);
    };

    const getCurrentUser = () => {
        if (typeof window !== 'undefined') {
            return JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        }
        return {};
    };

    const canApprove = () => {
        const user = getCurrentUser();
        return ['ADMIN', 'SUPERVISOR'].includes(user.rol);
    };

    const isOperator = () => {
        const user = getCurrentUser();
        return user.rol === 'OPERADOR';
    };

    const updateProductOptions = (originWarehouse) => {
        const idBodega = originWarehouse === 'PRINCIPAL' ? 1 : 2;
        const inventory = DB.getAllInventory().filter(i => i.id_bodega === idBodega && i.stock > 0);

        const products = inventory.map(inv => {
            const p = Helpers.getProduct(inv.codigo_producto);
            return {
                id: p?.id,
                nombre: p?.nombre,
                codigo: p?.codigo_visible,
                stock: inv.stock,
                unidad: p?.unidad_medida
            };
        }).filter(p => p.id);

        setAvailableProducts(products);
        setSelectedProduct('');
        setStockInfo('');
    };

    const handleOriginChange = (newOrigin) => {
        setOrigin(newOrigin);
        setDestination(newOrigin === 'PRINCIPAL' ? 'INSTRUMENTACION' : 'PRINCIPAL');
        updateProductOptions(newOrigin);
    };

    const handleProductChange = (productId) => {
        setSelectedProduct(productId);
        const product = availableProducts.find(p => p.id == productId);
        if (product) {
            setStockInfo(`Stock disponible en origen: ${product.stock} ${product.unidad?.toLowerCase() || ''}`);
        } else {
            setStockInfo('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!selectedProduct || !quantity) {
            showToast('Datos Incompletos', 'Por favor completa todos los campos requeridos', 'error');
            return;
        }

        const qty = parseFloat(quantity);
        const product = availableProducts.find(p => p.id == selectedProduct);

        if (!product || product.stock < qty) {
            showToast('Stock Insuficiente', 'No hay suficiente cantidad en la bodega de origen', 'error');
            return;
        }

        const originId = origin === 'PRINCIPAL' ? 1 : 2;
        const destId = destination === 'PRINCIPAL' ? 1 : 2;
        const currentUser = getCurrentUser();

        const movementData = {
            tipo: 'TRF',
            codigo_producto: selectedProduct,
            cantidad: qty,
            id_bodega_origen: originId,
            id_bodega_destino: destId,
            id_solicitante: currentUser.id_usuario,
            solicitante_nombre: requester || currentUser.nombre_completo,
            notas: notes,
            estado: 'P'
        };

        const result = DB.createMovement(movementData);
        showToast('Transferencia Registrada', `Solicitud ${result.codigo_movimiento} creada. Pendiente de aprobación.`, 'success');

        // Reset form
        setSelectedProduct('');
        setQuantity('');
        setRequester('');
        setNotes('');
        setShowForm(false);
        updateProductOptions(origin);
        loadTransfers();
    };

    const handleApprove = (transfer) => {
        const inventory = Helpers.getInventory(transfer.codigo_producto, transfer.id_bodega_origen);
        if (!inventory || inventory.stock < transfer.cantidad) {
            showToast('Stock Insuficiente', 'No hay suficiente stock en origen', 'error');
            return;
        }

        const rawMov = MockData.MOVIMIENTO.find(m => m.id_movimiento === transfer.id_movimiento);
        if (rawMov) {
            rawMov.estado = 'C';
            rawMov.fechaHoraAprobacion = new Date().toISOString();
            rawMov.id_responsable = getCurrentUser().id_usuario;
            DB.updateInventory(rawMov);
            showToast('Transferencia Aprobada', `Movimiento ${rawMov.codigo_movimiento} completado`, 'success');
        }

        closeModal();
        loadTransfers();
    };

    const handleReject = (transfer) => {
        const rawMov = MockData.MOVIMIENTO.find(m => m.id_movimiento === transfer.id_movimiento);
        if (rawMov) {
            rawMov.estado = 'R';
            rawMov.fechaHoraAprobacion = new Date().toISOString();
            rawMov.id_responsable = getCurrentUser().id_usuario;
            showToast('Solicitud Rechazada', 'La solicitud ha sido enviada al historial general.', 'info');
        }
        closeModal();
        loadTransfers();
    };

    const showTransferDetails = (transfer) => {
        const product = Helpers.getProduct(transfer.codigo_producto);
        const solicitante = DB.getUserById(transfer.id_solicitante);

        openModal(
            'Detalle de Transferencia',
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Código</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{transfer.codigo_movimiento}</div>
                    </div>
                    <StatusBadge status={transfer.estado} />
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>Producto</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{product?.nombre || 'N/A'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{product?.codigo_visible || transfer.codigo_producto}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Cantidad</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-info)' }}>{transfer.cantidad} {product?.unidad_medida?.toLowerCase()}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Fecha</div>
                        <div style={{ fontSize: '14px' }}>{Helpers.formatDateTime(transfer.fechaHoraSolicitud)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', backgroundColor: 'var(--bg-subtle)', padding: '15px', borderRadius: '8px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Origen</div>
                        <div style={{ fontWeight: 600 }}>{Helpers.getWarehouseName(transfer.id_bodega_origen)}</div>
                    </div>
                    <Icons.Next size={20} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Destino</div>
                        <div style={{ fontWeight: 600 }}>{Helpers.getWarehouseName(transfer.id_bodega_destino)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Solicitante:</span>
                    <span style={{ fontWeight: 500 }}>{transfer.solicitante_nombre || solicitante?.nombre_completo || 'Sistema'}</span>
                </div>

                {transfer.notas && (
                    <div style={{ marginTop: '15px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Notas:</div>
                        <div style={{ fontSize: '14px', fontStyle: 'italic' }}>"{transfer.notas}"</div>
                    </div>
                )}

                {transfer.estado === 'P' && canApprove() && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                        <Button variant="danger" onClick={() => handleReject(transfer)}>
                            Rechazar
                        </Button>
                        <Button variant="success" onClick={() => handleApprove(transfer)}>
                            Aprobar
                        </Button>
                    </div>
                )}

                {(transfer.estado !== 'P' || !canApprove()) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                        <Button variant="secondary" onClick={closeModal}>
                            Cerrar
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    const statusFilters = [
        { id: 'all', label: 'Todas' },
        { id: 'P', label: 'Pendientes' },
        { id: 'C', label: 'Completadas' }
    ];

    const users = DB.getAllUsers();

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Transferencias</h1>
                    <p className="page-subtitle">Traslado de material entre bodegas</p>
                </div>
                <div className="page-actions">
                    <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                        <Icons.Transfers size={18} />
                        Nueva Transferencia
                    </Button>
                </div>
            </div>

            {/* Transfer Creation Form */}
            {showForm && (
                <Card className="movement-form-card" style={{ maxWidth: '800px', margin: '0 auto var(--spacing-6) auto' }}>
                    <h3 className="movement-form-title" style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--border-light)', margin: 0 }}>
                        Nueva Transferencia
                    </h3>
                    <div style={{ padding: 'var(--spacing-5)' }}>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label>Origen *</label>
                                    <select value={origin} onChange={(e) => handleOriginChange(e.target.value)}>
                                        <option value="PRINCIPAL">Bodega Principal</option>
                                        <option value="INSTRUMENTACION">Bodega Instrumentación</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Destino</label>
                                    <input
                                        type="text"
                                        value={destination === 'PRINCIPAL' ? 'Bodega Principal' : 'Bodega Instrumentación'}
                                        disabled
                                        style={{ background: 'var(--bg-subtle)' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label>Producto *</label>
                                <select value={selectedProduct} onChange={(e) => handleProductChange(e.target.value)} required>
                                    <option value="">Seleccionar producto...</option>
                                    {availableProducts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} ({p.codigo}) - Disp: {p.stock}
                                        </option>
                                    ))}
                                </select>
                                {stockInfo && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {stockInfo}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label>Cantidad *</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        min="1"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Solicitante</label>
                                    {isOperator() ? (
                                        <input type="text" value={getCurrentUser().nombre_completo} disabled />
                                    ) : (
                                        <select value={requester} onChange={(e) => setRequester(e.target.value)}>
                                            <option value="">Seleccionar solicitante...</option>
                                            {users.map(u => (
                                                <option key={u.id_usuario} value={u.nombre_completo}>
                                                    {u.nombre_completo}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Notas</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Motivo del traslado..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary">
                                    Registrar Transferencia
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            )}

            {/* Status Filters */}
            <div className="transfer-status-filter">
                {statusFilters.map(filter => (
                    <button
                        key={filter.id}
                        className={`status-filter-btn ${statusFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setStatusFilter(filter.id)}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Transfers List Table */}
            <Card>
                <div className="table-header" style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--border-light)' }}>
                    <h3 style={{ margin: 0 }}>Historial de Transferencias</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>CÓDIGO</th>
                                <th>PRODUCTO</th>
                                <th>CANTIDAD</th>
                                <th>RUTA</th>
                                <th>FECHA</th>
                                <th>ESTADO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Icons.Transfers size={48} style={{ color: 'var(--text-muted)' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>No hay transferencias</h3>
                                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No se encontraron registros</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transfers.map(mov => {
                                    const product = Helpers.getProduct(mov.codigo_producto);
                                    return (
                                        <tr key={mov.id_movimiento} onClick={() => showTransferDetails(mov)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{mov.codigo_movimiento}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 500 }}>{product?.nombre || 'Producto'}</span>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product?.codigo_visible || mov.codigo_producto}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{mov.cantidad}</span> <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product?.unidad_medida?.toLowerCase()}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px' }}>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>De: {Helpers.getWarehouseName(mov.id_bodega_origen)}</div>
                                                    <div>A: {Helpers.getWarehouseName(mov.id_bodega_destino)}</div>
                                                </div>
                                            </td>
                                            <td>{Helpers.formatDateTime(mov.fechaHoraSolicitud)}</td>
                                            <td><StatusBadge status={mov.estado} /></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </MainLayout>
    );
}
