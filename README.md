# Chatbot con IA (GPT/Claude) — Nivel Standard

Base de código parametrizable para el gig de Fiverr "Chatbot con IA". Esta
rama (`claude/standard-level-scaffold`) trae **todo lo de Basic + el
nivel Standard implementado end-to-end**, lista para usarse tal cual en
un pedido real con solo cambiar la config del negocio.

> ¿Buscas la versión mínima (solo FAQ + widget web)? Está en la rama
> `claude/basic-level-scaffold-ezvpl9`.
> ¿Buscas Premium (function calling + Postgres)? Está en
> `claude/premium-level-scaffold`, construida encima de esta.

Para un pedido real solo hace falta:

1. Cargar la info del negocio del cliente en `src/config/business-config.json`
   (FAQ, tono, nombre) y, si aplica, sus documentos en `documentos/`.
2. Configurar el canal (web y/o WhatsApp) y el proveedor de IA en `.env`.
3. Indexar los documentos del cliente para RAG (`npm run rag:index`).

---

## Qué incluye esta rama

### Heredado de Basic
- Endpoint `POST /chat` (canal web) + widget de chat embebible
  (`widget/chatbot.js`).
- Prompt de sistema generado desde `business-config.json`.
- Manejo de errores con timeout y mensaje de fallback genérico.

### Nuevo en Standard
- **WhatsApp Business** vía Twilio: webhook `POST /webhooks/whatsapp`
  conectado al mismo motor de respuestas que el widget web
  (`src/channels/whatsapp/`). Meta Cloud API queda con la interfaz
  definida pero sin implementar (ver comentarios en `whatsappAdapter.ts`).
- **RAG básico**: indexa documentos propios del cliente (`.pdf`, `.txt`,
  `.md`) — chunking + embeddings de OpenAI + búsqueda por similitud
  coseno — e inyecta el contexto más relevante en el prompt antes de
  responder (`src/rag/`).
- **Multi-idioma**: con `multiLanguage: true` en `business-config.json`,
  el prompt instruye al modelo a detectar el idioma del usuario y
  responder en ese idioma.
- **Log de conversaciones** en SQLite (`src/db/`): cada intercambio
  (web o WhatsApp) se guarda con timestamp, canal, mensaje y respuesta.
- **Exportación de conversaciones**: `GET /admin/conversations/export?format=csv|json`
  (protegido opcionalmente con `ADMIN_TOKEN`).

Todo esto comparte un mismo núcleo (`src/channels/chatEngine.ts`) para
que el canal web y WhatsApp no dupliquen lógica de prompt/IA/logging.

### Setup rápido

```bash
npm install
cp .env.example .env
# completa OPENAI_API_KEY (o ANTHROPIC_API_KEY) y AI_PROVIDER en .env
npm run dev
```

> Para instrucciones detalladas (Node o Docker) y qué deberías ver
> funcionando, ver **[TESTING.md](./TESTING.md)**.

### Con Docker

```bash
cp .env.example .env
docker compose up --build
```

### Activar WhatsApp (Twilio)

1. Crea una cuenta de Twilio y activa el sandbox de WhatsApp (o un número
   productivo).
2. Completa en `.env`: `WHATSAPP_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`.
3. En la consola de Twilio, configura el webhook de mensajes entrantes
   apuntando a `https://TU-DOMINIO/webhooks/whatsapp` (método POST).
4. Reinicia el servidor — el log al arrancar confirma
   `Canal WhatsApp activo (twilio) en POST /webhooks/whatsapp`.

El historial de una conversación de WhatsApp se mantiene en memoria por
número de teléfono mientras el proceso sigue vivo (no persiste si se
reinicia el servidor); el log en SQLite sí es permanente.

### Activar RAG (documentos del cliente)

1. Coloca el documento del cliente en `documentos/` (o cualquier ruta).
   Ya incluye uno de ejemplo: `documentos/politicas-de-devolucion.txt`.
2. Indícalo:
   ```bash
   npm run rag:index -- documentos/politicas-de-devolucion.txt
   ```
   Esto genera/actualiza `data/rag-index.json` (o la ruta de
   `RAG_STORE_PATH`). Requiere `OPENAI_API_KEY` configurado **siempre**,
   incluso si el chat usa `AI_PROVIDER=anthropic`, porque Anthropic no
   ofrece API de embeddings (ver `src/rag/embeddingsClient.ts`).
3. Al llegar un mensaje, si hay documentos indexados, `chatEngine` recupera
   los fragmentos más relevantes y los agrega al prompt automáticamente
   (no requiere tocar `server.ts`).

Si no indexas ningún documento, Standard se comporta igual que Basic
(responde solo con la FAQ) — RAG es aditivo, no rompe nada si no se usa.

### Ver el reporte de conversaciones

```bash
curl "http://localhost:3000/admin/conversations/export?format=csv" \
  -H "x-admin-token: TU_ADMIN_TOKEN"
```

Si `ADMIN_TOKEN` está vacío en `.env`, el endpoint no pide token (solo
recomendable en local).

### Personalizar para un cliente nuevo

Edita `src/config/business-config.json` (o crea uno nuevo y apunta
`BUSINESS_CONFIG_PATH` a él):

```json
{
  "businessName": "...",
  "tone": "...",
  "language": "es",
  "level": "standard",
  "aiProvider": "openai",
  "multiLanguage": true,
  "faq": [{ "question": "...", "answer": "..." }],
  "fallbackMessage": "...",
  "errorMessage": "...",
  "whatsappGreeting": "..."
}
```

`business-config.example.json` queda como plantilla de referencia.

---

## Arquitectura

[`docs/arquitectura.html`](./docs/arquitectura.html) — diagramas de flujo, de
proceso (confirmación antes de escribir en la base) y de infraestructura,
con las piezas marcadas según en qué nivel del paquete se activan. Ábrelo
directo en el navegador (no necesita servidor).

## Nivel Premium (no incluido en esta rama)

Function calling (`crear_cita`, `consultar_pedido`), base de datos real en
PostgreSQL y confirmación de acciones irreversibles. Ver la rama
`claude/premium-level-scaffold`, que parte de esta misma rama Standard y
agrega esas piezas sin tocar lo de aquí (`src/actions/` y `src/db/`
quedan con las interfaces documentadas mientras tanto).

---

## Estructura de carpetas

```
chatbot-ia/
├── src/
│   ├── config/            # business-config.json por cliente + loader/tipos
│   ├── channels/
│   │   ├── chatEngine.ts  # núcleo compartido: prompt + IA + RAG + logging
│   │   ├── types.ts       # tipo Channel ("web" | "whatsapp")
│   │   ├── web/           # controller del endpoint /chat
│   │   └── whatsapp/      # adapter (Twilio implementado) + controller del webhook
│   ├── ai/                # cliente OpenAI, cliente Claude, selector, prompt
│   ├── rag/                # chunking, embeddings, vector store, CLI de indexado
│   ├── actions/            # function calling / tools — Premium (interfaz)
│   ├── db/                 # ConversationStore en SQLite (log + export)
│   └── server.ts
├── widget/                 # widget de chat embebible + demo.html
├── documentos/              # documentos de ejemplo para indexar con RAG
├── data/                    # generado en runtime: rag-index.json, conversations.sqlite (git-ignored)
├── n8n-flows/               # exports de flujos n8n si se usan de orquestador
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── TESTING.md               # cómo levantarlo en local (Node o Docker) para probar
└── README.md
```

## Variables de entorno

Ver `.env.example` para el detalle completo. Resumen:

| Variable | Nivel | Descripción |
|---|---|---|
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Basic+ | Credenciales del proveedor de IA (embeddings de RAG siempre usan OpenAI) |
| `AI_PROVIDER` | Basic+ | `openai` o `anthropic`, para el chat |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` / `EMBEDDINGS_MODEL` | Basic+/Standard | Modelos específicos |
| `PORT`, `CORS_ORIGIN` | Basic+ | Config del servidor |
| `WHATSAPP_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | Standard | Canal WhatsApp |
| `RAG_STORE_PATH` | Standard | Dónde se guarda el índice de documentos |
| `SQLITE_PATH`, `ADMIN_TOKEN` | Standard | Log de conversaciones y protección del export |
| `DATABASE_URL` | Premium | Conexión a PostgreSQL (citas/pedidos) |

## Stack

Node.js + TypeScript + Express. Clientes de OpenAI/Anthropic vía `fetch`
nativo (mismo contrato `AiClient`, intercambiables). SQLite
(`better-sqlite3`) para el log de conversaciones — sin servidor de base de
datos aparte. `pdf-parse` para extraer texto de PDFs del cliente en RAG.
