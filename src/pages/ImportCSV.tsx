import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type ParsedRow = Record<string, string>;

export default function ImportCSV() {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImported(0);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("Arquivo vazio ou com apenas cabeçalho.");
        return;
      }

      // Detect separator
      const sep = lines[0].includes(";") ? ";" : ",";
      const hdrs = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(hdrs);

      const parsed: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: ParsedRow = {};
        hdrs.forEach((h, j) => (row[h] = vals[j] || ""));
        parsed.push(row);
      }
      setRows(parsed);

      // Auto-map common names
      const autoMap: Record<string, string> = {};
      const lower = hdrs.map((h) => h.toLowerCase());
      const dateIdx = lower.findIndex((h) => ["data", "date", "dt"].includes(h));
      const amountIdx = lower.findIndex((h) => ["valor", "amount", "vlr", "value"].includes(h));
      const descIdx = lower.findIndex((h) => ["descricao", "descrição", "description", "desc", "historico", "histórico"].includes(h));
      if (dateIdx >= 0) autoMap.date = hdrs[dateIdx];
      if (amountIdx >= 0) autoMap.amount = hdrs[amountIdx];
      if (descIdx >= 0) autoMap.description = hdrs[descIdx];
      setMapping(autoMap);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleImport = async () => {
    if (!mapping.date || !mapping.amount) {
      toast.error("Mapeie pelo menos Data e Valor.");
      return;
    }
    setImporting(true);
    let count = 0;

    try {
      const batch = rows.map((row) => {
        let rawAmount = row[mapping.amount].replace(/[R$\s]/g, "").replace(",", ".");
        const amount = Math.abs(parseFloat(rawAmount));
        if (isNaN(amount) || amount === 0) return null;

        const isExpense = rawAmount.startsWith("-") || parseFloat(rawAmount) < 0;

        // Parse date (dd/mm/yyyy or yyyy-mm-dd)
        let dateStr = row[mapping.date];
        if (dateStr.includes("/")) {
          const parts = dateStr.split("/");
          if (parts.length === 3) {
            dateStr = parts[2].length === 4
              ? `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
              : `20${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }

        return {
          user_id: user!.id,
          type: isExpense ? "expense" : "income",
          amount,
          date: dateStr,
          description: mapping.description ? row[mapping.description] || null : null,
          is_fixed: false,
        };
      }).filter(Boolean);

      // Insert in chunks of 50
      for (let i = 0; i < batch.length; i += 50) {
        const chunk = batch.slice(i, i + 50);
        const { error } = await supabase.from("transactions").insert(chunk as any);
        if (error) throw error;
        count += chunk.length;
      }

      setImported(count);
      toast.success(`${count} transações importadas com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          Importar Extrato CSV
        </h1>
        <p className="text-sm text-muted-foreground">Importe transações do seu banco automaticamente</p>
      </div>

      {/* Upload */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 transition-colors hover:border-primary/50 hover:bg-primary/10">
            <Upload className="h-10 w-10 text-primary mb-3" />
            <p className="text-sm font-medium">Clique para selecionar um arquivo CSV</p>
            <p className="text-xs text-muted-foreground mt-1">Suporta separadores vírgula (,) e ponto-e-vírgula (;)</p>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </label>
          {fileName && (
            <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> {fileName} — {rows.length} linhas encontradas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Column mapping */}
      {headers.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Mapeamento de Colunas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Select value={mapping.date || ""} onValueChange={(v) => setMapping((p) => ({ ...p, date: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Select value={mapping.amount || ""} onValueChange={(v) => setMapping((p) => ({ ...p, amount: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Select value={mapping.description || ""} onValueChange={(v) => setMapping((p) => ({ ...p, description: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Prévia (5 primeiras linhas):</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left">Data</th>
                        <th className="px-3 py-2 text-left">Valor</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => {
                        const rawVal = mapping.amount ? row[mapping.amount] : "";
                        const isNeg = rawVal.startsWith("-") || parseFloat(rawVal.replace(/[R$\s,]/g, "").replace(",", ".")) < 0;
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{mapping.date ? row[mapping.date] : "—"}</td>
                            <td className="px-3 py-2">{rawVal || "—"}</td>
                            <td className="px-3 py-2">{mapping.description ? row[mapping.description] : "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={isNeg ? "destructive" : "default"} className="text-[10px]">
                                {isNeg ? "Despesa" : "Receita"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleImport} disabled={importing || !mapping.date || !mapping.amount}>
                {importing ? "Importando..." : `Importar ${rows.length} transações`}
              </Button>
              {imported > 0 && (
                <span className="text-sm text-income flex items-center gap-1">
                  <Check className="h-4 w-4" /> {imported} importadas
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
