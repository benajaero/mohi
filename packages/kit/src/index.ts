import type { RuntimePlugin, SessionEvent, SessionResult } from "@mohi/runtime";

export interface KitOptions {
  enableMetrics?: boolean;
}

export function createDefaultPlugins(options: KitOptions = {}): RuntimePlugin[] {
  const plugins: RuntimePlugin[] = [];

  if (options.enableMetrics !== false) {
    plugins.push(metricsPlugin());
  }

  return plugins;
}

function metricsPlugin(): RuntimePlugin {
  return {
    name: "mohi-metrics",
    onActionStart: (event: SessionEvent) => {
      (event as SessionEvent & { _start?: number })._start = performance.now();
    },
    onActionEnd: (event: SessionEvent, result: SessionResult) => {
      const start = (event as SessionEvent & { _start?: number })._start;
      if (typeof start === "number") {
        const elapsed = performance.now() - start;
        result.patch.metrics = {
          ...result.patch.metrics,
          renderMs: result.patch.metrics?.renderMs ?? elapsed
        };
      }
    }
  };
}
