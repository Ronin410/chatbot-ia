import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import { loadBusinessConfig } from "./config/loadBusinessConfig";
import { selectAiClient } from "./ai/selectAiClient";
import { createChatEngine } from "./channels/chatEngine";
import { createChatController } from "./channels/web/chatController";
import { createWhatsappController } from "./channels/whatsapp/whatsappController";
import { createWhatsappAdapter, type WhatsappProvider } from "./channels/whatsapp/whatsappAdapter";
import { createRagIndex } from "./rag";
import { createSqliteConversationStore } from "./db";

const PORT = Number(process.env.PORT) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function main(): void {
  const businessConfig = loadBusinessConfig();
  const aiClient = selectAiClient(businessConfig.aiProvider);

  // RAG (Standard): si no hay documentos indexados (data/rag-index.json
  // vacío/inexistente), retrieveContext simplemente no aporta contexto y
  // el bot sigue funcionando solo con la FAQ, igual que en Basic.
  const ragIndex = createRagIndex();

  // Log de conversaciones (Standard): SQLite local, ver .env SQLITE_PATH.
  const conversationStore = createSqliteConversationStore();

  const chatEngine = createChatEngine({
    config: businessConfig,
    aiClient,
    ragIndex,
    conversationStore,
  });

  const app = express();

  app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));

  // Sirve el widget embebible (canal web).
  app.use("/widget", express.static(path.resolve(__dirname, "..", "widget")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", business: businessConfig.businessName, level: businessConfig.level });
  });

  app.post("/chat", express.json(), createChatController(chatEngine));

  // Canal WhatsApp (Standard): activar con WHATSAPP_PROVIDER en .env y
  // configurar la URL del webhook en la consola del proveedor apuntando a
  // POST /webhooks/whatsapp. Twilio envía application/x-www-form-urlencoded.
  const whatsappProvider = process.env.WHATSAPP_PROVIDER as WhatsappProvider | undefined;
  if (whatsappProvider) {
    try {
      const whatsappAdapter = createWhatsappAdapter(whatsappProvider);
      app.post(
        "/webhooks/whatsapp",
        express.urlencoded({ extended: false }),
        createWhatsappController(chatEngine, whatsappAdapter)
      );
      console.log(`Canal WhatsApp activo (${whatsappProvider}) en POST /webhooks/whatsapp`);
    } catch (error) {
      console.warn(`[whatsapp] No se pudo activar el canal (${whatsappProvider}):`, (error as Error).message);
    }
  }

  // Reporte de conversaciones (Standard): protegido con un token simple
  // por header, suficiente para un panel interno de un solo negocio.
  app.get("/admin/conversations/export", express.json(), async (req, res) => {
    if (ADMIN_TOKEN && req.header("x-admin-token") !== ADMIN_TOKEN) {
      res.status(401).json({ error: "Token de administración inválido." });
      return;
    }

    const format = req.query.format === "json" ? "json" : "csv";
    const data = await conversationStore.exportConversations(format);
    res.setHeader(
      "Content-Type",
      format === "json" ? "application/json" : "text/csv; charset=utf-8"
    );
    res.setHeader("Content-Disposition", `attachment; filename="conversaciones.${format}"`);
    res.send(data);
  });

  app.listen(PORT, () => {
    console.log(`Chatbot IA (${businessConfig.level}) escuchando en http://localhost:${PORT}`);
    console.log(`Widget de prueba: http://localhost:${PORT}/widget/`);
  });
}

main();
