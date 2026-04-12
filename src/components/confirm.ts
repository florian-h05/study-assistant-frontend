export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog";
    dialog.innerHTML = `
      <p class="confirm-dialog__message"></p>
      <div class="confirm-dialog__actions">
        <button class="btn btn--danger" data-action="confirm">Delete</button>
        <button class="btn btn--ghost" data-action="cancel">Cancel</button>
      </div>
    `;
    dialog.querySelector(".confirm-dialog__message")!.textContent = message;

    dialog
      .querySelector('[data-action="confirm"]')!
      .addEventListener("click", () => {
        dialog.close();
        dialog.remove();
        resolve(true);
      });
    dialog
      .querySelector('[data-action="cancel"]')!
      .addEventListener("click", () => {
        dialog.close();
        dialog.remove();
        resolve(false);
      });

    document.getElementById("modal-root")!.appendChild(dialog);
    dialog.showModal();
  });
}
