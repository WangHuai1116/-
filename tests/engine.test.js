const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine');
test('胖瘦两种开局均可在60秒内达成薄肌，维持并牵手', () => {
  for (const body of ['fat', 'thin']) {
    const s = E.create(body);
    for (let i = 0; i < 42; i++) { E.tick(s, 0.7); assert.equal(E.action(s, E.expected(s)), true); }
    assert.equal(s.phase, 'maintain');
    assert.deepEqual(Object.values(s.muscles), [6,6,6,6]);
    E.tick(s, 5); assert.equal(E.action(s,'water'),true);
    E.tick(s, 5); assert.equal(s.phase, 'walk');
    for(let i=0;i<6;i++) { E.tick(s,0.6); E.action(s,'walk'); }
    assert.equal(s.phase,'won');
  }
});
test('错误训练立即失败',()=> { const s=E.create();E.action(s,'legs');assert.equal(s.phase,'failed'); });
test('连续猛点变厚肌',()=> { const s=E.create();E.action(s,'chest');for(let i=0;i<3;i++){E.tick(s,0.1);E.action(s,'legs');}assert.equal(s.phase,'failed');assert.match(s.reason,/厚肌/); });
test('60秒超时失败',()=>{const s=E.create();E.tick(s,60);assert.equal(s.phase,'failed');});
test('维持期间乱练失败',()=>{const s=E.create();s.phase='maintain';E.action(s,'chest');assert.equal(s.phase,'failed');});
test('正常节奏可从一次过快点击中恢复',()=>{const s=E.create();E.action(s,'chest');E.tick(s,0.1);assert.equal(E.action(s,'legs'),false);E.tick(s,0.6);assert.equal(E.action(s,'legs'),true);assert.equal(s.rapid,0);});
test('终局不再变化',()=>{const s=E.create();E.action(s,'legs');const snapshot=JSON.stringify(s);E.tick(s,10);E.action(s,'chest');assert.equal(JSON.stringify(s),snapshot);});
