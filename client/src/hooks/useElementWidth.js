import { useEffect, useState } from 'react';

// Width of an element in pixels, updated when it resizes (rotating a phone,
// resizing a window). Charts draw at the real size so text never stretches.
// Usage: const [ref, width] = useElementWidth(); <div ref={ref}>
export function useElementWidth() {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, width];
}
