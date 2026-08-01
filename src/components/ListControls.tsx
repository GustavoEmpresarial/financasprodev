import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortDir = "asc" | "desc";

export function useListControls<T extends Record<string, any>>(
  items: T[],
  opts: {
    searchFields: (item: T) => string;
    initialSort?: string;
    initialDir?: SortDir;
    pageSize?: number;
    filterFn?: (item: T, filter: string) => boolean;
  }
) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState(opts.initialSort ?? "date");
  const [sortDir, setSortDir] = useState<SortDir>(opts.initialDir ?? "desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const pageSize = opts.pageSize ?? 15;

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => opts.searchFields(i).toLowerCase().includes(q));
    }
    if (filter !== "all" && opts.filterFn) {
      list = list.filter((i) => opts.filterFn!(i, filter));
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, search, filter, sortBy, sortDir, opts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleSelectAll = () =>
    setSelected((s) => (s.length === paged.length ? [] : paged.map((i: any) => i.id)));
  const clearSelection = () => setSelected([]);

  return {
    search,
    setSearch: (v: string) => { setSearch(v); setPage(1); },
    filter,
    setFilter: (v: string) => { setFilter(v); setPage(1); },
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    toggleDir: () => setSortDir((d) => (d === "asc" ? "desc" : "asc")),
    page: currentPage,
    setPage,
    totalPages,
    filtered,
    paged,
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  };
}

export function ListToolbar({
  controls,
  sortOptions,
  filterOptions,
  filterPlaceholder = "Filtrar",
  searchPlaceholder = "Pesquisar…",
}: {
  controls: ReturnType<typeof useListControls<any>>;
  sortOptions: { value: string; label: string }[];
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
  searchPlaceholder?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={controls.search}
          onChange={(e) => controls.setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>
      {filterOptions && (
        <Select value={controls.filter} onValueChange={controls.setFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={filterPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {filterOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={controls.sortBy} onValueChange={controls.setSortBy}>
        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {sortOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={controls.toggleDir} title="Inverter ordenação">
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ListPagination({ controls }: { controls: ReturnType<typeof useListControls<any>> }) {
  if (controls.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Página {controls.page} de {controls.totalPages} · {controls.filtered.length} registros
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={controls.page === 1} onClick={() => controls.setPage(controls.page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={controls.page === controls.totalPages} onClick={() => controls.setPage(controls.page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
