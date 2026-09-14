# Chatbot con IA (GPT/Claude) — Base reutilizable (Basic / Standard / Premium)

Base de código parametrizable para el gig de Fiverr "Chatbot con IA". Un
mismo backend sirve los 3 niveles del servicio; para un pedido real solo
hace falta:

1. Cargar la info del negocio del cliente en `src/config/business-config.json`
   (FAQ, tono, nombre, catálogo/políticas).
2. Configurar el canal (web y/o WhatsApp) y el proveedor de IA en `.env`.
3. Activar los módulos del nivel comprado (Standard: RAG + WhatsApp + logs;
   Premium: function calling + base de datos real).

Estado actual de este scaffold: **Nivel Basic implementado end-to-end**
(con datos de ejemplo de una panadería ficticia). Standard y Premium están
definidos como interfaces/carpetas listas para activarse, sin romper el
código de Basic.

---

## Nivel Basic (implementado)

- Endpoint `POST /chat`: recibe `{ message, history }` y responde `{ reply }`
  usando el modelo configurado (OpenAI **o** Anthropic, uno a la vez).
- Prompt de sistema generado desde `business-config.json` (nombre, tono,
  hasta 10 preguntas de FAQ).
- Sin memoria entre sesiones: el historial corto vive en el navegador
  (widget) y se reenvía en cada request; el servidor no lo persiste.
- Widget de chat embebible (`widget/chatbot.js`) vía una línea de
  `<script>`, sin frameworks.
- Manejo de errores: timeout de 15s a la API de IA y mensaje genérico de
  fallback (`errorMessage` en la config) si falla.

### Setup rápido

```bash
npm install
cp .env.example .env
# completa OPENAI_API_KEY o ANTHROPIC_API_KEY y AI_PROVIDER en .env
npm run dev
```

Esto levanta el servidor en `http://localhost:3000`. Para probar el widget
embebido, abre `widget/index.html` en el navegador (o sírvelo con cualquier
servidor estático) — ya apunta a `http://localhost:3000/chat`.

> Para instrucciones detalladas de cómo montarlo en local (con Node o con
> Docker) y qué deberías ver funcionando, ver **[TESTING.md](./TESTING.md)**.

### Con Docker

```bash
cp .env.example .env
# completa OPENAI_API_KEY o ANTHROPIC_API_KEY en .env
docker compose up --build
```

Ver `TESTING.md` para más detalle (build/run sin compose, montaje de
`business-config.json`, etc.).

Prueba rápida sin widget:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cuál es el horario?", "history": []}'
```

### Personalizar para un cliente nuevo

Edita `src/config/business-config.json` (o crea uno nuevo y apunta
`BUSINESS_CONFIG_PATH` a él) con la info real del negocio:

```json
{
  "businessName": "...",
  "tone": "...",
  "language": "es",
  "level": "basic",
  "aiProvider": "openai",
  "faq": [{ "question": "...", "answer": "..." }],
  "fallbackMessage": "...",
  "errorMessage": "..."
}
```

`business-config.example.json` queda como plantilla de referencia.

---

## Nivel Standard (no implementado, interfaces listas)

Módulos ya definidos, pendientes de implementación al llegar el pedido:

- `src/channels/whatsapp/whatsappAdapter.ts` — conectar Twilio o Meta Cloud
  API al mismo `/chat`.
- `src/rag/index.ts` — chunking + embeddings + búsqueda de contexto,
  inyectado a `buildSystemPrompt(config, extraContext)`.
- `src/db/index.ts` — `ConversationStore` con SQLite (log de conversaciones
  + export CSV/JSON).
- Multi-idioma: extender `buildSystemPrompt` para detectar y responder en
  el idioma del usuario (hoy usa `config.language` fijo).

## Nivel Premium (no implementado, interfaces listas)

- `src/actions/index.ts` — `ActionDefinition` / `ActionRegistry` para
  function calling (`crear_cita`, `consultar_pedido`), con confirmación
  obligatoria antes de ejecutar acciones irreversibles.
- `src/db/index.ts` — esquema real en PostgreSQL para citas/pedidos,
  consultado desde las acciones.
- Documentación de mantenimiento post-entrega (15 días): se agregará en
  `docs/maintenance.md` cuando se implemente este nivel.

---

## Arquitectura

[`docs/arquitectura.html`](./docs/arquitectura.html) — diagramas de flujo, de
proceso (confirmación antes de escribir en la base) y de infraestructura,
con las piezas marcadas según en qué nivel del paquete se activan. Ábrelo
directo en el navegador (no necesita servidor).

## Estructura de carpetas

```
chatbot-ia/
├── src/
│   ├── config/          # business-config.json por cliente + loader/tipos
│   ├── channels/
│   │   ├── web/         # controller del endpoint /chat (Basic)
│   │   └── whatsapp/    # adapter (interfaz) — Standard+
│   ├── ai/              # cliente OpenAI, cliente Claude, selector, prompt
│   ├── rag/             # indexado y búsqueda de documentos — Standard+
│   ├── actions/         # function calling / tools — Premium
│   ├── db/               # esquema y conexión — Standard+/Premium
│   └── server.ts
├── widget/               # widget de chat embebible + demo.html
├── n8n-flows/            # exports de flujos n8n si se usan de orquestador
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── TESTING.md            # cómo levantarlo en local (Node o Docker) para probar
└── README.md
```

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Nivel | Descripción |
|---|---|---|
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Basic+ | Credenciales del proveedor de IA |
| `AI_PROVIDER` | Basic+ | `openai` o `anthropic` |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` | Basic+ | Modelo específico a usar |
| `PORT`, `CORS_ORIGIN` | Basic+ | Config del servidor |
| `WHATSAPP_PROVIDER`, `WHATSAPP_TOKEN` | Standard+ | Canal WhatsApp |
| `DATABASE_URL` | Standard+/Premium | Conexión a base de datos |

## Stack

Node.js + TypeScript + Express, sin SDKs pesados en Basic (los clientes de
OpenAI/Anthropic usan `fetch` nativo; se pueden reemplazar por los SDKs
oficiales sin tocar el resto del código, ya que ambos implementan la misma
interfaz `AiClient`).
