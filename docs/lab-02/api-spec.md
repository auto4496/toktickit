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
  "canPreview": true,
  "canDownload": true
}
```

`storedName`, `storageKey`, and server path are private and never appear in API responses.

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
    "canPreview": true,
    "canDownload": true
  }
}
```

Failures:

- `400 FILE_REQUIRED`
- `400 INVALID_TICKET_ID`
- `404 RESOURCE_NOT_FOUND` for missing or non-owned Ticket
- `409 ATTACHMENT_LIMIT_REACHED`
- `413 ATTACHMENT_TOO_LARGE`
- `415 ATTACHMENT_TYPE_UNSUPPORTED`
- `500 ATTACHMENT_UPLOAD_FAILED`

The maximum file size is 5 MiB. The permitted extension/MIME pairs are `.jpg` or `.jpeg` with `image/jpeg`, `.png` with `image/png`, `.webp` with `image/webp`, and `.pdf` with `application/pdf`.

### GET `/api/attachments/:attachmentId`

Purpose: retrieve safe metadata for one Attachment belonging to an owned Ticket.

Success: `200 OK` with the Attachment Metadata shape. Removed metadata is returned with `canPreview: false` and `canDownload: false`.

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
    "canPreview": false,
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
| `415` | Unsupported extension/MIME pair. |
| `500` | Safe unexpected server failure. |

## 7. Transaction and Compensation Rules

- Ticket creation is one database transaction containing idempotency evaluation and Ticket insertion.
- Attachment upload validates ownership and current active count before storage.
- After a file is stored, metadata is inserted. If metadata insertion fails, the server attempts to remove the newly stored file and logs any compensation failure.
- Ticket creation and upload are intentionally separate. A created Ticket is not deleted when a later Attachment upload fails.
- Soft removal updates metadata in one database transaction and intentionally retains the stored file in Lab 2.

## 8. Traceability

Endpoint tests and their mapped Acceptance Criteria are listed in [tests.md](./tests.md). Implementation must not change an endpoint shape or status code without updating this contract, its mapped ACs, and tests in the same Pull Request.
