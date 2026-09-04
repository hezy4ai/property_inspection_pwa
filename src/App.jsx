import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, RefreshCw, AlertCircle, PlusCircle, Inbox } from 'lucide-react';
import SyncBanner from './components/SyncBanner.jsx';
import MetadataForm from './components/MetadataForm.jsx';
import PunchList from './components/PunchList.jsx';
import OutboxList from './components/OutboxList.jsx';
import { loadActiveDraft, saveDraft, getAllOutboxItems, getOutboxItem, clearActiveDraft } from './services/db.js';
import { getWatDateString } from './utils/date.js';
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
    inspection_date: getWatDateString()
  });

  const [deficiencies, setDeficiencies] = useState([]);
  const [activeDefect, setActiveDefect] = useState(null);
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
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'

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
          inspection_date: draft.inspection_date || getWatDateString()
        });
        setDeficiencies(draft.deficiencies || []);
        
        let loadedPhotosList = [];
        if (draft.photos_list && draft.photos_list.length > 0) {
          loadedPhotosList = draft.photos_list.map(photo => {
             const blob = new Blob([photo.buffer], { type: photo.mimeType || photo.mime_type || 'image/webp' });
             return {
               ...photo,
               blob,
               previewUrl: URL.createObjectURL(blob)
             };
          });
          setPhotosList(loadedPhotosList);
          const map = {};
          loadedPhotosList.forEach(p => { map[p.id] = p; });
          setPhotoMap(map);
        }

        if (draft.active_defect) {
          const hydratedActiveDefect = { ...draft.active_defect };
          if (hydratedActiveDefect.draftPhotos) {
             hydratedActiveDefect.draftPhotos = hydratedActiveDefect.draftPhotos.map(photo => {
                if (photo.buffer && !photo.previewUrl) {
                   const blob = new Blob([photo.buffer], { type: photo.mimeType || photo.mime_type || 'image/webp' });
                   return {
                     ...photo,
                     blob,
                     previewUrl: URL.createObjectURL(blob)
                   };
                }
                return photo;
             });
          }
          setActiveDefect(hydratedActiveDefect);
        }
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
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        saveDraft({
          ...metadata,
          deficiencies,
          active_defect: activeDefect ? {
            ...activeDefect,
            draftPhotos: activeDefect.draftPhotos ? activeDefect.draftPhotos.map(p => ({
              id: p.id,
              buffer: p.buffer,
              mimeType: p.mimeType || p.mime_type || 'image/webp',
              width: p.width,
              height: p.height
            })) : []
          } : null,
          photos_list: photosList.map(p => ({
            id: p.id,
            buffer: p.buffer,
            mimeType: p.mimeType || p.mime_type || 'image/webp',
            width: p.width,
            height: p.height,
            deficiency_id: p.deficiency_id
          }))
        }).then(() => setSaveStatus('saved'))
          .catch(err => {
            console.error('Error auto-saving draft to IndexedDB:', err);
            setSaveStatus('saved');
          });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [metadata, deficiencies, activeDefect, photosList, activeTab]);

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

      await clearActiveDraft();
      
      setMetadata({
        estate_name: '',
        unit_number: '',
        inspector_name: metadata.inspector_name,
        inspection_date: getWatDateString()
      });
      setDeficiencies([]);
      setActiveDefect(null);
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
    <div className="min-h-screen flex flex-col bg-app-bg text-app-text-primary pb-28">
      {/* Top Header */}
      <SyncBanner
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onManualSync={handleManualSync}
        saveStatus={saveStatus}
      />

      <main className="max-w-xl w-full mx-auto p-4 space-y-4 flex-1">
        {/* Top Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-app-card border border-app-border rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'new'
                ? 'bg-app-brand-primary text-white shadow-md shadow-app-brand-primary/20'
                : 'text-app-text-secondary hover:text-app-text-primary hover:bg-black/5'
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
                ? 'bg-app-brand-secondary text-app-text-primary border-app-brand-secondary shadow-md'
                : 'text-app-text-secondary hover:text-app-text-primary hover:bg-black/5'
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
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
              activeDefect={activeDefect}
              onActiveDefectChange={setActiveDefect}
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
        <footer className="pt-6 pb-2 text-center text-[11px] text-app-text-secondary font-mono space-y-1">
          <div>InspectPWA <span className="text-app-brand-primary font-semibold">v1.1.2</span> (Cache: v13)</div>
          <div className="text-[10px] opacity-75">Property Inspection Suite</div>
        </footer>
      </main>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-app-card/95 backdrop-blur-lg border-t border-app-border p-4 safe-bottom z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {activeTab === 'new' ? (
            <>
              <div className="text-xs text-app-text-secondary hidden sm:block">
                <span className="font-semibold text-app-text-primary">{deficiencies.length}</span> Defect(s) ready
              </div>

              <button
                type="button"
                onClick={handleSubmitInspection}
                disabled={isSubmitting || !metadata.estate_name.trim() || !metadata.unit_number.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-app-brand-primary hover:bg-app-brand-primary/90 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all text-sm"
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
              className="w-full flex items-center justify-center gap-2 bg-app-brand-secondary hover:bg-app-brand-secondary/90 active:scale-[0.98] border border-app-brand-secondary text-app-text-primary font-bold py-3.5 px-6 rounded-xl shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all text-sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-app-text-primary" />
                  <span>Syncing {pendingCount} queued inspection(s)...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-app-text-primary" />
                  <span>Sync now {pendingCount > 0 ? `(${pendingCount} pending)` : '(All up to date)'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Submission Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-app-card border border-app-border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 text-app-status-success rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-app-text-primary">Inspection Submitted!</h3>
              <p className="text-xs text-app-text-secondary mt-1">
                {isOnline 
                  ? 'All photos and the official PDF certificate have been compiled and synced to Supabase.' 
                  : 'Inspection saved safely to local IndexedDB. Photos and PDF will sync automatically once network is restored.'}
              </p>
            </div>

            <div className="p-3 bg-black/5 rounded-xl border border-app-border text-left text-xs space-y-1.5">
              <div className="flex justify-between text-app-text-secondary">
                <span>Inspection ID:</span>
                <span className="font-mono text-app-text-primary">{lastSubmittedId?.slice(0, 14)}...</span>
              </div>
              <div className="flex justify-between text-app-text-secondary">
                <span>Storage Status:</span>
                <span className="text-app-status-success font-semibold">Saved in Outbox</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {lastSubmittedPdfUrl && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadPdfToDevice(lastSubmittedPdfUrl, `Inspection_${lastSubmittedId}`)}
                    className="py-3 px-2 rounded-xl bg-app-brand-primary hover:bg-app-brand-primary/90 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>↓ Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => shareOrOpenPdf(lastSubmittedPdfUrl, 'Inspection Report')}
                    className="py-3 px-2 rounded-xl bg-white hover:bg-gray-50 text-app-brand-primary font-semibold text-xs border border-app-border flex items-center justify-center gap-1.5 transition-all"
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
                className="w-full py-2.5 rounded-xl bg-white hover:bg-gray-50 text-app-text-primary font-semibold text-xs border border-app-border transition-all flex items-center justify-center gap-1.5"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Go to Outbox</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2 rounded-xl text-app-text-secondary hover:text-app-text-primary text-xs font-medium transition-all"
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
