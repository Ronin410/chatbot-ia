/**
 * Widget de chat embebible — Nivel Basic.
 *
 * Uso en cualquier sitio:
 * <script
 *   src="https://TU-DOMINIO/widget/chatbot.js"
 *   data-api-url="https://TU-DOMINIO/chat"
 *   data-title="Nombre del negocio"
 *   data-greeting="¡Hola! ¿En qué puedo ayudarte?"
 *   data-color="#2563eb"
 *   async
 * ></script>
 *
 * Sin dependencias ni frameworks. Mantiene el historial corto de la
 * conversación en memoria del navegador (no hay persistencia entre
 * sesiones, según alcance de Basic).
 */
(function () {
  "use strict";

  var currentScript = document.currentScript;
  var config = {
    apiUrl: currentScript.getAttribute("data-api-url") || "/chat",
    title: currentScript.getAttribute("data-title") || "Asistente virtual",
    greeting: currentScript.getAttribute("data-greeting") || "¡Hola! ¿En qué puedo ayudarte?",
    color: currentScript.getAttribute("data-color") || "#2563eb",
  };

  var MAX_HISTORY = 10;
  var history = [];

  injectStyles();
  var widget = buildWidget();
  document.body.appendChild(widget.root);
  appendMessage(widget.messages, config.greeting, "bot");

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      ".cbw-root{position:fixed;bottom:20px;right:20px;z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
      ".cbw-bubble{width:56px;height:56px;border-radius:50%;background:" + config.color + ";color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2);font-size:24px}" +
      ".cbw-window{display:none;flex-direction:column;width:320px;max-width:90vw;height:440px;max-height:70vh;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);overflow:hidden;position:absolute;bottom:70px;right:0}" +
      ".cbw-window.cbw-open{display:flex}" +
      ".cbw-header{background:" + config.color + ";color:#fff;padding:12px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center}" +
      ".cbw-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1}" +
      ".cbw-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f7f8}" +
      ".cbw-msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap}" +
      ".cbw-msg-user{align-self:flex-end;background:" + config.color + ";color:#fff;border-bottom-right-radius:4px}" +
      ".cbw-msg-bot{align-self:flex-start;background:#e9e9eb;color:#111;border-bottom-left-radius:4px}" +
      ".cbw-form{display:flex;border-top:1px solid #e5e5e5;padding:8px;gap:8px}" +
      ".cbw-input{flex:1;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:14px}" +
      ".cbw-send{background:" + config.color + ";color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:14px;cursor:pointer}" +
      ".cbw-send:disabled{opacity:.6;cursor:default}";
    document.head.appendChild(style);
  }

  function buildWidget() {
    var root = document.createElement("div");
    root.className = "cbw-root";

    var bubble = document.createElement("button");
    bubble.className = "cbw-bubble";
    bubble.setAttribute("aria-label", "Abrir chat");
    bubble.textContent = "💬";

    var win = document.createElement("div");
    win.className = "cbw-window";

    var header = document.createElement("div");
    header.className = "cbw-header";
    var titleEl = document.createElement("span");
    titleEl.textContent = config.title;
    var closeBtn = document.createElement("button");
    closeBtn.className = "cbw-close";
    closeBtn.setAttribute("aria-label", "Cerrar chat");
    closeBtn.textContent = "✕";
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    var messages = document.createElement("div");
    messages.className = "cbw-messages";

    var form = document.createElement("form");
    form.className = "cbw-form";
    var input = document.createElement("input");
    input.className = "cbw-input";
    input.type = "text";
    input.placeholder = "Escribe tu mensaje...";
    input.autocomplete = "off";
    var sendBtn = document.createElement("button");
    sendBtn.className = "cbw-send";
    sendBtn.type = "submit";
    sendBtn.textContent = "Enviar";
    form.appendChild(input);
    form.appendChild(sendBtn);

    win.appendChild(header);
    win.appendChild(messages);
    win.appendChild(form);
    root.appendChild(win);
    root.appendChild(bubble);

    bubble.addEventListener("click", function () {
      win.classList.toggle("cbw-open");
      if (win.classList.contains("cbw-open")) input.focus();
    });
    closeBtn.addEventListener("click", function () {
      win.classList.remove("cbw-open");
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      handleUserMessage(text, messages, input, sendBtn);
    });

    return { root: root, messages: messages, input: input, sendBtn: sendBtn };
  }

  function handleUserMessage(text, messagesEl, inputEl, sendBtn) {
    appendMessage(messagesEl, text, "user");
    history.push({ role: "user", content: text });
    trimHistory();

    inputEl.disabled = true;
    sendBtn.disabled = true;
    var typingEl = appendMessage(messagesEl, "Escribiendo...", "bot");

    fetch(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history }),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        typingEl.remove();
        var reply = (data && data.reply) || "Lo siento, no pude procesar tu mensaje.";
        appendMessage(messagesEl, reply, "bot");
        history.push({ role: "assistant", content: reply });
        trimHistory();
      })
      .catch(function () {
        typingEl.remove();
        appendMessage(messagesEl, "No pude conectar con el asistente. Intenta de nuevo en un momento.", "bot");
      })
      .finally(function () {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  function trimHistory() {
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }
  }

  function appendMessage(container, text, sender) {
    var el = document.createElement("div");
    el.className = "cbw-msg " + (sender === "user" ? "cbw-msg-user" : "cbw-msg-bot");
    el.textContent = text;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }
})();
