/**
 * Sketch Mode Toolbar
 *
 * Controls for the isometric Sketch Mode view.
 */

import { useSketchStore } from '@/stores/sketchStore';
import styles from './SketchMode.module.css';

// ============================================================================
// Icons (inline SVG for simplicity)
// ============================================================================

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const MagnetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 15a6 6 0 1 0 12 0v-3H6v3z" />
    <path d="M6 6h3v6H6zM15 6h3v6h-3z" />
  </svg>
);

const ZoomInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ResetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const LabelIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export function SketchToolbar() {
  const {
    zoom,
    setZoom,
    resetCamera,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    showChainageLabels,
    toggleChainageLabels,
  } = useSketchStore();

  const handleZoomIn = () => {
    setZoom(Math.min(3, zoom + 0.25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(0.25, zoom - 0.25));
  };

  return (
    <div className={styles.toolbar}>
      {/* Zoom controls */}
      <div className={styles.toolbarGroup}>
        <button
          className={styles.toolbarButton}
          onClick={handleZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOutIcon />
        </button>
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          className={styles.toolbarButton}
          onClick={handleZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomInIcon />
        </button>
        <button
          className={styles.toolbarButton}
          onClick={resetCamera}
          title="Reset view"
          aria-label="Reset view"
        >
          <ResetIcon />
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      {/* View options */}
      <div className={styles.toolbarGroup}>
        <button
          className={`${styles.toolbarButton} ${showGrid ? styles.active : ''}`}
          onClick={toggleGrid}
          title="Toggle grid"
          aria-label="Toggle grid"
          aria-pressed={showGrid}
        >
          <GridIcon />
        </button>
        <button
          className={`${styles.toolbarButton} ${snapToGrid ? styles.active : ''}`}
          onClick={toggleSnapToGrid}
          title="Snap to grid"
          aria-label="Snap to grid"
          aria-pressed={snapToGrid}
        >
          <MagnetIcon />
        </button>
        <button
          className={`${styles.toolbarButton} ${showChainageLabels ? styles.active : ''}`}
          onClick={toggleChainageLabels}
          title="Toggle chainage labels"
          aria-label="Toggle chainage labels"
          aria-pressed={showChainageLabels}
        >
          <LabelIcon />
        </button>
      </div>
    </div>
  );
}

export default SketchToolbar;
