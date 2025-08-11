export type AccountType = "CHECKING" | "SAVINGS" | string;
export type TransactionType = "DEBIT" | "CREDIT" | string;

export interface AccountInfo {
  bankId?: string;
  accountId?: string;
  accountType?: AccountType;
  balance?: number;
}

export interface Transaction {
  trnType: TransactionType;
  dtPosted: string; // ISO date or raw
  amount: number;
  fitId: string;
  name?: string;
  memo?: string;
}

export interface OFXData {
  account: AccountInfo;
  transactions: Transaction[];
}

function parseNumber(val?: string | null): number | undefined {
  if (!val) return undefined;
  const n = Number(String(val).replace(",", "."));
  return isNaN(n) ? undefined : n;
}

function safeText(el: Element | null): string | undefined {
  return el?.textContent?.trim() || undefined;
}

function parseAsXML(text: string): OFXData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) return null;

    const acctFrom = doc.querySelector("BANKACCTFROM, CCACCTFROM");
    const bankId = safeText(acctFrom?.querySelector("BANKID"));
    const accountId = safeText(acctFrom?.querySelector("ACCTID"));
    const accountType = safeText(acctFrom?.querySelector("ACCTTYPE")) as AccountType | undefined;

    const balAmt = parseNumber(safeText(doc.querySelector("LEDGERBAL > BALAMT")) || safeText(doc.querySelector("AVAILBAL > BALAMT")));

    const txnEls = Array.from(doc.querySelectorAll("STMTTRN"));
    const transactions: Transaction[] = txnEls.map((el) => ({
      trnType: (safeText(el.querySelector("TRNTYPE")) || "").toUpperCase() as TransactionType,
      dtPosted: safeText(el.querySelector("DTPOSTED")) || "",
      amount: parseNumber(safeText(el.querySelector("TRNAMT"))) || 0,
      fitId: safeText(el.querySelector("FITID")) || crypto.randomUUID(),
      name: safeText(el.querySelector("NAME")) || undefined,
      memo: safeText(el.querySelector("MEMO")) || undefined,
    }));

    return { account: { bankId, accountId, accountType, balance: balAmt }, transactions };
  } catch {
    return null;
  }
}

// Fallback SGML-style (<TAG>value without closing)
function parseAsSGML(text: string): OFXData {
  const get = (tag: string): string | undefined => {
    const m = text.match(new RegExp(`<${tag}>([^\n\r<]+)`, "i"));
    return m?.[1]?.trim();
  };

  const section = (name: string): string | undefined => {
    const start = text.indexOf(`<${name}>`);
    if (start === -1) return undefined;
    const end = text.indexOf(`</${name}>`, start);
    return text.slice(start, end !== -1 ? end : undefined);
  };

  const acctBlock = section("BANKACCTFROM") || section("CCACCTFROM") || "";
  const bankId = acctBlock.match(/<BANKID>([^\n\r<]+)/i)?.[1]?.trim();
  const accountId = acctBlock.match(/<ACCTID>([^\n\r<]+)/i)?.[1]?.trim();
  const accountType = acctBlock.match(/<ACCTTYPE>([^\n\r<]+)/i)?.[1]?.trim();

  const ledgerBalBlock = section("LEDGERBAL") || section("AVAILBAL") || "";
  const balAmt = parseNumber(ledgerBalBlock.match(/<BALAMT>([^\n\r<]+)/i)?.[1]);

  const stmttrnBlocks = (section("BANKTRANLIST") || text).match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  const transactions: Transaction[] = stmttrnBlocks.map((blk) => {
    const trn = (blk.match(/<TRNTYPE>([^\n\r<]+)/i)?.[1] || '').toUpperCase();
    const dt = blk.match(/<DTPOSTED>([^\n\r<]+)/i)?.[1] || '';
    const amt = parseNumber(blk.match(/<TRNAMT>([^\n\r<]+)/i)?.[1]) || 0;
    const fit = blk.match(/<FITID>([^\n\r<]+)/i)?.[1] || crypto.randomUUID();
    const name = blk.match(/<NAME>([^\n\r<]+)/i)?.[1];
    const memo = blk.match(/<MEMO>([^\n\r<]+)/i)?.[1];
    return { trnType: trn as TransactionType, dtPosted: dt, amount: amt, fitId: fit, name, memo };
  });

  return { account: { bankId, accountId, accountType, balance: balAmt }, transactions };
}

export function parseOFX(text: string): OFXData {
  const xml = parseAsXML(text);
  if (xml) return xml;
  return parseAsSGML(text);
}

export function formatCurrencyBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function formatDateBRL(raw: string): string {
  // OFX often has YYYYMMDD or YYYYMMDDHHmmSS
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return raw;
  const [_, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}
