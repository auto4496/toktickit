# Lab 2 Zen Green UI Specification

Status: Draft for approval before implementation

Applies to: Development Requester Selection, application shell, Create Ticket, My Tickets, Ticket Detail, and Attachment states

## 1. Design Direction

TokTickIT uses a calm, professional Zen Green visual language. Green communicates navigation, primary actions, selection, and success; it is not used as the only indicator of state. Screens prioritize readable forms and ticket information over decorative elements. Lab 2 components must be reusable by later staff and workflow screens.

Bootstrap may provide layout primitives, but TokTickIT CSS variables and component classes define the visible design. Default Bootstrap blue must not remain on primary actions, links, focus states, or active navigation.

## 2. Design Tokens

### Color

| Token | Value | Required use |
|---|---|---|
| `--color-primary` | `#006B3C` | App header, primary buttons, strong emphasis. |
| `--color-primary-hover` | `#005A33` | Primary hover/pressed state. |
| `--color-secondary` | `#0B7A46` | Active navigation, links, focus accents, secondary emphasis. |
| `--color-pale-green` | `#EAF6EF` | Selection, success background, subtle section emphasis. |
| `--color-page` | `#F5F7F6` | Page background. |
| `--color-surface` | `#FFFFFF` | Cards, dialogs, tables, editable fields. |
| `--color-text` | `#17352A` | Primary text; never pure black. |
| `--color-text-muted` | `#52665E` | Supporting text and metadata. |
| `--color-border` | `#CCD8D2` | Neutral borders and separators. |
| `--color-readonly` | `#F0F3F1` | Read-only field background. |
| `--color-error` | `#B42318` | Error text, icons, and invalid borders. |
| `--color-error-bg` | `#FEF3F2` | Error alert background. |
| `--color-warning` | `#9A6700` | Warning text and badges. |
| `--color-warning-bg` | `#FFF7E0` | Warning callout background. |
| `--color-focus` | `#0B7A46` | Keyboard focus ring. |

All text/background combinations must meet WCAG 2.1 AA contrast. A state always includes text, an icon, or another non-color indicator.

### Typography

- Font stack: `Inter, "Segoe UI", Roboto, Arial, sans-serif`; no new web-font download is required.
- Body: 16px, line-height 1.5.
- Small metadata/helper text: 14px minimum.
- Page title: 28-32px desktop, 24-28px mobile, weight 700.
- Section title: 20-24px, weight 650-700.
- Labels: 14px, weight 600.
- Ticket Number may use a system monospace stack while remaining at least 14px.

### Spacing, Radius, and Shadow

- Spacing scale: 4, 8, 12, 16, 24, 32, and 48px.
- Standard control height: at least 44px.
- Touch target: at least 44 by 44px.
- Card radius: 10px; control/button radius: 6px.
- Surface shadow: restrained, such as `0 2px 8px rgba(18, 52, 40, 0.08)`.
- Content maximum width: 1200px; form maximum width: 1000px.

## 3. Application Routes and Guard

| Route | Screen |
|---|---|
| `/select-requester` | Development Requester Selection |
| `/tickets` | My Tickets |
| `/tickets/new` | Create Ticket |
| `/tickets/:ticketId` | Requester Ticket Detail |

When no valid Requester is selected, requester-scoped routes render or redirect to `/select-requester`. The intended destination may be remembered for the current navigation attempt. Changing Requester clears requester-scoped client data and then reloads the current route or navigates to My Tickets.

## 4. Application Shell

### Desktop

The header contains, from left to right:

1. TokTickIT icon/wordmark linked to My Tickets.
2. My Tickets navigation.
3. Create Ticket navigation.
4. Selected Development Requester name.
5. Change Requester action.

The active route uses a visible underline or pale-green filled state plus `aria-current="page"`. Navigation labels remain visible; icons do not replace text.

### Mobile

- TokTickIT identity and current Requester remain visible.
- Navigation collapses into an accessible menu button with `aria-expanded` and an explicit label.
- The menu provides My Tickets, Create Ticket, and Change Requester.
- Opening the menu does not create horizontal page overflow or cover focused content without a dismiss action.

### Requester Context Notice

The first screen and Change Requester area include this meaning in concise text:

> Select a Development Requester to test requester-specific behavior. This is not a login screen. Authentication will be introduced in Lab 3.

The exact wording may be shortened but the testing-only and not-authentication statements cannot be removed.

## 5. Shared Components

### Fields

- Labels appear above controls.
- Required labels include a visible red `*` plus screen-reader text such as "required".
- Editable controls use a white background and neutral border.
- Read-only values use `--color-readonly`, `aria-readonly` where appropriate, and a `Read-only` helper only when the state could be ambiguous.
- Invalid fields use an error border and `aria-invalid="true"`; their message appears immediately below and is connected by `aria-describedby`.
- Disabled fields have reduced contrast but remain readable and cannot receive activation.
- Focus uses a clearly visible 2-3px ring with sufficient contrast.
- Description is multiline, receives more vertical space, and may resize vertically only.

### Buttons

| Type | Appearance and use |
|---|---|
| Primary | Solid primary green; one dominant action per section, such as Continue or Submit Ticket. |
| Secondary | White surface with green border/text; navigation-like actions such as Back or Cancel. |
| Tertiary | Text/link style for low-emphasis actions such as Clear Filters. |
| Destructive | Error-color border/text or solid error color inside a confirmation dialog only. |
| Disabled | Distinct muted appearance, `disabled` attribute, no hover activation. |
| Busy | Retains width, displays spinner plus action text such as `Submitting...`, and is disabled. |

Button text must describe the action. Icon-only controls require an accessible name and tooltip.

### Alerts and State Panels

- Success: success icon, heading, explanatory text, and next action.
- Error: error icon, safe message, Retry action where meaningful.
- Warning: amber callout reserved for testing-only identity, partial upload, destructive confirmation, or unavailable content.
- Loading: spinner or skeleton plus explicit status text using `role="status"`.
- Empty/no-results: distinct heading, explanation, and useful next action.

### Badges

- Requested Priority: `LOW`, `MEDIUM`, and `HIGH` have distinct text and icon/shape treatment; color alone is insufficient.
- IT Priority: missing value displays `Not assigned` using a neutral badge. Lab 2 provides no control to change it.
- Current Status: `NEW` uses pale green and the visible text `New`.
- Removed Attachment: neutral/error-accent badge with the visible text `Removed`.

## 6. Development Requester Selection

### Layout

- Centered surface card, maximum width approximately 600px.
- TokTickIT title and user-selection icon.
- Page heading: `Select Development Requester`.
- Testing-only explanation.
- Required `Development Requester` dropdown.
- Primary `Continue` and secondary `Cancel` or disabled back action, depending on navigation source.
- Authentication-in-Lab-3 informational callout.

### States

| State | Required behavior |
|---|---|
| Loading | Dropdown and Continue disabled; explicit `Loading requesters...`. |
| Ready | Active Requesters listed by name with email available for disambiguation. |
| No selection | Continue disabled or selection validation shown after attempted continuation. |
| Empty | `No active Development Requesters are available` with Retry. |
| API failure | Safe failure message and Retry; no stale requester list. |
| Continue | Selected context is stored, shell updates, and destination data loads for that Requester. |

## 7. Create Ticket

### Desktop Arrangement

1. Page title, short instruction, and Requester-context notice.
2. `Ticket information` card with read-only Ticket Number (`Generated after submission`), Ticket Date (`Set on submission`), and Requester.
3. `Classification` row with Category, Related System, and Requested Priority.
4. Summary full-width field.
5. Description full-width multiline field.
6. Attachments section with permitted types, 5 MiB limit, active-count indicator, selected-file rows, and per-file errors.
7. Footer actions: secondary Cancel/Clear and primary Submit Ticket.

Tablet may use two columns where practical. Mobile stacks every field and action vertically.

### Create States

| State | Required behavior |
|---|---|
| Reference loading | Reference selectors disabled; visible loading state; entered text is not lost during retry. |
| Initial | Read-only values visually distinct; Submit follows the approved initial enabled/disabled rule. |
| Validation failure | Focus moves to the error summary or first invalid field; each invalid field has an inline message. |
| Submitting | Submit shows `Submitting...`, all duplicate submission paths are disabled, and form values remain visible. |
| Ticket success | Official Ticket Number and saved values from the response are shown with View Ticket and Create Another actions. |
| API failure | Safe alert near actions; editable values and selected valid files remain. |
| Partial upload failure | Ticket success remains visible; each failed file shows the reason and Retry/Remove action. |

Selected files are not shown as uploaded until the server returns Attachment metadata. Invalid files remain visible only long enough to explain rejection and allow removal/reselection.

## 8. My Tickets

### Controls

- Page title and Create Ticket primary action.
- Search input with explicit Search or debounced behavior documented in implementation.
- Category, Requested Priority, and Current Status filters.
- Sort field and direction controls.
- Clear Filters tertiary action.
- Result count and pagination controls.

Changing a filter or page size returns to page 1. Query controls remain keyboard operable and have visible labels.

### Desktop Table

Columns:

1. Ticket Number
2. Summary
3. Category
4. Requested Priority
5. IT Priority (`Not assigned` in Lab 2)
6. Current Status
7. Last Updated
8. Accessible View action

Rows are not made clickable unless keyboard and screen-reader behavior is equivalent to an explicit link. Summary truncation must expose the full value through accessible text or a detail link.

### Mobile Representation

Use one card per Ticket with Ticket Number and Summary first, followed by Category, priorities, Status, and Last Updated. Each card contains a full-width `View Ticket` action. Cards must not require horizontal scrolling.

### List States

- Loading: table/card skeleton with status text.
- Empty: `You have not created any tickets yet` plus Create Ticket.
- No results: `No tickets match these filters` plus Clear Filters.
- Failure: safe message plus Retry; current query controls remain visible.
- Loaded: result range, total count, and page position are visible.

## 9. Requester Ticket Detail

### Layout

- Breadcrumb or Back to My Tickets.
- Header containing Ticket Number, Current Status badge, Ticket Date, and Last Updated.
- Read-only information grid: Requester, Category, Related System, Requested Priority, IT Priority (`Not assigned`), Summary, and Description.
- Separate Attachments section below the Ticket information.
- No edit, status-change, comment, internal-note, or Actions Taken control.

### Detail States

- Loading: read-only skeleton and explicit status.
- Loaded: all current values from the API; no stale list-only assumptions.
- Not found/non-owned: safe not-found page with Back to My Tickets.
- Failure: safe message with Retry.

## 10. Attachment Section

### Upload Control

- Visible `Add Attachment` button/input with an accessible label.
- Supporting text: JPG, PNG, WEBP, or PDF; maximum 5 MiB each; maximum five active files.
- Active count such as `2 of 5 active attachments`.
- Uploading row shows filename, progress/busy state, and no duplicate upload action.
- Invalid row shows a specific safe reason adjacent to the filename.

### Attachment Rows

Active rows show:

- File-type icon plus original filename.
- MIME-friendly type label, formatted size, and upload date.
- Preview when supported by approved product behavior.
- Download action.
- Remove action.

Removed rows remain visible and show original filename, size, uploaded date, Removed badge, removal date, and reason. Preview, Download, and Remove actions are absent or disabled with an explanation.

### Removal Confirmation

- Modal/dialog title identifies the file.
- Warning explains that metadata remains but the file can no longer be opened through TokTickIT.
- Required removal-reason textarea, 5-200 characters.
- Secondary Cancel and destructive `Remove Attachment` action.
- Focus is trapped while open and returns to the originating Remove button after cancel.
- Successful removal updates the row without removing its metadata.

## 11. Responsive Rules

| Viewport | Required behavior |
|---|---|
| Desktop `>= 992px` | Centered maximum-width content; multi-column forms; desktop ticket table. |
| Tablet `768-991px` | Two columns where practical; Summary and Description remain full-width; filters may wrap cleanly. |
| Mobile `< 768px` | Single-column fields, ticket cards, stacked or full-width actions, touch-friendly controls, no horizontal page scrolling. |
| All sizes | No clipped labels, overlapping messages, hidden actions, unreadable filenames, or inaccessible menus/dialogs. |

Long Ticket Numbers, Summary values, email addresses, and Attachment names must wrap or truncate safely without expanding the page width.

## 12. Accessibility Contract

- One descriptive `h1` per page and logical heading order.
- Every input has a programmatic label; placeholder text is never the only label.
- Required and invalid states are announced through attributes and text.
- Keyboard focus remains visible and follows logical visual order.
- Dynamic loading, success, partial failure, and error messages use appropriate live-region behavior without repeated announcements.
- Dialogs have accessible names, focus management, Escape/cancel behavior, and return focus.
- Navigation exposes `aria-current`; mobile menu exposes its expanded state.
- Icons supplement visible text or receive accessible names and tooltips when icon-only.
- Minimum touch target is 44 by 44px.
- Color is never the only carrier of priority, status, error, or removal meaning.

## 13. Visual and Responsive Verification

Required Playwright screenshots:

```text
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── desktop-initial.png
│   ├── desktop-validation.png
│   ├── desktop-success.png
│   ├── tablet.png
│   └── mobile.png
├── my-tickets/
│   ├── desktop-loaded.png
│   ├── desktop-no-results.png
│   ├── tablet.png
│   └── mobile-cards.png
└── ticket-detail/
    ├── desktop-active-attachments.png
    ├── desktop-removed-attachment.png
    ├── tablet.png
    └── mobile.png
```

### Visual Checklist

- [ ] Zen Green tokens are used consistently; default Bootstrap blue is absent from product states.
- [ ] Editable, read-only, invalid, disabled, focus, and busy controls are visually distinct.
- [ ] Labels, required markers, helper text, and inline validation are consistently positioned.
- [ ] Primary, secondary, tertiary, destructive, disabled, and busy button hierarchy is clear.
- [ ] Requested Priority, IT Priority, Current Status, and Removed badges include readable text.
- [ ] Desktop table and mobile cards present equivalent essential information.
- [ ] Search, filters, sort, Clear Filters, and pagination remain usable at all required widths.
- [ ] Empty and no-results states are visually and semantically distinct.
- [ ] Active, uploading, invalid, failed, removed, and unavailable Attachment states are distinguishable.
- [ ] No clipping, overlap, hidden action, unintended horizontal page scrolling, or unreadable Attachment name is present.
- [ ] Keyboard focus, accessible names, and non-color indicators have been manually inspected.
