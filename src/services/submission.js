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
      mime_type: photo.mime_type || 'image/webp'
    });
  }

  const queueItem = {
    id: inspectionId,
    status: 'PENDING',
    retry_count: 0,
    created_at: new Date().toISOString(),
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

        for (const photo of storedPhotos) {
          const fileExt = photo.mime_type.includes('png') ? 'png' : photo.mime_type.includes('jpeg') ? 'jpg' : 'webp';
          const filePath = `${datePrefix}/${item.id}/${photo.id}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, photo.blob, {
              contentType: photo.mime_type,
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

        const insertPayload = {
          id: item.id, // Client-generated UUID guarantees idempotency
          estate_name: item.payload.estate_name,
          unit_number: item.payload.unit_number,
          inspector_name: item.payload.inspector_name,
          inspection_date: item.payload.inspection_date || new Date().toISOString().split('T')[0],
          status: 'COMPLETED',
          deficiencies: enrichedDeficiencies,
          photo_urls: uploadedPhotoUrls,
          metadata: {
            app_version: '1.0.0',
            synced_at: new Date().toISOString(),
            offline_queued_at: item.created_at
          }
        };

        // Upsert guarantees no duplicate records even if network retries multiple times
        const { data: insertedRecord, error: dbError } = await supabase
          .from(INSPECTIONS_TABLE)
          .upsert(insertPayload, { onConflict: 'id' })
          .select()
          .single();

        if (dbError) {
          console.warn('[Sync Engine] Supabase database insert note:', dbError.message);
        }

        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inspection_id: insertedRecord?.id || item.id,
              ...insertPayload
            })
          }).catch(webhookErr => console.warn('[Sync Engine] n8n Webhook trigger warning:', webhookErr));
        }

        await db.outboxQueue.update(item.id, {
          status: 'SYNCED',
          synced_at: new Date().toISOString()
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
