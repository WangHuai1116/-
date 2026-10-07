/* 同一份 Canvas 游戏同时运行于抖音小游戏和浏览器。无远程素材和依赖。 */
(function () {
  'use strict';
  const native = typeof tt !== 'undefined' && typeof tt.createCanvas === 'function';
  const E = native ? require('./js/engine.js') : globalThis.FitnessGame;
  const canvas = native ? tt.createCanvas() : document.getElementById('game');
  const info = native ? tt.getSystemInfoSync() : { windowWidth: innerWidth, windowHeight: innerHeight, pixelRatio: devicePixelRatio || 1 };
  const W = 390, H = 780;
  const scale = Math.min(info.windowWidth / W, info.windowHeight / H);
  const width = W * scale, height = H * scale, dpr = Math.min(info.pixelRatio || 1, 3);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  if (!native) { canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; }
  const c = canvas.getContext('2d'); c.scale(canvas.width / W, canvas.height / H);
  const safeTop = native && info.safeArea ? Math.max(0, info.safeArea.top || 0) / scale : 0;
  // 顶部保留胶囊和刘海空间，底部按钮在设计高度内。
  let state = null, selected = 'fat', buttons = [], last = 0, anim = 0, paused = false, best = 0;
  try { best = Number(native ? tt.getStorageSync('fitness-best') : localStorage.getItem('fitness-best')) || 0; } catch (_) {}
  const ink = '#19362b', green = '#356a48', lime = '#d8f376', cream = '#f8f9ed';
  function box(x,y,w,h,color,r) { c.fillStyle=color; c.beginPath(); const radius=Math.min(r || 16,w/2,h/2); c.moveTo(x+radius,y); c.arcTo(x+w,y,x+w,y+h,radius); c.arcTo(x+w,y+h,x,y+h,radius); c.arcTo(x,y+h,x,y,radius); c.arcTo(x,y,x+w,y,radius); c.fill(); }
  function text(str,x,y,size,color,align) { c.fillStyle=color || ink; c.font=(size>=17?'bold ':'')+size+'px sans-serif'; c.textAlign=align || 'left'; c.textBaseline='middle'; c.fillText(str,x,y); }
  function circle(x,y,r,color) { c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill(); }
  function line(x,y,xx,yy,color,w) { c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke(); }
  function button(id,label,x,y,w,h,color) { box(x,y,w,h,color||green,16);text(label,x+w/2,y+h/2,17,color===lime?ink:'#fff','center');buttons.push({id,x,y,w,h}); }
  function body(cx,cy,kind,progress,focus,small) {
    c.save(); c.translate(cx,cy); c.scale(small ? 0.34 : 1, small ? 0.34 : 1);
    const skin='#efb58f'; const broad=kind==='fat'?51-progress*16:26+progress*9;
    const bounce=state&&state.events?Math.sin(anim*6)*2:0;
    c.translate(0,bounce);
    line(-21,102,-25,174,skin,25);line(21,102,25,174,skin,25);
    line(-25,174,-35,177,ink,16);line(25,174,35,177,ink,16);
    line(-broad+4,9,-broad-14,77,skin,kind==='thin'?15:23);line(broad-4,9,broad+14,77,skin,kind==='thin'?15:23);
    box(-broad,0,broad*2,105,skin,32); box(-broad,88,broad*2,27,green,9);
    circle(0,-36,27,skin);box(-26,-61,52,18,ink,8);
    circle(-9,-37,2,ink);circle(9,-37,2,ink);line(-6,-24,6,-24,ink,2);
    if(progress>0.4) { line(0,14,0,80,'#cd8e70',2);line(-22,39,22,39,'#cd8e70',2);line(-16,58,16,58,'#cd8e70',2); }
    if(!small && focus) {
      const map={chest:[0,24,37],arms:[-broad-8,47,22],core:[0,70,27],legs:[0,143,37]};
      if(map[focus]) { const p=map[focus];c.strokeStyle=lime;c.lineWidth=5;c.beginPath();c.arc(p[0],p[1],p[2]+Math.sin(anim*5)*3,0,Math.PI*2);c.stroke(); }
    }
    c.restore();
  }
  function saveWin() { best++;try { if(native) tt.setStorageSync('fitness-best',best);else localStorage.setItem('fitness-best',best); } catch (_) {} }
  function draw() {
    buttons=[];box(0,0,W,H,cream,0);
    const top=Math.max(38,safeTop+15);
    text('薄肌进化论',24,top,24);text('BODY LAB / 01',24,top+27,10,'#6c8274');
    if(!state) {
      box(24,top+55,342,360,'#e6eddc',26);text('30 天，练到刚刚好',195,top+88,24,ink,'center');
      text('一局 60 秒 · 节奏比手速更重要',195,top+118,14,'#637b67','center');
      body(195,top+198,selected,0,null,false);
      button('fat','胖胖开局',40,top+428,147,48,selected==='fat'?green:'#809482');
      button('thin','瘦瘦开局',203,top+428,147,48,selected==='thin'?green:'#809482');
      text('① 跟着提示点胸、腿、手臂、腹部',30,top+502,14);
      text('② 点击立即响应，跟着指引均衡训练',30,top+530,14);
      text('③ 完成 6 组，保持 10 秒，走向约会',30,top+558,14);
      text('点错立即失败；连续猛点会变成厚肌',30,top+586,13,'#92714f');
      button('start','开始 30 天挑战  →',24,top+613,342,56,green);
      text('成功记录 '+best+' 次  ·  夸张玩法，不是健身指导',195,top+686,11,'#718375','center');return;
    }
    const s=state, progress=Math.min(s.step/42,1), exp=E.expected(s), training=s.phase==='training';
    box(24,top+48,342,58,'#e7eddf',16);
    text(training?'DAY '+Math.min(30,Math.floor(s.elapsed/2)+1)+'/30':s.phase==='maintain'?'保持薄肌':s.phase==='walk'?'约会时刻':'挑战结果',38,top+68,15);
    text(training?Math.max(0,60-s.elapsed).toFixed(1)+'s':s.phase==='maintain'?Math.max(0,10-s.maintain).toFixed(1)+'s':s.phase==='walk'?'步数 '+s.walk+'/6':'完成 '+Math.round(progress*100)+'%',350,top+68,18,green,'right');
    box(38,top+87,314,5,'#cdd9c5',2);box(38,top+87,Math.max(1,314*progress),5,green,2);
    text(training?'教练：'+E.names[exp]+'  ↓':s.phase==='maintain'?'已经刚刚好，放松 10 秒':s.phase==='walk'?'点击脚印，稳稳走向她':'',195,top+134,21,green,'center');
    body(s.phase==='walk'?85+s.walk*17:190,top+227,s.body,progress,training?exp:null,false);
    if(s.phase==='walk'||s.phase==='won') {
      body(286,top+227,'thin',0.65,null,false);box(253,top+259,66,65,'#d39b94',15);
      text('♥',286,top+162,24,'#c46b77','center');
      if(s.phase==='won') line(225,top+294,250,top+294, '#efb58f',10);
    }
    if(training) {
      buttons.push({id:'chest',x:148,y:top+221,w:84,h:49},{id:'core',x:148,y:top+270,w:84,h:50},
        {id:'arms',x:110,y:top+222,w:38,h:103},{id:'arms',x:232,y:top+222,w:40,h:103},{id:'legs',x:145,y:top+325,w:90,h:95});
      text('胸',190,top+248,13);text('腹',190,top+291,13);text('腿',190,top+363,13);
    }
    box(265,top+173,101,104,'#fff',14);text('训练小窗',315,top+190,11,'#758875','center');
    c.save();c.translate(314,top+223);c.rotate(training&&exp==='core'?Math.sin(anim*5)*0.3:0);body(0,0,'thin',0.8,null,true);c.restore();
    text(training?E.names[exp]:s.phase==='maintain'?'呼吸放松':'稳步向前',315,top+270,11,green,'center');
    const ready=s.elapsed-s.lastTap>=0.45;
    circle(37,top+445,5,ready?green:'#d38350');text(ready?'节奏就绪 · 可以点':'稍等一下 · 不要连点',50,top+445,12);
    text('体力 '+s.energy+'  /  过练 '+Math.round(s.heat),350,top+445,12,'#758875','right');
    const ms=['chest','arms','core','legs'];ms.forEach((m,i)=>{text(E.names[m],24+i*88,top+482,12);box(24+i*88,top+497,76,5,'#d5dfcc',2);box(24+i*88,top+497,Math.max(1,76*s.muscles[m]/6),5,green,2);});
    if(s.phase==='walk') button('walk','脚印  →  向前一步',24,top+525,342,57,green);
    else ['water','protein','sleep'].forEach((id,i)=>button(id, E.names[id],24+i*116,top+525,110,57,training&&id===exp?green:'#809482'));
    text(s.message,195,top+606,12,ink,'center');
    button('restart','重新开始',24,top+636,162,45,green);button('home','返回选择',204,top+636,162,45,'#809482');
    if(['failed','won'].includes(s.phase)) {
      box(20,top+145,350,330,'#19362b',26);text(s.phase==='won'?'♥  牵手成功':'挑战失败',195,top+199,29,lime,'center');
      text(s.phase==='won'?'均衡训练 · 懂得休息 · 刚刚好的你':'别着急，下次跟着节奏练',195,top+242,15,'#fff','center');
      // 长中文理由分行，防止窄屏溢出。
      const msg=s.phase==='won'?'30 天薄肌挑战完成！':s.reason;
      text(msg.slice(0,19),195,top+285,15,'#fff','center');text(msg.slice(19),195,top+312,15,'#fff','center');
      button('restart','再挑战一次',50,top+356,290,54,lime);
    }
    if(paused) { box(0,0,W,H,'#19362b',0);text('已暂停',195,340,30,lime,'center');text('回到游戏后继续',195,389,17,'#fff','center'); }
  }
  function tap(x,y) {
    if(paused)return;
    const hit=buttons.slice().reverse().find(b=>x>=b.x-28&&x<=b.x+b.w+28&&y>=b.y-28&&y<=b.y+b.h+28);if(!hit)return;
    if(hit.id==='fat'||hit.id==='thin') selected=hit.id;
    else if(hit.id==='home')state=null;
    else if(hit.id==='start'||hit.id==='restart')state=E.create(selected);
    else if(state) { const was=state.phase;const accepted=E.action(state,hit.id);if(was!=='won'&&state.phase==='won')saveWin();if(native&&accepted&&tt.vibrateShort)tt.vibrateShort({}); }
    draw();
  }
  if(native) {
    tt.onTouchStart(function(e){const t=e.touches&&e.touches[0];if(!t)return;const x=t.clientX!=null?t.clientX:(t.pageX!=null?t.pageX:t.x);const y=t.clientY!=null?t.clientY:(t.pageY!=null?t.pageY:t.y);if(x!=null&&y!=null)tap(x/scale,y/scale);});
    tt.onHide(function(){paused=true;});tt.onShow(function(){paused=false;last=0;});
  } else {
    canvas.addEventListener('pointerdown',function(e){const r=canvas.getBoundingClientRect();tap((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height);});
    document.addEventListener('visibilitychange',function(){paused=document.hidden;last=0;});
  }
  const raf = typeof requestAnimationFrame==='function'?requestAnimationFrame:canvas.requestAnimationFrame ? canvas.requestAnimationFrame.bind(canvas):function(fn){return setTimeout(function(){fn(Date.now());},16);};
  function frame(now) { if(!paused&&last&&state)E.tick(state,Math.min((now-last)/1000,0.1));last=now;anim=now/1000;draw();raf(frame); }
  draw();raf(frame);
})();
