import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { COLUMN_LABEL, type CarteiraColumnId } from "../lib/columns";
import type { ColumnSettings as ColumnSettingsState } from "../hooks/useColumnSettings";

function SortableRow({
  id,
  checked,
  onToggle,
}: {
  id: CarteiraColumnId;
  checked: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded transition-colors",
        isDragging
          ? "bg-white shadow-md relative z-10"
          : "hover:bg-gray-soft",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${COLUMN_LABEL[id]}`}
        style={{ touchAction: "none" }}
        className={cn(
          "flex items-center justify-center w-4 h-4 text-gray-faint group-hover:text-gray-text",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        id={`col-${id}`}
      />
      <label
        htmlFor={`col-${id}`}
        className="text-sm text-ink cursor-pointer select-none flex-1"
      >
        {COLUMN_LABEL[id]}
      </label>
    </div>
  );
}

export function ColumnSettings({ settings }: { settings: ColumnSettingsState }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    settings.reorder(
      active.id as CarteiraColumnId,
      over.id as CarteiraColumnId,
    );
  }

  // visíveis = manuais + cliente fixa
  const totalAll = settings.totalManageable + 1;
  const visibleAll = settings.visibleManageableCount + 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium bg-white hover:bg-gray-soft border border-gray-line text-ink rounded-md transition-all"
        >
          <Columns3 className="w-3.5 h-3.5" strokeWidth={1.8} />
          Colunas
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[280px] p-2"
      >
        <div className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-text uppercase tracking-wide">
          Colunas da tabela
        </div>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-2 rounded opacity-90">
                <div className="w-4 h-4" aria-hidden />
                <Checkbox checked disabled />
                <span className="text-sm text-ink select-none flex-1">
                  {COLUMN_LABEL.cliente}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">Coluna principal</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={settings.order}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[360px] overflow-y-auto">
              {settings.order.map((id) => (
                <SortableRow
                  key={id}
                  id={id}
                  checked={!!settings.visibility[id]}
                  onToggle={() => settings.toggle(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="border-t border-gray-line pt-2 mt-2 px-2 flex items-center justify-between">
          <span className="text-xs text-gray-text">
            {visibleAll} de {totalAll} visíveis
          </span>
          <button
            type="button"
            onClick={settings.reset}
            className="text-xs text-gray-text underline-offset-2 hover:underline hover:text-ink"
          >
            Resetar pro padrão
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}