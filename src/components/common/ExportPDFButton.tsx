import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { AccountInfo, Transaction } from "@/components/ofx/OFXParser";
import { formatCurrencyBRL, formatDateBRL } from "@/components/ofx/OFXParser";

interface ExportPDFButtonProps {
  account: AccountInfo | null;
  transactions: Transaction[];
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

export function ExportPDFButton({ account, transactions }: ExportPDFButtonProps) {
  const generate = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const logoUrl = "/lovable-uploads/a6fc81f6-f1ba-4ec7-a42b-84478275db32.png";
    let logoData: string | null = null;
    try { logoData = await toDataUrl(logoUrl); } catch {}

    const drawHeader = () => {
      const logoW = 64, logoH = 64;
      if (logoData) {
        doc.addImage(logoData, 'PNG', pageWidth / 2 - logoW / 2, 20, logoW, logoH);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("PREFEITURA DE INAJÁ", pageWidth / 2, 100, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text("Relatório de Extrato OFX", pageWidth / 2, 118, { align: 'center' });
    };

    drawHeader();

    // Account info
    let y = 150;
    if (account) {
      doc.setFontSize(11);
      const lines = [
        `Banco: ${account.bankId || '—'}`,
        `Conta: ${account.accountId || '—'}`,
        `Tipo: ${account.accountType || '—'}`,
        `Saldo: ${typeof account.balance === 'number' ? formatCurrencyBRL(account.balance) : '—'}`,
      ];
      lines.forEach((t) => { doc.text(t, 40, y); y += 16; });
    }

    const head = [["Tipo", "Data", "Valor", "FITID", "Descrição"]];
    const body = transactions.map((t) => [
      (t.trnType || '').toUpperCase().includes('CREDIT') ? 'Crédito' : 'Débito',
      formatDateBRL(t.dtPosted),
      formatCurrencyBRL(t.amount),
      t.fitId,
      (t.name || t.memo || '').slice(0, 120),
    ]);

    autoTable(doc, {
      startY: y + 10,
      head,
      body,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [0, 51, 102] },
      didDrawPage: () => {
        // Header per page
        drawHeader();
        // Footer per page
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text("DEV ALEKSANDRO ALVES", pageWidth / 2, pageHeight - 20, { align: 'center' });
      },
    });

    doc.save(`extrato-ofx-${Date.now()}.pdf`);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <Button variant="info" size="xl" onClick={generate} className="animate-bounce hover-scale" aria-label="Exportar PDF">
        <FileText />
      </Button>
    </div>
  );
}
