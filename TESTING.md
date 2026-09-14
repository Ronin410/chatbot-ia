# Cómo levantar el proyecto en local para pruebas

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

Levanta el servidor:

```bash
npm run dev
```

Verás:

```
Chatbot IA (basic) escuchando en http://localhost:3000
Widget de prueba: http://localhost:3000/widget/
```

---

## Opción B — Docker

Requisitos: Docker (y Docker Compose, incluido en el Docker Desktop
actual).

```bash
cp .env.example .env
# completa OPENAI_API_KEY o ANTHROPIC_API_KEY en .env, igual que arriba
docker compose up --build
```

Esto construye la imagen (compila TypeScript dentro del contenedor) y
levanta el contenedor en el puerto 3000. `docker-compose.yml` monta tu
`src/config/business-config.json` local dentro del contenedor, así que
puedes editar la FAQ/tono del negocio y solo necesitas reiniciar el
contenedor (`docker compose restart`) para verlo reflejado, sin
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
{ "status": "ok", "business": "Panadería Dulce Aroma", "level": "basic" }
```

### 2. El widget de chat embebido

Abre `widget/index.html` directamente en el navegador (doble clic, o
`open widget/index.html` / `start widget/index.html`). Es una página de
ejemplo del "sitio del cliente" con el widget embebido vía
`<script src="./chatbot.js" data-api-url="http://localhost:3000/chat" ...>`.
Haz clic en la burbuja de chat (abajo a la derecha) y escribe un mensaje.

También puedes abrir `http://localhost:3000/widget/` para ver el widget
servido por el propio backend (mismo archivo `chatbot.js`).

### 3. El endpoint `/chat` directamente

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Hacen envíos a domicilio?", "history": []}'
```

```json
{ "reply": "Sí, hacemos envíos dentro de la ciudad con un costo fijo de $3..." }
```

## Qué vas a ver si lo levantas *tal cual está ahora* (sin tocar nada)

El repo trae datos de ejemplo de una panadería ficticia
(`src/config/business-config.json`), así que **sin cambiar ningún
archivo** — solo completando una API key real en `.env` — vas a tener un
chatbot funcional que:

- Responde en español, con el tono "cálido y cercano" configurado.
- Contesta correctamente las 10 preguntas de la FAQ de ejemplo (horario,
  envíos, métodos de pago, productos sin gluten, ubicación, etc.).
- Si le preguntas algo fuera de esa FAQ (p. ej. "¿cuál es la capital de
  Francia?"), responde con el mensaje de fallback configurado: *"No
  tengo esa información en este momento. ¿Quieres que te contacte
  alguien del equipo?"* — no inventa datos.
- No recuerda la conversación si recargas la página (Basic no tiene
  memoria persistente entre sesiones; el historial vive solo mientras el
  widget está abierto en el navegador).

**Si dejas la API key vacía o inválida** (por ejemplo, para probar sin
gastar créditos), el chat sigue funcionando en el sentido de que
responde siempre — pero con el mensaje de error genérico configurado
("Estamos teniendo un problema técnico...") en vez de una respuesta real,
porque la llamada al modelo falla y el `try/catch` del backend cae al
fallback en lugar de romper el servidor.

Para probarlo con **tu propio negocio** en vez del ejemplo de la
panadería, edita `src/config/business-config.json` (nombre, tono, FAQ) y
reinicia el servidor — no hace falta tocar código.

WhatsApp, RAG sobre documentos y function calling (Standard/Premium) no
están implementados todavía en este scaffold — ver `README.md` para el
detalle de qué falta activar en cada nivel.
