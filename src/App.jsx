import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import SyncBanner from './components/SyncBanner.jsx';
import MetadataForm from './components/MetadataForm.jsx';
import PunchList from './components/PunchList.jsx';
import { loadActiveDraft, saveDraft, clearActiveDraft } from './services/db.js';
import { 
  initAutoSyncListener, 
  queueInspectionForSubmission, 
  processOutboxQueue, 
  getPendingQueueCount 
} from './services/submission.js';

export default function App() {
  const [metadata, setMetadata] = useState({
    estate_name: '',
    unit_number: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0]
  });

  const [deficiencies, setDeficiencies] = useState([]);
  const [photosList, setPhotosList] = useState([]);
  const [photoMap, setPhotoMap] = useState({});

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState(null);

  useEffect(() => {
    async function initializeApp() {
      const draft = await loadActiveDraft();
      if (draft) {
        setMetadata({
          estate_name: draft.estate_name || '',
          unit_number: draft.unit_number || '',
          inspector_name: draft.inspector_name || '',
          inspection_date: draft.inspection_date || new Date().toISOString().split('T')[0]
        });
        setDeficiencies(draft.deficiencies || []);
      }

      const count = await getPendingQueueCount();
      setPendingCount(count);

      initAutoSyncListener(({ online, syncing, pendingCount: pCount }) => {
        if (typeof online === 'boolean') setIsOnline(online);
        if (typeof syncing === 'boolean') setIsSyncing(syncing);
        if (typeof pCount === 'number') setPendingCount(pCount);
      });
    }

    initializeApp();
  }, []);

  useEffect(() => {
    saveDraft({
      ...metadata,
      deficiencies
    }).catch(err => console.error('Error auto-saving draft to IndexedDB:', err));
  }, [metadata, deficiencies]);

  const handleAddPhoto = (photo) => {
    setPhotosList((prev) => [...prev, photo]);
    setPhotoMap((prev) => ({ ...prev, [photo.id]: photo }));
  };

  const handleDeletePhoto = (photoId) => {
    setPhotosList((prev) => prev.filter((p) => p.id !== photoId));
    setPhotoMap((prev) => {
      const copy = { ...prev };
      delete copy[photoId];
      return copy;
    });
  };

  const handleManualSync = async () => {
    await processOutboxQueue(({ online, syncing, pendingCount: pCount }) => {
      if (typeof online === 'boolean') setIsOnline(online);
      if (typeof syncing === 'boolean') setIsSyncing(syncing);
      if (typeof pCount === 'number') setPendingCount(pCount);
    });
  };

  const handleSubmitInspection = async (e) => {
    e.preventDefault();

    if (!metadata.estate_name.trim() || !metadata.unit_number.trim() || !metadata.inspector_name.trim()) {
      alert('Please fill in Estate Name, Unit Number, and Inspector Name before submitting.');
      return;
    }

    if (deficiencies.length === 0) {
      if (!window.confirm('No punch-list defects logged. Submit clean inspection certificate?')) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const inspectionPayload = {
        ...metadata,
        deficiencies
      };

      const queuedItem = await queueInspectionForSubmission(inspectionPayload, photosList);
      setLastSubmittedId(queuedItem.id);

      const newCount = await getPendingQueueCount();
      setPendingCount(newCount);

      setMetadata({
        estate_name: '',
        unit_number: '',
        inspector_name: metadata.inspector_name,
        inspection_date: new Date().toISOString().split('T')[0]
      });
      setDeficiencies([]);
      setPhotosList([]);
      setPhotoMap({});
      setShowSuccessModal(true);

    } catch (err) {
      console.error('Failed to submit inspection:', err);
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-28">
      <SyncBanner
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onManualSync={handleManualSync}
      />

      <main className="max-w-xl w-full mx-auto p-4 space-y-4 flex-1">
        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <span className="font-semibold">Offline Mode Active:</span> All photos, voice logs, and inspection data are stored securely in local IndexedDB. Sync will occur automatically when online.
            </div>
          </div>
        )}

        <MetadataForm
          metadata={metadata}
          onChange={setMetadata}
        />

        <PunchList
          deficiencies={deficiencies}
          onChange={setDeficiencies}
          photoMap={photoMap}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
        />

        {/* App Version & Build Footer */}
        <footer className="pt-6 pb-2 text-center text-[11px] text-slate-500 font-mono space-y-1">
          <div>InspectPWA <span className="text-sky-400 font-semibold">v1.0.5</span> (Cache: v5)</div>
          <div className="text-[10px] text-slate-600">Client-Side PDF Engine & Offline-First Sync</div>
        </footer>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4 safe-bottom z-30 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="text-xs text-slate-400 hidden sm:block">
            <span className="font-semibold text-white">{deficiencies.length}</span> Defect(s) ready
          </div>

          <button
            type="button"
            onClick={handleSubmitInspection}
            disabled={isSubmitting || !metadata.estate_name.trim() || !metadata.unit_number.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-sky-600/30 disabled:opacity-40 disabled:pointer-events-none transition-all text-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing & Generating PDF...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit & Complete Inspection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Inspection Submitted!</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isOnline 
                  ? 'All photos and the official PDF certificate have been compiled and synced to Supabase.' 
                  : 'Inspection saved safely to local IndexedDB. Photos and PDF will sync automatically once network is restored.'}
              </p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Inspection ID:</span>
                <span className="font-mono text-slate-200">{lastSubmittedId?.slice(0, 14)}...</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>PDF Status:</span>
                <span className="text-emerald-400 font-semibold">Generated & Hosted</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const item = await db.outboxQueue.get(lastSubmittedId);
                  const datePrefix = new Date().toISOString().slice(0, 7);
                  const directPdfUrl = item?.pdf_url || `https://${import.meta.env.VITE_SUPABASE_URL?.replace('https://', '')}/storage/v1/object/public/inspection-photos/reports/${datePrefix}/${lastSubmittedId}.pdf`;
                  window.open(directPdfUrl, '_blank');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>📄 View / Download PDF Report</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Start Next Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
