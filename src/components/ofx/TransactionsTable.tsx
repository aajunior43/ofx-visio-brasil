import { useMemo, useState, useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, Calendar, Info, Search, ChevronUp, ChevronDown, Plus, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Transaction } from "./OFXParser";
import { useI18n } from "@/context/i18n";
import { formatCurrencyBRL, formatDateBRL } from "./OFXParser";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? transactions.filter((tr) => (tr.name || tr.memo || "").toLowerCase().includes(q)) : transactions.slice();

    const byType = base.filter((tr) => {
      if (typeFilter === 'all') return true;
      const isCredit = (tr.trnType || '').toUpperCase().includes('CREDIT');
      return typeFilter === 'credit' ? isCredit : !isCredit;
    });

    const byValue = byType.filter((tr) => {
      const min = minValue ? parseFloat(minValue.replace(',', '.')) : -Infinity;
      const max = maxValue ? parseFloat(maxValue.replace(',', '.')) : Infinity;
      return tr.amount >= min && tr.amount <= max;
    });

    const byDate = byValue.filter((tr) => {
      if (!startDate && !endDate) return true;
      const raw = (tr.dtPosted || '').slice(0, 8);
      const d = new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`);
      const dStart = startDate ? new Date(startDate) : new Date(-8640000000000000);
      const dEnd = endDate ? new Date(endDate) : new Date(8640000000000000);
      return d >= dStart && d <= dEnd;
    });

    const sorted = byDate.sort((a, b) => {
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
    return sorted;
  }, [transactions, query, sortKey, sortDir, typeFilter, minValue, maxValue, startDate, endDate]);

  // Notify parent AFTER render to avoid setState during render warning
  useEffect(() => {
    if (onViewChange) {
      onViewChange(filtered);
    }
  }, [filtered, onViewChange]);

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

      {/* Advanced filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <div className="col-span-1">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="debit">Débito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Data inicial" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Data final" />
        <Input type="text" inputMode="decimal" placeholder="Valor mínimo" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
        <Input type="text" inputMode="decimal" placeholder="Valor máximo" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
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

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    'Alimentação': Utensils,
    'Transporte': Car,
    'Moradia': Home,
    'Saúde': Heart,
    'Educação': GraduationCap,
    'Entretenimento': Gamepad2,
    'Compras': ShoppingCart,
    'Contas': Building,
    'Restaurantes': Coffee,
    'Combustível': Fuel,
    'Tecnologia': Smartphone,
    'Viagem': Plane,
    'Música': Music,
    'Fotografia': Camera,
    'Livros': Book,
    'Fitness': Dumbbell,
    'Medicina': Stethoscope,
    'Beleza': Scissors,
    'Roupas': Shirt,
    'Trabalho': Briefcase,
    'Social': Users,
    'Localização': MapPin,
    'Presentes': Gift,
    'Investimentos': TrendingUp,
    'Transferência': ArrowUpDown,
    'Salário': DollarSign,
    'Cartão': CreditCard,
    'Dinheiro': Banknote,
    'Conta': Wallet,
    'default': Activity
  };
  
  const IconComponent = iconMap[category] || iconMap.default;
  return <IconComponent className="w-4 h-4" />;
};

const getTransactionTypeIcon = (type: string, amount: number) => {
  if (amount > 0) {
    return <TrendingUp className="w-4 h-4 text-green-600" />;
  } else {
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  }
};

const getAmountColor = (amount: number) => {
  return amount > 0 
    ? "text-green-600 dark:text-green-400" 
    : "text-red-600 dark:text-red-400";
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const getRelativeDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Hoje";
    if (diffInDays === 1) return "Ontem";
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} meses atrás`;
    return `${Math.floor(diffInDays / 365)} anos atrás`;
  } catch {
    return "";
  }
};

interface TransactionsTableProps {
  transactions: Transaction[];
  onViewChange?: (visibleTransactions: Transaction[]) => void;
}

export function TransactionsTable({ transactions, onViewChange }: TransactionsTableProps) {
  const { toast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Transaction>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [groupBy, setGroupBy] = useState<"none" | "date" | "category" | "type">("none");

  // Advanced filtering and search
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Text search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.memo?.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower);

      // Category filter
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.includes(transaction.category);

      // Type filter
      const matchesType = selectedTypes.length === 0 || 
        selectedTypes.includes(transaction.amount > 0 ? "credit" : "debit");

      // Date range filter
      const matchesDateRange = !dateRange.from || !dateRange.to || 
        isWithinInterval(parseISO(transaction.date), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to)
        });

      // Amount range filter
      const matchesAmountRange = 
        (!amountRange.min || Math.abs(transaction.amount) >= amountRange.min) &&
        (!amountRange.max || Math.abs(transaction.amount) <= amountRange.max);

      return matchesSearch && matchesCategory && matchesType && matchesDateRange && matchesAmountRange;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "amount") {
        aValue = Math.abs(aValue as number);
        bValue = Math.abs(bValue as number);
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [transactions, searchTerm, sortField, sortDirection, selectedCategories, selectedTypes, dateRange, amountRange]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  // Get unique values for filters
  const uniqueCategories = useMemo(() => 
    [...new Set(transactions.map(t => t.category))].sort()
  , [transactions]);

  // Statistics
  const stats = useMemo(() => {
    const visible = filteredAndSortedTransactions;
    const totalCredits = visible.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = visible.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const balance = totalCredits - totalDebits;
    const avgTransaction = visible.length > 0 ? visible.reduce((sum, t) => sum + Math.abs(t.amount), 0) / visible.length : 0;
    
    return {
      total: visible.length,
      credits: totalCredits,
      debits: totalDebits,
      balance,
      avgTransaction
    };
  }, [filteredAndSortedTransactions]);

  // Notify parent component of visible transactions
  useEffect(() => {
    onViewChange?.(filteredAndSortedTransactions);
  }, [filteredAndSortedTransactions, onViewChange]);

  // Handlers
  const handleSort = useCallback((field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const handleSelectTransaction = useCallback((transactionId: string, selected: boolean) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(transactionId);
      } else {
        newSet.delete(transactionId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedTransactions(new Set(paginatedTransactions.map(t => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  }, [paginatedTransactions]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedTypes([]);
    setDateRange({});
    setAmountRange({});
    setCurrentPage(1);
    toast({
      title: "🧹 Filtros limpos",
      description: "Todos os filtros foram removidos",
      duration: 2000,
    });
  }, [toast]);

  const exportSelected = useCallback(() => {
    const selected = filteredAndSortedTransactions.filter(t => selectedTransactions.has(t.id));
    if (selected.length === 0) {
      toast({
        title: "⚠️ Nenhuma transação selecionada",
        description: "Selecione pelo menos uma transação para exportar",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    toast({
      title: "📊 Exportando transações",
      description: `${selected.length} transações selecionadas`,
      duration: 3000,
    });
  }, [filteredAndSortedTransactions, selectedTransactions, toast]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Stats */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="w-6 h-6 text-primary" />
                Transações
                <Badge variant="secondary" className="ml-2">
                  {stats.total} de {transactions.length}
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn("hover-scale", showFilters && "bg-primary/10")}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showFilters ? "Ocultar" : "Mostrar"} filtros</p>
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="hover-scale">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualização
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Modo de visualização</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                      <DropdownMenuRadioItem value="table">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Tabela
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="cards">
                        <PieChart className="w-4 h-4 mr-2" />
                        Cards
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Agrupar por</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
                      <DropdownMenuRadioItem value="none">Nenhum</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="date">Data</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="category">Categoria</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="type">Tipo</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedTransactions.size > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={exportSelected}
                    className="bg-gradient-primary hover-scale"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar ({selectedTransactions.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Entradas
                </div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.credits)}
                </div>
              </div>
              
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                  <TrendingDown className="w-3 h-3" />
                  Saídas
                </div>
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.debits)}
                </div>
              </div>
              
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" />
                  Saldo
                </div>
                <div className={cn("font-semibold", getAmountColor(stats.balance))}>
                  {formatCurrency(stats.balance)}
                </div>
              </div>
              
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                  <Target className="w-3 h-3" />
                  Média
                </div>
                <div className="font-semibold">
                  {formatCurrency(stats.avgTransaction)}
                </div>
              </div>
              
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                  <Activity className="w-3 h-3" />
                  Total
                </div>
                <div className="font-semibold">
                  {stats.total}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="animate-fade-in-down">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros Avançados
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Descrição, categoria, valor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categorias</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedCategories.length > 0 
                          ? `${selectedCategories.length} selecionadas`
                          : "Todas as categorias"
                        }
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
                      {uniqueCategories.map(category => (
                        <DropdownMenuCheckboxItem
                          key={category}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories(prev => [...prev, category]);
                            } else {
                              setSelectedCategories(prev => prev.filter(c => c !== category));
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            {category}
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedTypes.length === 0 
                          ? "Todos os tipos"
                          : selectedTypes.length === 1
                            ? selectedTypes[0] === "credit" ? "Entradas" : "Saídas"
                            : "Ambos"
                        }
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuCheckboxItem
                        checked={selectedTypes.includes("credit")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTypes(prev => [...prev, "credit"]);
                          } else {
                            setSelectedTypes(prev => prev.filter(t => t !== "credit"));
                          }
                        }}
                      >
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                        Entradas
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={selectedTypes.includes("debit")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTypes(prev => [...prev, "debit"]);
                          } else {
                            setSelectedTypes(prev => prev.filter(t => t !== "debit"));
                          }
                        }}
                      >
                        <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                        Saídas
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {dateRange.from && dateRange.to 
                          ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
                          : "Selecionar período"
                        }
                        <Calendar className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => setDateRange(range || {})}
                        locale={ptBR}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor mínimo</label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={amountRange.min || ""}
                    onChange={(e) => setAmountRange(prev => ({ 
                      ...prev, 
                      min: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor máximo</label>
                  <Input
                    type="number"
                    placeholder="R$ 999.999,99"
                    value={amountRange.max || ""}
                    onChange={(e) => setAmountRange(prev => ({ 
                      ...prev, 
                      max: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table/Cards Content */}
        <Card>
          <CardContent className="p-0">
            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 text-left">
                        <Checkbox
                          checked={selectedTransactions.size === paginatedTransactions.length && paginatedTransactions.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      
                      {[
                        { key: "date", label: "Data", icon: Calendar },
                        { key: "description", label: "Descrição", icon: FileText },
                        { key: "category", label: "Categoria", icon: Target },
                        { key: "amount", label: "Valor", icon: DollarSign },
                      ].map(({ key, label, icon: Icon }) => (
                        <th key={key} className="p-4 text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort(key as keyof Transaction)}
                            className="font-semibold hover:bg-transparent"
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {label}
                            {sortField === key && (
                              sortDirection === "asc" 
                                ? <ChevronUp className="w-4 h-4 ml-2" />
                                : <ChevronDown className="w-4 h-4 ml-2" />
                            )}
                          </Button>
                        </th>
                      ))}
                      
                      <th className="p-4 text-left">Ações</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {paginatedTransactions.map((transaction, index) => (
                      <tr 
                        key={transaction.id}
                        className={cn(
                          "border-b hover:bg-muted/30 transition-colors",
                          selectedTransactions.has(transaction.id) && "bg-primary/5",
                          index % 2 === 0 && "bg-muted/10"
                        )}
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={selectedTransactions.has(transaction.id)}
                            onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                          />
                        </td>
                        
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatDate(transaction.date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getRelativeDate(transaction.date)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium line-clamp-2">
                              {transaction.description}
                            </div>
                            {transaction.memo && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {transaction.memo}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            {getCategoryIcon(transaction.category)}
                            {transaction.category}
                          </Badge>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getTransactionTypeIcon(transaction.type, transaction.amount)}
                            <span className={cn("font-semibold", getAmountColor(transaction.amount))}>
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Star className="w-4 h-4 mr-2" />
                                Favoritar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Cards View
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedTransactions.map((transaction) => (
                  <Card 
                    key={transaction.id}
                    className={cn(
                      "hover-lift transition-all duration-200 cursor-pointer",
                      selectedTransactions.has(transaction.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => handleSelectTransaction(
                      transaction.id, 
                      !selectedTransactions.has(transaction.id)
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(transaction.category)}
                          <Badge variant="secondary" className="text-xs">
                            {transaction.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {getTransactionTypeIcon(transaction.type, transaction.amount)}
                          <span className={cn("font-bold text-lg", getAmountColor(transaction.amount))}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold line-clamp-2 mb-1">
                          {transaction.description}
                        </h4>
                        {transaction.memo && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {transaction.memo}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(transaction.date)}
                        </div>
                        <div>
                          {getRelativeDate(transaction.date)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens por página:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} de {filteredAndSortedTransactions.length} transações
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    
                    {totalPages > 5 && (
                      <>
                        <span className="text-muted-foreground">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredAndSortedTransactions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros ou termos de busca para encontrar as transações desejadas.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
