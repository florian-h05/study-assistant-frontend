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
  metadata: {
    tokens: TokenUsage;
  };
  created_at: string; // ISO 8601
  // when type is lecture | exercise
  chapter_name: string | null;
  pdf_sequence: number | null;
  // when type is assignment:
  label: string | null;
}

export interface DocGroup {
  course_name: string;
  doc_type: DocType;
  term: Term;
  year: number;
  chapter_name: string | null;
  label: string | null;
  docs: Doc[];
  total_pages: number;
  latest_upload: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  thought?: number;
}

export interface SummaryResponse {
  title: string;
  timestamp: string;
  summary: string;
  tokens: TokenUsage;
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
