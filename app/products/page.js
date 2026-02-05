'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { DB } from '../lib/database';
import { Helpers } from '../lib/utils/helpers';
import { MockData } from '../lib/mockData';

export default function ProductsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');

    // Data states
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const { openModal, closeModal } = useModal();
    const { showToast } = useToast();

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        setCurrentUser(user);
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [fetchedProducts, fetchedCategories, fetchedBrands] = await Promise.all([
                DB.getAllProducts(),
                DB.getAllCategories(),
                DB.getAllBrands()
            ]);
            setProducts(fetchedProducts || []);
            setCategories(fetchedCategories || []);
            setBrands(fetchedBrands || []);
        } catch (error) {
            console.error("Error loading data:", error);
            showToast("Error", "Error al cargar los datos", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const fetchedProducts = await DB.getAllProducts();
            setProducts(fetchedProducts || []);
        } catch (error) {
            console.error("Error loading products:", error);
        }
    };

    const canManage = currentUser && ['ADMIN', 'SUPERVISOR'].includes(currentUser.rol);

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchTerm ||
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.codigo_visible || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || p.categoria === categoryFilter;

        let matchesStock = true;
        if (stockFilter === 'low') {
            matchesStock = p.stock_total <= p.stock_minimo;
        } else if (stockFilter === 'normal') {
            matchesStock = p.stock_total > p.stock_minimo;
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    const openProductModal = (productId = null, readOnly = false) => {
        const product = productId ? products.find(p => p.id === productId) : null;
        const isEdit = !!product;

        if (readOnly) {
            showReadOnlyModal(product);
        } else {
            showEditModal(product, isEdit);
        }
    };

    const showReadOnlyModal = (product) => {
        const totalStock = product.stock_total || 0;
        const stockPrincipal = product.stock_principal || 0;
        const stockInstrum = product.stock_instrumentacion || 0;
        const isLow = totalStock <= product.stock_minimo;

        openModal(
            'Información del Producto',
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Código</label>
                            <div style={{ fontSize: '16px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{product.codigo_visible}</div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Producto</label>
                            <div style={{ fontSize: '16px', fontWeight: 500 }}>{product.nombre}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Categoría</label>
                                <div>{product.categoria}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Marca</label>
                                <div>{product.marca || '-'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Unidad</label>
                                <div>{product.unidad_medida}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Stock Mínimo</label>
                                <div>{product.stock_minimo}</div>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Ubicaciones</label>
                            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Principal:</span> {product.ubicacion_principal || 'N/A'}
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Instrumentación:</span> {product.ubicacion_instrumentacion || 'N/A'}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div style={{
                            height: '180px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: 'var(--bg-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            overflow: 'hidden'
                        }}>
                            {product.imagen_url ? (
                                <img src={product.imagen_url} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <Icons.Items size={64} style={{ color: 'var(--text-muted)' }} />
                            )}
                        </div>
                        <div style={{
                            background: isLow ? 'rgba(239,68,68,0.1)' : 'var(--bg-subtle)',
                            padding: '16px',
                            borderRadius: '8px',
                            border: isLow ? '1px solid var(--color-danger)' : '1px solid var(--border-light)'
                        }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Stock</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: isLow ? 'var(--color-danger)' : 'var(--text-primary)' }}>{totalStock}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{stockPrincipal}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Principal</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{stockInstrum}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Instrum.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
                </div>
            </div>,
            'xl'
        );
    };

    const showEditModal = (product, isEdit) => {
        openModal(
            isEdit ? 'Editar Producto' : 'Nuevo Producto',
            <ProductForm
                product={product}
                isEdit={isEdit}
                categories={categories}
                brands={brands}
                onSave={(data) => {
                    saveProduct(product?.id, data);
                }}
                onDelete={isEdit ? () => deleteProduct(product.id) : null}
                onCancel={closeModal}
            />,
            'xl'
        );
    };

    const saveProduct = async (productId, data) => {
        if (!data.codigo_visible || !data.nombre || !data.categoria || !data.unidad_medida) {
            showToast('Error', 'Por favor completa todos los campos requeridos', 'error');
            return;
        }

        try {
            await DB.saveProduct({ id: productId, ...data });
            showToast(
                productId ? 'Producto Actualizado' : 'Producto Creado',
                `${data.nombre} ha sido guardado correctamente`,
                'success'
            );
            closeModal();
            loadProducts(); // Reload only products

            // Reload categories/brands if new ones might have been created
            // Optimization: Only do this if we suspect new ones, or just strict reload
            if (data.categoria && !categories.includes(data.categoria)) {
                const newCats = await DB.getAllCategories();
                setCategories(newCats);
            }
            if (data.marca && !brands.includes(data.marca)) {
                const newBrands = await DB.getAllBrands();
                setBrands(newBrands);
            }

        } catch (error) {
            console.error("Error saving product:", error);
            showToast('Error', `No se pudo guardar: ${error.message || error.details || 'Error desconoc'}`, 'error');
        }
    };

    const deleteProduct = async (productId) => {
        const product = Helpers.getProduct(productId) || products.find(p => p.id === productId); // Fallback to state if Helper not updated
        // Note: Helpers.getProduct is sync and uses MockData directly usually. 
        // If we are fully Supabase, Helpers might be broken if it imports MockData.
        // But for now, let's rely on finding it in our 'products' state which is hydrated.

        if (!product) return;

        if (confirm(`¿Estás seguro de eliminar "${product.nombre}"? Esta acción no se puede deshacer.`)) {
            try {
                await DB.deleteProduct(productId);
                showToast('Producto Eliminado', `${product.nombre} ha sido eliminado`, 'success');
                closeModal();
                loadProducts();
            } catch (error) {
                console.error("Error deleting product:", error);
                showToast('Error', `No se pudo eliminar: ${error.message || 'Error desconocido'}`, 'error');
            }
        }
    };

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Productos</h1>
                    <p className="page-subtitle">Catálogo maestro de productos</p>
                </div>
                <div className="page-actions">
                    {canManage && (
                        <Button variant="primary" onClick={() => openProductModal()}>
                            <Icons.Plus size={18} />
                            Nuevo Producto
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 'var(--spacing-6)', padding: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="table-search" style={{ flex: 1, maxWidth: '300px' }}>
                        <Icons.Search size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Categoría</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Estado</label>
                        <select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="low">Stock Bajo</option>
                            <option value="normal">Stock Normal</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Products Grid */}
            <div className="products-grid">
                {isLoading ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                        Cargando productos...
                    </div>
                ) : filteredProducts.map(product => {
                    const totalStock = product.stock_total || 0;
                    const stockPrincipal = product.stock_principal || 0;
                    const stockInstrum = product.stock_instrumentacion || 0;
                    const isLow = totalStock <= product.stock_minimo;

                    return (
                        <Card
                            key={product.id}
                            className="product-card"
                            onClick={() => openProductModal(product.id, !canManage)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="product-card-image">
                                {product.imagen_url ? (
                                    <img src={product.imagen_url} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <Icons.Items size={48} />
                                )}
                            </div>
                            <div className="product-card-body">
                                <div className="product-card-code">{product.codigo_visible}</div>
                                <div className="product-card-name">{product.nombre}</div>
                                <span className="product-card-category">{product.categoria}</span>

                                <div className="product-card-stock">
                                    <div className="stock-item">
                                        <span className="stock-label">Principal</span>
                                        <span className={`stock-value ${stockPrincipal <= product.stock_minimo ? 'low' : ''}`}>
                                            {stockPrincipal}
                                        </span>
                                    </div>
                                    <div className="stock-item">
                                        <span className="stock-label">Instrum.</span>
                                        <span className={`stock-value ${stockInstrum <= product.stock_minimo ? 'low' : ''}`}>
                                            {stockInstrum}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {filteredProducts.length === 0 && (
                <div className="empty-state">
                    <Icons.Search size={64} className="empty-state-icon" />
                    <h3 className="empty-state-title">No se encontraron productos</h3>
                    <p className="empty-state-text">Intenta con otros términos de búsqueda o ajusta los filtros</p>
                </div>
            )}
        </MainLayout>
    );
}

// Product Form Component
function ProductForm({ product, isEdit, categories, brands, onSave, onDelete, onCancel }) {
    const [formData, setFormData] = useState({
        codigo_visible: product?.codigo_visible || '',
        nombre: product?.nombre || '',
        categoria: product?.categoria || '',
        marca: product?.marca || '',
        unidad_medida: product?.unidad_medida || '',
        stock_minimo: product?.stock_minimo || 0,
        ubicacion_principal: product?.ubicacion_principal || '',
        ubicacion_instrumentacion: product?.ubicacion_instrumentacion || '',
        imagen_url: product?.imagen_url || ''
    });

    const [imagePreview, setImagePreview] = useState(product?.imagen_url || '');
    const fileInputRef = useRef(null);
    const [categoryMode, setCategoryMode] = useState('select');
    const [brandMode, setBrandMode] = useState('select');

    // Parse location into parts
    const parseLocation = (loc) => {
        if (!loc || loc === 'N/A') return { type: '', row: '', level: '' };
        const parts = loc.split('-');
        if (parts.length === 3) {
            return { type: parts[0], row: parts[1], level: parts[2] };
        }
        return { type: '', row: '', level: '' };
    };

    const [mainLoc, setMainLoc] = useState(parseLocation(product?.ubicacion_principal));
    const [instLoc, setInstLoc] = useState(parseLocation(product?.ubicacion_instrumentacion));

    const types = ['EST', 'RET', 'DSC'];
    const rows = Array.from({ length: 30 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const levels = Array.from({ length: 4 }, (_, i) => (i + 1).toString().padStart(2, '0'));

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            alert('La imagen debe ser menor a 500KB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setImagePreview(event.target.result);
            setFormData({ ...formData, imagen_url: event.target.result });
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Build locations
        let ubicacion_principal = '';
        if (mainLoc.type && mainLoc.row && mainLoc.level) {
            ubicacion_principal = `${mainLoc.type}-${mainLoc.row}-${mainLoc.level}`;
        }

        let ubicacion_instrumentacion = '';
        if (instLoc.type && instLoc.row && instLoc.level) {
            ubicacion_instrumentacion = `${instLoc.type}-${instLoc.row}-${instLoc.level}`;
        }

        onSave({
            ...formData,
            ubicacion_principal,
            ubicacion_instrumentacion,
            stock_minimo: parseFloat(formData.stock_minimo) || 0
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="form-group">
                    <label>Código *</label>
                    <input
                        type="text"
                        value={formData.codigo_visible}
                        onChange={(e) => setFormData({ ...formData, codigo_visible: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="Ej: 1005089"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Categoría *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {categoryMode === 'select' ? (
                            <select
                                value={categories.includes(formData.categoria) ? formData.categoria : 'other'}
                                onChange={(e) => {
                                    if (e.target.value === 'other') {
                                        setCategoryMode('text');
                                        setFormData({ ...formData, categoria: '' });
                                    } else {
                                        setFormData({ ...formData, categoria: e.target.value });
                                    }
                                }}
                                required={categoryMode === 'select'}
                                style={{ flex: 1 }}
                            >
                                <option value="">Seleccionar...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="other" style={{ fontWeight: 'bold' }}>+ Nueva</option>
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={formData.categoria}
                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                placeholder="Nueva categoría"
                                required={categoryMode === 'text'}
                                style={{ flex: 1 }}
                                autoFocus
                            />
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                if (categoryMode === 'select') {
                                    setCategoryMode('text');
                                    setFormData({ ...formData, categoria: '' });
                                } else {
                                    setCategoryMode('select');
                                    setFormData({ ...formData, categoria: '' });
                                }
                            }}
                            title="Alternar entrada"
                            className="btn-icon"
                        >
                            <Icons.Edit size={16} />
                        </Button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Marca</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {brandMode === 'select' ? (
                            <select
                                value={brands.includes(formData.marca) ? formData.marca : 'other'}
                                onChange={(e) => {
                                    if (e.target.value === 'other') {
                                        setBrandMode('text');
                                        setFormData({ ...formData, marca: '' });
                                    } else {
                                        setFormData({ ...formData, marca: e.target.value });
                                    }
                                }}
                                style={{ flex: 1 }}
                            >
                                <option value="">Seleccionar...</option>
                                {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                <option value="other" style={{ fontWeight: 'bold' }}>+ Nueva</option>
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={formData.marca}
                                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                placeholder="Nueva marca"
                                style={{ flex: 1 }}
                                autoFocus
                            />
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                if (brandMode === 'select') {
                                    setBrandMode('text');
                                    setFormData({ ...formData, marca: '' });
                                } else {
                                    setBrandMode('select');
                                    setFormData({ ...formData, marca: '' });
                                }
                            }}
                            title="Alternar entrada"
                            className="btn-icon"
                        >
                            <Icons.Edit size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Nombre del Producto *</label>
                <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre descriptivo del producto"
                    required
                />
            </div>



            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                    <label>Unidad de Medida *</label>
                    <select
                        value={formData.unidad_medida}
                        onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                        required
                    >
                        <option value="">Seleccionar...</option>
                        <option value="UNIDAD">Unidad</option>
                        <option value="METRO">Metro</option>
                        <option value="CAJA">Caja</option>
                        <option value="LITRO">Litro</option>
                        <option value="KILOGRAMO">Kilogramo</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Stock Mínimo *</label>
                    <input
                        type="number"
                        value={formData.stock_minimo}
                        onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                        min="0"
                        step="0.01"
                        required
                    />
                </div>
            </div>

            {/* Locations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                    <label>Ubicación Bodega Principal</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <select value={mainLoc.type} onChange={(e) => setMainLoc({ ...mainLoc, type: e.target.value })}>
                            <option value="">Tipo</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={mainLoc.row} onChange={(e) => setMainLoc({ ...mainLoc, row: e.target.value })}>
                            <option value="">N°</option>
                            {rows.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={mainLoc.level} onChange={(e) => setMainLoc({ ...mainLoc, level: e.target.value })}>
                            <option value="">Nivel</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Ubicación Bodega Instrumentación</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <select value={instLoc.type} onChange={(e) => setInstLoc({ ...instLoc, type: e.target.value })}>
                            <option value="">Tipo</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={instLoc.row} onChange={(e) => setInstLoc({ ...instLoc, row: e.target.value })}>
                            <option value="">N°</option>
                            {rows.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={instLoc.level} onChange={(e) => setInstLoc({ ...instLoc, level: e.target.value })}>
                            <option value="">Nivel</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Image Upload */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Imagen del Producto</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '8px',
                        border: '2px dashed var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-subtle)',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Icons.Items size={32} style={{ color: 'var(--text-muted)' }} />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ width: '100%', marginBottom: '8px' }}
                        >
                            Seleccionar Imagen
                        </Button>
                        {imagePreview && (
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                    setImagePreview('');
                                    setFormData({ ...formData, imagen_url: '' });
                                }}
                                style={{ width: '100%' }}
                            >
                                Quitar imagen
                            </Button>
                        )}
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Máximo 500KB. Formatos: JPG, PNG, WEBP
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-light)'
            }}>
                <div>
                    {onDelete && (
                        <Button type="button" variant="danger" onClick={onDelete}>
                            Eliminar
                        </Button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary">
                        {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
