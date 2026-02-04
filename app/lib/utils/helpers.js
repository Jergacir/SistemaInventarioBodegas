/**
 * Utility Helper Functions
 */
import { DB } from '../db';
import { MockData } from '../mockData';

export const Helpers = {
    /**
     * Format a date string to locale format
     */
    formatDate(dateString, options = {}) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
    },

    /**
     * Format a date string with time
     */
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format a relative time (e.g., "hace 5 minutos")
     */
    formatRelativeTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return this.formatDate(dateString);
    },

    /**
     * Format a number with thousands separator
     */
    formatNumber(num, decimals = 0) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    },

    /**
     * Get product by ID
     */
    getProduct(productId) {
        return DB.getProductById(productId);
    },

    /**
     * Get inventory for a product in a specific warehouse
     */
    getInventory(productId, bodegaId) {
        // Map bodega string to ID if necessary (backward compatibility)
        let idBodega = bodegaId;
        if (typeof bodegaId === 'string') {
            // Normalize strings to ignore accents
            const normalizeString = (str) => {
                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            };

            const bodega = MockData.BODEGA.find(b => {
                const normalizedBodegaName = normalizeString(b.nombre);
                const normalizedSearchTerm = normalizeString(bodegaId);
                return normalizedBodegaName.includes(normalizedSearchTerm);
            });
            idBodega = bodega ? bodega.id_bodega : null;
        }

        return MockData.INVENTARIO.find(
            i => i.codigo_producto == productId && i.id_bodega == idBodega
        );
    },

    /**
     * Get total stock for a product (all warehouses)
     */
    getTotalStock(productId) {
        return DB.getTotalStock(productId);
    },

    /**
     * Check if product is below minimum stock in any warehouse
     */
    isLowStock(productId) {
        const product = this.getProduct(productId);
        if (!product) return false;

        const totalStock = this.getTotalStock(productId);
        const settings = DB.getSettings();
        const factor = (settings.stockThreshold || 100) / 100;
        return totalStock <= (product.stock_minimo * factor);
    },

    /**
     * Get products with low stock
     */
    getLowStockProducts() {
        const products = DB.getAllProducts();
        return products.filter(p => {
            const stock = this.getTotalStock(p.id);
            const settings = DB.getSettings();
            const factor = (settings.stockThreshold || 100) / 100;
            return stock <= (p.stock_minimo * factor);
        }).map(p => ({
            product: p,
            deficit: p.stock_minimo - this.getTotalStock(p.id)
        })).sort((a, b) => b.deficit - a.deficit);
    },

    /**
     * Get pending transfers
     */
    getPendingTransfers() {
        return DB.getAllMovements().filter(
            m => m.tipo === 'TRF' && m.estado === 'P'
        );
    },

    /**
     * Get movements by type
     */
    getMovementsByType(type) {
        // Map old types to new codes if needed
        const typeMap = { 'TRANSFERENCIA': 'TRF', 'ENTRADA': 'ENT', 'SALIDA': 'SAL' };
        const code = typeMap[type] || type;
        return DB.getAllMovements().filter(m => m.tipo === code);
    },

    /**
     * Create debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Generate a simple unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        if (typeof document === 'undefined') return text; // Server-side safe check
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Get status badge HTML
     */
    getStatusBadge(estado) {
        const statusMap = {
            'P': { class: 'badge-pending', text: 'Pendiente' },
            'A': { class: 'badge-completed', text: 'Aprobado' }, // For movements approved
            'C': { class: 'badge-completed', text: 'Completado' },
            'R': { class: 'badge-cancelled', text: 'Rechazado' }
        };
        // Compat with old strings if passed
        if (estado === 'PENDIENTE') return `<span class="badge badge-pending"><span class="badge-dot"></span>Pendiente</span>`;
        if (estado === 'COMPLETADO') return `<span class="badge badge-completed">Completado</span>`;

        const status = statusMap[estado] || { class: 'badge-pending', text: estado };
        return `<span class="badge ${status.class}"><span class="badge-dot"></span>${status.text}</span>`;
    },

    /**
     * Get movement type badge HTML
     */
    getTypeBadge(tipo) {
        const typeMap = {
            'ENT': { class: 'badge-completed', text: 'Entrada' },
            'SAL': { class: 'badge-cancelled', text: 'Salida' },
            'TRF': { class: 'badge-in-transit', text: 'Transferencia' }
        };
        const type = typeMap[tipo] || { class: 'badge-pending', text: tipo };
        return `<span class="badge ${type.class}">${type.text}</span>`;
    },

    /**
     * Get warehouse display name
     */
    getWarehouseName(idBodega) {
        if (!idBodega) return 'Desconocido';
        if (typeof idBodega === 'string' && isNaN(idBodega)) {
            // It's a name like 'PRINCIPAL'
            const bodega = MockData.BODEGA.find(b => b.nombre.toUpperCase() === idBodega.toUpperCase());
            return bodega ? bodega.nombre : idBodega;
        }
        const bodega = MockData.BODEGA.find(b => b.id_bodega == idBodega);
        return bodega ? bodega.nombre : 'Desconocido';
    }
};
