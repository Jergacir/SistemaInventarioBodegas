import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Cliente admin con Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function POST(request) {
  console.log("🔐 Change password API called");

  try {
    const body = await request.json();
    console.log("Received data:", {
      userId: body.userId,
      hasCurrentPassword: !!body.currentPassword,
      hasNewPassword: !!body.newPassword,
    });

    const { userId, currentPassword, newPassword } = body;

    // Validación básica
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    // Obtener email del usuario directamente desde Auth
    console.log("Getting user email...");
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !authUser?.user?.email) {
      console.error("Error getting user:", authError);
      return NextResponse.json(
        { error: "No se pudo obtener el email del usuario" },
        { status: 500 },
      );
    }

    const userEmail = authUser.user.email;
    console.log("User email found:", userEmail);

    // Verificar contraseña actual intentando hacer login
    console.log("Verifying current password...");
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    );

    const { error: signInError } = await supabaseClient.auth.signInWithPassword(
      {
        email: userEmail,
        password: currentPassword,
      },
    );

    if (signInError) {
      console.error("Sign in error:", signInError.message);
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 401 },
      );
    }

    console.log("Password verified, updating...");

    // Actualizar contraseña usando Admin API (bypasea validaciones)
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la contraseña" },
        { status: 500 },
      );
    }

    // TODO: Enviar email de notificación
    // Aquí puedes integrar un servicio de email como Resend, SendGrid, etc.
    // Por ahora lo dejamos como log
    console.log(`📧 Contraseña cambiada para: ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
