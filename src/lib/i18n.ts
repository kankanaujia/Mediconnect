"use client";

import { useCallback, useSyncExternalStore } from "react";

// Small English/Hindi switch for the main patient-facing screens.
// The choice is saved in this browser only.

export type Lang = "en" | "hi";

const STORAGE_KEY = "mc_lang";
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore (private mode)
  }
  document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
}

const hi: Record<string, string> = {
  Home: "होम",
  Hospitals: "अस्पताल",
  Doctors: "डॉक्टर",
  "Patient Login": "मरीज़ लॉगिन",
  "Doctor Login": "डॉक्टर लॉगिन",
  "My Dashboard": "मेरा डैशबोर्ड",
  "Admin Panel": "एडमिन पैनल",
  "Hospital Panel": "अस्पताल पैनल",
  Logout: "लॉग आउट",
  "Find Your Medical": "अपना",
  Specialist: "विशेषज्ञ खोजें",
  "Browse our extensive network of healthcare professionals across various specialties.":
    "अलग-अलग विभागों के डॉक्टरों में से अपने लिए सही डॉक्टर चुनें।",
  "Search by doctor, specialty or hospital": "डॉक्टर, विभाग या अस्पताल से खोजें",
  "All specialties": "सभी विभाग",
  "All hospitals": "सभी अस्पताल",
  "All cities": "सभी शहर",
  "Sort: Name": "क्रम: नाम",
  "Sort: Top rated": "क्रम: सबसे अच्छी रेटिंग",
  "Sort: Most experienced": "क्रम: सबसे अनुभवी",
  "Loading doctors...": "डॉक्टर लोड हो रहे हैं...",
  "doctors found": "डॉक्टर मिले",
  "Clear filters": "फ़िल्टर हटाएँ",
  "No doctors match your search. Try a different specialty or hospital.":
    "आपकी खोज से कोई डॉक्टर नहीं मिला। दूसरा विभाग या अस्पताल चुनें।",
  "yrs experience": "साल का अनुभव",
  "VIEW PROFILE →": "प्रोफ़ाइल देखें →",
};

export function translate(lang: Lang, text: string) {
  return lang === "hi" ? (hi[text] ?? text) : text;
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang);
  const t = useCallback((text: string) => translate(lang, text), [lang]);
  return { lang, setLang, t };
}
