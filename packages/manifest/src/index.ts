export type RuntimeMode = "edge-safe" | "node-full";

export interface ManifestRoute {
  id: string;
  path: string;
  file: string;
  runtime?: RuntimeMode;
  actions?: Array<{ name: string; input?: string }>;
  islands?: Array<{ name: string; src: string }>;
  assets?: string[];
  budgets?: Partial<ManifestBudgets>;
}

export interface ManifestModule {
  name: string;
  routes: string[];
  importMap?: string;
  policies?: string[];
}

export interface ManifestAsset {
  path: string;
  hash?: string;
}

export interface ManifestBudgets {
  routeJS_gzip_max_kb: number;
  islandJS_gzip_max_kb: number;
  patch_p95_max_kb: number;
  render_p95_max_ms: number;
  deps_max_count: number;
}

export interface MohiManifest {
  version: number;
  generatedAt: string;
  routes: ManifestRoute[];
  components?: Array<{ id: string; file: string }>;
  modules?: ManifestModule[];
  assets?: ManifestAsset[];
  deps?: {
    direct: string[];
    transitiveCount: number;
  };
  budgets?: ManifestBudgets;
  runtimeDefaults?: RuntimeMode;
  sbom?: {
    format: string;
    path: string;
  };
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateManifest(manifest: MohiManifest): ValidationResult {
  const errors: string[] = [];

  if (manifest.version !== 1) {
    errors.push("manifest.version must be 1");
  }

  if (!manifest.generatedAt) {
    errors.push("manifest.generatedAt is required");
  }

  if (!Array.isArray(manifest.routes)) {
    errors.push("manifest.routes must be an array");
  } else {
    manifest.routes.forEach((route, index) => {
      if (!route.id || !route.path || !route.file) {
        errors.push(`routes[${index}] requires id, path, file`);
      }
      if (route.runtime && !isRuntimeMode(route.runtime)) {
        errors.push(`routes[${index}].runtime invalid: ${route.runtime}`);
      }
    });
  }

  if (manifest.runtimeDefaults && !isRuntimeMode(manifest.runtimeDefaults)) {
    errors.push(`runtimeDefaults invalid: ${manifest.runtimeDefaults}`);
  }

  return { ok: errors.length === 0, errors };
}

export function sortManifest(manifest: MohiManifest): MohiManifest {
  const routes = [...manifest.routes].sort((a, b) => a.path.localeCompare(b.path));
  const assets = manifest.assets ? [...manifest.assets].sort((a, b) => a.path.localeCompare(b.path)) : undefined;
  const modules = manifest.modules ? [...manifest.modules].sort((a, b) => a.name.localeCompare(b.name)) : undefined;

  return {
    ...manifest,
    routes,
    assets,
    modules
  };
}

function isRuntimeMode(mode: string): mode is RuntimeMode {
  return mode === "edge-safe" || mode === "node-full";
}
