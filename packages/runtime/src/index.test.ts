import { describe, expect, it } from "vitest";
import { LivePage, LiveSession, replayEvents, type SessionEvent } from "./index.js";

class CounterPage extends LivePage<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  render(): string {
    return `<div data-mohi-id="mohi-root">${this.state.count}</div>`;
  }

  increment(delta = 1): void {
    this.state.count += delta;
  }
}

describe("LiveSession", () => {
  it("records events with deterministic state hashes", async () => {
    const session = new LiveSession(new CounterPage(), { id: "s1", route: "/" });

    session.enqueue({
      seq: 1,
      target: "mohi-root",
      action: "increment",
      payload: 1
    });

    session.enqueue({
      seq: 2,
      target: "mohi-root",
      action: "increment",
      payload: 2
    });

    await waitFor(() => session.getEventLog().length === 2);

    const log = session.getEventLog();
    expect(log).toHaveLength(2);
    expect(log[0]?.seq).toBe(1);
    expect(log[1]?.seq).toBe(2);
    expect(log[0]?.stateHash).not.toBe(log[1]?.stateHash);
  });

  it("replays events to the same final state", () => {
    const events: SessionEvent[] = [
      { seq: 1, target: "root", action: "increment", payload: 1 },
      { seq: 2, target: "root", action: "increment", payload: 3 }
    ];

    const page = replayEvents(() => new CounterPage(), events);
    expect(page.state.count).toBe(4);
  });

  it("runs plugin hooks around actions", async () => {
    const calls: string[] = [];
    const session = new LiveSession(new CounterPage(), { id: "s2", route: "/" }, {
      plugins: [
        {
          name: "test",
          onActionStart: () => calls.push("start"),
          onActionEnd: () => calls.push("end")
        }
      ]
    });

    session.enqueue({ seq: 1, target: "root", action: "increment", payload: 1 });
    await waitFor(() => calls.length === 2);
    expect(calls).toEqual(["start", "end"]);
  });
});

async function waitFor(condition: () => boolean, timeoutMs = 50): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}
