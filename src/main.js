import Phaser from 'phaser';
import { GAME } from './config.js';
import { StartScene, PlayScene, ResultScene } from './scenes.js';
['touchmove','gesturestart','dblclick','contextmenu'].forEach(e=>document.addEventListener(e,ev=>ev.preventDefault(),{passive:false}));
window.__game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#1a0f2e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME.width, height: GAME.height },
  input: { activePointers: 4 },
  scene: [StartScene, PlayScene, ResultScene],
});
