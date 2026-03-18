/**
 * Virtual Storefront Tables – bus-seat style floor plan for 11+ tables.
 * Edit layout mode: drag tables between zones to match real store.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Download, Pencil, Check, GripVertical } from 'lucide-react';
import QRCode from 'qrcode';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import type { VendorTable } from '../types/tables';
import type { ZoneKey } from '../types/tables';
import { ZONE_LABELS, ZONE_PREFIX } from '../types/tables';

const ZONE_ORDER: ZoneKey[] = ['north', 'south', 'east', 'west'];
const SEATS_PER_ROW = 5;

interface VirtualStorefrontTablesProps {
  tables: VendorTable[];
  vendorId: string;
  onDownloadAll: () => void;
  onDownloadTable: (slug: string, code: string) => void;
  onSaveLayout: (tablesByZone: Record<ZoneKey, VendorTable[]>) => Promise<void>;
  isSavingLayout: boolean;
}

function TableSeat({
  table,
  vendorId,
  onDownload,
  isEditMode,
}: {
  table: VendorTable;
  vendorId: string;
  onDownload: (slug: string, code: string) => void;
  isEditMode: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: table.id,
    data: { table },
  });

  const loadQR = async () => {
    if (qrDataUrl) return;
    const url = `${window.location.origin}/storefront/${vendorId}?table=${table.table_slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrDataUrl(dataUrl);
  };

  const seat = (
    <button
      type="button"
      ref={isEditMode ? setNodeRef : undefined}
      {...(isEditMode ? { ...attributes, ...listeners } : { onClick: loadQR })}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-bold shadow-sm transition-all duration-200 ${
        isEditMode
          ? 'cursor-grab border-amber-400 bg-amber-100 text-amber-900 active:cursor-grabbing dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-200'
          : 'cursor-pointer border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 hover:scale-110 hover:border-orange-400 hover:shadow-md hover:shadow-orange-200/50 active:scale-95 dark:border-amber-500/60 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-100 dark:hover:border-orange-400 dark:hover:shadow-orange-500/20'
      } ${isDragging ? 'opacity-50' : ''}`}
      title={isEditMode ? `Drag to move — ${table.table_code}` : `Table ${table.table_code} — click to view QR`}
    >
      {isEditMode && <GripVertical className="mr-0.5 h-3 w-3 text-amber-600" />}
      {table.table_code}
    </button>
  );

  if (isEditMode) return seat;

  return (
    <Popover>
      <PopoverTrigger asChild>{seat}</PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center" side="top">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-foreground">Table {table.table_code}</p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR for ${table.table_code}`}
              className="h-40 w-40 rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-lg border bg-muted" />
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => onDownload(table.table_slug, table.table_code)}
          >
            <Download className="h-4 w-4" />
            Download QR
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DroppableZone({
  zone,
  label,
  tables,
  vendorId,
  onDownload,
  isEditMode,
}: {
  zone: ZoneKey;
  label: string;
  tables: VendorTable[];
  vendorId: string;
  onDownload: (slug: string, code: string) => void;
  isEditMode: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: zone });
  const rows = useMemo(() => {
    const out: VendorTable[][] = [];
    for (let i = 0; i < tables.length; i += SEATS_PER_ROW) {
      out.push(tables.slice(i, i + SEATS_PER_ROW));
    }
    return out;
  }, [tables]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-lg transition-colors ${
        isOver && isEditMode ? 'ring-2 ring-orange-400 ring-offset-2' : ''
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80">
        {label}
      </span>
      <div className="flex flex-col gap-1.5 min-h-[2.5rem]">
        {tables.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {isEditMode ? 'Drop tables here' : '—'}
          </span>
        ) : (
          rows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1.5">
              {row.map((t) => (
                <TableSeat
                  key={t.id}
                  table={t}
                  vendorId={vendorId}
                  onDownload={onDownload}
                  isEditMode={isEditMode}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Recompute table_code for tables in each zone */
function recomputeTableCodes(
  tablesByZone: Record<ZoneKey, VendorTable[]>
): Record<ZoneKey, VendorTable[]> {
  const result: Record<ZoneKey, VendorTable[]> = {};
  for (const z of ZONE_ORDER) {
    const zoneTables = tablesByZone[z] || [];
    const prefix = ZONE_PREFIX[z];
    result[z] = zoneTables.map((t, i) => ({
      ...t,
      zone: z,
      table_code: `${prefix}-T${i + 1}`,
      display_order: i,
    }));
  }
  return result;
}

export function VirtualStorefrontTables({
  tables,
  vendorId,
  onDownloadAll,
  onDownloadTable,
  onSaveLayout,
  isSavingLayout,
}: VirtualStorefrontTablesProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmSaveLayoutOpen, setConfirmSaveLayoutOpen] = useState(false);
  const [localTablesByZone, setLocalTablesByZone] = useState<Record<ZoneKey, VendorTable[]>>(() => ({
    north: [],
    south: [],
    east: [],
    west: [],
  }));

  const initLocalFromTables = useCallback(() => {
    const byZone: Record<ZoneKey, VendorTable[]> = {
      north: [],
      south: [],
      east: [],
      west: [],
    };
    for (const t of tables) {
      const zone = (t.zone ?? 'north') as ZoneKey;
      if (zone in byZone) byZone[zone].push(t);
    }
    for (const z of ZONE_ORDER) {
      byZone[z].sort((a, b) => a.display_order - b.display_order);
    }
    setLocalTablesByZone(byZone);
  }, [tables]);

  const tablesByZoneFromProps = useMemo(() => {
    const byZone: Record<ZoneKey, VendorTable[]> = {
      north: [],
      south: [],
      east: [],
      west: [],
    };
    for (const t of tables) {
      const zone = (t.zone ?? 'north') as ZoneKey;
      if (zone in byZone) byZone[zone].push(t);
    }
    for (const z of ZONE_ORDER) {
      byZone[z].sort((a, b) => a.display_order - b.display_order);
    }
    return byZone;
  }, [tables]);

  const displayTablesByZone = isEditMode ? localTablesByZone : tablesByZoneFromProps;

  const handleEditLayout = () => {
    initLocalFromTables();
    setIsEditMode(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const tableId = active.id as string;
    let targetZone: ZoneKey | null = null;
    if (ZONE_ORDER.includes(over.id as ZoneKey)) {
      targetZone = over.id as ZoneKey;
    } else {
      // Dropped on another table - find its zone
      for (const z of ZONE_ORDER) {
        if (localTablesByZone[z].some((t) => t.id === over.id)) {
          targetZone = z;
          break;
        }
      }
    }
    if (!targetZone) return;

    setLocalTablesByZone((prev) => {
      let moved: VendorTable | null = null;
      const next: Record<ZoneKey, VendorTable[]> = { north: [], south: [], east: [], west: [] };

      for (const z of ZONE_ORDER) {
        next[z] = prev[z].filter((t) => {
          if (t.id === tableId) {
            moved = t;
            return false;
          }
          return true;
        });
      }
      if (moved) {
        next[targetZone] = [...next[targetZone], { ...moved, zone: targetZone }];
        return recomputeTableCodes(next);
      }
      return prev;
    });
  };

  const handleSaveLayout = async () => {
    const withCodes = recomputeTableCodes(localTablesByZone);
    await onSaveLayout(withCodes);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const sensors = useSensors(pointerSensor);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? 'Drag tables to match your store layout. Numbers update when you move.'
              : 'Floor plan — click a table to view QR'}
          </p>
          {!isEditMode ? (
            <Button variant="outline" size="sm" onClick={handleEditLayout}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit layout
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => setConfirmSaveLayoutOpen(true)} disabled={isSavingLayout}>
                <Check className="mr-2 h-4 w-4" />
                {isSavingLayout ? 'Saving…' : 'Save layout'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onDownloadAll}>
          <Download className="mr-2 h-4 w-4" />
          Download all
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={() => {}}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-hidden rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-orange-50/60 shadow-inner dark:border-amber-500/30 dark:from-amber-950/40 dark:to-orange-950/30">
          <div className="border-b border-amber-200/60 bg-amber-50/40 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-950/30">
            <DroppableZone
              zone="north"
              label={ZONE_LABELS.north}
              tables={displayTablesByZone.north}
              vendorId={vendorId}
              onDownload={onDownloadTable}
              isEditMode={isEditMode}
            />
          </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-amber-200/60 bg-orange-50/30 px-4 py-3 dark:border-amber-500/20 dark:bg-orange-950/20">
              <DroppableZone
                zone="west"
                label={ZONE_LABELS.west}
                tables={displayTablesByZone.west}
                vendorId={vendorId}
                onDownload={onDownloadTable}
                isEditMode={isEditMode}
              />
            </div>
            <div className="bg-orange-50/30 px-4 py-3 dark:bg-orange-950/20">
              <DroppableZone
                zone="east"
                label={ZONE_LABELS.east}
                tables={displayTablesByZone.east}
                vendorId={vendorId}
                onDownload={onDownloadTable}
                isEditMode={isEditMode}
              />
            </div>
          </div>

          <div className="border-t border-amber-200/60 bg-amber-50/40 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-950/30">
            <DroppableZone
              zone="south"
              label={ZONE_LABELS.south}
              tables={displayTablesByZone.south}
              vendorId={vendorId}
              onDownload={onDownloadTable}
              isEditMode={isEditMode}
            />
          </div>
        </div>
      </DndContext>
      <ConfirmActionDialog
        open={confirmSaveLayoutOpen}
        onOpenChange={setConfirmSaveLayoutOpen}
        onConfirm={async () => {
          setConfirmSaveLayoutOpen(false);
          await handleSaveLayout();
        }}
        title="Save table layout?"
        description="Do you want to save this table layout?"
        confirmLabel="Yes, save layout"
        isConfirming={isSavingLayout}
      />
    </div>
  );
}
