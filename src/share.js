// 晒战绩：postNote（小工具 JS API §3.3）+ writeTempFile（§3.5）。浏览器/旧客户端/无 API 时不渲染。
// postNote 未标注独立最低版本；本实现传 pageType（§3.3 标注 9.43+），故以 9430 为门槛（§3.6 判断法）。
const MIN_VER = 9430, GUARD = 1500, TOPICS = ' #南瓜夜驱鬼 #万圣节';
const HOOK = '第二关我真的过不去';
function api() {
  try {
    const m = window.xhs && window.xhs.miniTool;
    if (m && typeof m.postNote === 'function') return m;
  } catch (e) { /* ignore */ }
  return null;
}
const race = (p, v) => Promise.race([Promise.resolve(p).catch(() => v), new Promise((r) => setTimeout(() => r(v), GUARD))]);
async function versionOk(m) {
  try {
    const rd = (lo) => Number(lo && lo.miniToolEnv && lo.miniToolEnv.buildVersion) || 0;
    let v = rd(window.xhs && window.xhs.launchOptions);
    if (!v && typeof m.getLaunchOptions === 'function') v = rd(await race(m.getLaunchOptions(), null));
    return Math.floor(v / 1000) >= MIN_VER;
  } catch (e) { return false; }
}
export function shareText(score) {
  return (score >= 1000 ? `鬼王克星就是我，${score} 分，谁来挑战` : `第二关我真的过不去😭 只拿了 ${score} 分，你能过吗？来 PK`) + TOPICS;
}
// 截取战绩卡（标题到卡片底部），上方加钩子文案横幅，输出 PNG data URI
function snapshotCard(scene) {
  return new Promise((res) => {
    try {
      const SY = 236, SH = 664;
      scene.game.renderer.snapshotArea(0, SY, 720, SH, (img) => {
        try {
          const BAN = 110, c = document.createElement('canvas'); c.width = 720; c.height = SH + BAN;
          const g = c.getContext('2d');
          g.fillStyle = '#1a0f2e'; g.fillRect(0, 0, 720, c.height);
          g.drawImage(img, 0, BAN);
          g.font = 'bold 50px ' + '-apple-system, "PingFang SC", "Noto Sans CJK SC", sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#2a1240'; g.fillStyle = '#ff9a3c';
          g.strokeText(HOOK, 360, BAN / 2 + 6); g.fillText(HOOK, 360, BAN / 2 + 6);
          res(c.toDataURL('image/png'));
        } catch (e) { res(null); }
      });
    } catch (e) { res(null); }
  });
}
/** 在战绩卡添加「晒战绩」按钮；返回 Promise（测试用）。 */
export function addShareButton(scene, x, y, font, score) {
  const m = api();
  if (!m) return Promise.resolve();
  let alive = true, pending = false, c = null, zone = null;
  scene.events.once('shutdown', () => { alive = false; if (zone) zone.removeAllListeners(); c = null; });
  const W = 320, H = 60;
  const setLock = (on) => { if (!c) return; if (on) zone.disableInteractive(); else zone.setInteractive({ useHandCursor: true }); c.setAlpha(on ? 0.6 : 1); };
  async function onTap() {
    if (pending || !alive) return;
    pending = true; setLock(true); scene.__shareCalls = (scene.__shareCalls || 0) + 1;
    try {
      const data = await race(snapshotCard(scene), null);
      if (!alive) return;
      let url = data;
      if (data && typeof m.writeTempFile === 'function') {
        const r = await race(m.writeTempFile({ data }), null);
        if (r && r.filePath) url = r.filePath;
      }
      if (!alive || !url) return; // mediaInfo 必填（§3.3），没有图则静默放弃
      await m.postNote({ title: '南瓜夜驱鬼 · 第二关战绩', content: shareText(score), pageType: 'photo_publish', mediaInfo: { image_resources: [{ url }] } });
    } catch (e) { /* 取消/失败：静默 */ }
    finally { pending = false; if (alive) setLock(false); }
  }
  return (async () => {
    if (!(await versionOk(m)) || !alive) return;
    c = scene.add.container(x, y).setName('shareBtn');
    const bg = scene.add.graphics();
    bg.fillStyle(0x2a1240, 0.7); bg.fillRoundedRect(-W / 2, -H / 2, W, H, 20);
    bg.lineStyle(2, 0xff9a3c, 1); bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 20);
    const txt = scene.add.text(0, 0, '晒战绩', { fontFamily: font, fontStyle: 'bold', fontSize: '24px', color: '#ff9a3c' }).setOrigin(0.5);
    zone = scene.add.zone(0, 0, W, H); c.add([bg, txt, zone]);
    zone.setInteractive({ useHandCursor: true }); zone.on('pointerup', onTap);
  })();
}
