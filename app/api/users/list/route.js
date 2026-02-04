import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function GET() {
  try {
    // Obtener usuarios de la tabla usuario
    const { data: usuarios, error } = await supabase
      .from("usuario")
      .select("*")
      .order("nombre_completo");

    if (error) throw error;

    // Obtener emails del auth para cada usuario
    const usersWithEmails = await Promise.all(
      usuarios.map(async (user) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            user.id_usuario,
          );
          return { ...user, email: authUser?.user?.email };
        } catch (err) {
          console.error(
            `Error getting email for user ${user.id_usuario}:`,
            err,
          );
          return user;
        }
      }),
    );

    return NextResponse.json({ users: usersWithEmails });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}
