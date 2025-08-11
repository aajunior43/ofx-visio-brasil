import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { useMemo } from "react";
import { Transaction } from "../ofx/OFXParser";
import { useI18n } from "@/context/i18n";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function SummaryCards({ transactions }: { transactions: Transaction[] }) {
  const { t } = useI18n();
  const { credits, debits, net, series } = useMemo(() => {
    let credits = 0, debits = 0; const series: { i: number; value: number }[] = [];
    transactions.forEach((tr, i) => {
      if ((tr.trnType || '').toUpperCase().includes('CREDIT')) credits += tr.amount; else debits += Math.abs(tr.amount);
      series.push({ i, value: credits - debits });
    });
    return { credits, debits, net: credits - debits, series };
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <Card className="hover-scale">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t("credits_total")}</div>
            <ArrowUpRight className="text-success" />
          </div>
          <div className="text-2xl font-bold text-success mt-2">{credits.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <Bar dataKey="value" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-scale">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t("debits_total")}</div>
            <ArrowDownRight className="text-destructive" />
          </div>
          <div className="text-2xl font-bold text-destructive mt-2">{debits.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <Bar dataKey="value" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-scale">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t("net_variation")}</div>
            <Scale className="text-info" />
          </div>
          <div className="text-2xl font-bold mt-2">{net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
