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

    await new Promise((resolve) => setTimeout(resolve, 0));

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
});
