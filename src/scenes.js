import Phaser from 'phaser';
import { GAME, LEVELS, SCORE, TITLES } from './config.js';
import { SKIN } from './skin.js';
import { addFollowButton } from './follow.js';
import { addShareButton } from './share.js';
const T = (s, x, y, str, size, color = SKIN.text) =>
  s.add.text(x, y, str, { fontFamily: SKIN.font, fontStyle: 'bold', fontSize: size + 'px', color, align: 'center', stroke: SKIN.stroke, strokeThickness: Math.max(4, Math.round(size / 7)) }).setOrigin(0.5);
function button(s, x, y, label, cb) {
  const b = s.add.image(x, y, 'uiButton').setInteractive();
  T(s, x, y - 4, label, 46);
  b.on('pointerdown', () => { b.disableInteractive(); cb(); });
  return b;
}
export class StartScene extends Phaser.Scene {
  constructor() { super('Start'); }
  preload() {
    const a = SKIN.atlas; this.load.atlas(a.key, a.png, a.json);
    for (const [k, v] of Object.entries(SKIN.bgImages)) this.load.image(k, v);
  }
  create() {
    this.cameras.main.setBackgroundColor(SKIN.bg1);
    this.add.image(360, 640, 'bgStart').setDisplaySize(GAME.width, GAME.height);
    T(this, 360, 200, SKIN.title, 96, SKIN.titleColor);
    T(this, 360, 310, SKIN.subtitle + '\n两关闯关，每关 30 秒', 34);
    button(this, 360, Math.round(GAME.height * 0.5), '开始游戏', () => this.scene.start('Play', { level: 0, total: 0, bestCombo: 0 }));
  }
}
export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  init(d) { // 每次进入都完整重置状态（验收 #6/#10）
    this.levelIdx = d.level; this.cfg = LEVELS[d.level]; this.carry = d;
    this.score = 0; this.combo = 0; this.bestCombo = 0; this.timeLeft = this.cfg.duration;
    this.running = false; this.paused = false; this.startAt = 0; this.pausedMs = 0; this.pauseAt = 0; this.timePenalty = 0; this.spawnAcc = 0; this.goldLeft = this.cfg.goldCount;
    this.holes = []; this.waveOn = false; this.ended = false;
  }
  create() {
    const c = this.cfg; this.cameras.main.setBackgroundColor(SKIN[c.bg]);
    if (this.textures.exists(c.bg)) this.add.image(360, 640, c.bg).setDisplaySize(GAME.width, GAME.height).setDepth(-2);
    this.hud = T(this, 360, 70, '', 36); this.hud.setDepth(10);
    const ox = 140, oy = 380, gap = 220;
    for (let i = 0; i < 9; i++) {
      const x = ox + (i % 3) * gap, y = oy + Math.floor(i / 3) * 250;
      const tb = SKIN.atlas.tomb, ts = tb.displaySize / SKIN.atlas.frameSize;
      this.add.image(x, y, SKIN.atlas.key, tb.frame).setScale(ts);
      const hx = x + (tb.holeX - SKIN.atlas.frameSize / 2) * ts, hy = y + (tb.holeY - SKIN.atlas.frameSize / 2) * ts;
      this.holes.push({ x: hx, y: hy, ent: null }); // 洞口中心：精灵和命中圆共用
    }
    // 统一由场景处理点击：每个 pointerdown 只命中一个对象，被命中对象立即失效 → 多指不重复计分
    this.input.on('pointerdown', (p) => this.onTap(p));
    this.onVis = () => { if (document.hidden) this.pauseGame(); else this.resumeGame(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.events.once('shutdown', () => { document.removeEventListener('visibilitychange', this.onVis); this.input.removeAllListeners(); this.tweens.killAll(); this.time.removeAllEvents(); });
    this.flash = this.add.rectangle(360, 640, 720, 1280, 0xff0000, 0).setDepth(20);
    this.startCountdown();
  }
  startCountdown() {
    const pre = this.levelIdx === 1 ? SKIN.hellText + '\n' : '';
    // 倒计时也用墙钟 + 暂停补偿（Phaser Clock 暂停后恢复不可靠）
    this.cdText = T(this, 360, 640, '', 90, SKIN.accent).setDepth(30); this.cdPre = pre;
    this.cdStart = performance.now(); this.pausedMs = 0;
    this.updateHud();
  }
  pauseGame() { if (this.paused || this.ended) return; this.paused = true; this.pauseAt = performance.now(); this.time.paused = true; this.tweens.pauseAll();
    this.pauseTxt = T(this, 360, 640, '已暂停\n点击继续', 60).setDepth(40); }
  resumeGame() { /* 回到前台后等待玩家点击继续，计时不偷跑 */ }
  onTap(p) {
    if (this.paused) { this.paused = false; this.pausedMs += performance.now() - this.pauseAt; this.time.paused = false; this.tweens.resumeAll(); this.pauseTxt?.destroy(); return; }
    if (!this.running || this.ended) return;
    let best = null, bd = 1e9;
    for (const h of this.holes) { const e = h.ent; if (!e || e.hit) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y); if (d < 95 && d < bd) { bd = d; best = h; } } // 命中半径 95 设计像素 ≫ 44px
    if (!best) { this.combo = 0; this.updateHud(); return; }
    const e = best.ent; e.hit = true;
    if (e.kind === 'lantern') { this.score = Math.max(0, this.score - SCORE.lanternPenalty); this.timePenalty += SCORE.lanternTimePenalty; this.timeLeft = Math.max(0, this.timeLeft - SCORE.lanternTimePenalty); this.combo = 0; this.fx(e.x, e.y, 'fx_miss', '-' + SCORE.lanternPenalty); }
    else { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      let add = e.kind === 'gold' ? SCORE.gold : SCORE.ghost; if (this.combo > SCORE.comboThreshold) add += SCORE.comboBonus;
      this.score += add; this.fx(e.x, e.y, this.combo > SCORE.comboThreshold ? 'fx_combo' : 'fx_hit', '+' + add + (this.combo > SCORE.comboThreshold ? ` 连击${this.combo}` : '')); }
    this.removeEnt(best, true); this.updateHud();
  }
  fx(x, y, frame, txt) { // 特效：图集静帧 + 缩放淡出（无帧动画）
    const c = this.add.image(x, y, SKIN.atlas.key, frame).setScale(0.5).setDepth(5);
    this.tweens.add({ targets: c, scale: 1.1, alpha: 0, duration: 350, onComplete: () => c.destroy() });
    const t = T(this, x, y - 80, txt, 34).setDepth(6); this.tweens.add({ targets: t, y: y - 150, alpha: 0, duration: 500, onComplete: () => t.destroy() });
  }
  makeEnt(h, kind) {
    const a = SKIN.atlas, pre = SKIN.frames[kind], sc = a.displaySize / a.frameSize;
    const g = this.add.sprite(h.x, h.y, a.key, pre + '_rise').setScale(sc * 0.3);
    this.tweens.add({ targets: g, scale: sc, duration: 90, onComplete: () => { if (g.active && !g.hit) g.setFrame(pre + '_idle'); } });
    g.kind = kind; g.pre = pre; g.hit = false; return g;
  }
  removeEnt(h, wasHit) {
    const e = h.ent; if (!e) return; h.ent = null; this.tweens.killTweensOf(e);
    if (!wasHit) { e.destroy(); return; }
    e.setFrame(e.pre + '_hit');
    this.tweens.add({ targets: e, alpha: 0, duration: 180, onComplete: () => e.destroy() });
  }
  spawn(elapsed) {
    const c = this.cfg, active = this.holes.filter(h => h.ent).length;
    const max = elapsed < c.duration / 2 ? c.maxActive[0] : c.maxActive[1];
    if (active >= max) return;
    const free = this.holes.filter(h => !h.ent); if (!free.length) return;
    const h = Phaser.Utils.Array.GetRandom(free);
    let kind = Math.random() < c.lanternRatio ? 'lantern' : 'ghost';
    const goldDue = this.goldLeft > 0 && elapsed > (c.goldCount - this.goldLeft + 1) * c.duration / (c.goldCount + 1);
    if (goldDue) { kind = 'gold'; this.goldLeft--; }
    let stay = this.waveOn ? c.stayFinal : c.stay; if (kind === 'gold') stay = c.goldStay;
    h.ent = this.makeEnt(h, kind); h.ent.life = stay;
  }
  update(_, dtMs) {
    if (this.paused || this.ended) return;
    if (!this.running) {
      const left = GAME.countdown - (performance.now() - this.cdStart - this.pausedMs) / 1000;
      if (left > 0) { this.cdText.setText(this.cdPre + Math.ceil(left)); return; }
      this.cdText.destroy(); this.running = true; this.startAt = performance.now(); this.pausedMs = 0; return;
    }
    const dt = Math.min(dtMs, 100) / 1000, c = this.cfg;
    // 墙钟计时：真实时间 - 暂停时长 + 南瓜灯扣时，低帧率也严格 30s
    this.timeLeft = c.duration - (performance.now() - this.startAt - this.pausedMs) / 1000 - this.timePenalty; const elapsed = c.duration - this.timeLeft;
    if (c.wave && !this.waveOn && this.timeLeft <= c.wave.lastSeconds) {
      this.waveOn = true; const w = T(this, 360, 230, SKIN.waveText, 64, '#ff4444').setDepth(25);
      this.tweens.add({ targets: w, alpha: 0, duration: 1500, onComplete: () => w.destroy() });
      this.cameras.main.shake(400, 0.01);
      this.swarm = this.add.image(360, 640, SKIN.atlas.key, 'fx_swarm').setScale(1).setAlpha(0).setDepth(-1);
      this.tweens.add({ targets: this.swarm, scale: 3.6, alpha: 0.35, duration: 600 });
      this.tweens.add({ targets: this.swarm, angle: 360, duration: 4000, repeat: -1 });
      this.tweens.add({ targets: this.flash, fillAlpha: 0.25, duration: 300, yoyo: true, repeat: 3 });
    }
    const interval = c.interval / (this.waveOn ? c.wave.speedMul : 1);
    this.spawnAcc += dt; while (this.spawnAcc >= interval) { this.spawnAcc -= interval; this.spawn(elapsed); }
    for (const h of this.holes) if (h.ent) { h.ent.life -= dt; if (h.ent.life <= 0) this.removeEnt(h); }
    if (this.waveOn && Math.random() < 0.02) this.cameras.main.shake(120, 0.004);
    if (this.timeLeft <= 0) this.finish();
    this.updateHud();
  }
  updateHud() { this.hud.setText(`${this.cfg.name}   ⏱ ${Math.max(0, Math.ceil(this.timeLeft))}s\n分数 ${this.score} / ${this.cfg.passScore}   连击 ${this.combo}`); }
  finish() {
    this.ended = true; this.running = false; for (const h of this.holes) this.removeEnt(h);
    const passed = this.score >= this.cfg.passScore;
    this.scene.start('Result', { l1Score: this.levelIdx === 0 ? this.score : this.carry.l1Score, level: this.levelIdx, passed, score: this.score, bestCombo: Math.max(this.bestCombo, this.carry.bestCombo || 0) });
  }
}
export function titleInfo(score, cleared) { for (const t of TITLES) { if ((t.cleared && cleared) || (!t.cleared && score >= t.min)) return t; } return { text: '' }; }
export const titleFor = (score, cleared) => titleInfo(score, cleared).text;
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(d) {
    this.cameras.main.setBackgroundColor(d.level === 0 ? SKIN.bg1 : SKIN.bg2);
    this.add.image(360, 640, d.level === 0 ? 'bg1' : 'bg2').setDisplaySize(GAME.width, GAME.height);
    this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.35);
    if (d.level === 0) {
      this.add.image(360, 520, 'uiPanel').setScale(1.1);
      if (d.passed) {
        T(this, 360, 490, '第一关通过！', 56, SKIN.titleColor); T(this, 360, 565, `得分 ${d.score}`, 44);
        button(this, 360, 820, '进入第二关', () => this.scene.start('Play', { level: 1, bestCombo: d.bestCombo, l1Score: d.l1Score }));
      } else {
        T(this, 360, 490, '差一点！', 56, SKIN.titleColor); T(this, 360, 565, `得分 ${d.score} / ${LEVELS[0].passScore}`, 44);
        button(this, 360, 820, '再来一次', () => this.scene.start('Play', { level: 0, bestCombo: 0 }));
      }
      return;
    }
    // 战绩卡（竖屏，关键信息集中在画面中部，适合截图）
    const cleared = d.passed, ti = titleInfo(d.score, cleared);
    T(this, 360, 290, '战绩卡', 64, SKIN.titleColor);
    this.add.image(360, 615, 'uiCard').setScale(1.05); // 600x494 整图 → 630x519，y 356-874
    T(this, 360, 470, cleared ? '通关第二关！' : '第二关未通过', 40, cleared ? '#9dff6a' : '#ff8a8a');
    T(this, 360, 530, '第二关得分', 30);
    T(this, 360, 600, `${d.score}`, 92);
    T(this, 360, 690, `称号：${ti.text}`, 46, ti.color || SKIN.text);
    T(this, 360, 760, `第一关得分 ${d.l1Score ?? 0}   最高连击 ${d.bestCombo}`, 26);
    T(this, 360, 920, SKIN.shareLine, 30);
    button(this, 360, 1060, '再来一次', () => this.scene.start('Play', { level: 1, bestCombo: 0, l1Score: d.l1Score })); // 直接重打第二关
    this.shareReady = addShareButton(this, 360, 1158, SKIN.font, d.score); // 320x60，y 1128-1188（再来一次底边1121.5 下方）
    this.followReady = addFollowButton(this, 360, 1236, SKIN.font); // 320x72，y 1200-1272
  }
}
