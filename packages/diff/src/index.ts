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

  const prevTree = buildTree(prevHtml);
  const nextTree = buildTree(nextHtml);

  if (!prevTree.map.has(rootId) || !nextTree.map.has(rootId)) {
    return replaceRoot(nextHtml, rootId);
  }

  if (hasParentChanges(prevTree, nextTree)) {
    return replaceRoot(nextHtml, rootId);
  }

  const ops: PatchOp[] = [];

  for (const [id] of prevTree.map.entries()) {
    if (!nextTree.map.has(id)) {
      ops.push({ op: "remove", id });
    }
  }

  for (const [id, nextInfo] of nextTree.map.entries()) {
    if (prevTree.map.has(id)) continue;
    if (!nextInfo.parentId) {
      return replaceRoot(nextHtml, rootId);
    }
    if (!prevTree.map.has(nextInfo.parentId)) {
      return replaceRoot(nextHtml, rootId);
    }
    ops.push({
      op: "insert",
      id,
      parent: nextInfo.parentId,
      index: nextInfo.index,
      html: nextInfo.outerHTML
    });
  }

  for (const [id, nextInfo] of nextTree.map.entries()) {
    const prevInfo = prevTree.map.get(id);
    if (!prevInfo) continue;

    const prevText = prevInfo.node.textContent ?? "";
    const nextText = nextInfo.node.textContent ?? "";
    if (prevText !== nextText) {
      ops.push({ op: "setText", id, value: nextText });
    }

    const attrOps = diffAttributes(prevInfo.node, nextInfo.node, id);
    ops.push(...attrOps);
  }

  for (const [parentId, nextChildren] of nextTree.children.entries()) {
    const prevChildren = prevTree.children.get(parentId);
    if (!prevChildren) continue;
    if (arraysEqual(prevChildren, nextChildren)) continue;

    for (const childId of nextChildren) {
      if (!prevTree.map.has(childId)) continue;
      const prevIndex = prevChildren.indexOf(childId);
      const nextIndex = nextChildren.indexOf(childId);
      if (prevIndex !== nextIndex) {
        ops.push({
          op: "move",
          id: childId,
          parent: parentId,
          index: nextIndex
        });
      }
    }
  }

  if (ops.length === 0) {
    return { ops: [] };
  }

  return { ops };
}

interface NodeInfo {
  id: string;
  parentId?: string;
  index: number;
  node: Element;
  outerHTML: string;
}

interface TreeInfo {
  map: Map<string, NodeInfo>;
  children: Map<string, string[]>;
}

function buildTree(html: string): TreeInfo {
  const { document } = parseHTML(html);
  const nodes = document.querySelectorAll("[data-mohi-id]");
  const map = new Map<string, NodeInfo>();
  const children = new Map<string, string[]>();

  nodes.forEach((node) => {
    const id = node.getAttribute("data-mohi-id");
    if (!id) return;
    const parent = node.parentElement?.closest("[data-mohi-id]");
    const parentId = parent ? parent.getAttribute("data-mohi-id") ?? undefined : undefined;
    const parentChildren = parentId ? children.get(parentId) ?? [] : [];
    const index = parentId ? parentChildren.length : 0;

    map.set(id, {
      id,
      parentId,
      index,
      node,
      outerHTML: node.outerHTML
    });

    if (parentId) {
      parentChildren.push(id);
      children.set(parentId, parentChildren);
    }
  });

  return { map, children };
}

function hasParentChanges(prevTree: TreeInfo, nextTree: TreeInfo): boolean {
  for (const [id, nextInfo] of nextTree.map.entries()) {
    const prevInfo = prevTree.map.get(id);
    if (!prevInfo) continue;
    if (prevInfo.parentId !== nextInfo.parentId) {
      return true;
    }
  }
  return false;
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

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
