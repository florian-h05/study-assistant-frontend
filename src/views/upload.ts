import { ingestDoc, fileToBase64 } from "../api";
import { showSpinner, hideSpinner } from "../components/spinner";
import { showToast } from "../components/toast";
import type { DocType, Term, IngestPayload } from "../types";

let dialog: HTMLDialogElement;
let onSuccessCallback: () => void;
let selectedFile: File | null = null;

export function initUploadModal(onSuccess: () => void): void {
  onSuccessCallback = onSuccess;
  injectDialog();
}

export function openUploadModal(): void {
  resetForm();
  dialog.showModal();
}

function injectDialog(): void {
  dialog = document.createElement("dialog");
  dialog.className = "modal m3-modal";
  dialog.id = "upload-modal";
  dialog.innerHTML = `
    <div class="modal__header">
      <h2 class="modal__title">Upload Document</h2>
      <button class="btn btn--icon" id="upload-close" aria-label="Close">&times;</button>
    </div>
    <form id="upload-form">
      <div class="modal__body">
        <div class="form-group">
          <label for="doc-type">Document Type</label>
          <select id="doc-type" class="m3-input" required>
            <option value="lecture">Lecture</option>
            <option value="exercise">Exercise</option>
            <option value="assignment">Assignment</option>
            <option value="exam">Exam</option>
          </select>
        </div>

        <div class="form-group">
          <label for="course-name">Course Name</label>
          <input type="text" id="course-name" class="m3-input" required placeholder="e.g. Operating Systems">
        </div>

        <div style="display: flex; gap: 16px;">
          <div class="form-group" style="flex: 1;">
            <label for="term">Term</label>
            <select id="term" class="m3-input" required>
              <option value="winter">Winter</option>
              <option value="summer">Summer</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <label for="year">Year</label>
            <input type="number" id="year" class="m3-input" required min="2000">
          </div>
        </div>

        <div class="form-group" id="chapter-group">
          <label for="chapter-name">Chapter Name</label>
          <input type="text" id="chapter-name" class="m3-input">
        </div>

        <div class="form-group" id="label-group" style="display: none;">
          <label for="label">Label</label>
          <input type="text" id="label" class="m3-input">
        </div>

        <div class="form-group">
          <label>PDF File</label>
          <div id="drop-zone" class="drop-zone">
            <span>Drag & drop PDF here or click to browse</span>
            <input type="file" id="file-input" accept=".pdf" style="display: none;">
            <div id="file-info" class="drop-zone__filename" style="display: none;"></div>
          </div>
          <div id="file-warning" class="form-warning" style="display: none;">Large file — upload may time out. Consider splitting the PDF.</div>
          <div id="file-error" class="field-error"></div>
        </div>

        <div id="upload-error" class="result-message" style="display: none;"></div>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--ghost" id="upload-cancel">Cancel</button>
        <button type="submit" class="btn btn--primary">Upload & Index</button>
      </div>
    </form>
  `;

  document.getElementById("modal-root")!.appendChild(dialog);

  const form = dialog.querySelector("#upload-form") as HTMLFormElement;
  const docTypeSelect = dialog.querySelector("#doc-type") as HTMLSelectElement;
  const chapterGroup = dialog.querySelector("#chapter-group") as HTMLElement;
  const labelGroup = dialog.querySelector("#label-group") as HTMLElement;
  const dropZone = dialog.querySelector("#drop-zone") as HTMLElement;
  const fileInput = dialog.querySelector("#file-input") as HTMLInputElement;

  // Set default and max year
  const currentYear = new Date().getFullYear();
  const yearInput = dialog.querySelector("#year") as HTMLInputElement;
  yearInput.value = currentYear.toString();
  yearInput.max = currentYear.toString();

  // Dynamic fields
  docTypeSelect.addEventListener("change", () => {
    const type = docTypeSelect.value;
    chapterGroup.style.display =
      type === "lecture" || type === "exercise" ? "flex" : "none";
    labelGroup.style.display = type === "assignment" ? "flex" : "none";

    // Clear hidden fields
    if (chapterGroup.style.display === "none")
      (chapterGroup.querySelector("input") as HTMLInputElement).value = "";
    if (labelGroup.style.display === "none")
      (labelGroup.querySelector("input") as HTMLInputElement).value = "";
  });

  // File handling
  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drop-zone--active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drop-zone--active");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drop-zone--active");
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  dialog
    .querySelector("#upload-close")!
    .addEventListener("click", () => dialog.close());
  dialog
    .querySelector("#upload-cancel")!
    .addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await validateAndSubmit()) {
      dialog.close();
      onSuccessCallback();
    }
  });
}

function handleFile(file: File): void {
  if (file.type !== "application/pdf") {
    showFileError("Please select a PDF file.");
    return;
  }

  selectedFile = file;
  const fileInfo = dialog.querySelector("#file-info") as HTMLElement;
  const fileWarning = dialog.querySelector("#file-warning") as HTMLElement;

  fileInfo.textContent = `${file.name} — ${formatSize(file.size)}`;
  fileInfo.style.display = "block";

  fileWarning.style.display = file.size > 10 * 1024 * 1024 ? "block" : "none";
  showFileError(""); // Clear error
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function showFileError(msg: string): void {
  const err = dialog.querySelector("#file-error") as HTMLElement;
  err.textContent = msg;
}

function resetForm(): void {
  const form = dialog.querySelector("#upload-form") as HTMLFormElement;
  form.reset();
  selectedFile = null;
  dialog.querySelector("#file-info")!.textContent = "";
  (dialog.querySelector("#file-info") as HTMLElement).style.display = "none";
  (dialog.querySelector("#file-warning") as HTMLElement).style.display = "none";
  (dialog.querySelector("#upload-error") as HTMLElement).style.display = "none";
  (dialog.querySelector("#doc-type") as HTMLSelectElement).dispatchEvent(
    new Event("change"),
  );
  showFileError("");
  (dialog.querySelector("#year") as HTMLInputElement).value = new Date()
    .getFullYear()
    .toString();
}

async function validateAndSubmit(): Promise<boolean> {
  const type = (dialog.querySelector("#doc-type") as HTMLSelectElement)
    .value as DocType;
  const course = (
    dialog.querySelector("#course-name") as HTMLInputElement
  ).value.trim();
  const term = (dialog.querySelector("#term") as HTMLSelectElement)
    .value as Term;
  const year = parseInt(
    (dialog.querySelector("#year") as HTMLInputElement).value,
  );
  const chapter = (
    dialog.querySelector("#chapter-name") as HTMLInputElement
  ).value.trim();
  const label = (
    dialog.querySelector("#label") as HTMLInputElement
  ).value.trim();
  const errorEl = dialog.querySelector("#upload-error") as HTMLElement;

  errorEl.style.display = "none";
  errorEl.textContent = "";
  showFileError("");

  const errors: string[] = [];

  if (!course) errors.push("Course name is required.");
  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < 2000 || year > currentYear)
    errors.push(`Year must be between 2000 and ${currentYear}.`);
  if ((type === "lecture" || type === "exercise") && !chapter)
    errors.push("Chapter name is required.");
  if (type === "assignment" && !label) errors.push("Label is required.");
  if (!selectedFile) errors.push("PDF file is required.");

  if (errors.length > 0) {
    errorEl.innerHTML = errors.map((e) => `\u2716 ${e}`).join("<br>");
    errorEl.style.color = "var(--md-sys-color-error)";
    errorEl.style.display = "block";
    return false;
  }

  showSpinner();
  try {
    const formData = new FormData();
    formData.append("course", course);
    formData.append("type", type);
    formData.append("term", term);
    formData.append("year", year.toString());
    formData.append("data", selectedFile!); // Changed field name from 'file' to 'data'

    if (chapter) formData.append("chapter", chapter);
    if (label) formData.append("label", label);

    await ingestDoc(formData);
    showToast("Document uploaded and indexed successfully", "success");
    return true;
  } catch (err) {
    errorEl.textContent = `\u2716 ${(err as Error).message}`;
    errorEl.style.color = "var(--md-sys-color-error)";
    errorEl.style.display = "block";
    return false;
  } finally {
    hideSpinner();
  }
}
