import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportCSVButtonProps {
  getCSV: () => string;
}

export function ExportCSVButton({ getCSV }: ExportCSVButtonProps) {
  const handleExport = () => {
    const csv = getCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transacoes-ofx-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        variant="floating"
        size="xl"
        className="pulse hover-scale"
        onClick={handleExport}
        aria-label="Exportar CSV"
      >
        <Download />
      </Button>
    </div>
  );
}
