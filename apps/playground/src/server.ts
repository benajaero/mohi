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

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    const html = renderHtml();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
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

  session.setPatchHandler((result) => {
    const message = createEnvelope("patch", sessionId, ++serverSeq, result.patch);
    socket.send(JSON.stringify(message));
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
  });
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
