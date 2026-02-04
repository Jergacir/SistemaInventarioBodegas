import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { hasPermission } from "../permissions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const updateSession = async (request) => {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ["/", "/reset-password"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Rutas de API no requieren middleware de auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refrescar la sesión si es necesario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no hay usuario y la ruta no es pública, redirigir al login
  if (!user && !isPublicRoute) {
    console.log(`🔒 No user session, redirecting to login from: ${pathname}`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  // Si hay usuario en ruta pública (ya está logueado), redirigir al dashboard
  if (user && pathname === "/") {
    console.log(`✅ User already logged in, redirecting to dashboard`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Si hay usuario, verificar permisos
  if (user && !isPublicRoute) {
    try {
      // Obtener datos del usuario desde la BD
      const { data: userData } = await supabase
        .from("usuario")
        .select("rol")
        .eq("id_usuario", user.id)
        .single();

      if (userData) {
        const roleMap = { A: "ADMIN", S: "SUPERVISOR", O: "OPERADOR" };
        const userRole = roleMap[userData.rol] || userData.rol;

        // Verificar si tiene permiso para acceder a esta ruta
        if (!hasPermission(userRole, pathname)) {
          console.log(`❌ Access denied for ${userRole} to ${pathname}`);
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/dashboard";
          redirectUrl.searchParams.set("access_denied", "true");
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      // En caso de error, permitir acceso (fail-safe)
    }
  }

  return supabaseResponse;
};
