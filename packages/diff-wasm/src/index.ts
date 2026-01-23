import { diffHtml, type DiffBackend, type DiffResult } from "../../diff/src/index.js";

export interface WasmDiffModule extends DiffBackend {
  ready: boolean;
}

export async function loadWasmDiff(): Promise<WasmDiffModule> {
  return {
    ready: true,
    diffHtml: (prev: string, next: string, rootId?: string): DiffResult =>
      diffHtml(prev, next, rootId)
  };
}
