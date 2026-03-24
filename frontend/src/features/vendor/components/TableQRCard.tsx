/**
 * Table QR Card – floor plan (11+ tables) or simple table grid (1–10).
 * Used next to Pickup QR on the Storefront page.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VirtualStorefrontTables } from './VirtualStorefrontTables';
import type { VendorTable } from '../types/tables';
import type { ZoneKey } from '../types/tables';
import type { TableConfig } from '../types/tables';
import QRCode from 'qrcode';

const ROW_SIZE = 5;

/** Simple row layout for 1–10 tables: rows of 5, numbered 1, 2, 3... No zones. */
function SimpleRowLayout({
  tables,
  vendorId,
  tableActivityMap,
  onDownloadTable,
  onDownloadAll,
}: {
  tables: VendorTable[];
  vendorId: string;
  tableActivityMap?: Record<string, { activeCount: number; queueCount: number }>;
  onDownloadTable: (slug: string, code: string) => void;
  onDownloadAll: () => void;
}) {
  const rows: { table: VendorTable; displayLabel: string }[][] = [];
  for (let i = 0; i < tables.length; i += ROW_SIZE) {
    const chunk = tables.slice(i, i + ROW_SIZE);
    rows.push(
      chunk.map((t, j) => ({ table: t, displayLabel: String(i + j + 1) }))
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Floor plan — click a table to view QR. Numbered 1, 2, 3…
        </p>
        <Button variant="ghost" size="sm" onClick={onDownloadAll} className="gap-1.5 text-muted-foreground">
          <Download className="h-4 w-4" />
          Download all
        </Button>
      </div>
      <div className="rounded-xl border-2 border-amber-200/50 bg-amber-50/30 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
        <div className="flex flex-col gap-3">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex flex-wrap justify-center gap-2">
              {row.map(({ table, displayLabel }) => (
                <TableCardWithQuickView
                  key={table.id}
                  table={table}
                  displayLabel={displayLabel}
                  vendorId={vendorId}
                  activity={tableActivityMap?.[table.table_code]}
                  onDownload={onDownloadTable}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableCardWithQuickView({
  table,
  displayLabel,
  vendorId,
  activity,
  onDownload,
}: {
  table: VendorTable;
  displayLabel?: string;
  vendorId: string;
  activity?: { activeCount: number; queueCount: number };
  onDownload: (slug: string, code: string) => void;
}) {
  const label = displayLabel ?? table.table_code;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const loadQR = async () => {
    if (qrDataUrl) return;
    const url = `${window.location.origin}/storefront/${vendorId}?table=${table.table_slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrDataUrl(dataUrl);
  };
  const activeCount = activity?.activeCount ?? 0;
  const queueCount = activity?.queueCount ?? 0;
  const urgencyClass =
    activeCount >= 3
      ? 'border-red-500 bg-red-50 text-red-700 animate-pulse'
      : activeCount === 2
      ? 'border-amber-500 bg-amber-50 text-amber-700 animate-pulse'
      : activeCount === 1
      ? 'border-green-500 bg-green-50 text-green-700 animate-pulse'
      : 'dark:border-white/10';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={loadQR}
          className={`relative flex flex-col items-center rounded-lg border p-3 transition-all duration-200 hover:scale-105 hover:bg-muted/50 active:scale-95 dark:hover:bg-muted/40 ${urgencyClass}`}
        >
          {activeCount > 0 && (
            <span className="absolute -top-2 -left-2 rounded-full bg-emerald-700 text-white text-[10px] px-1.5 py-0.5">
              A{activeCount}
            </span>
          )}
          {queueCount > 0 && (
            <span className="absolute -top-2 -right-2 rounded-full bg-slate-900 text-white text-[10px] px-1.5 py-0.5">
              Q{queueCount}
            </span>
          )}
          <span className="mb-2 text-sm font-medium">{label}</span>
          <QrCode className="h-5 w-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-semibold">Table {label}</p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR ${table.table_code}`} className="h-36 w-36 rounded border bg-white p-2" />
          ) : (
            <div className="h-36 w-36 animate-pulse rounded border bg-muted" />
          )}
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => onDownload(table.table_slug, label)}>
            <Download className="h-4 w-4" /> Download QR
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TableQRCardProps {
  tables: VendorTable[];
  vendorId: string;
  tableActivityMap?: Record<string, { activeCount: number; queueCount: number }>;
  onDownloadTable: (slug: string, code: string) => void;
  onDownloadAll: () => void;
  onSaveLayout: (tablesByZone: Record<ZoneKey, VendorTable[]>) => Promise<void>;
  isSavingLayout: boolean;
  /** URL to configure tables (add/remove) in Settings */
  settingsUrl?: string;
  /** Table config – used to decide layout: ≤10 = simple rows (1,2,3...), >10 = zone layout */
  tableConfig?: TableConfig;
}

export function TableQRCard({
  tables,
  vendorId,
  tableActivityMap,
  onDownloadTable,
  onDownloadAll,
  onSaveLayout,
  isSavingLayout,
  settingsUrl,
  tableConfig,
}: TableQRCardProps) {
  const totalTables = tableConfig?.total_tables ?? tables.length;
  const useSimpleLayout = totalTables <= 10 || tableConfig?.mode === 'simple';
  // Always limit to configured total to avoid duplicates when config was reduced
  const displayTables = [...tables]
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, totalTables);

  return (
    <Card className="overflow-hidden border-0 shadow-xl transition-shadow duration-300 hover:shadow-2xl dark:border dark:border-white/10 dark:bg-card">
      <CardHeader className="border-b bg-gradient-to-r from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10 dark:border-white/5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <QrCode className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Table QR codes & layout
            </CardTitle>
            <CardDescription>
              View & edit layout (drag tables). Add/remove tables in Settings.
            </CardDescription>
          </div>
          {settingsUrl && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to={settingsUrl} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configure tables
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {displayTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 py-12 dark:border-white/10 dark:bg-muted/20">
            <QrCode className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Create tables in Settings to see the floor plan and QR codes.
            </p>
            {settingsUrl && (
              <Button asChild variant="outline">
                <Link to={settingsUrl} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Open Layout settings
                </Link>
              </Button>
            )}
          </div>
        ) : useSimpleLayout ? (
          <SimpleRowLayout
            tables={displayTables}
            vendorId={vendorId}
            tableActivityMap={tableActivityMap}
            onDownloadTable={onDownloadTable}
            onDownloadAll={onDownloadAll}
          />
        ) : (
          <VirtualStorefrontTables
            tables={displayTables}
            vendorId={vendorId}
            tableActivityMap={tableActivityMap}
            onDownloadAll={onDownloadAll}
            onDownloadTable={onDownloadTable}
            onSaveLayout={onSaveLayout}
            isSavingLayout={isSavingLayout}
          />
        )}
      </CardContent>
    </Card>
  );
}
