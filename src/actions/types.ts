export interface ActionDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  /** JSON Schema de los parámetros esperados por la acción. */
  parametersSchema: Record<string, unknown>;
  /** Si es true, `execute` debe pedir confirmación antes de ejecutar de verdad (ver crearCita.ts). */
  requiresConfirmation: boolean;
  execute(params: TParams): Promise<TResult>;
}

export interface ActionRegistry {
  register(action: ActionDefinition): void;
  get(name: string): ActionDefinition | undefined;
  list(): ActionDefinition[];
}

/**
 * Manda un mensaje de texto al dueño del negocio (no al cliente). Lo usa
 * crear_cita para avisar por WhatsApp cuando se agenda una cita real.
 * Opcional: si no se provee, la acción simplemente no notifica a nadie.
 */
export type OwnerNotifier = (message: string) => Promise<void>;
