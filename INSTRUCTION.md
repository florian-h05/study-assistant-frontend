# Study Assistant — Frontend Implementation Instructions

## Overview

Build a static frontend for the Study Assistant application. The frontend communicates
with a self-hosted n8n backend via three webhook endpoints. Users configure the n8n
server URL and Bearer token through a settings modal; these are persisted in
`localStorage`.

---

## Toolchain

- **TypeScript** — strict mode, no `any`
- **Parcel** — bundler and dev server, no manual webpack/vite config
- **No UI framework** — vanilla DOM, no React/Vue/Svelte
- **No CSS framework** — hand-written CSS with custom properties

---

## Project layout

study-assistant/
├── package.json
├── tsconfig.json
├── src/
│ ├── index.html
│ ├── style.css
│ ├── types.ts
│ ├── app.ts
│ ├── api.ts
│ ├── settings.ts
│ ├── docs-table.ts
│ ├── upload-modal.ts
│ └── components/
│ ├── toast.ts
│ ├── spinner.ts
│ ├── confirm.ts
│ └── badge.ts

---

## Bootstrap files

### `package.json`

```json
{
  "name": "study-assistant",
  "private": true,
  "scripts": {
    "dev": "parcel src/index.html",
    "build": "parcel build src/index.html --dist-dir dist"
  },
  "devDependencies": {
    "parcel": "latest",
    "typescript": "latest"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

Parcel detects TypeScript automatically via `tsconfig.json`. No additional Parcel
plugins are required.

To get started:

```bash
npm install
npm run dev    # dev server with HMR
npm run build  # production bundle → dist/
```

---

## `src/index.html` — App shell

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Study Assistant</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="app">
      <header id="toolbar"></header>
      <main id="main-content"></main>
    </div>

    <!-- Mount points for portals -->
    <div id="modal-root"></div>
    <div id="toast-root"></div>
    <div id="spinner-root"></div>

    <script type="module" src="app.ts"></script>
  </body>
</html>
```

---

## `src/types.ts`

Define all shared types here. Import from this file everywhere — never redefine
inline.

```ts
export type DocType = "lecture" | "exercise" | "assignment" | "exam";
export type Term = "winter" | "summer";

export interface Doc {
  id: number;
  course_name: string;
  doc_type: DocType;
  term: Term;
  year: number;
  num_pages: number;
  chapter_name: string | null;
  label: string | null;
  pdf_sequence: number | null;
  metadata: Record<string, unknown>;
  created_at: string; // ISO 8601
}

export interface Config {
  serverUrl: string; // no trailing slash
  token: string;
}

export interface IngestPayload {
  course: string;
  type: DocType;
  term: Term;
  year: number;
  chapter?: string; // required when type is lecture | exercise
  label?: string; // required when type is assignment
  file: string; // base64-encoded PDF, no data-URI prefix
}
```

---

## `src/api.ts`

All network calls live here. No other module calls `fetch` directly.

### Config helper

```ts
import type { Config } from "./types";

const CONFIG_KEY = "study_assistant_config";

export function getConfig(): Config {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) throw new Error("NOT_CONFIGURED");
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
```

### Base fetch wrapper

```ts
async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { serverUrl, token } = getConfig();
  const url = `${serverUrl}/webhook/${path}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let message: string;
    try {
      const text = await res.text();
      message = text || `HTTP ${res.status}`;
    } catch {
      message = `HTTP ${res.status}`;
    }
    const err = new Error(message);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }

  return res;
}
```

### `fileToBase64`

```ts
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
```

### `getDocs()`

GET {serverUrl}/webhook/study-assistant-doc
Authorization: Bearer {token}
Response: JSON array of Doc objects

```ts
import type { Doc } from "./types";

export async function getDocs(): Promise<Doc[]> {
  const res = await apiFetch("study-assistant-doc");
  return res.json() as Promise<Doc[]>;
}
```

### `ingestDoc(payload)`

POST {serverUrl}/webhook/study-assistant-doc
Authorization: Bearer {token}
Content-Type: application/json
Body:
{
"course": "Operating Systems",
"type": "lecture",
"term": "winter",
"year": 2026,
"chapter": "CPU Scheduling",
"file": "<base64 string>"
}
Response: empty (204)

The `file` field is the raw base64 content of the PDF with **no** `data:` URI
prefix. Call `fileToBase64()` before constructing this payload.

```ts
import type { IngestPayload } from "./types";

export async function ingestDoc(payload: IngestPayload): Promise<void> {
  await apiFetch("study-assistant-doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
```

### `deleteDoc(id)`

DELETE {serverUrl}/webhook/study-assistant-doc
Authorization: Bearer {token}
Content-Type: application/json
Body: { "id": 42 }
Response: empty

```ts
export async function deleteDoc(id: number): Promise<void> {
  await apiFetch("study-assistant-doc", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
```

`fetch` with a `DELETE` method and a JSON body is valid and supported in all
modern browsers — no special workaround is needed.

### `triggerSummary(docId)`

POST {serverUrl}/webhook/study-assistant-summary
Authorization: Bearer {token}
Content-Type: application/json
Body: { "doc_id": 42 }
Response: empty (fire-and-forget)

```ts
export async function triggerSummary(docId: number): Promise<void> {
  try {
    await apiFetch("study-assistant-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id: docId }),
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) {
      throw new Error("Summary endpoint not yet configured in n8n.");
    }
    throw err;
  }
}
```

---

## `src/components/toast.ts`

```ts
export type ToastType = "success" | "error" | "info";

export function showToast(message: string, type: ToastType = "info"): void {
  const root = document.getElementById("toast-root")!;

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "alert");
  el.textContent = message;

  const close = document.createElement("button");
  close.className = "toast__close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Dismiss");
  close.onclick = () => el.remove();
  el.appendChild(close);

  root.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
```

Toasts stack vertically in the top-right corner. Each auto-dismisses after 4
seconds. The close button dismisses immediately.

---

## `src/components/spinner.ts`

```ts
let overlay: HTMLElement | null = null;

export function showSpinner(): void {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.className = "spinner-overlay";
  overlay.innerHTML = '<div class="spinner"></div>';
  document.getElementById("spinner-root")!.appendChild(overlay);
}

export function hideSpinner(): void {
  overlay?.remove();
  overlay = null;
}
```

The overlay is a fixed full-viewport semi-transparent layer. The spinner is a
pure-CSS rotating ring (no image, no external dependency).

---

## `src/components/confirm.ts`

```ts
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog";
    dialog.innerHTML = `
      <p class="confirm-dialog__message"></p>
      <div class="confirm-dialog__actions">
        <button class="btn btn--danger" data-action="confirm">Delete</button>
        <button class="btn btn--ghost" data-action="cancel">Cancel</button>
      </div>
    `;
    dialog.querySelector(".confirm-dialog__message")!.textContent = message;

    dialog
      .querySelector('[data-action="confirm"]')!
      .addEventListener("click", () => {
        dialog.close();
        dialog.remove();
        resolve(true);
      });
    dialog
      .querySelector('[data-action="cancel"]')!
      .addEventListener("click", () => {
        dialog.close();
        dialog.remove();
        resolve(false);
      });

    document.getElementById("modal-root")!.appendChild(dialog);
    dialog.showModal();
  });
}
```

---

## `src/components/badge.ts`

```ts
export type BadgeColour = "purple" | "teal" | "amber" | "coral" | "gray";

export function createBadge(text: string, colour: BadgeColour): HTMLElement {
  const span = document.createElement("span");
  span.className = `badge badge--${colour}`;
  span.textContent = text;
  return span;
}
```

Doc type → colour mapping (apply in `docs-table.ts`):

| `doc_type`   | colour   |
| ------------ | -------- |
| `lecture`    | `purple` |
| `exercise`   | `teal`   |
| `assignment` | `amber`  |
| `exam`       | `coral`  |

---

## `src/settings.ts`

The settings modal is a `<dialog>` element injected once into `#modal-root` at
app startup.

### Behaviour

- **Auto-open on load** if `serverUrl` is missing or blank in `localStorage`.
- **Manually openable** at any time via the settings gear button in the toolbar.
- **"Test connection" button** calls `getDocs()` and shows an inline success or
  error message without closing the modal. Does not save credentials.
- **Save button** writes to `localStorage` via `saveConfig()`, closes the modal,
  and calls the `onSave` callback (used by `app.ts` to refresh the table).
- **Escape key** closes the modal only if valid credentials are already saved.
- The token input is `type="password"`. Show a toggle button to reveal it.

### Interface

```ts
export function initSettings(onSave: () => void): void;
export function openSettings(): void;
```

`initSettings` must be called once by `app.ts`. It injects the dialog, wires
all event listeners, and opens the modal automatically if configuration is
missing.

---

## `src/docs-table.ts`

### Rendering

Call `getDocs()` on mount. While loading, show the full-page spinner. On error,
show a centred error message with a retry button.

Render an HTML `<table>` with the following columns:

| Column          | Source field(s)           | Notes                                      |
| --------------- | ------------------------- | ------------------------------------------ |
| Course          | `course_name`             |                                            |
| Type            | `doc_type`                | Render as a `badge`                        |
| Term / Year     | `term`, `year`            | e.g. "winter 2026"                         |
| Chapter / Label | `chapter_name` \| `label` | Show whichever is non-null; blank for exam |
| Pages           | `num_pages`               | Right-aligned                              |
| Uploaded        | `created_at`              | Format as local date, no time              |
| Actions         | —                         | See below                                  |

Sort rows client-side by `course_name` → `doc_type` → `chapter_name ?? label`
(all ascending, case-insensitive). This mirrors the server-side ordering.

### Filtering

Render above the table:

- A text `<input>` for free-text filtering against `course_name`, `chapter_name`,
  and `label` (case-insensitive substring, applied client-side).
- A `<select>` to filter by `doc_type` — options: All, lecture, exercise,
  assignment, exam.

Both filters apply simultaneously. Re-render the table rows on every input
event (do not re-fetch).

### Actions column

Each row has up to two icon buttons:

**Delete button** (every row)

1. Call `showConfirm('Delete this document? This cannot be undone.')`.
2. If confirmed: call `showSpinner()`, call `deleteDoc(row.id)`, call
   `hideSpinner()`, refresh the table.
3. On error: call `hideSpinner()`, call `showToast(err.message, 'error')`.

**Summarise button** (only when `doc_type === 'lecture'`)

1. Call `triggerSummary(row.id)`.
2. On success: `showToast('Summary generation started for ' + row.chapter_name, 'info')`.
3. On error: `showToast(err.message, 'error')`.

### Toolbar

Render into `#toolbar`:

- App title ("Study Assistant") — left-aligned.
- Right-aligned group: refresh button, "Upload document" button (opens the
  upload modal), settings gear button (calls `openSettings()`).

### Empty state

When `getDocs()` returns an empty array, or all rows are filtered out, render a
centred message:

- Empty array: "No documents yet." + "Upload your first document" button.
- All filtered: "No documents match your filters." (no upload CTA).

### Interface

```ts
export function initDocsTable(): void;
export function refreshDocsTable(): void;
```

---

## `src/upload-modal.ts`

A `<dialog>` with a single-page form (no multi-step wizard — keep it simple).

### Form fields

| Field        | Element                                                     | Condition                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------- |
| Doc type     | `<select>` (required)                                       | Always shown; drives conditional fields                 |
| Course name  | `<input type="text">` (required)                            | Always shown                                            |
| Term         | `<select>` (required)                                       | Always shown; options: winter, summer                   |
| Year         | `<input type="number">` (required)                          | Always shown; default: current year; min 2000, max 2100 |
| Chapter name | `<input type="text">` (required)                            | Shown when type is `lecture` or `exercise`              |
| Label        | `<input type="text">` (required)                            | Shown when type is `assignment`                         |
| PDF file     | `<input type="file" accept=".pdf">` with drag-and-drop zone | Always shown                                            |

Show/hide `chapter name` and `label` fields dynamically on every `change` event
of the doc type select. Clear hidden fields when they are hidden.

### File input

Implement a drag-and-drop zone around the file input:

- On `dragover`: add a highlighted CSS class.
- On `drop`: read `event.dataTransfer.files[0]` and assign it as the selected
  file. Show the filename and formatted size (e.g. "lecture.pdf — 2.4 MB").
- If the file exceeds **10 MB**, show an inline amber warning: "Large file — upload
  may time out. Consider splitting the PDF." Do **not** block submission.

### Submission

On submit:

1. Validate all required fields (see validation rules below). Show inline error
   messages next to each failing field — do not use `alert()`.
2. Call `fileToBase64(selectedFile)` to encode the PDF.
3. Construct an `IngestPayload` and call `ingestDoc(payload)`.
4. Show the full-page spinner for the duration of the call. The n8n pipeline runs
   Gemini OCR synchronously and may take 30–120 seconds — the spinner must remain
   visible until the response resolves or rejects.
5. On success: hide spinner, call `showToast('Document uploaded and indexed
successfully', 'success')`, close the modal, call `refreshDocsTable()`.
6. On error: hide spinner, show the error message **inline inside the modal** (do
   not close it), do not call `showToast`.

### Validation rules

| Field        | Rule                                                           |
| ------------ | -------------------------------------------------------------- |
| Course name  | Non-empty string                                               |
| Year         | Integer, 2000 ≤ year ≤ 2100                                    |
| Chapter name | Non-empty when type is `lecture` or `exercise`                 |
| Label        | Non-empty when type is `assignment`                            |
| PDF file     | A file must be selected; must have MIME type `application/pdf` |

Validate on submit only (not on blur). Clear all inline errors before
re-validating.

### Interface

```ts
export function initUploadModal(onSuccess: () => void): void;
export function openUploadModal(): void;
```

`initUploadModal` is called once by `app.ts`. The `onSuccess` callback is
`refreshDocsTable`.

---

## `src/app.ts` — Entry point

```ts
import { initSettings, openSettings } from "./settings";
import { initDocsTable, refreshDocsTable } from "./docs-table";
import { initUploadModal } from "./upload-modal";

initSettings(refreshDocsTable);
initDocsTable();
initUploadModal(refreshDocsTable);
```

`app.ts` does nothing else. All DOM wiring lives in the individual modules.

---

## `src/style.css` — Design tokens and component styles

### Custom properties

```css
:root {
  /* Colour ramps (light mode) */
  --purple-50: #eeedfe;
  --purple-100: #cecbf6;
  --purple-600: #534ab7;
  --purple-800: #3c3489;

  --teal-50: #e1f5ee;
  --teal-100: #9fe1cb;
  --teal-600: #0f6e56;
  --teal-800: #085041;

  --amber-50: #faeeda;
  --amber-100: #fac775;
  --amber-600: #854f0b;
  --amber-800: #633806;

  --coral-50: #faece7;
  --coral-100: #f5c4b3;
  --coral-600: #993c1d;
  --coral-800: #712b13;

  --gray-50: #f1efe8;
  --gray-100: #d3d1c7;
  --gray-400: #888780;
  --gray-600: #5f5e5a;
  --gray-800: #444441;

  --red-100: #f7c1c1;
  --red-600: #a32d2d;
  --red-800: #791f1f;

  /* Semantic */
  --color-bg: #ffffff;
  --color-surface: #f1efe8;
  --color-border: rgba(0, 0, 0, 0.12);
  --color-text: #1a1a18;
  --color-muted: #5f5e5a;

  /* Spacing & shape */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Transition */
  --transition: 0.15s ease;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1c1c1a;
    --color-surface: #2a2a27;
    --color-border: rgba(255, 255, 255, 0.12);
    --color-text: #e8e6df;
    --color-muted: #888780;
  }
}
```

### Badges

```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.badge--purple {
  background: var(--purple-100);
  color: var(--purple-800);
}
.badge--teal {
  background: var(--teal-100);
  color: var(--teal-800);
}
.badge--amber {
  background: var(--amber-100);
  color: var(--amber-800);
}
.badge--coral {
  background: var(--coral-100);
  color: var(--coral-800);
}
.badge--gray {
  background: var(--gray-100);
  color: var(--gray-800);
}
```

### Toasts

```css
#toast-root {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  animation: toast-in 0.15s ease;
}

.toast--success {
  background: var(--teal-50);
  color: var(--teal-800);
}
.toast--error {
  background: var(--coral-50);
  color: var(--coral-800);
}
.toast--info {
  background: var(--gray-50);
  color: var(--gray-800);
}

.toast__close {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  padding: 0;
}
.toast__close:hover {
  opacity: 1;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Spinner overlay

```css
.spinner-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Confirm dialog

```css
.confirm-dialog {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  color: var(--color-text);
  padding: 24px;
  max-width: 380px;
  width: 90%;
}

.confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.4);
}

.confirm-dialog__message {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.5;
}

.confirm-dialog__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
```

### Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity var(--transition);
  white-space: nowrap;
}
.btn:hover {
  opacity: 0.85;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--purple-600);
  color: #fff;
}
.btn--danger {
  background: var(--red-600);
  color: #fff;
}
.btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}
.btn--icon {
  padding: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted);
}
.btn--icon:hover {
  color: var(--color-text);
  opacity: 1;
}
```

### Table

```css
.docs-table-wrapper {
  overflow-x: auto;
  margin-top: 16px;
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.docs-table th,
.docs-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.docs-table th {
  font-weight: 500;
  color: var(--color-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--color-surface);
}

.docs-table tr:hover td {
  background: var(--color-surface);
}

.docs-table td.pages {
  text-align: right;
}
.docs-table td.actions {
  white-space: nowrap;
  display: flex;
  gap: 4px;
}
```

### Toolbar

```css
#toolbar {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  gap: 12px;
}

.toolbar__title {
  font-size: 17px;
  font-weight: 500;
  color: var(--color-text);
  margin-right: auto;
}

.toolbar__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px 0;
}
```

### Form elements

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted);
}

.form-group input,
.form-group select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: 2px solid var(--purple-600);
  outline-offset: 1px;
}

.field-error {
  font-size: 12px;
  color: var(--red-600);
  margin-top: 2px;
}

.form-warning {
  font-size: 12px;
  color: var(--amber-600);
  margin-top: 4px;
}
```

### Drop zone

```css
.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color var(--transition),
    background var(--transition);
}

.drop-zone--active {
  border-color: var(--purple-600);
  background: var(--purple-50);
}

.drop-zone__filename {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}
```

### Modals (settings + upload)

```css
.modal {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  color: var(--color-text);
  padding: 0;
  max-width: 480px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal::backdrop {
  background: rgba(0, 0, 0, 0.45);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
  margin-bottom: 20px;
}

.modal__title {
  font-size: 17px;
  font-weight: 500;
}

.modal__body {
  padding: 0 24px;
}

.modal__footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid var(--color-border);
  margin-top: 20px;
}
```

### Empty state

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  color: var(--color-muted);
  font-size: 15px;
  text-align: center;
}
```

---

## Error handling conventions

Apply these rules uniformly across all API call sites:

| Condition                   | Behaviour                                                                      |
| --------------------------- | ------------------------------------------------------------------------------ |
| No response (network error) | `showToast('Cannot reach n8n server. Check your settings.', 'error')`          |
| HTTP 401                    | `showToast('Invalid or missing access token.', 'error')` + open Settings modal |
| Other HTTP 4xx              | `showToast(err.message, 'error')`                                              |
| HTTP 5xx                    | `showToast('n8n server error. Check your workflow execution logs.', 'error')`  |
| Upload form error           | Show inline inside the modal — do **not** use `showToast`                      |

Always `console.error` the full error object in addition to any user-facing message.

Distinguish network errors from HTTP errors by catching `TypeError` (thrown by
`fetch` when the request cannot be made) separately from the `Error` thrown by
`apiFetch` on non-2xx responses.

---

## CORS

The n8n instance must allow requests from the frontend's origin. For a
self-hosted n8n, set the environment variable:
N8N_CORS_ALLOWED_ORIGINS=https://your-frontend.example.com

During local development (`npm run dev`, served on `localhost`) use `*` or add
`http://localhost:1234` to the allowed origins list.

---

## Deployment

The output of `npm run build` is a self-contained `dist/` directory of static
files. Deploy it to any static host:

| Host          | Method                                                |
| ------------- | ----------------------------------------------------- |
| GitHub Pages  | Push `dist/` contents to the `gh-pages` branch        |
| Netlify       | Set build command `npm run build`, publish dir `dist` |
| Vercel        | Same as Netlify                                       |
| Local preview | `npx serve dist`                                      |

No server-side logic is required. No environment variables are baked into the
build — all runtime configuration is entered by the user via the Settings modal
and stored in `localStorage`.

---

## Out of scope

Do not implement:

- Any server-side rendering or backend proxy.
- Authentication beyond the Bearer token (no OAuth, no login page).
- Real-time polling, WebSockets, or Server-Sent Events.
- A summary result viewer — `triggerSummary` is fire-and-forget.
- Editing existing documents — re-uploading replaces via n8n's upsert logic.
- Pagination beyond client-side filtering — the GET endpoint returns all rows.
