(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else root.FitnessGame = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const names = { chest: '胸部', arms: '手臂', core: '腹部', legs: '腿部', water: '喝水', protein: '蛋白粉', sleep: '睡觉' };
  // 每组都练遍四个部位，再补给。60 秒内完成 6 组即进入维持阶段。
  const order = ['chest', 'legs', 'arms', 'core', 'water', 'protein', 'sleep'];
  function create(body) {
    return { body: body === 'thin' ? 'thin' : 'fat', phase: 'training', elapsed: 0, step: 0,
      muscles: { chest: 0, arms: 0, core: 0, legs: 0 }, energy: 100, heat: 0,
      lastTap: -99, rapid: 0, maintain: 0, walk: 0, message: '跟着教练，点击发光部位', reason: '', events: 0 };
  }
  function expected(s) { return order[s.step % order.length]; }
  function fail(s, reason) { s.phase = 'failed'; s.reason = reason; s.message = reason; }
  function tick(s, dt) {
    if (!['training', 'maintain', 'walk'].includes(s.phase)) return;
    dt = Math.max(0, dt); s.elapsed += dt; s.heat = Math.max(0, s.heat - dt * 18);
    if (s.phase === 'training' && s.elapsed >= 60) return fail(s, '30 天到了，还没有完成均衡训练');
    if (s.phase === 'maintain') {
      s.maintain += dt;
      if (s.maintain >= 10) { s.phase = 'walk'; s.message = '薄肌保持成功！点击脚印，走向她'; s.lastTap = -99; }
    }
    if (s.phase === 'walk' && s.elapsed >= 90) fail(s, '错过了见面时间，再练一次吧');
  }
  function action(s, key) {
    if (!['training', 'maintain', 'walk'].includes(s.phase)) return false;
    if (s.phase === 'walk') {
      if (key !== 'walk') return false;
      if (s.elapsed - s.lastTap < 0.35) { s.message = '慢一点，稳稳走过去'; return false; }
      s.lastTap = s.elapsed; s.walk++;
      if (s.walk >= 6) { s.phase = 'won'; s.message = '牵手成功！自律，也要懂得休息'; }
      return true;
    }
    if (s.phase === 'maintain') {
      if (key !== 'water' && key !== 'sleep') { fail(s, '维持期还在猛练，变成厚肌了！'); return false; }
      s.lastTap = s.elapsed; s.message = '保持住，放松呼吸'; return true;
    }
    const interval = s.elapsed - s.lastTap;
    if (interval < 0.45) {
      s.rapid++; s.heat = Math.min(100, s.heat + 40); s.lastTap = s.elapsed;
      s.message = '太快了！等节奏圈变绿再点';
      if (s.rapid >= 3 || s.heat >= 100) fail(s, '连续猛点，练成厚肌，挑战失败！');
      return false;
    }
    s.lastTap = s.elapsed;
    if (key !== expected(s)) { fail(s, '教练让你' + names[expected(s)] + '，你点错了！'); return false; }
    s.rapid = 0; s.events++;
    if (key in s.muscles) { s.muscles[key]++; s.energy -= 12; s.message = names[key] + '训练完成！换下一个部位'; }
    else if (key === 'water') { s.energy = Math.min(100, s.energy + 15); s.message = '咕嘟咕嘟，补水成功'; }
    else if (key === 'protein') { s.energy = Math.min(100, s.energy + 12); s.message = '蛋白补给完成'; }
    else { s.energy = 100; s.message = '呼噜……恢复满格'; }
    s.step++;
    if (s.step >= 42) { s.phase = 'maintain'; s.message = '薄肌达成！10 秒内别乱练，可以喝水或睡觉'; }
    return true;
  }
  return { create, tick, action, expected, names };
});
