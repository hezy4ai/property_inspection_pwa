# Product Requirements Document (PRD)

## 1. Product Vision & Executive Summary
The **Property Inspection & Punch-List Progressive Web App (PWA)** is an ultra-fast, mobile-first, offline-capable field tool tailored for property inspectors, handover managers, and site supervisors. It simplifies the snagging and punch-list logging process in challenging on-site environments—especially new builds, basements, and concrete structures where cellular/Wi-Fi coverage is unreliable or non-existent.

The solution consists of two cleanly separated components:
1. **Field Inspector Mobile PWA (Isolated Field App):** Optimized for low latency, single-handed mobile operation, native hardware camera capture, push-to-talk voice transcription, and 100% offline persistence.
2. **Decoupled Executive Review Dashboard (Separate Viewer):** A lightweight, read-only desktop/tablet dashboard for property managers and executives to search, inspect, review, and download generated PDF inspection reports.

---

## 2. User Personas

### Persona A: Field Inspector / Snagging Supervisor ("The Field User")
* **Context:** Walking through active construction sites, unpowered apartments, or subterranean parking areas with intermittent or zero network connectivity.
* **Needs:** 
  * Instant app boot even in Airplane Mode.
  * Fast, sequentially numbered defect logging with room/area tagging.
  * Push-to-talk voice dictation for rapid text entry without tedious keyboard typing on mobile.
  * Direct high-resolution camera photo capture with automated local queueing.
  * Complete peace of mind that no data or photo is lost when offline.

### Persona B: Property Operations Executive / Client Manager ("The Reviewer")
* **Context:** Office or desk-based reviewing inspection outcomes across multiple estates, communities, and units.
* **Needs:**
  * Clean, searchable dashboard to track completed inspections by community, unit, inspector, and date.
  * Detailed inspection drawer showing defect items and photo galleries.
  * Instant access to professional, branded PDF inspection certificates generated via Google Docs.

---

## 3. Core User Stories

| ID | Persona | User Story | Acceptance Criteria |
|---|---|---|---|
| **US-01** | Field Inspector | As an inspector entering a dead zone, I want the app to function identically offline so I can complete inspections without interruption. | App loads from Service Worker cache; UI confirms offline state; all forms and storage operate seamlessly via IndexedDB. |
| **US-02** | Field Inspector | As an inspector, I want to dictate defects using voice-to-text so I can record notes hands-free and rapidly. | Push-to-talk mic button activates Web Speech API, transcribing speech directly into editable deficiency text. |
| **US-03** | Field Inspector | As an inspector, I want to capture photos directly with my device camera and attach them to room-tagged defects. | In-app camera stream captures photos, generates compressed local blobs, stores them in IndexedDB, and renders instant previews. |
| **US-04** | Field Inspector | As an inspector, I want to review, edit, reorder, and delete logged deficiency items before submission. | Inline room selection (Living Room, Master Bed, etc.), editable item text, and item deletion/reorder controls. |
| **US-05** | Field Inspector | As an inspector returning to cellular/Wi-Fi coverage, I want my queued inspections and binary photos to sync automatically. | Background sync queue detects network restoration, sequentially uploads photos to Supabase Storage, writes database records, and notifies the user upon success. |
| **US-06** | Executive | As an executive, I want a decoupled web dashboard to search, view, and download generated PDF reports without affecting field app speed. | Dedicated viewer fetches from Supabase; displays searchable tables, detail drawers, and direct PDF download links. |

---

## 4. Offline-First Field Workflow

```
[Start Inspection]
       │
       ▼
[Enter Property Details] (Estate Name, Unit #, Inspector Name)
       │
       ▼
[Log Deficiencies in Field]
   ├── Push-to-Talk Voice Dictation (Web Speech API)
   ├── Room / Location Tagging (e.g. Master Bedroom, Kitchen)
   └── High-Res Camera Capture (Canvas / Blob to IndexedDB)
       │
       ▼
[Review & Finalize Punch-List]
       │
       ▼
[Submit Inspection]
   ├── Connection Active? 
   │     ├─► YES: Direct Transactional Upload to Supabase & Trigger n8n Webhook
   │     └─► NO: Store in IndexedDB Outbox Queue with Pending Status
   │
[Network Restored (Online Event)]
       ▼
[Submission & Sync Engine (`submission.js`)]
   ├── 1. Upload binary image blobs to Supabase Storage bucket (`inspection-photos`)
   ├── 2. Insert row into `property_inspections` table
   ├── 3. Fire asynchronous n8n Webhook for PDF Generation & Email Delivery
   └── 4. Mark local queue item as SYNCED
```

---

## 5. Architectural Separation

To guarantee maximum speed and minimal bundle footprint for field devices:
* **Mobile Field PWA Bundle:** Completely isolated from desktop review libraries, complex charting, and heavy multi-tenant logic. Ships only essential offline-first PWA code with `manifest.json` / `manifest.js` for standalone home screen installation.
* **Executive Review Dashboard:** Exists as an independent project/viewer, reading directly from the Supabase database without bloating the field inspector client.

---

## 6. Scope Definition

### In-Scope for PoC
1. **Service Worker (`sw.js`) & PWA Manifest (`manifest.json`/`manifest.js`):** Static asset caching, offline fallback, standalone mobile display, and PWA manifest for home-screen installation.
2. **Camera & Image Capture Engine:** Direct media stream, client-side preview, and local binary blob management.
3. **Voice-to-Text Dictation:** Native Web Speech API integration with fallbacks for manual text input.
4. **IndexedDB Local Data & Outbox Queue (Dexie.js):** Reliable persistence of draft inspections and queued submission payloads.
5. **Submission & Sync Engine (`submission.js`):** Transactional queue processing, exponential retry, and auto-sync on `window.online`.
6. **Supabase Integration:** `property_inspections` table and `inspection-photos` storage bucket.
7. **n8n + Google Docs PDF Engine:** Automated webhook triggering Google Docs master template cloning, dynamic table injection, and PDF export.

### Out-of-Scope (Deferred to V2)
* Multi-tenant SaaS billing, Stripe subscriptions, and organization management.
* Complex Role-Based Access Control (RBAC) matrices.
* Batch ZIP archive photo download utilities.
* Real-time multi-inspector collaborative concurrent editing on a single unit.
