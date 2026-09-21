import { useCallback, useEffect, useRef, useState } from 'react';

const position = () => Number.isSafeInteger(history.state?.toktickitPosition) ? history.state.toktickitPosition as number : null;

// Only the router owns history positions. A blocked Back/Forward is restored
// before asking, then replayed on confirmation, preserving the forward stack.
export function useAppNavigation() {
  const [path, setPath] = useState(location.pathname);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const dirty = useRef(false);
  const current = useRef(position() ?? 0);
  const traversal = useRef<'restore' | 'replay' | null>(null);
  const afterTraversal = useRef<(() => void) | null>(null);
  const setDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const push = useCallback((next: string, intended: string | null = null) => {
    current.current += 1;
    history.pushState({ toktickitPosition: current.current, ...(intended ? { toktickitReturnTo: intended } : {}) }, '', next);
    setPath(next);
  }, []);
  const forceNavigate = useCallback((next: string, intended: string | null = null) => {
    // Authentication changes cannot be vetoed by an unsaved form.
    dirty.current = false; setPending(null);
    const go = () => push(next, intended);
    if (traversal.current) afterTraversal.current = go;
    else go();
  }, [push]);
  const navigate = useCallback((next: string) => {
    if (next === location.pathname || traversal.current) return;
    const go = () => push(next);
    if (dirty.current) setPending(() => go);
    else go();
  }, [push]);
  useEffect(() => {
    history.replaceState({ ...history.state, toktickitPosition: current.current }, '', location.href);
    const pop = () => {
      const next = position();
      if (traversal.current === 'restore') {
        if (next !== null && next !== current.current) { history.go(current.current - next); return; }
        traversal.current = null;
        const done = afterTraversal.current; afterTraversal.current = null; done?.();
        return;
      }
      if (traversal.current === 'replay') {
        traversal.current = null; current.current = next ?? current.current;
        const done = afterTraversal.current; afterTraversal.current = null;
        if (done) done(); else setPath(location.pathname);
        return;
      }
      if (dirty.current && next !== null && next !== current.current) {
        const delta = next - current.current;
        traversal.current = 'restore';
        afterTraversal.current = () => setPending(() => () => { traversal.current = 'replay'; history.go(delta); });
        history.go(-delta);
        return;
      }
      current.current = next ?? current.current;
      setPath(location.pathname);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const cancel = () => setPending(null);
  const confirm = () => { const go = pending; setPending(null); dirty.current = false; go?.(); };
  return { path, navigate, forceNavigate, setDirty, blocked: !!pending, cancel, confirm };
}
