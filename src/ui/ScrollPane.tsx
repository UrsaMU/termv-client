import { useLayoutEffect, useRef, type ReactNode, type UIEvent } from 'react';
import { pinToTail } from '../protocol/stick-scroll';

export function ScrollPane({
  tail = false,
  pinKey,
  className,
  children,
}: {
  tail?: boolean;
  /** Last feed/look id — street pins when a thing look lands. */
  pinKey?: string | number;
  className?: string;
  children: ReactNode;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const stick = useRef(tail);
  const frame = useRef(0);

  useLayoutEffect(() => {
    const el = pane.current;
    if (!el) return;

    const snap = () => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    };

    const pin = () => {
      if (tail) stick.current = true;
      snap();
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(snap);
    };

    pin();

    const watch = new ResizeObserver(pin);
    watch.observe(el);
    for (const child of el.children) watch.observe(child);

    const mutations = new MutationObserver(() => {
      for (const child of el.children) watch.observe(child);
      pin();
    });
    mutations.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(frame.current);
      watch.disconnect();
      mutations.disconnect();
    };
  }, [tail, pinKey]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    stick.current = pinToTail(tail, el.scrollTop, el.scrollHeight, el.clientHeight);
  }

  return (
    <div
      className={className ? `scroll ${className}` : 'scroll'}
      ref={pane}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}
