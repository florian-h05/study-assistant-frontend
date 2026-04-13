import { deleteDoc, triggerSummary } from "../api";
import { createBadge, type BadgeColour } from "./badge";
import { showSpinner, hideSpinner } from "./spinner";
import { showToast } from "./toast";
import { showConfirm } from "./confirm";
import { capitalizeFirstLetter } from "../utils";
import type { Doc, DocType, DocGroup } from "../types";

const TYPE_COLOURS: Record<DocType, BadgeColour> = {
  lecture: "purple",
  exercise: "teal",
  assignment: "amber",
  exam: "coral",
};

export function renderTableRow(
  group: DocGroup,
  onRefresh: () => void,
): HTMLTableRowElement {
  const tr = document.createElement("tr");

  // Course
  const tdCourse = document.createElement("td");
  tdCourse.textContent = group.course_name;
  tr.appendChild(tdCourse);

  // Type
  const tdType = document.createElement("td");
  tdType.appendChild(
    createBadge(
      capitalizeFirstLetter(group.doc_type),
      TYPE_COLOURS[group.doc_type],
    ),
  );
  tr.appendChild(tdType);

  // Term / Year
  const tdTermYear = document.createElement("td");
  tdTermYear.textContent = `${capitalizeFirstLetter(group.term)} ${group.year}`;
  tr.appendChild(tdTermYear);

  // Chapter / Label
  const tdChapterLabel = document.createElement("td");
  tdChapterLabel.textContent = group.chapter_name || group.label || "";
  tr.appendChild(tdChapterLabel);

  // Pages
  const tdPages = document.createElement("td");
  tdPages.className = "pages";
  const countSpan =
    group.docs.length > 1
      ? `<span style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); display: block;">${group.docs.length} files</span>`
      : "";
  tdPages.innerHTML = `${group.total_pages}${countSpan}`;
  tr.appendChild(tdPages);

  // Uploaded Timestamp (Latest)
  const tdUploaded = document.createElement("td");
  tdUploaded.className = "uploaded";
  tdUploaded.textContent = new Date(group.latest_upload).toLocaleDateString();
  tr.appendChild(tdUploaded);

  // Actions
  const tdActions = document.createElement("td");
  tdActions.className = "actions";
  tdActions.style.whiteSpace = "nowrap";

  if (group.doc_type === "lecture") {
    const summaryBtn = document.createElement("button");
    summaryBtn.className = "btn btn--icon";
    summaryBtn.title = "Summarise";
    summaryBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    summaryBtn.onclick = async () => {
      const confirmed = await showConfirm(
        `Generate summary for ${group.course_name}: ${group.chapter_name}?`,
        { confirmText: "Approve", type: "success" },
      );
      if (confirmed) {
        try {
          await triggerSummary(group.course_name, group.chapter_name || "");
          showToast(
            `Summary generation started for ${group.course_name}: ${group.chapter_name}`,
            "info",
          );
        } catch (err) {
          showToast((err as Error).message, "error");
        }
      }
    };
    tdActions.appendChild(summaryBtn);
  }

  // If there's only one, we can use the simple delete button
  if (group.docs.length === 1 && group.docs[0]) {
    const deleteBtn = createDeleteBtn(group.docs[0].id, onRefresh);
    tdActions.appendChild(deleteBtn);
  } else if (group.docs.length > 1) {
    // If multiple, maybe we should provide a way to delete each or all?
    // Let's provide a "Delete All" button or a dropdown?
    // For now, let's keep it simple: "Delete Group" or "Delete each".
    // I'll show a single delete icon but clicking it will ask to delete all.
    // Or better, I can just render multiple small delete buttons?
    // Actually, maybe I can just show the documents as an expand?
    // Let's keep it simple for now: "Delete Group" action.
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn--icon";
    deleteBtn.title = "Delete all in group";
    deleteBtn.style.color = "var(--md-sys-color-error)";
    deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    deleteBtn.onclick = async () => {
      const confirmed = await showConfirm(
        `Delete all ${group.docs.length} documents in this group? This cannot be undone.`,
        { confirmText: "Delete All", type: "danger" },
      );
      if (confirmed) {
        showSpinner();
        try {
          for (const doc of group.docs) {
            await deleteDoc(doc.id);
          }
          onRefresh();
        } catch (err) {
          showToast((err as Error).message, "error");
        } finally {
          hideSpinner();
        }
      }
    };
    tdActions.appendChild(deleteBtn);
  }

  tr.appendChild(tdActions);
  return tr;
}

function createDeleteBtn(id: number, onRefresh: () => void): HTMLButtonElement {
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
        await deleteDoc(id);
        onRefresh();
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        hideSpinner();
      }
    }
  };
  return deleteBtn;
}
