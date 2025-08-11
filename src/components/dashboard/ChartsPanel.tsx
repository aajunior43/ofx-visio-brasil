import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Transaction } from "../ofx/OFXParser";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as RTooltip, LineChart, Line, XAxis, YAxis, BarChart, Bar, CartesianGrid, Brush, Tooltip, ReferenceLine, Legend, Area, AreaChart, ComposedChart, Scatter, ScatterChart, ZAxis } from "recharts";
import { useI18n } from "@/context/i18n";
import { Download, Camera, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function inferCategory(name?: string) {
  const t = (name || "").toLowerCase();
  if (/mercado|super|market|grocery|alimentacao|food/.test(t)) return "Alimentação";
  if (/pagamento|boleto|bill|payment|conta|electricity|water/.test(t)) return "Contas";
  if (/uber|99|transporte|bus|metro|taxi|combustivel|gas/.test(t)) return "Transporte";
  if (/restaurante|lanche|pizza|sushi|bar|cafe/.test(t)) return "Restaurantes";
  if (/salario|salary|payroll|wages/.test(t)) return "Salário";
  if (/shopping|compra|loja|store|vestuario/.test(t)) return "Compras";
  if (/saude|health|medico|farmacia|hospital/.test(t)) return "Saúde";
  if (/educacao|school|curso|livro|education/.test(t)) return "Educação";
  if (/entretenimento|cinema|netflix|spotify|games/.test(t)) return "Entretenimento";
  return "Outros";
}

const CHART_COLORS = [
  'hsl(142, 76%, 36%)', // Green
  'hsl(346, 87%, 43%)', // Red
  'hsl(221, 83%, 53%)', // Blue
  'hsl(47, 96%, 53%)',  // Yellow
  'hsl(262, 83%, 58%)', // Purple
  'hsl(24, 94%, 50%)',  // Orange
  'hsl(189, 94%, 43%)', // Cyan
  'hsl(339, 82%, 52%)', // Pink
  'hsl(84, 81%, 44%)',  // Lime
  'hsl(17, 88%, 40%)',  // Brown
];

export function ChartsPanel({ transactions }: { transactions: Transaction[] }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const pieChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const scatterChartRef = useRef<HTMLDivElement>(null);

  const typeData = useMemo(() => {
    const credits = transactions.filter(t => (t.trnType||'').includes('CREDIT')).length;
    const debits = transactions.length - credits;
    return [
      { name: t('credit') || 'Créditos', value: credits, color: CHART_COLORS[0] },
      { name: t('debit') || 'Débitos', value: debits, color: CHART_COLORS[1] },
    ];
  }, [transactions, t]);

  const balanceSeries = useMemo(() => {
    let acc = 0; 
    return transactions.map((t, i) => { 
      acc += t.amount; 
      const date = t.dtPosted.slice(0, 8);
      const formattedDate = `${date.slice(6, 8)}/${date.slice(4, 6)}`;
      return { 
        i, 
        balance: acc, 
        amount: t.amount,
        date: formattedDate,
        isCredit: (t.trnType||'').includes('CREDIT')
      }; 
    });
  }, [transactions]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      const c = inferCategory(t.name || t.memo);
      map.set(c, (map.get(c) || 0) + Math.abs(t.amount));
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories
  }, [transactions]);

  const scatterData = useMemo(() => {
    return transactions.map((t, i) => ({
      x: i,
      y: Math.abs(t.amount),
      z: t.amount > 0 ? 50 : 30,
      category: inferCategory(t.name || t.memo),
      amount: t.amount,
      name: t.name || t.memo || 'Sem descrição'
    }));
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { credits: number; debits: number; net: number }>();
    
    transactions.forEach(t => {
      const date = t.dtPosted.slice(0, 6); // YYYYMM
      const month = `${date.slice(4, 6)}/${date.slice(0, 4)}`;
      const current = monthMap.get(month) || { credits: 0, debits: 0, net: 0 };
      
      if ((t.trnType||'').includes('CREDIT')) {
        current.credits += t.amount;
      } else {
        current.debits += Math.abs(t.amount);
      }
      current.net = current.credits - current.debits;
      monthMap.set(month, current);
    });
    
    return Array.from(monthMap, ([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const exportChart = async (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!chartRef.current) return;
    
    try {
      const svgElement = chartRef.current.querySelector('svg');
      if (!svgElement) throw new Error('Chart not found');

      // Clone SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Create download link
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Gráfico exportado!",
        description: `${filename}.svg baixado com sucesso`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o gráfico",
        duration: 3000,
      });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg animate-fade-in">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          📊 Análise Visual dos Dados
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="animate-pulse-soft">
            <BarChart3 className="w-4 h-4 mr-2" />
            Análises Avançadas
          </Button>
        </div>
      </div>

      {/* Main charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Pie Chart */}
        <Card className="hover-scale bg-card-grad shadow-elevate">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              {t('type') || 'Distribuição por Tipo'}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => exportChart(pieChartRef, 'distribuicao-tipos')}
              className="hover-scale"
            >
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-80" ref={pieChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <Pie 
                  data={typeData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={5}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={1500}
                  filter="url(#glow)"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <RTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enhanced Line Chart */}
        <Card className="hover-scale bg-card-grad shadow-elevate">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Evolução do Saldo
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => exportChart(lineChartRef, 'evolucao-saldo')}
              className="hover-scale"
            >
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-80" ref={lineChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={balanceSeries}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  fill="url(#balanceGradient)"
                  strokeWidth={3}
                  isAnimationActive
                  animationDuration={2000}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
                <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Bar Chart */}
        <Card className="hover-scale bg-card-grad shadow-elevate">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-info" />
              Top Categorias por Valor
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => exportChart(barChartRef, 'categorias-gastos')}
              className="hover-scale"
            >
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-80" ref={barChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="horizontal">
                <defs>
                  {categories.map((_, index) => (
                    <linearGradient key={index} id={`colorBar${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.4} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 8, 8, 0]}
                  isAnimationActive
                  animationDuration={1500}
                >
                  {categories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#colorBar${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New Scatter Plot */}
        <Card className="hover-scale bg-card-grad shadow-elevate">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-warning" />
              Dispersão de Valores
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => exportChart(scatterChartRef, 'dispersao-valores')}
              className="hover-scale"
            >
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-80" ref={scatterChartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" dataKey="x" name="Transação" tick={false} />
                <YAxis type="number" dataKey="y" name="Valor" tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                <ZAxis type="number" dataKey="z" range={[20, 80]} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg animate-fade-in">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.category}</p>
                          <p style={{ color: data.amount > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                            {data.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  dataKey="y" 
                  fill="hsl(var(--primary))"
                  isAnimationActive
                  animationDuration={2000}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trends - Full width */}
      <Card className="hover-scale bg-card-grad shadow-elevate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Evolução Mensal - Créditos vs Débitos
          </CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData}>
              <defs>
                <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="debitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="5 5" />
              <Area
                type="monotone"
                dataKey="credits"
                stackId="1"
                stroke="hsl(var(--success))"
                fill="url(#creditGradient)"
                name="Créditos"
              />
              <Area
                type="monotone"
                dataKey="debits"
                stackId="2"
                stroke="hsl(var(--destructive))"
                fill="url(#debitGradient)"
                name="Débitos"
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                name="Saldo Líquido"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
