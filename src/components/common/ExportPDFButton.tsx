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

export function ExportPDFButton({ account, transactions }: ExportPDFButtonProps) {
  const generate = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("PREFEITURA DE INAJÁ", pageWidth / 2, 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("Relatório de Extrato OFX", pageWidth / 2, 60, { align: 'center' });

    // Account info
    let y = 90;
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

    // Table
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
      didDrawPage: (data) => {
        // Header per page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text("PREFEITURA DE INAJÁ", pageWidth / 2, 30, { align: 'center' });
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
