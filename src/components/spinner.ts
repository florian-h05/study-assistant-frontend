export function showSpinner(): void {
  const root = document.getElementById("spinner-root")!;
  if (root.classList.contains("active")) return;
  root.innerHTML = '<div class="spinner"></div>';
  root.classList.add("active");
}

export function hideSpinner(): void {
  const root = document.getElementById("spinner-root")!;
  if (root.classList.contains("active")) {
    root.classList.remove("active");
    root.innerHTML = "";
  }
}
