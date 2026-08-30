# Lab 2 REST API Contract

Status: Draft for approval before implementation

Base path: `/api`

Media type: `application/json` except Attachment upload and download

## 1. Contract Conventions

### Temporary Requester Context

Requester-scoped endpoints require:

```http
X-Requester-Id: 2f2d7ac8-5c60-4f1d-9dcb-3fa98fd7f39b
```

This header is a Lab 2 testing mechanism, not authentication. It is replaced by authenticated server identity in Lab 3. A missing or malformed header returns `400`. An inactive or unknown Requester context returns `400` without processing the requested operation.

### Identifiers and Dates

- Requester, Ticket, and Attachment IDs are UUID strings.
- Category and Related System IDs are positive integers.
- Dates and timestamps are ISO 8601 UTC strings.
- Ticket Number is a public identifier; internal Ticket UUID remains the route identifier.

### Error Envelope

All documented JSON errors use:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please correct the highlighted fields.",
    "fieldErrors": {
      "summary": "Summary must contain 5 to 120 characters."
    },
    "correlationId": "7648ce6d-caa8-4027-b81f-63ed9fcf0f2e"
  }
}
```

- `code` is stable and intended for client behavior.
- `message` is safe for users.
- `fieldErrors` is optional and maps input names to safe messages.
- `correlationId` is present on unexpected server errors and may be present on other errors.
- Stack traces, SQL, private storage keys, and local paths are never returned.

### Ownership Failure

Missing and non-owned Ticket or Attachment resources both return:

```http
404 Not Found
```

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found."
  }
}
```

This prevents the Development Requester context from revealing another Requester's data. It does not make the temporary context secure authentication.

## 2. Shared Resource Shapes

### Requester

```json
{
  "id": "2f2d7ac8-5c60-4f1d-9dcb-3fa98fd7f39b",
  "name": "Jennifer Anderson",
  "email": "jennifer.anderson@example.test"
}
```

### Reference Item

```json
{
  "id": 1,
  "name": "Account and Access"
}
```

### Attachment Metadata

```json
{
  "id": "2e12aff1-5847-4af6-9f78-ea61db446571",
  "ticketId": "caf5ce37-a369-4b62-aa2f-dbeedae76037",
  "originalName": "vpn-error.png",
  "mimeType": "image/png",
  "sizeBytes": 248120,
  "uploadedAt": "2026-08-30T08:15:32.000Z",
  "removedAt": null,
  "removalReason": null,
  "canDownload": true
}
```

`storedName`, `storageKey`, and server path are private and never appear in API responses.

Lab 2 intentionally provides no inline preview endpoint and no `canPreview` field. Active files may be downloaded; removed files may not be downloaded or previewed.

### Ticket Summary

```json
{
  "id": "caf5ce37-a369-4b62-aa2f-dbeedae76037",
  "ticketNumber": "TKT-20260830-8A31D9C2",
  "ticketDate": "2026-08-30T08:15:30.000Z",
  "summary": "VPN disconnects after sign-in",
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 3, "name": "VPN" },
  "requestedPriority": "HIGH",
  "itPriority": null,
  "currentStatus": "NEW",
  "updatedAt": "2026-08-30T08:15:32.000Z"
}
```

### Ticket Detail

Ticket Detail contains the Ticket Summary fields plus:

```json
{
  "requester": {
    "id": "2f2d7ac8-5c60-4f1d-9dcb-3fa98fd7f39b",
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.test"
  },
  "description": "The VPN connects and then disconnects after approximately one minute.",
  "attachments": []
}
```

## 3. Reference and Requester Endpoints

### GET `/api/categories`

Purpose: retrieve active Ticket Categories in ascending ID order.

Success: `200 OK`

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

The bare-array response preserves the Lab 1 contract. Inactive Categories are omitted.

Failures:

- `500 REFERENCE_DATA_UNAVAILABLE`

### GET `/api/related-systems`

Purpose: retrieve active Related Systems in case-insensitive name order.

Success: `200 OK` with a bare array of Reference Items.

Failures:

- `500 REFERENCE_DATA_UNAVAILABLE`

### GET `/api/requesters`

Purpose: retrieve active Development Requesters for the testing selector.

Success: `200 OK` with a bare array of Requesters ordered by name and then email.

The response never contains password, role, session, or token fields. Inactive Requesters are omitted.

Failures:

- `500 REQUESTERS_UNAVAILABLE`

## 4. Ticket Endpoints

### POST `/api/tickets`

Purpose: create one validated Ticket owned by the selected Development Requester.

Required headers:

```http
Content-Type: application/json
X-Requester-Id: <requester UUID>
Idempotency-Key: <client-generated UUID>
```

Request:

```json
{
  "categoryId": 4,
  "relatedSystemId": 3,
  "summary": "VPN disconnects after sign-in",
  "requestedPriority": "HIGH",
  "description": "The VPN connects and then disconnects after approximately one minute."
}
```

The body cannot set Ticket Number, Ticket Date, Requester ID, Current Status, or IT Priority.

#### Idempotency lifecycle and canonical hash

- One client-generated UUID key represents one logical submission.
- The client creates the key after client validation passes and immediately before the first POST. It stores the pending key and canonical payload in session storage.
- Network/timeout and `5xx` retries of an unchanged canonical payload reuse the key.
- The client rotates the key after any successful `2xx`, Cancel/Clear/Create Another, or an edit to a canonical field after a request was sent.
- The server builds a fixed-order UTF-8 JSON object containing canonical lowercase `requesterId`, integer `categoryId`, integer `relatedSystemId`, Summary normalized to Unicode NFC and trimmed, uppercase `requestedPriority`, and Description normalized to Unicode NFC with CRLF converted to LF and leading/trailing whitespace trimmed. Internal whitespace is otherwise preserved.
- `requestHash` is the lowercase hexadecimal SHA-256 of that exact UTF-8 JSON byte sequence.
- A `TicketCreateRequest` row reserves `(requesterId, idempotencyKey)` in the same transaction that creates the Ticket and marks the reservation complete. The composite database unique constraint is authoritative. Reservation uses `INSERT ... ON CONFLICT DO NOTHING RETURNING id`, avoiding an aborted transaction or uncaught unique-constraint exception.
- Two concurrent same-key inserts are serialized by PostgreSQL's unique check. The conflicting insert waits for the first transaction. If the first commits, the waiting statement returns no ID, then reads the completed reservation and returns the original Ticket as a `200` replay for the same hash or `409 IDEMPOTENCY_KEY_REUSED` for a different hash. If the first rolls back, the waiting insert returns its new ID and creates the single Ticket. A concurrent loser never becomes a `500` merely because of the unique constraint.

First successful response: `201 Created`

```json
{
  "data": {
    "id": "caf5ce37-a369-4b62-aa2f-dbeedae76037",
    "ticketNumber": "TKT-20260830-8A31D9C2",
    "ticketDate": "2026-08-30T08:15:30.000Z",
    "requester": {
      "id": "2f2d7ac8-5c60-4f1d-9dcb-3fa98fd7f39b",
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.test"
    },
    "category": { "id": 4, "name": "Network" },
    "relatedSystem": { "id": 3, "name": "VPN" },
    "summary": "VPN disconnects after sign-in",
    "requestedPriority": "HIGH",
    "itPriority": null,
    "description": "The VPN connects and then disconnects after approximately one minute.",
    "currentStatus": "NEW",
    "attachments": [],
    "updatedAt": "2026-08-30T08:15:30.000Z"
  }
}
```

Replay with the same Requester, key, and normalized payload: `200 OK`, the original data, and:

```http
Idempotency-Replayed: true
```

Failures:

- `400 REQUESTER_CONTEXT_REQUIRED`
- `400 REQUESTER_CONTEXT_INVALID`
- `400 IDEMPOTENCY_KEY_INVALID`
- `400 VALIDATION_FAILED` with `fieldErrors`
- `400 REFERENCE_VALUE_INACTIVE`
- `409 IDEMPOTENCY_KEY_REUSED` when the same key has a different normalized payload
- `500 TICKET_CREATE_FAILED`

### GET `/api/tickets`

Purpose: retrieve an owned Ticket list with search, filters, sorting, and pagination.

Required header: `X-Requester-Id`

Query parameters:

| Parameter | Type | Default | Rules |
|---|---|---|---|
| `search` | string | omitted | Trimmed, 1-100 characters; matches Ticket Number, Summary, and Description case-insensitively. |
| `categoryId` | positive integer | omitted | Must reference a Category. |
| `requestedPriority` | enum | omitted | `LOW`, `MEDIUM`, or `HIGH`. |
| `currentStatus` | enum | omitted | `NEW` in Lab 2. |
| `sortBy` | enum | `updatedAt` | `createdAt`, `updatedAt`, `ticketNumber`, or `requestedPriority`. |
| `sortDirection` | enum | `desc` | `asc` or `desc`. |
| `page` | positive integer | `1` | One-based. |
| `pageSize` | integer | `10` | `10`, `20`, or `50`. |

Example:

```http
GET /api/tickets?search=vpn&categoryId=4&sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10
```

Success: `200 OK`

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0,
    "sortBy": "updatedAt",
    "sortDirection": "desc"
  }
}
```

Items use the Ticket Summary shape. Sorting always adds `ticketNumber desc` as the secondary order unless Ticket Number is already the primary sort.

Requested Priority sorting uses explicit business rank `LOW = 1`, `MEDIUM = 2`, and `HIGH = 3`. Ascending order is `LOW`, `MEDIUM`, `HIGH`; descending order is `HIGH`, `MEDIUM`, `LOW`. The query must use this rank rather than alphabetical or database-enum order.

Failures:

- `400 REQUESTER_CONTEXT_REQUIRED`
- `400 REQUESTER_CONTEXT_INVALID`
- `400 INVALID_QUERY_PARAMETER` with `fieldErrors`
- `500 TICKET_LIST_FAILED`

An out-of-range valid page returns `200` with empty `data` and accurate metadata; it is not an error.

### GET `/api/tickets/:ticketId`

Purpose: retrieve one owned Ticket Detail and its Attachment metadata.

Required header: `X-Requester-Id`

Success: `200 OK`

```json
{
  "data": {
    "id": "caf5ce37-a369-4b62-aa2f-dbeedae76037",
    "ticketNumber": "TKT-20260830-8A31D9C2",
    "ticketDate": "2026-08-30T08:15:30.000Z",
    "requester": {
      "id": "2f2d7ac8-5c60-4f1d-9dcb-3fa98fd7f39b",
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.test"
    },
    "category": { "id": 4, "name": "Network" },
    "relatedSystem": { "id": 3, "name": "VPN" },
    "summary": "VPN disconnects after sign-in",
    "requestedPriority": "HIGH",
    "itPriority": null,
    "description": "The VPN connects and then disconnects after approximately one minute.",
    "currentStatus": "NEW",
    "attachments": [],
    "updatedAt": "2026-08-30T08:15:30.000Z"
  }
}
```

Failures:

- `400 INVALID_TICKET_ID`
- `404 RESOURCE_NOT_FOUND` for missing or non-owned Ticket
- `500 TICKET_DETAIL_FAILED`

## 5. Attachment Endpoints

### POST `/api/tickets/:ticketId/attachments`

Purpose: upload one Attachment to an owned Ticket.

Required headers:

```http
Content-Type: multipart/form-data
X-Requester-Id: <requester UUID>
```

Multipart field:

| Field | Requirement |
|---|---|
| `file` | Exactly one required file. |

Success: `201 Created`

```json
{
  "data": {
    "id": "2e12aff1-5847-4af6-9f78-ea61db446571",
    "ticketId": "caf5ce37-a369-4b62-aa2f-dbeedae76037",
    "originalName": "vpn-error.png",
    "mimeType": "image/png",
    "sizeBytes": 248120,
    "uploadedAt": "2026-08-30T08:15:32.000Z",
    "removedAt": null,
    "removalReason": null,
    "canDownload": true
  }
}
```

Failures:

- `400 FILE_REQUIRED`
- `400 ATTACHMENT_FILENAME_INVALID`
- `400 INVALID_TICKET_ID`
- `404 RESOURCE_NOT_FOUND` for missing or non-owned Ticket
- `409 ATTACHMENT_LIMIT_REACHED`
- `413 ATTACHMENT_TOO_LARGE`
- `415 ATTACHMENT_TYPE_UNSUPPORTED`
- `500 ATTACHMENT_UPLOAD_FAILED`

The maximum file size is 5 MiB. Filename handling and content validation are server-side requirements:

1. Strip all `/` and `\\` path segments to a basename, normalize Unicode to NFC, trim surrounding whitespace, and remove NUL, C0 controls (`U+0000-U+001F`), and DEL (`U+007F`).
2. Reject an empty basename, `.` or `..`, a name without a basename before its extension, or a normalized display name longer than 255 UTF-8 bytes.
3. Compare extensions case-insensitively and store the approved extension in lowercase. Retain the safe basename's original case for display only.
4. Require extension, declared multipart MIME type, and detected magic bytes to agree with one permitted mapping:
   - `.jpg`/`.jpeg`, `image/jpeg`, prefix `FF D8 FF`;
   - `.png`, `image/png`, prefix `89 50 4E 47 0D 0A 1A 0A`;
   - `.webp`, `image/webp`, `RIFF` at bytes 0-3 and `WEBP` at bytes 8-11;
   - `.pdf`, `application/pdf`, prefix `%PDF-`.
5. Never use the display basename as a storage path. The final name is a generated UUID plus canonical extension.

### GET `/api/attachments/:attachmentId`

Purpose: retrieve safe metadata for one Attachment belonging to an owned Ticket.

Success: `200 OK` with the Attachment Metadata shape. Removed metadata is returned with `canDownload: false`. Lab 2 exposes no inline preview capability for active or removed Attachments.

Failures:

- `400 INVALID_ATTACHMENT_ID`
- `404 RESOURCE_NOT_FOUND` for missing or non-owned Attachment
- `500 ATTACHMENT_METADATA_FAILED`

### GET `/api/attachments/:attachmentId/download`

Purpose: download one active Attachment belonging to an owned Ticket.

Success: `200 OK` binary response with:

```http
Content-Type: <stored approved MIME type>
Content-Length: <stored byte size>
Content-Disposition: attachment; filename*=UTF-8''<encoded safe original name>
X-Content-Type-Options: nosniff
```

Failures:

- `400 INVALID_ATTACHMENT_ID`
- `404 RESOURCE_NOT_FOUND` for missing, non-owned, or removed Attachment
- `404 ATTACHMENT_FILE_UNAVAILABLE` when active metadata exists but the stored file cannot be read
- `500 ATTACHMENT_DOWNLOAD_FAILED`

### DELETE `/api/attachments/:attachmentId`

Purpose: soft-remove one active Attachment belonging to an owned Ticket.

Request:

```json
{
  "reason": "Uploaded the wrong screenshot."
}
```

`reason` is trimmed and must contain 5-200 characters.

Success: `200 OK` with updated Attachment Metadata:

```json
{
  "data": {
    "id": "2e12aff1-5847-4af6-9f78-ea61db446571",
    "ticketId": "caf5ce37-a369-4b62-aa2f-dbeedae76037",
    "originalName": "vpn-error.png",
    "mimeType": "image/png",
    "sizeBytes": 248120,
    "uploadedAt": "2026-08-30T08:15:32.000Z",
    "removedAt": "2026-08-30T08:20:10.000Z",
    "removalReason": "Uploaded the wrong screenshot.",
    "canDownload": false
  }
}
```

Failures:

- `400 INVALID_ATTACHMENT_ID`
- `400 VALIDATION_FAILED` with a `reason` field error
- `404 RESOURCE_NOT_FOUND` for missing or non-owned Attachment
- `409 ATTACHMENT_ALREADY_REMOVED`
- `500 ATTACHMENT_REMOVE_FAILED`

## 6. Expected HTTP Status Summary

| Status | Contract use |
|---|---|
| `200` | Successful retrieval, idempotent Ticket replay, or successful soft removal. |
| `201` | Ticket or Attachment created. |
| `400` | Malformed ID, missing temporary context, invalid input, inactive reference, or invalid query. |
| `404` | Missing/non-owned Ticket or Attachment, removed download, or unavailable active file. |
| `409` | Idempotency conflict, active Attachment limit, or already-removed conflict. |
| `413` | Attachment exceeds 5 MiB. |
| `415` | Unsupported or mismatched extension, declared MIME type, or magic-byte signature. |
| `500` | Safe unexpected server failure. |

## 7. Transaction and Compensation Rules

- Ticket creation uses one transaction containing `TicketCreateRequest` reservation, canonical-hash comparison, Ticket insertion, and reservation completion. Reservation uses `INSERT ... ON CONFLICT DO NOTHING RETURNING id`; the composite unique constraint serializes concurrent same-key requests, and a no-ID result is handled as replay or `409`, never leaked as `500`.
- Attachment upload streams to a unique temporary file while enforcing the byte limit, then validates the safe basename and extension/MIME/signature mapping.
- The metadata transaction selects the owned Ticket row `FOR UPDATE`, counts active Attachments while holding that per-Ticket lock, and rejects the request if the count is already five.
- While holding the lock, the server moves the validated temporary file to its final UUID path, inserts metadata, and commits. Concurrent uploads for one Ticket are therefore serialized; with four active files and two simultaneous uploads, exactly one reaches five and the other returns `409 ATTACHMENT_LIMIT_REACHED`.
- A request rejected before final move deletes its temporary file. A move, insert, or commit failure rolls back metadata and performs best-effort deletion of temporary and newly moved final files. Cleanup failures are logged with a correlation ID for operational repair and are never exposed as paths to the client.
- Ticket creation and upload are intentionally separate. A created Ticket is not deleted when a later Attachment upload fails.
- Soft removal updates metadata in one database transaction and intentionally retains the stored file in Lab 2.

## 8. Traceability

Endpoint tests and their mapped Acceptance Criteria are listed in [tests.md](./tests.md). Implementation must not change an endpoint shape or status code without updating this contract, its mapped ACs, and tests in the same Pull Request.
