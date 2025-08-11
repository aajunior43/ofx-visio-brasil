import { useRef, useState, useCallback, useEffect } from "react";
import { 
  UploadCloud, 
  CheckCircle2, 
  FileText, 
  AlertCircle, 
  Download,
  Zap,
  Shield,
  Clock,
  FileCheck,
  Loader2,
  RefreshCw,
  Info,
  Sparkles,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ErrorModal } from "@/components/common/ErrorModal";
import { parseOFX, OFXData } from "./OFXParser";
import { useI18n } from "@/context/i18n";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface UploadAreaProps {
  onParsed: (data: OFXData) => void;
}

export function UploadArea({ onParsed }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleChoose = () => inputRef.current?.click();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Validar tipo de arquivo
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (fileExtension !== 'ofx') {
      return { 
        valid: false, 
        error: 'Apenas arquivos OFX são aceitos. Verifique se o arquivo tem a extensão .ofx' 
      };
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { 
        valid: false, 
        error: 'Arquivo muito grande. O tamanho máximo é 10MB.' 
      };
    }

    // Validar se não está vazio
    if (file.size === 0) {
      return { 
        valid: false, 
        error: 'Arquivo está vazio.' 
      };
    }

    return { valid: true };
  }, []);

  const simulateProgress = () => {
    setProgress(0);
    setLoading(true);
    setUploadSuccess(false);
    
    const stages = [
      "Validando arquivo...",
      "Lendo conteúdo...",
      "Analisando transações...",
      "Organizando dados...",
      "Finalizando..."
    ];
    
    let stageIndex = 0;
    setProcessingStage(stages[0]);
    
    const start = Date.now();
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setLoading(false);
          setUploadSuccess(true);
          setProcessingStage("Concluído!");
          
          // Reset success state after 3 seconds
          setTimeout(() => {
            setUploadSuccess(false);
            setFileInfo(null);
            setProcessingStage("");
          }, 3000);
          
          return 100;
        }
        
        const elapsed = Date.now() - start;
        const next = Math.min(100, p + 5 + Math.random() * 10 * (elapsed < 800 ? 1.5 : 0.8));
        
        // Update stage based on progress
        const newStageIndex = Math.floor((next / 100) * stages.length);
        if (newStageIndex !== stageIndex && newStageIndex < stages.length) {
          stageIndex = newStageIndex;
          setProcessingStage(stages[stageIndex]);
        }
        
        return next;
      });
    }, 100);
    
    return timer;
  };

  const onFile = async (file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido');
      toast({
        title: "❌ Arquivo inválido",
        description: validation.error,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setFileInfo({ name: file.name, size: file.size });
    
    const reader = new FileReader();
    const timer = simulateProgress();
    
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const data = parseOFX(text);
        localStorage.setItem("ofxData:last", JSON.stringify(data));
        onParsed(data);
        
        toast({ 
          title: "✅ Arquivo processado com sucesso!", 
          description: `${file.name} - ${data.transactions.length} transações encontradas`,
          duration: 4000 
        });
      } catch (e) {
        console.error(e);
        setError(t("invalid_ofx"));
        toast({
          title: "❌ Erro no processamento",
          description: "Não foi possível processar o arquivo OFX",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        clearInterval(timer);
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      clearInterval(timer);
      setLoading(false);
      setError("Erro ao ler o arquivo");
      toast({
        title: "❌ Erro de leitura",
        description: "Não foi possível ler o arquivo",
        variant: "destructive",
        duration: 5000,
      });
    };
    
    reader.readAsText(file);
  };

  const onDropFiles = (files: FileList | null) => {
    setDragOver(false);
    setDragCounter(0);
    const f = files?.[0];
    if (f) onFile(f);
  };

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setDragOver(false);
      }
      return newCount;
    });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const resetUpload = () => {
    setError(null);
    setFileInfo(null);
    setProgress(0);
    setProcessingStage("");
    setUploadSuccess(false);
  };

  return (
    <TooltipProvider>
      <div className="w-full space-y-6">
        {/* Main Upload Area */}
        <Card className={cn(
          "relative overflow-hidden transition-all duration-500 ease-out border-2",
          dragOver 
            ? "border-primary bg-primary/5 shadow-xl scale-[1.02] shadow-primary/20" 
            : uploadSuccess
              ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-lg"
              : loading
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg"
                : "border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 hover-lift",
          !loading && !uploadSuccess && "cursor-pointer"
        )}>
          <CardContent className="p-0">
            <div
              className="relative p-12 text-center space-y-6"
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={(e) => {
                e.preventDefault();
                onDropFiles(e.dataTransfer.files);
              }}
              onClick={!loading && !uploadSuccess ? handleChoose : undefined}
            >
              {/* Background Effects */}
              <div className={cn(
                "absolute inset-0 transition-all duration-500",
                dragOver && "bg-gradient-primary opacity-10 animate-shimmer",
                uploadSuccess && "bg-gradient-success opacity-10",
                loading && "bg-gradient-info opacity-10"
              )} />
              
              {/* Floating Elements */}
              {dragOver && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="absolute top-8 right-8 w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="absolute bottom-6 left-8 w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <div className="absolute bottom-4 right-4 w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
                </div>
              )}

              {/* Main Icon */}
              <div className="relative mx-auto">
                <div className={cn(
                  "w-24 h-24 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 relative",
                  uploadSuccess 
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shadow-lg animate-bounce" 
                    : loading
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-lg"
                      : dragOver 
                        ? "bg-primary text-primary-foreground shadow-xl animate-pulse" 
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow-lg"
                )}>
                  {uploadSuccess ? (
                    <CheckCircle2 className="w-12 h-12" />
                  ) : loading ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : dragOver ? (
                    <Download className="w-12 h-12 animate-bounce" />
                  ) : (
                    <UploadCloud className="w-12 h-12" />
                  )}
                </div>
                
                {/* Status Indicators */}
                {!loading && !uploadSuccess && !dragOver && (
                  <>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-success rounded-full flex items-center justify-center animate-pulse" style={{ animationDelay: '0.5s' }}>
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  </>
                )}
              </div>

              {/* Text Content */}
              <div className="space-y-4">
                <h3 className={cn(
                  "text-2xl font-bold transition-all duration-300",
                  uploadSuccess ? "text-green-600 dark:text-green-400" : 
                  loading ? "text-blue-600 dark:text-blue-400" :
                  dragOver ? "text-primary" : "text-foreground"
                )}>
                  {uploadSuccess ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-6 h-6" />
                      Arquivo processado!
                    </span>
                  ) : loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Processando arquivo...
                    </span>
                  ) : dragOver ? (
                    <span className="flex items-center justify-center gap-2">
                      <Download className="w-6 h-6" />
                      Solte o arquivo aqui!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      Carregar arquivo OFX
                    </span>
                  )}
                </h3>
                
                <p className="text-muted-foreground max-w-md mx-auto text-lg">
                  {uploadSuccess 
                    ? 'Seus dados financeiros foram carregados com sucesso!'
                    : loading
                      ? processingStage || 'Aguarde enquanto processamos seus dados financeiros'
                      : dragOver
                        ? 'Solte seu arquivo OFX para começar a análise financeira'
                        : 'Arraste e solte seu arquivo OFX aqui ou clique para selecionar'
                  }
                </p>

                {/* File Info */}
                {fileInfo && (loading || uploadSuccess) && (
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 max-w-md mx-auto">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{fileInfo.name}</span>
                    <span>•</span>
                    <span>{formatFileSize(fileInfo.size)}</span>
                  </div>
                )}

                {/* Requirements */}
                {!loading && !uploadSuccess && (
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    <Badge variant="secondary" className="flex items-center gap-1 hover-scale">
                      <FileText className="w-3 h-3" />
                      Formato .OFX
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1 hover-scale">
                      <Shield className="w-3 h-3" />
                      Máx 10MB
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1 hover-scale">
                      <Clock className="w-3 h-3" />
                      Processamento rápido
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1 hover-scale">
                      <TrendingUp className="w-3 h-3" />
                      Análise inteligente
                    </Badge>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!loading && !uploadSuccess && !dragOver && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                  <Button 
                    variant="default" 
                    size="lg"
                    className="bg-gradient-primary hover:shadow-xl transition-all duration-300 hover-scale text-white font-semibold px-8"
                    onClick={handleChoose}
                  >
                    <UploadCloud className="w-5 h-5 mr-2" />
                    Selecionar Arquivo OFX
                  </Button>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="lg" className="hover-scale">
                        <Info className="w-4 h-4 mr-2" />
                        Como obter arquivo OFX?
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4">
                      <div className="space-y-2">
                        <p className="font-semibold">Como baixar arquivo OFX:</p>
                        <p className="text-sm">1. Acesse o internet banking do seu banco</p>
                        <p className="text-sm">2. Vá para a seção de extratos</p>
                        <p className="text-sm">3. Procure por "Exportar OFX" ou "Download OFX"</p>
                        <p className="text-sm">4. Selecione o período desejado</p>
                        <p className="text-sm">5. Faça o download do arquivo</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Progress Bar */}
              {loading && (
                <div className="space-y-3 max-w-md mx-auto">
                  <Progress 
                    value={progress} 
                    className="w-full h-3 bg-muted/50" 
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{processingStage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}

              {/* Success Actions */}
              {uploadSuccess && (
                <div className="flex justify-center gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetUpload}
                    className="hover-scale"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Carregar outro arquivo
                  </Button>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={inputRef}
                type="file"
                accept=".ofx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro no processamento</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>{error}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setError(null);
                    handleChoose();
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Tentar outro arquivo
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setError(null)}
                >
                  Fechar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Help Section */}
        <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-dashed border-muted-foreground/20">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Info className="w-6 h-6 text-primary" />
              </div>
              
              <h4 className="font-semibold text-lg">Bancos compatíveis</h4>
              
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Nosso sistema é compatível com arquivos OFX de todos os principais bancos brasileiros.
                Procure por "Extrato OFX" ou "Exportar transações" no seu internet banking.
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="outline" className="hover-scale">🏦 Banco do Brasil</Badge>
                <Badge variant="outline" className="hover-scale">🏦 Itaú</Badge>
                <Badge variant="outline" className="hover-scale">🏦 Bradesco</Badge>
                <Badge variant="outline" className="hover-scale">🏦 Santander</Badge>
                <Badge variant="outline" className="hover-scale">🏦 Caixa</Badge>
                <Badge variant="outline" className="hover-scale">💜 Nubank</Badge>
                <Badge variant="outline" className="hover-scale">🟣 Inter</Badge>
                <Badge variant="outline" className="hover-scale">🟡 Banco Original</Badge>
              </div>

              <div className="pt-4 border-t border-muted-foreground/10">
                <p className="text-xs text-muted-foreground">
                  🔒 Seus dados são processados localmente no seu navegador e não são enviados para nossos servidores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legacy Error Modal */}
        <ErrorModal
          open={false}
          title={t("upload_error")}
          description=""
          onClose={() => {}}
          onRetry={() => {}}
          retryLabel={t("try_again")}
          cancelLabel={t("cancel")}
        />
      </div>
    </TooltipProvider>
  );
}
