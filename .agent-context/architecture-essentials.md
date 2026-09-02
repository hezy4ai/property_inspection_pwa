# Architecture Essentials & Technical Specification

## 1. Technology Stack

| Layer | Technology | Rationale & Responsibility |
|---|---|---|
| **Core Framework** | **Vite + React (JavaScript/TypeScript)** | Lightning-fast HMR, tiny production bundles, optimal for mobile devices. |
| **Styling System** | **Tailwind CSS** | Utility-first, responsive mobile design, zero runtime overhead. |
| **Iconography** | **Lucide React** | Consistent, tree-shakable modern icons for mobile touch targets. |
| **Offline Storage** | **IndexedDB (via Dexie.js)** | Robust client-side database supporting binary Blobs and transactional queueing. |
| **PWA Manifest** | **`manifest.json` / `manifest.js`** | Standalone display mode, A2HS installation metadata, orientation lock, splash icons. |
| **Service Worker** | **`sw.js` (Cache-First PWA Shell)** | Full offline asset caching for 100% offline boot and network dead zone usage. |
| **Submission & Sync** | **`src/services/submission.js`** | Payload packaging, IndexedDB queue dispatcher, offline-to-online sync orchestration. |
| **Voice Dictation** | **Web Speech API** | Native hardware speech-to-text with zero third-party latency or external API cost. |
| **Backend & Auth** | **Supabase (`@supabase/supabase-js`)** | PostgreSQL database with JSONB support, row-level security, and object storage. |
| **Storage Bucket** | **Supabase Storage (`inspection-photos`)** | Scalable asset hosting for compressed high-resolution inspection photos. |
| **Automation Pipeline** | **n8n Webhook + Google Docs API** | Asynchronous template cloning, deficiency table injection, PDF compilation & emailing. |
| **Hosting & CI/CD** | **Vercel** | Edge-accelerated PWA hosting with direct GitHub repository integration. |

---

## 2. Supabase Database Schema

### Table: `property_inspections`

```sql
-- 1. Create the Property Inspections table
CREATE TABLE IF NOT EXISTS public.property_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    estate_name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    deficiencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    pdf_url TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Performance Indexes for Search & Filtering
CREATE INDEX IF NOT EXISTS idx_inspections_estate ON public.property_inspections(estate_name);
CREATE INDEX IF NOT EXISTS idx_inspections_unit ON public.property_inspections(unit_number);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON public.property_inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON public.property_inspections(inspector_name);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;

-- 4. Idempotent Table Access Policies (Safe to re-run)
DROP POLICY IF EXISTS "Allow public insert" ON public.property_inspections;
CREATE POLICY "Allow public insert" ON public.property_inspections
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update for idempotency" ON public.property_inspections;
CREATE POLICY "Allow public update for idempotency" ON public.property_inspections
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read" ON public.property_inspections;
CREATE POLICY "Allow public read" ON public.property_inspections
    FOR SELECT TO anon, authenticated USING (true);

-- 5. Storage Bucket & Permissions Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public upload to inspection-photos" ON storage.objects;
CREATE POLICY "Allow public upload to inspection-photos" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "Allow public update to inspection-photos" ON storage.objects;
CREATE POLICY "Allow public update to inspection-photos" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id = 'inspection-photos')
    WITH CHECK (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "Allow public view from inspection-photos" ON storage.objects;
CREATE POLICY "Allow public view from inspection-photos" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'inspection-photos');
```

### Deficiencies JSONB Structure Specification
```json
[
  {
    "item_number": 1,
    "area": "Master Bedroom",
    "description": "Hairline paint cracks along the north ceiling cornice.",
    "severity": "MINOR",
    "photo_indices": [0],
    "created_at": "2026-09-01T10:00:00Z"
  },
  {
    "item_number": 2,
    "area": "Kitchen",
    "description": "Base cabinet hinge loose below sink unit.",
    "severity": "MODERATE",
    "photo_indices": [1],
    "created_at": "2026-09-01T10:05:00Z"
  }
]
```

### Storage Bucket: `inspection-photos`
* **Bucket Name:** `inspection-photos`
* **Access Policy:** Public Read / Authenticated/Anon Insert
* **Path Convention:** `{YYYY-MM}/{inspection_id}/{photo_index}_{uuid}.webp`

---

## 3. Client Storage Architecture (IndexedDB / Dexie.js)

```javascript
// Dexie Database Definition
import Dexie from 'dexie';

export const db = new Dexie('PropertyInspectionDB');

db.version(1).stores({
  drafts: 'id, estate_name, unit_number, updated_at',
  outbox: 'id, status, created_at, retry_count',
  photo_blobs: 'id, inspection_id, blob, mime_type'
});
```

### Outbox Record Model
```typescript
interface OutboxItem {
  id: string; // UUID
  status: 'PENDING' | 'UPLOADING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  last_error?: string;
  created_at: string;
  payload: {
    estate_name: string;
    unit_number: string;
    inspector_name: string;
    inspection_date: string;
    deficiencies: Array<{
      item_number: number;
      area: string;
      description: string;
      severity: string;
      photo_ids: string[];
    }>;
  };
}
```

---

## 4. n8n Automation Webhook Contract

### Webhook Request (POST `/webhook/inspection-sync`)
* **Headers:** `Content-Type: application/json`, `X-Inspection-Signature: <token>`
* **Payload:**
```json
{
  "inspection_id": "8f3b2c1a-5d6e-4f7a-9b8c-1e2d3c4b5a6f",
  "estate_name": "Parkview Residences",
  "unit_number": "Block B - Unit 402",
  "inspector_name": "Alex Mercer",
  "inspection_date": "2026-09-01",
  "deficiencies_count": 5,
  "deficiencies": [
    {
      "item_number": 1,
      "area": "Living Room",
      "description": "Baseboard sealant peeling near balcony door.",
      "photo_urls": ["https://.../photo1.webp"]
    }
  ],
  "photo_urls": [
    "https://.../photo1.webp"
  ]
}
```

### n8n Execution Steps:
1. **Webhook Node:** Receives payload.
2. **Google Drive Node:** Clones template document (`TEMPLATE_DOC_ID`).
3. **Google Docs Node:** Replaces document text variables (`{{ESTATE_NAME}}`, `{{UNIT_NUMBER}}`, `{{INSPECTOR_NAME}}`, `{{DATE}}`) and inserts deficiency table rows.
4. **Google Drive Node:** Exports Google Doc as PDF.
5. **Supabase Node / HTTP Request:** Updates `property_inspections` record with `pdf_url`.
6. **Email / Notification Node:** Dispatches PDF attachment to stakeholder distribution list.

---

## 5. Environment Variables Contract

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# n8n Automation Webhook
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/inspection-sync

# Feature Toggles
VITE_ENABLE_SPEECH_RECOGNITION=true
VITE_IMAGE_MAX_DIMENSION=1920
VITE_IMAGE_QUALITY=0.8
```
