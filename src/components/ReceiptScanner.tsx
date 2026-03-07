import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTransactions, useCategories } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface ParsedReceipt {
  amount: number;
  date: string;
  merchant: string;
  category: string;
  description?: string;
}

export function ReceiptScanner() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { addTransaction } = useTransactions(format(new Date(), "yyyy-MM"));

  const processImage = async (file: File) => {
    setLoading(true);
    setParsed(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          setPreview(result);
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("parse-receipt", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setParsed(data);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar comprovante");
    } finally {
      setLoading(false);
    }
  };

  const confirmTransaction = async () => {
    if (!parsed || !user) return;
    // Find matching category
    const cat = categories.find(
      (c) => c.name.toLowerCase() === parsed.category.toLowerCase() && c.type === "expense"
    ) || categories.find((c) => c.type === "expense");

    if (!cat) {
      toast.error("Nenhuma categoria encontrada");
      return;
    }

    await addTransaction.mutateAsync({
      type: "expense",
      amount: parsed.amount,
      category_id: cat.id,
      description: parsed.description || parsed.merchant,
      date: parsed.date,
      is_fixed: false,
      payment_method: "pix",
    });

    setParsed(null);
    setPreview(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setParsed(null); setPreview(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Camera className="mr-2 h-4 w-4" />
          Escanear Comprovante
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leitura de Comprovante</DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analisando comprovante com IA...</p>
                </>
              ) : preview ? (
                <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Toque para enviar foto ou imagem</p>
                  <p className="text-xs text-muted-foreground">Notas fiscais, recibos, comprovantes</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processImage(file);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Dados extraídos pela IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="font-semibold text-expense">
                    {parsed.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="text-sm">{format(new Date(parsed.date + "T12:00:00"), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estabelecimento</span>
                  <span className="text-sm">{parsed.merchant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Categoria</span>
                  <span className="text-sm">{parsed.category}</span>
                </div>
                {parsed.description && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Descrição</span>
                    <span className="text-sm">{parsed.description}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setParsed(null); setPreview(null); }}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button className="flex-1" onClick={confirmTransaction} disabled={addTransaction.isPending}>
                <Check className="mr-2 h-4 w-4" /> Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
