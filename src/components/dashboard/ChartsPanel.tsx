import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "../ofx/OFXParser";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as RTooltip, LineChart, Line, XAxis, YAxis, BarChart, Bar } from "recharts";

function inferCategory(name?: string) {
  const t = (name || "").toLowerCase();
  if (/mercado|super|market|grocery/.test(t)) return "Compras";
  if (/pagamento|boleto|bill|payment/.test(t)) return "Pagamentos";
  if (/uber|99|transporte|bus|metro|taxi/.test(t)) return "Transporte";
  if (/restaurante|food|lanche|pizza|sushi/.test(t)) return "Alimentação";
  if (/salario|salary|payroll/.test(t)) return "Salário";
  return "Outros";
}

export function ChartsPanel({ transactions }: { transactions: Transaction[] }) {
  const typeData = useMemo(() => {
    const credits = transactions.filter(t => (t.trnType||'').includes('CREDIT')).length;
    const debits = transactions.length - credits;
    return [
      { name: 'Créditos', value: credits, color: 'hsl(var(--success))' },
      { name: 'Débitos', value: debits, color: 'hsl(var(--destructive))' },
    ];
  }, [transactions]);

  const balanceSeries = useMemo(() => {
    let acc = 0; return transactions.map((t, i) => { acc += t.amount; return { i, balance: acc }; });
  }, [transactions]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      const c = inferCategory(t.name || t.memo);
      map.set(c, (map.get(c) || 0) + Math.abs(t.amount));
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
      <Card className="hover-scale">
        <CardHeader>
          <CardTitle>Distribuição por tipo</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={80}>
                {typeData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <RTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="hover-scale">
        <CardHeader>
          <CardTitle>Evolução do saldo</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={balanceSeries}>
              <XAxis dataKey="i" hide />
              <YAxis hide />
              <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="hover-scale">
        <CardHeader>
          <CardTitle>Por categoria</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Bar dataKey="value" fill="hsl(var(--info))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
