import React, { useState } from 'react';
import { Database, CheckCircle2, Clock, RefreshCw, FileText, Download, Share2 } from 'lucide-react';
import { downloadPdfToDevice, shareOrOpenPdf } from '../services/pdfDownloader.js';

import { formatWatDateTime } from '../utils/date.js';

export default function OutboxList({ outboxItems = [], isOnline, isSyncing, onManualSync }) {
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (item) => {
    if (!item.pdf_url) return;
    setDownloadingId(item.id);
    const safeName = `Inspection_${(item.estate_name || 'Property').replace(/\s+/g, '_')}_${(item.unit_number || 'Unit').replace(/\s+/g, '_')}`;
    try {
      await downloadPdfToDevice(item.pdf_url, safeName);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = async (item) => {
    if (!item.pdf_url) return;
    const title = `${item.estate_name || 'Property'} ${item.unit_number || ''}`;
    await shareOrOpenPdf(item.pdf_url, title);
  };

  return (
    <div className="space-y-4">
      {/* On-device Storage Banner (Reference Style) */}
      <div className="bg-app-status-warning/10 border border-app-status-warning/30 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
        <Database className="w-4 h-4 text-app-status-warning shrink-0 mt-0.5" />
        <p className="text-xs text-app-status-warning leading-relaxed">
          <span className="font-semibold">Storage: on-device database</span> — submissions survive if you close the app or lose power.
        </p>
      </div>

      {/* Outbox Items List */}
      {outboxItems.length === 0 ? (
        <div className="bg-white border border-app-border rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-app-text-secondary flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-app-text-primary">Outbox is empty</h3>
          <p className="text-xs text-app-text-secondary max-w-xs mx-auto">
            Completed inspections will be saved here locally on your device with instant 1-click download and share actions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {outboxItems.map((item) => {
            const isSynced = item.status === 'SYNCED';
            const isUploading = item.status === 'UPLOADING';
            const defectsCount = item.deficiencies_count ?? item.payload?.deficiencies?.length ?? 0;
            const photosCount = item.photos_count ?? item.payload?.deficiencies?.reduce((acc, d) => acc + (d.photo_ids?.length || 0), 0) ?? 0;
            const isDownloading = downloadingId === item.id;

            // Format created date nicely using WAT explicitly
            const dateStr = item.created_at ? formatWatDateTime(item.created_at) : 'Recently';


            return (
              <div 
                key={item.id} 
                className="bg-white border border-app-border hover:border-app-brand-primary/50 rounded-2xl p-4 space-y-3 shadow-sm transition-all"
              >
                {/* Title Line & Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-app-text-primary leading-tight">
                      {item.estate_name || 'Property'} {item.unit_number ? `— ${item.unit_number}` : ''}
                    </h3>
                  </div>

                  {isSynced ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-app-status-success/10 text-app-status-success border border-app-status-success/20">
                      Synced <CheckCircle2 className="w-3 h-3" />
                    </span>
                  ) : isUploading ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-app-brand-primary/10 text-app-brand-primary border border-app-brand-primary/20">
                      Syncing <RefreshCw className="w-3 h-3 animate-spin" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/20">
                      Queued <Clock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Subtitle Line */}
                <div className="text-xs text-app-text-primary flex items-center gap-1.5 font-medium">
                  <span>Punch-List Inspection</span>
                  <span className="text-app-text-secondary/60">•</span>
                  <span className="text-app-status-success flex items-center gap-1">
                    ✓ Completed
                  </span>
                </div>

                {/* Metadata Row */}
                <div className="text-[11px] text-app-text-secondary space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{item.inspection_date || 'N/A'}</span>
                    <span>•</span>
                    <span className="text-app-text-primary font-medium">{item.inspector_name || 'Inspector'}</span>
                    <span>•</span>
                    <span>{defectsCount} defect{defectsCount === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span>{photosCount} photo{photosCount === 1 ? '' : 's'}</span>
                  </div>

                  <div className="text-[10px] text-app-text-secondary/60 font-mono flex flex-wrap items-center gap-x-1.5">
                    <span>ID {item.id.slice(0, 14)}...</span>
                    <span>•</span>
                    <span>saved {dateStr}</span>
                  </div>
                </div>

                {/* Action Buttons: Direct Mobile Download & Native Share */}
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  {item.pdf_url ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        disabled={isDownloading}
                        className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] border border-app-border text-app-text-primary hover:text-app-brand-primary font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-app-brand-primary" />
                            <span>Saving file...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-app-brand-primary" />
                            <span>↓ Download copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-app-brand-primary/10 hover:bg-app-brand-primary/20 active:scale-[0.98] border border-app-brand-primary/20 text-app-brand-primary hover:text-app-brand-primary/80 font-semibold text-xs transition-all"
                        title="Share PDF or Print"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share / Print</span>
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-app-text-secondary/60 text-[11px] font-medium border border-app-border cursor-not-allowed"
                    >
                      <span>⏳ PDF generates on sync</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
