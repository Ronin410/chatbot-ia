import fs from "node:fs";
import path from "node:path";
import type { BusinessConfig } from "./types";

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "business-config.json");

/**
 * Carga la configuración del negocio desde un JSON.
 * Permite override vía BUSINESS_CONFIG_PATH para que el mismo código
 * sirva a distintos clientes sin tocar el repo (solo se cambia el archivo).
 */
export function loadBusinessConfig(
  configPath: string = process.env.BUSINESS_CONFIG_PATH || DEFAULT_CONFIG_PATH
): BusinessConfig {
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as BusinessConfig;
  validate(parsed);
  return parsed;
}

function validate(config: BusinessConfig): void {
  if (!config.businessName) throw new Error("business-config.json: falta 'businessName'");
  if (!config.aiProvider) throw new Error("business-config.json: falta 'aiProvider'");
  if (!Array.isArray(config.faq)) throw new Error("business-config.json: 'faq' debe ser un arreglo");
  if (config.level === "basic" && config.faq.length > 10) {
    console.warn(
      "[business-config] Nivel Basic soporta hasta 10 preguntas de FAQ; se recibieron " +
        config.faq.length
    );
  }
}
