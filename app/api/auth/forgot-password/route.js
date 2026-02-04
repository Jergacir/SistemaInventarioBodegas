import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "El correo electrónico es requerido" },
        { status: 400 },
      );
    }

    // Enviar email de recuperación
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      // Rate limit en desarrollo - normal en testing
      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        console.warn(
          "⚠️ Rate limit de emails alcanzado (Supabase Free: 3-4/hora)",
        );
        console.warn(
          "💡 En producción esto no es problema (usuarios reales, IPs diferentes)",
        );
        // Aún así devolvemos éxito por seguridad
      } else {
        console.error("Error sending reset email:", error);
      }
      // Por seguridad, siempre devolver éxito aunque haya error
      // Esto previene enumerar usuarios
    }

    return NextResponse.json({
      success: true,
      message:
        "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
