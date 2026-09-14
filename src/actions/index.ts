/**
 * Function calling / tools del modelo para acciones estructuradas
 * (Premium): ej. `crear_cita`, `consultar_pedido`.
 *
 * NO IMPLEMENTADO en los niveles Basic/Standard. Interfaz definida para
 * activar Premium:
 *  1. Declarar cada acción como `ActionDefinition` (nombre, descripción,
 *     esquema de parámetros) y registrarla en el modelo (tools de OpenAI /
 *     Anthropic).
 *  2. Implementar `execute` conectando a la base de datos real (ver src/db).
 *  3. Antes de ejecutar una acción irreversible (agendar, cancelar, pagar),
 *     el bot debe pedir confirmación explícita al usuario en la conversación.
 */

export interface ActionDefinition<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  /** JSON Schema de los parámetros esperados por la acción. */
  parametersSchema: Record<string, unknown>;
  /** Si es true, el bot debe confirmar con el usuario antes de ejecutar. */
  requiresConfirmation: boolean;
  execute(params: TParams): Promise<TResult>;
}

export interface ActionRegistry {
  register(action: ActionDefinition): void;
  get(name: string): ActionDefinition | undefined;
  list(): ActionDefinition[];
}

export function createActionRegistry(): ActionRegistry {
  throw new Error(
    "Function calling / actions no implementado todavía: funcionalidad de nivel Premium. " +
      "Ver src/actions/index.ts"
  );
}
