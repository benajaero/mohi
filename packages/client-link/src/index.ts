import {
  createEnvelope,
  type AnyMessage,
  type EventData,
  type PatchOp
} from "@mohi/protocol";

export interface ClientLinkOptions {
  rootId?: string;
  actionAttribute?: string;
  payloadAttribute?: string;
  getContext?: () => Record<string, unknown>;
  onEvent?: (event: EventData) => void;
}

export interface ProtocolClientOptions {
  url: string;
  link: ClientLink;
  capabilities?: string[];
}

export class ClientLink {
  private rootId: string;
  private idMap = new Map<string, Element>();
  private actionAttribute: string;
  private payloadAttribute: string;
  private getContext?: () => Record<string, unknown>;
  private onEvent?: (event: EventData) => void;

  constructor(options: ClientLinkOptions = {}) {
    this.rootId = options.rootId ?? "mohi-root";
    this.actionAttribute = options.actionAttribute ?? "data-mohi-action";
    this.payloadAttribute = options.payloadAttribute ?? "data-mohi-payload";
    this.getContext = options.getContext;
    this.onEvent = options.onEvent;
  }

  hydrateIdMap(): void {
    this.idMap.clear();
    const root = document.querySelector(`[data-mohi-id="${this.rootId}"]`);
    if (!root) {
      throw new Error(`Missing root node ${this.rootId}`);
    }
    this.walk(root);
  }

  applyPatch(ops: PatchOp[]): void {
    for (const op of ops) {
      switch (op.op) {
        case "setText":
          this.setText(op.id, op.value);
          break;
        case "setAttr":
          this.setAttr(op.id, op.name, op.value);
          break;
        case "removeAttr":
          this.removeAttr(op.id, op.name);
          break;
        case "insert":
          this.insert(op.parent, op.index, op.html);
          break;
        case "remove":
          this.remove(op.id);
          break;
        case "replace":
          this.replace(op.id, op.html);
          break;
        case "move":
          this.move(op.id, op.parent, op.index);
          break;
        case "setProps":
          this.setProps(op.id, op.props);
          break;
        default:
          this.assertNever(op);
      }
    }
  }

  bindEvents(root: Document | Element = document): void {
    root.addEventListener("click", (event) => {
      if (!this.onEvent) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const actionEl = target.closest(`[${this.actionAttribute}]`);
      if (!actionEl) return;
      const action = actionEl.getAttribute(this.actionAttribute);
      if (!action) return;
      const eventData = this.buildEvent(actionEl, action);
      this.onEvent(eventData);
    });
  }

  private setText(id: string, value: string): void {
    const node = this.getNode(id);
    node.textContent = value;
  }

  private setAttr(id: string, name: string, value: string): void {
    const node = this.getNode(id);
    node.setAttribute(name, value);
  }

  private removeAttr(id: string, name: string): void {
    const node = this.getNode(id);
    node.removeAttribute(name);
  }

  private insert(parentId: string, index: number, html: string): void {
    const parent = this.getNode(parentId);
    const fragment = this.fragmentFromHtml(html);
    const childNodes = Array.from(parent.childNodes);
    const refNode = childNodes[index] ?? null;
    parent.insertBefore(fragment, refNode);
    this.rebuildIdMap(parent);
  }

  private remove(id: string): void {
    const node = this.getNode(id);
    node.remove();
    this.idMap.delete(id);
  }

  private replace(id: string, html: string): void {
    const node = this.getNode(id);
    const fragment = this.fragmentFromHtml(html);
    const parent = node.parentNode;
    if (!parent) {
      throw new Error(`Cannot replace node without parent: ${id}`);
    }
    parent.replaceChild(fragment, node);
    this.rebuildIdMap(parent);
  }

  private move(id: string, parentId: string, index: number): void {
    const node = this.getNode(id);
    const parent = this.getNode(parentId);
    const childNodes = Array.from(parent.childNodes);
    const refNode = childNodes[index] ?? null;
    parent.insertBefore(node, refNode);
    this.rebuildIdMap(parent);
  }

  private setProps(id: string, props: Record<string, string | null>): void {
    const node = this.getNode(id);
    for (const [name, value] of Object.entries(props)) {
      if (value === null) {
        node.removeAttribute(name);
      } else {
        node.setAttribute(name, value);
      }
    }
  }

  private rebuildIdMap(root: Element | ParentNode): void {
    this.idMap.clear();
    const rootElement = root instanceof Element ? root : root.firstChild;
    if (rootElement instanceof Element) {
      this.walk(rootElement);
    }
  }

  private buildEvent(actionEl: Element, action: string): EventData {
    const payload = this.readPayload(actionEl);
    return {
      target: actionEl.getAttribute("data-mohi-id") ?? this.rootId,
      action,
      payload,
      context: this.getContext ? this.getContext() : undefined
    };
  }

  private readPayload(actionEl: Element): unknown {
    const raw = actionEl.getAttribute(this.payloadAttribute);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private walk(root: Element): void {
    if (root.hasAttribute("data-mohi-id")) {
      const id = root.getAttribute("data-mohi-id");
      if (id) this.idMap.set(id, root);
    }
    for (const child of Array.from(root.children)) {
      this.walk(child);
    }
  }

  private fragmentFromHtml(html: string): DocumentFragment {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content;
  }

  private getNode(id: string): Element {
    const node = this.idMap.get(id) ?? document.querySelector(`[data-mohi-id="${id}"]`);
    if (!node) {
      throw new Error(`Missing node ${id}`);
    }
    this.idMap.set(id, node);
    return node;
  }

  private assertNever(value: never): never {
    throw new Error(`Unknown op ${(value as { op?: string }).op ?? "unknown"}`);
  }
}

export class ProtocolClient {
  private ws?: WebSocket;
  private seq = 0;
  private sid = "";

  constructor(private options: ProtocolClientOptions) {}

  connect(): void {
    const { url } = this.options;
    this.ws = new WebSocket(url);
    this.ws.addEventListener("open", () => {
      this.sendHello();
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as AnyMessage;
      if (message.type === "hello") {
        this.sid = message.sid;
        return;
      }
      if (message.type === "patch") {
        this.options.link.applyPatch(message.data.ops);
      }
    });
  }

  sendEvent(data: EventData): void {
    if (!this.ws) return;
    const message = createEnvelope("event", this.sid, ++this.seq, data);
    this.ws.send(JSON.stringify(message));
  }

  private sendHello(): void {
    if (!this.ws) return;
    const capabilities = this.options.capabilities ?? ["patch.v1", "event.v1"];
    const message = createEnvelope("hello", "", this.seq, { capabilities });
    this.ws.send(JSON.stringify(message));
  }
}
