import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DiffBackend, DiffResult } from "@mohi/diff";
import type { PatchOp } from "@mohi/protocol";

interface WasmModule {
  default: (input?: RequestInfo | URL | Response | BufferSource) => Promise<void>;
  diff_html: (prev: string, next: string, rootId: string) => string;
}

export interface WasmDiffBackend extends DiffBackend {
  ready: boolean;
}

export async function loadWasmBackend(options?: { pkgPath?: string }): Promise<WasmDiffBackend | null> {
  const pkgDir = options?.pkgPath ?? resolvePackageDir();
  const modulePath = resolve(pkgDir, "mohi_diff_wasm.js");
  if (!existsSync(modulePath)) {
    return null;
  }

  const wasmModule = (await import(pathToFileURL(modulePath).href)) as WasmModule;
  const wasmPath = resolve(pkgDir, "mohi_diff_wasm_bg.wasm");
  if (existsSync(wasmPath)) {
    await wasmModule.default(pathToFileURL(wasmPath));
  } else {
    await wasmModule.default();
  }

  const backend = createBackendFromModule(wasmModule);
  return { ...backend, ready: true };
}

export function createBackendFromModule(module: WasmModule): DiffBackend {
  return {
    diffHtml: (prev: string, next: string, rootId = "mohi-root"): DiffResult => {
      const opsJson = module.diff_html(prev, next, rootId);
      const ops = JSON.parse(opsJson) as PatchOp[];
      return { ops };
    }
  };
}

function resolvePackageDir(): string {
  return resolve(process.cwd(), "packages", "diff-wasm-rs", "pkg");
}
