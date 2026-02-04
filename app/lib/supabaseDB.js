import { supabase } from "./supabase/client";

export const SupabaseDB = {
  // ==================== USUARIOS ====================
  async getAllUsers() {
    try {
      // Llamar a la API route del servidor para obtener usuarios con emails
      const response = await fetch("/api/users/list");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al obtener usuarios");
      }

      // Hidratar los usuarios con el formato correcto
      return result.users.map((user) => this.hydrateUser(user));
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  },

  async getUserById(id) {
    const { data, error } = await supabase
      .from("usuario")
      .select("*")
      .eq("id_usuario", id)
      .single();

    if (error) throw error;
    return data ? this.hydrateUser(data) : null;
  },

  async getUserByEmail(email) {
    // Para desarrollo, primero intentar buscar directamente en la tabla USUARIO
    // asumiendo que el correo se guarda allí también
    const { data, error } = await supabase
      .from("usuario")
      .select("*, auth.users!inner(email)")
      .eq("auth.users.email", email)
      .single();

    if (data) {
      return { ...this.hydrateUser(data), email, contrasena: "1234" };
    }

    // Fallback: buscar en todos los usuarios
    const { data: allUsers } = await supabase.from("usuario").select("*");

    if (!allUsers) return null;

    // Por ahora, asumir que el primer usuario es el que buscamos
    // En producción, esto se manejaría con auth.users
    const user = allUsers.find((u) =>
      u.nombre_completo.toLowerCase().includes(email.split("@")[0]),
    );

    return user
      ? { ...this.hydrateUser(user), email, contrasena: "1234" }
      : null;
  },

  async createUser(userData) {
    try {
      // Usar API route del servidor (con Service Role Key)
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_completo: userData.nombre_completo,
          email: userData.email,
          password: userData.password || "1234",
          rol: userData.rol || "O",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear usuario");
      }

      return result.user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error(error.message || "Error al crear usuario");
    }
  },

  async updateUser(id, userData) {
    try {
      // Usar API route del servidor para actualizar (incluye email y contraseña)
      const response = await fetch("/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: id,
          nombre_completo: userData.nombre_completo,
          email: userData.email,
          password: userData.password,
          rol: userData.rol,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar usuario");
      }

      return this.hydrateUser(result.user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error(error.message || "Error al actualizar usuario");
    }
  },

  hydrateUser(user) {
    if (!user) return null;
    const roleMap = { A: "ADMIN", S: "SUPERVISOR", O: "OPERADOR" };
    return {
      id_usuario: user.id_usuario,
      nombre_completo: user.nombre_completo,
      rol: roleMap[user.rol] || user.rol,
      correo: user.email || user.correo,
      estado: user.estado,
    };
  },

  // ==================== PRODUCTOS ====================
  async getAllProducts() {
    const { data, error } = await supabase
      .from("producto")
      .select(
        `
                *,
                marca(nombre),
                categoria(nombre_categoria),
                ubicacion_princip:ubicacion!id_ubicacion_princip(*),
                ubicacion_instrum:ubicacion!id_ubicacion_instrum(*)
            `,
      )
      .order("nombre");

    if (error) throw error;
    return data;
  },

  async getProductById(id) {
    const { data, error } = await supabase
      .from("producto")
      .select(
        `
                *,
                marca(nombre),
                categoria(nombre_categoria),
                ubicacion_princip:ubicacion!id_ubicacion_princip(*),
                ubicacion_instrum:ubicacion!id_ubicacion_instrum(*)
            `,
      )
      .eq("codigo_producto", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createProduct(productData) {
    const { data, error } = await supabase
      .from("producto")
      .insert({
        nombre: productData.nombre,
        unidad: productData.unidad,
        url_imagen: productData.url_imagen,
        stock_minimo: productData.stock_minimo,
        id_marca: productData.id_marca,
        id_categoria: productData.id_categoria,
        id_ubicacion_princip: productData.id_ubicacion_princip,
        id_ubicacion_instrum: productData.id_ubicacion_instrum,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id, productData) {
    const { data, error } = await supabase
      .from("producto")
      .update(productData)
      .eq("codigo_producto", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== INVENTARIO ====================
  async getInventory() {
    const { data, error } = await supabase
      .from("inventario")
      .select(
        `
                *,
                producto(*),
                bodega(*)
            `,
      )
      .order("codigo_producto");

    if (error) throw error;
    return data;
  },

  async getInventoryByProduct(codigo_producto) {
    const { data, error } = await supabase
      .from("inventario")
      .select(
        `
                *,
                bodega(*)
            `,
      )
      .eq("codigo_producto", codigo_producto);

    if (error) throw error;
    return data;
  },

  async updateInventoryStock(
    codigo_producto,
    id_bodega,
    newStock,
    estado = "N",
  ) {
    const { data, error } = await supabase
      .from("inventario")
      .upsert({
        codigo_producto,
        id_bodega,
        stock: newStock,
        estado,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== MOVIMIENTOS ====================
  async getAllMovements() {
    const { data, error } = await supabase
      .from("movimiento")
      .select(
        `
                *,
                producto(nombre),
                responsable:usuario!id_responsable(nombre_completo),
                solicitante:usuario!id_solicitante(nombre_completo),
                bodega_origen:bodega!id_bodega_origen(nombre),
                bodega_destino:bodega!id_bodega_destino(nombre)
            `,
      )
      .order("fechaHoraSolicitud", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getMovementById(id) {
    const { data, error } = await supabase
      .from("movimiento")
      .select(
        `
                *,
                producto(*),
                responsable:usuario!id_responsable(*),
                solicitante:usuario!id_solicitante(*),
                bodega_origen:bodega!id_bodega_origen(*),
                bodega_destino:bodega!id_bodega_destino(*)
            `,
      )
      .eq("id_movimiento", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createMovement(movementData) {
    const { data, error } = await supabase
      .from("movimiento")
      .insert({
        codigo_movimiento: movementData.codigo_movimiento,
        tipo: movementData.tipo,
        cantidad: movementData.cantidad,
        estado: movementData.estado || "P",
        notas: movementData.notas,
        id_responsable: movementData.id_responsable,
        id_solicitante: movementData.id_solicitante,
        codigo_producto: movementData.codigo_producto,
        id_bodega_origen: movementData.id_bodega_origen,
        id_bodega_destino: movementData.id_bodega_destino,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMovement(id, movementData) {
    const updates = { ...movementData };

    if (movementData.estado === "C") {
      updates.fechaHoraAprobacion = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("movimiento")
      .update(updates)
      .eq("id_movimiento", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== CATEGORÍAS ====================
  async getAllCategories() {
    const { data, error } = await supabase
      .from("categoria")
      .select("*")
      .eq("activo", true)
      .order("nombre_categoria");

    if (error) throw error;
    return data;
  },

  async createCategory(nombre) {
    const { data, error } = await supabase
      .from("categoria")
      .insert({ nombre_categoria: nombre, activo: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== MARCAS ====================
  async getAllBrands() {
    const { data, error } = await supabase
      .from("marca")
      .select("*")
      .eq("activo", true)
      .order("nombre");

    if (error) throw error;
    return data;
  },

  async createBrand(nombre) {
    const { data, error } = await supabase
      .from("marca")
      .insert({ nombre, activo: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== BODEGAS ====================
  async getAllWarehouses() {
    const { data, error } = await supabase
      .from("bodega")
      .select("*")
      .order("nombre");

    if (error) throw error;
    return data;
  },

  // ==================== UBICACIONES ====================
  async getAllLocations() {
    const { data, error } = await supabase
      .from("ubicacion")
      .select("*")
      .order("tipo", "numero", "nivel");

    if (error) throw error;
    return data;
  },

  async createLocation(locationData) {
    const { data, error } = await supabase
      .from("ubicacion")
      .insert({
        tipo: locationData.tipo,
        numero: locationData.numero,
        nivel: locationData.nivel,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== SETTINGS (localStorage) ====================
  getSettings() {
    if (typeof window === "undefined") return {};
    const settings = localStorage.getItem("appSettings");
    return settings
      ? JSON.parse(settings)
      : {
          lowStockAlert: true,
          transferAlert: true,
        };
  },

  saveSettings(settings) {
    if (typeof window === "undefined") return;
    localStorage.setItem("appSettings", JSON.stringify(settings));
  },
};
