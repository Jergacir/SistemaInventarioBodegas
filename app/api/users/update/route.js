import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function PUT(request) {
  try {
    const { userId, nombre_completo, email, password, rol } =
      await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 },
      );
    }

    // 1. Actualizar datos en la tabla usuario
    const updates = {};
    if (nombre_completo) updates.nombre_completo = nombre_completo;
    if (rol) updates.rol = rol;

    const { data: userData, error: dbError } = await supabase
      .from("usuario")
      .update(updates)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Actualizar email y/o contraseña en Supabase Auth si se proporcionaron
    if (email || password) {
      const authUpdates = {};
      if (email) authUpdates.email = email;
      if (password) authUpdates.password = password;

      const { data: authData, error: authError } =
        await supabase.auth.admin.updateUserById(userId, authUpdates);

      if (authError) {
        console.error("Error updating auth:", authError);
        throw new Error(
          `Error al actualizar credenciales: ${authError.message}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar usuario" },
      { status: 500 },
    );
  }
}
