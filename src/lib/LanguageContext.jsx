import React, { createContext, useContext, useState } from 'react';

/**
 * Taal van de app: 'nl' (standaard) of 'en'.
 *
 * Vertalen in een component:
 *   const { tr, lang } = useLang();
 *   tr('Opslaan', 'Save')
 *
 * Vertalen buiten een component (utils, meldingen):
 *   import { trNow } from '@/lib/LanguageContext';
 *   trNow('Opslaan', 'Save')
 */

const STORAGE_KEY = 'welove_lang';

export const getLang = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'nl';
  } catch (e) {
    return 'nl';
  }
};

export const trNow = (nl, en) => (getLang() === 'en' ? en : nl);

const LanguageContext = createContext({
  lang: 'nl',
  setLang: () => {},
  tr: (nl) => nl,
  isEn: false,
  locale: 'nl-NL',
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getLang());

  const changeLang = (l) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch (e) {}
    setLang(l);
  };

  const isEn = lang === 'en';
  const tr = (nl, en) => (isEn ? en : nl);

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, tr, isEn, locale: isEn ? 'en-GB' : 'nl-NL' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
