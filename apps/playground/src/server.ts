import http from "node:http";
import { WebSocketServer } from "ws";
import {
  createEnvelope,
  decodeMessage,
  encodeMessage,
  PROTOCOL_VERSION,
  type AnyMessage,
  type MessageFormat
} from "@mohi/protocol";
import { LivePage, LiveSession } from "@mohi/runtime";

class CounterPage extends LivePage<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  render(): string {
    return `
      <main data-mohi-id="mohi-root">
        <div data-mohi-id="title" style="font-size: clamp(56px, 12vw, 96px); font-weight: 700; line-height: 1; background: linear-gradient(135deg, var(--accent), var(--accent-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 24px;">${this.state.count}</div>
        <button data-mohi-id="btn" data-mohi-action="increment" class="btn">
          Increment
        </button>
      </main>
    `;
  }

  increment(): void {
    this.state.count += 1;
  }
}

const sseSessions = new Map<
  string,
  {
    session: LiveSession;
    queue: string[];
    inFlight: number;
    res: http.ServerResponse;
  }
>();

const server = http.createServer(async (req, res) => {
  if (req.url === "/") {
    const html = renderHtml();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.url === "/mohi/sse") {
    const sessionId = crypto.randomUUID();
    const page = new CounterPage();
    const session = new LiveSession(page, { id: sessionId, route: "/" });
    session.setInitialHtml(page.render());

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });

    sseSessions.set(sessionId, {
      session,
      queue: [],
      inFlight: 0,
      res
    });

    session.setPatchHandler((result) => {
      const message = createEnvelope("patch", sessionId, nextSeq(), result.patch) as AnyMessage;
      enqueueSse(sessionId, message);
    });

    const hello = createEnvelope("hello", sessionId, nextSeq(), {
      capabilities: ["patch.v1", "event.v1"],
      compression: []
    }) as AnyMessage;
    sendSse(res, "hello", hello);

    req.on("close", () => {
      sseSessions.delete(sessionId);
    });

    return;
  }

  if (req.url === "/mohi/event" && req.method === "POST") {
    const body = await readBody(req);
    if (!body) {
      res.writeHead(400);
      res.end("Missing body");
      return;
    }
    const parsed = JSON.parse(body) as AnyMessage;
    const session = parsed.sid ? sseSessions.get(parsed.sid) : undefined;
    if (!session) {
      res.writeHead(404);
      res.end("Unknown session");
      return;
    }
    if (parsed.type === "event") {
      session.session.enqueue({ ...parsed.data, seq: parsed.seq });
    } else if (parsed.type === "ack") {
      session.inFlight = Math.max(0, session.inFlight - 1);
      flushSse(session);
    }
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ server, path: "/mohi" });

wss.on("connection", (socket) => {
  const sessionId = crypto.randomUUID();
  const page = new CounterPage();
  const session = new LiveSession(page, { id: sessionId, route: "/" });
  session.setInitialHtml(page.render());
  let serverSeq = 0;
  const patchQueue: Array<string | Uint8Array> = [];
  let inFlight = 0;
  const maxInFlight = 5;
  let format: MessageFormat = "json";

  session.setPatchHandler((result) => {
    const message = createEnvelope("patch", sessionId, ++serverSeq, result.patch) as AnyMessage;
    const payload = encodeMessage(message, format);
    enqueuePatch(payload);
  });

  socket.on("message", async (data) => {
    const parsed = decodeMessage(data as Buffer) as AnyMessage;

    if (parsed.type === "hello") {
      format = parsed.data.format ?? "json";
      const reply = createEnvelope("hello", sessionId, ++serverSeq, {
        capabilities: ["patch.v1", "event.v1"],
        compression: []
      }) as AnyMessage;
      socket.send(encodeMessage(reply, format));
      return;
    }

    if (parsed.type === "event") {
      session.enqueue({ ...parsed.data, seq: parsed.seq });
      return;
    }

    if (parsed.type === "ack") {
      inFlight = Math.max(0, inFlight - 1);
      flushQueue();
      return;
    }
  });

  function enqueuePatch(payload: string | Uint8Array): void {
    patchQueue.push(payload);
    flushQueue();
  }

  function flushQueue(): void {
    while (inFlight < maxInFlight && patchQueue.length > 0) {
      const payload = patchQueue.shift();
      if (!payload) return;
      socket.send(payload);
      inFlight += 1;
    }
  }
});

server.listen(3000, () => {
  console.log("Mohi playground running on http://localhost:3000");
});

function renderHtml(): string {
  const page = new CounterPage();
  const body = page.render();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mohi Playground</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #0e1116;
        --bg-soft: #141a22;
        --bg-surface: #1a2230;
        --ink: #e8eefc;
        --muted: #9aa7bf;
        --accent: #7cf3c2;
        --accent-2: #5ab0ff;
        --border: #263042;
        --success: #7cf3c2;
        --warning: #ffc878;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Space Grotesk", system-ui, -apple-system, sans-serif;
        color: var(--ink);
        background: var(--bg);
        min-height: 100vh;
        overflow-x: hidden;
      }
      .bg {
        position: fixed;
        inset: 0;
        background:
          radial-gradient(circle at 20% 20%, rgba(124, 243, 194, 0.15), transparent 45%),
          radial-gradient(circle at 80% 10%, rgba(90, 176, 255, 0.18), transparent 40%),
          radial-gradient(circle at 80% 80%, rgba(255, 200, 120, 0.1), transparent 45%),
          linear-gradient(160deg, #0e1116 10%, #0b0f14 90%);
        z-index: -1;
      }
      .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 48px 24px;
        display: grid;
        gap: 32px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand__logo {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: 18px;
        color: var(--bg);
      }
      .brand__title {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.02em;
      }
      .brand__version {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border: 1px solid var(--border);
        padding: 2px 8px;
        border-radius: 999px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--muted);
        border: 1px solid var(--border);
        padding: 6px 14px;
        border-radius: 999px;
        background: var(--bg-soft);
      }
      .status__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--muted);
        transition: background 0.3s ease;
      }
      .status__dot--connected { background: var(--success); box-shadow: 0 0 8px var(--success); }
      .status__dot--disconnected { background: #ff6b6b; }
      .demo {
        display: grid;
        gap: 24px;
      }
      .demo__card {
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--bg-soft);
        padding: 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .demo__card::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 20px;
        padding: 1px;
        background: linear-gradient(135deg, rgba(124,243,194,0.2), rgba(90,176,255,0.15), transparent 60%);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
      }
      .demo__label {
        font-size: 13px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 24px;
      }
      .counter {
        font-size: clamp(56px, 12vw, 96px);
        font-weight: 700;
        line-height: 1;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: inline-block;
      }
      .counter--bump { transform: scale(1.15); }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 28px;
        border-radius: 999px;
        background: var(--accent);
        color: var(--bg);
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        margin-top: 24px;
        font-family: inherit;
      }
      .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(124, 243, 194, 0.25); }
      .btn:active { transform: translateY(0) scale(0.97); }
      .panel {
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--bg-soft);
        overflow: hidden;
      }
      .panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        background: rgba(20, 26, 34, 0.5);
      }
      .panel__title {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        margin: 0;
      }
      .panel__badge {
        font-size: 11px;
        color: var(--accent);
        background: rgba(124, 243, 194, 0.1);
        padding: 2px 8px;
        border-radius: 999px;
        font-family: "JetBrains Mono", monospace;
      }
      .panel__body {
        padding: 16px 20px;
        max-height: 300px;
        overflow-y: auto;
        font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.6;
      }
      .patch {
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
        animation: slideIn 0.3s ease;
      }
      .patch:last-child { border-bottom: none; }
      .patch__time {
        color: var(--muted);
        font-size: 11px;
      }
      .patch__op {
        color: var(--accent-2);
      }
      .patch__id {
        color: var(--warning);
      }
      .patch__html {
        color: var(--accent);
        white-space: pre-wrap;
        word-break: break-word;
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .footer {
        text-align: center;
        color: var(--muted);
        font-size: 13px;
        padding-top: 16px;
      }
      .footer a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 500;
      }
      @media (max-width: 600px) {
        .container { padding: 24px 16px; }
        .demo__card { padding: 28px 20px; }
        .header { flex-direction: column; align-items: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="bg"></div>
    <div class="container">
      <header class="header">
        <div class="brand">
          <div class="brand__logo">M</div>
          <h1 class="brand__title">Mohi</h1>
          <span class="brand__version">Pre-alpha</span>
        </div>
        <div class="status" id="connStatus">
          <span class="status__dot" id="connDot"></span>
          <span id="connText">Connecting...</span>
        </div>
      </header>

      <main class="demo">
        <div class="demo__card">
          <div class="demo__label">Live Counter Demo</div>
          ${body}
        </div>

        <div class="panel">
          <div class="panel__header">
            <h2 class="panel__title">Patch Stream</h2>
            <span class="panel__badge" id="patchCount">0 patches</span>
          </div>
          <div class="panel__body" id="patchLog">
            <div style="color: var(--muted);">Waiting for first patch...</div>
          </div>
        </div>
      </main>

      <footer class="footer">
        <a href="https://github.com/benajaero/mohi">github.com/benajaero/mohi</a>
        &middot; Standards-first, server-driven UI
      </footer>
    </div>

    <script type="module">
      const rootId = "mohi-root";
      const ws = new WebSocket("ws://" + location.host + "/mohi");
      let clientSeq = 0;
      let sessionId = "";
      let patchCount = 0;

      const connDot = document.getElementById("connDot");
      const connText = document.getElementById("connText");
      const patchLog = document.getElementById("patchLog");
      const patchCountEl = document.getElementById("patchCount");

      function setStatus(connected) {
        connDot.className = "status__dot" + (connected ? " status__dot--connected" : " status__dot--disconnected");
        connText.textContent = connected ? "Live Session Active" : "Disconnected";
      }

      function logPatch(ops) {
        if (patchCount === 0) patchLog.innerHTML = "";
        patchCount += ops.length;
        patchCountEl.textContent = patchCount + " patch" + (patchCount !== 1 ? "es" : "");

        for (const op of ops) {
          const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });
          const entry = document.createElement("div");
          entry.className = "patch";
          entry.innerHTML = '<span class="patch__time">' + time + '</span> <span class="patch__op">' + (op.op || "unknown") + '</span> <span class="patch__id">id=' + (op.id || "?") + '</span>' +
            (op.html ? '<div class="patch__html">' + escapeHtml(op.html.trim()).substring(0, 200) + (op.html.length > 200 ? "..." : "") + '</div>' : "");
          patchLog.prepend(entry);
        }

        while (patchLog.children.length > 50) {
          patchLog.removeChild(patchLog.lastChild);
        }
      }

      function escapeHtml(str) {
        return str.replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
      }

      ws.addEventListener("open", () => {
        setStatus(true);
        ws.send(JSON.stringify({
          v: ${PROTOCOL_VERSION},
          type: "hello",
          sid: "",
          seq: clientSeq,
          ts: Date.now(),
          data: { capabilities: ["patch.v1", "event.v1"] }
        }));
      });

      ws.addEventListener("close", () => setStatus(false));
      ws.addEventListener("error", () => setStatus(false));

      ws.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "hello") {
          sessionId = message.sid;
          return;
        }
        if (message.type === "patch") {
          logPatch(message.data.ops || []);
          applyPatch(message.data.ops);
          ws.send(JSON.stringify({
            v: ${PROTOCOL_VERSION},
            type: "ack",
            sid: sessionId,
            seq: clientSeq,
            ts: Date.now(),
            data: { received: message.seq }
          }));
        }
      });

      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const actionEl = target.closest("[data-mohi-action]");
        if (!actionEl) return;
        const action = actionEl.getAttribute("data-mohi-action");
        if (!action) return;

        clientSeq += 1;
        ws.send(JSON.stringify({
          v: ${PROTOCOL_VERSION},
          type: "event",
          sid: sessionId,
          seq: clientSeq,
          ts: Date.now(),
          data: {
            target: actionEl.getAttribute("data-mohi-id") || rootId,
            action,
            payload: null,
            context: { route: "/" }
          }
        }));
      });

      function applyPatch(ops) {
        for (const op of ops) {
          if (op.op === "replace") {
            const node = document.querySelector("[data-mohi-id=\"" + op.id + "\"]");
            if (!node) continue;
            const template = document.createElement("template");
            template.innerHTML = op.html.trim();
            const fragment = template.content;
            node.replaceWith(fragment);

            const counterEl = document.querySelector("[data-mohi-id='btn']");
            if (counterEl) {
              counterEl.classList.add("counter--bump");
              setTimeout(() => counterEl.classList.remove("counter--bump"), 200);
            }
          }
        }
      }
    </script>
  </body>
</html>`;
}

let sseSeq = 0;

function nextSeq(): number {
  sseSeq += 1;
  return sseSeq;
}

function sendSse(res: http.ServerResponse, event: string, payload: AnyMessage): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function enqueueSse(sessionId: string, message: AnyMessage): void {
  const entry = sseSessions.get(sessionId);
  if (!entry) return;
  entry.queue.push(JSON.stringify(message));
  flushSse(entry);
}

function flushSse(entry: { queue: string[]; inFlight: number; res: http.ServerResponse }): void {
  const maxInFlight = 5;
  while (entry.inFlight < maxInFlight && entry.queue.length > 0) {
    const payload = entry.queue.shift();
    if (!payload) return;
    entry.res.write(`event: patch\n`);
    entry.res.write(`data: ${payload}\n\n`);
    entry.inFlight += 1;
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
  });
}
