import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRecordHistory, FIELD_LABELS, type AuditEntry } from "@/hooks/useAudit";

const ACTION_LABEL: Record<string, string> = {
  create: "Criado",
  update: "Editado",
  delete: "Excluído",
};

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (field === "amount" || field === "paid_amount" || field === "balance") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return format(new Date(value + "T12:00:00"), "dd/MM/yyyy");
  }
  if (typeof value === "string" && value.length > 40) return value.slice(0, 40) + "…";
  return String(value);
}

export function lastEditLabel(entries?: AuditEntry[]) {
  if (!entries || entries.length === 0) return null;
  const e = entries[0];
  return `Última edição: ${format(new Date(e.created_at), "dd/MM/yyyy 'às' HH:mm")}`;
}

export function RecordHistoryDialog({
  table,
  recordId,
  title,
  open,
  onOpenChange,
}: {
  table: string;
  recordId?: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: entries = [], isLoading } = useRecordHistory(table, open ? recordId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico {title ? `— ${title}` : ""}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma alteração registrada ainda.
            </p>
          ) : (
            <ol className="space-y-4">
              {entries.map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={e.action === "delete" ? "destructive" : "secondary"} className="text-[10px]">
                      {ACTION_LABEL[e.action] ?? e.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </div>
                  {e.action === "update" && (
                    <ul className="mt-2 space-y-1">
                      {e.changed_fields
                        .filter((f) => !["created_at", "updated_at"].includes(f))
                        .map((f) => (
                          <li key={f} className="text-xs">
                            <span className="font-medium">{FIELD_LABELS[f] ?? f}: </span>
                            <span className="text-muted-foreground line-through">
                              {formatValue(f, e.old_data?.[f])}
                            </span>
                            <span className="mx-1">→</span>
                            <span className="text-foreground">{formatValue(f, e.new_data?.[f])}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                  {e.action === "create" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registro criado com valor {formatValue("amount", e.new_data?.amount)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
