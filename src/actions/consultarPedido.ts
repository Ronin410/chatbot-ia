import type { Pool } from "pg";
import type { ActionDefinition } from "./types";

interface ConsultarPedidoParams {
  numeroPedido: string;
}

type ConsultarPedidoResult =
  | { encontrado: false }
  | {
      encontrado: true;
      numeroPedido: string;
      estado: string;
      detalle: string | null;
      actualizadoEn: string;
    };

/**
 * Acción de solo lectura: no requiere confirmación (no modifica nada).
 */
export function createConsultarPedidoAction(pool: Pool): ActionDefinition<ConsultarPedidoParams, ConsultarPedidoResult> {
  return {
    name: "consultar_pedido",
    description: "Consulta el estatus de un pedido del cliente por su número de pedido.",
    parametersSchema: {
      type: "object",
      properties: {
        numeroPedido: { type: "string", description: "Número de pedido, por ejemplo PED-1001" },
      },
      required: ["numeroPedido"],
    },
    requiresConfirmation: false,

    async execute({ numeroPedido }: ConsultarPedidoParams): Promise<ConsultarPedidoResult> {
      const result = await pool.query<{
        numero_pedido: string;
        estado: string;
        detalle: string | null;
        actualizado_en: string;
      }>(
        `SELECT numero_pedido, estado, detalle, actualizado_en
         FROM pedidos
         WHERE numero_pedido = $1`,
        [numeroPedido]
      );

      if (result.rows.length === 0) return { encontrado: false };

      const row = result.rows[0];
      return {
        encontrado: true,
        numeroPedido: row.numero_pedido,
        estado: row.estado,
        detalle: row.detalle,
        actualizadoEn: row.actualizado_en,
      };
    },
  };
}
