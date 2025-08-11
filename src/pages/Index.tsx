import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/common/Header";
import { UploadArea } from "@/components/ofx/UploadArea";
import { AccountCard } from "@/components/ofx/AccountCard";
import { TransactionsTable } from "@/components/ofx/TransactionsTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ChartsPanel } from "@/components/dashboard/ChartsPanel";
import { ExportCSVButton } from "@/components/common/ExportCSVButton";
import { ExportPDFButton } from "@/components/common/ExportPDFButton";
import { OFXData, Transaction } from "@/components/ofx/OFXParser";
import { useI18n } from "@/context/i18n";
import { Lock } from "lucide-react";

const Index = () => {
  const [data, setData] = useState<OFXData | null>(null);
  const [visible, setVisible] = useState<Transaction[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    document.title = "Visualizador OFX | Extratos Bancários (pt‑BR)";
  }, []);

  const handleParsed = (d: OFXData) => {
    setData(d);
    setVisible(d.transactions);
  };

  const getCSV = () => {
    const rows = [
      ["type", "date", "amount", "fitid", "description"],
      ...visible.map((t) => [t.trnType, t.dtPosted, String(t.amount).replace(".", ","), t.fitId, (t.name || t.memo || "").replace(/\n|\r/g, " ")])
    ];
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const onLoadLastSession = () => {
    const last = localStorage.getItem("ofxData:last");
    if (last) {
      try {
        const parsed: OFXData = JSON.parse(last);
        setData(parsed);
        setVisible(parsed.transactions);
      } catch {}
    }
  };

  const onEnableNotifications = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("Notificações ativadas", { body: "Alertas de saldo baixo serão exibidos aqui." });
    }
  };

  return (
    <div>
      <Header onLoadLastSession={onLoadLastSession} onEnableNotifications={onEnableNotifications} />
      <main className="container mx-auto px-4 py-8">
        <section aria-label="Upload de OFX" className="mb-8">
          <UploadArea onParsed={handleParsed} />
        </section>

        {data && (
          <section className="space-y-6">
            <AccountCard account={data.account} />
            <SummaryCards transactions={data.transactions} />
            <ChartsPanel transactions={data.transactions} />
            <div aria-label="Tabela de transações">
              <TransactionsTable transactions={data.transactions} onViewChange={setVisible} />
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 py-8 text-center text-sm text-muted-foreground border-t">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <Lock className="opacity-70" /> {t("private_badge")}
        </div>
      </footer>

      {data?.transactions?.length ? (
        <>
          <ExportCSVButton getCSV={getCSV} />
          <ExportPDFButton account={data.account} transactions={visible} />
        </>
      ) : null}
    </div>
  );
};

export default Index;
