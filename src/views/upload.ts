import { ingestDoc } from "../api";
import { showSpinner, hideSpinner } from "../components/spinner";
import { showToast } from "../components/toast";
import { Modal } from "../components/modal";
import type { DocType, Term } from "../types";
import { getDefaultTermAndYear } from "../utils";

let modal: Modal;
let onSuccessCallback: () => void;
let selectedFile: File | null = null;

export function initUploadModal(onSuccess: () => void): void {
  onSuccessCallback = onSuccess;
  injectDialog();
}

export function openUploadModal(): void {
  resetForm();
  modal.open();
}

function injectDialog(): void {
  modal = new Modal({
    title: "Upload Document",
    id: "upload-modal",
    wrapInForm: true,
    formId: "upload-form",
    body: `
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
          <div style="display: flex; align-items: center; gap: 4px;">
            <input type="number" id="year" class="m3-input" required min="2000" style="flex: 1;">
            <span id="year-suffix" style="font-weight: 500; font-size: 1.1em; color: var(--md-sys-color-on-surface-variant);"></span>
          </div>
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
    `,
    footer: `
      <button type="button" class="btn btn--ghost" data-modal-action="cancel">Cancel</button>
      <button type="submit" class="btn btn--primary">Upload & Index</button>
    `,
  });

  const form = modal.querySelector("#upload-form") as HTMLFormElement;
  const docTypeSelect = modal.querySelector("#doc-type") as HTMLSelectElement;
  const chapterGroup = modal.querySelector("#chapter-group") as HTMLElement;
  const labelGroup = modal.querySelector("#label-group") as HTMLElement;
  const dropZone = modal.querySelector("#drop-zone") as HTMLElement;
  const fileInput = modal.querySelector("#file-input") as HTMLInputElement;

  // Set default and max year
  const { term: defaultTerm, year: defaultYear } = getDefaultTermAndYear();
  const currentYear = new Date().getFullYear();
  const yearInput = modal.querySelector("#year") as HTMLInputElement;
  const yearSuffix = modal.querySelector("#year-suffix") as HTMLElement;
  const termSelect = modal.querySelector("#term") as HTMLSelectElement;

  termSelect.value = defaultTerm;
  yearInput.value = defaultYear.toString();
  yearInput.max = currentYear.toString();

  const updateYearHint = () => {
    const term = termSelect.value;
    const year = parseInt(yearInput.value);

    if (term === "winter") {
      yearInput.placeholder = "2025";
      if (!isNaN(year) && year >= 1000) {
        yearSuffix.textContent = `/ ${(year + 1).toString().slice(-2)}`;
        yearSuffix.style.display = "inline";
      } else {
        yearSuffix.textContent = "";
        yearSuffix.style.display = "none";
      }
    } else {
      yearInput.placeholder = "2024";
      yearSuffix.textContent = "";
      yearSuffix.style.display = "none";
    }
  };

  termSelect.addEventListener("change", updateYearHint);
  yearInput.addEventListener("input", updateYearHint);
  updateYearHint();

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await validateAndSubmit()) {
      modal.close();
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
  const fileInfo = modal.querySelector("#file-info") as HTMLElement;
  const fileWarning = modal.querySelector("#file-warning") as HTMLElement;

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
  const err = modal.querySelector("#file-error") as HTMLElement;
  err.textContent = msg;
}

function resetForm(): void {
  const form = modal.querySelector("#upload-form") as HTMLFormElement;
  form.reset();
  selectedFile = null;
  modal.querySelector("#file-info")!.textContent = "";
  (modal.querySelector("#file-info") as HTMLElement).style.display = "none";
  (modal.querySelector("#file-warning") as HTMLElement).style.display = "none";
  (modal.querySelector("#upload-error") as HTMLElement).style.display = "none";
  (modal.querySelector("#doc-type") as HTMLSelectElement).dispatchEvent(
    new Event("change"),
  );
  showFileError("");

  const { term: defaultTerm, year: defaultYear } = getDefaultTermAndYear();
  (modal.querySelector("#term") as HTMLSelectElement).value = defaultTerm;
  const yearInput = modal.querySelector("#year") as HTMLInputElement;
  yearInput.value = defaultYear.toString();
  yearInput.dispatchEvent(new Event("input"));
}

async function validateAndSubmit(): Promise<boolean> {
  const type = (modal.querySelector("#doc-type") as HTMLSelectElement)
    .value as DocType;
  const course = (
    modal.querySelector("#course-name") as HTMLInputElement
  ).value.trim();
  const term = (modal.querySelector("#term") as HTMLSelectElement)
    .value as Term;
  const year = parseInt(
    (modal.querySelector("#year") as HTMLInputElement).value,
  );
  const chapter = (
    modal.querySelector("#chapter-name") as HTMLInputElement
  ).value.trim();
  const label = (
    modal.querySelector("#label") as HTMLInputElement
  ).value.trim();
  const errorEl = modal.querySelector("#upload-error") as HTMLElement;

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
    formData.append("data", selectedFile!);

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
