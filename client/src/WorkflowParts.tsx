import { KeyboardEvent, ReactNode, useEffect, useRef } from 'react';
import { label } from './workflow-api';
export function Badge({ value }: { value: string }) { return <span className={`wf-badge wf-${value.toLowerCase()}`}>{label(value)}</span>; }
export function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
    .filter(node => !node.matches(':disabled, [tabindex="-1"]') && node.getClientRects().length > 0);
  if (!items.length) { event.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (value: number) => void }) {
  return <nav className="wf-pagination" aria-label="Pagination"><button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, totalPages)}</span><button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button></nav>;
}
export function Confirmation({ title, children, onConfirm, onCancel }: { title: string; children: ReactNode; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => { node?.close(); queueMicrotask(() => { if (!node?.open) opener.current?.focus(); }); };
  }, []);
  return <dialog ref={ref} className="wf-dialog" aria-labelledby="wf-confirm-title" onKeyDown={keepDialogFocus} onCancel={onCancel}><h2 id="wf-confirm-title">{title}</h2><p>{children}</p><div className="wf-actions"><button autoFocus onClick={onCancel}>Cancel</button><button className="wf-primary" onClick={onConfirm}>Confirm</button></div></dialog>;
}
