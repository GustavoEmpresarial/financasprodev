import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTransactions, useCategories } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface ParsedCommand {
  type: "income" | "expense";
  amount: number;
  category: string;
  description?: string;
  date: string;
}

export function VoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const [open, setOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { addTransaction } = useTransactions(format(new Date(), "yyyy-MM"));

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      setTranscript(result[0].transcript);
    };
    recognition.onend = async () => {
      setListening(false);
      const finalTranscript = transcript;
      if (finalTranscript.trim()) {
        await processCommand(finalTranscript);
      }
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error !== "no-speech") {
        toast.error("Erro no reconhecimento de voz: " + event.error);
      }
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setParsed(null);
    setOpen(true);
    recognition.start();
  }, [transcript]);

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const processCommand = async (text: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-voice-command", {
        body: { text },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setParsed(data);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar comando");
    } finally {
      setProcessing(false);
    }
  };

  const confirmTransaction = async () => {
    if (!parsed || !user) return;
    const catType = parsed.type;
    const cat = categories.find(
      (c) => c.name.toLowerCase() === parsed.category.toLowerCase() && c.type === catType
    ) || categories.find((c) => c.type === catType);

    if (!cat) {
      toast.error("Nenhuma categoria encontrada");
      return;
    }

    await addTransaction.mutateAsync({
      type: "expense",
      amount: parsed.amount,
      category_id: cat.id,
      description: parsed.description || transcript,
      date: parsed.date,
      is_fixed: false,
      payment_method: "pix",
    });

    setParsed(null);
    setTranscript("");
    setOpen(false);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={`h-8 w-8 ${listening ? "bg-expense/10 text-expense animate-pulse" : ""}`}
        onClick={listening ? stopListening : startListening}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) stopListening(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assistente por Voz</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Listening indicator */}
            <div className="flex flex-col items-center gap-3 py-4">
              {listening ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-expense/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-expense/10">
                      <Mic className="h-8 w-8 text-expense" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Ouvindo...</p>
                </>
              ) : processing ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processando com IA...</p>
                </>
              ) : !parsed ? (
                <p className="text-sm text-muted-foreground">
                  Diga algo como: "gastei 45 reais com alimentação hoje"
                </p>
              ) : null}
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1">Você disse:</p>
                <p className="text-sm italic">"{transcript}"</p>
              </div>
            )}

            {/* Parsed result */}
            {parsed && (
              <>
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Transação identificada</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tipo</span>
                      <span className={`text-sm font-medium ${parsed.type === "income" ? "text-income" : "text-expense"}`}>
                        {parsed.type === "income" ? "Receita" : "Despesa"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <span className={`font-semibold ${parsed.type === "income" ? "text-income" : "text-expense"}`}>
                        {formatCurrency(parsed.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Categoria</span>
                      <span className="text-sm">{parsed.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="text-sm">{format(new Date(parsed.date + "T12:00:00"), "dd/MM/yyyy")}</span>
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
                  <Button variant="outline" className="flex-1" onClick={() => { setParsed(null); setTranscript(""); }}>
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                  <Button className="flex-1" onClick={confirmTransaction} disabled={addTransaction.isPending}>
                    <Check className="mr-2 h-4 w-4" /> Confirmar
                  </Button>
                </div>
              </>
            )}

            {/* Retry button */}
            {!listening && !processing && !parsed && transcript && (
              <Button variant="outline" className="w-full" onClick={startListening}>
                <Mic className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
