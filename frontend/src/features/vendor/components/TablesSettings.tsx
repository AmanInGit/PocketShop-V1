/**
 * Tables Settings – configure tables (1–10 simple, 11–50 zone-wise)
 * and download table QRs (permanent, no regeneration).
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QrCode, Download, Table2, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VirtualStorefrontTables } from './VirtualStorefrontTables';
import type { VendorTable } from '../types/tables';
import QRCode from 'qrcode';
import { useVendorTables } from '../hooks/useVendorTables';
import type { TableConfig, ZoneKey } from '../types/tables';
import { ZONE_LABELS } from '../types/tables';
import { validateZoneConfig } from '../utils/tableConfigUtils';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';

const ZONES: ZoneKey[] = ['north', 'south', 'east', 'west'];

function TableCardWithQuickView({
  table,
  vendorId,
  onDownload,
}: {
  table: VendorTable;
  vendorId: string;
  onDownload: (slug: string, code: string) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const loadQR = async () => {
    if (qrDataUrl) return;
    const url = `${window.location.origin}/storefront/${vendorId}?table=${table.table_slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrDataUrl(dataUrl);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={loadQR}
          className="flex flex-col items-center rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <span className="mb-2 text-sm font-medium">{table.table_code}</span>
          <QrCode className="h-5 w-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-semibold">Table {table.table_code}</p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR ${table.table_code}`} className="h-36 w-36 rounded border bg-white p-2" />
          ) : (
            <div className="h-36 w-36 animate-pulse rounded border bg-muted" />
          )}
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => onDownload(table.table_slug, table.table_code)}>
            <Download className="h-4 w-4" /> Download QR
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TablesSettings() {
  const { tables, tableConfig, vendorId, isLoading, saveTableConfig, isSaving, saveLayout, isSavingLayout } = useVendorTables();
  const [totalTablesStr, setTotalTablesStr] = useState(String(tableConfig?.total_tables ?? 5));
  const [zoneCountsStr, setZoneCountsStr] = useState<Record<ZoneKey, string>>(() => {
    const zc = tableConfig?.zone_counts ?? { north: 0, south: 0, east: 0, west: 0 };
    return { north: String(zc.north), south: String(zc.south), east: String(zc.east), west: String(zc.west) };
  });

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
  const [savedRecently, setSavedRecently] = useState(false);
  const [zoneAllocationOpen, setZoneAllocationOpen] = useState(true);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const handleSave = useCallback(async () => {
    await saveTableConfig(config);
    setSavedRecently(true);
    setTimeout(() => setSavedRecently(false), 2000);
  }, [config, saveTableConfig]);

  const handleDownloadTableQR = async (tableSlug: string, tableCode: string) => {
    const url = `${window.location.origin}/storefront/${vendorId}?table=${tableSlug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `table-${tableCode}.png`;
      a.click();
    } catch (e) {
      console.error('Failed to generate QR', e);
    }
  };

  const handleDownloadAllTableQRs = async () => {
    if (!vendorId) return;
    for (const t of tables) {
      await handleDownloadTableQR(t.table_slug, t.table_code);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-orange-500/10 to-orange-500/5">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Table2 className="h-6 w-6 text-orange-600" />
          Tables & QR Codes
        </CardTitle>
        <CardDescription>
          Configure tables and print QR codes for each table. Table QRs are permanent — print once and place on tables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Table count */}
        <div className="space-y-2">
          <Label>Number of tables</Label>
          <Input
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
          />
          {totalTables > 50 && (
            <p className="text-sm text-amber-600">
              50+ tables requires a subscription. Contact support.
            </p>
          )}
        </div>

        {/* Zone allocation (11–50) – collapsible */}
        {useZoneMode && (
          <Collapsible open={zoneAllocationOpen} onOpenChange={setZoneAllocationOpen}>
            <div className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium">Zone allocation (North, South, East, West)</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    Sum: {Object.values(zoneCounts).reduce((a, b) => a + b, 0)} / {totalTables}
                    {zoneAllocationOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 px-4 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Set 0 for zones you don&apos;t have. Total must equal {totalTables}.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {ZONES.map((z) => (
                      <div key={z}>
                        <Label className="text-xs">{ZONE_LABELS[z]}</Label>
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
                        />
                      </div>
                    ))}
                  </div>
                  {!validation.valid && validation.error && (
                    <p className="text-sm text-destructive">{validation.error}</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {totalTables <= 10 && (
          <p className="text-sm text-muted-foreground">
            Tables will be numbered 1, 2, 3, … {totalTables}
          </p>
        )}

        <Button onClick={() => setConfirmSaveOpen(true)} disabled={!canSave}>
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
          ) : tables.length > 0 ? (
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

        {/* Table QRs - download only, no regenerate */}
        {tables.length > 0 && (
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Table QR codes (print & place on tables)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Each table has a permanent QR. Click a table to view QR, then download — do not regenerate.
            </p>

            {tables.length > 10 ? (
              <VirtualStorefrontTables
                tables={tables}
                vendorId={vendorId}
                onDownloadAll={handleDownloadAllTableQRs}
                onDownloadTable={handleDownloadTableQR}
                onSaveLayout={saveLayout}
                isSavingLayout={isSavingLayout}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {tables.map((t) => (
                  <TableCardWithQuickView
                    key={t.id}
                    table={t}
                    vendorId={vendorId}
                    onDownload={handleDownloadTableQR}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
