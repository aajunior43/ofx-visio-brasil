import { useState, useCallback, useMemo } from "react";
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  Settings,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Activity,
  DollarSign,
  Target,
  Clock,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Printer,
  Share2,
  Eye,
  Palette,
  Layout,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Sparkles,
  Crown,
  Star
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AccountInfo, Transaction } from "@/components/ofx/OFXParser";
import { formatCurrencyBRL, formatDateBRL } from "@/components/ofx/OFXParser";

interface ExportConfig {
  format: "pdf" | "excel" | "csv" | "json";
  template: "standard" | "detailed" | "summary" | "financial" | "custom";
  includeCharts: boolean;
  includeStats: boolean;
  includeFilters: boolean;
  dateRange: { from?: Date; to?: Date };
  categories: string[];
  groupBy: "none" | "date" | "category" | "type";
  sortBy: "date" | "amount" | "category" | "description";
  sortOrder: "asc" | "desc";
  pageSize: "A4" | "A3" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
  theme: "light" | "dark" | "blue" | "green" | "purple";
  logo?: string;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  customFields: {
    title: string;
    subtitle: string;
    footer: string;
    watermark: string;
  };
}

const DEFAULT_CONFIG: ExportConfig = {
  format: "pdf",
  template: "standard",
  includeCharts: true,
  includeStats: true,
  includeFilters: false,
  dateRange: {},
  categories: [],
  groupBy: "none",
  sortBy: "date",
  sortOrder: "desc",
  pageSize: "A4",
  orientation: "portrait",
  theme: "light",
  companyInfo: {
    name: "PREFEITURA DE INAJÁ",
    address: "Endereço da prefeitura",
    phone: "(87) 99999-9999",
    email: "contato@inaja.pe.gov.br",
    website: "www.inaja.pe.gov.br"
  },
  customFields: {
    title: "Relatório de Extrato OFX",
    subtitle: "Análise Financeira Detalhada",
    footer: "Documento gerado automaticamente pelo sistema",
    watermark: ""
  }
};

const EXPORT_TEMPLATES = {
  standard: {
    name: "Padrão",
    description: "Relatório básico com transações e estatísticas",
    icon: FileText,
    features: ["Transações", "Estatísticas básicas", "Filtros aplicados"]
  },
  detailed: {
    name: "Detalhado",
    description: "Relatório completo com gráficos e análises",
    icon: BarChart3,
    features: ["Transações", "Gráficos", "Análises", "Tendências", "Categorização"]
  },
  summary: {
    name: "Resumo",
    description: "Visão geral com principais métricas",
    icon: PieChart,
    features: ["Resumo executivo", "KPIs", "Gráficos principais"]
  },
  financial: {
    name: "Financeiro",
    description: "Relatório para análise financeira profissional",
    icon: TrendingUp,
    features: ["Análise de fluxo", "Projeções", "Indicadores", "Comparativos"]
  },
  custom: {
    name: "Personalizado",
    description: "Configure todos os aspectos do relatório",
    icon: Settings,
    features: ["Configuração completa", "Layout personalizado", "Campos customizados"]
  }
};

const THEME_COLORS = {
  light: { primary: [59, 130, 246], secondary: [100, 116, 139], accent: [16, 185, 129] },
  dark: { primary: [96, 165, 250], secondary: [148, 163, 184], accent: [52, 211, 153] },
  blue: { primary: [37, 99, 235], secondary: [71, 85, 105], accent: [14, 165, 233] },
  green: { primary: [5, 150, 105], secondary: [107, 114, 128], accent: [16, 185, 129] },
  purple: { primary: [124, 58, 237], secondary: [107, 114, 128], accent: [168, 85, 247] }
};

interface ExportPDFButtonProps {
  account: AccountInfo | null;
  transactions: Transaction[];
  filteredTransactions?: Transaction[];
  className?: string;
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ExportPDFButton({ 
  account, 
  transactions, 
  filteredTransactions = transactions,
  className 
}: ExportPDFButtonProps) {
  const { toast } = useToast();
  
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_CONFIG);

  // Statistics calculation
  const stats = useMemo(() => {
    const data = filteredTransactions;
    const totalCredits = data.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = data.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const balance = totalCredits - totalDebits;
    const avgTransaction = data.length > 0 ? data.reduce((sum, t) => sum + Math.abs(t.amount), 0) / data.length : 0;
    
    const categoryStats = data.reduce((acc, t) => {
      const category = t.category || "Outros";
      if (!acc[category]) {
        acc[category] = { count: 0, total: 0 };
      }
      acc[category].count++;
      acc[category].total += Math.abs(t.amount);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const monthlyStats = data.reduce((acc, t) => {
      const month = format(new Date(t.dtPosted), "yyyy-MM");
      if (!acc[month]) {
        acc[month] = { credits: 0, debits: 0, count: 0 };
      }
      if (t.amount > 0) {
        acc[month].credits += t.amount;
      } else {
        acc[month].debits += Math.abs(t.amount);
      }
      acc[month].count++;
      return acc;
    }, {} as Record<string, { credits: number; debits: number; count: number }>);

    return {
      total: data.length,
      credits: totalCredits,
      debits: totalDebits,
      balance,
      avgTransaction,
      categoryStats,
      monthlyStats
    };
  }, [filteredTransactions]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyBRL(amount);
  }, []);

  // Export functions
  const exportToPDF = useCallback(async () => {
    try {
      setExportProgress(10);
      
      const doc = new jsPDF({
        orientation: config.orientation,
        unit: 'pt',
        format: config.pageSize.toLowerCase() as any
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let yPosition = margin;

      // Theme colors
      const colors = THEME_COLORS[config.theme];

      setExportProgress(20);

      // Logo
      const logoUrl = "/lovable-uploads/a6fc81f6-f1ba-4ec7-a42b-84478275db32.png";
      let logoData: string | null = null;
      try { 
        logoData = await toDataUrl(logoUrl); 
        if (logoData) {
          const logoW = 64, logoH = 64;
          doc.addImage(logoData, 'PNG', pageWidth / 2 - logoW / 2, yPosition, logoW, logoH);
          yPosition += logoH + 20;
        }
      } catch {}

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colors.primary);
      doc.text(config.customFields.title, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 25;

      doc.setFontSize(14);
      doc.setTextColor(...colors.secondary);
      doc.text(config.customFields.subtitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 30;

      // Company info
      if (config.companyInfo.name) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(config.companyInfo.name, pageWidth - margin, margin, { align: 'right' });
        if (config.companyInfo.email) {
          doc.text(config.companyInfo.email, pageWidth - margin, margin + 15, { align: 'right' });
        }
        if (config.companyInfo.phone) {
          doc.text(config.companyInfo.phone, pageWidth - margin, margin + 30, { align: 'right' });
        }
      }

      setExportProgress(30);

      // Account info
      if (account) {
        doc.setFontSize(14);
        doc.setTextColor(...colors.primary);
        doc.text("Informações da Conta", margin, yPosition);
        yPosition += 20;

        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const accountLines = [
          `Banco: ${account.bankId || '—'}`,
          `Conta: ${account.accountId || '—'}`,
          `Tipo: ${account.accountType || '—'}`,
          `Saldo: ${typeof account.balance === 'number' ? formatCurrency(account.balance) : '—'}`,
        ];
        accountLines.forEach((line) => {
          doc.text(line, margin, yPosition);
          yPosition += 16;
        });
        yPosition += 20;
      }

      // Statistics section
      if (config.includeStats) {
        doc.setFontSize(14);
        doc.setTextColor(...colors.primary);
        doc.text("Resumo Financeiro", margin, yPosition);
        yPosition += 20;

        const statsData = [
          ["Total de Transações", stats.total.toString()],
          ["Total de Entradas", formatCurrency(stats.credits)],
          ["Total de Saídas", formatCurrency(stats.debits)],
          ["Saldo Líquido", formatCurrency(stats.balance)],
          ["Valor Médio", formatCurrency(stats.avgTransaction)]
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [["Métrica", "Valor"]],
          body: statsData,
          theme: 'grid',
          headStyles: { 
            fillColor: colors.primary,
            fontSize: 10,
            fontStyle: 'bold'
          },
          bodyStyles: { fontSize: 9 },
          margin: { left: margin, right: margin },
          tableWidth: pageWidth - (margin * 2)
        });

        yPosition = (doc as any).lastAutoTable.finalY + 30;
      }

      setExportProgress(50);

      // Transactions table
      doc.setFontSize(14);
      doc.setTextColor(...colors.primary);
      doc.text("Transações", margin, yPosition);
      yPosition += 20;

      const transactionData = filteredTransactions.map((t) => [
        (t.trnType || '').toUpperCase().includes('CREDIT') ? 'Crédito' : 'Débito',
        formatDateBRL(t.dtPosted),
        formatCurrency(t.amount),
        t.fitId || '',
        (t.name || t.memo || '').substring(0, 50) + ((t.name || t.memo || '').length > 50 ? "..." : ""),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Tipo", "Data", "Valor", "ID", "Descrição"]],
        body: transactionData,
        theme: 'striped',
        headStyles: { 
          fillColor: colors.primary,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 70 },
          2: { cellWidth: 80 },
          3: { cellWidth: 80 },
          4: { cellWidth: 'auto' }
        },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          const pageNum = data.pageNumber;
          doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
          if (config.customFields.footer) {
            doc.text(config.customFields.footer, pageWidth / 2, pageHeight - 15, { align: 'center' });
          }
          doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 
                   pageWidth - margin, pageHeight - 15, { align: 'right' });
        }
      });

      setExportProgress(90);

      // Save file
      const fileName = `relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      setExportProgress(100);

      toast({
        title: "✅ PDF exportado com sucesso!",
        description: `Arquivo ${fileName} foi baixado`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível gerar o PDF",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [config, filteredTransactions, stats, formatCurrency, toast, account]);

  const exportToExcel = useCallback(async () => {
    try {
      setExportProgress(20);

      const workbook = XLSX.utils.book_new();

      // Transactions sheet
      const transactionData = filteredTransactions.map(t => ({
        Data: formatDateBRL(t.dtPosted),
        Descrição: t.name || t.memo || '',
        Categoria: t.category || "Outros",
        Tipo: (t.trnType || '').toUpperCase().includes('CREDIT') ? 'Crédito' : 'Débito',
        Valor: t.amount,
        "Valor Formatado": formatCurrency(t.amount),
        ID: t.fitId || ''
      }));

      const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, "Transações");

      setExportProgress(50);

      // Statistics sheet
      if (config.includeStats) {
        const statsData = [
          { Métrica: "Total de Transações", Valor: stats.total },
          { Métrica: "Total de Entradas", Valor: stats.credits },
          { Métrica: "Total de Saídas", Valor: stats.debits },
          { Métrica: "Saldo Líquido", Valor: stats.balance },
          { Métrica: "Valor Médio", Valor: stats.avgTransaction }
        ];

        const statsSheet = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, "Estatísticas");
      }

      setExportProgress(80);

      // Category analysis sheet
      const categoryData = Object.entries(stats.categoryStats).map(([category, data]) => ({
        Categoria: category,
        "Quantidade": data.count,
        "Total": data.total,
        "Percentual": ((data.total / (stats.credits + stats.debits)) * 100).toFixed(2) + "%"
      }));

      const categorySheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, "Por Categoria");

      setExportProgress(90);

      // Save file
      const fileName = `relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setExportProgress(100);

      toast({
        title: "✅ Excel exportado com sucesso!",
        description: `Arquivo ${fileName} foi baixado`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível gerar o Excel",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [config, filteredTransactions, stats, formatCurrency, toast]);

  // Main export handler
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      switch (config.format) {
        case "pdf":
          await exportToPDF();
          break;
        case "excel":
          await exportToExcel();
          break;
        default:
          await exportToPDF();
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setIsOpen(false);
    }
  }, [config.format, exportToPDF, exportToExcel]);

  // Quick export handlers
  const quickExportPDF = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportToPDF();
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [exportToPDF]);

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Quick Export Button (Original Position) */}
        <div className="fixed bottom-24 right-6 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default" 
                size="xl" 
                onClick={quickExportPDF} 
                className="animate-bounce hover-scale bg-gradient-primary shadow-xl" 
                aria-label="Exportar PDF"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Zap className="w-6 h-6 animate-pulse" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Exportar PDF rápido</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Advanced Export Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hover-scale"
              disabled={isExporting}
            >
              <Settings className="w-4 h-4 mr-2" />
              Exportar Avançado
              {filteredTransactions.length !== transactions.length && (
                <Badge variant="secondary" className="ml-2">
                  {filteredTransactions.length}
                </Badge>
              )}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Exportar Relatório Avançado
              </DialogTitle>
              <DialogDescription>
                Configure e personalize seu relatório financeiro com opções avançadas
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="format" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="format">Formato</TabsTrigger>
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="info">Informações</TabsTrigger>
              </TabsList>

              {/* Format Tab */}
              <TabsContent value="format" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Formato de Exportação
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "pdf", label: "PDF", icon: FileText, description: "Documento portátil" },
                      { value: "excel", label: "Excel", icon: FileSpreadsheet, description: "Planilha editável" }
                    ].map(format => (
                      <Card 
                        key={format.value}
                        className={cn(
                          "cursor-pointer transition-all hover-lift",
                          config.format === format.value && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => setConfig(prev => ({ ...prev, format: format.value as any }))}
                      >
                        <CardContent className="p-4 text-center">
                          <format.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <h4 className="font-semibold">{format.label}</h4>
                          <p className="text-xs text-muted-foreground">{format.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tamanho da Página</Label>
                    <Select
                      value={config.pageSize}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, pageSize: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Orientação</Label>
                    <Select
                      value={config.orientation}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, orientation: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Retrato</SelectItem>
                        <SelectItem value="landscape">Paisagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Tema</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {Object.entries(THEME_COLORS).map(([theme, colors]) => (
                      <Card
                        key={theme}
                        className={cn(
                          "cursor-pointer transition-all hover-scale",
                          config.theme === theme && "ring-2 ring-primary"
                        )}
                        onClick={() => setConfig(prev => ({ ...prev, theme: theme as any }))}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="flex justify-center gap-1 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: `rgb(${colors.primary.join(',')})` }}
                            />
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: `rgb(${colors.secondary.join(',')})` }}
                            />
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: `rgb(${colors.accent.join(',')})` }}
                            />
                          </div>
                          <p className="text-xs font-medium capitalize">{theme}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Incluir no Relatório
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      { key: "includeStats", label: "Estatísticas e métricas", icon: BarChart3 },
                      { key: "includeCharts", label: "Gráficos e visualizações", icon: PieChart },
                      { key: "includeFilters", label: "Filtros aplicados", icon: Filter }
                    ].map(option => (
                      <div key={option.key} className="flex items-center space-x-3">
                        <Checkbox
                          id={option.key}
                          checked={config[option.key as keyof ExportConfig] as boolean}
                          onCheckedChange={(checked) => 
                            setConfig(prev => ({ ...prev, [option.key]: checked }))
                          }
                        />
                        <Label htmlFor={option.key} className="flex items-center gap-2 cursor-pointer">
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ordenar por</Label>
                    <Select
                      value={config.sortBy}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, sortBy: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="amount">Valor</SelectItem>
                        <SelectItem value="category">Categoria</SelectItem>
                        <SelectItem value="description">Descrição</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Ordem</Label>
                    <Select
                      value={config.sortOrder}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, sortOrder: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Crescente</SelectItem>
                        <SelectItem value="desc">Decrescente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Informações da Empresa
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="companyName">Nome da empresa</Label>
                        <Input
                          id="companyName"
                          value={config.companyInfo.name}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            companyInfo: { ...prev.companyInfo, name: e.target.value }
                          }))}
                          placeholder="PREFEITURA DE INAJÁ"
                        />
                      </div>

                      <div>
                        <Label htmlFor="companyPhone">Telefone</Label>
                        <Input
                          id="companyPhone"
                          value={config.companyInfo.phone}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            companyInfo: { ...prev.companyInfo, phone: e.target.value }
                          }))}
                          placeholder="(87) 99999-9999"
                        />
                      </div>

                      <div>
                        <Label htmlFor="companyEmail">E-mail</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          value={config.companyInfo.email}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            companyInfo: { ...prev.companyInfo, email: e.target.value }
                          }))}
                          placeholder="contato@inaja.pe.gov.br"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Resumo da Exportação
                    </h3>
                    
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Formato:</span>
                          <Badge variant="secondary">{config.format.toUpperCase()}</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Transações:</span>
                          <span className="font-semibold">{filteredTransactions.length}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Período:</span>
                          <span className="text-sm">
                            {filteredTransactions.length > 0 
                              ? `${format(new Date(filteredTransactions[0].dtPosted), "dd/MM/yy")} - ${format(new Date(filteredTransactions[filteredTransactions.length - 1].dtPosted), "dd/MM/yy")}`
                              : "N/A"
                            }
                          </span>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total de entradas:</span>
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(stats.credits)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total de saídas:</span>
                            <span className="text-sm font-semibold text-red-600">
                              {formatCurrency(stats.debits)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Saldo líquido:</span>
                            <span className={cn(
                              "text-sm font-semibold",
                              stats.balance >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(stats.balance)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExporting && (
                  <div className="flex items-center gap-2">
                    <Progress value={exportProgress} className="w-32" />
                    <span className="text-sm text-muted-foreground">
                      {exportProgress}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isExporting}
                >
                  Cancelar
                </Button>
                
                <Button
                  onClick={handleExport}
                  disabled={isExporting || filteredTransactions.length === 0}
                  className="bg-gradient-primary hover-scale"
                >
                  {isExporting ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar {config.format.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
