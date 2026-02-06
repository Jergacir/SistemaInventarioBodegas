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

    // Filter State
    const [statusFilter, setStatusFilter] = useState('P'); // Default Pending

    // Form State
    const [formData, setFormData] = useState({
        isNewProduct: false,
        isNewBrand: false,
        productId: '',
        productName: '',
        brandId: '',
        brandName: '',
        description: '',
        requesterId: ''
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('currentUser');
            if (saved) {
                const user = JSON.parse(saved);
                setCurrentUser(user);
                // Default requester to self
                setFormData(prev => ({ ...prev, requesterId: user.id_usuario }));
            }
        }
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [reqs, prods, brs, usrs] = await Promise.all([
                DB.getRequirements(),
                DB.getAllProducts(),
                DB.supabase.from('marca').select('*').eq('activo', true),
                DB.getAllUsers()
            ]);

            setRequirements(reqs);
            setProducts(prods);
            setBrands(brs.data || []);
            setUsers(usrs);
        } catch (error) {
            console.error("Error loading data:", error);
            showToast('Error', 'No se pudo cargar la información', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e) => {
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

        try {
            const selectedProduct = products.find(p => p.codigo_producto === parseInt(formData.productId));
            const selectedBrand = brands.find(b => b.id_marca === parseInt(formData.brandId));

            const payload = {
                nombre_producto: formData.isNewProduct ? formData.productName : selectedProduct.nombre,
                codigo_producto: formData.isNewProduct ? null : parseInt(formData.productId),
                codigo_visible: !formData.isNewProduct ? selectedProduct.codigo_visible : null,
                marca_texto: formData.isNewBrand ? formData.brandName : selectedBrand?.nombre || 'General', // Fallback if no brand selected? Assuming existing products have brand
                id_marca: formData.isNewBrand ? null : (formData.brandId ? parseInt(formData.brandId) : (selectedProduct?.id_marca || null)),
                descripcion: formData.description,
                id_solicitante: formData.requesterId,
                id_responsable: currentUser.id_usuario // Creator
            };

            // If existing product selected, use its brand name if not explicitly overridden (though UI doesn't allow overriding existing product brand easily, simplifying logic)
            if (!formData.isNewProduct && selectedProduct) {
                payload.marca_texto = selectedProduct.marca || 'Desconocida';
                payload.id_marca = selectedProduct.id_marca;
            } else if (!formData.isNewBrand && selectedBrand) {
                payload.marca_texto = selectedBrand.nombre;
            } else if (!formData.isNewBrand && !selectedBrand && formData.isNewProduct) {
                // Creating new product but didn't select brand? Default to General or require it?
                // Let's assume generic text if missing
                if (!payload.marca_texto) payload.marca_texto = 'Generica';
            }

            await DB.createRequirement(payload);
            showToast('Éxito', 'Requerimiento creado correctamente', 'success');
            closeModal();
            loadInitialData(); // Refresh list

            // Reset form
            setFormData({
                isNewProduct: false,
                isNewBrand: false,
                productId: '',
                productName: '',
                brandId: '',
                brandName: '',
                description: '',
                requesterId: currentUser.id_usuario
            });

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
            } catch (error) {
                showToast('Error', 'Falló la reversión', 'error');
            }
        }
    };

    const openCreateModal = () => {
        openModal(
            'Nuevo Requerimiento',
            <RequirementForm
                formData={formData}
                setFormData={setFormData}
                products={products}
                brands={brands}
                users={users}
                currentUser={currentUser}
                handleCreate={handleCreate}
                closeModal={closeModal}
            />
        );
    };

    const isAdmin = currentUser?.rol === 'ADMIN';

    const filteredReqs = useMemo(() => {
        if (statusFilter === 'ALL') return requirements;
        return requirements.filter(r => r.estado === statusFilter);
    }, [requirements, statusFilter]);

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Requerimientos</h1>
                    <p className="page-subtitle">Solicitud de productos nuevos o stock</p>
                </div>
                <div className="page-actions">
                    <Button variant="primary" onClick={openCreateModal}>
                        <Icons.Plus size={18} />
                        Nuevo Requerimiento
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                {[
                    { id: 'P', label: 'Pendientes' },
                    { id: 'A', label: 'Aprobados' },
                    { id: 'R', label: 'Rechazados' },
                    { id: 'ALL', label: 'Todos' }
                ].map(f => (
                    <Button
                        key={f.id}
                        variant={statusFilter === f.id ? 'primary' : 'secondary'}
                        onClick={() => setStatusFilter(f.id)}
                        style={{ borderRadius: '20px', padding: '6px 16px' }}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            <Card>
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
                ) : filteredReqs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay requerimientos en este estado.
                    </div>
                ) : (
                    <div className="req-list">
                        {filteredReqs.map(req => (
                            <div key={req.id_requerimiento} style={{
                                padding: '16px',
                                borderBottom: '1px solid var(--border-light)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
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
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        {req.descripcion || 'Sin descripción'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <span>Solicita: <strong>{req.solicitante_nombre}</strong></span>
                                        <span>Fecha: {Helpers.formatDateTime(req.fechaHoraRequ)}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <StatusBadge status={req.estado === 'A' ? 'COMPLETADO' : req.estado === 'R' ? 'RECHAZADO' : 'PENDIENTE'} />

                                    {isAdmin && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {req.estado === 'P' && (
                                                <>
                                                    <Button variant="text" onClick={() => handleApprove(req)} title="Aprobar" style={{ color: 'var(--color-success)' }}>
                                                        <Icons.Check size={18} />
                                                    </Button>
                                                    <Button variant="text" onClick={() => handleReject(req)} title="Rechazar" style={{ color: 'var(--color-danger)' }}>
                                                        <Icons.Close size={18} />
                                                    </Button>
                                                </>
                                            )}
                                            {req.estado !== 'P' && (
                                                <Button variant="text" onClick={() => handleRevert(req)} title="Revertir" style={{ color: 'var(--color-warning)' }}>
                                                    <Icons.Refresh size={18} />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </MainLayout>
    );
}

// Sub-component for Form content to keep cleaner
const RequirementForm = ({ formData, setFormData, products, brands, users, currentUser, handleCreate, closeModal }) => {

    // Only Admin/Supervisor can change requester
    const canChangeRequester = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.rol);

    // Helper for input styles
    const inputStyle = {
        width: '100%',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontSize: '14px'
    };

    // Helper for section container
    const sectionStyle = {
        padding: '16px',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: '8px',
        border: '1px solid var(--border-light)'
    };

    return (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Requester Selection */}
            {canChangeRequester && (
                <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Solicitante</label>
                    <select
                        value={formData.requesterId}
                        onChange={e => setFormData(prev => ({ ...prev, requesterId: e.target.value }))}
                        style={inputStyle}
                    >
                        {users.map(u => (
                            <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Product Section */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Producto</label>

                    {/* Toggle Switch Style */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={formData.isNewProduct}
                            onChange={e => setFormData(prev => ({
                                ...prev,
                                isNewProduct: e.target.checked,
                                productId: '',
                                productName: '',
                                // If switching to new product, clear brand selection unless it was manually set? 
                                // Better to reset to avoid confusion.
                                brandId: '',
                                isNewBrand: false
                            }))}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿Es nuevo?</span>
                    </label>
                </div>

                {formData.isNewProduct ? (
                    <div className="animate-fade-in">
                        <input
                            type="text"
                            placeholder="Nombre del producto nuevo..."
                            value={formData.productName}
                            onChange={e => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                            style={inputStyle}
                            autoFocus
                        />
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Este producto no se agregará al catálogo oficial automáticamente.
                        </div>
                    </div>
                ) : (
                    <div>
                        <select
                            value={formData.productId}
                            onChange={e => {
                                const pid = e.target.value;
                                const prod = products.find(p => String(p.codigo_producto) === String(pid));
                                setFormData(prev => ({
                                    ...prev,
                                    productId: pid,
                                    // Pre-fill brand if product has one, otherwise leave clean for user to select
                                    brandId: prod?.id_marca || '',
                                    brandName: '', // Clear custom brand name
                                    isNewBrand: false
                                }));
                            }}
                            style={inputStyle}
                        >
                            <option value="">Seleccionar del catálogo...</option>
                            {products.map(p => (
                                <option key={p.codigo_producto} value={p.codigo_producto}>
                                    {p.nombre} {p.marca ? `- ${p.marca}` : ''} ({p.codigo_visible})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Brand Section */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Marca</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={formData.isNewBrand}
                            onChange={e => setFormData(prev => ({
                                ...prev,
                                isNewBrand: e.target.checked,
                                brandId: '', // Reset selection if switching to new
                                brandName: '' // Reset text
                            }))}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿Nueva marca?</span>
                    </label>
                </div>

                {formData.isNewBrand ? (
                    <input
                        type="text"
                        placeholder="Nombre de la marca..."
                        value={formData.brandName}
                        onChange={e => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                        style={inputStyle}
                    />
                ) : (
                    <select
                        value={formData.brandId}
                        onChange={e => setFormData(prev => ({ ...prev, brandId: e.target.value }))}
                        style={inputStyle}
                        disabled={false} // Always allow selection
                    >
                        <option value="">
                            {formData.productId && !formData.brandId ? 'Elige una marca (Opcional)' : 'Seleccionar marca...'}
                        </option>
                        {brands.map(b => (
                            <option key={b.id_marca} value={b.id_marca}>{b.nombre}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Detalles Adicionales</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
