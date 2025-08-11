import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/i18n";
import { 
  History, 
  Bell, 
  Languages, 
  Moon, 
  Sun, 
  Search,
  Settings,
  User,
  HelpCircle,
  Download,
  Upload,
  BarChart3,
  TrendingUp,
  Filter,
  Calendar,
  RefreshCw,
  Zap,
  Star,
  Shield,
  Globe
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onLoadLastSession?: () => void;
  onEnableNotifications?: () => void;
  hasTransactions?: boolean;
  transactionCount?: number;
}

export function Header({ 
  onLoadLastSession, 
  onEnableNotifications, 
  hasTransactions = false,
  transactionCount = 0 
}: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Nova atualização disponível", time: "2 min", type: "info" },
    { id: 2, title: "Backup realizado com sucesso", time: "1h", type: "success" },
    { id: 3, title: "Análise mensal pronta", time: "3h", type: "warning" },
  ]);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
    
    toast({
      title: newTheme ? "🌙 Modo escuro ativado" : "☀️ Modo claro ativado",
      description: "Tema alterado com sucesso",
      duration: 2000,
    });
  };

  const toggleLanguage = () => {
    const newLocale = locale === 'pt-BR' ? 'en-US' : 'pt-BR';
    setLocale(newLocale);
    
    toast({
      title: newLocale === 'pt-BR' ? "🇧🇷 Português" : "🇺🇸 English",
      description: newLocale === 'pt-BR' ? "Idioma alterado para Português" : "Language changed to English",
      duration: 2000,
    });
  };

  const handleNotificationClick = (notificationId: number) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: "🔍 Busca realizada",
        description: `Procurando por: "${searchQuery}"`,
        duration: 3000,
      });
    }
  };

  const quickActions = [
    { icon: Upload, label: "Importar OFX", action: () => toast({ title: "📁 Importar arquivo", description: "Selecione um arquivo OFX" }) },
    { icon: Download, label: "Exportar dados", action: () => toast({ title: "💾 Exportar", description: "Dados exportados com sucesso" }) },
    { icon: BarChart3, label: "Relatórios", action: () => toast({ title: "📊 Relatórios", description: "Abrindo painel de relatórios" }) },
    { icon: RefreshCw, label: "Atualizar", action: () => window.location.reload() },
  ];

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg animate-float">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-success rounded-full animate-pulse-success"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gradient-primary">
                  OFX Visio Brasil
                </h1>
                <p className="text-xs text-muted-foreground">
                  Visualizador Financeiro Inteligente
                </p>
              </div>
            </div>
            
            {/* Status Badge */}
            {hasTransactions && (
              <Badge variant="secondary" className="hidden md:flex items-center gap-1 animate-fade-in">
                <TrendingUp className="w-3 h-3" />
                {transactionCount} transações
              </Badge>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar transações, categorias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 bg-muted/50 border-0 focus:bg-background transition-colors"
              />
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Quick Actions */}
            <div className="hidden lg:flex items-center space-x-1">
              {quickActions.map((action, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={action.action}
                      className="hover-scale"
                    >
                      <action.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* History Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadLastSession}
                  className="hover-scale"
                >
                  <History className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Carregar última sessão</p>
                <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
              </TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative hover-scale">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0 animate-pulse-error"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notificações</span>
                  <Badge variant="secondary">{unreadCount}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className="flex flex-col items-start p-3 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">{notification.title}</span>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                      <Badge variant={notification.type === 'success' ? 'default' : notification.type === 'warning' ? 'secondary' : 'outline'} className="mt-1">
                        {notification.type}
                      </Badge>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">Nenhuma notificação</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEnableNotifications}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar notificações
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleLanguage}
                  className="hover-scale"
                >
                  <Languages className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{locale === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}</p>
                <DropdownMenuShortcut>Ctrl+L</DropdownMenuShortcut>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="hover-scale"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isDark ? 'Modo claro' : 'Modo escuro'}</p>
                <DropdownMenuShortcut>Ctrl+T</DropdownMenuShortcut>
              </TooltipContent>
            </Tooltip>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover-scale">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Usuário</p>
                    <p className="text-xs text-muted-foreground">usuario@exemplo.com</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                  <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                </DropdownMenuItem>
                
                <DropdownMenuItem>
                  <Shield className="w-4 h-4 mr-2" />
                  Privacidade
                </DropdownMenuItem>
                
                <DropdownMenuItem>
                  <Star className="w-4 h-4 mr-2" />
                  Favoritos
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Ajuda e Suporte
                  <DropdownMenuShortcut>⌘?</DropdownMenuShortcut>
                </DropdownMenuItem>
                
                <DropdownMenuItem>
                  <Globe className="w-4 h-4 mr-2" />
                  Sobre
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem className="text-destructive">
                  <Zap className="w-4 h-4 mr-2" />
                  Sair
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 bg-muted/50 border-0"
            />
          </form>
        </div>

        {/* Progress Bar for Loading States */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary opacity-0 transition-opacity duration-300" id="loading-bar"></div>
      </header>
    </TooltipProvider>
  );
}
