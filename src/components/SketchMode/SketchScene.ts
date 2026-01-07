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

export class SketchScene extends Phaser.Scene {
  private config: SketchSceneConfig | null = null;
  private sceneEvents: SketchSceneEvents | null = null;
  private isoConfig: IsometricConfig | null = null;

  // Graphics layers
  private groundLayer: Phaser.GameObjects.Container | null = null;
  private gridLayer: Phaser.GameObjects.Container | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private productLayer: Phaser.GameObjects.Container | null = null;
  private uiLayer: Phaser.GameObjects.Container | null = null;

  // Sprite cache
  private productSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  // Interaction state
  private draggedElement: string | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super({ key: 'SketchScene' });
  }

  // ======================================================================
  // Lifecycle
  // ======================================================================

  create(): void {
    // Create layers (render order: ground -> grid -> products -> UI)
    this.groundLayer = this.add.container(0, 0);
    this.gridLayer = this.add.container(0, 0);
    this.gridGraphics = this.add.graphics();
    this.gridLayer.add(this.gridGraphics);
    this.productLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    // Set up camera
    this.cameras.main.setBackgroundColor(0xf0f4f8);

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

    // Update camera
    this.updateCamera();

    // Render layers
    this.renderGround();
    this.renderGrid();
    this.renderProducts();
  }

  // ======================================================================
  // Rendering
  // ======================================================================

  private updateCamera(): void {
    if (!this.config) return;

    const camera = this.cameras.main;
    camera.setZoom(this.config.zoom);
    camera.setScroll(
      this.config.cameraOffset.x - this.scale.width / 2,
      this.config.cameraOffset.y - this.scale.height / 2
    );
  }

  private renderGround(): void {
    if (!this.groundLayer || !this.config?.corridor || !this.isoConfig) return;

    this.groundLayer.removeAll(true);

    const { corridor } = this.config;
    const totalLength = corridor.totalLength;
    const carriageWidth = corridor.carriageway.width;

    // Draw carriageway as a series of isometric tiles
    const graphics = this.add.graphics();

    // Calculate bounds
    const startS = 0;
    const endS = totalLength;
    const minT = -carriageWidth / 2 - 2; // Extra margin
    const maxT = carriageWidth / 2 + 2;

    // Draw carriageway polygon
    const points = this.getIsometricQuad(startS, endS, -carriageWidth / 2, carriageWidth / 2);
    graphics.fillStyle(COLOURS.carriageway, 1);
    graphics.fillPoints(points, true);

    // Draw centreline
    graphics.lineStyle(2, COLOURS.centreline, 0.8);
    const centreStart = chainageToScreen(startS, 0, this.isoConfig);
    const centreEnd = chainageToScreen(endS, 0, this.isoConfig);
    graphics.lineBetween(centreStart.x, centreStart.y, centreEnd.x, centreEnd.y);

    // Draw cycle lane if present
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
      graphics.fillStyle(COLOURS.cycleLane, 0.6);
      graphics.fillPoints(cyclePoints, true);
    }

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

    // Calculate isometric dimensions
    const width = Math.max(32, spriteConfig.gridWidth * TILE_WIDTH);
    const height = Math.max(16, spriteConfig.gridLength * TILE_HEIGHT);
    const depth = spriteConfig.heightPixels;

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

      // Start drag
      this.draggedElement = elementId;
      const hitContainer = productHit as Phaser.GameObjects.Container;
      this.dragOffset = {
        x: pointer.worldX - hitContainer.x,
        y: pointer.worldY - hitContainer.y,
      };
    } else {
      // Background click
      this.sceneEvents.onElementSelect(null);

      // Convert to chainage coordinates
      const chainage = screenToChainage(
        pointer.worldX,
        pointer.worldY,
        this.isoConfig
      );
      this.sceneEvents.onBackgroundClick(chainage.s, chainage.t);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.sceneEvents || !this.isoConfig) return;

    // Handle drag
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
