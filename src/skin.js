// 美术内联为 data URI 打进 JS：小红书容器若以 file:// 打开，XHR 读外部文件会被拦截
import atlasPng from './art/atlas.png?inline';
import atlasJson from './art/atlas.json';
import bg1 from './art/bg_level1.jpg?inline';
import bg2 from './art/bg_level2.jpg?inline';
import bgStart from './art/bg_start.jpg?inline';
import uiButton from './art/ui_button.png?inline';
import uiPanel from './art/ui_panel.png?inline';
import uiCard from './art/ui_card.png?inline';
// 换皮配置：圣诞版替换此文件（或改为图集 key）即可，玩法代码不动
export const SKIN = {
  title: '南瓜夜驱鬼', subtitle: '点小鬼！别碰南瓜灯！',
  // 美术批次1：图集帧前缀 + 背景图
  atlas: { key: 'atlas', png: atlasPng, json: atlasJson, frameSize: 200, displaySize: 150,
    tomb: { frame: 'tomb', displaySize: 210, holeX: 100, holeY: 105 } }, // holeX/Y：洞口中心在 200px 帧内的像素坐标
  bgImages: { bg1, bg2, bgStart, uiButton, uiPanel, uiCard },
  // ui_card.png 顶部混入了别的素材（0-40 行）+ 透明空白，只取 y=95 起的卡框
  cardCrop: { x: 0, y: 95, w: 600, h: 388 },
  frames: { ghost: 'ghost', gold: 'gold', lantern: 'pumpkin' },
  bg1: 0x3a2350, bg2: 0x120a22, tomb: 0x6b6b7b, hole: 0x0b0614,
  ghost: { color: 0xffffff, eye: 0x222222, shape: 'ghost' },
  gold: { color: 0xffd23f, eye: 0x7a4b00, shape: 'ghost' },
  lantern: { color: 0xff7a1a, eye: 0x2a1000, shape: 'lantern' },
  accent: '#ff9a3c', text: '#ffffff', font: '"Arial Rounded MT Bold","PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans CJK SC",sans-serif', // 系统字体，离线可用
  stroke: '#3b1458', titleColor: '#ff9a3c',
  waveText: '鬼潮来袭！', hellText: '地狱模式来了',
  shareLine: '只有极少数人能通关第二关，你行吗？',
};
