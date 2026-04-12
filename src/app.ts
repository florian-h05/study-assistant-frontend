import { initSettings } from "./views/settings";
import { initDocsTable, refreshDocsTable } from "./views/docs-table";
import { initUploadModal } from "./views/upload";

initSettings(refreshDocsTable);
initDocsTable();
initUploadModal(refreshDocsTable);

// Ensure toast root is shown in the top layer
(document.getElementById("toast-root") as HTMLDialogElement).show();
