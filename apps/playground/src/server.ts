import http from "node:http";
import { WebSocketServer } from "ws";
import { createEnvelope, PROTOCOL_VERSION, type AnyMessage } from "@mohi/protocol";
import { LivePage, LiveSession } from "@mohi/runtime";

class CounterPage extends LivePage<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  render(): string {
    return `
      <main data-mohi-id="mohi-root">
        <h1 data-mohi-id="title">Mohi Playground</h1>
        <button data-mohi-id="btn" data-mohi-action="increment">
          Count: ${this.state.count}
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
      const message = createEnvelope("patch", sessionId, nextSeq(), result.patch);
      enqueueSse(sessionId, message);
    });

    const hello = createEnvelope("hello", sessionId, nextSeq(), {
      capabilities: ["patch.v1", "event.v1"],
      compression: []
    });
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
  const patchQueue: string[] = [];
  let inFlight = 0;
  const maxInFlight = 5;

  session.setPatchHandler((result) => {
    const message = createEnvelope("patch", sessionId, ++serverSeq, result.patch);
    enqueuePatch(JSON.stringify(message));
  });

  socket.on("message", async (data) => {
    const parsed = JSON.parse(data.toString()) as AnyMessage;

    if (parsed.type === "hello") {
      const reply = createEnvelope("hello", sessionId, ++serverSeq, {
        capabilities: ["patch.v1", "event.v1"],
        compression: []
      });
      socket.send(JSON.stringify(reply));
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

  function enqueuePatch(payload: string): void {
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
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mohi Playground</title>
  </head>
  <body>
    ${body}
    <script type="module">
      const rootId = "mohi-root";
      const ws = new WebSocket(\"ws://\" + location.host + \"/mohi\");
      let clientSeq = 0;
      let sessionId = "";

      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({
          v: ${PROTOCOL_VERSION},
          type: "hello",
          sid: "",
          seq: clientSeq,
          ts: Date.now(),
          data: { capabilities: ["patch.v1", "event.v1"] }
        }));
      });

      ws.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "hello") {
          sessionId = message.sid;
          return;
        }
        if (message.type === "patch") {
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
            const node = document.querySelector(\"[data-mohi-id=\\\"\" + op.id + \"\\\"]\");
            if (!node) continue;
            const template = document.createElement("template");
            template.innerHTML = op.html.trim();
            const fragment = template.content;
            node.replaceWith(fragment);
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
