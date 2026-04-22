# API Documentation

This document describes the API endpoints and data structures that the Study Assistant frontend expects from its backend.

## Base Configuration

The frontend communicates with a backend server configured in the application settings. All API calls are routed through a `/webhook/` path on the server URL.

- **Base URL**: `{serverUrl}/webhook/`
- **Authentication**: Uses a Bearer token in the `Authorization` header if configured.

See [src/api.ts](src/api.ts) for the `apiFetch` implementation.

## Endpoints

### 1. Documents (CRUD)

Handles retrieving, uploading, and deleting documents.

#### Get All Documents

- **Path**: `study-assistant-doc`
- **Method**: `GET`
- **Response**: `Doc[]`
- **Reference**: `getDocs()` in [src/api.ts](src/api.ts)

#### Upload Document

- **Path**: `study-assistant-doc`
- **Method**: `POST`
- **Request Body**: `IngestPayload` (JSON) or `FormData`
- **Response**: `Doc`
- **Reference**: `ingestDoc()` in [src/api.ts](src/api.ts)

#### Delete Document

- **Path**: `study-assistant-doc`
- **Method**: `DELETE`
- **Request Body**: `{ id: number }` (JSON)
- **Response**: `200 OK` (empty)
- **Reference**: `deleteDoc()` in [src/api.ts](src/api.ts)

### 2. Summarization

Triggers a summary generation for a specific course and chapter.

#### Trigger Summary

- **Path**: `study-assistant-summary`
- **Method**: `POST`
- **Request Body**: `{ course: string, chapter: string }` (JSON)
- **Response**: `SummaryResponse`
- **Reference**: `triggerSummary()` in [src/api.ts](src/api.ts)

---

## Data Structures

The following types are defined in [src/types.ts](src/types.ts).

### `Doc`

Represents a single document stored in the backend.

| Field          | Type             | Description                                         |
| :------------- | :--------------- | :-------------------------------------------------- |
| `id`           | `number`         | Unique identifier.                                  |
| `course_name`  | `string`         | Name of the course.                                 |
| `doc_type`     | `DocType`        | One of `lecture`, `exercise`, `assignment`, `exam`. |
| `term`         | `Term`           | `winter` or `summer`.                               |
| `year`         | `number`         | The starting year of the semester.                  |
| `num_pages`    | `number`         | Page count of the document.                         |
| `metadata`     | `object`         | Contains `tokens` usage info.                       |
| `created_at`   | `string`         | ISO 8601 timestamp.                                 |
| `chapter_name` | `string \| null` | Name of the chapter (for lectures/exercises).       |
| `label`        | `string \| null` | Label/identifier (for assignments).                 |

### `IngestPayload`

The payload used for uploading a new document via JSON.

| Field     | Type      | Description                                   |
| :-------- | :-------- | :-------------------------------------------- |
| `course`  | `string`  | Course name.                                  |
| `type`    | `DocType` | Document type.                                |
| `term`    | `Term`    | `winter` or `summer`.                         |
| `year`    | `number`  | Starting year.                                |
| `chapter` | `string`  | (Optional) Required for `lecture`/`exercise`. |
| `label`   | `string`  | (Optional) Required for `assignment`.         |
| `file`    | `string`  | Base64-encoded PDF (no data-URI prefix).      |

### `SummaryResponse`

Returned after triggering a summary.

| Field       | Type         | Description                     |
| :---------- | :----------- | :------------------------------ |
| `title`     | `string`     | Title of the summary.           |
| `timestamp` | `string`     | Generation timestamp.           |
| `summary`   | `string`     | The generated Markdown summary. |
| `tokens`    | `TokenUsage` | Token consumption details.      |

### `TokenUsage`

Used for tracking AI model consumption.

| Field     | Type                |
| :-------- | :------------------ |
| `input`   | `number`            |
| `output`  | `number`            |
| `total`   | `number`            |
| `thought` | `number` (optional) |
