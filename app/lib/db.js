/**
 * Database Service
 * Acts as an ORM/Interface for the MockData SQL simulation
 */
import { MockData } from "./mockData";
import { CodeGenerator } from "./utils/codeGenerator";

export const DB = {
  // --- Products ---

  getAllProducts() {
    return MockData.PRODUCTO.map((p) => this.hydrateProduct(p));
  },

  getProductById(id) {
    const product = MockData.PRODUCTO.find((p) => p.codigo_producto == id);
    return product ? this.hydrateProduct(product) : null;
  },

  hydrateProduct(product) {
    const marca = MockData.MARCA.find((m) => m.id_marca === product.id_marca);
    const categoria = MockData.CATEGORIA.find(
      (c) => c.id_categoria === product.id_categoria,
    );
    const ubicacion_p = MockData.UBICACION.find(
      (u) => u.id_ubicacion === product.id_ubicacion_princip,
    );
    const ubicacion_i = MockData.UBICACION.find(
      (u) => u.id_ubicacion === product.id_ubicacion_instrum,
    );

    // Calculate stock from INVENTARIO
    const inventory = MockData.INVENTARIO.filter(i => i.codigo_producto == product.codigo_producto);
    const stock_principal = inventory.find(i => i.id_bodega === 1)?.stock || 0;
    const stock_instrumentacion = inventory.find(i => i.id_bodega === 2)?.stock || 0;
    const stock_total = stock_principal + stock_instrumentacion;

    return {
      ...product,
      id: product.codigo_producto, // maintain compatibility with UI
      codigo_visible: product.codigo_producto, // alias for UI
      nombre_marca: marca ? marca.nombre : "Desconocida",
      nombre_categoria: categoria ? categoria.nombre_categoria : "Desconocida",
      categoria: categoria ? categoria.nombre_categoria : "Desconocida", // Alias for UI
      marca: marca ? marca.nombre : "Desconocida", // Alias for UI
      unidad_medida: product.unidad, // Alias for UI
      imagen_url: product.url_imagen, // Alias for UI
      // Stock properties (Parity with SupabaseDB)
      stock_total,
      stock_principal,
      stock_instrumentacion,

      ubicacion_principal: ubicacion_p
        ? `${ubicacion_p.tipo}-${ubicacion_p.numero}-${ubicacion_p.nivel}`
        : "N/A",
      ubicacion_instrumentacion: ubicacion_i
        ? `${ubicacion_i.tipo}-${ubicacion_i.numero}-${ubicacion_i.nivel}`
        : "N/A",
    };
  },

  getAllCategories() {
    return MockData.CATEGORIA.map((c) => c.nombre_categoria);
  },

  getAllBrands() {
    return MockData.MARCA.map((m) => m.nombre);
  },

  saveProduct(productData) {
    // Simple implementation: Update if exists, else match keys and push
    // Note: Real implementation would handle IDs for FKs (brand/category) lookup

    let existing = MockData.PRODUCTO.find(
      (p) => p.codigo_producto == productData.id,
    );

    // Resolve FKs (simple lookup or create)
    let cat = MockData.CATEGORIA.find(
      (c) => c.nombre_categoria === productData.categoria,
    );
    if (!cat) {
      cat = {
        id_categoria: MockData.CATEGORIA.length + 1,
        nombre_categoria: productData.categoria,
      };
      MockData.CATEGORIA.push(cat);
    }

    let brand = MockData.MARCA.find((m) => m.nombre === productData.marca);
    if (!brand) {
      brand = {
        id_marca: MockData.MARCA.length + 1,
        nombre: productData.marca,
      };
      MockData.MARCA.push(brand);
    }

    // Helper to resolve Location ID
    const resolveLocation = (locString) => {
      if (!locString || locString === "N/A") return null;
      const [type, row, level] = locString.split("-");
      if (!type || !row || !level) return null;

      // Find existing
      // Note: row is number, level is string in our Mock Schema
      const rowNum = parseInt(row);

      let loc = MockData.UBICACION.find(
        (u) => u.tipo === type && u.numero === rowNum && u.nivel === level,
      );

      if (!loc) {
        // Create new
        loc = {
          id_ubicacion: MockData.UBICACION.length + 1,
          tipo: type,
          numero: rowNum,
          nivel: level,
        };
        MockData.UBICACION.push(loc);
      }
      return loc.id_ubicacion;
    };

    const idPrincip = resolveLocation(productData.ubicacion_principal) || 6; // Default to Generic
    const idInstrum =
      resolveLocation(productData.ubicacion_instrumentacion) || 6;

    const rawProduct = {
      codigo_producto: productData.codigo_visible || productData.id,
      nombre: productData.nombre,
      unidad: productData.unidad_medida,
      url_imagen: productData.imagen_url,
      stock_minimo: productData.stock_minimo,
      id_marca: brand.id_marca,
      id_categoria: cat.id_categoria,
      id_ubicacion_princip: idPrincip,
      id_ubicacion_instrum: idInstrum,
    };

    if (existing) {
      // Check if ID (Code) changed
      const oldId = existing.codigo_producto;
      const newId = rawProduct.codigo_producto;

      if (oldId != newId) {
        // Cascade update to Inventory
        MockData.INVENTARIO.forEach((item) => {
          if (item.codigo_producto == oldId) {
            item.codigo_producto = newId;
          }
        });

        // Cascade update to Movements
        MockData.MOVIMIENTO.forEach((mov) => {
          if (mov.codigo_producto == oldId) {
            mov.codigo_producto = newId;
          }
        });
      }

      Object.assign(existing, rawProduct);
    } else {
      MockData.PRODUCTO.push(rawProduct);
      // Init inventory
      MockData.INVENTARIO.push(
        {
          codigo_producto: rawProduct.codigo_producto,
          id_bodega: 1,
          stock: 0,
          estado: "A",
        },
        {
          codigo_producto: rawProduct.codigo_producto,
          id_bodega: 2,
          stock: 0,
          estado: "A",
        },
      );
    }
    return this.hydrateProduct(rawProduct);
  },

  deleteProduct(id) {
    MockData.PRODUCTO = MockData.PRODUCTO.filter(
      (p) => p.codigo_producto != id,
    );
    MockData.INVENTARIO = MockData.INVENTARIO.filter(
      (i) => i.codigo_producto != id,
    );
  },

  // --- Inventory ---

  getAllInventory() {
    return MockData.INVENTARIO;
  },

  getInventoryByProduct(productId) {
    return MockData.INVENTARIO.filter((i) => i.codigo_producto == productId);
  },

  getTotalStock(productId) {
    const inventory = this.getInventoryByProduct(productId);
    return inventory.reduce((sum, item) => sum + item.stock, 0);
  },

  // --- Users ---

  getUserByEmail(email) {
    return MockData.USUARIO.find(
      (u) => u.correo.toLowerCase() === email.toLowerCase(),
    );
  },

  getUserById(id) {
    return MockData.USUARIO.find((u) => u.id_usuario == id);
  },

  getAllUsers() {
    return MockData.USUARIO.map((u) => this.hydrateUser(u));
  },

  hydrateUser(user) {
    const roleMap = { A: "ADMIN", S: "SUPERVISOR", O: "OPERADOR" };
    return {
      ...user,
      id: user.id_usuario, // UI expects .id
      nombre: user.nombre_completo,
      email: user.correo,
      rol: roleMap[user.rol] || user.rol,
      password: user.contrasena,
      avatar: user.avatar || null,
    };
  },

  updateUser(id, data) {
    const user = MockData.USUARIO.find((u) => u.id_usuario == id);
    if (user) {
      if (data.nombre_completo) user.nombre_completo = data.nombre_completo;
      if (data.email) user.correo = data.email;
      if (data.password) user.contrasena = data.password;

      if (data.rol) {
        const rolMap = { ADMIN: "A", SUPERVISOR: "S", OPERADOR: "O" };
        user.rol = rolMap[data.rol] || user.rol;
      }
      if (data.avatar) user.avatar = data.avatar;

      return this.hydrateUser(user);
    }
    return null;
  },

  createUser(data) {
    // Simple ID generation
    const newId =
      MockData.USUARIO.length > 0
        ? Math.max(...MockData.USUARIO.map((u) => u.id_usuario)) + 1
        : 1;
    const rolMap = { ADMIN: "A", SUPERVISOR: "S", OPERADOR: "O" };

    const newUser = {
      id_usuario: newId,
      nombre_completo: data.nombre_completo,
      correo: data.email,
      contrasena: data.password || "1234",
      rol: rolMap[data.rol] || "O",
    };

    MockData.USUARIO.push(newUser);
    return this.hydrateUser(newUser);
  },

  // --- Movements ---

  getAllMovements() {
    return MockData.MOVIMIENTO.map((m) => {
      const product = this.getProductById(m.codigo_producto);
      return {
        ...m,
        id: m.id_movimiento,
        codigo_transaccion: m.codigo_movimiento,
        tipo: m.tipo_movimiento || m.tipo, // fallback
        fechaH: m.fechaHoraSolicitud,
        // Hydrate for UI
        product_id: m.codigo_producto,
        cantidad: m.cantidad,
        estado: m.estado,
        created_at: m.fechaHoraSolicitud,
        // Add explicit naming for filters
        tipo_accion:
          m.tipo === "ENT"
            ? "ENTRADA"
            : m.tipo === "SAL"
              ? "SALIDA"
              : "TRANSFERENCIA",
      };
    });
  },

  hydrateMovement(movement) {
    const product = this.getProductById(movement.codigo_producto);
    const bodegaOrigen = MockData.BODEGA.find(
      (b) => b.id_bodega === movement.id_bodega_origen,
    );
    const bodegaDestino = MockData.BODEGA.find(
      (b) => b.id_bodega === movement.id_bodega_destino,
    );
    const solicitante = MockData.USUARIO.find(
      (u) => u.id_usuario === movement.id_solicitante,
    );
    const responsable = MockData.USUARIO.find(
      (u) => u.id_usuario === movement.id_responsable,
    );

    return {
      ...movement,
      id: movement.id_movimiento, // compatibility
      producto: product,
      origen_nombre: bodegaOrigen ? bodegaOrigen.nombre : "Externo",
      destino_nombre: bodegaDestino ? bodegaDestino.nombre : "Externo",
      solicitante_nombre: solicitante ? solicitante.nombre_completo : "Sistema",
      responsable_nombre: responsable
        ? responsable.nombre_completo
        : "Pendiente",
    };
  },

  createMovement(data) {
    const newId = MockData._sequences.movimiento + 1;
    MockData._sequences.movimiento = newId;

    const now = new Date().toISOString();

    // Pass this.getAllMovements() to CodeGenerator to resolve dependency
    const movements = this.getAllMovements();
    const code =
      data.codigo_movimiento ||
      CodeGenerator.generate(this.getMovementTypeName(data.tipo), movements);

    const movement = {
      id_movimiento: newId,
      codigo_movimiento: code,
      tipo: data.tipo,
      cantidad: data.cantidad,
      estado: data.estado || "P",
      notas: data.notas,
      fechaHoraSolicitud: now,
      fechaHoraAprobacion: data.estado === "C" ? now : null,
      id_responsable: data.id_responsable || null,
      id_solicitante: data.id_solicitante,
      solicitante_nombre: data.solicitante_nombre || null,
      codigo_producto: data.codigo_producto,
      id_bodega_origen: data.id_bodega_origen,
      id_bodega_destino: data.id_bodega_destino,
    };

    MockData.MOVIMIENTO.unshift(movement);

    // Auto-update inventory if movement is created as Completed (e.g. direct entry/exit)
    if (movement.estado === "C") {
      this.updateInventory(movement);
    }

    return this.hydrateMovement(movement);
  },

  deleteMovement(id) {
    MockData.MOVIMIENTO = MockData.MOVIMIENTO.filter(
      (m) => m.id_movimiento !== id,
    );
  },

  reverseInventory(movement) {
    const type = movement.tipo;
    const qty = parseInt(movement.cantidad);
    const productId = movement.codigo_producto;

    if (type === "ENT" || type === "TRF") {
      // Remove from Dest (Undo addition)
      let destInv = MockData.INVENTARIO.find(
        (i) =>
          i.codigo_producto == productId &&
          i.id_bodega == movement.id_bodega_destino,
      );
      if (destInv) {
        destInv.stock -= qty;
        if (destInv.stock < 0) destInv.stock = 0; // Safety
      }
    }

    if (type === "SAL" || type === "TRF") {
      // Add back to Origin (Undo deduction)
      let originInv = MockData.INVENTARIO.find(
        (i) =>
          i.codigo_producto == productId &&
          i.id_bodega == movement.id_bodega_origen,
      );
      if (originInv) {
        originInv.stock += qty;
      } else {
        // Initialize if missing (unlikely for origin but possible)
        MockData.INVENTARIO.push({
          codigo_producto: productId,
          id_bodega: movement.id_bodega_origen,
          stock: qty,
          estado: "A",
        });
      }
    }
  },

  revertMovementToPending(id) {
    const movement = MockData.MOVIMIENTO.find((m) => m.id_movimiento === id);
    if (!movement) return false;
    if (movement.estado !== "C") return false; // Only completed can be reverted

    // Reverse stock changes
    this.reverseInventory(movement);

    // Update status
    movement.estado = "P";
    movement.fechaHoraAprobacion = null;
    movement.id_responsable = null; // Clear approver

    return true;
  },

  updateInventory(movement) {
    const type = movement.tipo;
    const qty = parseInt(movement.cantidad);
    const productId = movement.codigo_producto;

    if (type === "ENT" || type === "TRF") {
      // Add to Dest
      let destInv = MockData.INVENTARIO.find(
        (i) =>
          i.codigo_producto == productId &&
          i.id_bodega == movement.id_bodega_destino,
      );
      if (destInv) {
        destInv.stock += qty;
      } else {
        // Initialize if not exists (should guard against this, but for safety)
        MockData.INVENTARIO.push({
          codigo_producto: productId,
          id_bodega: movement.id_bodega_destino,
          stock: qty,
          estado: "A",
        });
      }
    }

    if (type === "SAL" || type === "TRF") {
      // Deduct from Origin
      let originInv = MockData.INVENTARIO.find(
        (i) =>
          i.codigo_producto == productId &&
          i.id_bodega == movement.id_bodega_origen,
      );
      if (originInv) {
        originInv.stock -= qty;
        if (originInv.stock < 0) originInv.stock = 0; // Prevent negative?
      }
    }
  },

  getMovementTypeName(tipo) {
    const typeMap = {
      SAL: "SALIDA",
      TRF: "TRANSFERENCIA",
      ENT: "ENTRADA",
    };
    return typeMap[tipo] || tipo;
  },

  generateTransactionCode(type, id) {
    return `${type}-${String(id).padStart(6, "0")}`;
  },


  // --- Requirements ---
  async getRequirements() {
    return MockData.REQUERIMIENTO.map(req => {
      const product = MockData.PRODUCTO.find(p => p.codigo_producto === req.codigo_producto);
      // Join to get names
      // Solicitante
      const solicitante = MockData.USUARIO.find(u => u.id_usuario === req.id_solicitante);
      // Responsable
      const responsable = req.id_responsable ? MockData.USUARIO.find(u => u.id_usuario === req.id_responsable) : null;

      return {
        ...req,
        producto_nombre: req.nombre_producto || product?.nombre || 'Desconocido',
        marca_nombre: req.marca_texto || 'General',
        solicitante_nombre: solicitante?.nombre_completo || 'Solicitante Eliminado',
        responsable_nombre: responsable?.nombre_completo || 'N/A'
      };
    });
  },

  async createRequirement(reqData) {
    const newId = MockData._sequences.requerimiento++;
    const newReq = {
      id_requerimiento: newId,
      ...reqData,
      estado: 'P',
      fechaHoraRequ: new Date().toISOString(),
      fechaHoraAprobacion: null
    };
    MockData.REQUERIMIENTO.push(newReq);
    return newReq;
  },

  async updateRequirementStatus(id, newStatus, adminId) {
    const req = MockData.REQUERIMIENTO.find(r => r.id_requerimiento === id);
    if (!req) throw new Error("Requerimiento no encontrado");

    req.estado = newStatus;
    if (newStatus === 'A' || newStatus === 'R') {
      req.fechaHoraAprobacion = new Date().toISOString();
      req.id_responsable = adminId;
    }
    return req;
  },

  async revertRequirement(id) {
    const req = MockData.REQUERIMIENTO.find(r => r.id_requerimiento === id);
    if (!req) throw new Error("Requerimiento no encontrado");

    req.estado = 'P';
    req.fechaHoraAprobacion = null;
    return req;
  },

  async deleteRequirement(id) {
    const index = MockData.REQUERIMIENTO.findIndex(r => r.id_requerimiento === id);
    if (index === -1) throw new Error("Requerimiento no encontrado");

    MockData.REQUERIMIENTO.splice(index, 1);
    return true;
  },

  // --- Settings ---
  getSettings() {
    return { ...MockData.SETTINGS };
  },

  saveSettings(settings) {
    Object.assign(MockData.SETTINGS, settings);
    return MockData.SETTINGS;
  },
};
