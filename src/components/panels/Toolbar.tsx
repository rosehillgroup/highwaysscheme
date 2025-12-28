'use client';

import { useSchemeStore } from '@/stores/schemeStore';

export default function Toolbar() {
  const viewMode = useSchemeStore((state) => state.viewMode);
  const setViewMode = useSchemeStore((state) => state.setViewMode);
  const isDrawingCorridor = useSchemeStore((state) => state.isDrawingCorridor);
  const setIsDrawingCorridor = useSchemeStore((state) => state.setIsDrawingCorridor);
  const corridor = useSchemeStore((state) => state.corridor);
  const saveToBrowser = useSchemeStore((state) => state.saveToBrowser);
  const exportJSON = useSchemeStore((state) => state.exportJSON);
  const newScheme = useSchemeStore((state) => state.newScheme);
  const name = useSchemeStore((state) => state.name);

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
    <div className="flex flex-col gap-2">
      {/* View Mode Toggle */}
      {corridor && (
        <div className="bg-white rounded-lg shadow-lg p-1 flex gap-1">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('section')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'section'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Section
          </button>
        </div>
      )}

      {/* Drawing Tools */}
      <div className="bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1">
        <button
          onClick={() => setIsDrawingCorridor(!isDrawingCorridor)}
          className={`p-2 rounded transition-colors ${
            isDrawingCorridor
              ? 'bg-blue-600 text-white'
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
      <div className="bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1">
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
          onClick={handleImport}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Import scheme"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>

        <button
          onClick={handleExport}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Export scheme"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
