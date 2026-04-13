import { getDocs } from "../api";
import { showSpinner, hideSpinner } from "../components/spinner";
import { renderToolbar } from "../components/toolbar";
import { renderTableRow } from "../components/doc-table-row";
import { capitalizeFirstLetter } from "../utils";
import type { Doc, DocGroup } from "../types";

let allDocs: Doc[] = [];

export type FilterKey = keyof Doc | "term_year" | "chapter_label";
export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  column: FilterKey | null;
  direction: SortDirection;
}

let sortConfig: SortConfig = { column: "course_name", direction: "asc" };
let filters: Partial<Record<FilterKey, string[]>> = {};

export function initDocsTable(): void {
  renderToolbar(refreshDocsTable);
  refreshDocsTable();
}

export async function refreshDocsTable(): Promise<void> {
  const main = document.getElementById("main-content")!;
  showSpinner();
  try {
    allDocs = await getDocs();
    renderTable();
  } catch (err) {
    console.error(err);
    main.innerHTML = `
      <div class="empty-state">
        <p>Error loading documents: ${(err as Error).message}</p>
        <button class="btn btn--primary" id="retry-load">Retry</button>
      </div>
    `;
    main
      .querySelector("#retry-load")
      ?.addEventListener("click", refreshDocsTable);
  } finally {
    hideSpinner();
  }
}

function getUniqueValues(key: FilterKey): string[] {
  const values = new Set<string>();
  allDocs.forEach((doc) => {
    if (key === "term_year") {
      values.add(`${doc.term} ${doc.year}`);
    } else if (key === "chapter_label") {
      const val = doc.chapter_name || doc.label;
      if (val) values.add(val);
    } else {
      const val = doc[key as keyof Doc];
      if (val !== null && val !== undefined) values.add(val.toString());
    }
  });
  return Array.from(values).sort();
}

function renderTable(): void {
  const main = document.getElementById("main-content")!;

  if (allDocs.length === 0) {
    main.innerHTML = `
      <div class="empty-state">
        <p>No documents yet.</p>
        <button class="btn btn--primary" id="empty-upload-btn">Upload your first document</button>
      </div>
    `;
    const emptyUploadBtn = main.querySelector("#empty-upload-btn");
    // We need to import openUploadModal if we want to use it here,
    // but better to just trigger it via a custom event or shared module.
    // For simplicity, I'll just re-import it.
    import("./upload").then((m) => {
      emptyUploadBtn?.addEventListener("click", m.openUploadModal);
    });
    return;
  }

  main.innerHTML = `
    <div class="docs-table-wrapper m3-surface">
      <table class="docs-table">
        <thead>
          <tr id="header-row">
            <th data-col="course_name" class="sortable">Course ${renderSortIcon("course_name")}</th>
            <th data-col="doc_type" class="sortable">Type ${renderSortIcon("doc_type")}</th>
            <th data-col="term_year" class="sortable">Term / Year ${renderSortIcon("term_year")}</th>
            <th data-col="chapter_label" class="sortable">Chapter / Label ${renderSortIcon("chapter_label")}</th>
            <th data-col="num_pages" class="sortable pages">Pages ${renderSortIcon("num_pages")}</th>
            <th data-col="created_at" class="sortable uploaded">Uploaded ${renderSortIcon("created_at")}</th>
            <th class="actions">Actions</th>
          </tr>
          <tr class="filter-row">
            <th>${renderFilterSelect("course_name")}</th>
            <th>${renderFilterSelect("doc_type")}</th>
            <th>${renderFilterSelect("term_year")}</th>
            <th>${renderFilterSelect("chapter_label")}</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  `;

  // Add sort listeners
  main.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-col") as FilterKey;
      if (sortConfig.column === col) {
        sortConfig.direction = sortConfig.direction === "asc" ? "desc" : "asc";
      } else {
        sortConfig.column = col;
        sortConfig.direction = "asc";
      }
      renderTable();
    });
  });

  // Add filter listeners
  main.querySelectorAll(".column-filter").forEach((select) => {
    const el = select as HTMLSelectElement;
    el.addEventListener("change", () => {
      const selectedOptions = Array.from(el.selectedOptions);
      const values = selectedOptions.map((o) => o.value);
      const col = el.getAttribute("data-col") as FilterKey;

      let finalValues: string[] = [];
      const hadAll = filters[col] === undefined || filters[col]?.length === 0;
      const hasAll = values.includes("all");

      if (hasAll && values.length > 1) {
        finalValues = hadAll ? values.filter((v) => v !== "all") : [];
      } else if (hasAll || values.length === 0) {
        finalValues = [];
      } else {
        finalValues = values;
      }

      if (finalValues.length === 0) {
        delete filters[col];
      } else {
        filters[col] = finalValues;
      }

      Array.from(el.options).forEach((opt) => {
        opt.selected =
          finalValues.length === 0
            ? opt.value === "all"
            : finalValues.includes(opt.value);
      });

      updateTableRows();
    });
  });

  updateTableRows();
}

function renderSortIcon(col: FilterKey): string {
  const icon =
    sortConfig.column !== col
      ? "↕"
      : sortConfig.direction === "asc"
        ? "↑"
        : "↓";
  return `<span class="sort-icon">${icon}</span>`;
}

function renderFilterSelect(col: FilterKey, isDate = false): string {
  const options = getUniqueValues(col);
  const currentVals = filters[col] || [];

  return `
    <select class="column-filter m3-input" data-col="${col}" multiple size="1">
      <option value="all" ${currentVals.length === 0 ? "selected" : ""}>All</option>
      ${options
        .map((opt) => {
          let display = isDate ? new Date(opt).toLocaleDateString() : opt;
          if (col === "doc_type" || col === "term_year") {
            display = capitalizeFirstLetter(display);
          }
          return `<option value="${opt}" ${currentVals.includes(opt) ? "selected" : ""}>${display}</option>`;
        })
        .join("")}
    </select>
  `;
}

function updateTableRows(): void {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;

  const filtered = allDocs.filter((doc) => {
    return Object.entries(filters).every(([key, values]) => {
      if (!values || values.length === 0) return true;
      let docVal: string;
      if (key === "term_year") {
        docVal = `${doc.term} ${doc.year}`;
      } else if (key === "chapter_label") {
        docVal = doc.chapter_name || doc.label || "";
      } else if (key === "num_pages") {
        docVal = doc.num_pages.toString();
      } else if (key === "created_at") {
        docVal = doc.created_at;
      } else {
        docVal = (doc[key as keyof Doc] as any)?.toString() || "";
      }
      return values.includes(docVal);
    });
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--md-sys-color-on-surface-variant);">No documents match your filters.</td></tr>`;
    return;
  }

  // Grouping logic
  const groups: DocGroup[] = [];
  filtered.forEach((doc) => {
    const existing = groups.find(
      (g) =>
        g.course_name === doc.course_name &&
        g.doc_type === doc.doc_type &&
        g.term === doc.term &&
        g.year === doc.year &&
        g.chapter_name === doc.chapter_name &&
        g.label === doc.label,
    );

    if (existing) {
      existing.docs.push(doc);
      existing.total_pages += doc.num_pages;
      if (new Date(doc.created_at) > new Date(existing.latest_upload)) {
        existing.latest_upload = doc.created_at;
      }
    } else {
      groups.push({
        course_name: doc.course_name,
        doc_type: doc.doc_type,
        term: doc.term,
        year: doc.year,
        chapter_name: doc.chapter_name,
        label: doc.label,
        docs: [doc],
        total_pages: doc.num_pages,
        latest_upload: doc.created_at,
      });
    }
  });

  // Sorting groups
  if (sortConfig.column) {
    groups.sort((a, b) => {
      let valA: any, valB: any;
      if (sortConfig.column === "term_year") {
        valA = `${a.term} ${a.year}`;
        valB = `${b.term} ${b.year}`;
      } else if (sortConfig.column === "chapter_label") {
        valA = a.chapter_name || a.label || "";
        valB = b.chapter_name || b.label || "";
      } else if (sortConfig.column === "created_at") {
        valA = a.latest_upload;
        valB = b.latest_upload;
      } else if (sortConfig.column === "num_pages") {
        valA = a.total_pages;
        valB = b.total_pages;
      } else {
        valA = (a as any)[sortConfig.column as string] ?? "";
        valB = (b as any)[sortConfig.column as string] ?? "";
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  tbody.innerHTML = "";
  groups.forEach((group) => {
    tbody.appendChild(renderTableRow(group, refreshDocsTable));
  });
}
