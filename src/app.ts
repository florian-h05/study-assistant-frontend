import { initSettings } from "./views/settings";
import { initDocsTable, refreshDocsTable } from "./views/docs-table";
import { initUploadModal } from "./views/upload";

initSettings(refreshDocsTable);
initDocsTable();
initUploadModal(refreshDocsTable);
