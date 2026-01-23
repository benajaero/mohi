import { diffHtml } from "@mohi/diff";
import type { EventData, PatchData } from "@mohi/protocol";

export type RenderOutput = string;

export abstract class LivePage<TState extends Record<string, unknown>> {
  state: TState;

  constructor(initialState: TState) {
    this.state = initialState;
  }

  abstract render(): RenderOutput;
}

export interface SessionContext {
  id: string;
  route: string;
}

export interface SessionEvent extends EventData {
  seq: number;
}

export interface SessionLogEntry {
  seq: number;
  action: string;
  payload?: unknown;
  stateHash: string;
  ts: number;
}

export interface SessionResult {
  patch: PatchData;
}

export type PatchHandler = (result: SessionResult) => void | Promise<void>;

export class LiveSession {
  private queue: SessionEvent[] = [];
  private processing = false;
  private onPatch?: PatchHandler;
  private eventLog: SessionLogEntry[] = [];
  private lastHtml = "";

  constructor(
    private page: LivePage<Record<string, unknown>>,
    private ctx: SessionContext,
    initialHtml?: string
  ) {
    if (initialHtml) this.lastHtml = initialHtml;
  }

  setPatchHandler(handler: PatchHandler): void {
    this.onPatch = handler;
  }

  enqueue(event: SessionEvent): void {
    this.queue.push(event);
    void this.processQueue();
  }

  getEventLog(): SessionLogEntry[] {
    return [...this.eventLog];
  }

  setInitialHtml(html: string): void {
    this.lastHtml = html;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) continue;
      const result = await this.handleEvent(event);
      if (this.onPatch) {
        await this.onPatch(result);
      }
    }

    this.processing = false;
  }

  private async handleEvent(event: SessionEvent): Promise<SessionResult> {
    const handler = (this.page as unknown as Record<string, unknown>)[event.action];
    if (typeof handler !== "function") {
      throw new Error(`Unknown action: ${event.action}`);
    }

    const renderStart = performance.now();
    await (handler as (payload?: unknown) => void).call(this.page, event.payload);
    const html = this.page.render();
    const renderMs = performance.now() - renderStart;

    const stateHash = hashState(this.page.state);
    this.eventLog.push({
      seq: event.seq,
      action: event.action,
      payload: event.payload,
      stateHash,
      ts: Date.now()
    });

    const patch = diffHtml(this.lastHtml, html);
    this.lastHtml = html;

    return {
      patch: {
        ops: patch.ops,
        metrics: {
          renderMs,
          diffMs: 0,
          sizeBytes: JSON.stringify(patch).length
        }
      }
    };
  }
}

export function renderPage(page: LivePage<Record<string, unknown>>): string {
  return page.render();
}

export function replayEvents<TState extends Record<string, unknown>>(
  pageFactory: () => LivePage<TState>,
  events: SessionEvent[]
): LivePage<TState> {
  const page = pageFactory();
  for (const event of events) {
    const handler = (page as unknown as Record<string, unknown>)[event.action];
    if (typeof handler !== "function") {
      throw new Error(`Unknown action: ${event.action}`);
    }
    (handler as (payload?: unknown) => void).call(page, event.payload);
  }
  return page;
}

function hashState(state: Record<string, unknown>): string {
  const serialized = stableStringify(state);
  return djb2(serialized);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  return `{${entries.join(",")}}`;
}

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
