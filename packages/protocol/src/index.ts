export type ProtocolVersion = 1;

export type MessageType =
  | "hello"
  | "event"
  | "patch"
  | "ack"
  | "error"
  | "ping"
  | "pong";

export interface Envelope<T = unknown> {
  v: ProtocolVersion;
  type: MessageType;
  sid: string;
  seq: number;
  ts: number;
  data: T;
}

export interface HelloData {
  capabilities: string[];
  compression?: string[];
  resume?: string;
}

export interface EventData {
  target: string;
  action: string;
  payload?: unknown;
  context?: Record<string, unknown>;
}

export interface PatchData {
  ops: PatchOp[];
  metrics?: PatchMetrics;
}

export interface PatchMetrics {
  renderMs?: number;
  diffMs?: number;
  sizeBytes?: number;
}

export interface AckData {
  received: number;
}

export interface ErrorData {
  message: string;
  code?: string;
  fatal?: boolean;
}

export type PatchOp =
  | SetTextOp
  | SetAttrOp
  | RemoveAttrOp
  | InsertOp
  | RemoveOp
  | ReplaceOp
  | MoveOp
  | SetPropsOp;

export interface SetTextOp {
  op: "setText";
  id: string;
  value: string;
}

export interface SetAttrOp {
  op: "setAttr";
  id: string;
  name: string;
  value: string;
}

export interface RemoveAttrOp {
  op: "removeAttr";
  id: string;
  name: string;
}

export interface InsertOp {
  op: "insert";
  id: string;
  parent: string;
  index: number;
  html: string;
}

export interface RemoveOp {
  op: "remove";
  id: string;
}

export interface ReplaceOp {
  op: "replace";
  id: string;
  html: string;
}

export interface MoveOp {
  op: "move";
  id: string;
  parent: string;
  index: number;
}

export interface SetPropsOp {
  op: "setProps";
  id: string;
  props: Record<string, string | null>;
}

export type HelloMessage = Envelope<HelloData> & { type: "hello" };
export type EventMessage = Envelope<EventData> & { type: "event" };
export type PatchMessage = Envelope<PatchData> & { type: "patch" };
export type AckMessage = Envelope<AckData> & { type: "ack" };
export type ErrorMessage = Envelope<ErrorData> & { type: "error" };
export type PingMessage = Envelope<Record<string, never>> & { type: "ping" };
export type PongMessage = Envelope<Record<string, never>> & { type: "pong" };

export type AnyMessage =
  | HelloMessage
  | EventMessage
  | PatchMessage
  | AckMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

export const PROTOCOL_VERSION: ProtocolVersion = 1;

export function createEnvelope<T>(
  type: MessageType,
  sid: string,
  seq: number,
  data: T
): Envelope<T> {
  return {
    v: PROTOCOL_VERSION,
    type,
    sid,
    seq,
    ts: Date.now(),
    data
  };
}
