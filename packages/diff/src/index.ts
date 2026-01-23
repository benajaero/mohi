import type { PatchOp } from "@mohi/protocol";
import { parseHTML } from "linkedom";

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

export function diffHtml(
  prevHtml: string,
  nextHtml: string,
  rootId = "mohi-root"
): DiffResult {
  if (!prevHtml) {
    return replaceRoot(nextHtml, rootId);
  }

  const prevMap = buildNodeMap(prevHtml);
  const nextMap = buildNodeMap(nextHtml);

  if (!hasSameKeys(prevMap, nextMap)) {
    return replaceRoot(nextHtml, rootId);
  }

  const ops: PatchOp[] = [];

  for (const [id, nextNode] of nextMap.entries()) {
    const prevNode = prevMap.get(id);
    if (!prevNode) continue;

    const prevText = prevNode.textContent ?? "";
    const nextText = nextNode.textContent ?? "";
    if (prevText !== nextText) {
      ops.push({ op: "setText", id, value: nextText });
    }

    const attrOps = diffAttributes(prevNode, nextNode, id);
    ops.push(...attrOps);
  }

  if (ops.length === 0) {
    return { ops: [] };
  }

  return { ops };
}

function buildNodeMap(html: string): Map<string, Element> {
  const { document } = parseHTML(html);
  const nodes = document.querySelectorAll("[data-mohi-id]");
  const map = new Map<string, Element>();
  nodes.forEach((node) => {
    const id = node.getAttribute("data-mohi-id");
    if (id) map.set(id, node);
  });
  return map;
}

function hasSameKeys(
  left: Map<string, Element>,
  right: Map<string, Element>
): boolean {
  if (left.size !== right.size) return false;
  for (const key of left.keys()) {
    if (!right.has(key)) return false;
  }
  return true;
}

function diffAttributes(prevNode: Element, nextNode: Element, id: string): PatchOp[] {
  const ops: PatchOp[] = [];
  const prevAttrs = new Map<string, string>();
  for (const attr of Array.from(prevNode.attributes)) {
    prevAttrs.set(attr.name, attr.value);
  }

  const nextAttrs = new Map<string, string>();
  for (const attr of Array.from(nextNode.attributes)) {
    nextAttrs.set(attr.name, attr.value);
  }

  for (const [name, value] of nextAttrs.entries()) {
    if (name === "data-mohi-id") continue;
    if (prevAttrs.get(name) !== value) {
      ops.push({ op: "setAttr", id, name, value });
    }
  }

  for (const [name] of prevAttrs.entries()) {
    if (name === "data-mohi-id") continue;
    if (!nextAttrs.has(name)) {
      ops.push({ op: "removeAttr", id, name });
    }
  }

  return ops;
}
