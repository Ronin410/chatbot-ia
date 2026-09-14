import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import { loadBusinessConfig } from "./config/loadBusinessConfig";
import { createChatController } from "./channels/web/chatController";

const PORT = Number(process.env.PORT) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

function main(): void {
  const businessConfig = loadBusinessConfig();
  const app = express();

  app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
  app.use(express.json());

  // Sirve el widget embebible (Basic: canal web únicamente).
  app.use("/widget", express.static(path.resolve(__dirname, "..", "widget")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", business: businessConfig.businessName, level: businessConfig.level });
  });

  app.post("/chat", createChatController(businessConfig));

  // Nota: canal WhatsApp (Standard+) se monta aquí como
  // app.post('/webhooks/whatsapp', ...) cuando se active ese nivel.
  // Ver src/channels/whatsapp/whatsappAdapter.ts

  app.listen(PORT, () => {
    console.log(`Chatbot IA (${businessConfig.level}) escuchando en http://localhost:${PORT}`);
    console.log(`Widget de prueba: http://localhost:${PORT}/widget/`);
  });
}

main();
