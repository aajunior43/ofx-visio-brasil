import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountInfo } from "./OFXParser";
import { useI18n } from "@/context/i18n";
import { formatCurrencyBRL } from "./OFXParser";

function mapType(t?: string, locale: string = "pt-BR") {
  const type = (t || "").toUpperCase();
  const isPT = locale === "pt-BR";
  if (type === "CHECKING") return isPT ? "Corrente" : "Checking";
  if (type === "SAVINGS") return isPT ? "Poupança" : "Savings";
  return t || "";
}

export function AccountCard({ account }: { account: AccountInfo }) {
  const { locale, t } = useI18n();
  const bal = account.balance ?? 0;
  const positive = bal >= 0;

  return (
    <Card className="bg-card-grad shadow-elevate animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-hero" aria-hidden />
          {t("account_info")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="text-sm text-muted-foreground">{t("bank_id")}</div>
          <div className="text-base font-medium">{account.bankId || "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("account_id")}</div>
          <div className="text-base font-medium">{account.accountId || "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("account_type")}</div>
          <div className="text-base font-medium">{mapType(account.accountType, locale)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{t("balance")}</div>
          <div className={`text-xl font-bold flex items-center gap-2 ${positive ? "text-success" : "text-destructive"}`}>
            <DollarSign className="animate-pulse-soft" />
            {formatCurrencyBRL(bal)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
