import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./resources/en/common";
import enCollectionCreate from "./resources/en/collectionCreate";
import zhTWCommon from "./resources/zh-TW/common";
import zhTWCollectionCreate from "./resources/zh-TW/collectionCreate";

export const SUPPORTED_LANGUAGES = ["en", "zh-TW"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const DEFAULT_LANGUAGE: SupportedLanguage = "en";

const LANGUAGE_STORAGE_KEY = "muizo.language";

const isSupportedLanguage = (
  value: string | null,
): value is SupportedLanguage => value === "en" || value === "zh-TW";

const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupportedLanguage(stored)) return stored;

  const browserLanguage = window.navigator.language;

  if (browserLanguage === "zh-TW" || browserLanguage === "zh-Hant") {
    return "zh-TW";
  }

  return DEFAULT_LANGUAGE;
};

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      collectionCreate: enCollectionCreate,
    },
    "zh-TW": {
      common: zhTWCommon,
      collectionCreate: zhTWCollectionCreate,
    },
  },
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = async (language: SupportedLanguage) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  await i18n.changeLanguage(language);
};

export default i18n;
