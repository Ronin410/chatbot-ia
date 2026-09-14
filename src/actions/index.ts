import type { Pool } from "pg";
import type { ToolDefinition } from "../ai/types";
import type { ActionDefinition, ActionRegistry, OwnerNotifier } from "./types";
import { getPgPool } from "../db/postgres/pool";
import { createCrearCitaAction } from "./crearCita";
import { createConsultarPedidoAction } from "./consultarPedido";

export type { ActionDefinition, ActionRegistry, OwnerNotifier } from "./types";

/**
 * Registro de acciones/tools de Premium: `crear_cita` (irreversible, pide
 * confirmación) y `consultar_pedido` (solo lectura). Para agregar una
 * acción nueva: crear su archivo (ver crearCita.ts/consultarPedido.ts
 * como plantilla) y registrarla aquí.
 *
 * `notifyOwner` (opcional): se le pasa a crear_cita para avisarle al
 * dueño del negocio por WhatsApp cuando se agenda una cita real — ver
 * cómo se arma en server.ts.
 *
 * Si el cliente ya tiene su propio sistema (CRM, plataforma de pedidos) y
 * quiere que el bot escriba ahí en vez de en nuestra Postgres, no la
 * conectes aquí directo — copia y adapta
 * src/actions/templates/crearPedidoSistemaExterno.ts, y recién esa copia
 * regístrala en este archivo. Ver el checklist en los comentarios de esa
 * plantilla.
 */
export function createActionRegistry(pool: Pool = getPgPool(), notifyOwner?: OwnerNotifier): ActionRegistry {
  const actions = new Map<string, ActionDefinition>();

  function register(action: ActionDefinition): void {
    actions.set(action.name, action);
  }

  register(createCrearCitaAction(pool, notifyOwner));
  register(createConsultarPedidoAction(pool));

  return {
    register,
    get: (name) => actions.get(name),
    list: () => Array.from(actions.values()),
  };
}

/** Convierte las acciones registradas al formato `ToolDefinition` que esperan los clientes de IA. */
export function actionsToToolDefinitions(registry: ActionRegistry): ToolDefinition[] {
  return registry.list().map((action) => ({
    name: action.name,
    description: action.description,
    parameters: action.parametersSchema,
  }));
}
