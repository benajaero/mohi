import type { PatchOp } from "@mohi/protocol";

export interface DiffResult {
  ops: PatchOp[];
}

export function replaceRoot(html: string, rootId = "mohi-root"): DiffResult {
  return {
    ops: [
      {
        op: "replace",
        id: rootId,
        html
      }
    ]
  };
}
