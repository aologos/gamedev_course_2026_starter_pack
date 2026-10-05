import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { COLORS, VIEW_HEIGHT, VIEW_WIDTH, WORLD_GRAVITY } from './constants';

export function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    backgroundColor: `#${COLORS.sky.toString(16).padStart(6, '0')}`,
    // Физика обязательна: без этого блока this.physics в сцене будет undefined,
    // даже если TypeScript ничего не заметит.
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: WORLD_GRAVITY },
        debug: false,
      },
    },
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return new Phaser.Game(config);
}
