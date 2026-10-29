// 关注作者（小红书小工具 JS API §3.15，容器注入，无 SDK）。浏览器/旧客户端里返回 null，不渲染。
const MIN_VER = 9510, STATUS_TIMEOUT = 1500;
function api() {
  try {
    const x = typeof window !== 'undefined' ? window.xhs : null;
    const m = x && x.miniTool;
    if (m && typeof m.followAuthor === 'function' && typeof m.getFollowStatus === 'function') return m;
  } catch (e) { /* ignore */ }
  return null;
}
async function versionOk(m) {
  try {
    let lo = window.xhs && window.xhs.launchOptions;
    if (!(lo && lo.miniToolEnv && lo.miniToolEnv.buildVersion != null) && typeof m.getLaunchOptions === 'function') lo = await m.getLaunchOptions();
    const v = Number(lo && lo.miniToolEnv && lo.miniToolEnv.buildVersion);
    return isFinite(v) && Math.floor(v / 1000) >= MIN_VER;
  } catch (e) { return false; }
}
async function queryStatus(m) {
  try {
    const r = await Promise.race([m.getFollowStatus(), new Promise((res) => setTimeout(() => res(null), STATUS_TIMEOUT))]);
    const s = r && typeof r.follow_status === 'number' ? r.follow_status : -1;
    return s;
  } catch (e) { return -1; }
}
/** 在场景中添加关注按钮；异步出现，不阻塞战绩卡。返回 Promise（测试用）。 */
export function addFollowButton(scene, x, y, font) {
  const m = api();
  if (!m) return Promise.resolve();
  let alive = true, pending = false, used = false, c = null, bg = null, txt = null, zone = null;
  scene.events.once('shutdown', () => { alive = false; if (zone) zone.removeAllListeners(); });
  let W = 320; const H = 72;
  const draw = () => {
    const col = 0xff9a3c;
    bg.clear(); bg.fillStyle(0x2a1240, 0.7); bg.fillRoundedRect(-W / 2, -H / 2, W, H, 20);
    bg.lineStyle(2, col, 1); bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 20);
    txt.setText('关注我，下个游戏更难').setColor('#ff9a3c');
    if (used) zone.disableInteractive(); else zone.setInteractive({ useHandCursor: true });
  };
  const apply = (s) => {
    if (!alive) return;
    if (s === -1) { if (!c) return; else return; } // 失败：未建则隐藏，已建保持现状
    if (s === 1 || s === 2) { hide(); return; } // 已关注/作者本人：整个按钮隐藏
    if (s !== 0) return;
    if (!c) {
      c = scene.add.container(x, y).setName('followBtn');
      bg = scene.add.graphics(); txt = scene.add.text(0, 0, '', { fontFamily: font, fontStyle: 'bold', fontSize: '24px' }).setOrigin(0.5);
      zone = scene.add.zone(0, 0, W, H);
      c.add([bg, txt, zone]);
      zone.on('pointerup', onTap);
      c.setW = (w) => { if (W === w) return; W = w; zone.setSize(W, H); draw(); };
      draw(); scene.events.emit('btnrow');
    }
    draw();
  };
  function hide() { if (c) { c.destroy(); c = null; if (alive) scene.events.emit('btnrow'); } }
  async function onTap() {
    if (pending || used || !alive) return;
    pending = true; used = true; zone.disableInteractive();
    let hideIt = false;
    try { await m.followAuthor(); hideIt = true; } // 关注成功：立即隐藏，不依赖回查
    catch (e) { const code = e && (e.code != null ? e.code : e.errCode); if (Number(code) === 15404) hideIt = true; else if (Number(code) === 20002) used = false; } // 用户取消：允许重试
    pending = false;
    if (!alive) return;
    if (hideIt) { hide(); return; }
    const s = await queryStatus(m);
    if (!alive || !c) return;
    if (s === -1) draw(); else apply(s);
  }
  return (async () => {
    if (!(await versionOk(m)) || !alive) return;
    apply(await queryStatus(m));
  })();
}
