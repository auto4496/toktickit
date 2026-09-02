import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Requester } from './App';

type ReferenceItem = { id: number; name: string };
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

type FormValues = {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  requestedPriority: string;
  description: string;
};

type FieldErrors = Partial<Record<keyof FormValues | 'attachments', string>>;

type TicketData = {
  id: string;
  ticketNumber: string;
  ticketDate: string;
  requester: Requester;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  summary: string;
  requestedPriority: Priority;
  itPriority: Priority | null;
  description: string;
  currentStatus: 'NEW';
  attachments: unknown[];
  updatedAt: string;
};

type PendingSubmission = {
  idempotencyKey: string;
  canonicalPayload: string;
};

type SelectedFile = { id: string; file: File };
type AttachmentUpload = { status: 'uploading' | 'uploaded' | 'failed'; message: string };

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const initialValues: FormValues = {
  categoryId: '',
  relatedSystemId: '',
  summary: '',
  requestedPriority: '',
  description: '',
};
const maximumFileBytes = 5 * 1024 * 1024;
const allowedFiles: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export const CREATE_TICKET_PENDING_KEY = 'toktickit.create-ticket.pending';

const apiUrl = () => import.meta.env.VITE_API_URL ?? '';

const normalizeSummary = (value: string) => value.normalize('NFC').trim();
const normalizeDescription = (value: string) =>
  value.normalize('NFC').replace(/\r\n/g, '\n').trim();

const normalizeValues = (values: FormValues) => ({
  categoryId: Number(values.categoryId),
  relatedSystemId: Number(values.relatedSystemId),
  summary: normalizeSummary(values.summary),
  requestedPriority: values.requestedPriority.toUpperCase() as Priority,
  description: normalizeDescription(values.description),
});

const canonicalPayload = (requesterId: string, values: FormValues) => {
  const normalized = normalizeValues(values);
  return JSON.stringify({
    requesterId: requesterId.toLowerCase(),
    categoryId: normalized.categoryId,
    relatedSystemId: normalized.relatedSystemId,
    summary: normalized.summary,
    requestedPriority: normalized.requestedPriority,
    description: normalized.description,
  });
};

const createUuid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

const readPendingSubmission = (): PendingSubmission | null => {
  try {
    const value = window.sessionStorage.getItem(CREATE_TICKET_PENDING_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<PendingSubmission>;
    return typeof parsed.idempotencyKey === 'string' &&
      typeof parsed.canonicalPayload === 'string'
      ? (parsed as PendingSubmission)
      : null;
  } catch {
    window.sessionStorage.removeItem(CREATE_TICKET_PENDING_KEY);
    return null;
  }
};

const isReferenceItemArray = (value: unknown): value is ReferenceItem[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ReferenceItem).id === 'number' &&
      typeof (item as ReferenceItem).name === 'string',
  );

const loadReferenceItems = async (path: string) => {
  const response = await fetch(`${apiUrl()}${path}`);
  if (!response.ok) throw new Error('Reference request failed.');
  const body = (await response.json()) as unknown;
  if (!isReferenceItemArray(body)) throw new Error('Invalid reference response.');
  return body;
};

const validateFiles = (files: File[]) => {
  if (files.length > 5) return 'Select no more than five attachments.';
  for (const file of files) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedFiles[extension] || allowedFiles[extension] !== file.type) {
      return 'Attachments must be JPG, PNG, WEBP, or PDF files.';
    }
    if (file.size > maximumFileBytes) {
      return 'Each attachment must be 5 MiB or smaller.';
    }
  }
  return null;
};

const readAttachmentErrorCode = async (response: Response) => {
  try {
    const body = await response.json() as { error?: { code?: unknown } };
    return typeof body.error?.code === 'string' ? body.error.code : null;
  } catch {
    return null;
  }
};

const attachmentFailureMessage = (code: string | null) => {
  if (code === 'ATTACHMENT_FILENAME_INVALID') return 'The filename is not valid.';
  if (code === 'ATTACHMENT_TYPE_UNSUPPORTED') return 'The extension, declared type, and file contents do not match.';
  if (code === 'ATTACHMENT_TOO_LARGE') return 'The file is larger than 5 MiB.';
  if (code === 'ATTACHMENT_LIMIT_REACHED') return 'This Ticket already has five active Attachments.';
  if (code === 'RESOURCE_NOT_FOUND') return 'The requested Ticket is unavailable.';
  return 'The Attachment could not be uploaded. Try again.';
};

const validateValues = (
  values: FormValues,
  categories: ReferenceItem[],
  relatedSystems: ReferenceItem[],
) => {
  const errors: FieldErrors = {};
  const categoryId = Number(values.categoryId);
  const relatedSystemId = Number(values.relatedSystemId);
  if (!categories.some((item) => item.id === categoryId)) {
    errors.categoryId = 'Select an active Category.';
  }
  if (!relatedSystems.some((item) => item.id === relatedSystemId)) {
    errors.relatedSystemId = 'Select an active Related System.';
  }
  if (!priorities.includes(values.requestedPriority as Priority)) {
    errors.requestedPriority = 'Select LOW, MEDIUM, or HIGH.';
  }
  const summary = normalizeSummary(values.summary);
  if (summary.length < 5 || summary.length > 120) {
    errors.summary = 'Summary must contain 5 to 120 characters.';
  }
  const description = normalizeDescription(values.description);
  if (description.length < 10 || description.length > 2_000) {
    errors.description = 'Description must contain 10 to 2000 characters.';
  }
  return errors;
};

export default function CreateTicket({ requester }: { requester: Requester }) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<ReferenceItem[]>([]);
  const [referenceState, setReferenceState] = useState<
    'loading' | 'ready' | 'failure'
  >('loading');
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<TicketData | null>(null);
  const [attachmentUploads, setAttachmentUploads] = useState<Record<string, AttachmentUpload>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const uploadedTicketRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    setReferenceState('loading');
    setCategories([]);
    setRelatedSystems([]);
    Promise.all([
      loadReferenceItems('/api/categories'),
      loadReferenceItems('/api/related-systems'),
    ])
      .then(([categoryItems, systemItems]) => {
        if (!active) return;
        setCategories(categoryItems);
        setRelatedSystems(systemItems);
        setReferenceState('ready');
      })
      .catch(() => {
        if (active) setReferenceState('failure');
      });
    return () => {
      active = false;
    };
  }, [referenceAttempt]);

  useEffect(() => {
    if (createdTicket) successHeadingRef.current?.focus();
  }, [createdTicket]);

  const uploadAttachment = async (ticket: TicketData, selected: SelectedFile) => {
    setAttachmentUploads((current) => ({ ...current, [selected.id]: { status: 'uploading', message: 'Uploading…' } }));
    const form = new FormData();
    form.append('file', selected.file);
    try {
      const response = await fetch(`${apiUrl()}/api/tickets/${ticket.id}/attachments`, { method: 'POST', headers: { 'X-Requester-Id': requester.id }, body: form });
      if (!response.ok) {
        const message = attachmentFailureMessage(await readAttachmentErrorCode(response));
        setAttachmentUploads((current) => ({ ...current, [selected.id]: { status: 'failed', message } }));
        return;
      }
      const body = await response.json() as { data?: { id?: unknown; originalName?: unknown } };
      if (typeof body.data?.id !== 'string' || typeof body.data.originalName !== 'string') {
        throw new Error('Invalid Attachment response.');
      }
      setAttachmentUploads((current) => ({ ...current, [selected.id]: { status: 'uploaded', message: 'Uploaded' } }));
    } catch {
      setAttachmentUploads((current) => ({ ...current, [selected.id]: { status: 'failed', message: 'The Attachment could not be uploaded. Try again.' } }));
    }
  };

  useEffect(() => {
    if (!createdTicket || selectedFiles.length === 0 || uploadedTicketRef.current === createdTicket.id) return;
    uploadedTicketRef.current = createdTicket.id;
    void (async () => { for (const selected of selectedFiles) await uploadAttachment(createdTicket, selected); })();
  }, [createdTicket, selectedFiles]);

  const clearPendingSubmission = () =>
    window.sessionStorage.removeItem(CREATE_TICKET_PENDING_KEY);

  const updateValue = (field: keyof FormValues, value: string) => {
    if (readPendingSubmission()) clearPendingSubmission();
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  };

  const clearForm = () => {
    clearPendingSubmission();
    setValues(initialValues);
    setSelectedFiles([]);
    setFieldErrors({});
    setSubmitError(null);
    setCreatedTicket(null);
    setAttachmentUploads({});
    uploadedTicketRef.current = null;
  };

  const chooseFiles = (files: File[]) => {
    const fileError = validateFiles(files);
    setSelectedFiles(files.map((file) => ({ id: createUuid(), file })));
    setFieldErrors((current) => ({
      ...current,
      attachments: fileError ?? undefined,
    }));
  };

  const clearFiles = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedFiles([]);
    setFieldErrors((current) => ({ ...current, attachments: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || referenceState !== 'ready') return;

    const errors = validateValues(values, categories, relatedSystems);
    const fileError = validateFiles(selectedFiles.map(({ file }) => file));
    if (fileError) errors.attachments = fileError;
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) {
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    const canonical = canonicalPayload(requester.id, values);
    const existing = readPendingSubmission();
    const pending =
      existing?.canonicalPayload === canonical
        ? existing
        : { idempotencyKey: createUuid(), canonicalPayload: canonical };
    window.sessionStorage.setItem(
      CREATE_TICKET_PENDING_KEY,
      JSON.stringify(pending),
    );

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl()}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requester-Id': requester.id,
          'Idempotency-Key': pending.idempotencyKey,
        },
        body: JSON.stringify(normalizeValues(values)),
      });
      const body = (await response.json().catch(() => null)) as
        | { data?: TicketData; error?: { fieldErrors?: FieldErrors } }
        | null;

      if (!response.ok || !body?.data) {
        if (response.status < 500) clearPendingSubmission();
        if (body?.error?.fieldErrors) setFieldErrors(body.error.fieldErrors);
        setSubmitError('Ticket could not be created. Try again.');
        return;
      }

      clearPendingSubmission();
      setCreatedTicket(body.data);
    } catch {
      setSubmitError('Ticket could not be created. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdTicket) {
    return (
      <main className="workspace create-ticket-page">
        <section className="ticket-success" aria-labelledby="ticket-success-title">
          <p className="eyebrow">Request saved</p>
          <h1 id="ticket-success-title" ref={successHeadingRef} tabIndex={-1}>
            Ticket created
          </h1>
          <p className="ticket-number">{createdTicket.ticketNumber}</p>
          <dl className="saved-ticket-grid">
            <div><dt>Requester</dt><dd>{createdTicket.requester.name}</dd></div>
            <div><dt>Ticket Date</dt><dd>{new Date(createdTicket.ticketDate).toLocaleString()}</dd></div>
            <div><dt>Category</dt><dd>{createdTicket.category.name}</dd></div>
            <div><dt>Related System</dt><dd>{createdTicket.relatedSystem.name}</dd></div>
            <div><dt>Requested Priority</dt><dd>{createdTicket.requestedPriority}</dd></div>
            <div><dt>IT Priority</dt><dd>Not assigned</dd></div>
          </dl>
          <h2>{createdTicket.summary}</h2>
          <p>{createdTicket.description}</p>
          {selectedFiles.length > 0 && <section className="attachment-note" aria-labelledby="post-create-attachments"><h2 id="post-create-attachments">Attachments</h2><ul className="post-create-uploads" aria-live="polite">{selectedFiles.map((selected) => { const upload = attachmentUploads[selected.id] ?? { status: 'uploading', message: 'Uploading…' }; return <li key={selected.id}><strong>{selected.file.name}</strong><span>{upload.message}</span>{upload.status === 'failed' && <div className="attachment-actions"><button type="button" className="btn btn-outline-success" onClick={() => void uploadAttachment(createdTicket, selected)}>Retry Upload</button><button type="button" className="btn btn-outline-danger" onClick={() => { setSelectedFiles((current) => current.filter((item) => item.id !== selected.id)); setAttachmentUploads((current) => { const next = { ...current }; delete next[selected.id]; return next; }); }}>Remove selection</button></div>}</li>; })}</ul></section>}
          <div className="form-actions">
            <a className="btn btn-success" href={`/tickets/${createdTicket.id}`}>
              View Ticket
            </a>
            <button className="btn btn-outline-success" type="button" onClick={clearForm}>
              Create Another
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace create-ticket-page">
      <p className="eyebrow">Requester workspace</p>
      <h1>Create Ticket</h1>
      <p className="text-secondary">
        Submit a new IT request as <strong>{requester.name}</strong>. This remains a
        testing context, not authentication.
      </p>

      <form className="ticket-form" onSubmit={submit} noValidate>
        <section className="ticket-card" aria-labelledby="ticket-info-heading">
          <h2 id="ticket-info-heading">Ticket information</h2>
          <dl className="readonly-grid">
            <div><dt>Ticket Number</dt><dd>Generated after submission</dd></div>
            <div><dt>Ticket Date</dt><dd>Set on submission</dd></div>
            <div><dt>Requester</dt><dd>{requester.name}</dd></div>
            <div><dt>IT Priority</dt><dd>Not assigned</dd></div>
          </dl>
        </section>

        <section className="ticket-card" aria-labelledby="classification-heading">
          <h2 id="classification-heading">Classification</h2>
          {referenceState === 'loading' && (
            <p className="reference-state" role="status">Loading reference data...</p>
          )}
          {referenceState === 'failure' && (
            <div className="alert alert-danger reference-state" role="alert">
              <p>Reference data could not be loaded. Try again.</p>
              <button
                className="btn btn-outline-danger"
                type="button"
                onClick={() => setReferenceAttempt((value) => value + 1)}
              >
                Retry reference data
              </button>
            </div>
          )}

          <div className="classification-grid">
            <div>
              <label htmlFor="ticket-category">
                Category <span className="required-indicator" aria-hidden="true">*</span>
                <span className="visually-hidden"> required</span>
              </label>
              <select
                id="ticket-category"
                required
                value={values.categoryId}
                disabled={referenceState !== 'ready' || submitting}
                aria-invalid={Boolean(fieldErrors.categoryId)}
                aria-describedby={fieldErrors.categoryId ? 'ticket-category-error' : undefined}
                onChange={(event) => updateValue('categoryId', event.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {fieldErrors.categoryId && <p id="ticket-category-error" className="field-error">{fieldErrors.categoryId}</p>}
            </div>
            <div>
              <label htmlFor="ticket-system">
                Related System <span className="required-indicator" aria-hidden="true">*</span>
                <span className="visually-hidden"> required</span>
              </label>
              <select
                id="ticket-system"
                required
                value={values.relatedSystemId}
                disabled={referenceState !== 'ready' || submitting}
                aria-invalid={Boolean(fieldErrors.relatedSystemId)}
                aria-describedby={fieldErrors.relatedSystemId ? 'ticket-system-error' : undefined}
                onChange={(event) => updateValue('relatedSystemId', event.target.value)}
              >
                <option value="">Select Related System</option>
                {relatedSystems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {fieldErrors.relatedSystemId && <p id="ticket-system-error" className="field-error">{fieldErrors.relatedSystemId}</p>}
            </div>
            <div>
              <label htmlFor="ticket-priority">
                Requested Priority <span className="required-indicator" aria-hidden="true">*</span>
                <span className="visually-hidden"> required</span>
              </label>
              <select
                id="ticket-priority"
                required
                value={values.requestedPriority}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.requestedPriority)}
                aria-describedby={fieldErrors.requestedPriority ? 'ticket-priority-error' : undefined}
                onChange={(event) => updateValue('requestedPriority', event.target.value)}
              >
                <option value="">Select Priority</option>
                {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              {fieldErrors.requestedPriority && <p id="ticket-priority-error" className="field-error">{fieldErrors.requestedPriority}</p>}
            </div>
          </div>

          <label htmlFor="ticket-summary">
            Summary <span className="required-indicator" aria-hidden="true">*</span>
            <span className="visually-hidden"> required</span>
          </label>
          <input
            id="ticket-summary"
            type="text"
            required
            maxLength={120}
            value={values.summary}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.summary)}
            aria-describedby={fieldErrors.summary ? 'ticket-summary-error' : 'ticket-summary-help'}
            onChange={(event) => updateValue('summary', event.target.value)}
          />
          <p id="ticket-summary-help" className="field-help">5 to 120 characters</p>
          {fieldErrors.summary && <p id="ticket-summary-error" className="field-error">{fieldErrors.summary}</p>}

          <label htmlFor="ticket-description">
            Description <span className="required-indicator" aria-hidden="true">*</span>
            <span className="visually-hidden"> required</span>
          </label>
          <textarea
            id="ticket-description"
            required
            rows={6}
            maxLength={2_000}
            value={values.description}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'ticket-description-error' : 'ticket-description-help'}
            onChange={(event) => updateValue('description', event.target.value)}
          />
          <p id="ticket-description-help" className="field-help">10 to 2000 characters</p>
          {fieldErrors.description && <p id="ticket-description-error" className="field-error">{fieldErrors.description}</p>}
        </section>

        <section className="ticket-card" aria-labelledby="attachment-heading">
          <h2 id="attachment-heading">Attachments</h2>
          <p className="field-help">Optional: JPG, PNG, WEBP, or PDF; maximum 5 MiB each and five files.</p>
          <p className="attachment-count" aria-live="polite">
            Selected: {selectedFiles.length} / 5
          </p>
          <label className="file-label" htmlFor="ticket-attachments">Attachments</label>
          <input
            ref={fileInputRef}
            id="ticket-attachments"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.attachments)}
            aria-describedby={fieldErrors.attachments ? 'ticket-attachments-error' : undefined}
            onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))}
          />
          {fieldErrors.attachments && <p id="ticket-attachments-error" className="field-error">{fieldErrors.attachments}</p>}
          {selectedFiles.length > 0 && (
            <>
              <ul className="selected-files">
                {selectedFiles.map(({ id, file }) => <li key={id}>{file.name}</li>)}
              </ul>
              <button
                className="btn btn-outline-danger clear-files"
                type="button"
                disabled={submitting}
                onClick={clearFiles}
              >
                Clear selected files
              </button>
            </>
          )}
        </section>

        {Object.keys(fieldErrors).length > 0 && (
          <div className="alert alert-danger" role="alert" tabIndex={-1} ref={errorSummaryRef}>
            Please correct the highlighted fields before submitting.
          </div>
        )}
        {submitError && <div className="alert alert-danger" role="alert">{submitError}</div>}

        <div className="form-actions">
          <button className="btn btn-outline-success" type="button" disabled={submitting} onClick={clearForm}>
            Clear form
          </button>
          <button className="btn btn-success" type="submit" disabled={referenceState !== 'ready' || submitting}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </main>
  );
}
