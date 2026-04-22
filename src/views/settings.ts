import { getConfig, saveConfig, getDocs } from "../api";
import { showToast } from "../components/toast";
import { Modal } from "../components/modal";
import { ErrorCodes } from "../types";

let modal: Modal;
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
    config.serverUrl = saved.serverUrl || "";
    config.token = saved.token || "";
  } catch {
    /* ignore */
  }

  const urlInput = modal.querySelector<HTMLInputElement>("#settings-url")!;
  const tokenInput = modal.querySelector<HTMLInputElement>("#settings-token")!;

  urlInput.value = config.serverUrl;
  tokenInput.value = config.token;
  tokenInput.type = "password";

  const toggleBtn = modal.querySelector<HTMLButtonElement>("#toggle-token")!;
  toggleBtn.textContent = "Show";

  const resultEl = modal.querySelector("#settings-test-result")!;
  resultEl.textContent = "";

  modal.open();
}

function injectDialog(): void {
  modal = new Modal({
    title: "Settings",
    id: "settings-modal",
    body: `
      <div class="form-group">
        <label for="settings-url">n8n Server URL</label>
        <input type="url" id="settings-url" class="m3-input" placeholder="https://n8n.example.com" required>
      </div>
      <div class="form-group">
        <label for="settings-token">Bearer Token (optional)</label>
        <div style="display: flex; gap: 8px;">
          <input type="password" id="settings-token" class="m3-input" style="flex: 1; min-width: 0;">
          <button type="button" class="btn btn--ghost" id="toggle-token" style="width: 72px;">Show</button>
        </div>
      </div>
      <div id="settings-test-result" class="result-message"></div>
    `,
    footer: `
      <button class="btn btn--ghost" id="settings-test">Test connection</button>
      <button class="btn btn--primary" id="settings-save">Save Settings</button>
    `,
    beforeClose: () => {
      try {
        getConfig();
        return true;
      } catch {
        showToast("Please configure settings first.", "error");
        return false;
      }
    },
  });

  modal.querySelector("#toggle-token")!.addEventListener("click", (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const input = modal.querySelector<HTMLInputElement>("#settings-token")!;
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "Hide";
    } else {
      input.type = "password";
      btn.textContent = "Show";
    }
  });

  modal.querySelector("#settings-test")!.addEventListener("click", async () => {
    const url = modal
      .querySelector<HTMLInputElement>("#settings-url")!
      .value.replace(/\/$/, "");
    const token =
      modal.querySelector<HTMLInputElement>("#settings-token")!.value;
    const resultEl = modal.querySelector<HTMLElement>("#settings-test-result")!;

    if (!url) {
      resultEl.textContent = "\u2716 Please fill in the URL.";
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

  modal.querySelector("#settings-save")!.addEventListener("click", () => {
    const serverUrl = modal
      .querySelector<HTMLInputElement>("#settings-url")!
      .value.replace(/\/$/, "");
    const token =
      modal.querySelector<HTMLInputElement>("#settings-token")!.value;

    if (!serverUrl) {
      showToast("Please fill in the URL.", "error");
      return;
    }

    saveConfig({ serverUrl, token });
    modal.close();
    onSaveCallback();
  });
}
