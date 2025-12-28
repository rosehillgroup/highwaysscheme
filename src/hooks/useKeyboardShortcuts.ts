'use client';

import { useEffect, useCallback } from 'react';
import { useSchemeStore } from '@/stores/schemeStore';

export function useKeyboardShortcuts() {
  const undo = useSchemeStore((state) => state.undo);
  const redo = useSchemeStore((state) => state.redo);
  const canUndo = useSchemeStore((state) => state.canUndo);
  const canRedo = useSchemeStore((state) => state.canRedo);
  const selectedElementId = useSchemeStore((state) => state.selectedElementId);
  const removeElement = useSchemeStore((state) => state.removeElement);
  const selectElement = useSchemeStore((state) => state.selectElement);
  const saveToBrowser = useSchemeStore((state) => state.saveToBrowser);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((modKey && e.key === 'z' && e.shiftKey) || (modKey && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Save: Ctrl/Cmd + S
      if (modKey && e.key === 's') {
        e.preventDefault();
        saveToBrowser();
        return;
      }

      // Delete selected element: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        removeElement(selectedElementId);
        return;
      }

      // Deselect: Escape
      if (e.key === 'Escape') {
        selectElement(null);
        return;
      }
    },
    [undo, redo, canUndo, canRedo, selectedElementId, removeElement, selectElement, saveToBrowser]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
