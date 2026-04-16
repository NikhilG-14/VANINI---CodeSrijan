import { Scene } from 'phaser';

export default class BootScene extends Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // We use a procedural world (no Tiled map needed)
    // Load hero atlas from template assets
    this.load.atlas('hero', 'assets/atlases/hero.png', 'assets/atlases/hero.json');

    // World Map Assets
    this.load.image('world_map_static', 'assets/world_map_static.png');

    // Virtual Gamepad
    this.load.image('a_button', 'assets/images/a_button.png');
    this.load.image('b_button', 'assets/images/b_button.png');
    this.load.image('d_pad_button', 'assets/images/d_pad_button.png');
  }

  create() {
    // Start the world immediately (all graphics are procedural)
    this.scene.start('WorldScene');
  }
}
