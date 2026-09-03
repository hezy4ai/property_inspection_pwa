import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, RefreshCw, AlertCircle, PlusCircle, Inbox } from 'lucide-react';
import SyncBanner from './components/SyncBanner.jsx';
import MetadataForm from './components/MetadataForm.jsx';
import PunchList from './components/PunchList.jsx';
import OutboxList from './components/OutboxList.jsx';
import { loadActiveDraft, saveDraft, getAllOutboxItems, getOutboxItem } from './services/db.js';
import { 
  initAutoSyncListener, 
  queueInspectionForSubmission, 
  processOutboxQueue, 
  getPendingQueueCount 
} from './services/submission.js';
import { downloadPdfToDevice, shareOrOpenPdf } from './services/pdfDownloader.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'outbox'

  const [metadata, setMetadata] = useState({
    estate_name: '',
    unit_number: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0]
  });

  const [deficiencies, setDeficiencies] = useState([]);
  const [photosList, setPhotosList] = useState([]);
  const [photoMap, setPhotoMap] = useState({});
  const [outboxItems, setOutboxItems] = useState([]);

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState(null);
  const [lastSubmittedPdfUrl, setLastSubmittedPdfUrl] = useState(null);

  const refreshOutbox = async () => {
    try {
      const items = await getAllOutboxItems();
      setOutboxItems(items);
      const count = await getPendingQueueCount();
      setPendingCount(count);
    } catch (err) {
      console.error('Failed to load outbox items:', err);
    }
  };

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

      await refreshOutbox();

      initAutoSyncListener(async ({ online, syncing, pendingCount: pCount }) => {
        if (typeof online === 'boolean') setIsOnline(online);
        if (typeof syncing === 'boolean') setIsSyncing(syncing);
        if (typeof pCount === 'number') setPendingCount(pCount);
        await refreshOutbox();
      });
    }

    initializeApp();
  }, []);

  useEffect(() => {
    if (activeTab === 'new') {
      saveDraft({
        ...metadata,
        deficiencies
      }).catch(err => console.error('Error auto-saving draft to IndexedDB:', err));
    }
  }, [metadata, deficiencies, activeTab]);

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
    await processOutboxQueue(async ({ online, syncing, pendingCount: pCount }) => {
      if (typeof online === 'boolean') setIsOnline(online);
      if (typeof syncing === 'boolean') setIsSyncing(syncing);
      if (typeof pCount === 'number') setPendingCount(pCount);
      await refreshOutbox();
    });
    await refreshOutbox();
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

      // Pre-compute expected PDF URL so modal link works immediately
      const datePrefix = new Date().toISOString().slice(0, 7);
      const supabaseHost = (import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '');
      const expectedPdfUrl = `https://${supabaseHost}/storage/v1/object/public/inspection-photos/reports/${datePrefix}/${queuedItem.id}.pdf`;
      setLastSubmittedPdfUrl(expectedPdfUrl);

      await refreshOutbox();

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

      // If online, poll for a few seconds to refresh the exact synced status
      if (navigator.onLine) {
        setTimeout(async () => {
          await refreshOutbox();
          const syncedItem = await getOutboxItem(queuedItem.id);
          if (syncedItem?.pdf_url) {
            setLastSubmittedPdfUrl(syncedItem.pdf_url);
          }
        }, 2000);
      }

    } catch (err) {
      console.error('Failed to submit inspection:', err);
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-28">
      {/* Top Header */}
      <SyncBanner
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onManualSync={handleManualSync}
      />

      <main className="max-w-xl w-full mx-auto p-4 space-y-4 flex-1">
        {/* Flybird-Style Top Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'new'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New inspection</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('outbox');
              refreshOutbox();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'outbox'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Outbox ({outboxItems.length})</span>
          </button>
        </div>

        {/* TAB 1: New Inspection Form */}
        {activeTab === 'new' && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* TAB 2: Outbox List View */}
        {activeTab === 'outbox' && (
          <OutboxList
            outboxItems={outboxItems}
            isOnline={isOnline}
            isSyncing={isSyncing}
            onManualSync={handleManualSync}
          />
        )}

        {/* App Version & Build Footer */}
        <footer className="pt-6 pb-2 text-center text-[11px] text-slate-500 font-mono space-y-1">
          <div>InspectPWA <span className="text-sky-400 font-semibold">v1.0.7</span> (Cache: v7)</div>
          <div className="text-[10px] text-slate-600">Flybird Outbox & Direct Mobile PDF Downloader</div>
        </footer>
      </main>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4 safe-bottom z-30 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {activeTab === 'new' ? (
            <>
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
                    <span>Compiling & Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit & Complete Inspection</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing || pendingCount === 0}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700/90 active:scale-[0.98] border border-slate-700/80 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all text-sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Syncing {pendingCount} queued inspection(s)...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-sky-400" />
                  <span>Sync now {pendingCount > 0 ? `(${pendingCount} pending)` : '(All up to date)'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Submission Success Modal */}
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
                <span>Storage Status:</span>
                <span className="text-emerald-400 font-semibold">Saved in Outbox</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {lastSubmittedPdfUrl && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadPdfToDevice(lastSubmittedPdfUrl, `Inspection_${lastSubmittedId}`)}
                    className="py-3 px-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-600/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>↓ Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => shareOrOpenPdf(lastSubmittedPdfUrl, 'Inspection Report')}
                    className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 font-semibold text-xs border border-sky-500/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Share / Print</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab('outbox');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60 transition-all flex items-center justify-center gap-1.5"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Go to Outbox</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-400 text-xs font-medium transition-all"
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
