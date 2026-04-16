import { Scene, GameObjects, Math as PhaserMath } from 'phaser';
import { LEVEL_NODES, PATH_WAYPOINTS, type LevelNode } from '../../lib/progression';

export default class WorldScene extends Scene {
  private hero: GameObjects.Sprite | null = null;
  private waypoints: { x: number; y: number }[] = [];
  private currentLevelIndex = 0;
  private isMoving = false;

  constructor() {
    super('WorldScene');
  }

  preload() {
    // Load tileset and atlas
    this.load.setBaseURL('/');
    this.load.image('village', 'assets/tilesets/village.png');
    this.load.atlas('hero', 'assets/atlases/hero.png', 'assets/atlases/hero.json');
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── Background ──
    // Create a lush green grass background
    this.add.rectangle(0, 0, width, height, 0x166534).setOrigin(0);

    // ── Path ──
    // We draw the path as a series of rectangles or using a graphics object
    const graphics = this.add.graphics();
    graphics.lineStyle(16, 0xd97706, 0.8);
    graphics.beginPath();
    PATH_WAYPOINTS.forEach((p, i) => {
      const px = (p.x / 100) * width;
      const py = (p.y / 100) * height;
      if (i === 0) graphics.moveTo(px, py);
      else graphics.lineTo(px, py);
    });
    graphics.strokePath();

    // ── Landmarks (Buildings) ──
    LEVEL_NODES.forEach((node, i) => {
      const nx = (node.x / 100) * width;
      const ny = (node.y / 100) * height;

      // Building Base/Shadow
      this.add.circle(nx, ny + 20, 30, 0x000000, 0.2);

      // Building "Sprite" (using Emoji or a placeholder for now, 
      // but styled to look like a node)
      const container = this.add.container(nx, ny);
      
      const glow = this.add.circle(0, 0, 45, parseInt(node.color.replace('#', '0x'), 16), 0.1);
      const bg = this.add.circle(0, 0, 35, 0x000000, 0.4);
      const label = this.add.text(0, 0, node.buildingEmoji, { fontSize: '40px' }).setOrigin(0.5);
      
      container.add([glow, bg, label]);
      
      // Floating animation for current node
      this.tweens.add({
        targets: container,
        y: ny - 10,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });

      // Name label
      this.add.text(nx, ny + 50, `LEVEL ${i+1}: ${node.label}`, {
        fontSize: '10px',
        fontFamily: 'monospace',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5);
    });

    // ── Hero ──
    const startNode = LEVEL_NODES[0];
    this.hero = this.physics.add.sprite((startNode.x / 100) * width, (startNode.y / 100) * height, 'hero', 'walk_down_01');
    this.hero.setScale(2);
    this.hero.setDepth(10);

    // Create hero animations
    ['down', 'up', 'left', 'right'].forEach(dir => {
      this.anims.create({
        key: `walk_${dir}`,
        frames: this.anims.generateFrameNames('hero', {
          prefix: `walk_${dir}_`,
          suffix: '',
          start: 1,
          end: 3,
          zeroPad: 2
        }),
        frameRate: 8,
        repeat: -1
      });
    });

    // ── Interaction ──
    // Listen for events from React to move the player
    this.game.events.on('move-to-level', (index: number) => {
        this.walkToLevel(index);
    });
  }

  walkToLevel(index: number) {
    if (this.isMoving || !this.hero) return;
    this.isMoving = true;

    const targetNode = LEVEL_NODES[index];
    const { width, height } = this.cameras.main;
    const tx = (targetNode.x / 100) * width;
    const ty = (targetNode.y / 100) * height;

    // Simple linear walk for now (can be waypoint follow later)
    const dx = tx - this.hero.x;
    const dy = ty - this.hero.y;
    
    let dir = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
    } else {
        dir = dy > 0 ? 'down' : 'up';
    }

    this.hero.anims.play(`walk_${dir}`, true);

    this.tweens.add({
      targets: this.hero,
      x: tx,
      y: ty,
      duration: 1500,
      ease: 'Linear',
      onComplete: () => {
        this.hero?.anims.stop();
        this.isMoving = false;
        this.game.events.emit('move-complete', index);
      }
    });
  }
}
