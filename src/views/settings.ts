import { getConfig, saveConfig, getDocs } from "../api";
import { showToast } from "../components/toast";
import { ErrorCodes } from "../types";

let dialog: HTMLDialogElement;
let onSaveCallback: () => void;

export function initSettings(onSave: () => void): void {
  onSaveCallback = onSave;
  injectDialog();

  try {
    getConfig();
  } catch (err) {
    if ((err as Error).message === ErrorCodes.NOT_CONFIGURED) {
      openSettings();
    }
  }
}

export function openSettings(): void {
  const config = { serverUrl: "", token: "" };
  try {
    const saved = getConfig();
    config.serverUrl = saved.serverUrl;
    config.token = saved.token;
  } catch {
    /* ignore */
  }

  const urlInput = dialog.querySelector<HTMLInputElement>("#settings-url")!;
  const tokenInput = dialog.querySelector<HTMLInputElement>("#settings-token")!;

  urlInput.value = config.serverUrl;
  tokenInput.value = config.token;
  tokenInput.type = "password";

  const toggleBtn = dialog.querySelector<HTMLButtonElement>("#toggle-token")!;
  toggleBtn.textContent = "Show";

  const resultEl = dialog.querySelector("#settings-test-result")!;
  resultEl.textContent = "";

  dialog.showModal();
}

function injectDialog(): void {
  dialog = document.createElement("dialog");
  dialog.className = "m3-modal";
  dialog.id = "settings-modal";
  dialog.innerHTML = `
    <div class="modal__header">
      <h2 class="modal__title">Settings</h2>
      <button class="btn btn--icon" id="settings-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal__body">
      <div class="form-group">
        <label for="settings-url">n8n Server URL</label>
        <input type="url" id="settings-url" class="m3-input" placeholder="https://n8n.example.com" required>
      </div>
      <div class="form-group">
        <label for="settings-token">Bearer Token</label>
        <div style="display: flex; gap: 8px;">
          <input type="password" id="settings-token" class="m3-input" style="flex: 1; min-width: 0;" required>
          <button type="button" class="btn btn--ghost" id="toggle-token" style="width: 72px;">Show</button>
        </div>
      </div>
      <div id="settings-test-result" class="result-message"></div>
    </div>
    <div class="modal__footer">
      <button class="btn btn--ghost" id="settings-test">Test connection</button>
      <button class="btn btn--primary" id="settings-save">Save Settings</button>
    </div>
  `;

  document.getElementById("modal-root")!.appendChild(dialog);

  dialog.querySelector("#settings-close")!.addEventListener("click", () => {
    try {
      getConfig();
      dialog.close();
    } catch {
      showToast("Please configure settings first.", "error");
    }
  });

  dialog.querySelector("#toggle-token")!.addEventListener("click", (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const input = dialog.querySelector<HTMLInputElement>("#settings-token")!;
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "Hide";
    } else {
      input.type = "password";
      btn.textContent = "Show";
    }
  });

  dialog
    .querySelector("#settings-test")!
    .addEventListener("click", async () => {
      const url = dialog
        .querySelector<HTMLInputElement>("#settings-url")!
        .value.replace(/\/$/, "");
      const token =
        dialog.querySelector<HTMLInputElement>("#settings-token")!.value;
      const resultEl = dialog.querySelector<HTMLElement>(
        "#settings-test-result",
      )!;

      if (!url || !token) {
        resultEl.textContent = "\u2716 Please fill in both fields.";
        resultEl.style.color = "var(--md-sys-color-error)";
        return;
      }

      resultEl.textContent = "Testing...";
      resultEl.style.color = "var(--md-sys-color-on-surface-variant)";

      try {
        await getDocs({ serverUrl: url, token });
        resultEl.textContent = "\u279C Connection successful!";
        resultEl.style.color = "var(--md-sys-color-success)";
      } catch (err) {
        resultEl.textContent = `\u2716 Error: ${(err as Error).message}`;
        resultEl.style.color = "var(--md-sys-color-error)";
      }
    });

  dialog.querySelector("#settings-save")!.addEventListener("click", () => {
    const serverUrl = dialog
      .querySelector<HTMLInputElement>("#settings-url")!
      .value.replace(/\/$/, "");
    const token =
      dialog.querySelector<HTMLInputElement>("#settings-token")!.value;

    if (!serverUrl || !token) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    saveConfig({ serverUrl, token });
    dialog.close();
    onSaveCallback();
  });

  dialog.addEventListener("cancel", (e) => {
    try {
      getConfig();
    } catch {
      e.preventDefault();
      showToast("Please configure settings first.", "error");
    }
  });
}
