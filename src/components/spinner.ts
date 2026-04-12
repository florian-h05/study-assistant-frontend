let overlay: HTMLElement | null = null;

export function showSpinner(): void {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.className = "spinner-overlay";
  overlay.innerHTML = '<div class="spinner"></div>';
  document.getElementById("spinner-root")!.appendChild(overlay);
}

export function hideSpinner(): void {
  overlay?.remove();
  overlay = null;
}
