import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Calendar, Info, Search, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Transaction } from "./OFXParser";
import { useI18n } from "@/context/i18n";
import { formatCurrencyBRL, formatDateBRL } from "./OFXParser";

export type SortKey = "dtPosted" | "amount" | "trnType";

interface TransactionsTableProps {
  transactions: Transaction[];
  onViewChange?: (visible: Transaction[]) => void;
}

export function TransactionsTable({ transactions, onViewChange }: TransactionsTableProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [heatmap, setHeatmap] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("dtPosted");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? transactions.filter((tr) => (tr.name || tr.memo || "").toLowerCase().includes(q)) : transactions.slice();
    const sorted = base.sort((a, b) => {
      let va: number | string = a[sortKey as keyof Transaction] as any;
      let vb: number | string = b[sortKey as keyof Transaction] as any;
      if (sortKey === "dtPosted") {
        const da = (a.dtPosted || "").slice(0, 8);
        const db = (b.dtPosted || "").slice(0, 8);
        va = da;
        vb = db;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    onViewChange?.(sorted);
    return sorted;
  }, [transactions, query, sortKey, sortDir, onViewChange]);

  const maxAbs = useMemo(() => Math.max(1, ...transactions.map((t) => Math.abs(t.amount))), [transactions]);

  const headerSortBtn = (k: SortKey, label: string) => {
    const active = sortKey === k;
    const dir = active ? sortDir : undefined;
    return (
      <button
        onClick={() => {
          if (active) setSortDir(dir === "asc" ? "desc" : "asc");
          else { setSortKey(k); setSortDir("desc"); }
        }}
        className={`inline-flex items-center gap-1 hover-scale ${active ? "text-primary" : "text-foreground"}`}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        {active ? (dir === "asc" ? <ChevronUp /> : <ChevronDown />) : null}
      </button>
    );
  };

  const highlight = (text?: string) => {
    if (!text) return null;
    const q = query.trim();
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, "gi"));
    return (
      <span>
        {parts.map((p, i) => p.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-warning/40 px-0.5 rounded-sm">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ))}
      </span>
    );
  };

  return (
    <div className="w-full mt-8">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="opacity-70" />
          <Input
            placeholder={t("search_placeholder")!}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>{t("heatmap")}</span>
          <Switch checked={heatmap} onCheckedChange={setHeatmap} />
        </div>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">{headerSortBtn("trnType", t("type")!)}</TableHead>
              <TableHead>{headerSortBtn("dtPosted", t("date")!)} <Calendar className="inline ml-1" /></TableHead>
              <TableHead className="text-right">{headerSortBtn("amount", t("amount")!)}</TableHead>
              <TableHead>{t("id")}</TableHead>
              <TableHead>{t("description")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tr) => {
              const credit = (tr.trnType || "").toUpperCase().includes("CREDIT");
              const icon = credit ? <ArrowUpRight className="text-success animate-scale-in" /> : <ArrowDownRight className="text-destructive animate-scale-in" />;
              const amt = formatCurrencyBRL(tr.amount);
              const pct = Math.min(1, Math.abs(tr.amount) / maxAbs);
              const hue = Math.floor(credit ? 130 - 60 * (1 - pct) : 0 + 40 * (1 - pct));
              return (
                <TableRow key={tr.fitId} className="hover:bg-info/10 transition-colors hover:scale-[1.01]">
                  <TableCell className="font-medium flex items-center gap-2">{icon}{credit ? t("credit") : t("debit")}</TableCell>
                  <TableCell>{formatDateBRL(tr.dtPosted)}</TableCell>
                  <TableCell className={`text-right ${credit ? "text-success" : "text-destructive"} ${heatmap ? "heat-cell" : ""}`} style={heatmap ? ({ ['--heat-hue' as any]: hue } as any) : undefined}>
                    {credit ? amt : amt}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1 text-muted-foreground">
                          {tr.fitId.slice(0, 8)}... <Info className="opacity-60" />
                        </TooltipTrigger>
                        <TooltipContent>{tr.fitId}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="max-w-xl truncate">
                    <div className="flex items-center gap-2">
                      <span className="truncate flex-1">{highlight(tr.name || tr.memo)}</span>
                      <Plus className="opacity-60" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((tr) => {
          const credit = (tr.trnType || "").toUpperCase().includes("CREDIT");
          const icon = credit ? <ArrowUpRight className="text-success" /> : <ArrowDownRight className="text-destructive" />;
          const amt = formatCurrencyBRL(tr.amount);
          const pct = Math.min(1, Math.abs(tr.amount) / maxAbs);
          const hue = Math.floor(credit ? 130 - 60 * (1 - pct) : 0 + 40 * (1 - pct));
          return (
            <div key={tr.fitId} className="rounded-lg border p-3 hover:bg-info/10 hover-scale">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">{icon}{credit ? t("credit") : t("debit")}</div>
                <div className={`text-right ${credit ? "text-success" : "text-destructive"} ${heatmap ? "heat-cell" : ""}`} style={heatmap ? ({ ['--heat-hue' as any]: hue } as any) : undefined}>{amt}</div>
              </div>
              <div className="text-sm text-muted-foreground">{formatDateBRL(tr.dtPosted)} • {tr.fitId}</div>
              <div className="text-sm mt-1">{highlight(tr.name || tr.memo)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
