import { deleteDoc, triggerSummary } from "../api";
import { createBadge, type BadgeColour } from "./badge";
import { showSpinner, hideSpinner } from "./spinner";
import { showToast } from "./toast";
import { showConfirm } from "./confirm";
import type { Doc, DocType } from "../types";

const TYPE_COLOURS: Record<DocType, BadgeColour> = {
  lecture: "purple",
  exercise: "teal",
  assignment: "amber",
  exam: "coral",
};

function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function renderTableRow(
  doc: Doc,
  onRefresh: () => void,
): HTMLTableRowElement {
  const tr = document.createElement("tr");

  // Course
  const tdCourse = document.createElement("td");
  tdCourse.textContent = doc.course_name;
  tr.appendChild(tdCourse);

  // Type
  const tdType = document.createElement("td");
  tdType.appendChild(
    createBadge(
      capitalizeFirstLetter(doc.doc_type),
      TYPE_COLOURS[doc.doc_type],
    ),
  );
  tr.appendChild(tdType);

  // Term / Year
  const tdTermYear = document.createElement("td");
  tdTermYear.textContent = `${capitalizeFirstLetter(doc.term)} ${doc.year}`;
  tr.appendChild(tdTermYear);

  // Chapter / Label
  const tdChapterLabel = document.createElement("td");
  tdChapterLabel.textContent = doc.chapter_name || doc.label || "";
  tr.appendChild(tdChapterLabel);

  // Pages
  const tdPages = document.createElement("td");
  tdPages.className = "pages";
  tdPages.textContent = doc.num_pages.toString();
  tr.appendChild(tdPages);

  // Uploaded Timestamp
  const tdUploaded = document.createElement("td");
  tdUploaded.textContent = new Date(doc.created_at).toLocaleDateString();
  tr.appendChild(tdUploaded);

  // Actions
  const tdActions = document.createElement("td");

  if (doc.doc_type === "lecture") {
    const summaryBtn = document.createElement("button");
    summaryBtn.className = "btn btn--icon";
    summaryBtn.title = "Summarise";
    summaryBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    summaryBtn.onclick = async () => {
      const confirmed = await showConfirm(
        `Generate summary for ${doc.course_name}: ${doc.chapter_name}?`,
        { confirmText: "Approve", type: "success" },
      );
      if (confirmed) {
      try {
        await triggerSummary(doc.course_name, doc.chapter_name || "");
        showToast(
            `Summary generation started for ${doc.course_name}: ${doc.chapter_name}`,
          "info",
        );
      } catch (err) {
        showToast((err as Error).message, "error");
        }
      }
    };
    tdActions.appendChild(summaryBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn--icon";
  deleteBtn.title = "Delete";
  deleteBtn.style.color = "var(--md-sys-color-error)";
  deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
  deleteBtn.onclick = async () => {
    const confirmed = await showConfirm(
      "Delete this document? This cannot be undone.",
      { confirmText: "Delete", type: "danger" },
    );
    if (confirmed) {
      showSpinner();
      try {
        await deleteDoc(doc.id);
        onRefresh();
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        hideSpinner();
      }
    }
  };
  tdActions.appendChild(deleteBtn);

  tr.appendChild(tdActions);
  return tr;
}
