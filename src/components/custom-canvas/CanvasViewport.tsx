'use client';

import { useRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { CanvasViewport as ViewportType, CanvasPoint } from '@/types/canvas';

interface CanvasViewportProps {
  viewport: ViewportType;
  onPanChange: (pan: CanvasPoint) => void;
  onZoomChange: (zoom: number) => void;
  children: ReactNode;
}

/**
 * CanvasViewport - Handles pan and zoom for the canvas
 *
 * Features:
 * - Mouse wheel zoom (centered on cursor)
 * - Middle-click or Space+drag to pan
 * - Pinch-to-zoom on trackpad
 * - Keyboard shortcuts (+/- for zoom, arrow keys for pan)
 */
export default function CanvasViewport({
  viewport,
  onPanChange,
  onZoomChange,
  children,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle keyboard events for space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
      // Zoom with +/-
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        onZoomChange(viewport.zoom * 1.2);
      }
      if (e.key === '-') {
        e.preventDefault();
        onZoomChange(viewport.zoom / 1.2);
      }
      // Reset zoom with 0
      if (e.key === '0') {
        e.preventDefault();
        onZoomChange(1.0);
        onPanChange({ x: 0, y: 0 });
      }
      // Pan with arrow keys
      const panStep = 10 / (100 * viewport.zoom); // 10 pixels worth of metres
      if (e.key === 'ArrowLeft') {
        onPanChange({ x: viewport.pan.x - panStep, y: viewport.pan.y });
      }
      if (e.key === 'ArrowRight') {
        onPanChange({ x: viewport.pan.x + panStep, y: viewport.pan.y });
      }
      if (e.key === 'ArrowUp') {
        onPanChange({ x: viewport.pan.x, y: viewport.pan.y - panStep });
      }
      if (e.key === 'ArrowDown') {
        onPanChange({ x: viewport.pan.x, y: viewport.pan.y + panStep });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewport, onZoomChange, onPanChange]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate mouse position in canvas coordinates
      const pixelsPerMetre = 100 * viewport.zoom;
      const mouseCanvasX = mouseX / pixelsPerMetre + viewport.pan.x;
      const mouseCanvasY = mouseY / pixelsPerMetre + viewport.pan.y;

      // Calculate new zoom
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * zoomDelta));

      // Calculate new pan to keep mouse position fixed
      const newPixelsPerMetre = 100 * newZoom;
      const newPanX = mouseCanvasX - mouseX / newPixelsPerMetre;
      const newPanY = mouseCanvasY - mouseY / newPixelsPerMetre;

      onZoomChange(newZoom);
      onPanChange({ x: newPanX, y: newPanY });
    },
    [viewport, onZoomChange, onPanChange]
  );

  // Handle pan start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button or space + left click
      if (e.button === 1 || (spacePressed && e.button === 0)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [spacePressed]
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || !panStart) return;

      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      const pixelsPerMetre = 100 * viewport.zoom;
      onPanChange({
        x: viewport.pan.x - deltaX / pixelsPerMetre,
        y: viewport.pan.y - deltaY / pixelsPerMetre,
      });

      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart, viewport, onPanChange]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
  }, [isPanning]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-slate-50"
      style={{ cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : 'default' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        width={containerSize.width}
        height={containerSize.height}
        className="block"
      >
        {/* Pass container size to children via context or props */}
        {children}
      </svg>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-sm font-medium text-slate-700">
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-xs font-mono text-slate-600">
        Pan: ({viewport.pan.x.toFixed(1)}, {viewport.pan.y.toFixed(1)}) m
      </div>
    </div>
  );
}

export type { CanvasViewportProps };
