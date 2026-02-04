/**
 * EJEMPLOS DE USO - Supabase Integration
 *
 * Este archivo muestra cómo usar los diferentes clientes y funciones
 * NOTA: Este es un archivo de documentación. Los ejemplos deben copiarse
 * a archivos separados para usarlos.
 */

// ============================================
// 1. USO EN COMPONENTES DEL CLIENTE
// ============================================

/*
// Archivo: app/components/LoginExample.js
'use client';
import { useState } from 'react';
import { supabase, Auth } from '@/app/lib/supabaseClients';
import { DB } from '@/app/lib/database';

export function LoginExample() {
  const handleLogin = async (email, password) => {
    try {
      // Opción 1: Usar Auth helper
      const { user, userData } = await Auth.signIn(email, password);
      console.log('Usuario autenticado:', userData);

      // Opción 2: Usar supabase directamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      console.log('Login exitoso:', data.user);
    } catch (error) {
      console.error('Error de login:', error.message);
    }
  };
  
  return (
    <button onClick={() => handleLogin('user@example.com', 'password')}>
      Login
    </button>
  );
}

// Ejemplo: Obtener productos (funciona con Mock o Supabase)
export function ProductListExample() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function loadProducts() {
      // Esto funciona tanto en modo Mock como Supabase
      const data = await DB.getAllProducts();
      setProducts(data);
    }
    loadProducts();
  }, []);

  return (
    <div>
      {products.map((p) => (
        <div key={p.codigo_producto}>{p.nombre}</div>
      ))}
    </div>
  );
}
*/

// ============================================
// 2. USO EN SERVER COMPONENTS
// ============================================

/*
// Archivo: app/components/ServerProductList.js
import { createServerSupabaseClient } from '@/app/lib/supabaseClients';

export async function ServerProductList() {
  const supabase = await createServerSupabaseClient();

  const { data: products, error } = await supabase
    .from('PRODUCTO')
    .select('*')
    .order('nombre');

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      {products.map((p) => (
        <div key={p.codigo_producto}>{p.nombre}</div>
      ))}
    </div>
  );
}
*/

// ============================================
// 3. USO EN API ROUTES
// ============================================

/*
// Archivo: app/api/products/route.js
import { createServerSupabaseClient } from '@/app/lib/supabaseClients';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.from('PRODUCTO').select('*');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('PRODUCTO')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/

// ============================================
// 4. USAR EL ADAPTADOR DB (RECOMENDADO)
// ============================================

/*
import { DB } from '@/app/lib/database';

// Este código funciona igual con Mock o Supabase
// Solo cambia NEXT_PUBLIC_DB_MODE en .env

async function ejemploCompleto() {
  // Productos
  const products = await DB.getAllProducts();
  const product = await DB.getProductById(1);

  // Usuarios
  const users = await DB.getAllUsers();
  const user = await DB.getUserByEmail('admin@example.com');

  // Inventario
  const inventory = await DB.getInventory();
  await DB.updateInventoryStock(productId, bodegaId, newStock);

  // Movimientos
  const movements = await DB.getAllMovements();
  await DB.createMovement({
    tipo: 'ENT',
    cantidad: 10,
    codigo_producto: 1,
    id_bodega_destino: 1,
  });

  // Categorías y Marcas
  const categories = await DB.getAllCategories();
  const brands = await DB.getAllBrands();

  // Settings (siempre en localStorage)
  const settings = DB.getSettings();
  DB.saveSettings({ lowStockAlert: true });
}
*/

// ============================================
// 5. AUTENTICACIÓN COMPLETA
// ============================================

/*
import { Auth } from '@/app/lib/auth';

async function authExamples() {
  // Login
  try {
    const { user, userData } = await Auth.signIn(
      'usuario@example.com',
      'password123',
    );

    // Guardar en sesión
    sessionStorage.setItem('currentUser', JSON.stringify(userData));
  } catch (error) {
    console.error('Login fallido:', error);
  }

  // Logout
  await Auth.signOut();
  sessionStorage.removeItem('currentUser');

  // Usuario actual
  const current = await Auth.getCurrentUser();
  if (current) {
    console.log('Usuario:', current.userData);
  }

  // Registrar nuevo usuario
  const newUser = await Auth.signUp('nuevo@example.com', 'password123', {
    nombre_completo: 'Juan Pérez',
    rol: 'O',
  });
}
*/

// ============================================
// 6. SUSCRIPCIONES EN TIEMPO REAL (Supabase)
// ============================================

/*
// Archivo: app/components/RealtimeExample.js
'use client';
import { useEffect } from 'react';
import { supabase } from '@/app/lib/supabase/client';

function RealtimeExample() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DB_MODE === 'supabase') {
      const channel = supabase
        .channel('productos')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'PRODUCTO' },
          (payload) => {
            console.log('Cambio detectado:', payload);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);
  
  return <div>Escuchando cambios en tiempo real...</div>;
}
*/

// ============================================
// 7. STORAGE (Subir imágenes de productos)
// ============================================

/*
import { supabase } from '@/app/lib/supabase/client';
import { DB } from '@/app/lib/database';

async function uploadProductImage(file, productId) {
  if (process.env.NEXT_PUBLIC_DB_MODE !== 'supabase') {
    console.warn('Storage solo disponible en modo Supabase');
    return null;
  }

  const fileName = `${productId}-${Date.now()}.${file.name.split('.').pop()}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  await DB.updateProduct(productId, {
    url_imagen: publicUrl,
  });

  return publicUrl;
}
*/
