import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getPgPool, closePgPool } from "./pool";

/** Uso: npm run db:migrate — aplica schema.sql contra DATABASE_URL. */
async function main(): Promise<void> {
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  const pool = getPgPool();
  console.log("[db:migrate] Aplicando schema.sql...");
  await pool.query(schema);
  console.log("[db:migrate] Listo: tablas 'citas' y 'pedidos' creadas/actualizadas.");
  await closePgPool();
}

main().catch((error) => {
  console.error("[db:migrate] Error:", error);
  process.exit(1);
});
