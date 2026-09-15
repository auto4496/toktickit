import { ReactNode, useEffect, useRef } from 'react';
import { label } from './workflow-api';
export function Badge({ value }: { value: string }) { return <span className={`wf-badge wf-${value.toLowerCase()}`}>{label(value)}</span>; }
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (value: number) => void }) {
  return <nav className="wf-pagination" aria-label="Pagination"><button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, totalPages)}</span><button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button></nav>;
}
export function Confirmation({ title, children, onConfirm, onCancel }: { title: string; children: ReactNode; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} className="wf-dialog" aria-labelledby="wf-confirm-title" onCancel={onCancel}><h2 id="wf-confirm-title">{title}</h2><p>{children}</p><div className="wf-actions"><button autoFocus onClick={onCancel}>Cancel</button><button className="wf-primary" onClick={onConfirm}>Confirm</button></div></dialog>;
}
