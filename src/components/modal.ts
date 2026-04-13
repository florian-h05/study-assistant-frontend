export interface ModalOptions {
  title: string;
  body: string;
  footer?: string;
  onClose?: () => void;
  beforeClose?: () => boolean | Promise<boolean>;
  id?: string;
  className?: string;
  wrapInForm?: boolean;
  formId?: string;
}

export class Modal {
  public element: HTMLDivElement;
  private backdrop: HTMLDivElement | null = null;
  private options: ModalOptions;
  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(options: ModalOptions) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = `m3-modal ${options.className || ""}`.trim();
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
      this.backdrop = document.createElement("div");
      this.backdrop.className = "modal-backdrop";
      this.backdrop.appendChild(this.element);
      root.appendChild(this.backdrop);
      window.addEventListener("keydown", this.onKeyDownBound);
    }
  }

  public async close(): Promise<void> {
    if (this.options.beforeClose) {
      const canClose = await this.options.beforeClose();
      if (!canClose) return;
    }

    window.removeEventListener("keydown", this.onKeyDownBound);
    this.backdrop?.remove();
    this.backdrop = null;
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
