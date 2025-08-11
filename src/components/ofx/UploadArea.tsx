import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ErrorModal } from "@/components/common/ErrorModal";
import { parseOFX, OFXData } from "./OFXParser";
import { useI18n } from "@/context/i18n";

interface UploadAreaProps {
  onParsed: (data: OFXData) => void;
}

export function UploadArea({ onParsed }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleChoose = () => inputRef.current?.click();

  const simulateProgress = () => {
    setProgress(0);
    setLoading(true);
    const start = Date.now();
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setLoading(false);
          return 100;
        }
        const elapsed = Date.now() - start;
        const next = Math.min(100, p + 5 + Math.random() * 10 * (elapsed < 800 ? 1.5 : 0.8));
        return next;
      });
    }, 120);
    return timer;
  };

  const onFile = async (file: File) => {
    const reader = new FileReader();
    const timer = simulateProgress();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const data = parseOFX(text);
        localStorage.setItem("ofxData:last", JSON.stringify(data));
        onParsed(data);
        toast({ title: t("success_loaded"), description: file.name, duration: 3000 });
      } catch (e) {
        console.error(e);
        setError(t("invalid_ofx"));
      } finally {
        clearInterval(timer);
        setProgress(100);
        setTimeout(() => setLoading(false), 400);
      }
    };
    reader.onerror = () => {
      clearInterval(timer);
      setError(t("upload_error"));
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full py-16 flex flex-col items-center justify-center bg-card-grad rounded-xl shadow-soft animate-enter">
      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.xml,text/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <Button
        variant="hero"
        size="xl"
        onClick={handleChoose}
        className="pulse hover-scale"
        aria-label={t("upload_ofx")}
      >
        <UploadCloud /> {t("upload_ofx")}
      </Button>
      {loading && (
        <div className="w-full max-w-xl mt-8">
          <div className="flex items-center gap-2 text-sm mb-2 text-info-foreground">
            <CheckCircle2 className="opacity-0" />
            <span>{t("processing")}</span>
          </div>
          <Progress value={progress} className="h-3 bg-secondary" />
        </div>
      )}
      <ErrorModal
        open={!!error}
        title={t("upload_error")}
        description={error || ''}
        onClose={() => setError(null)}
        onRetry={() => {
          setError(null);
          handleChoose();
        }}
        retryLabel={t("try_again")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}
