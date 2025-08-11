import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const next = locale === "pt-BR" ? "en-US" : "pt-BR";
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Trocar idioma"
      onClick={() => setLocale(next)}
      className="hover-scale"
    >
      <Globe />
    </Button>
  );
}
