# Chatbot con IA (GPT/Claude) — Nivel Premium

Base de código parametrizable para el gig de Fiverr "Chatbot con IA". Esta
rama (`claude/premium-level-scaffold`) trae **todo lo de Basic + Standard,
más el nivel Premium implementado end-to-end**: function calling con
acciones reales contra PostgreSQL y confirmación antes de ejecutar
acciones irreversibles.

> ¿Buscas una versión más simple?
> - Solo FAQ + widget web: rama `claude/basic-level-scaffold-ezvpl9`.
> - + WhatsApp, RAG, multi-idioma, log de conversaciones: rama
>   `claude/standard-level-scaffold`.

Para un pedido real Premium solo hace falta:

1. Cargar la info del negocio en `src/config/business-config.json` y sus
   documentos en `documentos/` (igual que Standard).
2. Configurar el canal (web y/o WhatsApp), el proveedor de IA y
   `DATABASE_URL` en `.env`.
3. Correr `npm run db:migrate` para crear el esquema de citas/pedidos.
4. Si el negocio necesita otras acciones (además de agendar citas y
   consultar pedidos), agregarlas en `src/actions/` siguiendo el mismo
   patrón.

---

## Qué incluye esta rama

### Heredado de Basic + Standard
Widget web, WhatsApp (Twilio), RAG básico sobre documentos, multi-idioma,
y log de conversaciones exportable — ver el README de la rama Standard
para el detalle de cada uno (sigue todo funcionando igual aquí).

### Nuevo en Premium
- **Function calling real**: dos acciones registradas —
  `crear_cita` y `consultar_pedido` (`src/actions/`) — que el modelo
  puede invocar durante la conversación, implementado tanto para OpenAI
  (`tools`/`tool_calls`) como para Anthropic (`tools`/`tool_use`) detrás
  de un mismo método `aiClient.completeWithTools(...)`
  (`src/ai/types.ts`, `openaiClient.ts`, `anthropicClient.ts`).
- **Base de datos real (PostgreSQL)**: esquema en
  `src/db/postgres/schema.sql` (tablas `citas` y `pedidos`, con datos de
  ejemplo) + pool de conexión (`src/db/postgres/pool.ts`) + script de
  migración (`npm run db:migrate`).
- **Confirmación antes de acciones irreversibles**: `crear_cita` nunca
  agenda nada la primera vez que se llama — devuelve un resumen y pide
  que el modelo lo confirme con el usuario antes de ejecutarla de verdad
  (`confirmado: true`). `consultar_pedido`, al ser de solo lectura, no
  necesita confirmación. La política completa se le explica al modelo en
  el prompt de sistema cuando hay acciones activas
  (`src/ai/systemPrompt.ts`).
- **Documentación de mantenimiento** para los 15 días de soporte
  post-entrega: [`docs/mantenimiento.md`](./docs/mantenimiento.md).

Si `DATABASE_URL` no está configurado, el servidor sigue arrancando y
funcionando igual que Standard (sin acciones) — Premium es aditivo, no
rompe nada si el cliente todavía no llegó a ese nivel.

### Setup rápido

```bash
npm install
cp .env.example .env
# completa OPENAI_API_KEY (o ANTHROPIC_API_KEY), AI_PROVIDER y DATABASE_URL en .env
npm run db:migrate
npm run dev
```

Al arrancar deberías ver:
```
Acciones Premium activas: crear_cita, consultar_pedido
Chatbot IA (premium) escuchando en http://localhost:3000
```

> Para instrucciones detalladas (Node o Docker, con Postgres incluido) y
> qué deberías ver funcionando, ver **[TESTING.md](./TESTING.md)**.

### Con Docker (incluye Postgres)

```bash
cp .env.example .env
docker compose up --build
# en otra terminal, una sola vez (crea las tablas):
docker compose exec chatbot node dist/db/postgres/migrate.js
```

`docker-compose.yml` ya trae un servicio `postgres` y apunta
`DATABASE_URL` del contenedor `chatbot` a él automáticamente.

### Agregar una acción nueva

1. Crea `src/actions/miAccion.ts` siguiendo el patrón de
   `crearCita.ts` (irreversible, con confirmación) o
   `consultarPedido.ts` (solo lectura): exporta una función que recibe el
   `Pool` de Postgres y devuelve un `ActionDefinition` (`name`,
   `description`, `parametersSchema` en JSON Schema, `requiresConfirmation`,
   `execute`).
2. Regístrala en `src/actions/index.ts` (`register(createMiAccion(pool))`).
3. Si necesita tablas nuevas, agrégalas a `src/db/postgres/schema.sql` y
   corre `npm run db:migrate` de nuevo (usa `CREATE TABLE IF NOT EXISTS`,
   es seguro repetirlo).

No hace falta tocar `chatEngine.ts` ni los clientes de IA: las acciones
registradas se exponen automáticamente como tools al modelo.

### Personalizar para un cliente nuevo

Mismo `business-config.json` que Standard, con `"level": "premium"`:

```json
{
  "businessName": "...",
  "tone": "...",
  "language": "es",
  "level": "premium",
  "aiProvider": "openai",
  "multiLanguage": true,
  "faq": [{ "question": "...", "answer": "..." }],
  "fallbackMessage": "...",
  "errorMessage": "...",
  "whatsappGreeting": "..."
}
```

---

## Estructura de carpetas

```
chatbot-ia/
├── src/
│   ├── config/              # business-config.json por cliente + loader/tipos
│   ├── channels/
│   │   ├── chatEngine.ts    # núcleo compartido: prompt + IA + RAG + tools + logging
│   │   ├── types.ts         # tipo Channel ("web" | "whatsapp")
│   │   ├── web/             # controller del endpoint /chat
│   │   └── whatsapp/        # adapter (Twilio) + controller del webhook
│   ├── ai/                  # clientes OpenAI/Claude con function calling, selector, prompt
│   ├── rag/                  # chunking, embeddings, vector store, CLI de indexado
│   ├── actions/               # crear_cita, consultar_pedido (function calling real)
│   ├── db/
│   │   ├── sqliteConversationStore.ts  # log de conversaciones (Standard)
│   │   └── postgres/                    # pool, schema.sql, CLI de migración (Premium)
│   └── server.ts
├── widget/                    # widget de chat embebible + demo.html
├── documentos/                 # documentos de ejemplo para indexar con RAG
├── docs/mantenimiento.md       # guía de soporte post-entrega (15 días)
├── data/                       # generado en runtime: rag-index.json, conversations.sqlite (git-ignored)
├── n8n-flows/                  # exports de flujos n8n si se usan de orquestador
├── Dockerfile
├── docker-compose.yml           # incluye servicio postgres
├── .env.example
├── TESTING.md                   # cómo levantarlo en local (Node o Docker) para probar
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
| `DATABASE_URL` | Premium | Conexión a PostgreSQL (citas/pedidos) — habilita las acciones |

## Stack

Node.js + TypeScript + Express. Clientes de OpenAI/Anthropic vía `fetch`
nativo, ambos con `complete()` (texto simple) y `completeWithTools()`
(function calling). SQLite (`better-sqlite3`) para el log de
conversaciones; PostgreSQL (`pg`) para citas/pedidos reales. `pdf-parse`
para extraer texto de PDFs del cliente en RAG.
