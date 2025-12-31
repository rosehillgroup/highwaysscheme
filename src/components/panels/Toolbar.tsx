'use client';

import { useState, useEffect, useRef } from 'react';
import { useSchemeStore, getStoredSchemes, deleteStoredScheme } from '@/stores/schemeStore';

export default function Toolbar() {
  const [showSavedSchemes, setShowSavedSchemes] = useState(false);
  const [savedSchemes, setSavedSchemes] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDrawingCorridor = useSchemeStore((state) => state.isDrawingCorridor);
  const setIsDrawingCorridor = useSchemeStore((state) => state.setIsDrawingCorridor);
  const saveToBrowser = useSchemeStore((state) => state.saveToBrowser);
  const loadFromBrowser = useSchemeStore((state) => state.loadFromBrowser);
  const exportJSON = useSchemeStore((state) => state.exportJSON);
  const newScheme = useSchemeStore((state) => state.newScheme);
  const name = useSchemeStore((state) => state.name);
  const currentSchemeId = useSchemeStore((state) => state.id);
  const undo = useSchemeStore((state) => state.undo);
  const redo = useSchemeStore((state) => state.redo);
  const canUndo = useSchemeStore((state) => state.canUndo);
  const canRedo = useSchemeStore((state) => state.canRedo);

  // Load saved schemes when dropdown opens
  useEffect(() => {
    if (showSavedSchemes) {
      setSavedSchemes(getStoredSchemes());
    }
  }, [showSavedSchemes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSavedSchemes(false);
      }
    };

    if (showSavedSchemes) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSavedSchemes]);

  const handleLoadScheme = (id: string) => {
    loadFromBrowser(id);
    setShowSavedSchemes(false);
  };

  const handleDeleteScheme = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this saved scheme?')) {
      deleteStoredScheme(id);
      setSavedSchemes(getStoredSchemes());
    }
  };

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      useSchemeStore.getState().importJSON(text);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Undo/Redo */}
      <div className="bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1 w-fit">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded transition-colors ${
            canUndo
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded transition-colors ${
            canRedo
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Drawing Tools */}
      <div className="bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1 w-fit">
        <button
          onClick={() => setIsDrawingCorridor(!isDrawingCorridor)}
          className={`p-2 rounded transition-colors ${
            isDrawingCorridor
              ? 'bg-[#FF6B35] text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title={isDrawingCorridor ? 'Cancel drawing' : 'Draw corridor'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* File Operations */}
      <div className="bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1 w-fit relative" ref={dropdownRef}>
        <button
          onClick={newScheme}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="New scheme"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          onClick={saveToBrowser}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Save to browser"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </button>

        <button
          onClick={() => setShowSavedSchemes(!showSavedSchemes)}
          className={`p-2 rounded transition-colors ${
            showSavedSchemes ? 'bg-[#FF6B35] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Load saved scheme"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>

        {/* Saved Schemes Dropdown */}
        {showSavedSchemes && (
          <div className="absolute right-full mr-2 top-0 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Saved Schemes
              </h3>
            </div>
            {savedSchemes.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No saved schemes
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {savedSchemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    onClick={() => handleLoadScheme(scheme.id)}
                    className={`px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${
                      scheme.id === currentSchemeId ? 'bg-[#FFF0EB]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {scheme.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(scheme.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {scheme.id !== currentSchemeId && (
                      <button
                        onClick={(e) => handleDeleteScheme(e, scheme.id)}
                        className="ml-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete scheme"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-px bg-slate-200 my-1" />

        <button
          onClick={handleImport}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Import scheme from file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>

        <button
          onClick={handleExport}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Export scheme to file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
