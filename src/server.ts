import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import { loadBusinessConfig } from "./config/loadBusinessConfig";
import { selectAiClient } from "./ai/selectAiClient";
import { createChatEngine } from "./channels/chatEngine";
import { createChatController } from "./channels/web/chatController";
import { createWhatsappController } from "./channels/whatsapp/whatsappController";
import { createWhatsappAdapter, type WhatsappAdapter, type WhatsappProvider } from "./channels/whatsapp/whatsappAdapter";
import { createRagIndex } from "./rag";
import { createSqliteConversationStore } from "./db";
import { createActionRegistry, type ActionRegistry, type OwnerNotifier } from "./actions";
import { getPgPool } from "./db/postgres/pool";
import { exportCitas, exportPedidos } from "./db/postgres/adminQueries";
import type { Pool } from "pg";

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

  // Canal WhatsApp (Standard): activar con WHATSAPP_PROVIDER en .env.
  // Se crea antes que las acciones porque crear_cita (Premium) lo reusa
  // para avisarle al dueño del negocio cuando se agenda una cita real.
  const whatsappProvider = process.env.WHATSAPP_PROVIDER as WhatsappProvider | undefined;
  let whatsappAdapter: WhatsappAdapter | undefined;
  if (whatsappProvider) {
    try {
      whatsappAdapter = createWhatsappAdapter(whatsappProvider);
    } catch (error) {
      console.warn(`[whatsapp] No se pudo activar el canal (${whatsappProvider}):`, (error as Error).message);
    }
  }

  // Notificación al dueño (Premium): si hay WhatsApp activo y el negocio
  // configuró `ownerWhatsapp`, crear_cita le avisa cada vez que se agenda
  // una cita real. Sin cualquiera de los dos, simplemente no se notifica.
  let notifyOwner: OwnerNotifier | undefined;
  if (whatsappAdapter && businessConfig.ownerWhatsapp) {
    const ownerNumber = businessConfig.ownerWhatsapp;
    const adapter = whatsappAdapter;
    notifyOwner = (message: string) => adapter.sendMessage(ownerNumber, message);
  } else if (businessConfig.ownerWhatsapp && !whatsappAdapter) {
    console.warn(
      "[actions] ownerWhatsapp configurado pero el canal de WhatsApp no está activo " +
        "(falta WHATSAPP_PROVIDER) — no se podrán enviar notificaciones de citas nuevas."
    );
  }

  // Acciones / function calling (Premium): requiere DATABASE_URL (Postgres).
  // Si no está configurado, el bot sigue funcionando como Standard (sin
  // acciones) en vez de romper el arranque — así esta misma rama sirve de
  // demo aunque el cliente todavía no tenga Postgres listo.
  let actionRegistry: ActionRegistry | undefined;
  let pgPool: Pool | undefined;
  if (process.env.DATABASE_URL) {
    try {
      pgPool = getPgPool();
      actionRegistry = createActionRegistry(pgPool, notifyOwner);
      console.log(`Acciones Premium activas: ${actionRegistry.list().map((a) => a.name).join(", ")}`);
    } catch (error) {
      console.warn("[actions] No se pudieron inicializar las acciones Premium:", (error as Error).message);
    }
  } else {
    console.warn(
      "[actions] DATABASE_URL no configurado: las acciones Premium (crear_cita, consultar_pedido) " +
        "están desactivadas. Ver .env.example y docker-compose.yml (servicio 'postgres')."
    );
  }

  const chatEngine = createChatEngine({
    config: businessConfig,
    aiClient,
    ragIndex,
    conversationStore,
    actionRegistry,
  });

  const app = express();

  app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));

  // Sirve el widget embebible (canal web).
  app.use("/widget", express.static(path.resolve(__dirname, "..", "widget")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", business: businessConfig.businessName, level: businessConfig.level });
  });

  app.post("/chat", express.json(), createChatController(chatEngine));

  // Canal WhatsApp (Standard): configurar la URL del webhook en la consola
  // del proveedor apuntando a POST /webhooks/whatsapp. Twilio envía
  // application/x-www-form-urlencoded.
  if (whatsappAdapter) {
    app.post(
      "/webhooks/whatsapp",
      express.urlencoded({ extended: false }),
      createWhatsappController(chatEngine, whatsappAdapter)
    );
    console.log(`Canal WhatsApp activo (${whatsappProvider}) en POST /webhooks/whatsapp`);
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

  // Citas y pedidos (Premium): para que el dueño del negocio (o quien le
  // dé soporte) los vea sin usar `psql` a mano. Mismo token que el export
  // de conversaciones. Solo se monta si hay Postgres configurado.
  if (pgPool) {
    const pool = pgPool;

    app.get("/admin/citas", express.json(), async (req, res) => {
      if (ADMIN_TOKEN && req.header("x-admin-token") !== ADMIN_TOKEN) {
        res.status(401).json({ error: "Token de administración inválido." });
        return;
      }

      const format = req.query.format === "json" ? "json" : "csv";
      const data = await exportCitas(pool, format);
      res.setHeader("Content-Type", format === "json" ? "application/json" : "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="citas.${format}"`);
      res.send(data);
    });

    app.get("/admin/pedidos", express.json(), async (req, res) => {
      if (ADMIN_TOKEN && req.header("x-admin-token") !== ADMIN_TOKEN) {
        res.status(401).json({ error: "Token de administración inválido." });
        return;
      }

      const format = req.query.format === "json" ? "json" : "csv";
      const data = await exportPedidos(pool, format);
      res.setHeader("Content-Type", format === "json" ? "application/json" : "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="pedidos.${format}"`);
      res.send(data);
    });
  }

  app.listen(PORT, () => {
    console.log(`Chatbot IA (${businessConfig.level}) escuchando en http://localhost:${PORT}`);
    console.log(`Widget de prueba: http://localhost:${PORT}/widget/`);
  });
}

main();
