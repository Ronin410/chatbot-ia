/** Utilidades de exportación a CSV, compartidas entre el log de SQLite (Standard) y las consultas admin de Postgres (Premium). */

export function csvEscape(value: unknown): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Arma un CSV a partir de un arreglo de filas y las columnas a incluir, en ese orden. */
export function rowsToCsv<T extends object>(rows: T[], columns: (keyof T & string)[]): string {
  const header = columns.join(",");
  const body = rows.map((row) =>
    columns.map((col) => csvEscape((row as Record<string, unknown>)[col])).join(",")
  );
  return [header, ...body].join("\n");
}
