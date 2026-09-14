import type { Pool } from "pg";
import type { ToolDefinition } from "../ai/types";
import type { ActionDefinition, ActionRegistry } from "./types";
import { getPgPool } from "../db/postgres/pool";
import { createCrearCitaAction } from "./crearCita";
import { createConsultarPedidoAction } from "./consultarPedido";

export type { ActionDefinition, ActionRegistry } from "./types";

/**
 * Registro de acciones/tools de Premium: `crear_cita` (irreversible, pide
 * confirmación) y `consultar_pedido` (solo lectura). Para agregar una
 * acción nueva: crear su archivo (ver crearCita.ts/consultarPedido.ts
 * como plantilla) y registrarla aquí.
 */
export function createActionRegistry(pool: Pool = getPgPool()): ActionRegistry {
  const actions = new Map<string, ActionDefinition>();

  function register(action: ActionDefinition): void {
    actions.set(action.name, action);
  }

  register(createCrearCitaAction(pool));
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
