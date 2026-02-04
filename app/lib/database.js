/**
 * Database Adapter
 * Permite cambiar entre MockData y Supabase mediante una variable de entorno
 */
import { DB as MockDB } from "./db";
import { SupabaseDB } from "./supabaseDB";

const USE_SUPABASE = process.env.NEXT_PUBLIC_DB_MODE === "supabase";

// Exportar el adaptador de base de datos
export const Database = USE_SUPABASE ? SupabaseDB : MockDB;

// Re-exportar como DB para mantener compatibilidad con código existente
export const DB = Database;

// Helper para saber qué modo estamos usando
export const isDatabaseMock = () => !USE_SUPABASE;
export const isDatabaseSupabase = () => USE_SUPABASE;
