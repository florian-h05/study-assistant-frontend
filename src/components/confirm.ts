export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog m3-modal";
    dialog.innerHTML = `
      <div class="modal__body" style="padding-top: 24px;">
        <p class="confirm-dialog__message" style="margin: 0;"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" data-action="cancel">Cancel</button>
        <button class="btn btn--danger" data-action="confirm">Delete</button>
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
