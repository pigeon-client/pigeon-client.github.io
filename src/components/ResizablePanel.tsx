import { useState, useRef, useEffect, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface ResizablePanelProps {
  orientation: 'vertical' | 'horizontal';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children: [ReactNode, ReactNode];
  onOrientationChange: (orientation: 'vertical' | 'horizontal') => void;
  onSizeChange?: (size: number) => void;
}

export function ResizablePanel({
  orientation,
  defaultSize = 300,
  minSize = 100,
  maxSize = 800,
  children,
  onOrientationChange,
  onSizeChange,
}: ResizablePanelProps) {
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem('pigeon-response-size');
    return saved ? parseInt(saved, 10) : defaultSize;
  });
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = orientation === 'vertical' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;
      if (orientation === 'vertical') {
        newSize = Math.max(minSize, Math.min(maxSize, rect.bottom - e.clientY));
      } else {
        newSize = Math.max(minSize, Math.min(maxSize, e.clientX - rect.left));
      }
      setSize(newSize);
      localStorage.setItem('pigeon-response-size', String(newSize));
      onSizeChange?.(newSize);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [orientation, minSize, maxSize, onSizeChange]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden`}
    >
      {/* First panel (request) */}
      <div className={orientation === 'horizontal' ? 'flex-1 overflow-hidden min-w-0' : 'flex-1 overflow-hidden min-h-0'}>
        {children[0]}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`group relative ${orientation === 'vertical' ? 'h-2 cursor-ns-resize' : 'w-2 cursor-ew-resize'} shrink-0 z-10 flex items-center justify-center`}
      >
        <div className={`bg-border-primary group-hover:bg-accent-orange/60 transition-colors duration-100 rounded-full
          ${orientation === 'vertical' ? 'w-full h-0.5' : 'w-0.5 h-full'}`} />
        {/* Orientation toggle */}
        <button
          onClick={() => {
            const newOrientation = orientation === 'vertical' ? 'horizontal' : 'vertical';
            onOrientationChange(newOrientation);
            localStorage.setItem('pigeon-layout-orientation', newOrientation);
          }}
          className="absolute opacity-0 group-hover:opacity-100 p-0.5 rounded bg-bg-secondary border border-border-primary
            text-text-tertiary hover:text-text-primary transition-all duration-150 z-20 cursor-pointer"
          title="Toggle layout orientation"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Second panel (response) */}
      <div
        className="overflow-hidden shrink-0 bg-bg-primary"
        style={orientation === 'vertical'
          ? { height: size }
          : { width: size }
        }
      >
        {children[1]}
      </div>
    </div>
  );
}
