"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export type SupportedLanguage = "en" | "hi" | "te" | "mr" | "ta" | "bn";

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English",  nativeLabel: "English" },
  { code: "hi", label: "Hindi",    nativeLabel: "हिन्दी"   },
  { code: "te", label: "Telugu",   nativeLabel: "తెలుగు"  },
  { code: "mr", label: "Marathi",  nativeLabel: "मराठी"   },
  { code: "ta", label: "Tamil",    nativeLabel: "தமிழ்"  },
  { code: "bn", label: "Bengali",  nativeLabel: "বাংলা"   },
];

type Messages = Record<string, Record<string, string>>;

// Cache loaded dictionaries in memory
const msgCache: Partial<Record<SupportedLanguage, Messages>> = {};

async function loadMessages(lang: SupportedLanguage): Promise<Messages> {
  if (msgCache[lang]) return msgCache[lang]!;
  try {
    const mod = await import(`@/messages/${lang}.json`);
    msgCache[lang] = mod.default as Messages;
    return msgCache[lang]!;
  } catch {
    // fallback to English
    if (!msgCache["en"]) {
      const en = await import("@/messages/en.json");
      msgCache["en"] = en.default as Messages;
    }
    return msgCache["en"]!;
  }
}

interface LanguageContextValue {
  language: SupportedLanguage;
  /** Switch language — updates localStorage, Supabase profile, and all t() calls */
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** Translate: t("nav", "dashboard") → "डैशबोर्ड" */
  t: (section: string, key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: async () => {},
  t: (_s, k) => k,
  isLoading: false,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

const LS_KEY = "rakshanet_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<SupportedLanguage>("en");
  const [messages, setMessages] = useState<Messages>({});
  const [isLoading, setIsLoading] = useState(true);

  // On mount: read from localStorage, then load messages
  useEffect(() => {
    const stored = (localStorage.getItem(LS_KEY) as SupportedLanguage) || "en";
    setLangState(stored);
    loadMessages(stored).then(msgs => {
      setMessages(msgs);
      setIsLoading(false);
    });
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    setIsLoading(true);
    localStorage.setItem(LS_KEY, lang);
    setLangState(lang);

    // Load dictionary
    const msgs = await loadMessages(lang);
    setMessages(msgs);
    setIsLoading(false);

    // Sync to Supabase profile (best-effort, don't block UI)
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ preferred_language: lang })
          .eq("id", user.id);
      }
    } catch { /* non-blocking */ }
  }, []);

  const t = useCallback((section: string, key: string): string => {
    return messages?.[section]?.[key] ?? key;
  }, [messages]);

  const value = useMemo(() => ({ language, setLanguage, t, isLoading }), [language, setLanguage, t, isLoading]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
