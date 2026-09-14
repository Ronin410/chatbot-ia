import type { ActionDefinition } from "../types";
import { callExternalApi } from "../externalApiClient";

/**
 * PLANTILLA — no está registrada por defecto (ver src/actions/index.ts).
 * No la actives tal cual: los valores de ejemplo (URL, nombres de campo)
 * son inventados y no le van a funcionar a nadie sin ajustarlos primero.
 *
 * Úsala cuando un cliente Premium YA TIENE su propio sistema (un CRM, una
 * plataforma de pedidos, un sistema de reservas) y quiere que el bot
 * escriba ahí en vez de en nuestra tabla `pedidos`/`citas` de Postgres.
 * Es exactamente el mismo patrón que src/actions/crearCita.ts —
 * confirmación explícita antes de escribir de verdad — solo que en vez
 * de `pool.query(...)` llama a la API del cliente con `callExternalApi`.
 *
 * Checklist para adaptarla a un cliente real:
 *  1. Copia este archivo con un nombre específico del negocio (ej.
 *     crearPedidoShopify.ts, crearReservaAcuity.ts) — no edites la
 *     plantilla in situ, así te queda de referencia para el próximo.
 *  2. Ajusta `parametersSchema` a los campos que EXIGE su sistema (puede
 *     pedir un SKU, un ID de sucursal, etc. que el bot tenga que
 *     preguntarle al usuario en la conversación antes de poder llamarla).
 *  3. Cambia la URL, el método HTTP y los headers de autenticación según
 *     la documentación de su API — nunca hardcodees la API key del
 *     cliente en el código, ponla en .env (ver EXTERNAL_API_URL /
 *     EXTERNAL_API_KEY en .env.example) con el mismo cuidado que
 *     OPENAI_API_KEY o DATABASE_URL.
 *  4. Ajusta cómo se arma `body` (mapea tus parámetros a los nombres de
 *     campo que espera SU api) y cómo se lee la respuesta — `data.id`
 *     seguramente se llame distinto en su sistema.
 *  5. Regístrala en src/actions/index.ts, igual que las demás acciones.
 *
 * Importante: si la llamada a la API del cliente falla, esta acción NO
 * le dice al usuario que su pedido quedó confirmado — devuelve un error
 * explícito para que el modelo se lo comunique tal cual. Nunca inventes
 * una confirmación que no ocurrió de verdad en el sistema del cliente.
 */

interface CrearPedidoExternoParams {
  nombreCliente: string;
  telefono: string;
  producto: string;
  /** Formato YYYY-MM-DD */
  fecha: string;
  /** Formato HH:MM (24h) */
  hora: string;
  /** Igual que en crearCita.ts: primera llamada siempre en false. */
  confirmado: boolean;
}

type CrearPedidoExternoResult =
  | { status: "pendiente_confirmacion"; resumen: string }
  | { status: "confirmada"; pedidoIdExterno: string }
  | { status: "error"; motivo: string };

// AJUSTA: nombres de variables .env específicos de este cliente/sistema.
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

export function createPedidoSistemaExternoAction(): ActionDefinition<
  CrearPedidoExternoParams,
  CrearPedidoExternoResult
> {
  return {
    // AJUSTA: nombre que verá el modelo — que describa la acción real del negocio.
    name: "crear_pedido_sistema_externo",
    description:
      "Crea un pedido en el sistema del negocio. IMPORTANTE: primero llama esta función con " +
      "confirmado=false para obtener un resumen; muéstraselo al usuario y pide su confirmación " +
      "explícita antes de volver a llamarla con confirmado=true. Nunca uses confirmado=true sin " +
      "que el usuario haya confirmado en el chat.",
    // AJUSTA: los campos que de verdad exige el sistema del cliente.
    parametersSchema: {
      type: "object",
      properties: {
        nombreCliente: { type: "string", description: "Nombre del cliente" },
        telefono: { type: "string", description: "Teléfono de contacto del cliente" },
        producto: { type: "string", description: "Qué está pidiendo el cliente" },
        fecha: { type: "string", description: "Fecha del pedido, formato YYYY-MM-DD" },
        hora: { type: "string", description: "Hora del pedido, formato HH:MM en 24h" },
        confirmado: {
          type: "boolean",
          description: "true solo después de que el usuario confirmó explícitamente los detalles",
        },
      },
      required: ["nombreCliente", "telefono", "producto", "fecha", "hora", "confirmado"],
    },
    requiresConfirmation: true,

    async execute(params: CrearPedidoExternoParams): Promise<CrearPedidoExternoResult> {
      const { nombreCliente, telefono, producto, fecha, hora, confirmado } = params;

      if (!confirmado) {
        return {
          status: "pendiente_confirmacion",
          resumen:
            `Pedido para ${nombreCliente} (${telefono}) — ${producto}, el ${fecha} a las ${hora}. ` +
            "Pide confirmación explícita al usuario y, si confirma, vuelve a llamar a esta " +
            "función con confirmado=true para registrarlo de verdad.",
        };
      }

      if (!EXTERNAL_API_URL || !EXTERNAL_API_KEY) {
        return {
          status: "error",
          motivo:
            "Falta configurar EXTERNAL_API_URL / EXTERNAL_API_KEY en .env — no se puede conectar " +
            "con el sistema del negocio todavía.",
        };
      }

      try {
        // AJUSTA: método, headers de auth y forma del cuerpo según la API real.
        const data = await callExternalApi<{ id: string }>({
          url: EXTERNAL_API_URL,
          method: "POST",
          headers: { Authorization: `Bearer ${EXTERNAL_API_KEY}` },
          body: {
            cliente: nombreCliente,
            telefono,
            producto,
            fecha_entrega: `${fecha}T${hora}:00`,
          },
        });

        // AJUSTA: cómo se llama el id en la respuesta real de su API.
        return { status: "confirmada", pedidoIdExterno: data.id };
      } catch (error) {
        console.error("[crear_pedido_sistema_externo] Falló la llamada al sistema del negocio:", error);
        return {
          status: "error",
          motivo:
            "No se pudo registrar el pedido en el sistema del negocio en este momento. " +
            "Pide disculpas y sugiere intentar de nuevo o contactar directamente al negocio.",
        };
      }
    },
  };
}
