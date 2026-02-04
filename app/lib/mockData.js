/**
 * Mock Data for Inventory Management System - SQL Schema Simulation
 * Based on the provided ER Diagram
 */

export const MockData = {
    // CATEGORIA table
    CATEGORIA: [
        { id_categoria: 1, nombre_categoria: 'Sensores' },
        { id_categoria: 2, nombre_categoria: 'Cables' },
        { id_categoria: 3, nombre_categoria: 'Válvulas' },
        { id_categoria: 4, nombre_categoria: 'Controladores' },
        { id_categoria: 5, nombre_categoria: 'Tubería' },
        { id_categoria: 6, nombre_categoria: 'Fittings' }
    ],

    // MARCA table
    MARCA: [
        { id_marca: 1, nombre: 'Wika' },
        { id_marca: 2, nombre: 'Phelps Dodge' },
        { id_marca: 3, nombre: 'Belden' },
        { id_marca: 4, nombre: 'Generico' },
        { id_marca: 5, nombre: 'Siemens' }
    ],

    // UBICACION table
    UBICACION: [
        { id_ubicacion: 1, tipo: 'EST', numero: 1, nivel: '02' }, // A-01-02 equivalent
        { id_ubicacion: 2, tipo: 'EST', numero: 1, nivel: '03' },
        { id_ubicacion: 3, tipo: 'EST', numero: 2, nivel: '01' },
        { id_ubicacion: 4, tipo: 'EST', numero: 2, nivel: '02' },
        { id_ubicacion: 5, tipo: 'EST', numero: 3, nivel: '01' },
        { id_ubicacion: 6, tipo: 'GAN', numero: 1, nivel: '00' } // Generic/Floor
    ],

    // BODEGA table
    BODEGA: [
        { id_bodega: 1, nombre: 'Principal' },
        { id_bodega: 2, nombre: 'Instrumentación' },
        { id_bodega: 3, nombre: 'Cliente Final' } // Virtual warehouse for exits
    ],

    // PRODUCTO table
    PRODUCTO: [
        {
            codigo_producto: 10000969,
            nombre: 'Sensor de Temperatura PT100',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 10,
            id_marca: 1,
            id_categoria: 1,
            id_ubicacion_princip: 1,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 10000970,
            nombre: 'Sensor de Presión 0-10 Bar',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 5,
            id_marca: 1,
            id_categoria: 1,
            id_ubicacion_princip: 2,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 1020825,
            nombre: 'Cable Eléctrico #12 AWG',
            unidad: 'METRO',
            url_imagen: null,
            stock_minimo: 100,
            id_marca: 2,
            id_categoria: 2,
            id_ubicacion_princip: 3,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 1020826,
            nombre: 'Cable Instrumentación 2x18 AWG',
            unidad: 'METRO',
            url_imagen: null,
            stock_minimo: 50,
            id_marca: 3,
            id_categoria: 2,
            id_ubicacion_princip: 4,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 2000150,
            nombre: 'Válvula Solenoide 1/2"',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 8,
            id_marca: 4,
            id_categoria: 3,
            id_ubicacion_princip: 5,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 2000151,
            nombre: 'Válvula de Bola 1"',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 6,
            id_marca: 4,
            id_categoria: 3,
            id_ubicacion_princip: 6,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 3005001,
            nombre: 'Módulo PLC Digital I/O',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 3,
            id_marca: 5,
            id_categoria: 4,
            id_ubicacion_princip: 6,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 3005002,
            nombre: 'Módulo Analógico 4-20mA',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 4,
            id_marca: 5,
            id_categoria: 4,
            id_ubicacion_princip: 6,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 4001001,
            nombre: 'Tubería Acero Inox 1"',
            unidad: 'METRO',
            url_imagen: null,
            stock_minimo: 20,
            id_marca: 4,
            id_categoria: 5,
            id_ubicacion_princip: 6,
            id_ubicacion_instrum: 6
        },
        {
            codigo_producto: 4001002,
            nombre: 'Fitting Unión 1"',
            unidad: 'UNIDAD',
            url_imagen: null,
            stock_minimo: 15,
            id_marca: 4,
            id_categoria: 6,
            id_ubicacion_princip: 6,
            id_ubicacion_instrum: 6
        }
    ],

    // INVENTARIO table
    INVENTARIO: [
        // Principal (id_bodega: 1)
        { codigo_producto: 10000969, id_bodega: 1, stock: 25, estado: 'A' },
        { codigo_producto: 10000970, id_bodega: 1, stock: 2, estado: 'A' },
        { codigo_producto: 1020825, id_bodega: 1, stock: 250, estado: 'A' },
        { codigo_producto: 1020826, id_bodega: 1, stock: 45, estado: 'A' },
        { codigo_producto: 2000150, id_bodega: 1, stock: 15, estado: 'A' },
        { codigo_producto: 2000151, id_bodega: 1, stock: 8, estado: 'A' },
        { codigo_producto: 3005001, id_bodega: 1, stock: 6, estado: 'A' },
        { codigo_producto: 3005002, id_bodega: 1, stock: 4, estado: 'A' },
        { codigo_producto: 4001001, id_bodega: 1, stock: 35, estado: 'A' },
        { codigo_producto: 4001002, id_bodega: 1, stock: 22, estado: 'A' },

        // Instrumentacion (id_bodega: 2)
        { codigo_producto: 10000969, id_bodega: 2, stock: 8, estado: 'A' },
        { codigo_producto: 10000970, id_bodega: 2, stock: 1, estado: 'A' },
        { codigo_producto: 1020825, id_bodega: 2, stock: 80, estado: 'A' },
        { codigo_producto: 1020826, id_bodega: 2, stock: 25, estado: 'A' },
        { codigo_producto: 2000150, id_bodega: 2, stock: 5, estado: 'A' },
        { codigo_producto: 2000151, id_bodega: 2, stock: 4, estado: 'A' },
        { codigo_producto: 3005001, id_bodega: 2, stock: 2, estado: 'A' },
        { codigo_producto: 3005002, id_bodega: 2, stock: 1, estado: 'A' },
        { codigo_producto: 4001001, id_bodega: 2, stock: 12, estado: 'A' },
        { codigo_producto: 4001002, id_bodega: 2, stock: 8, estado: 'A' }
    ],

    // USUARIO table
    USUARIO: [
        {
            id_usuario: 1,
            nombre_completo: 'Admin Demo',
            rol: 'A', // Admin
            correo: 'admin@inventario.com',
            contrasena: '1234',
            estado: true
        },
        {
            id_usuario: 2,
            nombre_completo: 'Carlos Supervisor',
            rol: 'S', // Supervisor
            correo: 'carlos@inventario.com',
            contrasena: '1234',
            estado: true
        },
        {
            id_usuario: 3,
            nombre_completo: 'María Operadora',
            rol: 'O', // Operador
            correo: 'maria@inventario.com',
            contrasena: '1234',
            estado: true
        }
    ],

    // MOVIMIENTO table
    MOVIMIENTO: [
        {
            id_movimiento: 1,
            codigo_movimiento: 'TRF-000001',
            tipo: 'TRF',
            cantidad: 5,
            estado: 'P', // Pendiente
            notas: 'Solicitud urgente para mantenimiento',
            fechaHoraSolicitud: '2026-02-02T08:30:00',
            fechaHoraAprobacion: null,
            id_responsable: null,
            id_solicitante: 1,
            codigo_producto: 10000969,
            id_bodega_origen: 1,
            id_bodega_destino: 2
        },
        {
            id_movimiento: 2,
            codigo_movimiento: 'TRF-000002',
            tipo: 'TRF',
            cantidad: 50,
            estado: 'P',
            notas: 'Reabastecimiento semanal',
            fechaHoraSolicitud: '2026-02-02T09:15:00',
            fechaHoraAprobacion: null,
            id_responsable: null,
            id_solicitante: 1,
            codigo_producto: 1020825,
            id_bodega_origen: 1,
            id_bodega_destino: 2
        },
        {
            id_movimiento: 3,
            codigo_movimiento: 'SAL-000001',
            tipo: 'SAL',
            cantidad: 2,
            estado: 'C', // Completado
            notas: 'Proyecto Línea 3',
            fechaHoraSolicitud: '2026-02-01T14:20:00',
            fechaHoraAprobacion: '2026-02-01T14:20:00',
            id_responsable: 1,
            id_solicitante: 3,
            codigo_producto: 10000970,
            id_bodega_origen: 2,
            id_bodega_destino: 3
        },
        {
            id_movimiento: 4,
            codigo_movimiento: 'ENT-000001',
            tipo: 'ENT',
            cantidad: 10,
            estado: 'C',
            notas: 'Orden de compra #4521',
            fechaHoraSolicitud: '2026-02-01T10:00:00',
            fechaHoraAprobacion: '2026-02-01T10:00:00',
            id_responsable: 1,
            id_solicitante: 1,
            codigo_producto: 2000150,
            id_bodega_origen: null, // External
            id_bodega_destino: 1
        }
    ],

    // --- Settings ---
    SETTINGS: {
        theme: 'dark',
        lowStockAlert: true,
        transferAlert: true,
        stockThreshold: 100 // Percentage
    },

    // Helper for generating IDs
    _sequences: {
        movimiento: 4
    }
};
