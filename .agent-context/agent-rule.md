# Engineering Rules & Agent Guidelines

## 1. Core Engineering Philosophy
This project is an **offline-first, mission-critical field utility**. Software failure or data loss in the field causes costly re-inspections. Every line of code written must prioritize reliability, speed, and clean modularity.

---

## 2. Mandatory Rules for Development

### Rule 1: Zero SaaS Wrapper Overhead
* **Build Custom, Clean Code:** Do not introduce bloated third-party wrappers, heavy UI component frameworks, or commercial SaaS libraries for features natively supported by standard web APIs (e.g. use native Web Speech API, native MediaDevices/Canvas, native Service Worker).
* **Bundle Budget:** Keep production bundle size minimal to ensure near-instant cold boot on entry-level mobile devices.

### Rule 2: Absolute Offline Resilience & Transactional Integrity
* **Persist Before Network:** Every user input, defect addition, and captured photo must be committed to **IndexedDB (Dexie.js)** *before* any network operation is attempted.
* **Never Assume Connectivity:** Network calls can fail mid-flight or time out in dead zones. The sync engine (`submission.js`) must treat network connectivity as volatile.
* **Idempotent Queue Operations:** Submitting or re-syncing an inspection must be idempotent. If an upload fails midway, subsequent retries must not create duplicate inspections in Supabase.

### Rule 3: Strict File Modularity & Separation of Concerns
Maintain clean structural boundaries across codebase files. Under no circumstances should UI components handle low-level network retry loops or binary canvas image manipulation directly.

* **`src/services/db.js`**: Pure IndexedDB schema, CRUD transactions, and local state queries.
* **`src/services/submission.js`**: Inspection validation, payload bundling, outbox queue worker, network listeners (`online`/`offline`), and Supabase upload orchestration.
* **`src/services/speech.js`**: Web Speech API abstraction, permission guards, push-to-talk state machine, and error fallback handlers.
* **`src/services/camera.js`**: Camera stream constraints, snapshot capture, client-side canvas compression to WebP, and blob generation.
* **`src/components/`**: Presentation and user interaction components only; interact with services via clean hooks and state handlers.

### Rule 4: Data Contract Rigor
* All deficiency items must maintain sequential numbering (`item_number`), room tagging (`area`), and timestamp tracking.
* Photos must be compressed (WebP, max dimension 1920px, 0.8 quality) prior to storage in IndexedDB to avoid storage quota exhaustion on mobile browsers.
* The JSONB structure in Supabase must strictly match the schema defined in [`architecture-essentials.md`](file:///c:/property_pwa/.agent-context/architecture-essentials.md).

### Rule 5: Mobile-First Touch Ergonomics
* Design strictly for one-handed mobile field operation.
* Push-to-talk mic button and camera trigger must have large, accessible touch targets (minimum 48x48px).
* Prominent visual indicators for network state:
  * 🟢 **Online** (Ready to sync)
  * 🟡 **Syncing** (Uploading queue)
  * 🔴 **Offline Mode** (Saved to device)

### Rule 6: Execution Protocol & Git Boundaries
* **Strict Git Prohibition:** The AI agent is **NEVER** allowed to run `git commit`, `git push`, or any remote repository commands. All Git staging, commits, and pushes are performed manually and exclusively by the user.
* Do not introduce code that contradicts the specifications in `.agent-context/`.
* Any architectural decision or schema change must be documented in `.agent-context/` before or alongside implementation.
* Always verify offline functionality (e.g., simulating disconnected network conditions) before declaring features complete.
