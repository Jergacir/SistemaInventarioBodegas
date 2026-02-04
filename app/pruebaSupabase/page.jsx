import { createClient } from "../lib/supabase/server";

export default async function Page() {
  // 1. Creamos el cliente de Supabase
  const supabase = await createClient();

  // 2. Consultamos la tabla 'BODEGA' (en mayúsculas según tu esquema)
  const { data: bodegas, error } = await supabase
    .from("bodega")
    .select("nombre");

  // Manejo de errores básico para depuración
  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Error conectando a la base de datos</h1>
        <p style={{ color: "red" }}>{error.message}</p>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>✅ Conexión a Supabase Exitosa</h1>
      <h2>Lista de Bodegas</h2>
      <ul>
        {bodegas?.length > 0 ? (
          bodegas.map((bodega, index) => (
            <li key={index} style={{ fontSize: "18px", marginBottom: "8px" }}>
              📦 {bodega.nombre}
            </li>
          ))
        ) : (
          <li style={{ color: "orange" }}>
            ⚠️ No se encontraron bodegas. La tabla está vacía o no tiene datos.
          </li>
        )}
      </ul>

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#f0f0f0",
          borderRadius: "8px",
        }}
      >
        <h3>Información de Conexión:</h3>
        <p>
          <strong>Modo DB:</strong> {process.env.NEXT_PUBLIC_DB_MODE}
        </p>
        <p>
          <strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
        </p>
        <p>
          <strong>Total de bodegas:</strong> {bodegas?.length || 0}
        </p>
      </div>
    </div>
  );
}
