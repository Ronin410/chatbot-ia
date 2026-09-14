import { Pool } from "pg";

let pool: Pool | undefined;

/**
 * Pool de PostgreSQL (Premium): usado por src/actions para consultar y
 * modificar citas/pedidos reales del cliente. Requiere DATABASE_URL.
 * Singleton perezoso: se crea en el primer uso, no al importar el módulo,
 * para no romper el arranque del servidor si Premium no está activo.
 */
export function getPgPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "Falta DATABASE_URL: las acciones de Premium (crear_cita, consultar_pedido) " +
          "requieren PostgreSQL. Configúralo en .env (ver docker-compose.yml, " +
          "servicio 'postgres') y corre `npm run db:migrate` para crear las tablas."
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
