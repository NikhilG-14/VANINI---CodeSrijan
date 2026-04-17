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
import { LEVEL_NODES, PATH_WAYPOINTS, PATH_SEGMENTS, type LevelNode } from '../../lib/progression';

// ── World layout constants ───────────────────────────────────────
// Reduced from 5000×4000 → tight enough so nodes feel close but
// still give a "world map" sense at 1.2× zoom on a 1280×720 canvas.
const WORLD_W = 1536;
const WORLD_H = 1024;

// Helper to get pixel position from progression percentages
const getPixelPos = (pctX: number, pctY: number) => ({
  x: (pctX / 100) * WORLD_W,
  y: (pctY / 100) * WORLD_H,
});

// Colors per cognitive category
const EMOTION_COLORS: Record<string, number> = {
  attention: 0x3b82f6,
  memory: 0x8b5cf6,
  impulsivity: 0xef4444,
  flexibility: 0x10b981,
  risk_behavior: 0xf59e0b,
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
  private lastStepTime: number = 0;
  private isLeftFoot: boolean = true;
  private breadcrumbGroup!: Phaser.GameObjects.Group;
  private currentPathCount: number = -1;


  constructor() {
    super('WorldScene');
  }

  create() {
    // ── Draw procedural world ───────────────────────────────
    this.drawWorld();

    // ── Hero ────────────────────────────────────────────────
    const startNode = LEVEL_NODES[0];
    const startPos = getPixelPos(startNode.x, startNode.y);
    this.hero = this.physics.add.sprite(startPos.x, startPos.y, HERO_SPRITE_NAME, 'walk_down_01');
    this.hero.setCollideWorldBounds(true);
    this.hero.setScale(2.0); // Larger hero for better visibility
    this.hero.setDepth(10);

    this.createAnims();

    // ── High-Clarity Camera View ──────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Background Image
    this.add.image(0, 0, 'world_map_static').setOrigin(0).setDisplaySize(WORLD_W, WORLD_H).setDepth(-1);

    // Camera following character with high zoom for clarity
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.hero, true, 0.08, 0.08); // Follow character
    cam.setZoom(0.5); // Tweak: 1.0 provides native resolution clarity and a slightly wider view

    // ── Controls ────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      e: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };

    // ── Houses & zones ──────────────────────────────────────
    this.createHouses();

    // ── Prompt text (fixed HUD, scrollFactor 0) ─────────────
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',           // was 8px – readable at 1.2× zoom
      color: '#ffffff',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 5 },
    }).setDepth(50).setVisible(false).setScrollFactor(0);

    // ── Sync canvas to React ─────────────────────────────────
    this.syncToReact();

    // ── Interaction Prompts ─────────────────────────────
    // Marker logic or other world-level UI can go here
    this.breadcrumbGroup = this.add.group();
    this.drawBreadcrumbPath();
  }

  private drawWorld() {
    // Procedural drawing is disabled in favor of the static background image
  }

  private drawTree(gfx: Phaser.GameObjects.Graphics, tx: number, ty: number) {
    gfx.fillStyle(0x5c3a1e, 1);
    gfx.fillRect(tx - 2, ty + 4, 4, 8);
    gfx.fillStyle(0x228b22, 1);
    gfx.fillEllipse(tx, ty, 22, 18);
    gfx.fillStyle(0x32cd32, 0.45);
    gfx.fillEllipse(tx - 3, ty - 3, 12, 11);
  }

  private createHouses() {
    LEVEL_NODES.forEach((node, i) => {
      const pos = getPixelPos(node.x, node.y);
      const { completedZones } = useGameStore.getState();
      const isCompleted = completedZones.has(node.id);

      // Houses are in the background image now. 
      // We just need the interaction zones and a small floaty label.
      this.drawMapLabel(pos.x, pos.y, node.label, node.color, i === 0 || isCompleted);

      const zone = this.add.zone(pos.x, pos.y, 140, 140);
      this.physics.add.existing(zone, true);
      this.interactionZones.set(zone, node.id);
      this.physics.add.overlap(this.hero, zone, () => this.handleNearHouse(node));
    });
  }

  private drawMapLabel(x: number, y: number, label: string, color: string, unlocked: boolean) {
    this.add.text(x, y + 45, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '18px',           // Significantly larger base size for clarity at 0.5x zoom
      color: unlocked ? '#ffffff' : '#888888',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 3,                // High resolution for sharp sub-pixel rendering
    }).setOrigin(0.5).setDepth(6);
  }

  private drawHouse() {
    // Disabled in favor of static image
  }

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

    const levelNum = node.index + 1;

    if (this.promptText) {
      if (isLocked) {
        const msg = `🔒 LOCKED: LEVEL ${levelNum}`;
        this.showPrompt(msg, '#ff6666');
        useGameStore.getState().addText({
          key: 'locked',
          value: msg,
          config: { color: '#ff4444' }
        });
      } else {
        const msg = `ENTER LEVEL ${levelNum}`;
        this.showPrompt(`PRESS E TO ${msg}`, '#ffffff');
        useGameStore.getState().addText({
          key: 'interact',
          value: msg,
          config: { color: '#ffffff', keycap: 'E' }
        });
      }
    }

    useGameStore.getState().setNearZone(node);
  }

  private showPrompt(msg: string, color: string) {
    if (!this.promptText) return;
    this.promptText.setText(msg).setColor(color).setVisible(true);
    this.promptText.setPosition(
      this.scale.width / 2 - this.promptText.width / 2,
      this.scale.height - 48,
    );
  }

  private syncToReact() {
    const { setGameWidth, setGameHeight, setGameZoom, setGameCanvasElement } = useGameStore.getState();
    setGameZoom(this.cameras.main.zoom);
    setGameWidth(this.scale.width);
    setGameHeight(this.scale.height);
    setGameCanvasElement(this.game.canvas);
  }

  update() {
    // ── Navigation Breadcrumbs ────────────────────────────
    const { completedZones: currentZones } = useGameStore.getState();
    if (this.currentPathCount !== currentZones.size) {
      this.drawBreadcrumbPath();
    }

    const speed = 220;   // was 180 – snappier on the smaller world
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    const { dialogOpen } = useGameStore.getState();
    if (dialogOpen) return;

    let dir = '';

    if (this.cursors.left.isDown || this.wasd.left.isDown) { body.setVelocityX(-speed); dir = LEFT_DIRECTION; }
    else if (this.cursors.right.isDown || this.wasd.right.isDown) { body.setVelocityX(speed); dir = RIGHT_DIRECTION; }

    if (this.cursors.up.isDown || this.wasd.up.isDown) { body.setVelocityY(-speed); dir = dir || UP_DIRECTION; }
    else if (this.cursors.down.isDown || this.wasd.down.isDown) { body.setVelocityY(speed); dir = dir || DOWN_DIRECTION; }

    if (dir) {
      this.hero.anims.play(`walk_${dir}`, true);
      this.playStepSound();
    }
    else this.hero.anims.stop();

    // E / Space interaction
    if (
      Phaser.Input.Keyboard.JustDown(this.wasd.e) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space)
    ) {
      const { nearZone, completedZones } = useGameStore.getState();
      if (nearZone) {
        const isFirst = nearZone.index === 0;
        const prevCompleted = isFirst || completedZones.size >= nearZone.index;
        if (prevCompleted) {
          this.playSuccessSound();
          useGameStore.getState().enterZone(nearZone.id);
        } else {
          this.playErrorSound();
        }
      }
    }

    // Proximity exit – threshold matches the zone half-size (80px)
    if (this.currentNearNodeId) {
      let stillNear = false;
      for (const [zone, id] of this.interactionZones.entries()) {
        if (id === this.currentNearNodeId) {
          if (Phaser.Math.Distance.Between(this.hero.x, this.hero.y, zone.x, zone.y) < 80) {
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
  }

  private playStepSound() {
    if (this.time.now - this.lastStepTime < 300) return;
    this.lastStepTime = this.time.now;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!(window as any)._stepAudioCtx) (window as any)._stepAudioCtx = new AudioContextClass();
      const audioCtx = (window as any)._stepAudioCtx as AudioContext;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      // Ultra-short, tiny 'tick' (like a very subtle hi-hat)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.02, audioCtx.currentTime); // Very quiet
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02); // 20ms long

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.02);

    } catch (e) {
      console.warn("Footstep sound failed:", e);
    }
  }



  private playSuccessSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!(window as any)._stepAudioCtx) (window as any)._stepAudioCtx = new AudioContextClass();
      const audioCtx = (window as any)._stepAudioCtx as AudioContext;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      // Cheerful ascending "ding"
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { }
  }

  private playErrorSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!(window as any)._stepAudioCtx) (window as any)._stepAudioCtx = new AudioContextClass();
      const audioCtx = (window as any)._stepAudioCtx as AudioContext;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      // Harsh "buzz" sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) { }
  }

  private drawBreadcrumbPath() {
    this.breadcrumbGroup.clear(true, true);
    
    const { completedZones } = useGameStore.getState();
    const count = completedZones.size;
    const segmentIndices = PATH_SEGMENTS[count];

    if (!segmentIndices || segmentIndices.length < 2) return;

    this.currentPathCount = count;

    // Use the next level's color for the breadcrumbs
    const nextLevel = LEVEL_NODES[Math.min(count, LEVEL_NODES.length - 1)];
    const colorHex = nextLevel.color || '#ffffff';
    // Handle hex parsing correctly for Phaser
    const color = parseInt(colorHex.replace('#', '0x'), 16);

    // Create breadcrumb dots along the path segments
    for (let i = 0; i < segmentIndices.length - 1; i++) {
      const p1 = getPixelPos(PATH_WAYPOINTS[segmentIndices[i]].x, PATH_WAYPOINTS[segmentIndices[i]].y);
      const p2 = getPixelPos(PATH_WAYPOINTS[segmentIndices[i + 1]].x, PATH_WAYPOINTS[segmentIndices[i + 1]].y);

      const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const density = 25; // Pixels between breadcrumbs
      const steps = Math.floor(distance / density);

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = Phaser.Math.Linear(p1.x, p2.x, t);
        const y = Phaser.Math.Linear(p1.y, p2.y, t);

        const dot = this.add.circle(x, y, 4, color, 0.6);
        dot.setDepth(5);
        this.breadcrumbGroup.add(dot);

        // Individual pulse animation for each breadcrumb
        this.tweens.add({
          targets: dot,
          scale: { from: 0.8, to: 1.2 },
          alpha: { from: 0.3, to: 0.8 },
          duration: 1200 + Math.random() * 800,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 2000
        });
      }
    }
  }
}