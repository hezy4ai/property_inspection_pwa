import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, CloudOff } from 'lucide-react';

export default function SyncBanner({ isOnline, isSyncing, pendingCount, onManualSync, saveStatus }) {
  return (
    <header className="sticky top-0 z-30 bg-app-brand-primary border-b border-app-brand-primary px-4 py-3 shadow-md">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-app-brand-primary shadow-sm">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-white leading-tight">InspectPWA</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white border border-white/10">v1.1.2</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-white/80">Field Punch-List</p>
              {saveStatus === 'saving' && (
                <span className="text-[10px] text-amber-200/90 italic flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5 animate-spin"/> Saving...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[10px] text-white/70 italic flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5"/> Saved locally</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/10 text-xs font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing...</span>
            </div>
          ) : isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/10 text-xs font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-app-status-critical/80 text-white border border-app-status-critical/20 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </div>
          )}

          {!isOnline && pendingCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white border border-white/10 text-xs font-bold">
              <CloudOff className="w-3.5 h-3.5" />
              <span>{pendingCount}</span>
            </div>
          )}

          {isOnline && pendingCount > 0 && !isSyncing && (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-app-brand-secondary text-app-text-primary border border-app-brand-secondary/20 hover:bg-app-brand-secondary/90 transition-colors text-xs font-bold shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync {pendingCount}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
