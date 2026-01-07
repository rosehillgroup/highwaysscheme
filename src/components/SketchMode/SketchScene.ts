/**
 * Sketch Mode - Phaser Scene
 *
 * Isometric visualisation of the highway scheme.
 * Renders products from schemeStore as isometric sprites.
 */

import Phaser from 'phaser';
import {
  chainageToScreen,
  chainageToScreenCurved,
  screenToChainage,
  screenToChainageCurved,
  calculateDepth,
  calculateDepthCurved,
  createDefaultConfig,
  snapToGrid,
  getScreenBounds,
  getScreenBoundsCurved,
  TILE_WIDTH,
  TILE_HEIGHT,
  type IsometricConfig,
} from '@/lib/sketch/coordinates';
import {
  canvasChainageToScreen,
  screenToCanvasChainage,
  calculateCanvasChainageDepth,
  getCanvasRoadScreenBounds,
  getRoadLength,
  getCanvasProductScreenPosition,
  getCanvasProductDepth,
} from '@/lib/canvas/canvasToSketch';
import type { LineString } from 'geojson';
import {
  getSpriteConfig,
  COLOURS,
  type SpriteConfig,
} from '@/lib/sketch/sprites';
import type { PlacedElement, Corridor, Product } from '@/types';
import type { RoadSegment, CanvasProduct } from '@/types/canvas';

// ============================================================================
// Types
// ============================================================================

export interface SketchSceneConfig {
  // Mode indicator
  dataSource: 'canvas' | 'map' | null;
  // Map mode data
  corridor: Corridor | null;
  elements: Record<string, PlacedElement>;
  // Canvas mode data
  canvasRoads: RoadSegment[];
  canvasProducts: CanvasProduct[];
  // Common data
  products: Product[];
  scale: number;
  zoom: number;
  cameraOffset: { x: number; y: number };
  showGrid: boolean;
  showChainageLabels: boolean;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  snapToGrid: boolean;
  placementMode?: { productId: string; isRun?: boolean } | null;
}

export interface SketchSceneEvents {
  onElementSelect: (id: string | null) => void;
  onElementHover: (id: string | null) => void;
  onElementMove: (id: string, s: number, t: number) => void;
  onBackgroundClick: (s: number, t: number) => void;
}

// ============================================================================
// Scene
// ============================================================================

// ============================================================================
// Asset Keys
// ============================================================================

const ASSETS = {
  // Cars - E/W for diagonal isometric movement along corridor
  CAR_JEEP_E: 'car-jeep-e',
  CAR_JEEP_W: 'car-jeep-w',
  CAR_TAXI_E: 'car-taxi-e',
  CAR_TAXI_W: 'car-taxi-w',
  // Trees
  TREE_PINE_1: 'tree-pine-1',
  TREE_PINE_2: 'tree-pine-2',
  TREE_1: 'tree-1',
  TREE_2: 'tree-2',
  TREE_3: 'tree-3',
  TREE_4: 'tree-4',
  // Buildings
  BUILDING_TOWNHOUSE: 'building-townhouse',
  BUILDING_LIMESTONE: 'building-limestone',
  BUILDING_ROMANESQUE_2: 'building-romanesque-2',
  BUILDING_ROMANESQUE_3: 'building-romanesque-3',
  BUILDING_APARTMENTS: 'building-apartments',
  BUILDING_BROWNSTONE: 'building-brownstone',
  BUILDING_VICTORIAN: 'building-victorian',
} as const;

// Tree types for variety
const TREE_TYPES = [
  ASSETS.TREE_PINE_1,
  ASSETS.TREE_PINE_2,
  ASSETS.TREE_1,
  ASSETS.TREE_2,
  ASSETS.TREE_3,
  ASSETS.TREE_4,
];

// Car types - corridor runs diagonally in isometric view, so use E/W sprites
const CAR_TYPES_FORWARD = [ASSETS.CAR_JEEP_E, ASSETS.CAR_TAXI_E];
const CAR_TYPES_BACKWARD = [ASSETS.CAR_JEEP_W, ASSETS.CAR_TAXI_W];

// Building types for variety
const BUILDING_TYPES = [
  ASSETS.BUILDING_TOWNHOUSE,
  ASSETS.BUILDING_LIMESTONE,
  ASSETS.BUILDING_ROMANESQUE_2,
  ASSETS.BUILDING_ROMANESQUE_3,
  ASSETS.BUILDING_APARTMENTS,
  ASSETS.BUILDING_BROWNSTONE,
  ASSETS.BUILDING_VICTORIAN,
];

export class SketchScene extends Phaser.Scene {
  private config: SketchSceneConfig | null = null;
  private sceneEvents: SketchSceneEvents | null = null;
  private isoConfig: IsometricConfig | null = null;

  // Graphics layers
  private backgroundLayer: Phaser.GameObjects.Container | null = null;
  private groundLayer: Phaser.GameObjects.Container | null = null;
  private buildingLayer: Phaser.GameObjects.Container | null = null;
  private sceneryLayer: Phaser.GameObjects.Container | null = null;
  private trafficLayer: Phaser.GameObjects.Container | null = null;
  private gridLayer: Phaser.GameObjects.Container | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private productLayer: Phaser.GameObjects.Container | null = null;
  private uiLayer: Phaser.GameObjects.Container | null = null;

  // Sprite cache
  private productSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private treeSprites: Phaser.GameObjects.Sprite[] = [];
  private carSprites: Phaser.GameObjects.Sprite[] = [];
  private buildingSprites: Phaser.GameObjects.Sprite[] = [];

  // Interaction state
  private draggedElement: string | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  // Camera panning state
  private isPanning: boolean = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };
  private cameraStart: { x: number; y: number } = { x: 0, y: 0 };
  private hasInitializedCamera: boolean = false;

  // Traffic animation
  private carSpawnTimer: Phaser.Time.TimerEvent | null = null;
  private assetsLoaded: boolean = false;

  constructor() {
    super({ key: 'SketchScene' });
  }

  // ======================================================================
  // Asset Loading
  // ======================================================================

  preload(): void {
    // Load car sprites - E/W for diagonal isometric movement
    this.load.image(ASSETS.CAR_JEEP_E, '/sketch-assets/cars/jeepe.png');
    this.load.image(ASSETS.CAR_JEEP_W, '/sketch-assets/cars/jeepw.png');
    this.load.image(ASSETS.CAR_TAXI_E, '/sketch-assets/cars/taxie.png');
    this.load.image(ASSETS.CAR_TAXI_W, '/sketch-assets/cars/taxiw.png');

    // Load tree sprites
    this.load.image(ASSETS.TREE_PINE_1, '/sketch-assets/props/1x1pine_1.png');
    this.load.image(ASSETS.TREE_PINE_2, '/sketch-assets/props/1x1pine_2.png');
    this.load.image(ASSETS.TREE_1, '/sketch-assets/props/1x1tree1.png');
    this.load.image(ASSETS.TREE_2, '/sketch-assets/props/1x1tree2.png');
    this.load.image(ASSETS.TREE_3, '/sketch-assets/props/1x1tree3.png');
    this.load.image(ASSETS.TREE_4, '/sketch-assets/props/1x1tree4.png');

    // Load building sprites
    this.load.image(ASSETS.BUILDING_TOWNHOUSE, '/sketch-assets/buildings/2x2english_townhouse_south.png');
    this.load.image(ASSETS.BUILDING_LIMESTONE, '/sketch-assets/buildings/2x2limestone_south.png');
    this.load.image(ASSETS.BUILDING_ROMANESQUE_2, '/sketch-assets/buildings/2x2romanesque_2_south.png');
    this.load.image(ASSETS.BUILDING_ROMANESQUE_3, '/sketch-assets/buildings/2x2romanesque_3_south.png');
    this.load.image(ASSETS.BUILDING_APARTMENTS, '/sketch-assets/buildings/2x2yellow_apartments_south.png');
    this.load.image(ASSETS.BUILDING_BROWNSTONE, '/sketch-assets/buildings/2x3brownstone_south.png');
    this.load.image(ASSETS.BUILDING_VICTORIAN, '/sketch-assets/buildings/2x3sf_victorian_south.png');

    this.load.on('complete', () => {
      this.assetsLoaded = true;
    });
  }

  // ======================================================================
  // Lifecycle
  // ======================================================================

  create(): void {
    // Create layers (render order: background -> ground -> buildings -> scenery -> traffic -> grid -> products -> UI)
    this.backgroundLayer = this.add.container(0, 0);
    this.groundLayer = this.add.container(0, 0);
    this.buildingLayer = this.add.container(0, 0);
    this.sceneryLayer = this.add.container(0, 0);
    this.trafficLayer = this.add.container(0, 0);
    this.gridLayer = this.add.container(0, 0);
    this.gridGraphics = this.add.graphics();
    this.gridLayer.add(this.gridGraphics);
    this.productLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    // Set up camera with grass background
    this.cameras.main.setBackgroundColor(0x4a7c23); // Grass green

    // Set up input
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);

    // Keyboard
    this.input.keyboard?.on('keydown-DELETE', this.handleDelete, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.handleDelete, this);

    // Initial render if config exists
    if (this.config) {
      this.updateScene(this.config);
    }
  }

  // ======================================================================
  // Public API
  // ======================================================================

  /**
   * Set scene configuration and events
   */
  setConfig(config: SketchSceneConfig, events: SketchSceneEvents): void {
    this.config = config;
    this.sceneEvents = events;
    this.isoConfig = createDefaultConfig(
      this.scale.width,
      this.scale.height,
      config.scale
    );

    if (this.scene.isActive()) {
      this.updateScene(config);
    }
  }

  /**
   * Update the scene with new configuration
   */
  updateScene(config: SketchSceneConfig): void {
    this.config = config;

    if (!this.isoConfig) {
      this.isoConfig = createDefaultConfig(
        this.scale.width,
        this.scale.height,
        config.scale
      );
    } else {
      this.isoConfig.scale = config.scale;
    }

    // Update cursor for placement mode
    this.updateCursor();

    // Update camera
    this.updateCamera();

    // Render layers
    this.renderGround();
    this.renderBuildings();
    this.renderScenery();
    this.renderGrid();
    this.renderProducts();
    this.startTrafficAnimation();
  }

  /**
   * Update cursor style based on current mode
   */
  private updateCursor(): void {
    if (!this.config) return;

    const canvas = this.game.canvas;
    if (this.config.placementMode && !this.config.placementMode.isRun) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  // ======================================================================
  // Coordinate Helpers (auto-select mode: canvas vs map vs straight)
  // ======================================================================

  /**
   * Check if we're in canvas mode
   */
  private isCanvasMode(): boolean {
    return this.config?.dataSource === 'canvas';
  }

  /**
   * Get the active canvas road (first road for now)
   */
  private getActiveCanvasRoad(): RoadSegment | null {
    if (!this.isCanvasMode() || !this.config?.canvasRoads?.length) {
      return null;
    }
    return this.config.canvasRoads[0];
  }

  /**
   * Get corridor geometry if available (Map mode only)
   */
  private getGeometry(): LineString | null {
    if (this.isCanvasMode()) return null;
    return this.config?.corridor?.geometry ?? null;
  }

  /**
   * Convert chainage to screen, handling canvas/map modes
   */
  private toScreen(s: number, t: number): { x: number; y: number } {
    if (!this.isoConfig) return { x: 0, y: 0 };

    // Canvas mode: use canvas coordinate projection
    const canvasRoad = this.getActiveCanvasRoad();
    if (canvasRoad) {
      return canvasChainageToScreen(s, t, canvasRoad, this.isoConfig);
    }

    // Map mode: use geographic projection
    const geometry = this.getGeometry();
    if (geometry) {
      return chainageToScreenCurved(s, t, geometry, this.isoConfig);
    }

    // Fallback: straight projection
    return chainageToScreen(s, t, this.isoConfig);
  }

  /**
   * Convert screen to chainage, handling canvas/map modes
   */
  private fromScreen(screenX: number, screenY: number): { s: number; t: number } {
    if (!this.isoConfig) return { s: 0, t: 0 };

    // Canvas mode
    const canvasRoad = this.getActiveCanvasRoad();
    if (canvasRoad) {
      return screenToCanvasChainage(screenX, screenY, canvasRoad, this.isoConfig);
    }

    // Map mode
    const geometry = this.getGeometry();
    if (geometry) {
      return screenToChainageCurved(screenX, screenY, geometry, this.isoConfig);
    }

    // Fallback
    return screenToChainage(screenX, screenY, this.isoConfig);
  }

  /**
   * Calculate depth for sprite sorting, handling canvas/map modes
   */
  private getDepth(s: number, t: number): number {
    if (!this.isoConfig) return 0;

    // Canvas mode
    const canvasRoad = this.getActiveCanvasRoad();
    if (canvasRoad) {
      return calculateCanvasChainageDepth(s, t, canvasRoad, this.isoConfig.scale);
    }

    // Map mode
    const geometry = this.getGeometry();
    if (geometry) {
      return calculateDepthCurved(s, t, geometry, this.isoConfig);
    }

    // Fallback
    return calculateDepth(s, t, this.isoConfig.scale);
  }

  /**
   * Get the total corridor/road length
   */
  private getTotalLength(): number {
    const canvasRoad = this.getActiveCanvasRoad();
    if (canvasRoad) {
      return getRoadLength(canvasRoad);
    }
    return this.config?.corridor?.totalLength ?? 0;
  }

  /**
   * Get the carriageway width
   */
  private getCarriageWidth(): number {
    const canvasRoad = this.getActiveCanvasRoad();
    if (canvasRoad) {
      return canvasRoad.width;
    }
    return this.config?.corridor?.carriageway?.width ?? 6.5;
  }

  // ======================================================================
  // Rendering
  // ======================================================================

  private updateCamera(): void {
    if (!this.config || !this.isoConfig) return;

    const camera = this.cameras.main;

    // Check if we have any road data
    const totalLength = this.getTotalLength();
    const hasRoadData = totalLength > 0;

    // On first load, auto-fit and center the camera on the corridor/road
    if (!this.hasInitializedCamera && hasRoadData) {
      const carriageWidth = this.getCarriageWidth();
      const vergeWidth = 5;
      const halfWidth = carriageWidth / 2 + vergeWidth + 5;

      // Calculate screen bounds based on mode
      let roadBounds: { left: number; top: number; right: number; bottom: number };

      const canvasRoad = this.getActiveCanvasRoad();
      if (canvasRoad) {
        // Canvas mode
        roadBounds = getCanvasRoadScreenBounds(canvasRoad, this.isoConfig);
      } else {
        // Map mode
        const geometry = this.getGeometry();
        roadBounds = geometry
          ? getScreenBoundsCurved(geometry, halfWidth, this.isoConfig)
          : getScreenBounds(0, totalLength, -halfWidth, halfWidth, this.isoConfig);
      }

      const roadWidth = roadBounds.right - roadBounds.left;
      const roadHeight = roadBounds.bottom - roadBounds.top;

      // Calculate zoom to fit road with padding (85% of viewport)
      const viewportWidth = this.scale.width;
      const viewportHeight = this.scale.height;
      const zoomX = (viewportWidth * 0.85) / Math.max(1, roadWidth);
      const zoomY = (viewportHeight * 0.85) / Math.max(1, roadHeight);
      const autoZoom = Math.min(zoomX, zoomY, 2.5); // Cap at 2.5x

      camera.setZoom(autoZoom);

      // Center on the road midpoint
      const midS = totalLength / 2;
      const centerPos = this.toScreen(midS, 0);
      camera.centerOn(centerPos.x, centerPos.y);

      this.hasInitializedCamera = true;
    } else {
      // Use manual zoom from config
      camera.setZoom(this.config.zoom);

      if (this.config.cameraOffset.x !== 0 || this.config.cameraOffset.y !== 0) {
        // Use manual camera offset if set
        camera.setScroll(
          this.config.cameraOffset.x - this.scale.width / 2,
          this.config.cameraOffset.y - this.scale.height / 2
        );
      }
    }
  }

  private renderGround(): void {
    if (!this.groundLayer || !this.isoConfig) return;

    // Check if we have any road data
    const totalLength = this.getTotalLength();
    if (totalLength <= 0) return;

    this.groundLayer.removeAll(true);

    const carriageWidth = this.getCarriageWidth();
    const vergeWidth = 5; // 5m grass verge on each side

    const graphics = this.add.graphics();
    const startS = 0;
    const endS = totalLength;

    // ========================================
    // 1. Draw grass verges (both sides)
    // ========================================
    const grassColour = 0x4a7c23; // Rich green
    const grassColourLight = 0x5d9930;

    // Left verge (nearside)
    const leftVergePoints = this.getIsometricQuad(
      startS,
      endS,
      -carriageWidth / 2 - vergeWidth,
      -carriageWidth / 2
    );
    graphics.fillStyle(grassColour, 1);
    graphics.fillPoints(leftVergePoints, true);

    // Right verge (offside)
    const rightVergePoints = this.getIsometricQuad(
      startS,
      endS,
      carriageWidth / 2,
      carriageWidth / 2 + vergeWidth
    );
    graphics.fillStyle(grassColourLight, 1);
    graphics.fillPoints(rightVergePoints, true);

    // ========================================
    // 2. Draw cycle lane if present
    // ========================================
    const canvasRoad = this.getActiveCanvasRoad();
    const cycleLane = canvasRoad?.cycleLane ?? this.config?.corridor?.cycleLane;
    if (cycleLane?.enabled) {
      const cycleWidth = cycleLane.width;
      const side = cycleLane.side;
      const baseOffset = carriageWidth / 2;

      let cycleMinT: number, cycleMaxT: number;
      if (side === 'nearside') {
        cycleMinT = -baseOffset - cycleWidth;
        cycleMaxT = -baseOffset;
      } else {
        cycleMinT = baseOffset;
        cycleMaxT = baseOffset + cycleWidth;
      }

      const cyclePoints = this.getIsometricQuad(startS, endS, cycleMinT, cycleMaxT);
      graphics.fillStyle(0x2d8a4e, 0.85); // Green cycle lane
      graphics.fillPoints(cyclePoints, true);

      // Cycle lane edge line
      graphics.lineStyle(1, 0xffffff, 0.6);
      this.drawCurvedLine(graphics, startS, endS, cycleMinT);
    }

    // ========================================
    // 3. Draw carriageway with gradient effect
    // ========================================
    // Main carriageway - darker base
    const carriagePoints = this.getIsometricQuad(startS, endS, -carriageWidth / 2, carriageWidth / 2);
    graphics.fillStyle(0x3d4f5f, 1); // Dark asphalt
    graphics.fillPoints(carriagePoints, true);

    // Subtle lighter strip in center for worn road effect
    const wornWidth = carriageWidth * 0.3;
    const wornPoints = this.getIsometricQuad(startS, endS, -wornWidth / 2, wornWidth / 2);
    graphics.fillStyle(0x4a5d6d, 0.4); // Slightly lighter
    graphics.fillPoints(wornPoints, true);

    // ========================================
    // 4. Draw road edge lines (white)
    // ========================================
    graphics.lineStyle(2, 0xffffff, 0.9);

    // Left edge line
    this.drawCurvedLine(graphics, startS, endS, -carriageWidth / 2 + 0.3);

    // Right edge line
    this.drawCurvedLine(graphics, startS, endS, carriageWidth / 2 - 0.3);

    // ========================================
    // 5. Draw dashed centreline
    // ========================================
    const dashLength = 3; // 3m dashes
    const gapLength = 3; // 3m gaps
    graphics.lineStyle(2, 0xffffff, 0.85);

    for (let s = 0; s < totalLength; s += dashLength + gapLength) {
      const dashEnd = Math.min(s + dashLength, totalLength);
      this.drawCurvedLine(graphics, s, dashEnd, 0);
    }

    // ========================================
    // 6. Draw kerb lines (darker edge)
    // ========================================
    graphics.lineStyle(3, 0x2a3540, 1);

    // Left kerb
    this.drawCurvedLine(graphics, startS, endS, -carriageWidth / 2);

    // Right kerb
    this.drawCurvedLine(graphics, startS, endS, carriageWidth / 2);

    this.groundLayer.add(graphics);
  }

  /**
   * Render buildings behind the trees on both sides of the road
   */
  private renderBuildings(): void {
    if (!this.buildingLayer || !this.isoConfig || !this.assetsLoaded) return;

    // Check if we have any road data
    const totalLength = this.getTotalLength();
    if (totalLength <= 0) return;

    // Clear existing buildings
    this.buildingSprites.forEach((building) => building.destroy());
    this.buildingSprites = [];

    const carriageWidth = this.getCarriageWidth();
    const vergeWidth = 5;

    // Building spacing (every 20-30m with variety)
    const baseSpacing = 25;
    // Position buildings behind trees (trees are at edge of verge + 2m)
    const buildingOffset = carriageWidth / 2 + vergeWidth + 8; // Further back than trees

    // Use seeded random for consistent placement
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Place buildings on both sides
    for (let s = 5; s < totalLength - 5; s += baseSpacing + (seededRandom() * 10 - 5)) {
      // Left side building
      const leftT = -buildingOffset - (seededRandom() * 2);
      this.placeBuilding(s, leftT, seededRandom);

      // Right side building (offset for staggered look)
      const rightT = buildingOffset + (seededRandom() * 2);
      this.placeBuilding(s + baseSpacing / 2, rightT, seededRandom);
    }
  }

  /**
   * Place a single building at the given chainage position
   */
  private placeBuilding(s: number, t: number, random: () => number): void {
    if (!this.buildingLayer || !this.isoConfig) return;

    // Pick a random building type
    const buildingType = BUILDING_TYPES[Math.floor(random() * BUILDING_TYPES.length)];

    // Check if texture exists
    if (!this.textures.exists(buildingType)) return;

    const pos = this.toScreen(s, t);
    const building = this.add.sprite(pos.x, pos.y, buildingType);

    // Scale buildings - slightly larger than trees for background presence
    building.setScale(0.22 + random() * 0.05);

    // Set origin at bottom center for proper ground positioning
    building.setOrigin(0.5, 0.95);

    // Set depth lower than trees so they appear behind
    building.setDepth(this.getDepth(s, t) + 50);

    this.buildingLayer.add(building);
    this.buildingSprites.push(building);
  }

  private renderGrid(): void {
    if (!this.gridLayer || !this.gridGraphics || !this.config || !this.isoConfig) return;

    // Clear existing grid graphics and labels
    this.gridGraphics.clear();
    // Remove old labels (keep the graphics object)
    this.gridLayer.each((child: Phaser.GameObjects.GameObject) => {
      if (child !== this.gridGraphics) {
        child.destroy();
      }
    });

    // Check if we should show grid and have road data
    const totalLength = this.getTotalLength();
    if (!this.config.showGrid || totalLength <= 0) return;

    const carriageWidth = this.getCarriageWidth();
    const gridSize = 10; // 10m grid

    this.gridGraphics.lineStyle(1, 0xcccccc, 0.3);

    // Draw lines perpendicular to road (constant chainage)
    for (let s = 0; s <= totalLength; s += gridSize) {
      // For curved corridors, these become short perpendicular segments
      const p1 = this.toScreen(s, -carriageWidth);
      const p2 = this.toScreen(s, carriageWidth);
      this.gridGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    // Draw lines parallel to road (constant offset)
    for (let t = -carriageWidth; t <= carriageWidth; t += gridSize) {
      // For curved corridors, draw curved parallel lines
      this.drawCurvedLine(this.gridGraphics, 0, totalLength, t, gridSize);
    }

    // Draw chainage labels
    if (this.config.showChainageLabels) {
      for (let s = 0; s <= totalLength; s += 50) {
        const pos = this.toScreen(s, -carriageWidth - 2);
        const label = this.add.text(pos.x, pos.y, `${s}m`, {
          fontSize: '10px',
          color: '#666666',
        });
        label.setOrigin(0.5, 0.5);
        this.gridLayer.add(label);
      }
    }
  }

  private renderProducts(): void {
    if (!this.productLayer || !this.config || !this.isoConfig) return;

    const { elements, canvasProducts, products, selectedElementId, hoveredElementId } = this.config;

    // Collect all IDs we expect to render
    const mapElementIds = new Set(Object.keys(elements));
    const canvasProductIds = new Set(canvasProducts.map((p) => p.id));
    const allIds = new Set([...mapElementIds, ...canvasProductIds]);

    // Remove sprites for deleted elements
    for (const [id, sprite] of this.productSprites) {
      if (!allIds.has(id)) {
        sprite.destroy();
        this.productSprites.delete(id);
      }
    }

    // Render Map mode elements
    for (const element of Object.values(elements)) {
      const product = products.find((p) => p.id === element.productId);
      if (!product) continue;

      let sprite = this.productSprites.get(element.id);
      const isSelected = element.id === selectedElementId;
      const isHovered = element.id === hoveredElementId;

      if (!sprite) {
        sprite = this.createProductSprite(element, product);
        this.productSprites.set(element.id, sprite);
        this.productLayer.add(sprite);
      }

      // Update position
      const pos = this.toScreen(element.position.s, element.position.t);
      sprite.setPosition(pos.x, pos.y);

      // Update depth for sorting
      sprite.setDepth(this.getDepth(element.position.s, element.position.t));

      // Update selection/hover state
      this.updateSpriteState(sprite, isSelected, isHovered);
    }

    // Render Canvas mode products
    const canvasRoad = this.getActiveCanvasRoad();
    for (const canvasProduct of canvasProducts) {
      const product = products.find((p) => p.id === canvasProduct.productId);
      if (!product) continue;

      let sprite = this.productSprites.get(canvasProduct.id);
      const isSelected = canvasProduct.id === selectedElementId;
      const isHovered = canvasProduct.id === hoveredElementId;

      if (!sprite) {
        // Create sprite using a compatible element structure
        const fakeElement: PlacedElement = {
          id: canvasProduct.id,
          productId: canvasProduct.productId,
          position: 's' in canvasProduct.position
            ? { s: canvasProduct.position.s, t: canvasProduct.position.t, rotation: canvasProduct.rotation }
            : { s: 0, t: 0, rotation: canvasProduct.rotation },
          type: canvasProduct.placementMode === 'linear' ? 'run' : 'discrete',
        };
        sprite = this.createProductSprite(fakeElement, product);
        this.productSprites.set(canvasProduct.id, sprite);
        this.productLayer.add(sprite);
      }

      // Update position using Canvas-specific projection
      const pos = getCanvasProductScreenPosition(canvasProduct, canvasRoad, this.isoConfig);
      sprite.setPosition(pos.x, pos.y);

      // Update depth for sorting
      const depth = getCanvasProductDepth(canvasProduct, canvasRoad, this.isoConfig.scale);
      sprite.setDepth(depth);

      // Update selection/hover state
      this.updateSpriteState(sprite, isSelected, isHovered);
    }

    // Sort by depth
    this.productLayer.sort('depth');
  }

  /**
   * Render trees and scenery along the verges
   */
  private renderScenery(): void {
    if (!this.sceneryLayer || !this.isoConfig || !this.assetsLoaded) return;

    // Check if we have any road data
    const totalLength = this.getTotalLength();
    if (totalLength <= 0) return;

    // Clear existing trees
    this.treeSprites.forEach((tree) => tree.destroy());
    this.treeSprites = [];

    const carriageWidth = this.getCarriageWidth();
    const vergeWidth = 5;

    // Tree spacing (every 15-25m with some randomness)
    const baseSpacing = 20;
    // Position trees at edge of verge, not obscuring road
    const treeOffset = carriageWidth / 2 + vergeWidth + 2; // Edge of verge + buffer

    // Place trees on both sides
    for (let s = 10; s < totalLength - 10; s += baseSpacing + (Math.random() * 10 - 5)) {
      // Left side trees
      const leftT = -treeOffset - (Math.random() * 1.5 - 0.75);
      this.placeTree(s, leftT);

      // Right side trees (slightly offset for variety)
      const rightT = treeOffset + (Math.random() * 1.5 - 0.75);
      this.placeTree(s + baseSpacing / 2, rightT);
    }
  }

  /**
   * Place a single tree at the given chainage position
   */
  private placeTree(s: number, t: number): void {
    if (!this.sceneryLayer || !this.isoConfig) return;

    // Pick a random tree type
    const treeType = TREE_TYPES[Math.floor(Math.random() * TREE_TYPES.length)];

    // Check if texture exists
    if (!this.textures.exists(treeType)) return;

    const pos = this.toScreen(s, t);
    const tree = this.add.sprite(pos.x, pos.y, treeType);

    // Scale trees to fit the larger tile dimensions
    tree.setScale(0.15 + Math.random() * 0.05);

    // Set origin at bottom center for proper positioning
    tree.setOrigin(0.5, 0.9);

    // Set depth for proper sorting
    tree.setDepth(this.getDepth(s, t) + 100);

    this.sceneryLayer.add(tree);
    this.treeSprites.push(tree);
  }

  /**
   * Start spawning animated cars
   */
  private startTrafficAnimation(): void {
    // Check if we have any road data
    const totalLength = this.getTotalLength();
    if (totalLength <= 0 || !this.isoConfig || !this.assetsLoaded) return;

    // Stop existing timer if any
    if (this.carSpawnTimer) {
      this.carSpawnTimer.destroy();
    }

    // Spawn initial cars
    this.spawnCar(true);
    this.spawnCar(false);

    // Set up recurring spawn timer (every 3-5 seconds)
    this.carSpawnTimer = this.time.addEvent({
      delay: 3000 + Math.random() * 2000,
      callback: () => {
        // Randomly choose direction
        this.spawnCar(Math.random() > 0.5);
      },
      loop: true,
    });
  }

  /**
   * Spawn a car that drives along the corridor
   */
  private spawnCar(forward: boolean): void {
    if (!this.trafficLayer || !this.isoConfig) return;

    const totalLength = this.getTotalLength();
    if (totalLength <= 0) return;

    const carriageWidth = this.getCarriageWidth();

    // Pick random car type
    const carTypes = forward ? CAR_TYPES_FORWARD : CAR_TYPES_BACKWARD;
    const carType = carTypes[Math.floor(Math.random() * carTypes.length)];

    // Check if texture exists
    if (!this.textures.exists(carType)) return;

    // Lane offset (drive on left in UK)
    const laneOffset = forward ? -carriageWidth / 4 : carriageWidth / 4;

    // Start and end chainage values
    const startS = forward ? -20 : totalLength + 20;
    const endS = forward ? totalLength + 20 : -20;

    const startPos = this.toScreen(Math.max(0, Math.min(totalLength, startS)), laneOffset);

    // Create car sprite - scaled to match larger tile dimensions
    const car = this.add.sprite(startPos.x, startPos.y, carType);
    car.setScale(0.18);
    car.setOrigin(0.5, 0.7);

    // Store chainage data on the car
    car.setData('chainage', startS);
    car.setData('laneOffset', laneOffset);
    car.setData('forward', forward);

    this.trafficLayer.add(car);
    this.carSprites.push(car);

    // Calculate duration based on road length (roughly 30-40 km/h)
    const duration = totalLength * 80 + 2000; // ~80ms per metre

    // Animate the chainage value, then update position from it
    this.tweens.add({
      targets: car,
      chainage: endS, // Tween the chainage data
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        // Get current chainage from tween
        const currentS = car.getData('chainage') as number;
        const t = car.getData('laneOffset') as number;

        // Clamp to valid corridor range for rendering
        const clampedS = Math.max(0, Math.min(totalLength, currentS));

        // Update position using curved projection
        const pos = this.toScreen(clampedS, t);
        car.setPosition(pos.x, pos.y);

        // Update depth for proper sorting
        car.setDepth(this.getDepth(clampedS, t));
      },
      onComplete: () => {
        car.destroy();
        const index = this.carSprites.indexOf(car);
        if (index > -1) {
          this.carSprites.splice(index, 1);
        }
      },
    });
  }

  private createProductSprite(
    element: PlacedElement,
    product: Product
  ): Phaser.GameObjects.Container {
    if (!this.isoConfig) {
      throw new Error('Isometric config not initialised');
    }

    const container = this.add.container(0, 0);
    container.setData('elementId', element.id);

    // Get sprite configuration
    const spriteConfig = getSpriteConfig(
      product.category,
      product.dimensions,
      this.isoConfig.scale
    );

    // Calculate isometric dimensions - use actual product dimensions
    // Products are in mm, convert to metres then to pixels
    const productLengthM = product.dimensions.length / 1000;
    const productWidthM = product.dimensions.width / 1000;

    // Calculate pixel size based on scale (metres per grid unit) and tile size
    const pixelsPerMetre = TILE_WIDTH / this.isoConfig.scale;
    const width = Math.max(12, productLengthM * pixelsPerMetre);
    const height = Math.max(6, productWidthM * pixelsPerMetre * 0.5); // Half for isometric
    const depth = Math.min(20, Math.max(4, spriteConfig.heightPixels));

    // Draw shadow first (behind the product)
    const shadowGraphics = this.add.graphics();
    shadowGraphics.fillStyle(0x000000, 0.2);
    // Draw elliptical shadow on ground
    const shadowWidth = width * 1.2;
    const shadowHeight = height * 0.8;
    shadowGraphics.fillEllipse(3, 4, shadowWidth, shadowHeight);
    container.add(shadowGraphics);

    // Draw isometric box
    const graphics = this.add.graphics();

    // Top face
    graphics.fillStyle(spriteConfig.accentColour, 1);
    this.drawIsometricTop(graphics, 0, -depth, width, height);

    // Front face (right side in iso view)
    graphics.fillStyle(spriteConfig.colour, 1);
    this.drawIsometricFrontRight(graphics, 0, 0, width, height, depth);

    // Left face
    graphics.fillStyle(this.darkenColour(spriteConfig.colour, 0.7), 1);
    this.drawIsometricFrontLeft(graphics, 0, 0, width, height, depth);

    // Add subtle outline for definition
    graphics.lineStyle(1, this.darkenColour(spriteConfig.colour, 0.5), 0.5);
    this.drawIsometricTop(graphics, 0, -depth, width, height);

    container.add(graphics);

    // Add product label
    const label = this.add.text(0, -depth - 10, product.name.substring(0, 10), {
      fontSize: '9px',
      color: '#333333',
      backgroundColor: '#ffffffcc',
      padding: { x: 2, y: 1 },
    });
    label.setOrigin(0.5, 1);
    container.add(label);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height - depth, width, height + depth);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    return container;
  }

  private updateSpriteState(
    sprite: Phaser.GameObjects.Container,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    // Find or create selection indicator
    let indicator = sprite.getByName('indicator') as Phaser.GameObjects.Graphics;

    if (!indicator) {
      indicator = this.add.graphics();
      indicator.setName('indicator');
      sprite.add(indicator);
    }

    indicator.clear();

    if (isSelected) {
      indicator.lineStyle(3, COLOURS.selected, 1);
      indicator.strokeCircle(0, 0, 20);
    } else if (isHovered) {
      indicator.lineStyle(2, COLOURS.hovered, 0.8);
      indicator.strokeCircle(0, 0, 18);
    }
  }

  // ======================================================================
  // Drawing Helpers
  // ======================================================================

  /**
   * Get points for a filled area between two chainage values and two t offsets.
   * For curved corridors, samples along the path to create a smooth polygon.
   */
  private getIsometricQuad(
    startS: number,
    endS: number,
    minT: number,
    maxT: number
  ): Phaser.Geom.Point[] {
    if (!this.isoConfig) return [];

    const geometry = this.getGeometry();

    // For straight corridors or no geometry, just use 4 corners
    if (!geometry) {
      const tl = chainageToScreen(startS, minT, this.isoConfig);
      const tr = chainageToScreen(startS, maxT, this.isoConfig);
      const br = chainageToScreen(endS, maxT, this.isoConfig);
      const bl = chainageToScreen(endS, minT, this.isoConfig);

      return [
        new Phaser.Geom.Point(tl.x, tl.y),
        new Phaser.Geom.Point(tr.x, tr.y),
        new Phaser.Geom.Point(br.x, br.y),
        new Phaser.Geom.Point(bl.x, bl.y),
      ];
    }

    // For curved corridors, sample along the path
    const sampleInterval = 5; // Sample every 5 metres
    const leftEdge: Phaser.Geom.Point[] = [];
    const rightEdge: Phaser.Geom.Point[] = [];

    for (let s = startS; s <= endS; s += sampleInterval) {
      const leftPt = this.toScreen(s, minT);
      const rightPt = this.toScreen(s, maxT);
      leftEdge.push(new Phaser.Geom.Point(leftPt.x, leftPt.y));
      rightEdge.push(new Phaser.Geom.Point(rightPt.x, rightPt.y));
    }

    // Ensure we include the end point
    if (leftEdge.length === 0 || (endS - startS) % sampleInterval !== 0) {
      const leftPt = this.toScreen(endS, minT);
      const rightPt = this.toScreen(endS, maxT);
      leftEdge.push(new Phaser.Geom.Point(leftPt.x, leftPt.y));
      rightEdge.push(new Phaser.Geom.Point(rightPt.x, rightPt.y));
    }

    // Create polygon: left edge forward, then right edge backward
    return [...leftEdge, ...rightEdge.reverse()];
  }

  /**
   * Draw a line along the corridor at a constant lateral offset.
   * For curved corridors, samples along the path for smooth curves.
   */
  private drawCurvedLine(
    graphics: Phaser.GameObjects.Graphics,
    startS: number,
    endS: number,
    t: number,
    sampleInterval: number = 3
  ): void {
    const geometry = this.getGeometry();

    // For short lines or no geometry, draw straight
    if (!geometry || endS - startS <= sampleInterval) {
      const p1 = this.toScreen(startS, t);
      const p2 = this.toScreen(endS, t);
      graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
      return;
    }

    // For curved corridors, draw line segments
    graphics.beginPath();
    const firstPt = this.toScreen(startS, t);
    graphics.moveTo(firstPt.x, firstPt.y);

    for (let s = startS + sampleInterval; s <= endS; s += sampleInterval) {
      const pt = this.toScreen(s, t);
      graphics.lineTo(pt.x, pt.y);
    }

    // Ensure we hit the end point
    if ((endS - startS) % sampleInterval !== 0) {
      const endPt = this.toScreen(endS, t);
      graphics.lineTo(endPt.x, endPt.y);
    }

    graphics.strokePath();
  }

  private drawIsometricTop(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const hw = width / 2;
    const hh = height / 2;

    graphics.beginPath();
    graphics.moveTo(x, y - hh); // Top
    graphics.lineTo(x + hw, y); // Right
    graphics.lineTo(x, y + hh); // Bottom
    graphics.lineTo(x - hw, y); // Left
    graphics.closePath();
    graphics.fillPath();
  }

  private drawIsometricFrontRight(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number
  ): void {
    const hw = width / 2;
    const hh = height / 2;

    graphics.beginPath();
    graphics.moveTo(x, y + hh - depth); // Top-left
    graphics.lineTo(x + hw, y - depth); // Top-right
    graphics.lineTo(x + hw, y); // Bottom-right
    graphics.lineTo(x, y + hh); // Bottom-left
    graphics.closePath();
    graphics.fillPath();
  }

  private drawIsometricFrontLeft(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number
  ): void {
    const hw = width / 2;
    const hh = height / 2;

    graphics.beginPath();
    graphics.moveTo(x, y + hh - depth); // Top-right
    graphics.lineTo(x - hw, y - depth); // Top-left
    graphics.lineTo(x - hw, y); // Bottom-left
    graphics.lineTo(x, y + hh); // Bottom-right
    graphics.closePath();
    graphics.fillPath();
  }

  private darkenColour(colour: number, factor: number): number {
    const r = Math.floor(((colour >> 16) & 0xff) * factor);
    const g = Math.floor(((colour >> 8) & 0xff) * factor);
    const b = Math.floor((colour & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  // ======================================================================
  // Input Handlers
  // ======================================================================

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.sceneEvents || !this.isoConfig) return;

    // Check if clicking on a product
    const hitObjects = this.input.hitTestPointer(pointer);
    const productHit = hitObjects.find(
      (obj) => obj.getData('elementId') !== undefined
    );

    if (productHit) {
      const elementId = productHit.getData('elementId');
      this.sceneEvents.onElementSelect(elementId);

      // Start drag (unless in placement mode)
      if (!this.config?.placementMode) {
        this.draggedElement = elementId;
        const hitContainer = productHit as Phaser.GameObjects.Container;
        this.dragOffset = {
          x: pointer.worldX - hitContainer.x,
          y: pointer.worldY - hitContainer.y,
        };
      }
    } else {
      // Background click
      this.sceneEvents.onElementSelect(null);

      // If in placement mode, place the product
      if (this.config?.placementMode && !this.config.placementMode.isRun) {
        const chainage = this.fromScreen(pointer.worldX, pointer.worldY);
        // Snap to grid if enabled
        const snapped = this.config?.snapToGrid
          ? snapToGrid(chainage.s, chainage.t, 5)
          : chainage;
        this.sceneEvents.onBackgroundClick(snapped.s, snapped.t);
      } else {
        // Start panning
        this.isPanning = true;
        this.panStart = { x: pointer.x, y: pointer.y };
        const camera = this.cameras.main;
        this.cameraStart = { x: camera.scrollX, y: camera.scrollY };
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.sceneEvents || !this.isoConfig) return;

    // Handle product drag
    if (this.draggedElement && pointer.isDown) {
      const newX = pointer.worldX - this.dragOffset.x;
      const newY = pointer.worldY - this.dragOffset.y;
      const chainage = this.fromScreen(newX, newY);

      // Snap to grid if enabled
      const snapped = this.config?.snapToGrid
        ? snapToGrid(chainage.s, chainage.t, 5)
        : chainage;

      this.sceneEvents.onElementMove(this.draggedElement, snapped.s, snapped.t);
      return;
    }

    // Handle camera panning
    if (this.isPanning && pointer.isDown) {
      const camera = this.cameras.main;
      const dx = (this.panStart.x - pointer.x) / camera.zoom;
      const dy = (this.panStart.y - pointer.y) / camera.zoom;
      camera.setScroll(this.cameraStart.x + dx, this.cameraStart.y + dy);
      return;
    }

    // Handle hover
    const hitObjects = this.input.hitTestPointer(pointer);
    const productHit = hitObjects.find(
      (obj) => obj.getData('elementId') !== undefined
    );

    if (productHit) {
      this.sceneEvents.onElementHover(productHit.getData('elementId'));
    } else {
      this.sceneEvents.onElementHover(null);
    }
  }

  private handlePointerUp(): void {
    this.draggedElement = null;
    this.dragOffset = { x: 0, y: 0 };
    this.isPanning = false;
  }

  private handleWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number
  ): void {
    if (!this.config) return;

    // Zoom with mouse wheel
    const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.25, Math.min(3, this.config.zoom + zoomDelta));

    // This would need to be communicated back to React
    // For now, just update locally
    this.cameras.main.setZoom(newZoom);
  }

  private handleDelete(): void {
    // Delete is handled by React, not here
    // The scene just reflects the state
  }
}
