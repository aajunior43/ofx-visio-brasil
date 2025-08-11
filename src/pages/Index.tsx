import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Lock, 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  FileText, 
  Download, 
  Zap,
  Star,
  Crown,
  Activity,
  DollarSign,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Sun,
  Moon,
  Globe,
  Bookmark,
  Heart,
  Share2,
  Copy,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Upload,
  FolderOpen,
  Database,
  PieChart,
  LineChart,
  AreaChart,
  Layers,
  Grid,
  List,
  Table,
  Card as CardIcon,
  Layout,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  MoreVertical
} from "lucide-react";
import { Header } from "@/components/common/Header";
import { UploadArea } from "@/components/ofx/UploadArea";
import { AccountCard } from "@/components/ofx/AccountCard";
import { TransactionsTable } from "@/components/ofx/TransactionsTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ChartsPanel } from "@/components/dashboard/ChartsPanel";
import { ExportCSVButton } from "@/components/common/ExportCSVButton";
import { ExportPDFButton } from "@/components/common/ExportPDFButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OFXData, Transaction } from "@/components/ofx/OFXParser";
import { useI18n } from "@/context/i18n";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

interface AppState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  lastUpdated: Date | null;
  viewMode: "overview" | "detailed" | "analytics";
  isFullscreen: boolean;
  autoRefresh: boolean;
  notifications: boolean;
  theme: "light" | "dark" | "auto";
  language: "pt" | "en";
  favorites: string[];
  recentFiles: string[];
}

const DEFAULT_STATE: AppState = {
  isLoading: false,
  hasError: false,
  errorMessage: "",
  lastUpdated: null,
  viewMode: "overview",
  isFullscreen: false,
  autoRefresh: false,
  notifications: false,
  theme: "auto",
  language: "pt",
  favorites: [],
  recentFiles: []
};

const Index = () => {
  // Core state
  const [data, setData] = useState<OFXData | null>(null);
  const [visible, setVisible] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const { t } = useI18n();
  const { toast } = useToast();

  // Initialize app
  useEffect(() => {
    document.title = "🏦 Visualizador OFX | Análise Financeira Avançada";
    
    // Load saved state
    const savedState = localStorage.getItem("appState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setAppState(prev => ({ ...prev, ...parsed }));
      } catch {}
    }

    // Check for welcome dismissal
    const welcomeDismissed = localStorage.getItem("welcomeDismissed");
    if (welcomeDismissed) {
      setShowWelcome(false);
    }

    // Auto-load last session if enabled
    const autoLoad = localStorage.getItem("autoLoadLastSession");
    if (autoLoad === "true") {
      setTimeout(() => {
        onLoadLastSession();
      }, 1000);
    }
  }, []);

  // Save app state
  useEffect(() => {
    localStorage.setItem("appState", JSON.stringify(appState));
  }, [appState]);

  // Update filtered transactions when visible changes
  useEffect(() => {
    setFilteredTransactions(visible);
  }, [visible]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!data?.transactions) return null;
    
    const transactions = data.transactions;
    const totalCredits = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const balance = totalCredits - totalDebits;
    const avgTransaction = transactions.length > 0 ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length : 0;
    
    const categories = transactions.reduce((acc, t) => {
      const category = t.category || "Outros";
      if (!acc[category]) acc[category] = 0;
      acc[category] += Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = transactions.reduce((acc, t) => {
      const month = format(new Date(t.dtPosted), "yyyy-MM");
      if (!acc[month]) acc[month] = { credits: 0, debits: 0 };
      if (t.amount > 0) {
        acc[month].credits += t.amount;
      } else {
        acc[month].debits += Math.abs(t.amount);
      }
      return acc;
    }, {} as Record<string, { credits: number; debits: number }>);

    return {
      total: transactions.length,
      credits: totalCredits,
      debits: totalDebits,
      balance,
      avgTransaction,
      categories,
      monthlyData,
      period: transactions.length > 0 ? {
        start: new Date(transactions[0].dtPosted),
        end: new Date(transactions[transactions.length - 1].dtPosted)
      } : null
    };
  }, [data]);

  // Handlers
  const handleParsed = useCallback((d: OFXData) => {
    setAppState(prev => ({ ...prev, isLoading: true }));
    setLoadingProgress(0);

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    setTimeout(() => {
      setData(d);
      setVisible(d.transactions);
      setAppState(prev => ({ 
        ...prev, 
        isLoading: false, 
        hasError: false,
        lastUpdated: new Date()
      }));
      setLoadingProgress(100);
      
      // Save to localStorage
      localStorage.setItem("ofxData:last", JSON.stringify(d));
      
      // Show success notification
      toast({
        title: "✅ Arquivo processado com sucesso!",
        description: `${d.transactions.length} transações carregadas`,
        duration: 3000,
      });

      // Auto-hide welcome
      if (showWelcome) {
        setTimeout(() => {
          setShowWelcome(false);
          localStorage.setItem("welcomeDismissed", "true");
        }, 2000);
      }
    }, 1000);
  }, [toast, showWelcome]);

  const getCSV = useCallback(() => {
    const rows = [
      ["type", "date", "amount", "fitid", "description"],
      ...filteredTransactions.map((t) => [
        t.trnType, 
        t.dtPosted, 
        String(t.amount).replace(".", ","), 
        t.fitId, 
        (t.name || t.memo || "").replace(/\n|\r/g, " ")
      ])
    ];
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  }, [filteredTransactions]);

  const onLoadLastSession = useCallback(() => {
    const last = localStorage.getItem("ofxData:last");
    if (last) {
      try {
        const parsed: OFXData = JSON.parse(last);
        handleParsed(parsed);
        toast({
          title: "📂 Sessão anterior carregada",
          description: "Dados da última sessão foram restaurados",
          duration: 2000,
        });
      } catch {
        toast({
          title: "❌ Erro ao carregar sessão",
          description: "Não foi possível restaurar os dados anteriores",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else {
      toast({
        title: "ℹ️ Nenhuma sessão encontrada",
        description: "Não há dados salvos para restaurar",
        duration: 2000,
      });
    }
  }, [handleParsed, toast]);

  const onEnableNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      toast({
        title: "❌ Notificações não suportadas",
        description: "Seu navegador não suporta notificações",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setAppState(prev => ({ ...prev, notifications: true }));
      new Notification("🔔 Notificações ativadas", { 
        body: "Você receberá alertas importantes sobre suas finanças",
        icon: "/favicon.ico"
      });
      toast({
        title: "✅ Notificações ativadas",
        description: "Você receberá alertas importantes",
        duration: 2000,
      });
    } else {
      toast({
        title: "❌ Permissão negada",
        description: "Não foi possível ativar as notificações",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [toast]);

  const onClearData = useCallback(() => {
    setData(null);
    setVisible([]);
    setFilteredTransactions([]);
    setAppState(prev => ({ 
      ...prev, 
      lastUpdated: null,
      hasError: false,
      errorMessage: ""
    }));
    localStorage.removeItem("ofxData:last");
    toast({
      title: "🗑️ Dados limpos",
      description: "Todos os dados foram removidos",
      duration: 2000,
    });
  }, [toast]);

  const onRefreshData = useCallback(() => {
    if (data) {
      setAppState(prev => ({ ...prev, isLoading: true }));
      setTimeout(() => {
        setAppState(prev => ({ 
          ...prev, 
          isLoading: false,
          lastUpdated: new Date()
        }));
        toast({
          title: "🔄 Dados atualizados",
          description: "Informações foram recarregadas",
          duration: 2000,
        });
      }, 1000);
    }
  }, [data, toast]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem("welcomeDismissed", "true");
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <Header 
          onLoadLastSession={onLoadLastSession} 
          onEnableNotifications={onEnableNotifications}
          hasData={!!data}
          transactionCount={data?.transactions?.length || 0}
        />

        {/* Loading Progress */}
        <AnimatePresence>
          {appState.isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b"
            >
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Processando arquivo OFX...</span>
                      <span className="text-xs text-muted-foreground">{loadingProgress}%</span>
                    </div>
                    <Progress value={loadingProgress} className="h-2" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Banner */}
        <AnimatePresence>
          {showWelcome && !data && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-primary text-white relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="container mx-auto px-4 py-8 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      variants={floatingVariants}
                      animate="animate"
                      className="p-3 bg-white/20 rounded-full"
                    >
                      <Sparkles className="w-8 h-8" />
                    </motion.div>
                    <div>
                      <h1 className="text-2xl font-bold mb-1">
                        Bem-vindo ao Visualizador OFX
                      </h1>
                      <p className="text-white/90">
                        Analise seus extratos bancários com segurança e praticidade
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissWelcome}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Upload Section */}
            <motion.section 
              variants={itemVariants}
              aria-label="Upload de OFX"
            >
              <UploadArea onParsed={handleParsed} />
            </motion.section>

            {/* Quick Actions */}
            {data && (
              <motion.section 
                variants={itemVariants}
                className="flex flex-wrap items-center gap-3"
              >
                <Badge variant="secondary" className="flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  {data.transactions.length} transações
                </Badge>
                
                {stats?.period && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {format(stats.period.start, "dd/MM/yy")} - {format(stats.period.end, "dd/MM/yy")}
                  </Badge>
                )}

                {appState.lastUpdated && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" />
                    Atualizado {format(appState.lastUpdated, "HH:mm")}
                  </Badge>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefreshData}
                        className="hover-scale"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Atualizar dados</p>
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="hover-scale">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsHelpOpen(true)}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Ajuda
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onClearData} className="text-destructive">
                        <X className="w-4 h-4 mr-2" />
                        Limpar dados
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.section>
            )}

            {/* Data Sections */}
            <AnimatePresence mode="wait">
              {data && (
                <motion.section 
                  key="data-content"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-8"
                >
                  {/* Account Card */}
                  <motion.div variants={itemVariants}>
                    <AccountCard account={data.account} />
                  </motion.div>

                  {/* Summary Cards */}
                  <motion.div variants={itemVariants}>
                    <SummaryCards transactions={data.transactions} />
                  </motion.div>

                  {/* Charts Panel */}
                  <motion.div variants={itemVariants}>
                    <ChartsPanel transactions={data.transactions} />
                  </motion.div>

                  {/* Transactions Table */}
                  <motion.div 
                    variants={itemVariants}
                    aria-label="Tabela de transações"
                  >
                    <TransactionsTable 
                      transactions={data.transactions} 
                      onViewChange={setVisible}
                    />
                  </motion.div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!data && !appState.isLoading && (
              <motion.div
                variants={itemVariants}
                className="text-center py-16"
              >
                <motion.div
                  variants={pulseVariants}
                  animate="animate"
                  className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6"
                >
                  <Upload className="w-10 h-10 text-muted-foreground" />
                </motion.div>
                <h2 className="text-2xl font-semibold mb-2">
                  Pronto para começar?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Faça upload do seu arquivo OFX para visualizar e analisar suas transações bancárias
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Button onClick={onLoadLastSession} variant="outline">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Carregar última sessão
                  </Button>
                  <Button onClick={() => setIsHelpOpen(true)} variant="ghost">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Como usar?
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-green-600" />
                <span>{t("private_badge")}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Processamento 100% local</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Desenvolvido por Aleksandro Alves</span>
                <Separator orientation="vertical" className="h-4" />
                <span>v2.0.0</span>
              </div>
            </div>
          </div>
        </footer>

        {/* Export Buttons */}
        <AnimatePresence>
          {data?.transactions?.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
            >
              <ExportPDFButton 
                account={data.account} 
                transactions={data.transactions}
                filteredTransactions={filteredTransactions}
              />
              <ExportCSVButton getCSV={getCSV} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações
              </DialogTitle>
              <DialogDescription>
                Personalize sua experiência com o visualizador OFX
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preferências</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Carregamento automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Carregar automaticamente a última sessão
                    </p>
                  </div>
                  <Switch
                    checked={localStorage.getItem("autoLoadLastSession") === "true"}
                    onCheckedChange={(checked) => {
                      localStorage.setItem("autoLoadLastSession", checked.toString());
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas sobre suas finanças
                    </p>
                  </div>
                  <Switch
                    checked={appState.notifications}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onEnableNotifications();
                      } else {
                        setAppState(prev => ({ ...prev, notifications: false }));
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Atualização automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Atualizar dados periodicamente
                    </p>
                  </div>
                  <Switch
                    checked={appState.autoRefresh}
                    onCheckedChange={(checked) => {
                      setAppState(prev => ({ ...prev, autoRefresh: checked }));
                    }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsSettingsOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Help Dialog */}
        <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Como usar o Visualizador OFX
              </DialogTitle>
              <DialogDescription>
                Guia completo para aproveitar ao máximo suas análises financeiras
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">🚀 Primeiros passos</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[24px] h-6">1</Badge>
                    <p className="text-sm">Baixe seu arquivo OFX do internet banking</p>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[24px] h-6">2</Badge>
                    <p className="text-sm">Arraste o arquivo para a área de upload ou clique para selecionar</p>
                  </div>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="min-w-[24px] h-6">3</Badge>
                    <p className="text-sm">Aguarde o processamento e explore suas transações</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">📊 Recursos disponíveis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold">Gráficos interativos</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visualize tendências e padrões de gastos
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold">Exportação avançada</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Exporte relatórios em PDF, Excel e CSV
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold">Filtros inteligentes</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Filtre por data, valor, categoria e mais
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold">100% seguro</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Processamento local, sem envio de dados
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">🏦 Bancos compatíveis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {[
                    "Banco do Brasil", "Bradesco", "Itaú", "Santander", 
                    "Caixa Econômica", "Nubank", "Inter", "C6 Bank",
                    "BTG Pactual", "Sicoob", "Sicredi", "Banrisul"
                  ].map(bank => (
                    <div key={bank} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span>{bank}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsHelpOpen(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default Index;
