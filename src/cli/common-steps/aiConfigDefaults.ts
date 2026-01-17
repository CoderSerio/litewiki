import { DEFAULT_MODEL } from "../../agent/providers/siliconflow.js";

export const BUILTIN_CONFIG_ID = "__builtin__:default";

export type BuiltinConfig = {
  id: string;
  provider: string;
  model: string;
  key: string;
  baseUrl?: string | undefined;
};

export type BuiltinConfigStatus = {
  config: BuiltinConfig | null;
  missing: string[];
};

export function getBuiltinDefaultConfigStatus(): BuiltinConfigStatus {
  const missing: string[] = [];
  const model = process.env.SILICONFLOW_MODEL || DEFAULT_MODEL;
  const key = process.env.SILICONFLOW_API_KEY || "";
  if (!key) missing.push("SILICONFLOW_API_KEY");
  if (missing.length > 0) {
    return { config: null, missing };
  }
  const baseUrl = process.env.SILICONFLOW_BASE_URL || "";
  return {
    config: {
      id: BUILTIN_CONFIG_ID,
      provider: "siliconflow",
      model,
      key,
      baseUrl: baseUrl || undefined,
    },
    missing: [],
  };
}

export function getBuiltinDefaultConfig(): BuiltinConfig | null {
  return getBuiltinDefaultConfigStatus().config;
}
