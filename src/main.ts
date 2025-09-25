// In your main.ts or game.ts file

import Phaser from 'phaser';
import TableScene from '../TableScene';

function startGame(isOnline: boolean, playerCount: number) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: 'game-container'
    },
    scene: [
      class extends TableScene {
        constructor() {
          super();
          this.isOnline = isOnline;
          this.playerCount = playerCount;
        }
      }
    ]
  };
  new Phaser.Game(config);
}

window.onload = () => {
  const mode = window.prompt("Enter 'online' for online multiplayer, or anything else for hotseat:");
  let playerCount = 2;
  if (mode !== 'online') {
    playerCount = parseInt(window.prompt("How many players? (2-5)", "2") || "2", 10);
  }
  startGame(mode === 'online', playerCount);
};