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

    return (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Requester Selection */}
            {canChangeRequester && (
                <div className="form-group">
                    <label>Solicitante</label>
                    <select
                        value={formData.requesterId}
                        onChange={e => setFormData({ ...formData, requesterId: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    >
                        {users.map(u => (
                            <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Product Section */}
            <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600 }}>Producto</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                            type="checkbox"
                            checked={formData.isNewProduct}
                            onChange={e => setFormData({
                                ...formData,
                                isNewProduct: e.target.checked,
                                productId: '',
                                productName: '',
                                // If switching to new product, we allow new brand selection freely
                                isNewBrand: e.target.checked ? formData.isNewBrand : false
                            })}
                        />
                        <span style={{ fontSize: '13px' }}>¿Es un producto nuevo?</span>
                    </div>
                </div>

                {formData.isNewProduct ? (
                    <input
                        type="text"
                        placeholder="Nombre del producto nuevo..."
                        value={formData.productName}
                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                        style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                    />
                ) : (
                    <select
                        value={formData.productId}
                        onChange={e => {
                            const pid = e.target.value;
                            const prod = products.find(p => p.codigo_producto == pid);
                            setFormData({
                                ...formData,
                                productId: pid,
                                // If selecting existing product, mostly lock brand to that product's brand
                                brandId: prod?.id_marca || '',
                                isNewBrand: false
                            });
                        }}
                        style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                    >
                        <option value="">Seleccionar del catálogo...</option>
                        {products.map(p => (
                            <option key={p.codigo_producto} value={p.codigo_producto}>{p.nombre} ({p.codigo_visible})</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Brand Section - Only show if New Product or specific override logic needed */}
            <div style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600 }}>Marca</label>
                    {(formData.isNewProduct) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input
                                type="checkbox"
                                checked={formData.isNewBrand}
                                onChange={e => setFormData({ ...formData, isNewBrand: e.target.checked, brandId: '', brandName: '' })}
                            />
                            <span style={{ fontSize: '13px' }}>¿Nueva marca?</span>
                        </div>
                    )}
                </div>

                {!formData.isNewProduct ? (
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {products.find(p => p.codigo_producto == formData.productId)?.marca || 'Selecciona un producto primero'}
                    </div>
                ) : formData.isNewBrand ? (
                    <input
                        type="text"
                        placeholder="Nombre de la marca..."
                        value={formData.brandName}
                        onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                    />
                ) : (
                    <select
                        value={formData.brandId}
                        onChange={e => setFormData({ ...formData, brandId: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                    >
                        <option value="">Seleccionar marca...</option>
                        {brands.map(b => (
                            <option key={b.id_marca} value={b.id_marca}>{b.nombre}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="form-group">
                <label>Descripción / Detalles Adicionales</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <Button variant="secondary" onClick={closeModal} type="button">Cancelar</Button>
                <Button variant="primary" type="submit">Crear Requerimiento</Button>
            </div>
        </form>
    );
};
