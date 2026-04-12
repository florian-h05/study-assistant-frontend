export type ToastType = "success" | "error" | "info";

export function showToast(message: string, type: ToastType = "info"): void {
  const root = document.getElementById("toast-root")!;

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;

  // Use 'alert' for errors, 'status' for info/success
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.setAttribute("aria-live", "polite");

  el.textContent = message;

  const timeoutId = setTimeout(() => dismiss(), 4000);

  const dismiss = () => {
    clearTimeout(timeoutId);
    el.remove();
  };

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast__close";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.onclick = dismiss;

  el.appendChild(closeBtn);
  root.appendChild(el);
}
