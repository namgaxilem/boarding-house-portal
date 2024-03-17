'use client';

import { createContext, useContext, useState } from 'react';

interface ContextProps {
  lang: any;
  locale: 'en' | 'vi';
}
export const LangContext = createContext({} as ContextProps);

export const useLang = () => {
  return useContext(LangContext);
};

export default function LangProvider({ dict, locale, children }) {
  const [lang] = useState(dict);

  return (
    <LangContext.Provider
      value={{
        lang,
        locale: locale || 'vi',
      }}
    >
      {children}
    </LangContext.Provider>
  );
}
