# Guía de mantenimiento — soporte post-entrega (15 días, nivel Premium)

Esta guía es para ti (quien entrega el pedido) durante los 15 días de
soporte incluidos en Premium, y también sirve como referencia para
dejarle al cliente si va a tocar algo por su cuenta (editar la FAQ, por
ejemplo).

## 1. Qué revisar si el cliente reporta un problema

### El bot no responde / responde con el mensaje de error genérico
1. Revisa los logs del proceso (`docker compose logs -f chatbot` o la
   salida de `npm start`/`npm run dev`).
2. Causas más comunes:
   - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` vencida, sin crédito, o mal
     copiada en `.env`.
   - Timeout de la API del proveedor (15s por defecto, ver
     `src/ai/openaiClient.ts` / `anthropicClient.ts`) — si el proveedor
     está lento, considera subir `timeoutMs`.
   - Si acaba de fallar justo después de un despliegue: revisa que
     `docker compose up --build` haya reconstruido la imagen.

### El bot "no sabe" algo que debería saber (FAQ)
- Revisa `src/config/business-config.json` → el campo `faq`. Cada entrada
  es `{ "question": "...", "answer": "..." }`. Agregar/editar no requiere
  tocar código, solo reiniciar el servidor (o `docker compose restart`
  si usas el volumen que monta `business-config.json`).

### El bot "no sabe" algo que está en un documento (RAG)
1. Confirma que el documento se indexó: `npm run rag:index -- ruta/al/doc.pdf`.
2. Revisa que exista `data/rag-index.json` (o la ruta de `RAG_STORE_PATH`)
   y no esté vacío.
3. Si el documento cambió, vuelve a correr `npm run rag:index` con el
   mismo archivo — reemplaza los chunks de ese documento (no duplica).
4. Recuerda: RAG siempre requiere `OPENAI_API_KEY` configurado (los
   embeddings son de OpenAI aunque el chat use Anthropic).

### WhatsApp no llegan/salen mensajes
1. Verifica en la consola de Twilio que el webhook siga apuntando a
   `https://TU-DOMINIO/webhooks/whatsapp` y que el servidor esté accesible
   públicamente (no localhost).
2. Revisa `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER`
   en `.env`.
3. Si Twilio muestra error 401/403 al enviar: credenciales inválidas o el
   número de WhatsApp no está habilitado/aprobado todavía.

### Una acción (crear_cita / consultar_pedido) falla
1. Confirma que `DATABASE_URL` esté configurado y la base accesible: al
   arrancar, el log debe decir `Acciones Premium activas: crear_cita, consultar_pedido`.
   Si en vez de eso ves una advertencia `[actions] No se pudieron
   inicializar...`, el problema es de conexión/credenciales a Postgres.
2. Confirma que el esquema esté aplicado: `npm run db:migrate` (o
   `docker compose exec chatbot node dist/db/postgres/migrate.js` si
   corres con Docker) — es seguro correrlo de nuevo, usa `CREATE TABLE IF
   NOT EXISTS`.
3. Revisa los logs: cada error de ejecución de una acción se imprime como
   `[chatEngine] Error ejecutando la acción "...":`.

## 2. Cómo actualizar el FAQ o los documentos del negocio

1. Edita `src/config/business-config.json` para preguntas/respuestas
   cortas, tono, o el mensaje de fallback/error.
2. Para información más extensa (catálogos, políticas, manuales), agrega
   o reemplaza el archivo en `documentos/` y vuelve a indexarlo:
   ```bash
   npm run rag:index -- documentos/nombre-del-archivo.pdf
   ```
3. Reinicia el servidor (`docker compose restart` o relanza el proceso).
   No hace falta reconstruir la imagen de Docker solo por estos cambios
   si usas el volumen de `business-config.json`/`data/` definido en
   `docker-compose.yml`.

## 3. Cómo revisar el historial de conversaciones

```bash
curl "https://TU-DOMINIO/admin/conversations/export?format=csv" \
  -H "x-admin-token: TU_ADMIN_TOKEN"
```

Útil para ver qué preguntas hace la gente que el bot no supo responder
(mensajes que coinciden con `fallbackMessage`) y así detectar qué falta
agregar a la FAQ o a los documentos indexados.

## 4. Cómo ve el dueño sus citas y pedidos

El dueño del negocio (o quien le dé soporte) no necesita saber SQL: hay
dos endpoints que devuelven la lista lista para abrir en Excel/Sheets —

```bash
curl "https://TU-DOMINIO/admin/citas?format=csv" -H "x-admin-token: TU_ADMIN_TOKEN"
curl "https://TU-DOMINIO/admin/pedidos?format=csv" -H "x-admin-token: TU_ADMIN_TOKEN"
```

(o `?format=json` si lo va a consumir otra herramienta). Es el mismo
`ADMIN_TOKEN` que el export de conversaciones. Si además configuraste
`ownerWhatsapp` en `business-config.json` y el canal de WhatsApp está
activo, el dueño ya recibe un WhatsApp automático cada vez que se
confirma una cita nueva — el endpoint de arriba es para ver el
panorama completo, no solo la última.

Para revisar directamente en la base (depurar, o si necesitas algo que
los endpoints no cubren):

```bash
psql "$DATABASE_URL" -c "SELECT * FROM citas ORDER BY creado_en DESC LIMIT 20;"
psql "$DATABASE_URL" -c "SELECT * FROM pedidos ORDER BY actualizado_en DESC LIMIT 20;"
```

Para actualizar el estatus de un pedido real (por ejemplo, marcarlo como
entregado) mientras no exista un panel propio:

```sql
UPDATE pedidos SET estado = 'entregado', actualizado_en = now() WHERE numero_pedido = 'PED-1001';
```

## 5. Checklist rápido antes de dar por cerrado el soporte de 15 días

- [ ] El cliente sabe cómo editar su propio FAQ (`business-config.json`)
      sin depender de ti para cambios menores.
- [ ] Quedó claro qué credenciales son suyas (Twilio, OpenAI/Anthropic,
      Postgres) y dónde están guardadas — no dejar tus propias claves de
      desarrollo en su entorno productivo.
- [ ] `DATABASE_URL` de producción está respaldado (backup automático del
      proveedor de hosting, o al menos un dump manual reciente).
- [ ] El cliente sabe a quién contactar (tú, u otro canal) si algo falla
      después de que termine el soporte incluido.
