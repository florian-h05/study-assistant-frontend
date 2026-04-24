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

export function getDefaultTermAndYear(): { term: Term; year: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 3=Apr, 8=Sep, 9=Oct
  const year = now.getFullYear();

  if (month >= 3 && month <= 8) {
    // April to September
    return { term: "summer", year };
  } else {
    // October to March
    return {
      term: "winter",
      year: month >= 0 && month <= 2 ? year - 1 : year,
    };
  }
}
