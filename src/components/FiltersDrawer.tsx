import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Filter, CalendarIcon, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

export type PeriodFilter = "all" | "active" | "expired" | "future";

export interface FiltersState {
  industry: string | null;
  period: PeriodFilter;
  range: DateRange | undefined;
  favoritesOnly: boolean;
}

export const EMPTY_FILTERS: FiltersState = { industry: null, period: "active", range: undefined, favoritesOnly: false };

export function FiltersDrawer({ industries, value, onChange }: {
  industries: string[];
  value: FiltersState;
  onChange: (v: FiltersState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const activeCount = (value.industry ? 1 : 0) + (value.period !== "active" ? 1 : 0) + (value.range?.from ? 1 : 0) + (value.favoritesOnly ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="font-display tracking-wider">
          <Filter className="h-4 w-4 mr-2" />FILTROS{activeCount > 0 && <span className="ml-2 bg-accent text-accent-foreground rounded-full text-xs px-2">{activeCount}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl tracking-wider">FILTROS</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <button
            type="button"
            onClick={() => onChange({ ...value, favoritesOnly: !value.favoritesOnly })}
            className={cn(
              "w-full px-4 py-3 rounded-xl border text-sm font-display tracking-wider uppercase transition flex items-center justify-between",
              value.favoritesOnly ? "bg-amber-500/15 border-amber-500/60 text-amber-700 dark:text-amber-400" : "bg-background hover:bg-secondary"
            )}
          >
            <span>★ Apenas meus favoritos</span>
            {value.favoritesOnly && <Check className="h-4 w-4" />}
          </button>
          <div>
            <Label className="mb-2 block">Indústria / Marca</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {value.industry ?? "Todas as marcas"}
                  {value.industry && (
                    <X className="h-4 w-4 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange({ ...value, industry: null }); }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar marca..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma marca.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => { onChange({ ...value, industry: null }); setComboOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", !value.industry ? "opacity-100" : "opacity-0")} />
                        Todas
                      </CommandItem>
                      {industries.map((i) => (
                        <CommandItem key={i} onSelect={() => { onChange({ ...value, industry: i }); setComboOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", value.industry === i ? "opacity-100" : "opacity-0")} />
                          {i}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="mb-2 block">Período</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["active", "Ativas"],
                ["future", "Agendadas"],
                ["expired", "Encerradas"],
                ["all", "Todas"],
              ] as [PeriodFilter, string][]).map(([k, l]) => (
                <button key={k} type="button" onClick={() => onChange({ ...value, period: k })}
                  className={cn(
                    "px-3 py-2 rounded-md border text-sm font-display tracking-wider uppercase transition",
                    value.period === k ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"
                  )}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Intervalo de datas</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value.range?.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value.range?.from ? (
                    value.range.to
                      ? <>{format(value.range.from, "dd/MM/yy", { locale: ptBR })} – {format(value.range.to, "dd/MM/yy", { locale: ptBR })}</>
                      : format(value.range.from, "dd/MM/yy", { locale: ptBR })
                  ) : "Selecionar período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={value.range}
                  onSelect={(r) => onChange({ ...value, range: r })}
                  numberOfMonths={1}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {value.range?.from && (
              <Button variant="ghost" size="sm" onClick={() => onChange({ ...value, range: undefined })} className="mt-1 text-xs h-7">
                <X className="h-3 w-3 mr-1" />Limpar datas
              </Button>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={() => onChange(EMPTY_FILTERS)}>
            Restaurar padrão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
