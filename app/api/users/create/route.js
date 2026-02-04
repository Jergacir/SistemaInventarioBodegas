import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Cliente con Service Role Key (bypasea rate limits)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Nueva variable de entorno
);

export async function POST(request) {
  try {
    const { nombre_completo, email, password, rol } = await request.json();

    // Validación básica
    if (!nombre_completo || !email || !password || !rol) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    // Crear usuario en Auth con Service Role (sin rate limit)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          nombre_completo: nombre_completo,
        },
      });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Crear registro en tabla usuario
    const { data, error } = await supabaseAdmin
      .from("usuario")
      .insert({
        id_usuario: authData.user.id,
        nombre_completo: nombre_completo,
        rol: rol,
        estado: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user record:", error);
      // Si falla, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin
        .deleteUser(authData.user.id)
        .catch(() => {});
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Hidratar datos del usuario
    const roleMap = { A: "ADMIN", S: "SUPERVISOR", O: "OPERADOR" };
    const user = {
      id_usuario: data.id_usuario,
      nombre_completo: data.nombre_completo,
      rol: roleMap[data.rol] || data.rol,
      correo: email,
      estado: data.estado,
    };

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
