# Cómo levantar el proyecto en local para pruebas (nivel Premium)

Hay dos formas: con Node directamente, o con Docker (recomendado para
Premium porque incluye Postgres listo). Ambas exponen el servidor en
`http://localhost:3000`.

---

## Opción A — Node directo

Requisitos: Node.js 18+ y PostgreSQL accesible (local o remoto).

```bash
npm install
cp .env.example .env
```

Edita `.env`:

```
OPENAI_API_KEY=sk-...      # o ANTHROPIC_API_KEY
AI_PROVIDER=openai         # o anthropic
DATABASE_URL=postgresql://usuario:password@localhost:5432/chatbot
```

> RAG requiere `OPENAI_API_KEY` siempre (embeddings), aunque el chat use
> `AI_PROVIDER=anthropic`.

Crea las tablas (una sola vez, y de nuevo cada vez que cambie `schema.sql`):

```bash
npm run db:migrate
```

Levanta el servidor:

```bash
npm run dev
```

Deberías ver:

```
Acciones Premium activas: crear_cita, consultar_pedido
Chatbot IA (premium) escuchando en http://localhost:3000
Widget de prueba: http://localhost:3000/widget/
```

Si no ves la primera línea (o ves una advertencia `[actions] No se
pudieron inicializar...`), revisa `DATABASE_URL` y que Postgres esté
accesible — el resto del bot (FAQ, RAG, WhatsApp) sigue funcionando igual
sin acciones.

---

## Opción B — Docker (con Postgres incluido)

Requisitos: Docker + Docker Compose.

```bash
cp .env.example .env
# completa OPENAI_API_KEY o ANTHROPIC_API_KEY en .env
# no hace falta tocar DATABASE_URL: docker-compose.yml lo apunta al servicio "postgres"
docker compose up --build
```

En otra terminal, una sola vez, crea las tablas:

```bash
docker compose exec chatbot node dist/db/postgres/migrate.js
```

`docker-compose.yml` monta tu `src/config/business-config.json` local
dentro del contenedor: puedes editarlo y solo necesitas
`docker compose restart chatbot` para verlo reflejado.

Para bajarlo: `docker compose down` (agrega `-v` si además quieres borrar
los datos de Postgres).

---

## Qué vas a poder probar

### 1. Health check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "business": "Panadería Dulce Aroma", "level": "premium" }
```

### 2. El widget de chat embebido (canal web)

Abre `widget/index.html` en el navegador, o `http://localhost:3000/widget/`.

### 3. RAG (igual que Standard)

```bash
npm run rag:index -- documentos/politicas-de-devolucion.txt
```

### 4. Consultar un pedido (function calling, solo lectura)

El esquema trae dos pedidos de ejemplo (`PED-1001`, `PED-1002`). Pregúntale
al bot por uno:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cómo va mi pedido PED-1001?", "history": []}'
```

El modelo debería invocar `consultar_pedido` internamente y responder con
el estatus real (`en_camino`) que está en la base, no un dato inventado.

### 5. Agendar una cita (function calling con confirmación)

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Quiero agendar una torta de cumpleaños para el 1 de octubre a las 10am, mi nombre es Juan y mi teléfono 555-1234", "history": []}'
```

La primera respuesta debería ser un resumen pidiendo que confirmes (el
modelo llama `crear_cita` con `confirmado:false` primero). Confirma en el
siguiente mensaje, reenviando el historial:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Sí, confirmo",
    "history": [
      {"role":"user","content":"Quiero agendar una torta de cumpleaños para el 1 de octubre a las 10am, mi nombre es Juan y mi teléfono 555-1234"},
      {"role":"assistant","content":"<pega aquí la respuesta anterior del bot>"}
    ]
  }'
```

Solo en este segundo paso debería quedar la cita realmente guardada.
Puedes verificarlo directo en la base:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM citas;"
```

### 6. WhatsApp y reporte de conversaciones

Igual que en Standard — ver esa sección más abajo si necesitas el detalle
de cómo simular el webhook de Twilio o exportar el log de conversaciones.

## Qué vas a ver si lo levantas *tal cual está ahora* (sin tocar nada)

Con una API key real de IA y `DATABASE_URL` apuntando a un Postgres con
las tablas migradas (pasos de arriba), tal cual está el repo vas a poder:

- Chatear normalmente usando la FAQ de ejemplo (panadería).
- Preguntar por `PED-1001` o `PED-1002` y recibir el estatus real
  guardado en la base (no inventado).
- Pedir agendar una cita y ver que el bot **no la agenda de inmediato**:
  primero resume y pide confirmación; solo la guarda en Postgres después
  de que confirmas explícitamente en un mensaje siguiente.
- Todo lo de Standard sigue igual: RAG sobre `documentos/`, WhatsApp (si
  configuras Twilio), multi-idioma, y el log/export de conversaciones.

**Si `DATABASE_URL` está vacío o Postgres no está disponible**, el
servidor arranca igual (con una advertencia en el log) y el bot sigue
respondiendo con la FAQ/RAG normalmente — simplemente no podrá agendar
citas ni consultar pedidos hasta que se configure.

**Si las API keys de IA están vacías/inválidas**, como en los niveles
anteriores, el chat responde siempre el mensaje de error genérico en vez
de romper el servidor.
