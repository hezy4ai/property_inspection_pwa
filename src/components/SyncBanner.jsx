import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

export default function SyncBanner({ isOnline, isSyncing, pendingCount, onManualSync }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white shadow-sm shadow-sky-500/20">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-white leading-tight">InspectPWA</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700">v1.0.6</span>
            </div>
            <p className="text-[11px] text-slate-400">Field Punch-List</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing...</span>
            </div>
          ) : isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </div>
          )}

          {pendingCount > 0 && (
            <button
              onClick={onManualSync}
              disabled={!isOnline || isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 active:scale-95 transition-all text-xs font-medium disabled:opacity-50"
              title="Click to sync outbox"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{pendingCount} Queued</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
