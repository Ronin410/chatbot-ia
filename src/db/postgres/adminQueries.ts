import type { Pool } from "pg";
import { rowsToCsv } from "../csv";

/**
 * Consultas de solo lectura para que el dueño del negocio (o quien le dé
 * soporte) pueda ver las citas y pedidos reales sin tener que usar `psql`
 * a mano. Expuestas en server.ts como GET /admin/citas y /admin/pedidos.
 */

// pg devuelve las columnas DATE/TIMESTAMPTZ como objetos Date de JS, no
// como texto — hay que formatearlas antes de exportar o se ven feo en el
// CSV (algo como "Tue Sep 15 2026 00:00:00 GMT+0000 (...)").
function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatTimestamp(value: Date): string {
  return value.toISOString().replace("T", " ").slice(0, 19); // YYYY-MM-DD HH:MM:SS
}

interface RawCitaRow {
  id: number;
  nombre_cliente: string;
  telefono: string;
  servicio: string;
  fecha: Date;
  hora: string;
  estado: string;
  creado_en: Date;
}

export interface CitaRow {
  id: number;
  nombre_cliente: string;
  telefono: string;
  servicio: string;
  fecha: string;
  hora: string;
  estado: string;
  creado_en: string;
}

const CITA_COLUMNS: (keyof CitaRow)[] = [
  "id",
  "nombre_cliente",
  "telefono",
  "servicio",
  "fecha",
  "hora",
  "estado",
  "creado_en",
];

export async function exportCitas(pool: Pool, format: "csv" | "json"): Promise<string> {
  const result = await pool.query<RawCitaRow>(
    `SELECT id, nombre_cliente, telefono, servicio, fecha, hora, estado, creado_en
     FROM citas
     ORDER BY fecha ASC, hora ASC`
  );
  const rows: CitaRow[] = result.rows.map((row) => ({
    ...row,
    fecha: formatDate(row.fecha),
    creado_en: formatTimestamp(row.creado_en),
  }));
  return format === "json" ? JSON.stringify(rows, null, 2) : rowsToCsv(rows, CITA_COLUMNS);
}

interface RawPedidoRow {
  id: number;
  numero_pedido: string;
  nombre_cliente: string;
  estado: string;
  detalle: string | null;
  actualizado_en: Date;
}

export interface PedidoRow {
  id: number;
  numero_pedido: string;
  nombre_cliente: string;
  estado: string;
  detalle: string | null;
  actualizado_en: string;
}

const PEDIDO_COLUMNS: (keyof PedidoRow)[] = [
  "id",
  "numero_pedido",
  "nombre_cliente",
  "estado",
  "detalle",
  "actualizado_en",
];

export async function exportPedidos(pool: Pool, format: "csv" | "json"): Promise<string> {
  const result = await pool.query<RawPedidoRow>(
    `SELECT id, numero_pedido, nombre_cliente, estado, detalle, actualizado_en
     FROM pedidos
     ORDER BY actualizado_en DESC`
  );
  const rows: PedidoRow[] = result.rows.map((row) => ({
    ...row,
    actualizado_en: formatTimestamp(row.actualizado_en),
  }));
  return format === "json" ? JSON.stringify(rows, null, 2) : rowsToCsv(rows, PEDIDO_COLUMNS);
}
