import { replaceRoot } from "@mohi/diff";
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

export interface SessionResult {
  patch: PatchData;
}

export type PatchHandler = (result: SessionResult) => void | Promise<void>;

export class LiveSession {
  private queue: SessionEvent[] = [];
  private processing = false;
  private onPatch?: PatchHandler;

  constructor(private page: LivePage<Record<string, unknown>>, private ctx: SessionContext) {}

  setPatchHandler(handler: PatchHandler): void {
    this.onPatch = handler;
  }

  enqueue(event: SessionEvent): void {
    this.queue.push(event);
    void this.processQueue();
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

    const patch = replaceRoot(html);

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
