const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const E = require('../js/engine');
test('抖音入口启动、触摸开局、训练与后台恢复',()=> {
  const context = new Proxy({}, { get(target,key) { return target[key] || (()=>{}); }, set(target,key,value){target[key]=value;return true;} });
  const canvas={getContext:()=>context};let touch, hide, show, frame;let texts=[];
  context.fillText=(str)=>texts.push(str);
  const sandbox={require:()=>E,setTimeout,Date,Math,requestAnimationFrame:(cb)=>{frame=cb;},tt:{
    createCanvas:()=>canvas,getSystemInfoSync:()=>({windowWidth:390,windowHeight:780,pixelRatio:2,safeArea:{top:0}}),
    getStorageSync:()=>0,onTouchStart:fn=>touch=fn,onHide:fn=>hide=fn,onShow:fn=>show=fn,vibrateShort:()=>{}
  }};
  vm.runInNewContext(fs.readFileSync(require.resolve('../game.js'),'utf8'),sandbox);
  assert.ok(texts.includes('薄肌进化论'));assert.equal(canvas.width,780);
  touch({touches:[{clientX:190,clientY:675}]});
  assert.ok(texts.includes('教练：胸部  ↓'));
  touch({touches:[{clientX:190,clientY:285}]});
  assert.ok(texts.includes('教练：腿部  ↓'));
  hide();frame(1000);assert.ok(texts.includes('已暂停'));show();frame(2000);
});
