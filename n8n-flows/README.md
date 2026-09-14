# n8n-flows

Carpeta para exportar flujos de n8n (`.json`) cuando se use n8n como
orquestador de mensajería (por ejemplo, para enrutar WhatsApp → `/chat` →
respuesta en Standard/Premium).

No usado en el nivel Basic (el endpoint `/chat` se llama directamente desde
el widget web). Al exportar un flujo desde n8n ("Download"), guarda el JSON
aquí con un nombre descriptivo, por ejemplo:

```
n8n-flows/whatsapp-to-chat.json
```
