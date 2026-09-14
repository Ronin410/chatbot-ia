# Cómo levantar el proyecto en local para pruebas (nivel Standard)

Hay dos formas: con Node directamente, o con Docker. Ambas exponen el
mismo servidor en `http://localhost:3000`.

---

## Opción A — Node directo (más rápida para desarrollar)

Requisitos: Node.js 18+.

```bash
npm install
cp .env.example .env
```

Edita `.env` y completa **al menos una** de estas dos claves (según el
proveedor que uses en `AI_PROVIDER`):

```
OPENAI_API_KEY=sk-...
# o
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=openai   # o anthropic
```

> Si vas a probar RAG, `OPENAI_API_KEY` es obligatorio siempre (los
> embeddings solo existen en la API de OpenAI), aunque el chat use
> `AI_PROVIDER=anthropic`.

Levanta el servidor:

```bash
npm run dev
```

Verás:

```
Chatbot IA (standard) escuchando en http://localhost:3000
Widget de prueba: http://localhost:3000/widget/
```

(Si además completaste `WHATSAPP_PROVIDER=twilio` con sus credenciales,
verás una línea extra: `Canal WhatsApp activo (twilio) en POST /webhooks/whatsapp`.)

---

## Opción B — Docker

Requisitos: Docker (y Docker Compose, incluido en el Docker Desktop
actual).

```bash
cp .env.example .env
# completa OPENAI_API_KEY o ANTHROPIC_API_KEY en .env, igual que arriba
docker compose up --build
```

`docker-compose.yml` monta tu `src/config/business-config.json` local
dentro del contenedor, así que puedes editar la FAQ/tono del negocio y
solo necesitas `docker compose restart` para verlo reflejado, sin
reconstruir la imagen.

Para construir/correr sin compose:

```bash
docker build -t chatbot-ia .
docker run --rm -p 3000:3000 --env-file .env chatbot-ia
```

Para bajarlo: `Ctrl+C` (o `docker compose down` si usaste compose).

---

## Qué vas a poder probar

### 1. Health check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "business": "Panadería Dulce Aroma", "level": "standard" }
```

### 2. El widget de chat embebido (canal web)

Abre `widget/index.html` en el navegador, o `http://localhost:3000/widget/`.
Haz clic en la burbuja de chat y escribe un mensaje.

### 3. El endpoint `/chat` directamente

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Hacen envíos a domicilio?", "history": []}'
```

### 4. RAG sobre un documento del cliente

```bash
npm run rag:index -- documentos/politicas-de-devolucion.txt
```

Luego pregunta algo que solo esté en ese documento (no en la FAQ), por
ejemplo:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Puedo cancelar una torta personalizada?", "history": []}'
```

Debería responder usando el contenido del documento (anticipo del 50%,
reembolso según anticipación), no el fallback genérico.

### 5. WhatsApp (simulado con curl, sin cuenta de Twilio real)

Puedes probar el webhook sin una cuenta de Twilio real simulando su
payload (necesitas `WHATSAPP_PROVIDER=twilio` configurado en `.env`,
aunque las credenciales sean de prueba — solo fallará el envío final de
la respuesta, no la recepción/generación):

```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+5215512345678" \
  --data-urlencode "Body=Hola, ¿cuál es el horario?"
```

Responde `200 <Response></Response>` de inmediato (así lo espera Twilio)
y procesa el mensaje en segundo plano.

### 6. Reporte de conversaciones

Todo lo que pruebes en los pasos 3-5 queda registrado. Para verlo:

```bash
curl "http://localhost:3000/admin/conversations/export?format=json"
# o
curl "http://localhost:3000/admin/conversations/export?format=csv"
```

Si configuraste `ADMIN_TOKEN` en `.env`, agrega
`-H "x-admin-token: TU_ADMIN_TOKEN"`.

## Qué vas a ver si lo levantas *tal cual está ahora* (sin tocar nada)

El repo trae datos de ejemplo de una panadería ficticia
(`src/config/business-config.json`) y un documento de ejemplo
(`documentos/politicas-de-devolucion.txt`), así que **sin cambiar ningún
archivo** — solo completando una API key real en `.env` — vas a tener:

- Un chatbot que responde en español (o en el idioma del usuario, porque
  `multiLanguage: true`), con las 10 preguntas de la FAQ de ejemplo.
- Si además indexas el documento de ejemplo (paso 4), también responde
  preguntas que no están en la FAQ pero sí en ese documento (política de
  devoluciones, alérgenos, anticipos).
- Cada mensaje/respuesta (web o WhatsApp) queda en `data/conversations.sqlite`
  y se puede exportar a CSV/JSON.
- Si no configuras WhatsApp, ese canal simplemente no se monta — el resto
  funciona igual.

**Si dejas las API keys vacías o inválidas**, el chat sigue respondiendo
siempre (con el mensaje de error genérico configurado) en vez de romper
el servidor, tanto en web como en WhatsApp.

Function calling, acciones (agendar citas, consultar pedidos) y
PostgreSQL (Premium) no están en esta rama — ver `claude/premium-level-scaffold`.
