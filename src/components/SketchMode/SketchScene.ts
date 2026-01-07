/**
 * Sketch Mode - Phaser Scene
 *
 * Isometric visualisation of the highway scheme.
 * Renders products from schemeStore as isometric sprites.
 */

import Phaser from 'phaser';
import {
  chainageToScreen,
  screenToChainage,
  calculateDepth,
  createDefaultConfig,
  snapToGrid,
  getScreenBounds,
  TILE_WIDTH,
  TILE_HEIGHT,
  type IsometricConfig,
} from '@/lib/sketch/coordinates';
import {
  getSpriteConfig,
  COLOURS,
  type SpriteConfig,
} from '@/lib/sketch/sprites';
import type { PlacedElement, Corridor, Product } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface SketchSceneConfig {
  corridor: Corridor | null;
  elements: Record<string, PlacedElement>;
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

export class SketchScene extends Phaser.Scene {
  private config: SketchSceneConfig | null = null;
  private sceneEvents: SketchSceneEvents | null = null;
  private isoConfig: IsometricConfig | null = null;

  // Graphics layers
  private backgroundLayer: Phaser.GameObjects.Container | null = null;
  private groundLayer: Phaser.GameObjects.Container | null = null;
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

    this.load.on('complete', () => {
      this.assetsLoaded = true;
    });
  }

  // ======================================================================
  // Lifecycle
  // ======================================================================

  create(): void {
    // Create layers (render order: background -> ground -> scenery -> traffic -> grid -> products -> UI)
    this.backgroundLayer = this.add.container(0, 0);
    this.groundLayer = this.add.container(0, 0);
    this.sceneryLayer = this.add.container(0, 0);
    this.trafficLayer = this.add.container(0, 0);
    this.gridLayer = this.add.container(0, 0);
    this.gridGraphics = this.add.graphics();
    this.gridLayer.add(this.gridGraphics);
    this.productLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    // Set up camera with sky gradient background
    this.cameras.main.setBackgroundColor(0x87ceeb); // Light sky blue

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
  // Rendering
  // ======================================================================

  private updateCamera(): void {
    if (!this.config || !this.isoConfig) return;

    const camera = this.cameras.main;

    // On first load, auto-fit and center the camera on the corridor
    if (!this.hasInitializedCamera && this.config.corridor) {
      const corridor = this.config.corridor;
      const totalLength = corridor.totalLength;
      const carriageWidth = corridor.carriageway.width;
      const vergeWidth = 5;
      const halfWidth = carriageWidth / 2 + vergeWidth + 5; // Include verge + trees

      // Calculate screen bounds of the road area
      const roadBounds = getScreenBounds(0, totalLength, -halfWidth, halfWidth, this.isoConfig);
      const roadWidth = roadBounds.right - roadBounds.left;
      const roadHeight = roadBounds.bottom - roadBounds.top;

      // Calculate zoom to fit road with padding (80% of viewport)
      const viewportWidth = this.scale.width;
      const viewportHeight = this.scale.height;
      const zoomX = (viewportWidth * 0.85) / roadWidth;
      const zoomY = (viewportHeight * 0.85) / roadHeight;
      const autoZoom = Math.min(zoomX, zoomY, 2.5); // Cap at 2.5x

      camera.setZoom(autoZoom);

      // Center on the corridor
      const midS = totalLength / 2;
      const centerPos = chainageToScreen(midS, 0, this.isoConfig);
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
    if (!this.groundLayer || !this.config?.corridor || !this.isoConfig) return;

    this.groundLayer.removeAll(true);

    const { corridor } = this.config;
    const totalLength = corridor.totalLength;
    const carriageWidth = corridor.carriageway.width;
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
    if (corridor.cycleLane?.enabled) {
      const cycleWidth = corridor.cycleLane.width;
      const side = corridor.cycleLane.side;
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
      const cycleLine = chainageToScreen(startS, cycleMinT, this.isoConfig);
      const cycleLineEnd = chainageToScreen(endS, cycleMinT, this.isoConfig);
      graphics.lineBetween(cycleLine.x, cycleLine.y, cycleLineEnd.x, cycleLineEnd.y);
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
    const leftEdgeStart = chainageToScreen(startS, -carriageWidth / 2 + 0.3, this.isoConfig);
    const leftEdgeEnd = chainageToScreen(endS, -carriageWidth / 2 + 0.3, this.isoConfig);
    graphics.lineBetween(leftEdgeStart.x, leftEdgeStart.y, leftEdgeEnd.x, leftEdgeEnd.y);

    // Right edge line
    const rightEdgeStart = chainageToScreen(startS, carriageWidth / 2 - 0.3, this.isoConfig);
    const rightEdgeEnd = chainageToScreen(endS, carriageWidth / 2 - 0.3, this.isoConfig);
    graphics.lineBetween(rightEdgeStart.x, rightEdgeStart.y, rightEdgeEnd.x, rightEdgeEnd.y);

    // ========================================
    // 5. Draw dashed centreline
    // ========================================
    const dashLength = 3; // 3m dashes
    const gapLength = 3; // 3m gaps
    graphics.lineStyle(2, 0xffffff, 0.85);

    for (let s = 0; s < totalLength; s += dashLength + gapLength) {
      const dashEnd = Math.min(s + dashLength, totalLength);
      const p1 = chainageToScreen(s, 0, this.isoConfig);
      const p2 = chainageToScreen(dashEnd, 0, this.isoConfig);
      graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    // ========================================
    // 6. Draw kerb lines (darker edge)
    // ========================================
    graphics.lineStyle(3, 0x2a3540, 1);

    // Left kerb
    const leftKerbStart = chainageToScreen(startS, -carriageWidth / 2, this.isoConfig);
    const leftKerbEnd = chainageToScreen(endS, -carriageWidth / 2, this.isoConfig);
    graphics.lineBetween(leftKerbStart.x, leftKerbStart.y, leftKerbEnd.x, leftKerbEnd.y);

    // Right kerb
    const rightKerbStart = chainageToScreen(startS, carriageWidth / 2, this.isoConfig);
    const rightKerbEnd = chainageToScreen(endS, carriageWidth / 2, this.isoConfig);
    graphics.lineBetween(rightKerbStart.x, rightKerbStart.y, rightKerbEnd.x, rightKerbEnd.y);

    this.groundLayer.add(graphics);
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

    if (!this.config.showGrid || !this.config.corridor) return;

    const { corridor } = this.config;
    const totalLength = corridor.totalLength;
    const carriageWidth = corridor.carriageway.width;
    const gridSize = 10; // 10m grid

    this.gridGraphics.lineStyle(1, 0xcccccc, 0.3);

    // Draw vertical lines (constant chainage)
    for (let s = 0; s <= totalLength; s += gridSize) {
      const p1 = chainageToScreen(s, -carriageWidth, this.isoConfig);
      const p2 = chainageToScreen(s, carriageWidth, this.isoConfig);
      this.gridGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    // Draw horizontal lines (constant offset)
    for (let t = -carriageWidth; t <= carriageWidth; t += gridSize) {
      const p1 = chainageToScreen(0, t, this.isoConfig);
      const p2 = chainageToScreen(totalLength, t, this.isoConfig);
      this.gridGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }

    // Draw chainage labels
    if (this.config.showChainageLabels) {
      for (let s = 0; s <= totalLength; s += 50) {
        const pos = chainageToScreen(s, -carriageWidth - 2, this.isoConfig);
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

    const { elements, products, selectedElementId, hoveredElementId } = this.config;
    const existingIds = new Set(Object.keys(elements));

    // Remove sprites for deleted elements
    for (const [id, sprite] of this.productSprites) {
      if (!existingIds.has(id)) {
        sprite.destroy();
        this.productSprites.delete(id);
      }
    }

    // Update or create sprites for each element
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
      const pos = chainageToScreen(
        element.position.s,
        element.position.t,
        this.isoConfig!
      );
      sprite.setPosition(pos.x, pos.y);

      // Update depth for sorting
      sprite.setDepth(calculateDepth(element.position.s, element.position.t, this.isoConfig!.scale));

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
    if (!this.sceneryLayer || !this.config?.corridor || !this.isoConfig || !this.assetsLoaded) return;

    // Clear existing trees
    this.treeSprites.forEach((tree) => tree.destroy());
    this.treeSprites = [];

    const { corridor } = this.config;
    const totalLength = corridor.totalLength;
    const carriageWidth = corridor.carriageway.width;
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

    const pos = chainageToScreen(s, t, this.isoConfig);
    const tree = this.add.sprite(pos.x, pos.y, treeType);

    // Scale trees to fit the larger tile dimensions
    tree.setScale(0.15 + Math.random() * 0.05);

    // Set origin at bottom center for proper positioning
    tree.setOrigin(0.5, 0.9);

    // Set depth for proper sorting
    tree.setDepth(calculateDepth(s, t, this.isoConfig.scale) + 100);

    this.sceneryLayer.add(tree);
    this.treeSprites.push(tree);
  }

  /**
   * Start spawning animated cars
   */
  private startTrafficAnimation(): void {
    if (!this.config?.corridor || !this.isoConfig || !this.assetsLoaded) return;

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
    if (!this.trafficLayer || !this.config?.corridor || !this.isoConfig) return;

    const { corridor } = this.config;
    const totalLength = corridor.totalLength;
    const carriageWidth = corridor.carriageway.width;

    // Pick random car type
    const carTypes = forward ? CAR_TYPES_FORWARD : CAR_TYPES_BACKWARD;
    const carType = carTypes[Math.floor(Math.random() * carTypes.length)];

    // Check if texture exists
    if (!this.textures.exists(carType)) return;

    // Lane offset (drive on left in UK)
    const laneOffset = forward ? -carriageWidth / 4 : carriageWidth / 4;

    // Start and end positions
    const startS = forward ? -20 : totalLength + 20;
    const endS = forward ? totalLength + 20 : -20;

    const startPos = chainageToScreen(startS, laneOffset, this.isoConfig);
    const endPos = chainageToScreen(endS, laneOffset, this.isoConfig);

    // Create car sprite - scaled to match larger tile dimensions
    const car = this.add.sprite(startPos.x, startPos.y, carType);
    car.setScale(0.18);
    car.setOrigin(0.5, 0.7);

    this.trafficLayer.add(car);
    this.carSprites.push(car);

    // Calculate duration based on road length (roughly 30-40 km/h)
    const duration = totalLength * 80 + 2000; // ~80ms per metre

    // Animate the car driving along the road
    this.tweens.add({
      targets: car,
      x: endPos.x,
      y: endPos.y,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        // Update depth as car moves
        if (this.isoConfig) {
          // Approximate chainage from screen position
          const progress = forward
            ? (car.x - startPos.x) / (endPos.x - startPos.x)
            : (startPos.x - car.x) / (startPos.x - endPos.x);
          const currentS = forward
            ? progress * totalLength
            : totalLength - progress * totalLength;
          car.setDepth(calculateDepth(currentS, laneOffset, this.isoConfig.scale));
        }
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

  private getIsometricQuad(
    startS: number,
    endS: number,
    minT: number,
    maxT: number
  ): Phaser.Geom.Point[] {
    if (!this.isoConfig) return [];

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
        const chainage = screenToChainage(pointer.worldX, pointer.worldY, this.isoConfig);
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
      const chainage = screenToChainage(newX, newY, this.isoConfig);

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
