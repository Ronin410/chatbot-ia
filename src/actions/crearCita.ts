import type { Pool } from "pg";
import type { ActionDefinition, OwnerNotifier } from "./types";

interface CrearCitaParams {
  nombreCliente: string;
  telefono: string;
  servicio: string;
  /** Formato YYYY-MM-DD */
  fecha: string;
  /** Formato HH:MM (24h) */
  hora: string;
  /**
   * El modelo debe llamar esta acción primero con confirmado=false para
   * obtener un resumen, mostrárselo al usuario y pedirle que confirme
   * explícitamente. Solo debe volver a llamarla con confirmado=true
   * después de una confirmación clara del usuario (ver instrucción en
   * el prompt de sistema de Premium, src/ai/premiumSystemPrompt.ts).
   */
  confirmado: boolean;
}

type CrearCitaResult =
  | { status: "pendiente_confirmacion"; resumen: string }
  | { status: "confirmada"; citaId: number };

/**
 * Acción irreversible (agenda una cita real): nunca ejecuta el INSERT si
 * `confirmado` no es explícitamente `true`. Este es el mecanismo de
 * confirmación que pide el nivel Premium antes de ejecutar acciones que
 * no se pueden deshacer solas.
 *
 * `notifyOwner` (opcional): si se provee, se avisa al dueño del negocio
 * (no al cliente) cada vez que una cita queda confirmada de verdad — ver
 * cómo se arma en server.ts a partir de `business-config.json.ownerWhatsapp`.
 */
export function createCrearCitaAction(
  pool: Pool,
  notifyOwner?: OwnerNotifier
): ActionDefinition<CrearCitaParams, CrearCitaResult> {
  return {
    name: "crear_cita",
    description:
      "Agenda una cita para el cliente. IMPORTANTE: primero llama esta función con " +
      "confirmado=false para obtener un resumen; muéstraselo al usuario y pide su " +
      "confirmación explícita antes de volver a llamarla con confirmado=true. " +
      "Nunca uses confirmado=true sin que el usuario haya confirmado en el chat.",
    parametersSchema: {
      type: "object",
      properties: {
        nombreCliente: { type: "string", description: "Nombre del cliente" },
        telefono: { type: "string", description: "Teléfono de contacto del cliente" },
        servicio: { type: "string", description: "Servicio o motivo de la cita" },
        fecha: { type: "string", description: "Fecha de la cita, formato YYYY-MM-DD" },
        hora: { type: "string", description: "Hora de la cita, formato HH:MM en 24h" },
        confirmado: {
          type: "boolean",
          description: "true solo después de que el usuario confirmó explícitamente los detalles",
        },
      },
      required: ["nombreCliente", "telefono", "servicio", "fecha", "hora", "confirmado"],
    },
    requiresConfirmation: true,

    async execute(params: CrearCitaParams): Promise<CrearCitaResult> {
      const { nombreCliente, telefono, servicio, fecha, hora, confirmado } = params;

      if (!confirmado) {
        return {
          status: "pendiente_confirmacion",
          resumen:
            `Cita para ${nombreCliente} (${telefono}) — ${servicio}, el ${fecha} a las ${hora}. ` +
            "Pide confirmación explícita al usuario y, si confirma, vuelve a llamar a esta " +
            "función con confirmado=true para agendarla de verdad.",
        };
      }

      const result = await pool.query<{ id: number }>(
        `INSERT INTO citas (nombre_cliente, telefono, servicio, fecha, hora)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [nombreCliente, telefono, servicio, fecha, hora]
      );
      const citaId = result.rows[0].id;

      if (notifyOwner) {
        try {
          await notifyOwner(
            `🔔 Nueva cita agendada (#${citaId})\n` +
              `Cliente: ${nombreCliente} (${telefono})\n` +
              `Servicio: ${servicio}\n` +
              `Fecha: ${fecha} ${hora}`
          );
        } catch (error) {
          // Una notificación fallida no debe romper la respuesta al cliente:
          // la cita ya quedó agendada de verdad, eso es lo que importa.
          console.error("[crear_cita] No se pudo notificar al dueño del negocio:", error);
        }
      }

      return { status: "confirmada", citaId };
    },
  };
}
