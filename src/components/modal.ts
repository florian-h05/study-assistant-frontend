export interface ModalOptions {
  title: string;
  body: string;
  footer?: string;
  onClose?: () => void;
  beforeClose?: () => boolean | Promise<boolean>;
  id?: string;
  wrapInForm?: boolean;
  formId?: string;
}

export class Modal {
  public element: HTMLDivElement;
  private options: ModalOptions;
  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(options: ModalOptions) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "m3-modal";
    if (options.id) this.element.id = options.id;

    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.render();
  }

  private render(): void {
    const { title, body, footer, wrapInForm, formId } = this.options;

    const content = `
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="btn btn--icon" data-modal-action="close" aria-label="Close">&times;</button>
      </div>
      ${wrapInForm ? `<form id="${formId || ""}">` : ""}
        <div class="modal__body">
          ${body}
        </div>
        ${footer ? `<div class="modal__footer">${footer}</div>` : ""}
      ${wrapInForm ? `</form>` : ""}
    `;

    this.element.innerHTML = content;

    this.element
      .querySelector('[data-modal-action="close"]')!
      .addEventListener("click", () => this.close());

    const cancelBtn = this.element.querySelector(
      '[data-modal-action="cancel"]',
    );
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }
  }

  public open(): void {
    const root = document.getElementById("modal-root");
    if (root) {
      root.appendChild(this.element);
      window.addEventListener("keydown", this.onKeyDownBound);
    }
  }

  public async close(): Promise<void> {
    if (this.options.beforeClose) {
      const canClose = await this.options.beforeClose();
      if (!canClose) return;
    }

    window.removeEventListener("keydown", this.onKeyDownBound);
    this.element.remove();
    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.close();
    }
  }

  public querySelector<T extends Element>(selector: string): T | null {
    return this.element.querySelector<T>(selector);
  }
}
