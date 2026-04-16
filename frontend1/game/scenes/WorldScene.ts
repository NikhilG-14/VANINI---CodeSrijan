import { Scene, GameObjects } from 'phaser';

// Store
import { useGameStore } from '../../store/gameStore';

// Constants
import {
  HERO_SPRITE_NAME,
  UP_DIRECTION,
  DOWN_DIRECTION,
  LEFT_DIRECTION,
  RIGHT_DIRECTION,
} from '../../lib/gameConstants';

// Level data
import { LEVEL_NODES, type LevelNode } from '../../lib/progression';

// ── World layout constants ───────────────────────────────────────
const WORLD_W = 1600;
const WORLD_H = 1200;

// House pixel positions on the procedural world
const HOUSE_POSITIONS = [
  { x: 380, y: 520 },  // Storm Lab
  { x: 650, y: 320 },  // Grey House
  { x: 980, y: 180 },  // Energy Core
  { x: 820, y: 600 },  // Courthouse
  { x: 1200, y: 700 }, // Mind Library
];

// Colors per emotion
const EMOTION_COLORS: Record<string, number> = {
  anxiety:     0x3b82f6,
  depression:  0x818cf8,
  fatigue:     0x06b6d4,
  paralysis:   0xfb923c,
  overthinking:0xa855f7,
};

export default class WorldScene extends Scene {
  private hero!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
  };
  private interactionZones: Map<Phaser.GameObjects.Zone, string> = new Map();
  private currentNearNodeId: string | null = null;
  private promptText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('WorldScene');
  }

  create() {
    // ── Draw procedural world ───────────────────────────────
    this.drawWorld();

    // ── Hero ────────────────────────────────────────────────
    const start = { x: 200, y: 700 };
    this.hero = this.physics.add.sprite(start.x, start.y, HERO_SPRITE_NAME, 'walk_down_01');
    this.hero.setCollideWorldBounds(true);
    this.hero.setScale(2);
    this.hero.setDepth(10);

    this.createAnims();

    // ── Camera ──────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
    this.cameras.main.setZoom(2);

    // ── Controls ────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      e:     this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };

    // ── Houses & zones ──────────────────────────────────────
    this.createHouses();

    // ── Prompt text (floating UI, above everything) ─────────
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    }).setDepth(50).setVisible(false).setScrollFactor(0);

    // ── Sync canvas to React ─────────────────────────────────
    this.syncToReact();
  }

  // ── Procedural world drawing ───────────────────────────────
  private drawWorld() {
    const gfx = this.add.graphics();

    // Grass base
    gfx.fillStyle(0x3a7d44, 1);
    gfx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Grid texture (darker squares for visual depth)
    gfx.lineStyle(1, 0x2d6438, 0.3);
    for (let x = 0; x < WORLD_W; x += 32) {
      gfx.lineBetween(x, 0, x, WORLD_H);
    }
    for (let y = 0; y < WORLD_H; y += 32) {
      gfx.lineBetween(0, y, WORLD_W, y);
    }

    // Dirt path connecting start to houses
    gfx.fillStyle(0xb8860b, 0.5);
    const pathPoints = [
      { x: 200, y: 700 },
      ...HOUSE_POSITIONS,
    ];
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const a = pathPoints[i];
      const b = pathPoints[i + 1];
      // Draw thick path segments
      gfx.fillStyle(0xc8a06a, 0.6);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(len / 8);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        gfx.fillRect(
          a.x + dx * t - 12,
          a.y + dy * t - 12,
          24, 24
        );
      }
    }

    // Decorative trees (green circles) scattered
    const treePositions = [
      [100, 100], [400, 150], [700, 250], [1100, 100],
      [1350, 300], [200, 400], [500, 750], [900, 850],
      [1300, 900], [150, 950], [750, 1000], [1000, 1100],
      [350, 1100], [600, 100], [1400, 550], [50, 550],
    ];
    treePositions.forEach(([tx, ty]) => {
      // Trunk
      gfx.fillStyle(0x5c3a1e, 1);
      gfx.fillRect(tx - 3, ty + 6, 6, 10);
      // Canopy
      gfx.fillStyle(0x228b22, 1);
      gfx.fillEllipse(tx, ty, 28, 24);
      gfx.fillStyle(0x32cd32, 0.6);
      gfx.fillEllipse(tx - 4, ty - 4, 16, 14);
    });

    // Water pond
    gfx.fillStyle(0x1e90ff, 0.7);
    gfx.fillEllipse(500, 480, 120, 80);
    gfx.fillStyle(0x87ceeb, 0.4);
    gfx.fillEllipse(490, 475, 80, 50);

    gfx.setDepth(0);
  }

  // ── Draw houses and create interaction zones ─────────────────
  private createHouses() {
    LEVEL_NODES.forEach((node, i) => {
      const pos = HOUSE_POSITIONS[i] || { x: 100 + i * 200, y: 200 };
      const color = EMOTION_COLORS[node.emotion] ?? 0xffffff;
      const { completedZones } = useGameStore.getState();
      const isCompleted = completedZones.has(node.id);

      this.drawHouse(pos.x, pos.y, color, node.buildingEmoji, node.label, i === 0 || isCompleted);

      // Invisible trigger zone
      const zone = this.add.zone(pos.x, pos.y, 60, 60);
      this.physics.add.existing(zone, true);
      this.interactionZones.set(zone, node.id);

      this.physics.add.overlap(this.hero, zone, () => {
        this.handleNearHouse(node);
      });
    });
  }

  private drawHouse(x: number, y: number, color: number, emoji: string, label: string, unlocked: boolean) {
    const gfx = this.add.graphics().setDepth(5);
    const alpha = unlocked ? 1 : 0.55;

    // Shadow
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(x, y + 28, 56, 16);

    // Main body
    gfx.fillStyle(unlocked ? color : 0x555555, alpha);
    gfx.fillRect(x - 22, y - 18, 44, 36);

    // Roof
    gfx.fillStyle(unlocked ? this.lighten(color, 0.3) : 0x777777, alpha);
    gfx.fillTriangle(x - 28, y - 18, x + 28, y - 18, x, y - 44);

    // Door
    gfx.fillStyle(0x3c2415, alpha);
    gfx.fillRect(x - 7, y + 2, 14, 16);

    // Windows
    gfx.fillStyle(unlocked ? 0xfffde7 : 0x444444, alpha);
    gfx.fillRect(x - 19, y - 10, 10, 10);
    gfx.fillRect(x + 9, y - 10, 10, 10);

    // Chimney
    gfx.fillStyle(unlocked ? this.lighten(color, 0.4) : 0x777777, alpha);
    gfx.fillRect(x + 10, y - 50, 8, 20);

    if (unlocked) {
      // Glow halo
      gfx.fillStyle(color, 0.12);
      gfx.fillCircle(x, y - 10, 50);
    }

    // Lock icon if locked (and not first)
    if (!unlocked) {
      this.add.text(x, y - 10, '🔒', {
        fontSize: '14px',
      }).setOrigin(0.5).setDepth(6);
    }

    // Emoji label above
    this.add.text(x, y - 60, emoji, {
      fontSize: '18px',
    }).setOrigin(0.5).setDepth(6);

    // Name below
    this.add.text(x, y + 30, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '5px',
      color: unlocked ? '#ffffff' : '#888888',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);
  }

  // Simple color lightening helper
  private lighten(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((color >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (color & 0xff) + Math.round(255 * amount));
    return (r << 16) | (g << 8) | b;
  }

  private createAnims() {
    const directions = [UP_DIRECTION, DOWN_DIRECTION, LEFT_DIRECTION, RIGHT_DIRECTION];
    directions.forEach(dir => {
      if (!this.anims.exists(`walk_${dir}`)) {
        this.anims.create({
          key: `walk_${dir}`,
          frames: this.anims.generateFrameNames(HERO_SPRITE_NAME, {
            prefix: `walk_${dir}_`,
            start: 1,
            end: 3,
            zeroPad: 2,
          }),
          frameRate: 10,
          repeat: -1,
        });
      }
    });
  }

  private handleNearHouse(node: LevelNode) {
    if (this.currentNearNodeId === node.id) return;
    this.currentNearNodeId = node.id;

    const { completedZones } = useGameStore.getState();
    const isFirst = node.index === 0;
    const prevCompleted = isFirst || completedZones.size >= node.index;
    const isLocked = !isFirst && !prevCompleted;

    if (this.promptText) {
      if (isLocked) {
        this.showPrompt('🔒 LOCKED', '#ff6666');
        useGameStore.getState().addText({ key: 'locked', value: '🔒 LOCKED', config: { color: '#ff4444' } });
      } else {
        this.showPrompt('PRESS E TO ENTER', '#ffffff');
        useGameStore.getState().addText({ key: 'interact', value: 'PRESS E TO ENTER', config: { color: '#ffffff' } });
      }
    }

    useGameStore.getState().setNearZone(node);
  }

  private showPrompt(msg: string, color: string) {
    if (!this.promptText) return;
    this.promptText.setText(msg).setColor(color).setVisible(true);
    // Center on screen bottom-center
    this.promptText.setPosition(
      this.scale.width / 2 - this.promptText.width / 2,
      this.scale.height - 40
    );
  }

  private syncToReact() {
    const { setGameWidth, setGameHeight, setGameZoom, setGameCanvasElement } = useGameStore.getState();
    const zoom = this.cameras.main.zoom;
    setGameZoom(zoom);
    setGameWidth(this.scale.width);
    setGameHeight(this.scale.height);
    setGameCanvasElement(this.game.canvas);
  }

  update() {
    const speed = 180;
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    const { dialogOpen } = useGameStore.getState();
    if (dialogOpen) return;

    let dir = '';

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      body.setVelocityX(-speed);
      dir = LEFT_DIRECTION;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      body.setVelocityX(speed);
      dir = RIGHT_DIRECTION;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      body.setVelocityY(-speed);
      dir = dir || UP_DIRECTION;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      body.setVelocityY(speed);
      dir = dir || DOWN_DIRECTION;
    }

    if (dir) {
      this.hero.anims.play(`walk_${dir}`, true);
    } else {
      this.hero.anims.stop();
    }

    // E key interaction
    if (Phaser.Input.Keyboard.JustDown(this.wasd.e) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      const { nearZone, completedZones } = useGameStore.getState();
      if (nearZone) {
        const isFirst = nearZone.index === 0;
        const prevCompleted = isFirst || completedZones.size >= nearZone.index;
        if (prevCompleted) {
          useGameStore.getState().enterZone(nearZone.id);
        }
      }
    }

    // Proximity exit detection
    if (this.currentNearNodeId) {
      let stillNear = false;
      for (const [zone, id] of this.interactionZones.entries()) {
        if (id === this.currentNearNodeId) {
          const dist = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, zone.x, zone.y);
          if (dist < 50) {
            stillNear = true;
          }
          break;
        }
      }

      if (!stillNear) {
        this.currentNearNodeId = null;
        this.promptText?.setVisible(false);
        useGameStore.getState().setNearZone(null);
        useGameStore.getState().removeText('locked');
        useGameStore.getState().removeText('interact');
      }
    }

    // Update map pos
    useGameStore.getState().updateMapPos({ x: this.hero.x, y: this.hero.y });
  }
}
