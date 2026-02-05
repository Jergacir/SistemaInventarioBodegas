'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/database';
import { Helpers } from '../lib/utils/helpers';
import * as XLSX from 'xlsx';

export default function HistoryPage() {
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();

    // Filter state
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [movements, setMovements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Set default dates on mount - REMOVED to show all history by default
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('currentUser');
            if (saved) setCurrentUser(JSON.parse(saved));
        }
        loadMovements();
    }, []);

    const loadMovements = async () => {
        setIsLoading(true);
        try {
            const data = await DB.getAllMovements();
            setMovements(data);
        } catch (error) {
            console.error("Error loading movements:", error);
            showToast('Error', 'No se pudo cargar el historial', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevert = async (id, currentStatus) => {
        const confirmMsg = currentStatus === 'C'
            ? '¿Estás seguro de que deseas revertir este movimiento a estado PENDIENTE? Esto revertirá los cambios en el inventario.'
            : '¿Estás seguro de que deseas reactivar esta solicitud rechazada a PENDIENTE?';

        if (window.confirm(confirmMsg)) {
            try {
                await DB.revertMovementToPending(id);
                showToast('Movimiento Revertido', 'El movimiento ha vuelto a estado Pendiente.', 'success');
                loadMovements(); // Refresh list
                closeModal();
            } catch (error) {
                console.error("Error reverting movement:", error);
                showToast('Error', 'No se pudo revertir el movimiento.', 'error');
            }
        }
    };

    const handleDelete = async (movement) => {
        const confirmMsg = `ADVERTENCIA CRÍTICA: Eliminación Permanente\n\nEstás a punto de eliminar el movimiento ${movement.codigo_movimiento}.\n\nSi el movimiento está COMPLETADO, esta acción REVERTIRÁ automáticamente los cambios de stock asociados para mantener la integridad del inventario.\n\n¿Deseas continuar?`;

        if (window.confirm(confirmMsg)) {
            try {
                await DB.deleteMovement(movement.id_movimiento);
                showToast('Eliminado', 'Registro eliminado correctamente.', 'success');
                loadMovements();
            } catch (error) {
                console.error("Error deleting movement:", error);
                showToast('Error', 'No se pudo eliminar el registro.', 'error');
            }
        }
    };

    // Apply filters
    const filteredMovements = useMemo(() => {
        let result = [...movements];

        // Type filter mapping
        const dbTypeMap = { 'ENTRADA': 'ENT', 'SALIDA': 'SAL', 'TRANSFERENCIA': 'TRF' };
        // DB Status: C=Completed, P=Pending, R=Rejected (Cancelled)
        const dbStatusMap = { 'COMPLETADO': 'C', 'PENDIENTE': 'P', 'RECHAZADO': 'R' };

        if (dateStart) {
            result = result.filter(m => new Date(m.fechaHoraSolicitud) >= new Date(dateStart));
        }
        if (dateEnd) {
            const endDate = new Date(dateEnd);
            endDate.setHours(23, 59, 59, 999);
            result = result.filter(m => new Date(m.fechaHoraSolicitud) <= endDate);
        }
        if (typeFilter) {
            result = result.filter(m => m.tipo === dbTypeMap[typeFilter]);
        }
        if (statusFilter) {
            result = result.filter(m => m.estado === dbStatusMap[statusFilter]);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => {
                // DB.getAllMovements joins producto(nombre)
                // m.producto might be object { nombre: '...' } or if hydration failed just check fields
                const prodName = m.producto?.nombre || '';
                const requester = m.solicitante?.nombre_completo || '';

                return (m.codigo_movimiento && m.codigo_movimiento.toLowerCase().includes(query)) ||
                    (prodName.toLowerCase().includes(query)) ||
                    (m.codigo_producto && String(m.codigo_producto).toLowerCase().includes(query)) ||
                    (requester.toLowerCase().includes(query));
            });
        }

        return result;
    }, [movements, dateStart, dateEnd, typeFilter, statusFilter, searchQuery]);

    const clearFilters = () => {
        setDateStart('');
        setDateEnd('');
        setTypeFilter('');
        setStatusFilter('');
        setSearchQuery('');
    };

    const exportData = () => {
        const headers = ['Código', 'Tipo', 'Producto', 'Código Producto', 'Cantidad', 'Origen', 'Destino', 'Estado', 'Solicitante', 'Responsable', 'Notas', 'Fecha'];
        const typeNames = { 'ENT': 'ENTRADA', 'SAL': 'SALIDA', 'TRF': 'TRANSFERENCIA' };
        const statusNames = { 'C': 'COMPLETADO', 'P': 'PENDIENTE', 'R': 'RECHAZADO' };

        const rows = filteredMovements.map(mov => {
            return [
                mov.codigo_movimiento,
                typeNames[mov.tipo] || mov.tipo,
                mov.producto?.nombre || '',
                mov.codigo_producto,
                mov.cantidad,
                mov.bodega_origen?.nombre || 'Externo',
                mov.bodega_destino?.nombre || 'Externo',
                statusNames[mov.estado] || mov.estado,
                mov.solicitante?.nombre_completo || 'Sistema',
                mov.responsable?.nombre_completo || '',
                mov.notas || '',
                Helpers.formatDateTime(mov.fechaHoraSolicitud)
            ];
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Historial");

        // Generate Excel file
        XLSX.writeFile(wb, `historial_movimientos_${new Date().toISOString().split('T')[0]}.xlsx`);

        showToast('Exportación Completada', 'El archivo Excel se ha descargado correctamente', 'success');
    };

    const showMovementDetails = (movement) => {
        // Data is already looked up via DB.getAllMovements join
        const product = movement.producto || { nombre: 'Cargando...' };

        let headerColor = 'var(--text-primary)';
        if (movement.tipo === 'ENT') headerColor = 'var(--color-success)';
        if (movement.tipo === 'SAL') headerColor = 'var(--color-danger)';

        const typeLabels = { 'ENT': 'Entrada', 'SAL': 'Salida', 'TRF': 'Transferencia' };

        openModal(
            'Detalle de Movimiento',
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Código de Transacción</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: headerColor }}>{movement.codigo_movimiento}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Estado</div>
                        <StatusBadge status={movement.estado} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <Badge variant={movement.tipo === 'ENT' ? 'completed' : movement.tipo === 'SAL' ? 'cancelled' : 'pending'}>
                        {typeLabels[movement.tipo]}
                    </Badge>
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>{product?.nombre || 'N/A'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Código:</span> {movement.codigo_producto || '-'}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Cantidad</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: headerColor }}>
                            {movement.tipo === 'SAL' ? '-' : movement.tipo === 'ENT' ? '+' : ''}{Helpers.formatNumber(movement.cantidad, 2)}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Fecha Solicitud</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{Helpers.formatDateTime(movement.fechaHoraSolicitud)}</div>
                    </div>

                    {movement.id_bodega_origen && (
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Bodega Origen</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{movement.bodega_origen?.nombre || 'Externo'}</div>
                        </div>
                    )}

                    {movement.id_bodega_destino && (
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '5px' }}>Bodega Destino</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{movement.bodega_destino?.nombre || 'Externo/Cliente'}</div>
                        </div>
                    )}
                </div>

                {/* User Details Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '2px' }}>Solicitado por</div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>
                            {movement.solicitante?.nombre_completo || 'Sistema'}
                        </div>
                    </div>

                    {(movement.estado === 'C' || movement.estado === 'R') && (
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '2px' }}>
                                {movement.estado === 'R' ? 'Rechazado por' : 'Aprobado por'}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                {movement.responsable?.nombre_completo || 'N/A'}
                            </div>
                        </div>
                    )}

                    {movement.tipo === 'ENT' && (
                        <div style={{ gridColumn: 'span 2' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '2px' }}>Registrado por</div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                {movement.responsable?.nombre_completo || 'Sistema'}
                            </div>
                        </div>
                    )}
                </div>

                {movement.notas && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Notas</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', fontStyle: 'italic' }}>
                            "{movement.notas}"
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {/* Revert Button - For Completed OR Rejected movements */}
                    {(movement.estado === 'C' || movement.estado === 'R') && (
                        <Button
                            variant="warning"
                            onClick={() => handleRevert(movement.id_movimiento, movement.estado)}
                            style={{ marginRight: 'auto' }}
                        >
                            <Icons.Refresh size={18} />
                            Revertir a Pendiente
                        </Button>
                    )}
                    <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
                </div>
            </div>
        );
    };

    const typeLabels = { 'ENT': 'Entrada', 'SAL': 'Salida', 'TRF': 'Transferencia' };
    const typeBadges = { 'ENT': 'completed', 'SAL': 'cancelled', 'TRF': 'pending' };

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Historial de Movimientos</h1>
                    <p className="page-subtitle">Registro completo de todas las transacciones</p>
                </div>
                <div className="page-actions">
                    <Button variant="secondary" onClick={exportData}>
                        <Icons.Export size={18} />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 'var(--spacing-4)', padding: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Fecha Inicio</label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            style={{ height: '36px' }}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Fecha Fin</label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            style={{ height: '36px' }}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Tipo</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ height: '36px' }}>
                            <option value="">Todos</option>
                            <option value="ENTRADA">Entradas</option>
                            <option value="SALIDA">Salidas</option>
                            <option value="TRANSFERENCIA">Transferencias</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Estado</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: '36px' }}>
                            <option value="">Todos</option>
                            <option value="COMPLETADO">Completado</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="RECHAZADO">Rechazado</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Buscar</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Código, producto, marca, solicitante..."
                            style={{ height: '36px' }}
                        />
                    </div>
                    <Button variant="secondary" onClick={clearFilters} style={{ height: '36px' }}>
                        Limpiar
                    </Button>
                </div>
            </Card>

            {/* History Table */}
            <Card>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Cargando historial...</div>
                ) : (
                    <>
                        <div className="table-header" style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--border-light)' }}>
                            <h3 style={{ margin: 0 }}>Movimientos ({filteredMovements.length})</h3>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>Código</th>
                                    <th style={{ width: '110px' }}>Tipo</th>
                                    <th>Producto</th>
                                    <th style={{ width: '100px' }}>Cantidad</th>
                                    <th style={{ width: '180px' }}>Origen → Destino</th>
                                    <th style={{ width: '150px' }}>Fecha</th>
                                    <th style={{ width: '110px' }}>Estado</th>
                                    {currentUser?.rol === 'ADMIN' && <th style={{ width: '50px' }}></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMovements.map(mov => {
                                    const product = mov.producto || { nombre: 'Producto' };
                                    const sign = mov.tipo === 'ENT' ? '+' : mov.tipo === 'SAL' ? '-' : '';
                                    const colorClass = mov.tipo === 'ENT' ? 'success' : mov.tipo === 'SAL' ? 'danger' : '';

                                    return (
                                        <tr key={mov.id_movimiento} onClick={() => showMovementDetails(mov)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <span style={{ color: 'var(--color-primary)', fontWeight: 500, fontFamily: 'monospace' }}>
                                                    {mov.codigo_movimiento}
                                                </span>
                                            </td>
                                            <td>
                                                <Badge variant={typeBadges[mov.tipo]}>
                                                    {typeLabels[mov.tipo]}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="product-info">
                                                    <div className="product-details">
                                                        <div className="product-name">{product?.nombre || 'Producto'}</div>
                                                        <div className="product-code">{mov.codigo_producto}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ color: colorClass ? `var(--color-${colorClass})` : 'inherit', fontWeight: 600 }}>
                                                    {sign}{Helpers.formatNumber(mov.cantidad, 2)}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {mov.bodega_origen?.nombre || 'Externo'}
                                                </span>
                                                <span style={{ margin: '0 4px' }}>→</span>
                                                <span>
                                                    {mov.bodega_destino?.nombre || 'Cliente'}
                                                </span>
                                            </td>
                                            <td>{Helpers.formatDateTime(mov.fechaHoraSolicitud)}</td>
                                            <td><StatusBadge status={mov.estado} /></td>
                                            {currentUser?.rol === 'ADMIN' && (
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="text"
                                                        style={{ color: 'var(--color-danger)', padding: '4px' }}
                                                        onClick={() => handleDelete(mov)}
                                                        title="Eliminar registro Permanentemente"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredMovements.length === 0 && (
                            <div className="empty-state" style={{ padding: '60px 20px' }}>
                                <Icons.History size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                                <h3 className="empty-state-title">No hay movimientos</h3>
                                <p className="empty-state-text">No se encontraron movimientos con los filtros aplicados</p>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </MainLayout>
    );
}
