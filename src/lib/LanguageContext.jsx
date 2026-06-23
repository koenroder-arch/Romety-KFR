import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext({ lang: 'nl', setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('welove_lang') || 'nl');

  const changeLang = (l) => {
    localStorage.setItem('welove_lang', l);
    setLang(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}