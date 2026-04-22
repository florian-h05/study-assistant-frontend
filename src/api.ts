import {
  ErrorCodes,
  type Config,
  type Doc,
  type IngestPayload,
  type SummaryResponse,
} from "./types";

const CONFIG_KEY = "study_assistant_config";

export function getConfig(): Config {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) throw new Error(ErrorCodes.NOT_CONFIGURED);
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
  config?: Config,
): Promise<Response> {
  const { serverUrl, token } = config || getConfig();
  const url = `${serverUrl}/webhook/${path}`;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function getDocs(config?: Config): Promise<Doc[]> {
  const res = await apiFetch("study-assistant-doc", {}, config);
  return res.json() as Promise<Doc[]>;
}

// TODO: Either only use IngestPayload or remove it
export async function ingestDoc(
  payload: IngestPayload | FormData,
): Promise<Doc> {
  let body: BodyInit;
  let headers: Record<string, string> = {};

  if (payload instanceof FormData) {
    body = payload;
    // Do NOT set Content-Type header for FormData, fetch will set it with the correct boundary
  } else {
    body = JSON.stringify(payload);
    headers["Content-Type"] = "application/json";
  }

  const res = await apiFetch("study-assistant-doc", {
    method: "POST",
    headers,
    body,
  });
  return res.json() as Promise<Doc>;
}

export async function deleteDoc(id: number): Promise<void> {
  await apiFetch("study-assistant-doc", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function triggerSummary(
  course: string,
  chapter: string,
): Promise<SummaryResponse> {
  const res = await apiFetch("study-assistant-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course, chapter }),
  });
  return res.json() as Promise<SummaryResponse>;
}
