// 所有关卡数值集中在这里，测试阶段按实测通过率调整
export const GAME = { width: 720, height: 1280, countdown: 3, grid: 3 };
export const SCORE = { ghost: 10, gold: 50, lanternPenalty: 20, lanternTimePenalty: 2, comboThreshold: 5, comboBonus: 5 };
export const LEVELS = [
  { id: 1, name: '第一关 黄昏墓地', duration: 30, passScore: 200, maxActive: [1, 2], stay: 1.2, stayFinal: 1.2,
    interval: 0.8, lanternRatio: 0.10, goldCount: 2, goldStay: 0.6, wave: null, bg: 'bg1' },
  { id: 2, name: '第二关 地狱模式', duration: 30, passScore: 900, maxActive: [3, 4], stay: 0.7, stayFinal: 0.45,
    interval: 0.35, lanternRatio: 0.30, goldCount: 3, goldStay: 0.4, wave: { lastSeconds: 10, speedMul: 2 }, bg: 'bg2' },
];
export const TITLES = [ // 按得分从高到低匹配；cleared 优先
  { cleared: true, text: '通关第二关的狠人' },
  { min: 600, text: '驱鬼大师' },
  { min: 300, text: '见习驱鬼人' },
  { min: 0, text: '被鬼追着跑' },
];
