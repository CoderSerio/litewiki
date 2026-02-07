import { createConfigStore } from "../config/store.js";
import { type TranslationKeys, en, es, zh } from "./locales/index.js";

export type Locale = "en" | "zh" | "es";

const locales: Record<Locale, Record<TranslationKeys, string>> = {
  en,
  zh,
  es,
};

export const SUPPORTED_LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "\u4E2D\u6587" },
  { value: "es", label: "Espa\u00F1ol" },
];

export function getLocale(): Locale {
  const store = createConfigStore();
  const conf = store.readAll();
  const raw = (conf as any).locale as string | undefined;
  if (raw && raw in locales) return raw as Locale;
  return "en";
}

export function setLocale(locale: Locale) {
  const store = createConfigStore();
  store.write("locale" as any, locale as any);
}

export function t(
  key: TranslationKeys,
  params?: Record<string, string>,
): string {
  const locale = getLocale();
  const dict = locales[locale] ?? locales.en;
  let text = dict[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return text;
}

export type { TranslationKeys };
