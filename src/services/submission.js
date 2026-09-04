import { db, storePhotoBlob, getPhotoBlobsForInspection, clearActiveDraft } from './db.js';
import { supabase, STORAGE_BUCKET, INSPECTIONS_TABLE } from './supabase.js';

let isSyncing = false;
let autoSyncInitialized = false;

export function initAutoSyncListener(onSyncStatusChange) {
  if (autoSyncInitialized || typeof window === 'undefined') return;
  autoSyncInitialized = true;

  window.addEventListener('online', async () => {
    console.log('[Sync Engine] Network restored. Processing outbox queue...');
    if (onSyncStatusChange) onSyncStatusChange({ online: true, syncing: true });
    await processOutboxQueue(onSyncStatusChange);
  });

  window.addEventListener('offline', () => {
    console.log('[Sync Engine] Network disconnected.');
    if (onSyncStatusChange) onSyncStatusChange({ online: false, syncing: false });
  });

  if (navigator.onLine) {
    processOutboxQueue(onSyncStatusChange).catch(err => console.error('Initial sync error:', err));
  }
}

export async function queueInspectionForSubmission(inspectionData, photoBlobs = []) {
  // Generate RFC4122 UUID v4 on client for guaranteed idempotency
  const inspectionId = inspectionData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `insp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  for (const photo of photoBlobs) {
    await storePhotoBlob({
      id: photo.id,
      inspection_id: inspectionId,
      deficiency_id: photo.deficiency_id,
      blob: photo.blob,
      buffer: photo.buffer,
      mime_type: photo.mimeType || photo.mime_type || 'image/webp'
    });
  }

  const queueItem = {
    id: inspectionId,
    status: 'PENDING',
    retry_count: 0,
    created_at: new Date().toISOString(),
    estate_name: inspectionData.estate_name || '',
    unit_number: inspectionData.unit_number || '',
    inspector_name: inspectionData.inspector_name || '',
    inspection_date: inspectionData.inspection_date || new Date().toISOString().split('T')[0],
    deficiencies_count: (inspectionData.deficiencies || []).length,
    photos_count: photoBlobs.length,
    pdf_url: null,
    payload: {
      ...inspectionData,
      id: inspectionId,
      submitted_at: new Date().toISOString()
    }
  };

  await db.outboxQueue.put(queueItem);
  await clearActiveDraft();

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processOutboxQueue().catch(err => console.error('[Sync Engine] Background sync error:', err));
  }

  return queueItem;
}

export async function getPendingQueueCount() {
  return await db.outboxQueue.where('status').equals('PENDING').count();
}

export async function processOutboxQueue(onStatusChange) {
  if (isSyncing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[Sync Engine] Cannot sync: Device is offline.');
    if (onStatusChange) onStatusChange({ online: false, syncing: false });
    return;
  }

  isSyncing = true;
  if (onStatusChange) onStatusChange({ online: true, syncing: true });

  try {
    const pendingItems = await db.outboxQueue.where('status').equals('PENDING').toArray();

    for (const item of pendingItems) {
      try {
        await db.outboxQueue.update(item.id, { status: 'UPLOADING' });
        
        const storedPhotos = await getPhotoBlobsForInspection(item.id);
        const uploadedPhotoUrls = [];
        const photoMap = new Map();

        const datePrefix = new Date().toISOString().slice(0, 7);

        // 1. Upload Defect Photos to Supabase Storage
        for (const photo of storedPhotos) {
          const fileExt = photo.mime_type.includes('png') ? 'png' : photo.mime_type.includes('jpeg') ? 'jpg' : 'webp';
          const filePath = `photos/${datePrefix}/${item.id}/${photo.id}.${fileExt}`;

          // Ensure we have a valid Blob/File object (buffer is robust across IndexedDB rehydration)
          let uploadBody = photo.blob;
          if (photo.buffer) {
            uploadBody = new File([photo.buffer], `${photo.id}.${fileExt}`, { type: photo.mime_type || 'image/webp' });
          } else if (!(uploadBody instanceof Blob)) {
            console.warn(`[Sync Engine] Warning: no valid buffer or blob for ${photo.id}`);
          }

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, uploadBody, {
              contentType: photo.mime_type || 'image/webp',
              upsert: true
            });

          if (uploadError) {
            console.warn(`[Sync Engine] Photo upload warning for ${photo.id}:`, uploadError.message);
            photoMap.set(photo.id, `local://${photo.id}`);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(filePath);
            const publicUrl = publicUrlData?.publicUrl || filePath;
            uploadedPhotoUrls.push(publicUrl);
            photoMap.set(photo.id, publicUrl);
          }
        }

        const enrichedDeficiencies = (item.payload.deficiencies || []).map(def => ({
          ...def,
          photo_urls: (def.photo_ids || []).map(id => photoMap.get(id)).filter(Boolean)
        }));

        // 2. Generate PDF Report In-Memory (Dynamic Lazy Import)
        let generatedPdfUrl = null;
        try {
          const { generateInspectionPdfBlob } = await import('./pdfReport.jsx');
          const pdfPayload = {
            id: item.id,
            estate_name: item.payload.estate_name,
            unit_number: item.payload.unit_number,
            inspector_name: item.payload.inspector_name,
            inspection_date: item.payload.inspection_date || new Date().toISOString().split('T')[0],
            status: 'COMPLETED',
            deficiencies: enrichedDeficiencies
          };

          const pdfBlob = await generateInspectionPdfBlob(pdfPayload);
          const pdfFilePath = `reports/${datePrefix}/${item.id}.pdf`;

          const { error: pdfUploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(pdfFilePath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (!pdfUploadError) {
            const { data: pdfUrlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(pdfFilePath);
            generatedPdfUrl = pdfUrlData?.publicUrl || pdfFilePath;
          } else {
            console.warn('[Sync Engine] PDF upload warning:', pdfUploadError.message);
          }
        } catch (pdfErr) {
          console.error('[Sync Engine] PDF generation error:', pdfErr);
        }

        // 3. Atomic Database Upsert with pdf_url pre-populated
        const insertPayload = {
          id: item.id, // Client-generated UUID guarantees idempotency
          estate_name: item.payload.estate_name,
          unit_number: item.payload.unit_number,
          inspector_name: item.payload.inspector_name,
          inspection_date: item.payload.inspection_date || new Date().toISOString().split('T')[0],
          status: 'COMPLETED',
          deficiencies: enrichedDeficiencies,
          photo_urls: uploadedPhotoUrls,
          pdf_url: generatedPdfUrl,
          metadata: {
            app_version: '1.0.5',
            synced_at: new Date().toISOString(),
            offline_queued_at: item.created_at
          }
        };

        const { error: dbError } = await supabase
          .from(INSPECTIONS_TABLE)
          .upsert(insertPayload, { onConflict: 'id' });

        if (dbError) {
          console.warn('[Sync Engine] Supabase database insert note:', dbError.message);
        }

        await db.outboxQueue.update(item.id, {
          status: 'SYNCED',
          synced_at: new Date().toISOString(),
          pdf_url: generatedPdfUrl
        });

      } catch (itemError) {
        console.error(`[Sync Engine] Failed to sync inspection ${item.id}:`, itemError);
        await db.outboxQueue.update(item.id, {
          status: 'PENDING',
          retry_count: (item.retry_count || 0) + 1,
          last_error: itemError.message
        });
      }
    }
  } finally {
    isSyncing = false;
    if (onStatusChange) {
      onStatusChange({
        online: navigator.onLine,
        syncing: false,
        pendingCount: await getPendingQueueCount()
      });
    }
  }
}
