# LAB4 Visual and Accessibility Inspection

Author review, 2026-10-10, on feature-branch captures from `5172f83`. [Capture manifest](../../artifacts/lab-04/release/manifest.json) records provenance and full-size files. This checklist complements passing component/browser checks; it does not claim complete WCAG certification or the student's personal demonstration.

| Check | Evidence and observed scope | Author status |
|---|---|---|
| Zen Green shell, active navigation, text/status badges | Requester/Staff/Admin dashboards and retained screens use shared colors, typography, spacing and text cues | Author visual pass: all 75 captures inventoried; representative full-size views checked |
| Desktop/tablet/mobile | All major LAB4 dashboards, Actions list/detail/forms and resolution feedback captured at 1440/834/390px | Author visual pass at all three widths; no clipping/overlap found in inspected views |
| Narrow screen and horizontal overflow | Retained Requester/Staff/Admin/system checks include 320px; all new form/dashboard captures assert document width | Browser pass |
| Keyboard links and visible focus | Real dashboard link activation, filter navigation, Start focus/busy handling and ten real role routes | Browser pass |
| Native required validation and draft retention | Empty follow-up note focuses the required textarea, reports valueMissing and preserves description; create/edit revision pair confirmed | Browser pass; form capture available |
| Labels, errors and non-color information | Explicit Action/date/assignee/conditional-note labels, text status and field aria-invalid/aria-describedby; component and style checks retained | Automated and author visual pass |
| Read-only and private/shared distinctions | Requester Action controls absent, Admin Ticket status controls absent; private notes separate and denied to Requester | API/browser pass; captures available |
| Dialog keyboard operation | Retained Admin dialog focus trap/Escape/return-focus; Ticket/Action confirmation flows retained | Browser pass |
| Loading, empty, forbidden and safe failure | Dashboard states explicitly captured; browser-simulated loading/503/403 names are labelled; empty account is real owned data | Browser and author visual pass |
| Conflict and safe recovery | Real competing Action/resolve changes, version reload, response-loss create recovery and retained draft paths | API/component/browser pass |
| Browser errors and API read failures | Authenticated-route polish test visits ten permitted role routes, asserting no console errors/page errors or failing API reads | Browser pass; intentional pre-login 401 probe excluded |
| Clipping, overlap and readable fields | Inspect full-size representative desktop/tablet/mobile forms, dashboard and workflow captures, then all PDF pages | Author pass: final report pages rendered/inspected; focused excerpts labelled and full-size links retained |
| Student native zoom and final demonstration | Student must try normal browser zoom, read Reflection and demonstrate business rules | Pending student confirmation before submission |

Simulated Dashboard failure/forbidden captures prove UI feedback only. Separate real API tests establish role denial, safe failure redaction and ownership. Complete image hashes prove file integrity, not visual quality; the latter requires the inspection recorded above.

Visual correction: inspection found a blue, oversized native Follow-up checkbox. Commit 5172f83 scopes its 20px intrinsic size/green accent and keeps the label target 44px. Full regression/build/browser capture were repeated; final mobile create/edit fields are aligned and the label stays on one line. PDF layout iterations removed split figures/captions and selected focused workflow excerpts so readiness and rejection text are visible.
