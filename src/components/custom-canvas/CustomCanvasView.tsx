'use client';

import React, { useRef, useCallback, useState, useEffect, ChangeEvent } from 'react';
import { useCanvasStore, screenToCanvas, type DragState } from '@/stores/canvasStore';
import CanvasViewport from './CanvasViewport';
import CanvasGrid from './CanvasGrid';
import { RoadsLayer, RoadDrawer } from './roads';
import { JunctionsLayer, JunctionPlacer } from './junctions';
import { MarkingsLayer, MarkingPlacer } from './markings';
import { SignageLayer, SignagePlacer } from './signage';
import { FurnitureLayer, FurniturePlacer } from './furniture';
import { ProductLayer, CanvasProductPlacer } from './products';
import type { CanvasPoint, DrawTool, BezierControlPoint, JunctionType, MarkingType, SignType, FurnitureType } from '@/types/canvas';
import markingsData from '@/data/markings.json';
import signageData from '@/data/signage.json';
import furnitureData from '@/data/furniture.json';
import productsData from '@/data/products.json';

/**
 * CustomCanvasView - Main container for the custom canvas mode
 *
 * This component provides:
 * - SVG canvas with pan/zoom via CanvasViewport
 * - Background grid
 * - Toolbar for drawing tools
 * - Road, junction, marking, and furniture rendering (to be added)
 */
export default function CustomCanvasView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [hoveredRoadId, setHoveredRoadId] = useState<string | null>(null);
  const [hoveredJunctionId, setHoveredJunctionId] = useState<string | null>(null);
  const [isDrawingRoad, setIsDrawingRoad] = useState(false);
  const [isPlacingJunction, setIsPlacingJunction] = useState(false);
  const [activeJunctionType, setActiveJunctionType] = useState<JunctionType | null>(null);
  const [isPlacingMarking, setIsPlacingMarking] = useState(false);
  const [activeMarkingType, setActiveMarkingType] = useState<MarkingType | null>(null);
  const [hoveredMarkingId, setHoveredMarkingId] = useState<string | null>(null);
  const [isPlacingSignage, setIsPlacingSignage] = useState(false);
  const [activeSignType, setActiveSignType] = useState<SignType | null>(null);
  const [hoveredSignId, setHoveredSignId] = useState<string | null>(null);
  const [isPlacingFurniture, setIsPlacingFurniture] = useState(false);
  const [activeFurnitureType, setActiveFurnitureType] = useState<FurnitureType | null>(null);
  const [hoveredFurnitureId, setHoveredFurnitureId] = useState<string | null>(null);
  const [isPlacingProduct, setIsPlacingProduct] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);

  // Store state
  const viewport = useCanvasStore((state) => state.viewport);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const gridSize = useCanvasStore((state) => state.gridSize);
  const snapToGrid = useCanvasStore((state) => state.snapToGrid);
  const roads = useCanvasStore((state) => state.roads);
  const roadOrder = useCanvasStore((state) => state.roadOrder);
  const junctions = useCanvasStore((state) => state.junctions);
  const markings = useCanvasStore((state) => state.markings);
  const signage = useCanvasStore((state) => state.signage);
  const furniture = useCanvasStore((state) => state.furniture);
  const products = useCanvasStore((state) => state.products);
  const selection = useCanvasStore((state) => state.selection);
  const toolOptions = useCanvasStore((state) => state.toolOptions);
  const setToolOptions = useCanvasStore((state) => state.setToolOptions);

  // Store actions
  const setPan = useCanvasStore((state) => state.setPan);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setSnapToGrid = useCanvasStore((state) => state.setSnapToGrid);
  const addRoad = useCanvasStore((state) => state.addRoad);
  const selectRoad = useCanvasStore((state) => state.selectRoad);
  const addJunction = useCanvasStore((state) => state.addJunction);
  const selectJunction = useCanvasStore((state) => state.selectJunction);
  const addMarking = useCanvasStore((state) => state.addMarking);
  const addSignage = useCanvasStore((state) => state.addSignage);
  const addFurniture = useCanvasStore((state) => state.addFurniture);
  const addProduct = useCanvasStore((state) => state.addProduct);
  const removeRoad = useCanvasStore((state) => state.removeRoad);
  const removeJunction = useCanvasStore((state) => state.removeJunction);
  const removeMarking = useCanvasStore((state) => state.removeMarking);
  const removeSignage = useCanvasStore((state) => state.removeSignage);
  const removeFurniture = useCanvasStore((state) => state.removeFurniture);
  const removeProduct = useCanvasStore((state) => state.removeProduct);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const canUndo = useCanvasStore((state) => state.canUndo);
  const canRedo = useCanvasStore((state) => state.canRedo);
  const exportCanvas = useCanvasStore((state) => state.exportCanvas);
  const importCanvas = useCanvasStore((state) => state.importCanvas);
  const dragState = useCanvasStore((state) => state.dragState);
  const startDrag = useCanvasStore((state) => state.startDrag);
  const updateDrag = useCanvasStore((state) => state.updateDrag);
  const endDrag = useCanvasStore((state) => state.endDrag);
  const cancelDrag = useCanvasStore((state) => state.cancelDrag);

  // Get selected IDs
  const selectedRoadId = selection.selectedRoadIds[0] || null;
  const selectedJunctionId = selection.selectedJunctionIds[0] || null;
  const selectedMarkingId = selection.selectedMarkingIds[0] || null;
  const selectedSignId = selection.selectedSignageIds[0] || null;
  const selectedFurnitureId = selection.selectedFurnitureIds[0] || null;
  const selectedProductIds = selection.selectedProductIds || [];

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y (or Cmd variants on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Delete/Backspace - only in select mode
      if (activeTool !== 'select') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        // Delete selected elements in priority order
        if (selectedRoadId) {
          removeRoad(selectedRoadId);
        } else if (selectedJunctionId) {
          removeJunction(selectedJunctionId);
        } else if (selectedMarkingId) {
          removeMarking(selectedMarkingId);
        } else if (selectedSignId) {
          removeSignage(selectedSignId);
        } else if (selectedFurnitureId) {
          removeFurniture(selectedFurnitureId);
        } else if (selectedProductIds.length > 0) {
          removeProduct(selectedProductIds[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTool,
    selectedRoadId,
    selectedJunctionId,
    selectedMarkingId,
    selectedSignId,
    selectedFurnitureId,
    selectedProductIds,
    removeRoad,
    removeJunction,
    removeMarking,
    removeSignage,
    removeFurniture,
    removeProduct,
    undo,
    redo,
    canUndo,
    canRedo,
  ]);

  // Start road drawing when road tool is selected
  useEffect(() => {
    if (activeTool === 'road') {
      setIsDrawingRoad(true);
      setIsPlacingJunction(false);
      clearSelection();
    } else {
      setIsDrawingRoad(false);
    }
  }, [activeTool, clearSelection]);

  // Start junction placement when junction tool is selected
  useEffect(() => {
    if (activeTool.startsWith('junction-')) {
      setIsPlacingJunction(true);
      setIsDrawingRoad(false);
      clearSelection();

      // Map tool ID to junction type
      const typeMap: Record<string, JunctionType> = {
        'junction-t': 't-junction',
        'junction-cross': 'crossroads',
        'junction-roundabout': 'roundabout',
      };
      setActiveJunctionType(typeMap[activeTool] || 't-junction');
    } else {
      setIsPlacingJunction(false);
      setActiveJunctionType(null);
    }
  }, [activeTool, clearSelection]);

  // Start marking placement when marking tool is selected
  useEffect(() => {
    if (activeTool === 'marking') {
      setIsPlacingMarking(true);
      setIsDrawingRoad(false);
      setIsPlacingJunction(false);
      setIsPlacingSignage(false);
      setIsPlacingFurniture(false);
      clearSelection();
      // Default to straight arrow if no marking type set
      if (!toolOptions.markingType) {
        setActiveMarkingType('arrow-straight');
      } else {
        setActiveMarkingType(toolOptions.markingType);
      }
    } else {
      setIsPlacingMarking(false);
      setActiveMarkingType(null);
    }
  }, [activeTool, toolOptions.markingType, clearSelection]);

  // Start signage placement when signage tool is selected
  useEffect(() => {
    if (activeTool === 'signage') {
      setIsPlacingSignage(true);
      setIsDrawingRoad(false);
      setIsPlacingJunction(false);
      setIsPlacingMarking(false);
      setIsPlacingFurniture(false);
      clearSelection();
      // Default to 30mph sign if no sign type set
      if (!toolOptions.signType) {
        setActiveSignType('speed-30');
      } else {
        setActiveSignType(toolOptions.signType);
      }
    } else {
      setIsPlacingSignage(false);
      setActiveSignType(null);
    }
  }, [activeTool, toolOptions.signType, clearSelection]);

  // Start furniture placement when furniture tool is selected
  useEffect(() => {
    if (activeTool === 'furniture') {
      setIsPlacingFurniture(true);
      setIsDrawingRoad(false);
      setIsPlacingJunction(false);
      setIsPlacingMarking(false);
      setIsPlacingSignage(false);
      setIsPlacingProduct(false);
      clearSelection();
      // Default to steel bollard if no furniture type set
      if (!toolOptions.furnitureType) {
        setActiveFurnitureType('bollard-steel-fixed');
      } else {
        setActiveFurnitureType(toolOptions.furnitureType);
      }
    } else {
      setIsPlacingFurniture(false);
      setActiveFurnitureType(null);
    }
  }, [activeTool, toolOptions.furnitureType, clearSelection]);

  // Start product placement when product tool is selected
  useEffect(() => {
    if (activeTool === 'product') {
      setIsPlacingProduct(true);
      setIsDrawingRoad(false);
      setIsPlacingJunction(false);
      setIsPlacingMarking(false);
      setIsPlacingSignage(false);
      setIsPlacingFurniture(false);
      clearSelection();
      // Default to first product if none set
      if (!toolOptions.productId) {
        const firstProduct = productsData.products[0];
        setActiveProductId(firstProduct?.id || null);
        setActiveVariantId(null);
      } else {
        setActiveProductId(toolOptions.productId);
        setActiveVariantId(toolOptions.variantId || null);
      }
    } else {
      setIsPlacingProduct(false);
      setActiveProductId(null);
      setActiveVariantId(null);
    }
  }, [activeTool, toolOptions.productId, toolOptions.variantId, clearSelection]);

  // Handle road drawing completion
  const handleRoadComplete = useCallback(
    (points: BezierControlPoint[], width: number) => {
      const roadId = addRoad({
        type: 'curve',
        points,
        width,
        lanes: { count: 1, widths: [width], directions: ['forward'] },
      });

      setIsDrawingRoad(false);
      setActiveTool('select');
      selectRoad(roadId);
    },
    [addRoad, setActiveTool, selectRoad]
  );

  // Handle road drawing cancellation
  const handleRoadCancel = useCallback(() => {
    setIsDrawingRoad(false);
    setActiveTool('select');
  }, [setActiveTool]);

  // Handle junction placement
  const handleJunctionPlace = useCallback(
    (position: CanvasPoint, rotation: number) => {
      if (!activeJunctionType) return;

      const junctionId = addJunction({
        type: activeJunctionType,
        position,
        rotation,
        armIds: [],
      });

      setIsPlacingJunction(false);
      setActiveTool('select');
      selectJunction(junctionId);
    },
    [activeJunctionType, addJunction, setActiveTool, selectJunction]
  );

  // Handle junction placement cancellation
  const handleJunctionCancel = useCallback(() => {
    setIsPlacingJunction(false);
    setActiveJunctionType(null);
    setActiveTool('select');
  }, [setActiveTool]);

  // Handle marking placement
  const handleMarkingPlace = useCallback(
    (roadId: string, chainage: number, offset: number, rotation: number) => {
      if (!activeMarkingType) return;

      addMarking({
        type: activeMarkingType,
        roadSegmentId: roadId,
        position: { s: chainage, t: offset },
        rotation,
        isProduct: true,
      });

      // Stay in marking mode for placing more markings
    },
    [activeMarkingType, addMarking]
  );

  // Handle marking placement cancellation
  const handleMarkingCancel = useCallback(() => {
    setIsPlacingMarking(false);
    setActiveMarkingType(null);
    setActiveTool('select');
  }, [setActiveTool]);

  // Handle signage placement
  const handleSignagePlace = useCallback(
    (position: CanvasPoint, rotation: number) => {
      if (!activeSignType) return;

      addSignage({
        signType: activeSignType,
        position,
        rotation,
      });

      // Stay in signage mode for placing more signs
    },
    [activeSignType, addSignage]
  );

  // Handle signage placement cancellation
  const handleSignageCancel = useCallback(() => {
    setIsPlacingSignage(false);
    setActiveSignType(null);
    setActiveTool('select');
  }, [setActiveTool]);

  // Handle furniture placement
  const handleFurniturePlace = useCallback(
    (position: CanvasPoint, rotation: number) => {
      if (!activeFurnitureType) return;

      // Get product ID from furniture data
      const furnitureDef = furnitureData.items.find((f) => f.id === activeFurnitureType);

      addFurniture({
        furnitureType: activeFurnitureType,
        position,
        rotation,
        productId: furnitureDef?.productId || activeFurnitureType,
      });

      // Stay in furniture mode for placing more items
    },
    [activeFurnitureType, addFurniture]
  );

  // Handle furniture placement cancellation
  const handleFurnitureCancel = useCallback(() => {
    setIsPlacingFurniture(false);
    setActiveFurnitureType(null);
    setActiveTool('select');
  }, [setActiveTool]);

  // Handle product placement
  const handleProductPlace = useCallback(
    (position: CanvasPoint, rotation: number) => {
      if (!activeProductId) return;

      // Get product definition to determine placement mode
      const productDef = productsData.products.find((p) => p.id === activeProductId);
      const placementMode = productDef?.type === 'linear' ? 'linear' : productDef?.type === 'area' ? 'area' : 'discrete';

      addProduct({
        productId: activeProductId,
        variantId: activeVariantId || undefined,
        position,
        rotation,
        placementMode,
        quantity: 1,
      });

      // Stay in product mode for placing more items
    },
    [activeProductId, activeVariantId, addProduct]
  );

  // Handle product placement cancellation
  const handleProductCancel = useCallback(() => {
    setIsPlacingProduct(false);
    setActiveProductId(null);
    setActiveVariantId(null);
    setActiveTool('select');
  }, [setActiveTool]);

  // Handle export to JSON file
  const handleExport = useCallback(() => {
    const data = exportCanvas();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-layout-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportCanvas]);

  // Handle import from JSON file
  const handleImport = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const success = importCanvas(data);
        if (!success) {
          alert('Failed to import canvas. The file may be in an unsupported format.');
        }
      } catch {
        alert('Failed to parse the file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [importCanvas]);

  // ======================================================================
  // Drag Handlers
  // ======================================================================

  // Handle drag start - called by renderer components when mousedown on selected element
  const handleDragStart = useCallback(
    (
      elementType: DragState['elementType'],
      elementId: string,
      startPosition: CanvasPoint,
      mouseEvent: React.MouseEvent
    ) => {
      if (activeTool !== 'select') return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseCanvasPos = screenToCanvas(
        mouseEvent.clientX,
        mouseEvent.clientY,
        viewport,
        rect
      );

      startDrag(elementType, elementId, startPosition, mouseCanvasPos);
    },
    [activeTool, viewport, startDrag]
  );

  // Handle mouse move during drag
  const handleDragMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseCanvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        viewport,
        rect
      );

      updateDrag(mouseCanvasPos);
    },
    [dragState.isDragging, viewport, updateDrag]
  );

  // Handle mouse up to end drag
  const handleDragMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      endDrag();
    }
  }, [dragState.isDragging, endDrag]);

  // Handle mouse leave to cancel drag
  const handleDragMouseLeave = useCallback(() => {
    if (dragState.isDragging) {
      cancelDrag();
    }
  }, [dragState.isDragging, cancelDrag]);

  // Specific drag handlers for each element type
  const handleJunctionDragStart = useCallback(
    (id: string, position: { x: number; y: number }, e: React.MouseEvent) => {
      handleDragStart('junction', id, position, e);
    },
    [handleDragStart]
  );

  const handleSignageDragStart = useCallback(
    (id: string, position: { x: number; y: number }, e: React.MouseEvent) => {
      handleDragStart('signage', id, position, e);
    },
    [handleDragStart]
  );

  const handleFurnitureDragStart = useCallback(
    (id: string, position: { x: number; y: number }, e: React.MouseEvent) => {
      handleDragStart('furniture', id, position, e);
    },
    [handleDragStart]
  );

  const handleProductDragStart = useCallback(
    (id: string, position: { x: number; y: number }, e: React.MouseEvent) => {
      handleDragStart('product', id, position, e);
    },
    [handleDragStart]
  );

  // Handle canvas click for selection (when in select mode)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      // Only handle clicks in select mode
      if (activeTool !== 'select') return;

      // Clear selection when clicking on empty canvas
      clearSelection();
    },
    [activeTool, clearSelection]
  );

  // Handle road selection
  const handleSelectRoad = useCallback(
    (id: string | null) => {
      if (activeTool === 'select') {
        selectRoad(id);
      }
    },
    [activeTool, selectRoad]
  );

  // Handle junction selection
  const handleSelectJunction = useCallback(
    (id: string | null) => {
      if (activeTool === 'select') {
        selectJunction(id);
      }
    },
    [activeTool, selectJunction]
  );

  // Handle marking selection
  const selectMarking = useCanvasStore((state) => state.selectMarking);
  const handleSelectMarking = useCallback(
    (id: string | null) => {
      if (activeTool === 'select') {
        selectMarking(id);
      }
    },
    [activeTool, selectMarking]
  );

  // Handle signage selection
  const selectSignage = useCanvasStore((state) => state.selectSignage);
  const handleSelectSign = useCallback(
    (id: string | null) => {
      if (activeTool === 'select') {
        selectSignage(id);
      }
    },
    [activeTool, selectSignage]
  );

  // Handle furniture selection
  const selectFurniture = useCanvasStore((state) => state.selectFurniture);
  const handleSelectFurniture = useCallback(
    (id: string | null) => {
      if (activeTool === 'select') {
        selectFurniture(id);
      }
    },
    [activeTool, selectFurniture]
  );

  // Handle product selection
  const selectProduct = useCanvasStore((state) => state.selectProduct);
  const handleSelectProduct = useCallback(
    (id: string) => {
      if (activeTool === 'select') {
        selectProduct(id);
      }
    },
    [activeTool, selectProduct]
  );

  // Tool definitions
  const tools: { id: DrawTool; label: string; icon: React.ReactElement }[] = [
    {
      id: 'select',
      label: 'Select',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      id: 'road',
      label: 'Draw Road',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      id: 'junction-t',
      label: 'T-Junction',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12h16M12 12v8" />
        </svg>
      ),
    },
    {
      id: 'junction-cross',
      label: 'Crossroads',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 4v16M4 12h16" />
        </svg>
      ),
    },
    {
      id: 'junction-roundabout',
      label: 'Roundabout',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      ),
    },
    {
      id: 'marking',
      label: 'Road Marking',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 4v4M12 12v4M12 20v0" strokeLinecap="round" />
          <path d="M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'signage',
      label: 'Road Sign',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="9" r="6" />
          <path d="M12 15v6" />
          <text x="12" y="11" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">30</text>
        </svg>
      ),
    },
    {
      id: 'furniture',
      label: 'Street Furniture',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="8" y="4" width="8" height="16" rx="4" />
          <line x1="10" y1="8" x2="14" y2="8" />
        </svg>
      ),
    },
    {
      id: 'product',
      label: 'Rosehill Products',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
          <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
          <circle cx="12" cy="14" r="2" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={handleDragMouseMove}
      onMouseUp={handleDragMouseUp}
      onMouseLeave={handleDragMouseLeave}
      style={{ cursor: dragState.isDragging ? 'grabbing' : undefined }}
    >
      {/* Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-white rounded-lg shadow-lg p-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-2 rounded transition-colors ${
              activeTool === tool.id
                ? 'bg-[#FF6B35] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}

        <div className="h-px bg-slate-200 my-1" />

        {/* Snap to Grid toggle */}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-2 rounded transition-colors ${
            snapToGrid
              ? 'bg-slate-200 text-slate-800'
              : 'text-slate-400 hover:bg-slate-100'
          }`}
          title={snapToGrid ? 'Grid snap on' : 'Grid snap off'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>

        <div className="h-px bg-slate-200 my-1" />

        {/* Undo */}
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
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 10h10a5 5 0 0 1 5 5v2" />
            <path d="M7 6L3 10l4 4" />
          </svg>
        </button>

        {/* Redo */}
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
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 10H11a5 5 0 0 0-5 5v2" />
            <path d="M17 6l4 4-4 4" />
          </svg>
        </button>

        <div className="h-px bg-slate-200 my-1" />

        {/* Export */}
        <button
          onClick={handleExport}
          className="p-2 rounded transition-colors text-slate-600 hover:bg-slate-100"
          title="Export Layout"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>

        {/* Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded transition-colors text-slate-600 hover:bg-slate-100"
          title="Import Layout"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Marking Type Selector Panel (when marking tool is active) */}
      {activeTool === 'marking' && (
        <div className="absolute top-4 left-20 z-10 bg-white rounded-lg shadow-lg p-3 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Select Marking Type</h3>
          {markingsData.categories.map((category) => {
            const categoryMarkings = markingsData.markings.filter((m) => m.category === category.id);
            if (categoryMarkings.length === 0) return null;

            return (
              <div key={category.id} className="mb-3">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  {category.name}
                </h4>
                <div className="space-y-1">
                  {categoryMarkings.map((marking) => (
                    <button
                      key={marking.id}
                      onClick={() => {
                        setActiveMarkingType(marking.id as MarkingType);
                        setToolOptions({ markingType: marking.id as MarkingType });
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        activeMarkingType === marking.id
                          ? 'bg-[#FF6B35] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      title={marking.description}
                    >
                      {marking.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Signage Type Selector Panel (when signage tool is active) */}
      {activeTool === 'signage' && (
        <div className="absolute top-4 left-20 z-10 bg-white rounded-lg shadow-lg p-3 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Select Sign Type</h3>
          {signageData.categories.map((category) => {
            const categorySigns = signageData.signs.filter((s) => s.category === category.id);
            if (categorySigns.length === 0) return null;

            return (
              <div key={category.id} className="mb-3">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  {category.name}
                </h4>
                <div className="space-y-1">
                  {categorySigns.map((sign) => (
                    <button
                      key={sign.id}
                      onClick={() => {
                        setActiveSignType(sign.id as SignType);
                        setToolOptions({ signType: sign.id as SignType });
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        activeSignType === sign.id
                          ? 'bg-[#FF6B35] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      title={sign.description}
                    >
                      {sign.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Furniture Type Selector Panel (when furniture tool is active) */}
      {activeTool === 'furniture' && (
        <div className="absolute top-4 left-20 z-10 bg-white rounded-lg shadow-lg p-3 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Select Furniture Type</h3>
          {furnitureData.categories.map((category) => {
            const categoryItems = furnitureData.items.filter((f) => f.category === category.id);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} className="mb-3">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  {category.name}
                </h4>
                <div className="space-y-1">
                  {categoryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveFurnitureType(item.id as FurnitureType);
                        setToolOptions({ furnitureType: item.id as FurnitureType });
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        activeFurnitureType === item.id
                          ? 'bg-[#FF6B35] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      title={item.description}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Selector Panel (when product tool is active) */}
      {activeTool === 'product' && (
        <div className="absolute top-4 left-20 z-10 bg-white rounded-lg shadow-lg p-3 w-72 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Select Rosehill Product</h3>
          {productsData.categories.map((category) => {
            const categoryProducts = productsData.products.filter((p) => p.category === category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="mb-3">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  {category.name}
                </h4>
                <div className="space-y-1">
                  {categoryProducts.map((product) => (
                    <div key={product.id}>
                      <button
                        onClick={() => {
                          setActiveProductId(product.id);
                          setActiveVariantId(null);
                          setToolOptions({ productId: product.id, variantId: undefined });
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          activeProductId === product.id
                            ? 'bg-[#FF6B35] text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                        title={product.description}
                      >
                        <div className="flex items-center justify-between">
                          <span>{product.name}</span>
                          <span className="text-xs opacity-70">
                            {(product.dimensions.length / 1000).toFixed(1)}m
                          </span>
                        </div>
                      </button>
                      {/* Show variants if this product is selected and has variants */}
                      {activeProductId === product.id && product.variants && product.variants.length > 0 && (
                        <div className="ml-3 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                          {product.variants.map((variant) => (
                            <button
                              key={variant.id}
                              onClick={() => {
                                setActiveVariantId(variant.id);
                                setToolOptions({ productId: product.id, variantId: variant.id });
                              }}
                              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                                activeVariantId === variant.id
                                  ? 'bg-[#1A365D] text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {variant.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Viewport with pan/zoom */}
      <CanvasViewport
        viewport={viewport}
        onPanChange={setPan}
        onZoomChange={setZoom}
      >
        {/* Grid */}
        <CanvasGrid
          viewport={viewport}
          gridSize={gridSize}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />

        {/* Interactive layer for clicks (only when not drawing or placing) */}
        {!isDrawingRoad && !isPlacingJunction && !isPlacingMarking && !isPlacingSignage && !isPlacingFurniture && !isPlacingProduct && (
          <rect
            x={0}
            y={0}
            width={containerSize.width}
            height={containerSize.height}
            fill="transparent"
            onClick={handleCanvasClick}
            style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
          />
        )}

        {/* Roads layer */}
        <RoadsLayer
          roads={roads}
          roadOrder={roadOrder}
          viewport={viewport}
          selectedRoadId={selectedRoadId}
          hoveredRoadId={hoveredRoadId}
          onSelectRoad={handleSelectRoad}
          onHoverRoad={setHoveredRoadId}
        />

        {/* Road drawer (when road tool is active) */}
        {isDrawingRoad && (
          <RoadDrawer
            viewport={viewport}
            roadWidth={toolOptions.roadWidth ?? 6.5}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            onComplete={handleRoadComplete}
            onCancel={handleRoadCancel}
          />
        )}

        {/* Junctions layer */}
        <JunctionsLayer
          junctions={junctions}
          viewport={viewport}
          roadWidth={toolOptions.roadWidth ?? 6.5}
          selectedJunctionId={selectedJunctionId}
          hoveredJunctionId={hoveredJunctionId}
          onSelectJunction={handleSelectJunction}
          onHoverJunction={setHoveredJunctionId}
          onDragStart={handleJunctionDragStart}
        />

        {/* Junction placer (when junction tool is active) */}
        {isPlacingJunction && activeJunctionType && (
          <JunctionPlacer
            viewport={viewport}
            junctionType={activeJunctionType}
            roadWidth={toolOptions.roadWidth ?? 6.5}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            onPlace={handleJunctionPlace}
            onCancel={handleJunctionCancel}
          />
        )}

        {/* Markings layer */}
        <MarkingsLayer
          markings={markings}
          roads={roads}
          viewport={viewport}
          selectedMarkingId={selectedMarkingId}
          hoveredMarkingId={hoveredMarkingId}
          onSelectMarking={handleSelectMarking}
          onHoverMarking={setHoveredMarkingId}
        />

        {/* Marking placer (when marking tool is active) */}
        {isPlacingMarking && activeMarkingType && (
          <MarkingPlacer
            viewport={viewport}
            markingType={activeMarkingType}
            roads={roads}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            onPlace={handleMarkingPlace}
            onCancel={handleMarkingCancel}
          />
        )}

        {/* Signage layer */}
        <SignageLayer
          signage={signage}
          viewport={viewport}
          selectedSignId={selectedSignId}
          hoveredSignId={hoveredSignId}
          onSelectSign={handleSelectSign}
          onHoverSign={setHoveredSignId}
          onDragStart={handleSignageDragStart}
        />

        {/* Signage placer (when signage tool is active) */}
        {isPlacingSignage && activeSignType && (
          <SignagePlacer
            viewport={viewport}
            signType={activeSignType}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            onPlace={handleSignagePlace}
            onCancel={handleSignageCancel}
          />
        )}

        {/* Furniture layer */}
        <FurnitureLayer
          furniture={furniture}
          viewport={viewport}
          selectedFurnitureId={selectedFurnitureId}
          hoveredFurnitureId={hoveredFurnitureId}
          onSelectFurniture={handleSelectFurniture}
          onHoverFurniture={setHoveredFurnitureId}
          onDragStart={handleFurnitureDragStart}
        />

        {/* Furniture placer (when furniture tool is active) */}
        {isPlacingFurniture && activeFurnitureType && (
          <FurniturePlacer
            viewport={viewport}
            furnitureType={activeFurnitureType}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            onPlace={handleFurniturePlace}
            onCancel={handleFurnitureCancel}
          />
        )}

        {/* Products layer */}
        <ProductLayer
          products={products}
          viewport={viewport}
          selectedIds={selectedProductIds}
          onSelect={handleSelectProduct}
          onDragStart={handleProductDragStart}
        />

        {/* Product placer (when product tool is active) */}
        {isPlacingProduct && activeProductId && (
          <CanvasProductPlacer
            viewport={viewport}
            productId={activeProductId}
            variantId={activeVariantId || undefined}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            onPlace={handleProductPlace}
            onCancel={handleProductCancel}
          />
        )}
      </CanvasViewport>

      {/* Instructions overlay (not shown during drawing/placing - they have their own) */}
      {activeTool !== 'select' && !isDrawingRoad && !isPlacingJunction && !isPlacingMarking && !isPlacingSignage && !isPlacingFurniture && !isPlacingProduct && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#FF6B35] text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">
            <kbd className="px-1 bg-[#E55A2B] rounded">Esc</kbd> to cancel
          </p>
        </div>
      )}

      {/* Empty state (not shown during drawing/placing) */}
      {Object.keys(roads).length === 0 && Object.keys(junctions).length === 0 && !isDrawingRoad && !isPlacingJunction && !isPlacingMarking && !isPlacingSignage && !isPlacingFurniture && !isPlacingProduct && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Start designing your road layout</h3>
            <p className="text-sm text-slate-600 mb-4">
              Use the toolbar on the left to draw roads and add junctions.
              Pan with middle-click or Space+drag, zoom with scroll wheel.
            </p>
            <button
              onClick={() => setActiveTool('road')}
              className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A2B] transition-colors pointer-events-auto"
            >
              Draw First Road
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
