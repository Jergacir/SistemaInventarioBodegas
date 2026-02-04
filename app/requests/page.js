'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/db';
import { Helpers } from '../lib/utils/helpers';
import { MockData } from '../lib/mockData';

export default function RequestsPage() {
    const [currentFilter, setCurrentFilter] = useState('all');
    const [requests, setRequests] = useState([]);
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();

    useEffect(() => {
        loadRequests();
    }, [currentFilter]);

    const loadRequests = () => {
        const movements = DB.getAllMovements();
        const typeMap = { 'ENT': 'ENTRADA', 'SAL': 'SALIDA', 'TRF': 'TRANSFERENCIA' };

        let pending = movements
            .filter(m => m.estado === 'P')
            .map(m => ({
                ...m,
                tipo_display: typeMap[m.tipo] || m.tipo,
            }))
            .sort((a, b) => new Date(b.fechaHoraSolicitud) - new Date(a.fechaHoraSolicitud));

        if (currentFilter !== 'all') {
            const filterMap = { 'ENTRADA': 'ENT', 'SALIDA': 'SAL', 'TRANSFERENCIA': 'TRF' };
            pending = pending.filter(m => m.tipo === filterMap[currentFilter]);
        }

        setRequests(pending);
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

    const handleApprove = (item) => {
        // Check stock for outgoing movements
        if (item.tipo === 'SAL' || item.tipo === 'TRF') {
            const inventory = Helpers.getInventory(item.codigo_producto, item.id_bodega_origen);
            if (!inventory || inventory.stock < item.cantidad) {
                showToast('Stock Insuficiente', 'No hay suficiente stock en origen para aprobar', 'error');
                return;
            }
        }

        // Update movement status
        const rawMov = MockData.MOVIMIENTO.find(m => m.id_movimiento === item.id_movimiento);
        if (rawMov) {
            rawMov.estado = 'C';
            rawMov.fechaHoraAprobacion = new Date().toISOString();
            rawMov.id_responsable = getCurrentUser().id_usuario;

            // Update inventory
            DB.updateInventory(rawMov);

            showToast('Solicitud Aprobada', `Movimiento ${rawMov.codigo_movimiento} completado`, 'success');
        }

        closeModal();
        loadRequests();
    };

    const handleReject = (item) => {
        const rawMov = MockData.MOVIMIENTO.find(m => m.id_movimiento === item.id_movimiento);
        if (rawMov) {
            rawMov.estado = 'R';
            rawMov.fechaHoraAprobacion = new Date().toISOString();
            rawMov.id_responsable = getCurrentUser().id_usuario;

            showToast('Solicitud Rechazada', 'La solicitud ha sido cancelada', 'info');
        }

        closeModal();
        loadRequests();
    };

    const showDetails = (item) => {
        const product = Helpers.getProduct(item.codigo_producto);
        const isTransfer = item.tipo === 'TRF';

        const getBadgeClass = (tipo) => {
            switch (tipo) {
                case 'ENT': return 'completed';
                case 'SAL': return 'cancelled';
                case 'TRF': return 'pending';
                default: return 'pending';
            }
        };

        openModal(
            isTransfer ? 'Confirmar Transferencia' : 'Detalles de Solicitud',
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tipo:</span>
                    <Badge variant={getBadgeClass(item.tipo)}>{item.tipo_display}</Badge>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Producto:</span>
                    <span style={{ fontWeight: 500 }}>{product?.nombre} ({product?.codigo_visible})</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cantidad:</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.cantidad} {product?.unidad_medida?.toLowerCase()}</span>
                </div>

                {isTransfer ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Origen:</span>
                            <span>{Helpers.getWarehouseName(item.id_bodega_origen)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Destino:</span>
                            <span>{Helpers.getWarehouseName(item.id_bodega_destino)}</span>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Bodega:</span>
                        <span>{Helpers.getWarehouseName(item.id_bodega_destino || item.id_bodega_origen)}</span>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Solicitante:</span>
                    <span>{item.solicitante_nombre || DB.getUserById(item.id_solicitante)?.nombre_completo || 'Sistema'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fecha:</span>
                    <span>{Helpers.formatDateTime(item.fechaHoraSolicitud)}</span>
                </div>

                {item.notas && (
                    <div style={{ marginTop: '8px', padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Notas:</div>
                        <div style={{ fontSize: '14px' }}>{item.notas}</div>
                    </div>
                )}

                {canApprove() ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                        <Button variant="danger" onClick={() => handleReject(item)}>
                            Rechazar
                        </Button>
                        <Button variant="primary" onClick={() => handleApprove(item)}>
                            Aprobar
                        </Button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        Solo supervisores y administradores pueden aprobar solicitudes.
                    </div>
                )}
            </div>
        );
    };

    const filters = [
        { id: 'all', label: 'Todas' },
        { id: 'ENTRADA', label: 'Entradas' },
        { id: 'SALIDA', label: 'Salidas' },
        { id: 'TRANSFERENCIA', label: 'Transferencias' }
    ];

    const getBadgeVariant = (tipo) => {
        switch (tipo) {
            case 'ENT': return 'completed';
            case 'SAL': return 'cancelled';
            case 'TRF': return 'in-transit';
            default: return 'pending';
        }
    };

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Solicitudes</h1>
                    <p className="page-subtitle">Gestión centralizada de movimientos pendientes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="transfer-status-filter" style={{ marginBottom: 'var(--spacing-6)' }}>
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        className={`status-filter-btn ${currentFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setCurrentFilter(filter.id)}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Requests Grid */}
            {requests.length === 0 ? (
                <div className="empty-state">
                    <Icons.Check size={64} className="empty-state-icon" />
                    <h3 className="empty-state-title">No hay solicitudes pendientes</h3>
                    <p className="empty-state-text">Todas las operaciones están al día.</p>
                </div>
            ) : (
                <div className="requests-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--spacing-4)' }}>
                    {requests.map(item => {
                        const product = Helpers.getProduct(item.codigo_producto);
                        const isTransfer = item.tipo === 'TRF';

                        let locationText = '';
                        if (isTransfer) {
                            locationText = `${Helpers.getWarehouseName(item.id_bodega_origen)} → ${Helpers.getWarehouseName(item.id_bodega_destino)}`;
                        } else if (item.tipo === 'ENT') {
                            locationText = `Hacia ${Helpers.getWarehouseName(item.id_bodega_destino)}`;
                        } else {
                            locationText = `Desde ${Helpers.getWarehouseName(item.id_bodega_origen)}`;
                        }

                        return (
                            <Card
                                key={item.id_movimiento}
                                onClick={() => showDetails(item)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                                className="request-card"
                            >
                                <div style={{ padding: 'var(--spacing-4)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <Badge variant={getBadgeVariant(item.tipo)}>{item.tipo_display}</Badge>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {Helpers.formatDateTime(item.fechaHoraSolicitud)}
                                        </span>
                                    </div>

                                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                                        {product?.nombre || 'Producto Desconocido'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                        {product?.codigo_visible || 'N/A'}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cantidad</div>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.cantidad} {product?.unidad_medida?.toLowerCase()}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ubicación</div>
                                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{locationText}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
                                            {(item.solicitante_nombre || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            Solicitado por <strong style={{ color: 'var(--text-primary)' }}>{item.solicitante_nombre || 'Usuario'}</strong>
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </MainLayout>
    );
}
