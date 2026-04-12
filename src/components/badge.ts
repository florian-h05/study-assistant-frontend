export type BadgeColour = "purple" | "teal" | "amber" | "coral" | "gray";

export function createBadge(text: string, colour: BadgeColour): HTMLElement {
  const span = document.createElement("span");
  span.className = `badge badge--${colour}`;
  span.textContent = text;
  return span;
}
