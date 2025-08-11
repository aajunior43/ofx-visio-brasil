import React, { createContext, useContext, useMemo, useState } from "react";

export type Locale = "pt-BR" | "en-US";

type Dictionary = Record<string, string>;

const pt: Dictionary = {
  app_title: "Visualizador OFX",
  upload_ofx: "Carregar OFX",
  processing: "Processando...",
  success_loaded: "OFX carregado com sucesso!",
  account_info: "Informações da Conta",
  bank_id: "ID do Banco",
  account_id: "ID da Conta",
  account_type: "Tipo de Conta",
  balance: "Saldo",
  checking: "Corrente",
  savings: "Poupança",
  transactions: "Transações",
  search_placeholder: "Buscar por descrição...",
  heatmap: "Mapa de calor",
  credits_total: "Total de créditos",
  debits_total: "Total de débitos",
  net_variation: "Variação líquida",
  export_csv: "Exportar CSV",
  enable_notifications: "Notificações",
  history: "Histórico",
  private_badge: "100% Privado — processamento local",
  invalid_ofx: "Arquivo OFX inválido. Por favor, tente outro arquivo.",
  upload_error: "Erro no upload: Verifique a conexão e tente novamente.",
  try_again: "Tentar novamente",
  cancel: "Cancelar",
  date: "Data",
  type: "Tipo",
  amount: "Valor",
  id: "ID",
  description: "Descrição",
  credit: "Crédito",
  debit: "Débito",
};

const en: Dictionary = {
  app_title: "OFX Viewer",
  upload_ofx: "Upload OFX",
  processing: "Processing...",
  success_loaded: "OFX loaded successfully!",
  account_info: "Account Info",
  bank_id: "Bank ID",
  account_id: "Account ID",
  account_type: "Account Type",
  balance: "Balance",
  checking: "Checking",
  savings: "Savings",
  transactions: "Transactions",
  search_placeholder: "Search by description...",
  heatmap: "Heatmap",
  credits_total: "Total credits",
  debits_total: "Total debits",
  net_variation: "Net variation",
  export_csv: "Export CSV",
  enable_notifications: "Notifications",
  history: "History",
  private_badge: "100% Private — local processing",
  invalid_ofx: "Invalid OFX file. Please try another.",
  upload_error: "Upload error: Check connection and try again.",
  try_again: "Try again",
  cancel: "Cancel",
  date: "Date",
  type: "Type",
  amount: "Amount",
  id: "ID",
  description: "Description",
  credit: "Credit",
  debit: "Debit",
};

const dictionaries: Record<Locale, Dictionary> = { "pt-BR": pt, "en-US": en };

interface I18nContextValue {
  locale: Locale;
  t: (key: keyof typeof pt) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>((localStorage.getItem("locale") as Locale) || "pt-BR");

  const value = useMemo(() => ({
    locale,
    setLocale: (l: Locale) => {
      localStorage.setItem("locale", l);
      setLocale(l);
    },
    t: (k: keyof typeof pt) => dictionaries[locale][k] || String(k),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
