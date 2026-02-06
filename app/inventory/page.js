'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card, Button, Icons, Badge } from '../components/ui';
import { useModal } from '../components/ui/Modal';
import { DB } from '../lib/database';
import { Helpers } from '../lib/utils/helpers';

export default function InventoryPage() {
    const [selectedWarehouse, setSelectedWarehouse] = useState(1); // 1 = Principal, 2 = Instrumentacion
    const [searchTerm, setSearchTerm] = useState('');
    const { openModal, closeModal } = useModal();

    // Data states
    const [inventoryData, setInventoryData] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedInventory, fetchedWarehouses] = await Promise.all([
                DB.getInventory(),
                DB.getAllWarehouses()
            ]);
            setInventoryData(fetchedInventory || []);
            setWarehouses(fetchedWarehouses || []);
        } catch (error) {
            console.error("Error loading inventory:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter inventory based on selection
    const getFilteredInventory = () => {
        return inventoryData
            .filter(i => i.id_bodega === selectedWarehouse)
            .map(inv => {
                const product = inv.producto || {};
                return {
                    ...inv,
                    product_id: inv.codigo_producto,
                    product_code: product.codigo_visible || '',
                    product_name: product.nombre || '',
                    category: product.categoria || '',
                    unit: product.unidad_medida || '',
                    min_stock: product.stock_minimo || 0,
                    location: selectedWarehouse === 1 ? product.ubicacion_principal : product.ubicacion_instrumentacion,
                    brand: product.marca || 'Generico',
                    imagen_url: product.imagen_url,
                    is_low: inv.stock <= (product.stock_minimo || 0)
                };
            })
            .filter(item => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return item.product_name.toLowerCase().includes(search) ||
                    String(item.product_code).toLowerCase().includes(search) ||
                    String(item.category || '').toLowerCase().includes(search) ||
                    String(item.brand || '').toLowerCase().includes(search);
            })
            .sort((a, b) => a.is_low === b.is_low ? 0 : a.is_low ? -1 : 1);
    };

    const filteredInventory = getFilteredInventory();

    // Get warehouse stats
    const getWarehouseStats = (warehouseId) => {
        const inv = inventoryData.filter(i => i.id_bodega === warehouseId);
        const total = inv.reduce((sum, i) => sum + i.stock, 0);
        return `${inv.length} productos · ${Helpers.formatNumber(total)} unidades`;
    };

    // Open product detail modal on row click
    const openProductModal = (item) => {
        // Find product data from inventory item
        const product = item.producto || inventoryData.find(i => i.codigo_producto === item.product_id)?.producto;

        if (!product) return;

        // Calculate stocks strictly from current inventory data
        const stockPrincipal = inventoryData.find(i => i.codigo_producto === product.id && i.id_bodega === 1)?.stock || 0;
        const stockInstrum = inventoryData.find(i => i.codigo_producto === product.id && i.id_bodega === 2)?.stock || 0;
        const totalStock = stockPrincipal + stockInstrum;
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
                            background: 'var(--bg-subtle)',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            height: '100%'
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>Descripción</label>
                                <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                                    {product.descripcion || 'Sin descripción disponible.'}
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
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
                </div>
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
                </div>
            </div>,
            'xl'
        );
    };

    return (
        <MainLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventario</h1>
                    <p className="page-subtitle">Control de existencias por bodega</p>
                </div>
            </div>

            {/* Warehouse Tabs */}
            <div className="warehouse-tabs">
                {warehouses.map(wh => (
                    <button
                        key={wh.id_bodega}
                        className={`warehouse-tab ${selectedWarehouse === wh.id_bodega ? 'active' : ''}`}
                        onClick={() => setSelectedWarehouse(wh.id_bodega)}
                    >
                        <div className="warehouse-tab-icon">
                            {wh.id_bodega === 1 ? <Icons.Home size={20} /> : <Icons.Inventory size={20} />}
                        </div>
                        <div className="warehouse-tab-info">
                            <div className="warehouse-tab-name">{wh.nombre}</div>
                            <div className="warehouse-tab-count">
                                {getWarehouseStats(wh.id_bodega)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Inventory Table */}
            <Card>
                <div className="table-header" style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--border-light)' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                        Inventario en {warehouses.find(w => w.id_bodega === selectedWarehouse)?.nombre || 'Bodega'}
                    </h3>
                    <div className="table-search" style={{ marginTop: 'var(--spacing-3)' }}>
                        <Icons.Search size={16} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>Código</th>
                                <th>Producto</th>
                                <th style={{ width: '150px' }}>Cantidad</th>
                                <th style={{ width: '100px' }}>Mínimo</th>
                                <th style={{ width: '120px' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                        Cargando inventario...
                                    </td>
                                </tr>
                            ) : filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className="empty-state">
                                            <Icons.Search size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                                            <h3 className="empty-state-title">No hay productos en esta bodega</h3>
                                            <p className="empty-state-text">Ajusta la búsqueda o selecciona otra bodega</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map(item => (
                                    <tr
                                        key={`${item.product_id}-${item.id_bodega}`}
                                        onClick={() => openProductModal(item)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                                                {item.product_code}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="product-info">
                                                <div className="product-details">
                                                    <div className="product-name">{item.product_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        <span>{item.category}</span>
                                                        <span style={{ margin: '0 4px' }}>•</span>
                                                        <span>{item.brand}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontWeight: 600,
                                                color: item.is_low ? 'var(--color-danger)' : 'var(--text-primary)'
                                            }}>
                                                {Helpers.formatNumber(item.stock, 2)}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                                {item.unit?.toLowerCase()}
                                            </span>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                📍 {item.location || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {Helpers.formatNumber(item.min_stock)}
                                            </span>
                                        </td>
                                        <td>
                                            {item.is_low ? (
                                                <Badge variant="pending">Stock Bajo</Badge>
                                            ) : (
                                                <Badge variant="completed">Normal</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </MainLayout>
    );
}
