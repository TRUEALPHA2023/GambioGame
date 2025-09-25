import Phaser from 'phaser';
import TableScene from '../TableScene';

const playerCount = parseInt(prompt("How many players? (2-4)", "2") || "2", 10);

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [TableScene]
};

const game = new Phaser.Game(config);

game.scene.start('TableScene', {
    playerCount: Math.min(Math.max(playerCount, 2), 4)
});