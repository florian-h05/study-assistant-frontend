export enum ErrorCodes {
  NOT_CONFIGURED = "NOT_CONFIGURED",
}

export interface Config {
  serverUrl: string;
  token: string;
}

export type DocType = "lecture" | "exercise" | "assignment" | "exam";
export type Term = "winter" | "summer";

export interface Doc {
  id: number;
  course_name: string;
  doc_type: DocType;
  term: Term;
  year: number;
  num_pages: number;
  metadata: Record<string, unknown>;
  created_at: string; // ISO 8601
  // when type is lecture | exercise
  chapter_name: string | null;
  pdf_sequence: number | null;
  // when type is assignment:
  label: string | null;
}

export interface IngestPayload {
  course: string;
  type: DocType;
  term: Term;
  year: number;
  chapter?: string; // required when type is lecture | exercise
  label?: string; // required when type is assignment
  file: string; // base64-encoded PDF, no data-URI prefix
}
