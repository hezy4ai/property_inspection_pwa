import Dexie from 'dexie';

export class PropertyInspectionDatabase extends Dexie {
  constructor() {
    super('PropertyInspectionDB');
    this.version(1).stores({
      drafts: 'id, estate_name, unit_number, updated_at',
      outboxQueue: 'id, status, created_at, retry_count',
      photoBlobs: 'id, inspection_id, deficiency_id, created_at'
    });
  }
}

export const db = new PropertyInspectionDatabase();

export async function saveDraft(draftData) {
  const draft = {
    id: draftData.id || 'active_draft',
    estate_name: draftData.estate_name || '',
    unit_number: draftData.unit_number || '',
    inspector_name: draftData.inspector_name || '',
    inspection_date: draftData.inspection_date || new Date().toISOString().split('T')[0],
    deficiencies: draftData.deficiencies || [],
    updated_at: new Date().toISOString()
  };
  await db.drafts.put(draft);
  return draft;
}

export async function loadActiveDraft() {
  const draft = await db.drafts.get('active_draft');
  if (draft) return draft;

  const defaultDraft = {
    id: 'active_draft',
    estate_name: '',
    unit_number: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    deficiencies: [],
    updated_at: new Date().toISOString()
  };
  await db.drafts.put(defaultDraft);
  return defaultDraft;
}

export async function clearActiveDraft() {
  await db.drafts.delete('active_draft');
}

export async function storePhotoBlob({ id, inspection_id, deficiency_id, blob, mime_type = 'image/webp' }) {
  await db.photoBlobs.put({
    id,
    inspection_id,
    deficiency_id,
    blob,
    mime_type,
    created_at: new Date().toISOString()
  });
  return id;
}

export async function getPhotoBlobsForInspection(inspection_id) {
  return await db.photoBlobs.where('inspection_id').equals(inspection_id).toArray();
}

export async function getPhotoBlob(id) {
  return await db.photoBlobs.get(id);
}

export async function deletePhotoBlob(id) {
  await db.photoBlobs.delete(id);
}
