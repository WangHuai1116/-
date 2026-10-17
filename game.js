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
  let state = null, confirmHome = false, hiddenAt = 0, selected = 'fat', buttons = [], last = 0, anim = 0, paused = false, best = 0;
  let floatX = 340, floatY = 0, touchStart = null, touchMoved = false, swipeHandled = false;
  try { best = Number(native ? tt.getStorageSync('fitness-best') : localStorage.getItem('fitness-best')) || 0; } catch (_) {}
  const ink = '#19362b', green = '#356a48', lime = '#d8f376', cream = '#f8f9ed';
  function box(x,y,w,h,color,r) { c.fillStyle=color; c.beginPath(); const radius=Math.min(r || 16,w/2,h/2); c.moveTo(x+radius,y); c.arcTo(x+w,y,x+w,y+h,radius); c.arcTo(x+w,y+h,x,y+h,radius); c.arcTo(x,y+h,x,y,radius); c.arcTo(x,y,x+w,y,radius); c.fill(); }
  function text(str,x,y,size,color,align) { c.fillStyle=color || ink; c.font=(size>=17?'bold ':'')+size+'px sans-serif'; c.textAlign=align || 'left'; c.textBaseline='middle'; c.fillText(str,x,y); }
  function circle(x,y,r,color) { c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill(); }
  function line(x,y,xx,yy,color,w) { c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke(); }
  function button(id,label,x,y,w,h,color) { box(x,y,w,h,color||green,16);text(label,x+w/2,y+h/2,17,color===lime?ink:'#fff','center');buttons.push({id,x,y,w,h}); }
  function bodyWidth(kind,progress) { return kind==='thick'?67:kind==='fat'?51-progress*16:26+progress*9; }
  function body(cx,cy,kind,progress,focus,small,female) {
    c.save(); c.translate(cx,cy); c.scale(small ? 0.34 : 1, small ? 0.34 : 1);
    const skin='#efb58f'; const broad=kind==='thick'?67:kind==='fat'?51-progress*16:26+progress*9;
    const bounce=state&&state.events?Math.sin(anim*6)*2:0;
    c.translate(0,bounce);
    line(-21,102,-25,174,skin,25);line(21,102,25,174,skin,25);
    line(-25,174,-35,177,ink,16);line(25,174,35,177,ink,16);
    line(-broad+4,9,-broad-14,77,skin,kind==='thin'?15:23);line(broad-4,9,broad+14,77,skin,kind==='thin'?15:23);
    box(-broad,0,broad*2,105,skin,32); box(-broad,88,broad*2,27,green,9);
    circle(0,-36,27,skin);box(-26,-61,52,18,ink,8);
    circle(-9,-37,2,ink);circle(9,-37,2,ink);line(-6,-24,6,-24,ink,2);
    if(female){ box(-broad,0,broad*2,88,'#e86f89',24); c.fillStyle='#5a2b27';c.beginPath();c.arc(0,-55,25,Math.PI,Math.PI*2);c.fill();c.fillStyle='#e75f82';c.beginPath();c.moveTo(-24,88);c.lineTo(24,88);c.lineTo(31,118);c.lineTo(-31,118);c.closePath();c.fill(); }
    if(progress>0.4) { line(0,14,0,80,'#cd8e70',2);line(-22,39,22,39,'#cd8e70',2);line(-16,58,16,58,'#cd8e70',2); }
    if(!small && focus) {
      const map={chest:[0,24,37],arms:[-broad-8,47,22],core:[0,70,27],legs:[0,143,37]};
      if(map[focus]) { const p=map[focus];c.strokeStyle=lime;c.lineWidth=5;c.beginPath();c.arc(p[0],p[1],p[2]+Math.sin(anim*5)*3,0,Math.PI*2);c.stroke(); }
    }
    c.restore();
  }
  let swipeAudio=null;
  if(native && typeof tt.createInnerAudioContext==='function'){try{swipeAudio=tt.createInnerAudioContext();swipeAudio.src='assets/swipe.wav';swipeAudio.volume=0.65;}catch(_){} }
  function playSwipe(){try{if(swipeAudio){swipeAudio.stop();swipeAudio.play();}}catch(_){} }
  function haptic(kind) {
    if(!native) return;
    try {
      if(typeof tt.vibrateShort==='function') { tt.vibrateShort({type:kind==='error'?'heavy':'light'}); return; }
      if(kind==='error' && typeof tt.vibrateLong==='function') tt.vibrateLong({});
    } catch (_) {}
  }
  function saveWin() { best++;try { if(native) tt.setStorageSync('fitness-best',best);else localStorage.setItem('fitness-best',best); } catch (_) {} }
  function draw() {
    buttons=[];box(0,0,W,H,cream,0);
    const top=Math.max(38,safeTop+15);
    text('薄肌进化论',24,top,24);text('BODY LAB / 01',24,top+27,10,'#6c8274');
    if(!state) {
      box(24,top+55,342,360,'#e6eddc',26);text('30 天，练到刚刚好',195,top+88,24,ink,'center');
      text('一局 30 秒 · 节奏比手速更重要',195,top+118,14,'#637b67','center');
      body(195,top+198,selected,0,null,false);
      button('fat','胖胖开局',40,top+428,147,48,selected==='fat'?green:'#809482');
      button('thin','瘦瘦开局',203,top+428,147,48,selected==='thin'?green:'#809482');
      text('① 跟着提示点胸、腿、手臂、腹部',30,top+502,14);
      text('② 点击立即响应，跟着指引均衡训练',30,top+530,14);
      text('③ 60秒结束时70～80分，解锁迎娶',30,top+558,14);
      text('前期+2，70分后+0.5；每秒-0.7，超过100失败',30,top+586,13,'#92714f');
      button('start','开始30天',24,top+613,205,56,green);
      button('chase','直接追美女',241,top+613,125,56,'#d38350');
      // 侧边栏复访入口使用悬浮球，避免占用底部主操作区。
      if(!floatY) floatY=top+122;
      const fx=floatX, fy=floatY, fr=30;
      circle(fx,fy,fr,'#d38350');
      circle(fx,fy,fr-4,'#f28a43');
      text('福利',fx,fy-5,12,'#fff','center');
      text('↗',fx,fy+12,13,'#fff','center');
      buttons.push({id:'sidebar',x:fx-fr,y:fy-fr,w:fr*2,h:fr*2});
      text('侧边栏每日福利',fx,fy+45,10,'#92714f','center');return;
    }
    const s=state, progress=Math.max(0,Math.min(s.score/100,1)), exp=E.expected(s), training=s.phase==='training', chasing=['walk','fallen'].includes(s.phase), chaseFill=Math.max(0,Math.min(1,1-E.gap(s)/80));
    box(24,top+48,342,58,'#e7eddf',16);
    text(training?'DAY '+Math.min(30,Math.floor(s.elapsed)+1)+'/30':s.phase==='maintain'?'保持薄肌':s.phase==='walk'?'约会时刻':'挑战结果',38,top+68,15);
    text(training?Math.max(0,30-s.elapsed).toFixed(1)+'s':s.phase==='maintain'?Math.max(0,10-s.maintain).toFixed(1)+'s':chasing?'距女生 '+E.gap(s).toFixed(1)+'m':'完成 '+Math.round(progress*100)+'%',350,top+68,18,green,'right');
    box(38,top+87,314,5,'#cdd9c5',2);box(38,top+87,Math.max(1,314*(chasing?chaseFill:progress)),5,green,2);
    text(training?'教练：'+E.names[exp]+'  ↓':s.phase==='maintain'?'已经刚刚好，放松 10 秒':s.phase==='fallen'?'摔倒了！快速点击屏幕爬起来':s.phase==='walk'?'交替点击 '+(s.nextFoot==='left'?'左脚':'右脚')+'，追上她！':'',195,top+134,21,green,'center');
    if(s.phase==='walk') {
      c.fillStyle='#d9e8d0';c.beginPath();c.moveTo(55,top+180);c.lineTo(335,top+180);c.lineTo(380,top+500);c.lineTo(10,top+500);c.closePath();c.fill();
      for(let i=0;i<4;i++){const yy=top+205+i*75;line(195-(yy-top-180)*0.28,yy,195+(yy-top-180)*0.28,yy,'#f5f0bb',3);}
      line(195,top+180,195,top+500,'#c2d9bc',3);
      (s.obstacles||[]).forEach(o=>{const d=o.distance-s.distance;if(d>0&&d<28){const t=1-d/28,yy=top+190+t*280,xx=o.lane===0?145:245,sc=o.type==='栅栏'?0.7+t*1.0:0.5+t*0.8;c.save();c.translate(xx,yy);c.scale(sc,sc);if(o.type==='栅栏'){box(-28,-18,56,8,'#8b572f',3);box(-25,-10,6,31,'#9d673b',2);box(19,-10,6,31,'#9d673b',2);line(-19,0,19,0,'#d59a58',4);line(-19,10,19,10,'#d59a58',4);}else{c.fillStyle='#f4c936';c.strokeStyle='#8c4d3d';c.lineWidth=3;c.lineJoin='round';const peel=(draw)=>{c.beginPath();draw();c.closePath();c.fill();c.stroke();};peel(()=>{c.moveTo(0,-18);c.quadraticCurveTo(-12,-8,-15,7);c.quadraticCurveTo(-28,14,-37,7);c.quadraticCurveTo(-29,26,-8,17);c.quadraticCurveTo(3,9,0,-18);});peel(()=>{c.moveTo(2,-18);c.quadraticCurveTo(7,-6,22,1);c.quadraticCurveTo(36,1,39,9);c.quadraticCurveTo(28,17,14,10);c.quadraticCurveTo(4,5,2,-18);});peel(()=>{c.moveTo(1,-16);c.quadraticCurveTo(3,1,12,12);c.quadraticCurveTo(21,20,29,14);c.quadraticCurveTo(20,29,7,19);c.quadraticCurveTo(-2,9,1,-16);});c.fillStyle='#8c4d3d';c.fillRect(-3,-25,6,8);}c.restore();}});
      const run=Math.sin(anim*12)*(s.onGround?1:0), style=E.bodyType(s)==='thick'?'thick':'thin';
      const playerX=115+160*(s.laneVisual==null?s.lane:s.laneVisual);c.save();c.translate(playerX,top+340+Math.abs(run)*2);c.rotate(run*0.035);body(0,0,style,1,null,false);c.restore();
      const gap=Math.max(0,s.beautyDistance-s.distance), far=Math.max(0.28,0.62-gap/260);
      c.save();c.translate(285,top+190);c.scale(far,far);c.rotate(-run*0.06);body(0,0,'thin',0.65,null,false,true);text('♥',0,-78,24,'#e75f82','center');c.restore();
      text('美女',285,top+160,11,'#c46b77','center');
    } else {
      body(190,top+227,E.bodyType(s)==='original'?s.body:E.bodyType(s)==='thick'?'thick':'thin',E.bodyType(s)==='original'?0:1,training&&exp!=='arms'?exp:null,false);
    }
    if(s.phase==='walk'||s.phase==='won') {
      if(s.phase!=='walk') body(285,top+227,'thin',0.65,null,false,true);
      if(s.phase==='won') text('♥',286,top+162,24,'#c46b77','center');
      if(s.phase==='won') line(225,top+294,250,top+294, '#efb58f',10);
    }
    if(training) {
      const bodyKind=E.bodyType(s)==='original'?s.body:E.bodyType(s)==='thick'?'thick':'thin';
      const bodyProgress=E.bodyType(s)==='original'?0:1;
      const broad=bodyWidth(bodyKind,bodyProgress);
      const cy=top+227+(s.events?Math.sin(anim*6)*2:0);
      const wobble=Math.sin(anim*6)*2;
      buttons.push({id:'chest',x:150,y:top+220,w:80,h:56},{id:'core',x:150,y:top+276,w:80,h:50},{id:'legs',x:145,y:top+326,w:90,h:95});
      if(exp==='arms'){
        buttons.push({id:'armLeft',x:190-broad-30,y:top+220,w:50,h:105},{id:'armRight',x:190+broad-20,y:top+220,w:50,h:105});
        const armRing=(x,y,done)=>{c.strokeStyle=done?'#9bb79d':lime;c.lineWidth=5;c.beginPath();c.arc(x,y,23,0,Math.PI*2);c.stroke();};
        const leftArmX=190-broad-8,rightArmX=190+broad+8;armRing(leftArmX,top+270+wobble,s.armHits.left);armRing(rightArmX,top+270-wobble,s.armHits.right);
        text('臂',leftArmX,top+270+wobble,13);text('臂',rightArmX,top+270-wobble,13);
      }
      // 身体部位标签始终保留，手臂任务额外显示左右臂标签。
      text('胸',190,top+248,13);text('腹',190,top+301,13);text('腿',190,top+363,13);
      // 普通任务显示贴在模型上的左右臂标签；手臂任务只显示圆圈内标签。
      if(exp!=='arms') {
        const armTextY=cy+42;
        text('臂',190-broad-8,armTextY,11,ink,'center');
        text('臂',190+broad+8,armTextY,11,ink,'center');
      }
    }
    if(s.phase!=='walk') { box(265,top+173,101,104,'#fff',14);text('训练小窗',315,top+190,11,'#758875','center');
    c.save();c.translate(314,top+223);
    const miniKey=training?(s.lastAction||exp):null, motion=Math.sin(anim*7)*5;
    if(miniKey==='sleep'){c.fillStyle='#b9cce8';c.fillRect(-35,20,70,30);c.fillStyle='#fff';c.fillRect(-30,15,24,15);text('Z z',28,-20,14,green,'center');}
    else { c.rotate(miniKey==='core'?Math.sin(anim*7)*0.25:0); body(0,0,'thin',0.8,null,true); if(miniKey==='water'){circle(28,-12,8,'#8bd7ee');line(22,-5,27,8,'#8bd7ee',3);line(25,8,31,8,'#8bd7ee',3);} if(miniKey==='protein'){box(20,-20,14,20,'#f1c36e',4);line(20,-20,34,-20,'#fff',2);} if(miniKey==='chest'||miniKey==='arms'){line(-24,motion-6,24,motion+6,ink,5);circle(-28,motion-7,7,'#8798a8');circle(28,motion+7,7,'#8798a8');} if(miniKey==='legs'){line(-12,35,-20,48+motion,ink,4);line(12,35,20,48-motion,ink,4);} }
    c.restore();
    text(training?E.names[exp]:s.phase==='maintain'?'呼吸放松':'稳步向前',315,top+270,11,green,'center'); } 
    const ready=s.elapsed-s.lastTap>=0.45;
    circle(37,top+445,5,ready?green:'#d38350');text(ready?'节奏就绪 · 可以点':'稍等一下 · 不要连点',50,top+445,12);
    text(s.score.toFixed(1)+'分 · '+(E.bodyType(s)==='original'?'原体型':E.bodyType(s)==='lean'?'薄肌':'厚肌'),350,top+445,12,'#758875','right');
    if(s.phase==='fallen'){button('recover','快速点击爬起',24,top+525,342,57,'#d38350');} else if(s.phase==='walk'){ button('left','左脚',24,top+525,162,57,s.nextFoot==='left'?green:'#809482'); button('right','右脚',204,top+525,162,57,s.nextFoot==='right'?green:'#809482'); text('左右脚交替前进 · 拖动人物左右换道躲避障碍 · 距女生 '+E.gap(s).toFixed(1)+'m',195,top+606,11,ink,'center'); }
    else ['water','protein','sleep'].forEach((id,i)=>button(id, E.names[id],24+i*116,top+525,110,57,green));
    text(s.message,195,top+592,12,ink,'center');
    button('restart','重新开始',24,top+636,162,45,green);button('home','返回选择',204,top+636,162,45,'#809482');
    if(['failed','won'].includes(s.phase)) {
      box(20,top+145,350,330,'#19362b',26);text(s.phase==='won'?'♥  牵手成功':'挑战失败',195,top+199,29,lime,'center');
      text(s.phase==='won'?'均衡训练 · 懂得休息 · 刚刚好的你':'别着急，下次跟着节奏练',195,top+242,15,'#fff','center');
      // 长中文理由分行，防止窄屏溢出。
      const msg=s.phase==='won'?'30 天薄肌挑战完成！':s.reason;
      text(msg.slice(0,19),195,top+285,15,'#fff','center');text(msg.slice(19),195,top+312,15,'#fff','center');
      button('restart','再挑战一次',50,top+356,290,54,lime);
    }
    if(confirmHome) { box(0,0,W,H,'#19362bcc',0);box(35,285,320,210,'#fff',24);text('确定返回选择？',195,330,24,ink,'center');text('当前训练进度会丢失',195,365,14,'#718375','center');button('cancelHome','继续训练',55,405,130,48,'#809482');button('confirmHome','确认返回',205,405,130,48,green); }
    if(paused) { box(0,0,W,H,'#19362b',0);text('已暂停',195,340,30,lime,'center');text('回到游戏后继续',195,389,17,'#fff','center'); }
  }
  function tap(x,y) {
    if(paused)return;
    if (confirmHome) {
      const modal=buttons.slice().reverse().find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
      if(modal&&modal.id==='cancelHome') confirmHome=false;
      else if(modal&&modal.id==='confirmHome'){confirmHome=false;state=null;}
      draw(); return;
    }
    const hit=buttons.slice().reverse().find(b=>x>=b.x-10&&x<=b.x+b.w+10&&y>=b.y-10&&y<=b.y+b.h+10);
    if(!hit)return;
    if(hit.id==='fat'||hit.id==='thin') selected=hit.id;
    else if(hit.id==='home') { confirmHome=true; }
    else if(hit.id==='start'||hit.id==='restart')state=E.create(selected);
    else if(hit.id==='chase')state=E.create(selected,true);
    else if(hit.id==='sidebar') {
      if(native && typeof tt.navigateToScene==='function') {
        try { tt.navigateToScene({scene:'sidebar'}); } catch (_) {}
      }
    }
    else if(state) { const was=state.phase;const accepted=E.action(state,hit.id);if(was!=='won'&&state.phase==='won')saveWin();if(accepted) haptic(state.phase==='failed'?'error':'success'); }
    draw();
  }
  function canvasPoint(t) {
    const rawX=t.clientX!=null?t.clientX:(t.pageX!=null?t.pageX:t.x);
    const rawY=t.clientY!=null?t.clientY:(t.pageY!=null?t.pageY:t.y);
    if(rawX==null||rawY==null)return null;
    return {x:rawX*W/(info.windowWidth||W),y:rawY*H/(info.windowHeight||H)};
  }
  function floatingHit(p) {
    return !state && floatY && Math.hypot(p.x-floatX,p.y-floatY)<=34;
  }
  function finishTouch(p) {
    if(!touchStart||!p)return;
    if(touchMoved && state&&state.phase==='walk'){const dx=p.x-touchStart.x;if(Math.abs(dx)>10){const targetLane=dx<0?0:1;if(state.lane!==targetLane){state.lane=targetLane;state.swipeCooldown=0.35;playSwipe();draw();}}}
    else if(!touchMoved) tap(touchStart.x,touchStart.y);
    touchStart=null; touchMoved=false; swipeHandled=false;
  }
  if(native) {
    tt.onTouchStart(function(e){const p=canvasPoint(e.touches&&e.touches[0]);if(!p)return;if(floatingHit(p)){touchStart=p;touchMoved=false;}else if(state&&state.phase==='walk'&&p.y<500){touchStart=p;touchMoved=false;}else tap(p.x,p.y);});
    if(tt.onTouchMove) tt.onTouchMove(function(e){const p=canvasPoint(e.touches&&e.touches[0]);if(!touchStart||!p)return;const dx=p.x-touchStart.x,dy=p.y-touchStart.y;if(!touchMoved&&Math.hypot(dx,dy)>8)touchMoved=true;if(state&&state.phase==='walk'&&!swipeHandled&&Math.abs(dx)>5&&Math.abs(dx)>Math.abs(dy)){const targetLane=dx<0?0:1;if(state.lane!==targetLane){state.lane=targetLane;state.swipeCooldown=0.35;swipeHandled=true;playSwipe();draw();}touchStart=null;touchMoved=false;return;}if(touchMoved){floatX=Math.max(34,Math.min(W-34,p.x));floatY=Math.max(70,Math.min(H-70,p.y));draw();}});
    if(tt.onTouchEnd) tt.onTouchEnd(function(e){const t=(e.changedTouches&&e.changedTouches[0])||(e.touches&&e.touches[0]);finishTouch(canvasPoint(t));});
    tt.onHide(function(){hiddenAt=Date.now();paused=true;});tt.onShow(function(){if(hiddenAt&&state){E.tick(state,Math.min(60,(Date.now()-hiddenAt)/1000));}hiddenAt=0;paused=false;last=Date.now();draw();});
  } else {
    canvas.addEventListener('pointerdown',function(e){const r=canvas.getBoundingClientRect();const p={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};if(floatingHit(p)){touchStart=p;touchMoved=false;}else if(state&&state.phase==='walk'&&p.y<500){touchStart=p;touchMoved=false;}else tap(p.x,p.y);});
    canvas.addEventListener('pointermove',function(e){if(!touchStart)return;const r=canvas.getBoundingClientRect();const p={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};const dx=p.x-touchStart.x,dy=p.y-touchStart.y;if(!touchMoved&&Math.hypot(dx,dy)>8)touchMoved=true;if(state&&state.phase==='walk'&&!swipeHandled&&Math.abs(dx)>5&&Math.abs(dx)>Math.abs(dy)){const targetLane=dx<0?0:1;if(state.lane!==targetLane){state.lane=targetLane;state.swipeCooldown=0.35;swipeHandled=true;playSwipe();draw();}touchStart=null;touchMoved=false;return;}if(touchMoved){floatX=Math.max(34,Math.min(W-34,p.x));floatY=Math.max(70,Math.min(H-70,p.y));draw();}});
    canvas.addEventListener('pointerup',function(e){const r=canvas.getBoundingClientRect();finishTouch({x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height});});
    document.addEventListener('visibilitychange',function(){paused=document.hidden;last=0;});
  }
  const raf = typeof requestAnimationFrame==='function'?requestAnimationFrame:canvas.requestAnimationFrame ? canvas.requestAnimationFrame.bind(canvas):function(fn){return setTimeout(function(){fn(Date.now());},16);};
  function frame(now) { if(!paused&&last&&state)E.tick(state,Math.min((now-last)/1000,0.1));last=now;anim=now/1000;draw();raf(frame); }
  draw();raf(frame);
})();
