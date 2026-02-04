import { supabase } from "./supabase/client";

export const Auth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Obtener información adicional del usuario
    const { data: userData, error: userError } = await supabase
      .from("usuario")
      .select("*")
      .eq("id_usuario", data.user.id)
      .single();

    if (userError) throw userError;

    return {
      user: data.user,
      userData: {
        ...userData,
        email: data.user.email,
      },
    };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;

    if (!user) return null;

    // Obtener información adicional del usuario
    const { data: userData } = await supabase
      .from("USUARIO")
      .select("*")
      .eq("id_usuario", user.id)
      .single();

    return {
      user,
      userData: {
        ...userData,
        email: user.email,
      },
    };
  },

  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: userData.nombre_completo,
        },
      },
    });

    if (error) throw error;

    // Crear el registro en la tabla USUARIO
    const { data: newUser, error: userError } = await supabase
      .from("USUARIO")
      .insert({
        id_usuario: data.user.id,
        nombre_completo: userData.nombre_completo,
        rol: userData.rol || "O",
        estado: true,
      })
      .select()
      .single();

    if (userError) throw userError;

    return {
      user: data.user,
      userData: {
        ...newUser,
        email: data.user.email,
      },
    };
  },
};
