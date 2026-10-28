import Phaser from 'phaser';
import { GAME, LEVELS, SCORE, TITLES } from './config.js';
import { SKIN } from './skin.js';
const T = (s, x, y, str, size, color = SKIN.text) =>
  s.add.text(x, y, str, { fontFamily: SKIN.font, fontSize: size + 'px', color, align: 'center', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
function button(s, x, y, label, cb) {
  const b = s.add.rectangle(x, y, 360, 110, 0xff7a1a).setStrokeStyle(4, 0xffffff).setInteractive();
  T(s, x, y, label, 44);
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
    T(this, 360, 380, SKIN.title, 84, SKIN.accent);
    T(this, 360, 500, SKIN.subtitle + '\n两关闯关，每关 30 秒', 34);
    button(this, 360, 800, '开始游戏', () => this.scene.start('Play', { level: 0, total: 0, bestCombo: 0 }));
  }
}
export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  init(d) { // 每次进入都完整重置状态（验收 #6/#10）
    this.levelIdx = d.level; this.cfg = LEVELS[d.level]; this.carry = d;
    this.score = 0; this.combo = 0; this.bestCombo = 0; this.timeLeft = this.cfg.duration;
    this.running = false; this.paused = false; this.spawnAcc = 0; this.goldLeft = this.cfg.goldCount;
    this.holes = []; this.waveOn = false; this.ended = false;
  }
  create() {
    const c = this.cfg; this.cameras.main.setBackgroundColor(SKIN[c.bg]);
    if (this.textures.exists(c.bg)) this.add.image(360, 640, c.bg).setDisplaySize(GAME.width, GAME.height);
    this.hud = T(this, 360, 70, '', 36); this.hud.setDepth(10);
    const ox = 140, oy = 380, gap = 220;
    for (let i = 0; i < 9; i++) {
      const x = ox + (i % 3) * gap, y = oy + Math.floor(i / 3) * 250;
      this.add.rectangle(x, y + 70, 150, 90, SKIN.tomb).setStrokeStyle(3, 0x333344);
      this.add.ellipse(x, y + 20, 150, 40, SKIN.hole);
      this.holes.push({ x, y, ent: null });
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
    let n = GAME.countdown; const t = T(this, 360, 640, pre + n, 90, SKIN.accent).setDepth(30);
    this.time.addEvent({ delay: 1000, repeat: n - 1, callback: () => { n--; if (n > 0) t.setText(pre + n); else { t.destroy(); this.running = true; } } });
    this.updateHud();
  }
  pauseGame() { if (!this.running || this.ended) return; this.paused = true; this.time.paused = true; this.tweens.pauseAll();
    this.pauseTxt = T(this, 360, 640, '已暂停\n点击继续', 60).setDepth(40); }
  resumeGame() { /* 回到前台后等待玩家点击继续，计时不偷跑 */ }
  onTap(p) {
    if (this.paused) { this.paused = false; this.time.paused = false; this.tweens.resumeAll(); this.pauseTxt?.destroy(); return; }
    if (!this.running || this.ended) return;
    let best = null, bd = 1e9;
    for (const h of this.holes) { const e = h.ent; if (!e || e.hit) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y - 10); if (d < 95 && d < bd) { bd = d; best = h; } } // 命中半径 95 设计像素 ≫ 44px
    if (!best) { this.combo = 0; this.updateHud(); return; }
    const e = best.ent; e.hit = true;
    if (e.kind === 'lantern') { this.score -= SCORE.lanternPenalty; this.timeLeft = Math.max(0, this.timeLeft - SCORE.lanternTimePenalty); this.combo = 0; this.fx(e.x, e.y, 0xff3333, '-' + SCORE.lanternPenalty); }
    else { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      let add = e.kind === 'gold' ? SCORE.gold : SCORE.ghost; if (this.combo > SCORE.comboThreshold) add += SCORE.comboBonus;
      this.score += add; this.fx(e.x, e.y, e.kind === 'gold' ? 0xffd23f : 0xffffff, '+' + add + (this.combo > SCORE.comboThreshold ? ` 连击${this.combo}` : '')); }
    this.removeEnt(best, true); this.updateHud();
  }
  fx(x, y, color, txt) {
    const c = this.add.circle(x, y, 40, color, 0.8); this.tweens.add({ targets: c, scale: 2.2, alpha: 0, duration: 250, onComplete: () => c.destroy() });
    const t = T(this, x, y - 80, txt, 34); this.tweens.add({ targets: t, y: y - 150, alpha: 0, duration: 500, onComplete: () => t.destroy() });
  }
  makeEnt(h, kind) {
    const a = SKIN.atlas, pre = SKIN.frames[kind], sc = a.displaySize / a.frameSize;
    const g = this.add.sprite(h.x, h.y - 10, a.key, pre + '_rise').setScale(sc * 0.3);
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
    if (!this.running || this.paused || this.ended) return;
    const dt = Math.min(dtMs, 100) / 1000, c = this.cfg;
    this.timeLeft -= dt; const elapsed = c.duration - this.timeLeft;
    if (c.wave && !this.waveOn && this.timeLeft <= c.wave.lastSeconds) {
      this.waveOn = true; const w = T(this, 360, 230, SKIN.waveText, 64, '#ff4444').setDepth(25);
      this.tweens.add({ targets: w, alpha: 0, duration: 1500, onComplete: () => w.destroy() });
      this.cameras.main.shake(400, 0.01);
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
    this.scene.start('Result', { level: this.levelIdx, passed, score: this.score, bestCombo: Math.max(this.bestCombo, this.carry.bestCombo || 0) });
  }
}
export function titleFor(score, cleared) { for (const t of TITLES) { if (t.cleared && cleared) return t.text; if (!t.cleared && score >= t.min) return t.text; } return ''; }
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(d) {
    this.cameras.main.setBackgroundColor(d.level === 0 ? SKIN.bg1 : SKIN.bg2);
    if (d.level === 0 && d.passed) {
      T(this, 360, 450, `第一关通过！\n得分 ${d.score}`, 60, SKIN.accent);
      button(this, 360, 800, '进入第二关', () => this.scene.start('Play', { level: 1, bestCombo: d.bestCombo }));
      return;
    }
    if (d.level === 0) { T(this, 360, 450, `差一点！\n得分 ${d.score} / ${LEVELS[0].passScore}`, 56);
      button(this, 360, 800, '再来一次', () => this.scene.start('Play', { level: 0, bestCombo: 0 })); return; }
    // 战绩卡（竖屏，信息居中，适合截图）
    const cleared = d.passed;
    this.add.rectangle(360, 600, 600, 760, 0x2a1840).setStrokeStyle(6, 0xff9a3c);
    T(this, 360, 290, '战绩卡', 56, SKIN.accent);
    T(this, 360, 420, cleared ? '通关第二关！' : '第二关未通过', 48, cleared ? '#7CFC00' : '#ff6666');
    T(this, 360, 540, `第二关得分 ${d.score}\n最高连击 ${d.bestCombo}`, 44);
    T(this, 360, 690, `称号：${titleFor(d.score, cleared)}`, 48, '#ffd23f');
    T(this, 360, 840, SKIN.shareLine, 30);
    button(this, 360, 1080, '再来一次', () => this.scene.start('Play', { level: 1, bestCombo: 0 })); // 直接重打第二关
  }
}
