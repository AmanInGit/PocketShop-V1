/**
 * Table Config Strip – single-row layout for table count, zone allocation, and update button.
 * Used on the Storefront page below the QR section.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import type { TableConfig, ZoneKey } from '../types/tables';
import { ZONE_LABELS } from '../types/tables';
import { validateZoneConfig } from '../utils/tableConfigUtils';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';

const ZONES: ZoneKey[] = ['north', 'south', 'east', 'west'];

interface TableConfigStripProps {
  tableConfig: TableConfig | undefined;
  saveTableConfig: (config: TableConfig) => Promise<unknown>;
  isSaving: boolean;
  tablesCount: number;
}

export function TableConfigStrip({
  tableConfig,
  saveTableConfig,
  isSaving,
  tablesCount,
}: TableConfigStripProps) {
  const [totalTablesStr, setTotalTablesStr] = useState(String(tableConfig?.total_tables ?? 5));
  const [zoneCountsStr, setZoneCountsStr] = useState<Record<ZoneKey, string>>(() => {
    const zc = tableConfig?.zone_counts ?? { north: 0, south: 0, east: 0, west: 0 };
    return { north: String(zc.north), south: String(zc.south), east: String(zc.east), west: String(zc.west) };
  });
  const [savedRecently, setSavedRecently] = useState(false);
  const [zoneAllocationOpen, setZoneAllocationOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    if (tableConfig) {
      setTotalTablesStr(String(tableConfig.total_tables));
      const zc = tableConfig.zone_counts ?? { north: 0, south: 0, east: 0, west: 0 };
      setZoneCountsStr({
        north: String(zc.north),
        south: String(zc.south),
        east: String(zc.east),
        west: String(zc.west),
      });
    }
  }, [tableConfig]);

  const totalTables = (() => {
    const n = parseInt(totalTablesStr, 10);
    return isNaN(n) ? 1 : Math.min(50, Math.max(1, n));
  })();
  const zoneCounts: Record<ZoneKey, number> = {
    north: Math.max(0, parseInt(zoneCountsStr.north, 10) || 0),
    south: Math.max(0, parseInt(zoneCountsStr.south, 10) || 0),
    east: Math.max(0, parseInt(zoneCountsStr.east, 10) || 0),
    west: Math.max(0, parseInt(zoneCountsStr.west, 10) || 0),
  };
  const useZoneMode = totalTables >= 11;
  const config: TableConfig = useZoneMode
    ? { mode: 'zone', total_tables: totalTables, zone_counts: zoneCounts }
    : { mode: 'simple', total_tables: totalTables };

  const validation = validateZoneConfig(config);
  const canSave = validation.valid && !isSaving;

  const handleSave = useCallback(async () => {
    await saveTableConfig(config);
    setSavedRecently(true);
    setTimeout(() => setSavedRecently(false), 2000);
  }, [config, saveTableConfig]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="table-count" className="shrink-0 text-sm font-medium">
            Number of tables
          </Label>
          <Input
            id="table-count"
            type="number"
            min={1}
            max={50}
            placeholder="e.g. 20"
            value={totalTablesStr}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*$/.test(v)) setTotalTablesStr(v);
            }}
            onBlur={() => {
              const n = parseInt(totalTablesStr, 10);
              if (isNaN(n) || n < 1) setTotalTablesStr('1');
              else if (n > 50) setTotalTablesStr('50');
              else setTotalTablesStr(String(n));
            }}
            className="h-9 w-24"
          />
        </div>

        {useZoneMode && (
          <Collapsible open={zoneAllocationOpen} onOpenChange={setZoneAllocationOpen}>
            <div className="flex flex-col rounded-lg border bg-muted/30">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
                >
                  Zone allocation
                  <span className="text-muted-foreground">
                    (Sum: {Object.values(zoneCounts).reduce((a, b) => a + b, 0)} / {totalTables})
                  </span>
                  {zoneAllocationOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 border-t px-3 py-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <p className="text-xs text-muted-foreground w-full sm:w-auto">
                    Set 0 for zones you don&apos;t have.
                  </p>
                  {ZONES.map((z) => (
                    <div key={z} className="flex items-center gap-1.5">
                      <Label className="text-xs w-12 shrink-0">{ZONE_LABELS[z]}</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={zoneCountsStr[z]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d*$/.test(v))
                            setZoneCountsStr((prev) => ({ ...prev, [z]: v }));
                        }}
                        onBlur={() => {
                          const n = parseInt(zoneCountsStr[z], 10);
                          if (isNaN(n) || n < 0) setZoneCountsStr((prev) => ({ ...prev, [z]: '0' }));
                          else setZoneCountsStr((prev) => ({ ...prev, [z]: String(n) }));
                        }}
                        className="h-8 w-14"
                      />
                    </div>
                  ))}
                  {!validation.valid && validation.error && (
                    <p className="text-xs text-destructive w-full">{validation.error}</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {totalTables <= 10 && (
          <span className="text-xs text-muted-foreground">
            Tables: 1, 2, 3, … {totalTables}
          </span>
        )}
      </div>

      <Button onClick={() => setConfirmSaveOpen(true)} disabled={!canSave} className="shrink-0">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : savedRecently ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Saved
          </>
        ) : tablesCount > 0 ? (
          'Update configuration'
        ) : (
          'Create tables'
        )}
      </Button>
      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        onConfirm={async () => {
          setConfirmSaveOpen(false);
          await handleSave();
        }}
        title="Save table configuration?"
        description="Do you want to save this table configuration?"
        confirmLabel="Yes, save"
        isConfirming={isSaving}
      />
    </div>
  );
}
