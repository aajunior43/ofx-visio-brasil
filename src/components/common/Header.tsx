import { Bell, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useI18n } from "@/context/i18n";

interface HeaderProps {
  onLoadLastSession: () => void;
  onEnableNotifications: () => void;
}

export function Header({ onLoadLastSession, onEnableNotifications }: HeaderProps) {
  const { t } = useI18n();
  const logo = "/lovable-uploads/a6fc81f6-f1ba-4ec7-a42b-84478275db32.png";
  return (
    <header className="w-full sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Brasão da Prefeitura de Inajá"
            className="h-9 w-auto object-contain drop-shadow-sm hover-scale"
            loading="eager"
            decoding="async"
          />
          <h1 className="text-lg font-semibold">{t("app_title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onLoadLastSession} aria-label={t("history")!}>
            <History />
          </Button>
          <Button variant="outline" size="icon" onClick={onEnableNotifications} aria-label={t("enable_notifications")!}>
            <Bell />
          </Button>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
