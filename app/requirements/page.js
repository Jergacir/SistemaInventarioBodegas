'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge, StatusBadge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/database';
import { Helpers } from '../lib/utils/helpers';

export default function RequirementsPage() {
    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();

    // Data State
    const [requirements, setRequirements] = useState([]);
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filter State (Formerly in HistoryModal)
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // Default ALL for history view

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('currentUser');
            if (saved) {
                const user = JSON.parse(saved);
                setCurrentUser(user);
            }
        }
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const results = await Promise.allSettled([
                DB.getRequirements(),
                DB.getAllProducts(),
                DB.supabase.from('marca').select('*').eq('activo', true),
                DB.getAllUsers()
            ]);

            // 0: Requirements
            if (results[0].status === 'fulfilled') {
                setRequirements(results[0].value);
            } else {
                console.error("Failed to load requirements:", results[0].reason);
                showToast('Error', 'No se pudieron cargar los requerimientos', 'error');
            }

            // 1: Products
            if (results[1].status === 'fulfilled') {
                setProducts(results[1].value || []);
            } else {
                console.error("Failed to load products:", results[1].reason);
                setProducts([]); // Safe fallback
            }

            // 2: Brands
            if (results[2].status === 'fulfilled') {
                setBrands(results[2].value.data || []);
            } else {
                console.error("Failed to load brands:", results[2].reason);
                setBrands([]);
            }

            // 3: Users (Needed for Create Form)
            if (results[3].status === 'fulfilled') {
                setUsers(results[3].value || []);
            } else {
                console.error("Failed to load users:", results[3].reason);
                setUsers([]);
            }

        } catch (error) {
            console.error("Unexpected error loading data:", error);
            showToast('Error', 'Error inesperado cargando datos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRequirement = async (payload) => {
        try {
            await DB.createRequirement(payload);
            showToast('Éxito', 'Requerimiento creado correctamente', 'success');
            closeModal();
            loadInitialData(); // Refresh list
        } catch (error) {
            console.error("Error creating requirement:", error);
            showToast('Error', 'No se pudo crear el requerimiento', 'error');
        }
    };

    const handleApprove = async (req) => {
        if (window.confirm('¿Aprobar este requerimiento?')) {
            try {
                await DB.updateRequirementStatus(req.id_requerimiento, 'A', currentUser.id_usuario);
                showToast('Aprobado', 'Requerimiento aprobado', 'success');
                loadInitialData();
                closeModal(); // Close detail modal if open
            } catch (error) {
                showToast('Error', 'Falló la aprobación', 'error');
            }
        }
    };

    const handleReject = async (req) => {
        if (window.confirm('¿Rechazar este requerimiento?')) {
            try {
                await DB.updateRequirementStatus(req.id_requerimiento, 'R', currentUser.id_usuario);
                showToast('Rechazado', 'Requerimiento rechazado', 'info');
                loadInitialData();
                closeModal(); // Close detail modal if open
            } catch (error) {
                showToast('Error', 'Falló el rechazo', 'error');
            }
        }
    };

    const handleRevert = async (req) => {
        if (window.confirm('¿Revertir a Pendiente?')) {
            try {
                await DB.revertRequirement(req.id_requerimiento);
                showToast('Revertido', 'Requerimiento vuelto a pendiente', 'success');
                loadInitialData();
                closeModal(); // Close detail modal if open
            } catch (error) {
                showToast('Error', 'Falló la reversión', 'error');
            }
        }
    };

    const openCreateModal = () => {
        openModal(
            'Nuevo Requerimiento',
            <RequirementForm
                products={products}
                brands={brands}
                users={users}
                currentUser={currentUser}
                onSubmit={handleCreateRequirement}
                closeModal={closeModal}
            />
        );
    };

    const openDetailModal = (req) => {
        openModal(
            'Detalle del Requerimiento',
            <RequirementDetailModal
                req={req}
                currentUser={currentUser}
                onApprove={() => handleApprove(req)}
                onReject={() => handleReject(req)}
                onRevert={() => handleRevert(req)}
                closeModal={closeModal}
            />
        );
    };

    // Filter Logic
    const filteredReqs = useMemo(() => {
        return requirements.filter(req => {
            // Status Filter
            if (filterStatus !== 'ALL' && req.estado !== filterStatus) return false;

            // Date Filter
            const reqDate = new Date(req.fechaHoraRequ);
            if (filterStart) {
                const startDate = new Date(filterStart);
                startDate.setHours(0, 0, 0, 0); // Start of day
                if (reqDate < startDate) return false;
            }
            if (filterEnd) {
                const endDate = new Date(filterEnd);
                endDate.setHours(23, 59, 59, 999); // End of day
                if (reqDate > endDate) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.fechaHoraRequ) - new Date(a.fechaHoraRequ));
    }, [requirements, filterStart, filterEnd, filterStatus]);

    const handleExport = async () => {
        try {
            const XLSX = (await import('xlsx'));

            const data = filteredReqs.map(req => ({
                ID: req.id_requerimiento,
                Producto: req.producto_nombre,
                Codigo: req.codigo_producto || 'N/A',
                Marca: req.marca_nombre,
                Estado: req.estado === 'A' ? 'APROBADO' : req.estado === 'R' ? 'RECHAZADO' : 'PENDIENTE',
                Solicitante: req.solicitante_nombre,
                Responsable: req.responsable_nombre || 'N/A',
                Fecha: new Date(req.fechaHoraRequ).toLocaleString(),
                Detalles: req.descripcion
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Requerimientos");
            XLSX.writeFile(wb, `Requerimientos_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            showToast('Error', 'Error al exportar a Excel', 'error');
        }
    };

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Requerimientos</h1>
                    <p className="page-subtitle">Gestionar solicitudes y stock</p>
                </div>
                <div className="page-actions">
                    <Button variant="primary" onClick={openCreateModal}>
                        <Icons.Plus size={18} />
                        Nuevo Requerimiento
                    </Button>
                </div>
            </div>

            {/* Filters Section (Integrated into Page) */}
            <div style={{
                display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end',
                marginBottom: '20px', padding: '16px', background: 'var(--bg-card)',
                borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Estado</label>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}
                    >
                        <option value="ALL">Todos</option>
                        <option value="P">Pendientes</option>
                        <option value="A">Aprobados</option>
                        <option value="R">Rechazados</option>
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Desde</label>
                    <input
                        type="date"
                        value={filterStart}
                        onChange={e => setFilterStart(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Hasta</label>
                    <input
                        type="date"
                        value={filterEnd}
                        onChange={e => setFilterEnd(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}
                    />
                </div>
                <Button variant="outline" onClick={handleExport} style={{ height: '38px' }}>
                    <Icons.Export size={16} /> Exportar
                </Button>
            </div>

            <Card>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
                ) : filteredReqs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay requerimientos que coincidan con los filtros.
                    </div>
                ) : (
                    <div className="req-list">
                        {filteredReqs.map(req => (
                            <div
                                key={req.id_requerimiento}
                                onClick={() => openDetailModal(req)}
                                style={{
                                    padding: '16px',
                                    borderBottom: '1px solid var(--border-light)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                            {req.producto_nombre}
                                        </div>
                                        {req.codigo_producto ? (
                                            <Badge variant="completed">Catálogo</Badge>
                                        ) : (
                                            <Badge variant="pending">Nuevo</Badge>
                                        )}
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {req.marca_nombre}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <span>Solicita: <strong>{req.solicitante_nombre}</strong></span>
                                        <span>Fecha: {Helpers.formatDateTime(req.fechaHoraRequ)}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <StatusBadge status={req.estado === 'A' ? 'COMPLETADO' : req.estado === 'R' ? 'RECHAZADO' : 'PENDIENTE'} />
                                    <Icons.ChevronRight size={18} color="var(--text-muted)" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </MainLayout>
    );
}

// Sub-component for Detailed View (Modal)
const RequirementDetailModal = ({ req, currentUser, onApprove, onReject, onRevert, closeModal }) => {
    const isAdmin = currentUser?.rol === 'ADMIN';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Producto</label>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{req.producto_nombre}</div>
                    {req.codigo_producto && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Código: {req.codigo_visible}</div>}
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Marca</label>
                    <div style={{ fontSize: '14px' }}>{req.marca_nombre}</div>
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Solicitante</label>
                    <div style={{ fontSize: '14px' }}>{req.solicitante_nombre}</div>
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Fecha Solicitud</label>
                    <div style={{ fontSize: '14px' }}>{Helpers.formatDateTime(req.fechaHoraRequ)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Descripción / Detalles</label>
                    <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '14px', minHeight: '60px' }}>
                        {req.descripcion || 'Sin descripción adicional.'}
                    </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Estado Actual</label>
                    <StatusBadge status={req.estado === 'A' ? 'COMPLETADO' : req.estado === 'R' ? 'RECHAZADO' : 'PENDIENTE'} />
                    {req.responsable_nombre && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Gestionado por: {req.responsable_nombre}
                        </div>
                    )}
                </div>
            </div>

            {isAdmin && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {req.estado === 'P' && (
                        <>
                            <Button variant="danger" onClick={onReject}>
                                <Icons.Close size={16} /> Rechazar
                            </Button>
                            <Button variant="success" onClick={onApprove}>
                                <Icons.Check size={16} /> Aprobar
                            </Button>
                        </>
                    )}
                    {req.estado !== 'P' && (
                        <Button variant="outline" onClick={onRevert}>
                            <Icons.Refresh size={16} /> Revertir a Pendiente
                        </Button>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <Button variant="secondary" onClick={closeModal} style={{ width: '100%' }}>Cerrar</Button>
            </div>
        </div>
    );
};

// Sub-component that manages its own state to avoid Modal stale closure issues
const RequirementForm = ({ products, brands, users, currentUser, onSubmit, closeModal }) => {
    const { showToast } = useToast();

    // Only Admin/Supervisor can change requester
    const canChangeRequester = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.rol);

    // Initialize state
    const [formData, setFormData] = useState({
        isNewProduct: false,
        isNewBrand: false,
        productId: '',
        productName: '',
        brandId: '',
        brandName: '',
        description: '',
        requesterId: currentUser?.id_usuario || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.isNewProduct && !formData.productId) {
            showToast('Error', 'Selecciona un producto o marca "Nuevo producto"', 'error');
            return;
        }
        if (formData.isNewProduct && !formData.productName) {
            showToast('Error', 'Escribe el nombre del producto', 'error');
            return;
        }
        if (!formData.requesterId) {
            showToast('Error', 'El solicitante es obligatorio', 'error');
            return;
        }

        const selectedProduct = products.find(p => p.codigo_producto == formData.productId);
        const selectedBrand = brands.find(b => b.id_marca == formData.brandId);

        const payload = {
            nombre_producto: formData.isNewProduct ? formData.productName : selectedProduct.nombre,
            codigo_producto: formData.isNewProduct ? null : parseInt(formData.productId),
            codigo_visible: !formData.isNewProduct ? selectedProduct.codigo_visible : null,
            marca_texto: formData.isNewBrand ? formData.brandName : selectedBrand?.nombre || 'General',
            id_marca: formData.isNewBrand ? null : (formData.brandId ? parseInt(formData.brandId) : (selectedProduct?.id_marca || null)),
            descripcion: formData.description,
            id_solicitante: formData.requesterId,
            id_responsable: currentUser.id_usuario // Creator
        };

        // Enhanced Brand Logic for Consistency
        if (!formData.isNewProduct && selectedProduct) {
            payload.marca_texto = selectedProduct.marca || 'Desconocida';
            payload.id_marca = selectedProduct.id_marca;
        } else if (!formData.isNewBrand && selectedBrand) {
            payload.marca_texto = selectedBrand.nombre;
        } else if (!formData.isNewBrand && !selectedBrand && formData.isNewProduct) {
            if (!payload.marca_texto) payload.marca_texto = 'Generica';
        }

        // Pass to parent
        onSubmit(payload);
    };

    const inputStyle = {
        width: '100%', padding: '10px', borderRadius: '6px',
        border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)', fontSize: '14px'
    };

    const sectionStyle = {
        padding: '16px', backgroundColor: 'var(--bg-subtle)',
        borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px'
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {canChangeRequester && (
                <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Solicitante</label>
                    <select
                        value={formData.requesterId}
                        onChange={e => setFormData({ ...formData, requesterId: e.target.value })}
                        style={inputStyle}
                        disabled={users.length === 0}
                    >
                        {users.length === 0 && <option>Cargando usuarios...</option>}
                        {users.map(u => (
                            <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Type Selection Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isNewProduct: false })}
                    style={{
                        flex: 1, padding: '10px', background: 'transparent',
                        borderBottom: !formData.isNewProduct ? '2px solid var(--color-primary)' : 'none',
                        color: !formData.isNewProduct ? 'var(--color-primary)' : 'var(--text-secondary)',
                        fontWeight: !formData.isNewProduct ? 600 : 400,
                        cursor: 'pointer'
                    }}
                >
                    Solicitar Stock
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isNewProduct: true, productId: '', brandId: '' })}
                    style={{
                        flex: 1, padding: '10px', background: 'transparent',
                        borderBottom: formData.isNewProduct ? '2px solid var(--color-primary)' : 'none',
                        color: formData.isNewProduct ? 'var(--color-primary)' : 'var(--text-secondary)',
                        fontWeight: formData.isNewProduct ? 600 : 400,
                        cursor: 'pointer'
                    }}
                >
                    Producto Nuevo
                </button>
            </div>

            <div style={sectionStyle}>
                {!formData.isNewProduct ? (
                    // EXISTING PRODUCT MODE
                    <>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Producto del Catálogo</label>
                            <select
                                value={formData.productId}
                                onChange={e => {
                                    const pid = e.target.value;
                                    const prod = products.find(p => p.codigo_producto == pid);
                                    setFormData({
                                        ...formData,
                                        productId: pid,
                                        brandId: prod?.id_marca || '',
                                        isNewBrand: false
                                    });
                                }}
                                style={inputStyle}
                                disabled={products.length === 0}
                            >
                                <option value="">Seleccionar del catálogo...</option>
                                {products.length === 0 && <option disabled>No hay productos cargados</option>}
                                {products.map(p => (
                                    <option key={p.codigo_producto} value={p.codigo_producto}>
                                        {p.nombre} {p.marca ? `- ${p.marca}` : ''} ({p.codigo_visible})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {formData.productId && (
                            <div>
                                <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Marca (Automática)</label>
                                <div style={{
                                    padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '4px',
                                    border: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '14px'
                                }}>
                                    {products.find(p => p.codigo_producto == formData.productId)?.marca || 'General'}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // NEW PRODUCT MODE
                    <>
                        <div>
                            <label style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', display: 'block' }}>Nombre del Producto</label>
                            <input
                                type="text"
                                placeholder="Ej: Taladro Percutor 500W..."
                                value={formData.productName}
                                onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                style={inputStyle}
                                autoFocus
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontWeight: 600, fontSize: '14px' }}>Marca</label>
                                <Button
                                    variant="text"
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        isNewBrand: !formData.isNewBrand,
                                        brandId: '',
                                        brandName: ''
                                    })}
                                    style={{ fontSize: '12px', color: 'var(--color-primary)', height: 'auto', padding: '2px 8px' }}
                                >
                                    {formData.isNewBrand ? 'Seleccionar existente' : 'Crear nueva marca'}
                                </Button>
                            </div>

                            {formData.isNewBrand ? (
                                <input
                                    type="text"
                                    placeholder="Nombre de la nueva marca..."
                                    value={formData.brandName}
                                    onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                                    style={inputStyle}
                                />
                            ) : (
                                <select
                                    value={formData.brandId}
                                    onChange={e => setFormData({ ...formData, brandId: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="">Seleccionar marca...</option>
                                    {brands.map(b => (
                                        <option key={b.id_marca} value={b.id_marca}>{b.nombre}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Detalles Adicionales</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descripción, link de referencia, o motivo de la solicitud..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--border-light)' }}>
                <Button variant="secondary" onClick={closeModal} type="button">Cancelar</Button>
                <Button variant="primary" type="submit">Enviar Solicitud</Button>
            </div>
        </form>
    );
};

