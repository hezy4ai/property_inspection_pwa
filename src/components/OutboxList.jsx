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
      <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
        <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200 leading-relaxed">
          <span className="font-semibold text-amber-100">Storage: on-device database</span> — submissions survive if you close the app or lose power.
        </p>
      </div>

      {/* Outbox Items List */}
      {outboxItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">Outbox is empty</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
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
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-lg transition-all"
              >
                {/* Title Line & Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {item.estate_name || 'Property'} {item.unit_number ? `— ${item.unit_number}` : ''}
                    </h3>
                  </div>

                  {isSynced ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Synced <CheckCircle2 className="w-3 h-3" />
                    </span>
                  ) : isUploading ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Syncing <RefreshCw className="w-3 h-3 animate-spin" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Queued <Clock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Subtitle Line */}
                <div className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <span>Punch-List Inspection</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    ✓ Completed
                  </span>
                </div>

                {/* Metadata Row */}
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{item.inspection_date || 'N/A'}</span>
                    <span>•</span>
                    <span className="text-slate-300 font-medium">{item.inspector_name || 'Inspector'}</span>
                    <span>•</span>
                    <span>{defectsCount} defect{defectsCount === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span>{photosCount} photo{photosCount === 1 ? '' : 's'}</span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono flex flex-wrap items-center gap-x-1.5">
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
                        className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] border border-slate-700/60 text-slate-200 hover:text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                            <span>Saving file...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-sky-400" />
                            <span>↓ Download copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 active:scale-[0.98] border border-sky-500/20 text-sky-300 hover:text-sky-200 font-semibold text-xs transition-all"
                        title="Share PDF or Print"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share / Print</span>
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 text-slate-500 text-[11px] font-medium border border-slate-800 cursor-not-allowed"
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
