/**
 * Sketch Mode Canvas - React Wrapper for Phaser Scene
 *
 * Mounts and manages the Phaser game instance for isometric visualisation.
 * Bridges React state (Zustand stores) with the Phaser scene.
 *
 * Supports two data sources:
 * - Map mode: Corridor from schemeStore (geographic coordinates)
 * - Canvas mode: Roads from canvasStore (Cartesian coordinates)
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import Phaser from 'phaser';
import { SketchScene } from './SketchScene';
import { useSchemeStore } from '@/stores/schemeStore';
import { useSketchStore } from '@/stores/sketchStore';
import { useCanvasStore } from '@/stores/canvasStore';
import products from '@/data/products.json';
import type { Product } from '@/types';
import type { RoadSegment, CanvasProduct } from '@/types/canvas';

// ============================================================================
// Component
// ============================================================================

interface SketchCanvasProps {
  className?: string;
  placementMode?: { productId: string; isRun?: boolean } | null;
  onPlacementComplete?: () => void;
}

export function SketchCanvas({ className, placementMode, onPlacementComplete }: SketchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<SketchScene | null>(null);

  // Scheme store (Map mode)
  const corridor = useSchemeStore((state) => state.corridor);
  const elements = useSchemeStore((state) => state.elements);
  const selectedElementId = useSchemeStore((state) => state.selectedElementId);
  const selectElement = useSchemeStore((state) => state.selectElement);
  const updateElement = useSchemeStore((state) => state.updateElement);
  const addElement = useSchemeStore((state) => state.addElement);

  // Canvas store (Canvas mode)
  const canvasRoads = useCanvasStore((state) => state.roads);
  const canvasRoadOrder = useCanvasStore((state) => state.roadOrder);
  const canvasProducts = useCanvasStore((state) => state.products);
  const canvasSelectedRoadIds = useCanvasStore((state) => state.selection.selectedRoadIds);
  const canvasSelectedProductIds = useCanvasStore((state) => state.selection.selectedProductIds);
  const addCanvasProduct = useCanvasStore((state) => state.addProduct);
  const updateCanvasProduct = useCanvasStore((state) => state.updateProduct);
  const selectCanvasProduct = useCanvasStore((state) => state.selectProduct);

  // Sketch store
  const scale = useSketchStore((state) => state.scale);
  const zoom = useSketchStore((state) => state.zoom);
  const cameraOffset = useSketchStore((state) => state.cameraOffset);
  const showGrid = useSketchStore((state) => state.showGrid);
  const showChainageLabels = useSketchStore((state) => state.showChainageLabels);
  const snapToGrid = useSketchStore((state) => state.snapToGrid);
  const hoveredProductId = useSketchStore((state) => state.hoveredProductId);
  const setHoveredProduct = useSketchStore((state) => state.setHoveredProduct);

  // Product list
  const productList: Product[] = products.products as Product[];

  // ======================================================================
  // Mode Detection and Data Preparation
  // ======================================================================

  // Determine data source: Canvas mode takes priority over Map mode
  const hasCanvasData = canvasRoadOrder.length > 0;
  const hasMapData = corridor !== null;
  const dataSource: 'canvas' | 'map' | null = hasCanvasData ? 'canvas' : hasMapData ? 'map' : null;

  // Prepare Canvas roads in render order
  const canvasRoadsArray = useMemo(() => {
    return canvasRoadOrder.map((id) => canvasRoads[id]).filter(Boolean) as RoadSegment[];
  }, [canvasRoads, canvasRoadOrder]);

  // Prepare Canvas products array
  const canvasProductsArray = useMemo(() => {
    return Object.values(canvasProducts) as CanvasProduct[];
  }, [canvasProducts]);

  // ======================================================================
  // Event Handlers
  // ======================================================================

  const handleElementSelect = useCallback(
    (id: string | null) => {
      selectElement(id);
    },
    [selectElement]
  );

  const handleElementHover = useCallback(
    (id: string | null) => {
      setHoveredProduct(id);
    },
    [setHoveredProduct]
  );

  const handleElementMove = useCallback(
    (id: string, s: number, t: number) => {
      updateElement(id, {
        position: {
          s,
          t,
          rotation: elements[id]?.position?.rotation ?? 0,
        },
      });
    },
    [updateElement, elements]
  );

  const handleBackgroundClick = useCallback(
    (s: number, t: number) => {
      // Place product if in placement mode
      if (placementMode && !placementMode.isRun) {
        const product = productList.find((p) => p.id === placementMode.productId);
        if (product) {
          // Linear products use 'run' type, otherwise 'discrete'
          const type = product.type === 'linear' ? 'run' : 'discrete';
          addElement(
            placementMode.productId,
            { s, t, rotation: 0 },
            type
          );
          onPlacementComplete?.();
        }
      }
    },
    [placementMode, productList, addElement, onPlacementComplete]
  );

  // ======================================================================
  // Phaser Game Lifecycle
  // ======================================================================

  // Initialise Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const container = containerRef.current;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#f0f4f8',
      scene: SketchScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        mouse: {
          preventDefaultWheel: false,
        },
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Wait for scene to be ready
    game.events.once('ready', () => {
      const scene = game.scene.getScene('SketchScene') as unknown as SketchScene;
      sceneRef.current = scene;

      // Initial configuration
      scene.setConfig(
        {
          // Mode
          dataSource,
          // Map mode data
          corridor,
          elements,
          // Canvas mode data
          canvasRoads: canvasRoadsArray,
          canvasProducts: canvasProductsArray,
          // Common data
          products: productList,
          scale,
          zoom,
          cameraOffset,
          showGrid,
          showChainageLabels,
          selectedElementId,
          hoveredElementId: hoveredProductId,
          snapToGrid,
          placementMode,
        },
        {
          onElementSelect: handleElementSelect,
          onElementHover: handleElementHover,
          onElementMove: handleElementMove,
          onBackgroundClick: handleBackgroundClick,
        }
      );
    });

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update scene when state changes
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.setConfig(
      {
        // Mode
        dataSource,
        // Map mode data
        corridor,
        elements,
        // Canvas mode data
        canvasRoads: canvasRoadsArray,
        canvasProducts: canvasProductsArray,
        // Common data
        products: productList,
        scale,
        zoom,
        cameraOffset,
        showGrid,
        showChainageLabels,
        selectedElementId,
        hoveredElementId: hoveredProductId,
        snapToGrid,
        placementMode,
      },
      {
        onElementSelect: handleElementSelect,
        onElementHover: handleElementHover,
        onElementMove: handleElementMove,
        onBackgroundClick: handleBackgroundClick,
      }
    );
  }, [
    dataSource,
    corridor,
    elements,
    canvasRoadsArray,
    canvasProductsArray,
    productList,
    scale,
    zoom,
    cameraOffset,
    showGrid,
    showChainageLabels,
    selectedElementId,
    hoveredProductId,
    snapToGrid,
    placementMode,
    handleElementSelect,
    handleElementHover,
    handleElementMove,
    handleBackgroundClick,
  ]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current || !gameRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (gameRef.current && width > 0 && height > 0) {
          gameRef.current.scale.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // ======================================================================
  // Render
  // ======================================================================

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
}

export default SketchCanvas;
