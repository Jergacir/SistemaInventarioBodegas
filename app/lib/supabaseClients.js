/**
 * Supabase Client Exports
 *
 * - supabase: Cliente para uso en componentes del cliente
 * - createServerClient: Para usar en Server Components o API Routes
 * - Auth: Utilidades de autenticación
 */

// Cliente para componentes del cliente (use client)
export { supabase, createClient } from "./supabase/client";

// Cliente para Server Components y API Routes
export { createClient as createServerSupabaseClient } from "./supabase/server";

// Utilidades de autenticación
export { Auth } from "./auth";
