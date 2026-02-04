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
                inventario(id_bodega, stock),
                ubicacion_princip:ubicacion!id_ubicacion_princip(*),
                ubicacion_instrum:ubicacion!id_ubicacion_instrum(*)
            `,
      )
      .order("nombre");

    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }
    return data.map((p) => this.hydrateProduct(p));
  },

  async getProductById(id) {
    const { data, error } = await supabase
      .from("producto")
      .select(
        `
                *,
                marca(nombre),
                categoria(nombre_categoria),
                inventario(id_bodega, stock),
                ubicacion_princip:ubicacion!id_ubicacion_princip(*),
                ubicacion_instrum:ubicacion!id_ubicacion_instrum(*)
            `,
      )
      .eq("codigo_producto", id)
      .single();

    if (error) throw error;
    return data ? this.hydrateProduct(data) : null;
  },

  hydrateProduct(product) {
    if (!product) return null;

    // Calculate stock from INVENTARIO array if present
    let stock_principal = 0;
    let stock_instrumentacion = 0;

    if (product.inventario && Array.isArray(product.inventario)) {
      product.inventario.forEach(inv => {
        if (inv.id_bodega === 1) stock_principal = inv.stock;
        if (inv.id_bodega === 2) stock_instrumentacion = inv.stock;
      });
    }

    const stock_total = stock_principal + stock_instrumentacion;

    return {
      ...product,
      id: product.codigo_producto,
      codigo_visible: product.codigo_producto,
      nombre_marca: product.marca?.nombre || "Desconocida",
      nombre_categoria: product.categoria?.nombre_categoria || "Desconocida",
      categoria: product.categoria?.nombre_categoria || "Desconocida",
      marca: product.marca?.nombre || "Desconocida",
      unidad_medida: product.unidad,
      imagen_url: product.url_imagen,

      // Stock properties
      stock_total,
      stock_principal,
      stock_instrumentacion,

      ubicacion_principal: product.ubicacion_princip
        ? `${product.ubicacion_princip.tipo}-${product.ubicacion_princip.numero}-${product.ubicacion_princip.nivel}`
        : "N/A",
      ubicacion_instrumentacion: product.ubicacion_instrum
        ? `${product.ubicacion_instrum.tipo}-${product.ubicacion_instrum.numero}-${product.ubicacion_instrum.nivel}`
        : "N/A",
    };
  },

  async saveProduct(productData) {
    // 1. Resolve Category ID (Find or Create)
    let categoryId = productData.id_categoria;
    if (!categoryId && productData.categoria) {
      const { data: cat } = await supabase
        .from("categoria")
        .select("id_categoria")
        .eq("nombre_categoria", productData.categoria)
        .single();

      if (cat) {
        categoryId = cat.id_categoria;
      } else {
        const { data: newCat, error: catError } = await supabase
          .from("categoria")
          .insert({ nombre_categoria: productData.categoria, activo: true })
          .select()
          .single();
        if (catError) throw catError;
        categoryId = newCat.id_categoria;
      }
    }

    // 2. Resolve Brand ID (Find or Create)
    let brandId = productData.id_marca;
    if (!brandId && productData.marca) {
      const { data: brand } = await supabase
        .from("marca")
        .select("id_marca")
        .eq("nombre", productData.marca)
        .single();
      if (brand) {
        brandId = brand.id_marca;
      } else {
        const { data: newBrand, error: brandError } = await supabase
          .from("marca")
          .insert({ nombre: productData.marca, activo: true })
          .select()
          .single();
        if (brandError) throw brandError;
        brandId = newBrand.id_marca;
      }
    }

    // 3. Resolve Locations
    const resolveLocationId = async (locString) => {
      if (!locString || locString === "N/A") return null;
      const [tipo, numero, nivel] = locString.split("-");
      if (!tipo || !numero || !nivel) return null;

      const { data: loc } = await supabase
        .from("ubicacion")
        .select("id_ubicacion")
        .eq("tipo", tipo)
        .eq("numero", parseInt(numero))
        .eq("nivel", nivel)
        .single();

      if (loc) return loc.id_ubicacion;

      const { data: newLoc, error: locError } = await supabase
        .from("ubicacion")
        .insert({ tipo, numero: parseInt(numero), nivel })
        .select()
        .single();

      if (locError) {
        console.error("Error resolving location:", locError);
        return null;
      }
      return newLoc.id_ubicacion;
    };

    const idPrincip = await resolveLocationId(productData.ubicacion_principal);
    const idInstrum = await resolveLocationId(productData.ubicacion_instrumentacion);

    const payload = {
      codigo_producto: productData.codigo_visible || productData.id,
      nombre: productData.nombre,
      unidad: productData.unidad_medida || productData.unidad,
      url_imagen: productData.imagen_url,
      stock_minimo: productData.stock_minimo,
      id_marca: brandId,
      id_categoria: categoryId,
      id_ubicacion_princip: idPrincip,
      id_ubicacion_instrum: idInstrum,
    };

    let result;
    if (productData.id && !productData.isNew) { // isNew flag might be passed by UI if it's a new entry despite having an ID (unlikely but safe)
      const { data, error } = await supabase
        .from("producto")
        .update(payload)
        .eq("codigo_producto", productData.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("producto")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Init inventory
      await supabase.from("inventario").insert([
        { codigo_producto: data.codigo_producto, id_bodega: 1, stock: 0, estado: 'S' },
        { codigo_producto: data.codigo_producto, id_bodega: 2, stock: 0, estado: 'S' }
      ]);
      result = data;
    }
    return this.hydrateProduct(await this.getProductById(result.codigo_producto));
  },

  async deleteProduct(id) {
    // Delete dependencies first
    await supabase.from("inventario").delete().eq("codigo_producto", id);
    // Note: MOVIMIENTO also references PRODUCTO. If strict FK, this fails. 
    // Ideally we checked for movements before deleting.
    const { error } = await supabase
      .from("producto")
      .delete()
      .eq("codigo_producto", id);
    if (error) throw error;
  },

  // ==================== INVENTARIO ====================
  async getInventory() {
    const { data, error } = await supabase
      .from("inventario")
      .select(
        `
              *,
              producto (
                *,
                marca(nombre),
                categoria(nombre_categoria),
                ubicacion_princip:ubicacion!id_ubicacion_princip(*),
                ubicacion_instrum:ubicacion!id_ubicacion_instrum(*)
              ),
              bodega(*)
        `,
      )
      .order("codigo_producto");

    if (error) throw error;

    // Flatten logic for easier consumption in frontend
    return data.map(item => ({
      ...item,
      producto: this.hydrateProduct(item.producto)
    }));
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
              responsable: usuario!id_responsable(nombre_completo),
                solicitante: usuario!id_solicitante(nombre_completo),
                  bodega_origen: bodega!id_bodega_origen(nombre),
                    bodega_destino: bodega!id_bodega_destino(nombre)
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
                      responsable: usuario!id_responsable(*),
                        solicitante: usuario!id_solicitante(*),
                          bodega_origen: bodega!id_bodega_origen(*),
                            bodega_destino: bodega!id_bodega_destino(*)
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
      .select("nombre_categoria")
      .eq("activo", true)
      .order("nombre_categoria");

    if (error) throw error;
    return data.map((c) => c.nombre_categoria);
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
      .select("nombre")
      .eq("activo", true)
      .order("nombre");

    if (error) throw error;
    return data.map((m) => m.nombre);
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
