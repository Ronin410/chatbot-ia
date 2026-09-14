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
