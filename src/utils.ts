import type { Term } from "./types";

export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatTermYear(term: Term, year: number): string {
  const termStr = capitalizeFirstLetter(term);
  if (term === "winter") {
    const shortYear = (year + 1).toString().slice(-2);
    return `${termStr} ${year}/${shortYear}`;
  }
  return `${termStr} ${year}`;
}
