'use strict';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const DESIGN_W = 1280, DESIGN_H = 720;
let scale = 1;

function resizeCanvas() {
  scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
  canvas.width = DESIGN_W; canvas.height = DESIGN_H;
  canvas.style.width  = Math.floor(DESIGN_W * scale) + 'px';
  canvas.style.height = Math.floor(DESIGN_H * scale) + 'px';
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── 色板 ─────────────────────────────────────────────────
const C = {
  bgMain:'#102f34', bgSub:'#22474c',
  buildDark:'#3f2323', buildMid:'#633b3f', buildLight:'#9f705a',
  accent1:'#f22f46', accent2:'#fcc539', accent3:'#ffe08b',
  glow:'#f87b1b',
  outline:'#102f34',
  portalSwirl:'#b070eb', portalDeep:'#7c3ce1',
  // 古石（傳送門、石台）
  sBlack:'#100a18', sDeep:'#28192f', sDark:'#432641',
  sMid:'#5d4660',  sLight:'#756276', sHigh:'#a18897',
  // 地面
  gD:'#146756', gL:'#148568',
  // 帳篷
  tentL:'#845750', tentD:'#633b3f',
  campFire:'#f87b1b', campFireL:'#fcc539',
};

// ── 時代色板 ──────────────────────────────────────────
const eraColors={
  ai:{ bgMain:'#28192f', bgSub:'#432641', gD:'#146756', gL:'#148568', buildDark:'#3f2323', buildMid:'#633b3f', buildLight:'#845750', accent1:'#f22f46', accent2:'#fcc539' },
  cowork:{ bgMain:'#28192f', bgSub:'#4c3250', gD:'#146756', gL:'#148568', buildDark:'#45365d', buildMid:'#585d81', buildLight:'#668faf', accent1:'#315dcd', accent2:'#a0d8d7' },
  code:{ bgMain:'#102f34', bgSub:'#22474c', gD:'#146756', gL:'#148568', buildDark:'#3f2323', buildMid:'#633b3f', buildLight:'#9f705a', accent1:'#f22f46', accent2:'#fcc539' },
};

// ── 基礎工具 ──────────────────────────────────────────────
function px(x,y,w,h,fill,stroke){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  ctx.fillStyle=fill; ctx.fillRect(x,y,w,h);
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
}

function drawBrickWall(x,y,w,h,dark,light,ol){
  const BW=8,BH=4; let row=0;
  for(let ty=y;ty<y+h;ty+=BH){
    const off=(row%2)*4;
    for(let tx=x-off;tx<x+w+BW;tx+=BW){
      const cx=Math.max(x,tx), cw=Math.min(x+w,tx+BW)-cx;
      if(cw<=0)continue;
      const bh=Math.min(BH,y+h-ty);
      ctx.fillStyle=row%3===0?dark:light; ctx.fillRect(cx,ty,cw,bh);
      ctx.fillStyle=ol;
      if(tx+BW-1>=x&&tx+BW-1<x+w) ctx.fillRect(tx+BW-1,ty,1,bh);
      if(ty+BH-1<y+h) ctx.fillRect(cx,ty+BH-1,cw,1);
    }
    row++;
  }
}

function drawRoof(x,y,w,h,dark,light,ol){
  let row=0;
  for(let ty=y;ty<y+h;ty+=4){
    ctx.fillStyle=row%2===0?dark:light;
    ctx.fillRect(x,ty,w,Math.min(4,y+h-ty));
    row++;
  }
  ctx.fillStyle=ol; ctx.fillRect(x-4,y+h-1,w+8,2);
  ctx.strokeStyle=ol; ctx.lineWidth=1;
  ctx.strokeRect(x-4+.5,y+.5,w+8-1,h-1);
}

function drawGlow(x,y,color,r){
  r=r||40;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color+'cc'); g.addColorStop(.4,color+'55'); g.addColorStop(1,color+'00');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
}

// ── 星星動畫 ─────────────────────────────────────────────
let stars=[];
function generateStars(n){
  stars=[];
  for(let i=0;i<n;i++){
    const bx=Math.floor(Math.random()*DESIGN_W);
    const by=Math.floor(Math.random()*(GROUND_Y-60));
    stars.push({bx,by,x:bx,y:by,
      phase:Math.random()*Math.PI*2,
      speed:.018+Math.random()*.038,
      big:Math.random()>.83});
  }
}

function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0,C.bgMain); g.addColorStop(1,C.bgSub);
  ctx.fillStyle=g; ctx.fillRect(0,0,DESIGN_W,GROUND_Y);

  for(const s of stars){
    s.phase+=s.speed;
    s.x=s.bx+Math.sin(s.phase*.31)*1.4;
    s.y=s.by+Math.cos(s.phase*.19)*.7;
    const b=(Math.sin(s.phase)+1)/2;
    const a=Math.floor(70+b*185).toString(16).padStart(2,'0');
    const sx=Math.round(s.x), sy=Math.round(s.y);
    ctx.fillStyle=(s.big?'#ffffff':'#cecac9')+a;
    ctx.fillRect(sx,sy,1,1);
    if(s.big&&b>.65){
      ctx.fillStyle='#ffffff33';
      ctx.fillRect(sx-1,sy,1,1); ctx.fillRect(sx+1,sy,1,1);
      ctx.fillRect(sx,sy-1,1,1);
    }
  }
  // 遠山剪影（增加景深）
  ctx.fillStyle='#0e2a2f';
  for(let i=0;i<11;i++){
    const mx=i*130+30, mh=18+((i*73)%28);
    ctx.fillRect(mx-30,GROUND_Y-mh,70,mh+2);
    ctx.fillRect(mx-14,GROUND_Y-mh-12,28,14);
    ctx.fillRect(mx-6,GROUND_Y-mh-20,12,10);
  }
}

// ── 地面（分層：綠→過渡→泥土） ────────────────────────────
const GROUND_Y=Math.round(DESIGN_H*.82)-5;   // 為了容納題目框，往上移動至82%高度，並再上移5px

// 各層色板（[深色, 亮色]）
const GP={
  // 上層綠色（更鮮艷）
  g0:['#0d3a3f','#0d5648'],   // 暗綠（陰影）
  g1:['#0d5648','#117a59'],   // 標準綠
  g2:['#117a59','#4a9b6f'],   // 亮綠
  g3:['#4a9b6f','#68c98d'],   // 最亮綠（高光）
  // 中層過渡（綠棕）
  t0:['#3a4d44','#5a7a62'],   // 深綠棕（靠綠）
  t1:['#5a7a62','#7a9a7a'],   // 中綠棕
  t2:['#8a6d52','#7a9a7a'],   // 綠棕（靠土）
  t3:['#6d4a3a','#8a6d52'],   // 深棕
  // 下層泥土（更深沉）
  b0:['#8a6d52','#a8835a'],   // 淺土
  b1:['#6d4a3a','#8a6d52'],   // 中土
  b2:['#4a2e1a','#6d4a3a'],   // 深土
  b3:['#2a1810','#4a2e1a'],   // 最深土
};
let groundMap=[];

// 伪随机数生成器（确定性）
function seededRandom(seed){
  const x=Math.sin(seed)*10000;
  return x-Math.floor(x);
}

function generateEraGroundMap(){
  const S=8, cols=Math.ceil(DESIGN_W/S)+2, rows=Math.ceil((DESIGN_H-GROUND_Y)/S)+2;
  eraGroundMap=[];
  for(let r=0;r<rows;r++){
    eraGroundMap[r]=[];
    for(let c=0;c<cols;c++){
      const seed=r*1000+c*7; // 确定性种子
      const n=seededRandom(seed);
      let k;
      if(r<=1){
        k=n<.18?'g0':n<.5?'g1':n<.80?'g2':'g3';
      } else if(r===2){
        k=n<.2?'g0':n<.45?'g1':n<.68?'t0':'t1';
      } else if(r===3){
        k=n<.12?'g1':n<.30?'t0':n<.60?'t1':n<.82?'t2':'b0';
      } else if(r===4){
        k=n<.18?'t2':n<.38?'t3':n<.65?'b0':'b1';
      } else {
        k=n<.25?'b1':n<.60?'b2':'b3';
      }
      eraGroundMap[r][c]=k;
    }
  }
}

function generateGroundMap(){
  const S=8, cols=Math.ceil(DESIGN_W/S)+2, rows=Math.ceil((DESIGN_H-GROUND_Y)/S)+2;
  groundMap=[];
  for(let r=0;r<rows;r++){
    groundMap[r]=[];
    for(let c=0;c<cols;c++){
      const n=Math.random();
      let k;
      if(r<=1){
        // 上層：純綠色混和
        k=n<.18?'g0':n<.5?'g1':n<.80?'g2':'g3';
      } else if(r===2){
        // 上中：綠色主，開始混橄欖
        k=n<.2?'g0':n<.45?'g1':n<.68?'t0':'t1';
      } else if(r===3){
        // 中層：橄欖主，綠/土各占少量
        k=n<.12?'g1':n<.30?'t0':n<.60?'t1':n<.82?'t2':'b0';
      } else if(r===4){
        // 中下：土為主，殘留橄欖
        k=n<.18?'t2':n<.38?'t3':n<.65?'b0':'b1';
      } else {
        // 下層：純泥土色混和
        k=n<.22?'b0':n<.52?'b1':n<.80?'b2':'b3';
      }
      groundMap[r][c]=k;
    }
  }
}

function drawGround(){
  const S=8;
  for(let r=0;r<groundMap.length;r++){
    for(let c=0;c<groundMap[r].length;c++){
      const tx=c*S, ty=GROUND_Y+r*S;
      if(ty>DESIGN_H+S)continue;
      const [dk,lt]=GP[groundMap[r][c]]||GP.g1;
      ctx.fillStyle=dk; ctx.fillRect(tx,ty,S,S);
      ctx.fillStyle=lt;
      ctx.fillRect(tx,ty,S-1,2); ctx.fillRect(tx,ty+2,2,S-3);
      // 用各層深色當格線，增強像素感
      ctx.fillStyle=dk;
      ctx.fillRect(tx+S-1,ty,1,S); ctx.fillRect(tx,ty+S-1,S,1);
    }
  }
  // 地面最上邊分隔線（深色）
  ctx.fillStyle='#051a1f';
  ctx.fillRect(0,GROUND_Y-2,DESIGN_W,2);
  ctx.fillStyle='#0a2a32';
  ctx.fillRect(0,GROUND_Y,DESIGN_W,1);
}

// ── 石垣台（真田屋基台 + 傳送門共用） ───────────────────────
function drawStonePlatform(x,y,w,h){
  const bw_arr=[20,16], schemes=[C.sMid,C.sLight,C.sMid,C.sHigh];
  let row=0;
  for(let ty=y;ty<y+h;ty+=6){
    const bh=Math.min(6,y+h-ty);
    const bw=bw_arr[row%2]; const off=(row%2)*8;
    const col=schemes[row%schemes.length];
    for(let tx=x-off;tx<x+w+bw;tx+=bw){
      const cx=Math.max(x,tx), cw=Math.min(x+w,tx+bw)-cx;
      if(cw<=0)continue;
      ctx.fillStyle=col; ctx.fillRect(cx,ty,cw,bh);
      ctx.fillStyle=C.sHigh; ctx.fillRect(cx+1,ty+1,cw-2,1);
      ctx.fillStyle=C.sBlack; ctx.fillRect(cx,ty+bh-1,cw,1);
      if(tx+bw-1>=x&&tx+bw-1<x+w) ctx.fillRect(tx+bw-1,ty,1,bh);
    }
    row++;
  }
  ctx.strokeStyle=C.sBlack; ctx.lineWidth=1;
  ctx.strokeRect(x+.5,y+.5,w-1,h-1);
}

// ── 真田屋（武将の大邸宅） ───────────────────────────────
function drawSanadaHouse(x,y){
  // 石垣基台
  drawStonePlatform(x-8,y+118,216,22);

  // 左翼
  const lwW=62, lwY=y+62;
  drawBrickWall(x,lwY+22,lwW,56,C.buildDark,C.buildMid,C.outline);
  drawRoof(x-4,lwY,lwW+8,26,C.buildDark,C.buildMid,C.outline);
  px(x+14,lwY+28,16,12,C.buildDark,C.outline);
  ctx.fillStyle=C.buildMid;
  ctx.fillRect(x+21,lwY+28,2,12); ctx.fillRect(x+14,lwY+33,16,2);

  // 右翼
  const rwX=x+138, rwY=y+62;
  drawBrickWall(rwX,rwY+22,lwW,56,C.buildDark,C.buildMid,C.outline);
  drawRoof(rwX-4,rwY,lwW+8,26,C.buildDark,C.buildMid,C.outline);
  px(rwX+32,rwY+28,16,12,C.buildDark,C.outline);
  ctx.fillStyle=C.buildMid;
  ctx.fillRect(rwX+39,rwY+28,2,12); ctx.fillRect(rwX+32,rwY+33,16,2);

  // 本丸（中央高塔）
  const twX=x+62, twW=76;
  drawBrickWall(twX,y+46,twW,72,C.buildDark,C.buildLight,C.outline);

  // 欄干（balcony railing）
  ctx.fillStyle=C.buildLight; ctx.fillRect(twX+4,y+66,twW-8,2);
  for(let bx=twX+8;bx<twX+twW-6;bx+=6){
    ctx.fillStyle=C.buildMid; ctx.fillRect(bx,y+60,2,8);
  }

  // 2F 窓
  for(const wx of[twX+8,twX+twW-24]){
    px(wx,y+52,16,12,C.buildDark,C.outline);
    ctx.fillStyle=C.buildMid;
    ctx.fillRect(wx+7,y+52,2,12); ctx.fillRect(wx,y+57,16,2);
  }

  // 大門（両開き）
  const gw=28,gh=38, gx=twX+twW/2-gw/2, ggy=y+80;
  px(gx,ggy,gw/2-1,gh,C.buildDark,C.outline);
  px(gx+gw/2+1,ggy,gw/2-1,gh,C.buildDark,C.outline);
  for(const[hx,hy]of[[gx+2,ggy+5],[gx+gw-6,ggy+5],[gx+2,ggy+gh-10],[gx+gw-6,ggy+gh-10]])
    px(hx,hy,4,4,C.accent2,C.outline);

  // 三重屋根（下→中→上の順）
  drawRoof(twX-12,y+36,twW+24,16,C.buildDark,C.buildMid,C.outline);
  drawRoof(twX-4, y+22,twW+8, 18,C.buildDark,C.buildMid,C.outline);
  drawRoof(twX+8, y,   twW-16,26,C.buildDark,C.buildMid,C.outline);

  // 六文錢紋（2行×3枚）
  const chX=Math.round(twX+twW/2);
  for(let r=0;r<2;r++) for(let c=-1;c<=1;c++){
    const cx=chX+c*12, cy=y+7+r*11;
    px(cx-4,cy-4,9,9,C.accent2,C.outline);
    px(cx-2,cy-2,5,5,C.buildDark,null);
    ctx.fillStyle=C.accent3; ctx.fillRect(cx-1,cy-1,2,2);
  }

  // 鯱（屋根飾り）
  for(const rx of[twX+8,twX+twW-16]){
    px(rx,y,8,10,C.accent2,C.outline);
    px(rx+2,y,4,6,C.accent3,null);
  }

  // 燈籠（門両側）
  for(const lx of[gx-16,gx+gw+8]){
    const ly=y+92;
    px(lx,ly,8,18,C.buildMid,C.outline);
    px(lx+1,ly+2,6,10,'#3a2020',C.outline);
    drawGlow(lx+4,ly+7,C.campFire,14);
    ctx.fillStyle=C.accent2; ctx.fillRect(lx+2,ly+4,4,6);
    ctx.fillStyle=C.accent3; ctx.fillRect(lx+3,ly+5,2,4);
  }
}

// ── 村正鐵匠鋪 ──────────────────────────────────────────
function drawSmithShop(x,y){
  const W=90,roofH=22,wallH=53;
  drawBrickWall(x,y+roofH,W,wallH,C.buildDark,C.buildLight,C.outline);
  ctx.fillStyle=C.buildDark;
  ctx.fillRect(x+W/2-16,y+roofH,32,wallH);
  ctx.strokeStyle=C.outline; ctx.lineWidth=1;
  ctx.strokeRect(x+W/2-16+.5,y+roofH+.5,31,wallH-1);
  drawRoof(x-4,y,W+8,roofH,C.buildDark,C.buildMid,C.outline);
  ctx.fillStyle=C.buildDark; ctx.fillRect(x+W/2-16,y+roofH-18,32,18);
  ctx.strokeStyle=C.outline; ctx.lineWidth=1;
  ctx.strokeRect(x+W/2-16+.5,y+roofH-18+.5,31,17);
  ctx.fillStyle=C.accent2; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('村正',x+W/2,y+roofH-6);
  // 砧板と鉄鎚
  px(x+W/2-10,y+wallH+roofH-8,20,8,C.buildMid,C.outline);
  px(x+W/2+4, y+wallH+roofH-16,4,10,'#a18897',C.outline);
  px(x+W/2+2, y+wallH+roofH-20,8,6,C.sDark,C.outline);
  // 炭火光
  drawGlow(x+W/2-8,y+wallH+roofH-4,C.campFire,18);
}

// ── 雜貨舖 ──────────────────────────────────────────────
function drawShop(x,y){
  const W=100,roofH=24,wallH=56;
  drawBrickWall(x,y+roofH,W,wallH,C.buildDark,C.buildLight,C.outline);
  const dw=20,dh=30, dx=x+W/2-dw/2;
  px(dx,y+roofH+wallH-dh,dw,dh,C.buildDark,C.outline);
  ctx.strokeStyle=C.buildMid; ctx.lineWidth=1;
  for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(dx+i*(dw/3),y+roofH+wallH-dh);ctx.lineTo(dx+i*(dw/3),y+roofH+wallH);ctx.stroke();}
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(dx,y+roofH+wallH-dh+i*(dh/4));ctx.lineTo(dx+dw,y+roofH+wallH-dh+i*(dh/4));ctx.stroke();}
  px(x+14,y+roofH+10,18,14,C.buildDark,C.outline);
  ctx.strokeStyle=C.buildMid; ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+23,y+roofH+10);ctx.lineTo(x+23,y+roofH+24);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+14,y+roofH+17);ctx.lineTo(x+32,y+roofH+17);ctx.stroke();
  drawRoof(x-4,y,W+8,roofH,C.buildDark,C.buildMid,C.outline);
  const noren=['#f22f46','#ffe08b','#f22f46','#ffe08b'];
  for(let i=0;i<4;i++) px(x+20+i*16,y+roofH+2,12,14,noren[i],C.outline);
  ctx.strokeStyle=C.outline; ctx.lineWidth=1;
  ctx.strokeRect(x+.5,y+roofH+.5,W-1,wallH-1);
}

// ── 軍隊扎營処（Y修正：底=GROUND_Y） ────────────────────
// ── 飄動旗幟（逐行 sin 波偏移）────────────────────────────
function drawWavingFlag(fx,fy,fw,fh,col){
  const t=portalTime;
  for(let row=0;row<fh;row++){
    const wave=(Math.sin(row*.45+t*.06)>.6)?1:0;
    ctx.fillStyle=col;
    ctx.fillRect(fx+wave,fy+row,fw,1);
  }
}

// ── 真田幸村軍旗（幟，六文錢，地面插立）──────────────────
function drawSanadaBanner(x,gY){
  const pH=95, fw=15, fh=58, t=portalTime;
  // 旗竿
  ctx.fillStyle='#9f705a'; ctx.fillRect(x-1,gY-pH,2,pH);
  ctx.fillStyle='#633b3f'; ctx.fillRect(x,gY-pH,1,pH);
  // 頂部横桿
  ctx.fillStyle='#9f705a'; ctx.fillRect(x-1,gY-pH,fw+2,2);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x-1+.5,gY-pH+.5,fw+1,1);
  // 竿頭（金色頂飾）
  ctx.fillStyle='#fcc539'; ctx.fillRect(x-2,gY-pH-5,4,5);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x-2+.5,gY-pH-5+.5,3,4);
  // 旗幟本體（紅色，飄動）
  for(let row=0;row<fh;row++){
    const wave=(Math.sin(row*.4+t*.05)>.5)?1:0;
    ctx.fillStyle=C.accent1;
    ctx.fillRect(x+wave,gY-pH+2+row,fw,1);
  }
  // 六文錢紋（跟隨旗面波動）
  for(let r=0;r<2;r++) for(let c=0;c<3;c++){
    const ry=r*13+9;
    ctx.fillStyle='#fcc539';
    ctx.fillRect(x+2+c*4,gY-pH+2+ry,3,3);
    ctx.fillStyle=C.accent1;
    ctx.fillRect(x+3+c*4,gY-pH+3+ry,1,1);
  }
}

function drawCamp(x,y){
  const gY=y+75; // 地面基準（主帳篷高75px）
  // 真田軍旗（兩側地面插立，先繪避免遮住帳篷）
  drawSanadaBanner(x-28, gY);
  drawSanadaBanner(x+218, gY);

  // 打敗大魔王後的旗幟（中央上方）
  if(flagsPlanted.ai) drawEraFlag(x+50, y-80, 0); // 三國旗
  if(flagsPlanted.cowork) drawEraFlag(x+100, y-80, 1); // 騎士旗
  if(flagsPlanted.code) drawEraFlag(x+150, y-80, 2); // 江戶旗

  drawTent(x,y,105,75);
  drawTent(x+130,y+21,75,54);
  drawCampfire(x+115,y+68);
}

function drawTent(x,y,w,h){
  for(let row=0;row<h;row++){
    const hw=Math.round((row/h)*w/2);
    ctx.fillStyle=row%4<2?C.tentL:C.tentD;
    ctx.fillRect(Math.round(x+w/2-hw),y+row,Math.round(hw*2),1);
  }
  ctx.strokeStyle=C.outline; ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.stroke();
  // 入口
  const ew=Math.max(12,(w*.18)|0), eh=Math.max(14,(h*.26)|0);
  px(x+w/2-ew/2,y+h-eh,ew,eh,C.buildDark,C.outline);
  // 旗竿 + 飄動旗幟
  const fh=Math.max(14,(h*.22)|0);
  ctx.fillStyle=C.outline; ctx.fillRect(x+w/2-1,y-fh,2,fh);
  drawWavingFlag(x+w/2+1, y-fh, (fh*.85)|0, (fh*.5)|0, C.accent1);
}

function drawCampfire(x,y){
  px(x-8,y+6,16,6,C.sMid,C.outline);
  px(x-6,y+8,12,4,C.sDeep,null);
  drawGlow(x,y+2,C.campFire,28);
  ctx.fillStyle=C.campFireL; ctx.fillRect(x-4,y-2,8,8);
  ctx.fillStyle=C.campFire;  ctx.fillRect(x-2,y-6,4,8);
  ctx.fillStyle='#ffffff';   ctx.fillRect(x-1,y-4,2,4);
  ctx.strokeStyle=C.outline; ctx.lineWidth=1;
  ctx.strokeRect(x-4+.5,y-2+.5,7,7);
}

// ── 時代旗幟（打敗大魔王後插入） ────────────────────────
function drawEraFlag(x,y,eraIndex){
  // eraIndex: 0=三國, 1=騎士, 2=江戶
  // 旗竿
  ctx.fillStyle='#8b7355';
  ctx.fillRect(x-2,y,4,60);
  ctx.strokeStyle='#654321';
  ctx.lineWidth=1;
  ctx.strokeRect(x-2.5,y+0.5,3,59);

  // 旗幟
  if(eraIndex===0){
    // 三國：紅底黑字「魏」
    ctx.fillStyle='#ff0000';
    ctx.fillRect(x+2,y+4,32,24);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(x+1.5,y+3.5,33,25);
    ctx.fillStyle='#000000';
    ctx.font='16px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('魏',x+18,y+20);
  } else if(eraIndex===1){
    // 騎士：藍底金色十字
    ctx.fillStyle='#0055cc';
    ctx.fillRect(x+2,y+4,32,24);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(x+1.5,y+3.5,33,25);
    // 金色十字
    ctx.strokeStyle='#ffcc00';
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(x+10,y+10);
    ctx.lineTo(x+26,y+22);
    ctx.moveTo(x+26,y+10);
    ctx.lineTo(x+10,y+22);
    ctx.stroke();
  } else if(eraIndex===2){
    // 江戶：黑底金色葵紋
    ctx.fillStyle='#000000';
    ctx.fillRect(x+2,y+4,32,24);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(x+1.5,y+3.5,33,25);
    // 簡單的金色葵紋（圓形中心 + 三片葉子）
    ctx.fillStyle='#ffcc00';
    ctx.beginPath();
    ctx.arc(x+18,y+16,4,0,Math.PI*2);
    ctx.fill();
    // 三片葉子
    for(let i=0;i<3;i++){
      const angle=i*Math.PI*2/3;
      const leafX=x+18+Math.cos(angle)*8;
      const leafY=y+16+Math.sin(angle)*8;
      ctx.beginPath();
      ctx.arc(leafX,leafY,3,0,Math.PI*2);
      ctx.fill();
    }
  }
}

// ── 石製傳送門（古石、深色、裂縫） ──────────────────────
let portalTime=0;

function drawPortal(x,y){
  // 縮小至原來75%：W90→68、H110→82、pillarW18→13、slabH22→16
  const W=68,H=82,pillarW=13,slabH=16;
  const archW=W-pillarW*2, archH=H-slabH;

  // 漩渦（最下層）
  drawPortalSwirl(x+pillarW,y+slabH,archW,archH);

  // 左右石柱
  drawAncientColumn(x,           y+slabH,pillarW,archH);
  drawAncientColumn(x+W-pillarW, y+slabH,pillarW,archH);

  // 上部石板
  drawAncientSlab(x-6,y,W+12,slabH);

  // 寶石凹槽（3個）
  for(let i=0;i<3;i++){
    const gx=x+5+i*19, gy=y+3;
    px(gx,gy,9,9,C.sBlack,C.sMid);
    if(gems[i]){
      // 已獲得寶石，顯示閃耀的寶石
      const gemColors=['#4ade80','#ff6b9d','#fcd34d']; // 綠、紅、黃
      ctx.fillStyle=gemColors[i];
      ctx.fillRect(gx+2,gy+2,5,5);
      drawGlow(gx+4.5,gy+4.5,gemColors[i],8);
    } else {
      px(gx+2,gy+2,5,5,'#06000e',null);
      ctx.fillStyle='#845750'; ctx.fillRect(gx+1,gy+1,2,1);
    }
  }

  // 如果集齐三颗宝石，添加金色强光
  if(gems[0]&&gems[1]&&gems[2]){
    drawGlow(x+W/2, y+H/2, '#ffd700', 50);
  }

  // 底部古代暖光（冷石透出一絲神秘溫度）
  drawGlow(x+W/2, y+H-2, '#f87b1b', 20);

  // 階梯底座（3階，24px高）
  drawPortalStairs(x, y+H, W);
}

function drawPortalStairs(x,y,W){
  // 3階石階，由上到下漸寬，冷暖混色
  const steps=[
    {dx:-7,  dw:W+14, fill:'#432641', hi:'#633b3f'},
    {dx:-15, dw:W+30, fill:'#3f2323', hi:'#542323'},
    {dx:-23, dw:W+46, fill:'#28192f', hi:'#432641'},
  ];
  for(let i=0;i<steps.length;i++){
    const{dx,dw,fill,hi}=steps[i];
    const sx=x+dx, sy=y+i*8, sh=8;
    ctx.fillStyle=fill; ctx.fillRect(sx,sy,dw,sh);
    ctx.fillStyle=hi;   ctx.fillRect(sx+1,sy+1,dw-2,1);
    // 橫向石縫（暖色泥漿感）
    ctx.fillStyle='#3f2323';
    for(let mx=sx+14;mx<sx+dw-6;mx+=13) ctx.fillRect(mx,sy+2,1,4);
    ctx.fillStyle='#100a18';
    ctx.fillRect(sx,sy+sh-1,dw,1);
    ctx.strokeStyle='#1a0a10'; ctx.lineWidth=1;
    ctx.strokeRect(sx+.5,sy+.5,dw-1,sh-1);
  }
}

function drawAncientColumn(x,y,w,h){
  // 冷紫與暖棕交替——石頭帶一絲歲月溫度
  const schemes=[
    [C.sDeep,    C.sDark   ],  // 冷深紫
    ['#3f2323', '#633b3f' ],  // 暖深棕
    [C.sBlack,   C.sMid   ],  // 冷暗影
    ['#542323', '#845750' ],  // 暖中棕
  ];
  for(let by=y;by<y+h;by+=5){
    const bh=Math.min(5,y+h-by);
    const row=((by-y)/5)|0;
    const[fill,hi]=schemes[row%4];
    ctx.fillStyle=fill; ctx.fillRect(x,by,w,bh);
    ctx.fillStyle=hi;   ctx.fillRect(x+1,by+1,w-3,1);
    ctx.fillStyle='#1a0a10';                        // 暖黑縫線（非冷藍黑）
    ctx.fillRect(x,by+bh-1,w,1);
    ctx.fillRect(x+w-1,by,1,bh);
  }
  // 裂縫（暖色系：用深棕代替冷黑）
  const seed=(x*7+y*3)%17;
  ctx.fillStyle='#3f2323';
  ctx.fillRect(x+3, y+seed%(h/3|0)+4, 1,4);
  ctx.fillRect(x+4, y+seed%(h/3|0)+7, 2,3);
  ctx.fillRect(x+2, y+(h*.55|0),      2,5);
  ctx.fillRect(x+5, y+(h*.55|0)+4,    1,3);
  ctx.fillRect(x+3, y+(h*.75|0),      1,6);
  ctx.strokeStyle='#1a0a10'; ctx.lineWidth=1;
  ctx.strokeRect(x+.5,y+.5,w-1,h-1);
}

function drawAncientSlab(x,y,w,h){
  const bw=12; let row=0;
  // 冷暖交替：深紫→暖棕→深紫→暖棕
  const fills=[C.sDeep,'#3f2323',C.sDark,'#633b3f'];
  for(let ty=y;ty<y+h;ty+=5){
    const bh=Math.min(5,y+h-ty);
    const off=(row%2)*6;
    for(let tx=x-off;tx<x+w+bw;tx+=bw){
      const cx=Math.max(x,tx), cw=Math.min(x+w,tx+bw)-cx;
      if(cw<=0)continue;
      ctx.fillStyle=fills[row%4]; ctx.fillRect(cx,ty,cw,bh);
      ctx.fillStyle='#845750';    ctx.fillRect(cx+1,ty+1,cw-2,1); // 暖石高光
      ctx.fillStyle='#1a0a10';    ctx.fillRect(cx,ty+bh-1,cw,1);
      if(tx+bw-1>=x&&tx+bw-1<x+w) ctx.fillRect(tx+bw-1,ty,1,bh);
    }
    row++;
  }
  // 縱向裂縫（暖色）
  ctx.fillStyle='#3f2323';
  for(const fx of[.28,.52,.76]) ctx.fillRect(x+(w*fx|0),y+1,1,h-2);
  ctx.strokeStyle='#1a0a10'; ctx.lineWidth=1;
  ctx.strokeRect(x+.5,y+.5,w-1,h-1);
}

function drawPortalSwirl(x,y,w,h){
  const cx=(x+w/2)|0, cy=(y+h/2)|0;
  const t=portalTime;
  // 紫色混合背景（填滿整個門框，非黑色底）
  const bgPal=['#28192f','#28192f','#432641','#432641','#5d4660','#432641','#7c3ce1','#432641'];
  const S=2;
  for(let bpx=x;bpx<x+w;bpx+=S)
    for(let bpy=y;bpy<y+h;bpy+=S){
      ctx.fillStyle=bgPal[(bpx*7^bpy*13)&7]; ctx.fillRect(bpx,bpy,S,S);
    }

  // 白色光點（稀疏緩漂，些許閃爍）
  for(let i=0;i<8;i++){
    const ang=(i*.785+t*.0025)%(Math.PI*2);
    const r=2+(i*3)%13;
    const wx=(cx+Math.cos(ang)*r)|0, wy=(cy+Math.sin(ang)*r)|0;
    if(wx<x||wx>=x+w||wy<y||wy>=y+h) continue;
    ctx.fillStyle=Math.sin(t*.04+i)>0?'#ffffff':'#d59ff4';
    ctx.fillRect(wx,wy,1,1);
  }

  // 散佈弧線漩渦（3臂，慢速≈13秒一圈）
  const maxR=Math.min(w/2,h/2)-1;
  const arcC=['#ffffff','#d59ff4','#d59ff4','#b070eb','#b070eb','#7c3ce1','#5d4660','#432641'];
  for(let arm=0;arm<3;arm++){
    const off=arm*(2*Math.PI/3)+t*.008;
    for(let s=0;s<58;s++){
      const rat=s/58;
      const ang=rat*Math.PI*2.6+off;
      const r=rat*maxR;
      const ax=(cx+Math.cos(ang)*r)|0, ay=(cy+Math.sin(ang)*r)|0;
      if(ax<x||ax>=x+w||ay<y||ay>=y+h) continue;
      ctx.fillStyle=arcC[Math.min((rat*arcC.length)|0,arcC.length-1)];
      ctx.fillRect(ax,ay,2,2);
    }
  }

  // 中心光芒
  ctx.fillStyle='#b070eb88'; ctx.fillRect(cx-3,cy-3,6,6);
  ctx.fillStyle='#d59ff4';   ctx.fillRect(cx-1,cy-1,3,3);
  ctx.fillStyle='#ffffff';   ctx.fillRect(cx,  cy,  1,1);
}

// ══════════════════════════════════════════════════════════
// 第二階段：角色移動 + 建築互動
// ══════════════════════════════════════════════════════════

// ── 建築定義（cx中心X, top距地高度, zone互動範圍） ──────────
const BUILDINGS=[
  {id:'sanada', name:'真田屋',      cx:212,  top:140, zone:[80,  340]},
  {id:'smith',  name:'村正鐵匠鋪',  cx:473,  top:75,  zone:[405, 535]},
  {id:'shop',   name:'雜貨舖',      cx:680,  top:80,  zone:[608, 750]},
  {id:'camp',   name:'軍隊扎營処', cx:902,  top:90,  zone:[768, 1012]},
  {id:'portal', name:'石製傳送門',  cx:1123, top:106, zone:[1055,1205]},
];

// ── 遊戲狀態 ─────────────────────────────────────────────
let scene='main';
let nearBuilding=null;
let dialogText=null, dialogSpeaker=null;
let shopOpen=false, portalMenuOpen=false, levelMenuOpen=false;
let levelMenuPage=0; // 關卡菜單頁碼（0-5，每頁5關）
let fadeAlpha=0, fadeDir=0, fadeCb=null, fadeFrame=0;
let currentEra=null;
let gems=[false,false,false]; // 三國、騎士、江戶
let coins=0, inventory={noodle:0, fish:0, tempura:0};
let levelProgress={unlockedLevels:Array(30).fill(false).map((v,i)=>i===0), maxStars:Array(30).fill(0)};
let eraGameData={ai:null, cowork:null, code:null};
let eraGroundMap=null; // 時期地面貼圖（固定）

// ── 第三階段：對戰系統狀態 ────────────────────────────────
let currentStage=null; // 當前關卡數據
let currentQuestionIndex=0; // 當前題目索引
let playerHP=100, enemyHP=100, maxHP=100;
let hpPerQuestion=10; // 每題扣血量
let currentQuestion=null; // 當前題目
let questionAnswered=false, answerCorrect=false, answerTimer=0;
let selectedAnswer=null;
let battleLog=''; // 戰鬥記錄
let returnedEra=null; // 返回的時代
let levelClearReward={coins:0, items:{}};
let levelClearStarCount=0; // 當前破關的星級數量
let waitingForNextQuestion=false;
let showRetractConfirm=false; // 是否顯示撤退確認對話框

// ── 戰鬥動畫系統 ──────────────────────────────
let battleAnimations=[]; // 正在進行的動畫
let playerAttackFrame=0; // 我方揮刀幀數
let enemyShakeFrame=0; // 敵方晃動幀數
let damageDisplays=[]; // 傷害顯示 [{x,y,damage,timer}]
let battleArrows=[]; // 對戰背景飛箭 [{x,y,vx,vy,color,life}]
let battleArrowTimer=0; // 飛箭發射計時器

// 教學場景狀態
let teachingPhase=1; // 1=隨從講話, 2=真田幸村確認
let campList=[]; // 紮營處列表
let fireParticles=[]; // 火焰粒子

// ── 第四階段：開場、音樂、旗幟、結局 ───────────────────────
let showIntro=true; // 是否顯示開場動畫
let introScene=0; // 當前開場場景 (0-5)
let introFrameInScene=0; // 當前場景內的幀數
let introWaitingForClick=false; // 當前場景是否等待玩家點擊
let musicEnabled=localStorage.getItem('musicEnabled')!=='false'; // 音樂是否開啟
let flagsPlanted={ai:false, cowork:false, code:false}; // 各時代旗幟已插入
let gameEndTriggered=false; // 遊戲結局動畫是否被觸發
let endingFrame=0; // 結局動畫幀

// ── 響應式設計 ─────────────────────────────────────────────
let isPortrait=window.innerHeight>window.innerWidth;
let lastSceneForPortrait=null;

// ── 玩家 ─────────────────────────────────────────────────
const PL={
  x:300, y:GROUND_Y,
  vx:0, vy:0,
  speed:6.0, jump:-14,
  onGround:true, facing:1,
  frame:0, fTimer:0,
};

// ── 武士NPC ───────────────────────────────────────────────
const warriors=[
  {x:824, vx:0.45, facing:1,  state:'walk', timer:0  },
  {x:862, vx:0,    facing:-1, state:'sit',  timer:200},
  {x:905, vx:0.3,  facing:1,  state:'walk', timer:80 },
];

// ── 時代特定NPC ───────────────────────────────────────────
const eraWarriors={
  'three-kingdom':[
    {x:450, vx:0.35, facing:1,  state:'walk', timer:0},
    {x:550, vx:0.4,  facing:-1, state:'walk', timer:50},
    {x:400, vx:0,    facing:1,  state:'sit',  timer:150},
  ],
  knight:[
    {x:420, vx:0.3,  facing:1,  state:'walk', timer:10},
    {x:480, vx:0.45, facing:-1, state:'walk', timer:40},
    {x:530, vx:0.25, facing:1,  state:'walk', timer:80},
  ],
  edo:[
    {x:400, vx:0.4,  facing:1,  state:'walk', timer:0},
    {x:520, vx:0.35, facing:-1, state:'walk', timer:60},
    {x:460, vx:0,    facing:1,  state:'sit',  timer:120},
  ],
};

// ── 輸入 ─────────────────────────────────────────────────
const keys={};
const touch={L:false,R:false};
let lastTap=0;

window.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='KeyE'||e.code==='Enter'){
    if(dialogText||shopOpen||portalMenuOpen||levelMenuOpen){ closeUI(); return; }
    if(scene==='main'||scene==='three-kingdom'||scene==='knight'||scene==='edo') interact();
    if(scene==='interior') exitInterior();
    if(scene==='teaching'){
      if(teachingPhase===1){
        teachingPhase=2; // 切換到真田幸村說話
      } else {
        startBattle(); // 進入對戰
      }
    }
    if(scene==='battle'){
      // 暫時不做任何事
    }
    if(scene==='levelClear'){
      returnToMain(); // E鍵在破關場景回到領地
    }
  }
});
window.addEventListener('keyup',e=>{ keys[e.code]=false; });

canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  onTap((e.clientX-r.left)/scale,(e.clientY-r.top)/scale);
});
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  const now=Date.now();
  const canJump=scene==='main'||scene==='three-kingdom'||scene==='knight'||scene==='edo';
  if(now-lastTap<300&&PL.onGround&&canJump){
    PL.vy=PL.jump; PL.onGround=false;
  }
  lastTap=now; touchSync(e.touches);
},{passive:false});
canvas.addEventListener('touchmove', e=>{ e.preventDefault(); touchSync(e.touches); },{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault(); touch.L=false; touch.R=false;
  if(e.changedTouches.length){
    const r=canvas.getBoundingClientRect(),t=e.changedTouches[0];
    onTap((t.clientX-r.left)/scale,(t.clientY-r.top)/scale);
  }
},{passive:false});

function touchSync(ts){
  touch.L=false; touch.R=false;
  const mid=window.innerWidth/2;
  for(const t of ts){ if(t.clientX<mid) touch.L=true; else touch.R=true; }
}

// ── 互動邏輯 ─────────────────────────────────────────────
function closeUI(){
  dialogText=null; dialogSpeaker=null;
  shopOpen=false; portalMenuOpen=false; levelMenuOpen=false;
  levelMenuPage=0;
}
function interact(){
  const isEraScene=scene==='three-kingdom'||scene==='knight'||scene==='edo';
  if(dialogText||shopOpen||portalMenuOpen||levelMenuOpen) return;

  if(isEraScene){
    // 時代場景：左側傳送門（靠近 x=200）或右側城堡（靠近 x=1050）
    const distToPortal=Math.abs(PL.x-200);
    const distToCastle=Math.abs(PL.x-1050);

    if(distToPortal<100){
      returnToMain();
    } else if(distToCastle<150){
      levelMenuOpen=true;
    }
  } else {
    if(!nearBuilding) return;
    doAction(nearBuilding.id);
  }
}
function doAction(id){
  if     (id==='sanada') enterInterior();
  else if(id==='smith')  showDialog('村正鍛冶師','幸村，你的使命配得上村正家的刀。');
  else if(id==='shop')   shopOpen=true;
  else if(id==='camp')   showDialog('赤備武士','大人，赤備隊已準備好，隨時待命！');
  else if(id==='portal') portalMenuOpen=true;
}
function onTap(cx,cy){
  if(showIntro){
    // 跳過按鈕（右下角）
    const skipW=60, skipH=24;
    const skipX=DESIGN_W-skipW-8, skipY=DESIGN_H-skipH-8;
    if(cx>=skipX&&cx<skipX+skipW&&cy>=skipY&&cy<skipY+skipH){
      showIntro=false;
      saveProgress();
      return;
    }
    // 下一幕按鈕（只在等待點擊時出現）
    if(introWaitingForClick){
      const nextW=60, nextH=24;
      const nextX=8, nextY=DESIGN_H-nextH-8;
      if(cx>=nextX&&cx<nextX+nextW&&cy>=nextY&&cy<nextY+nextH){
        // 進入下一場景
        introFrameInScene=0;
        introWaitingForClick=false;
        introScene++;
        if(introScene>=6){
          showIntro=false;
          saveProgress();
        }
      }
    }
    return;
  }
  if(scene==='interior'){ exitInterior(); return; }
  if(scene==='teaching'){
    // 點擊任何地方繼續
    if(teachingPhase===1){
      teachingPhase=2; // 切換到真田幸村說話
    } else {
      startBattle(); // 進入對戰
    }
    return;
  }
  if(scene==='battle'){
    // 撤退確認對話框的按鈕點擊
    if(showRetractConfirm){
      const dialogW=300, dialogH=150;
      const dialogX=(DESIGN_W-dialogW)/2, dialogY=(DESIGN_H-dialogH)/2;
      const btnW=120, btnH=40;
      const btnY=dialogY+dialogH-55;

      // "狠心撤退"按鈕
      const retractBtnX=dialogX+20, retractBtnY=btnY;
      if(cx>=retractBtnX&&cx<retractBtnX+btnW&&cy>=retractBtnY&&cy<retractBtnY+btnH){
        returnToEra();
        showRetractConfirm=false;
        return;
      }

      // "繼續作戰"按鈕
      const continueBtnX=dialogX+dialogW-btnW-20, continueBtnY=btnY;
      if(cx>=continueBtnX&&cx<continueBtnX+btnW&&cy>=continueBtnY&&cy<continueBtnY+btnH){
        showRetractConfirm=false;
        return;
      }
      return;
    }

    // 撤退按鈕
    const retractX=DESIGN_W-80, retractY=8, retractW=60, retractH=24;
    if(cx>=retractX&&cx<retractX+retractW&&cy>=retractY&&cy<retractY+retractH){
      showRetractConfirm=true; // 顯示確認對話框而不是直接confirm
      return;
    }
    // 選項點擊 (新的內聯布局)
    if(!questionAnswered&&currentQuestion){
      const qW=DESIGN_W-160, qH=120; // 與drawBattleSceneLandscape同步
      const qX=(DESIGN_W-qW)/2;
      const qY=GROUND_Y+(DESIGN_H-GROUND_Y-qH)/2;
      const optY=qY+40, optH=35;
      const perOptW=Math.max(80, (DESIGN_W-160-30)/4);
      for(let i=0;i<Math.min(currentQuestion.options.length, 4);i++){
        const optW=perOptW-5;
        const ox=qX+i*(optW+5);
        if(cx>=ox&&cx<ox+optW&&cy>=optY&&cy<optY+optH){
          answerQuestion(i);
          return;
        }
      }
    }
    // 答題後等待玩家點擊繼續（顯示題目解釋）
    if(questionAnswered&&waitingForNextQuestion){
      proceedToNextQuestion();
      return;
    }
    // 道具使用
    const invW=160;
    const invH=100;
    const invX=DESIGN_W-invW-10;
    const invY=(DESIGN_H-invH)/2;
    const itemSpacing=30;
    const itemH=24; // 點擊區域高度
    const items=[
      {key:'noodle', name:'蕎麥麵', heal:15},
      {key:'fish', name:'烤魚', heal:30},
      {key:'tempura', name:'天婦羅蓋飯', heal:50},
    ];
    for(let i=0;i<items.length;i++){
      const iy=invY+12+i*itemSpacing-8; // 與drawInventoryBar同步
      const itemCount=inventory[items[i].key]||0;
      if(itemCount>0&&cx>=invX&&cx<invX+invW&&cy>=iy&&cy<iy+itemH){
        useItem(items[i].key, items[i].heal);
        return;
      }
    }
    return;
  }
  if(scene==='levelClear'){
    // 下一關按鈕
    if(currentStage.stageId<30){
      const nextBtnW=150, nextBtnH=40, nextBtnX=(DESIGN_W/2)-160, nextBtnY=380;
      if(cx>=nextBtnX&&cx<nextBtnX+nextBtnW&&cy>=nextBtnY&&cy<nextBtnY+nextBtnH){
        startNextLevel();
        return;
      }
    }
    // 回到領地按鈕
    const homeBtnW=150, homeBtnH=40, homeBtnX=(DESIGN_W/2)+10, homeBtnY=380;
    if(cx>=homeBtnX&&cx<homeBtnX+homeBtnW&&cy>=homeBtnY&&cy<homeBtnY+homeBtnH){
      returnToMain();
      return;
    }
    return;
  }
  if(dialogText){ closeUI(); return; }
  if(shopOpen){
    const bx=DESIGN_W/2-255,by=DESIGN_H/2-165,bw=510,bh=330;
    const items=[
      {name:'蕎麥麵',price:30,key:'noodle'},
      {name:'烤魚',price:60,key:'fish'},
      {name:'天婦羅蓋飯',price:100,key:'tempura'},
    ];
    for(let i=0;i<3;i++){
      const iy=by+58+i*82;
      const buyBtnX=bx+bw-132, buyBtnY=iy+40;
      if(cx>=buyBtnX&&cx<buyBtnX+112&&cy>=buyBtnY&&cy<buyBtnY+26){
        if(coins>=items[i].price){
          coins-=items[i].price;
          inventory[items[i].key]=(inventory[items[i].key]||0)+1;
          saveProgress();
        }
        return;
      }
    }
    if(cy<DESIGN_H*.28||cy>DESIGN_H*.88||cx<bx||cx>bx+bw) closeUI();
    return;
  }
  if(levelMenuOpen){
    const MW=700, MH=450;
    const MX=(DESIGN_W-MW)/2, MY=(DESIGN_H-MH)/2;
    const itemH=60, itemGap=8;
    const visibleItems=5;
    const maxPages=Math.ceil(30/visibleItems);
    const startIdx=Math.max(0, Math.min(levelMenuPage*visibleItems, 30-visibleItems));
    const endIdx=Math.min(startIdx+visibleItems, 30);

    // 分頁按鈕點擊
    const prevBtnX=MX+20, prevBtnY=MY+MH-40, prevBtnW=50, prevBtnH=24;
    const nextBtnX=MX+MW-70, nextBtnY=MY+MH-40, nextBtnW=50, nextBtnH=24;

    if(cx>=prevBtnX&&cx<prevBtnX+prevBtnW&&cy>=prevBtnY&&cy<prevBtnY+prevBtnH){
      if(levelMenuPage>0) levelMenuPage--;
      return;
    }
    if(cx>=nextBtnX&&cx<nextBtnX+nextBtnW&&cy>=nextBtnY&&cy<nextBtnY+nextBtnH){
      if(levelMenuPage<maxPages-1) levelMenuPage++;
      return;
    }

    // 關卡點擊（縱向排列）
    let clicked=false;
    for(let i=startIdx;i<endIdx;i++){
      const displayIdx=i-startIdx;
      const ly=MY+60+displayIdx*(itemH+itemGap);
      const levelItemX=MX+20, levelItemW=MW-40;
      if(cx>=levelItemX&&cx<levelItemX+levelItemW&&cy>=ly&&cy<ly+itemH){
        if(levelProgress.unlockedLevels[i]){
          enterTeachingScene(i);
          levelMenuOpen=false;
        }
        clicked=true;
        break;
      }
    }
    if(!clicked&&(cx<MX||cx>MX+MW||cy<MY||cy>MY+MH)){
      closeUI();
      levelMenuPage=0; // 關閉時重置頁碼
    }
    return;
  }
  if(portalMenuOpen){
    const MX=(DESIGN_W-945)/2, MY=(DESIGN_H-492)/2;
    const fW=270, fH=339, fY=MY+42;
    // 檢查是否點擊重新遊玩按鈕（當結局完成時）
    if(endingFrame>900){
      const restartW=150, restartH=40;
      const restartX=(DESIGN_W-restartW)/2, restartY=DESIGN_H/2+80;
      if(cx>=restartX&&cx<restartX+restartW&&cy>=restartY&&cy<restartY+restartH){
        // 重置遊戲
        scene='main';
        PL.x=300;
        gems=[false,false,false];
        coins=0;
        inventory={noodle:0,fish:0,tempura:0};
        levelProgress={unlockedLevels:Array(30).fill(false).map((v,i)=>i===0),maxStars:Array(30).fill(0)};
        flagsPlanted={ai:false,cowork:false,code:false};
        portalMenuOpen=false;
        saveProgress();
        return;
      }
    }
    const frames=[
      {name:'ai',fX:MX+42},
      {name:'cowork',fX:MX+42+fW+26},
      {name:'code',fX:MX+42+2*(fW+26)},
    ];
    for(const f of frames){
      if(cx>=f.fX&&cx<f.fX+fW&&cy>=fY&&cy<fY+fH){
        // 檢查是否集齊三顆寶石，如果是，觸發結局
        if(gems[0]&&gems[1]&&gems[2]){
          portalMenuOpen=false;
          scene='ending';
          endingFrame=0;
          saveProgress();
        } else {
          enterEra(f.name);
        }
        return;
      }
    }
    if(cx<MX||cx>MX+945||cy<MY||cy>MY+492) closeUI();
    return;
  }
  // 時代場景：點擊時依靠近的目標互動（靠近傳送門回主城、靠近城堡開關卡選單）
  if(scene==='three-kingdom'||scene==='knight'||scene==='edo'){ interact(); return; }
  // 主城：必須靠近建築才能點擊互動
  if(nearBuilding&&cx>nearBuilding.zone[0]&&cx<nearBuilding.zone[1]) doAction(nearBuilding.id);
}
function showDialog(spk,txt){ dialogSpeaker=spk; dialogText=txt; }

// ── 淡入淡出過渡 ─────────────────────────────────────────
function enterInterior(){
  if(fadeDir!==0) return;
  fadeDir=1; fadeCb=()=>{ scene='interior'; PL.x=1100; };
}
function exitInterior(){
  if(fadeDir!==0) return;
  fadeDir=1; fadeCb=()=>{ scene='main'; PL.x=212; PL.facing=1; };
}
function enterEra(eraName){
  if(fadeDir!==0) return;
  // 重置所有 UI 狀態
  portalMenuOpen=false;
  levelMenuOpen=false;
  shopOpen=false;
  dialogText=null;
  dialogSpeaker=null;

  currentEra=eraName;
  const sceneMap={ai:'three-kingdom',cowork:'knight',code:'edo'};
  fadeDir=1;
  fadeFrame=0;
  fadeCb=()=>{
    scene=sceneMap[eraName];
    PL.x=250;  // 靠近左側傳送門（x=200）
    PL.y=GROUND_Y;
    generateEraGroundMap(); // 生成固定的時期地面貼圖
    if(eraGameData[eraName]===null){
      fetch(`data/claude-${eraName}-game-data.json`).then(r=>r.json()).then(d=>{ eraGameData[eraName]=d; });
    }
  };
}
function returnToMain(){
  if(fadeDir!==0) return;
  // 重置所有 UI 狀態
  portalMenuOpen=false;
  levelMenuOpen=false;
  shopOpen=false;
  dialogText=null;
  dialogSpeaker=null;

  fadeDir=1;
  fadeFrame=0;
  currentEra=null;
  fadeCb=()=>{
    scene='main';
    currentEra=null;
    PL.x=1123;
    PL.y=GROUND_Y;
  };
}

// ── 第三階段：對戰系統函數 ────────────────────────────────
function enterTeachingScene(levelIndex){
  if(fadeDir!==0) return;
  const eraName=currentEra; // currentEra 已是 'ai'/'cowork'/'code'
  const gameData=eraGameData[eraName];

  // 如果數據還沒加載，先加載
  if(!gameData){
    fetch(`data/claude-${eraName}-game-data.json`)
      .then(r=>r.json())
      .then(d=>{
        eraGameData[eraName]=d;
        enterTeachingScene(levelIndex);
      });
    return;
  }

  currentStage=gameData.stages[levelIndex];
  currentQuestionIndex=0;
  playerHP=100;
  maxHP=100;
  hpPerQuestion=Math.floor(100/currentStage.questions.length);
  levelMenuOpen=false;

  // 重置教學場景狀態
  teachingPhase=1;
  campList=[];
  fireParticles=[];

  fadeDir=1;
  fadeFrame=0;
  fadeCb=()=>{
    scene='teaching';
  };
}

function startBattle(){
  if(fadeDir!==0) return;
  fadeDir=1;
  fadeCb=()=>{
    scene='battle';
    currentQuestionIndex=0;
    playerHP=100;
    enemyHP=100;
    maxHP=100;
    questionAnswered=false;
    selectedAnswer=null;
    battleArrows=[]; battleArrowTimer=0; // 清空背景飛箭
    loadCurrentQuestion();
  };
}

function loadCurrentQuestion(){
  if(currentQuestionIndex<currentStage.questions.length){
    currentQuestion=currentStage.questions[currentQuestionIndex];
    questionAnswered=false;
    answerCorrect=false;
    selectedAnswer=null;
    answerTimer=0;
    waitingForNextQuestion=false;
  }
}

function answerQuestion(selectedIndex){
  if(questionAnswered) return;
  questionAnswered=true;
  selectedAnswer=selectedIndex;
  const userAnswer=currentQuestion.options[selectedIndex];
  answerCorrect=userAnswer===currentQuestion.answer;

  // 血量增減 和 動畫觸發
  if(answerCorrect){
    // 答對：扣敵方血量，敵人晃動，敵方血條下方顯示傷害
    enemyHP=Math.max(0, enemyHP-hpPerQuestion);
    enemyShakeFrame=15; // 敵方被攻擊晃動（15幀）
    damageDisplays.push({x:150, y:GROUND_Y/3-50, damage:hpPerQuestion, timer:60}); // 敵方血條左側
  } else {
    // 答錯：扣我方血量，我方晃動，我方血條下方顯示傷害
    playerHP=Math.max(0, playerHP-hpPerQuestion);
    playerAttackFrame=15; // 我方被攻擊晃動（15幀）
    damageDisplays.push({x:DESIGN_W-150, y:GROUND_Y/3-50, damage:hpPerQuestion, timer:60}); // 我方血條右側
  }

  answerTimer=0;
  waitingForNextQuestion=true;
}

function proceedToNextQuestion(){
  currentQuestionIndex++;
  if(currentQuestionIndex>=currentStage.questions.length){
    endBattle();
  } else {
    loadCurrentQuestion();
  }
}

function endBattle(){
  if(playerHP<=0){
    returnToEra();
    return;
  }

  // 計算星評
  const starCount=playerHP>80?3:playerHP>40?2:1;
  levelClearStarCount=starCount; // 保存星級數量以供破關畫面使用

  // 計算掉落物品
  const isLastLevel=currentStage.stageId===30;
  let dropCoins=Math.floor(15+Math.random()*20);
  const items={noodle:0, fish:0, tempura:0};

  if(isLastLevel){
    dropCoins=Math.floor(80+Math.random()*40);
    items.tempura=Math.random()<.5?1:0;
    // 掉落時代寶石
    const gemIndex=currentEra==='ai'?0:currentEra==='cowork'?1:2;
    gems[gemIndex]=true;
    // 插入旗幟
    const eraKey=currentEra; // 'ai'/'cowork'/'code'
    flagsPlanted[eraKey]=true;
  } else {
    const rand=Math.random();
    if(rand<.2) items.noodle=1;
    else if(rand<.3) items.fish=1;
    else if(rand<.35) items.tempura=1;
  }

  // 更新進度
  inventory.noodle+=items.noodle;
  inventory.fish+=items.fish;
  inventory.tempura+=items.tempura;
  const earnedCoins=dropCoins;
  coins+=earnedCoins; // 加到全域玩家銅幣總數

  if(starCount>levelProgress.maxStars[currentStage.stageId-1]){
    levelProgress.maxStars[currentStage.stageId-1]=starCount;
  }

  if(currentStage.stageId<30){
    levelProgress.unlockedLevels[currentStage.stageId]=true;
  }

  levelClearReward={coins:earnedCoins, items};
  saveProgress();

  fadeDir=1;
  fadeCb=()=>{
    scene='levelClear';
  };
}

function returnToEra(){
  if(fadeDir!==0) return;
  fadeDir=1;
  fadeCb=()=>{
    scene=currentEra==='ai'?'three-kingdom':currentEra==='cowork'?'knight':'edo';
    PL.x=250;
    levelMenuOpen=false;
  };
}

function startNextLevel(){
  if(currentStage.stageId<30){
    enterTeachingScene(currentStage.stageId);
  }
}

function updateFade(){
  if(fadeDir===1){
    fadeAlpha=Math.min(1,fadeAlpha+0.0417);
    fadeFrame++;
    if(fadeAlpha>=1){
      if(fadeCb){ fadeCb(); fadeCb=null; }
      fadeDir=-1;
    }
  } else if(fadeDir===-1){
    fadeAlpha=Math.max(0,fadeAlpha-0.0417);
    fadeFrame++;
    if(fadeAlpha<=0) fadeDir=0;
  }
}

// ── 更新玩家 ─────────────────────────────────────────────
function updatePlayer(){
  if(fadeDir===1) return;
  const L=keys['KeyA']||keys['ArrowLeft'] ||touch.L;
  const R=keys['KeyD']||keys['ArrowRight']||touch.R;
  const J=keys['Space']||keys['KeyW']||keys['ArrowUp'];
  if(L){ PL.vx=-PL.speed; PL.facing=-1; }
  else if(R){ PL.vx=PL.speed; PL.facing=1; }
  else{ PL.vx*=0.6; if(Math.abs(PL.vx)<.1){ PL.vx=0; PL.x=Math.round(PL.x); } }
  if(J&&PL.onGround){ PL.vy=PL.jump; PL.onGround=false; }
  if(!PL.onGround) PL.vy+=0.75;
  PL.x+=PL.vx; PL.y+=PL.vy;
  if(PL.y>=GROUND_Y){ PL.y=GROUND_Y; PL.vy=0; PL.onGround=true; }
  const isEraScene=scene==='three-kingdom'||scene==='knight'||scene==='edo';
  const m=scene==='interior'?60:isEraScene?32:16;
  PL.x=Math.max(m,Math.min(DESIGN_W-m,PL.x));
  PL.fTimer++;
  if(Math.abs(PL.vx)>0.3){ if(PL.fTimer>=8){ PL.frame=(PL.frame+1)%4; PL.fTimer=0; } }
  else PL.frame=0;
}

// ── 更新武士NPC ───────────────────────────────────────────
function updateWarriors(){
  const npcList=scene==='main'?warriors:
    scene==='three-kingdom'?eraWarriors['three-kingdom']:
    scene==='knight'?eraWarriors.knight:
    scene==='edo'?eraWarriors.edo:[];

  for(const w of npcList){
    w.timer++;
    if(w.state==='walk'){
      w.x+=w.vx;
      const minX=scene==='main'?768:150, maxX=scene==='main'?988:550;
      if(w.x<minX||w.x>maxX){ w.vx=-w.vx; w.facing=w.vx>0?1:-1; }
      if(w.timer>250&&Math.random()<.004){ w.state='sit'; w.vx=0; w.timer=0; }
    } else {
      if(w.timer>200&&Math.random()<.004){
        w.state='walk';
        w.vx=(Math.random()>.5?1:-1)*(0.25+Math.random()*.35);
        w.facing=w.vx>0?1:-1; w.timer=0;
      }
    }
  }
}

// ── 靠近建築偵測 ─────────────────────────────────────────
function checkNear(){
  const prev=nearBuilding;
  nearBuilding=null;
  for(const b of BUILDINGS){
    if(PL.x>=b.zone[0]&&PL.x<=b.zone[1]){ nearBuilding=b; break; }
  }
  // 離開建築範圍時自動關閉對話框 / 商店
  if(!nearBuilding){
    if(dialogText){ dialogText=null; dialogSpeaker=null; }
    if(shopOpen)  shopOpen=false;
  }

  const isPortal = nearBuilding&&nearBuilding.id==='portal';
  const wasPortal= prev&&prev.id==='portal';
  // 只在領地場景自動打開傳送門菜單，淡入淡出期間禁用自動打開
  if(scene==='main'&&fadeDir===0&&isPortal&&!dialogText&&!shopOpen) portalMenuOpen=true;
  else if(wasPortal&&!isPortal) portalMenuOpen=false;
}

// ══ 像素角色繪製 ══════════════════════════════════════════

// ── 真田幸村（紅甲 + 鹿角）────────────────────────────────
function drawPlayer(x,y,facing,frame){
  const cx=Math.round(x), fy=Math.round(y);
  ctx.save();
  if(facing===-1){ ctx.translate(cx,0); ctx.scale(-1,1); ctx.translate(-cx,0); }

  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(cx-9,fy,18,3); // 陰影

  // 鹿角
  ctx.fillStyle='#d49577';
  ctx.fillRect(cx-8,fy-44,2,8); ctx.fillRect(cx-10,fy-40,3,2); ctx.fillRect(cx-8,fy-47,2,4);
  ctx.fillRect(cx+5,fy-44,2,8); ctx.fillRect(cx+ 7,fy-40,3,2); ctx.fillRect(cx+5,fy-47,2,4);

  // 頭盔
  ctx.fillStyle='#28192f'; ctx.fillRect(cx-5,fy-40,10,2);
  ctx.fillStyle='#f22f46'; ctx.fillRect(cx-5,fy-38,10,8);
  ctx.fillStyle='#fcc539'; for(let i=0;i<3;i++) ctx.fillRect(cx-3+i*3,fy-36,2,4); // 六文錢
  ctx.fillStyle='#28192f'; for(let i=0;i<3;i++) ctx.fillRect(cx-2+i*3,fy-35,1,2);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-6,fy-30,12,2); // 盔簷

  // 臉
  ctx.fillStyle='#fdbd8f'; ctx.fillRect(cx-4,fy-28,8,6);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-2,fy-25,2,1); ctx.fillRect(cx+1,fy-25,2,1);

  // 頸領
  ctx.fillStyle='#633b3f'; ctx.fillRect(cx-2,fy-22,4,2);

  // 肩甲
  ctx.fillStyle='#bc1642';
  ctx.fillRect(cx-8,fy-22,3,5); ctx.fillRect(cx+5,fy-22,3,5);

  // 胸甲
  ctx.fillStyle='#f22f46'; ctx.fillRect(cx-5,fy-22,10,9);
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-4,fy-20,8,1); ctx.fillRect(cx-4,fy-16,8,1);
  ctx.fillStyle='#bc1642'; ctx.fillRect(cx-1,fy-21,2,8);

  // 腰帶
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-5,fy-13,10,2);

  // 袴
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-5,fy-11,10,7);
  ctx.fillStyle='#28192f'; ctx.fillRect(cx-1,fy-9,2,5);

  // 腿（4幀）
  ctx.fillStyle='#3f2323';
  if(frame===1){
    ctx.fillRect(cx-4,fy-6,3,6); ctx.fillRect(cx+1,fy-2,3,3);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-5,fy-2,4,2); ctx.fillRect(cx+2,fy-1,4,2);
  } else if(frame===3){
    ctx.fillRect(cx-4,fy-2,3,3); ctx.fillRect(cx+1,fy-6,3,6);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-5,fy-1,4,2); ctx.fillRect(cx+2,fy-2,4,2);
  } else {
    ctx.fillRect(cx-4,fy-4,3,4); ctx.fillRect(cx+1,fy-4,3,4);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-5,fy-2,4,2); ctx.fillRect(cx+1,fy-2,4,2);
  }
  ctx.restore();
}

// ── 武士NPC ───────────────────────────────────────────────
function drawWarrior(wx,wy,facing,state){
  const cx=Math.round(wx), fy=Math.round(wy);
  ctx.save();
  if(facing===-1){ ctx.translate(cx,0); ctx.scale(-1,1); ctx.translate(-cx,0); }
  ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(cx-7,fy,14,2);
  if(state==='sit'){
    ctx.fillStyle='#432641'; ctx.fillRect(cx-4,fy-30,8,7);
    ctx.fillStyle='#3f2323'; ctx.fillRect(cx-5,fy-28,2,3); ctx.fillRect(cx+3,fy-28,2,3);
    ctx.fillStyle='#845750'; ctx.fillRect(cx-3,fy-25,6,5);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-1,fy-22,1,1); ctx.fillRect(cx+1,fy-22,1,1);
    ctx.fillStyle='#3f2323'; ctx.fillRect(cx-5,fy-20,10,8);
    ctx.fillStyle='#845750'; ctx.fillRect(cx-4,fy-18,8,1);
    ctx.fillStyle='#3f2323'; ctx.fillRect(cx-7,fy-12,14,4);
    ctx.fillRect(cx-7,fy-8,4,8); ctx.fillRect(cx+3,fy-8,4,8);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-8,fy-3,5,3); ctx.fillRect(cx+3,fy-3,5,3);
  } else {
    ctx.fillStyle='#432641'; ctx.fillRect(cx-4,fy-35,8,6);
    ctx.fillStyle='#3f2323'; ctx.fillRect(cx-5,fy-29,2,3); ctx.fillRect(cx+3,fy-29,2,3);
    ctx.fillStyle='#845750'; ctx.fillRect(cx-3,fy-29,6,5);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-1,fy-26,1,1); ctx.fillRect(cx+1,fy-26,1,1);
    ctx.fillStyle='#3f2323'; ctx.fillRect(cx-5,fy-24,10,9);
    ctx.fillStyle='#845750'; ctx.fillRect(cx-4,fy-22,8,1);
    ctx.fillStyle='#3f2323'; ctx.fillRect(cx-4,fy-15,8,11);
    ctx.fillStyle='#28192f'; ctx.fillRect(cx-3,fy-4,3,4); ctx.fillRect(cx+1,fy-4,3,4);
    ctx.fillRect(cx-4,fy-2,4,2); ctx.fillRect(cx+1,fy-2,4,2);
  }
  ctx.restore();
}

// ══ 室內場景（真田屋）════════════════════════════════════
const CEIL_H=120; // 天花板高度（拉低）

// ── 木天井（從內部仰望屋頂）────────────────────────────────
function drawCeiling(h){
  // 木板橫紋
  for(let row=0;row<Math.ceil(h/9);row++){
    const py=row*9, ph=Math.min(9,h-py);
    ctx.fillStyle=row%2===0?'#845750':'#9f705a'; ctx.fillRect(0,py,DESIGN_W,ph);
    ctx.fillStyle='rgba(0,0,0,.18)';
    for(let gx=(row*47)%90;gx<DESIGN_W;gx+=(60+((row*19)%50)))
      ctx.fillRect(gx,py,1,ph);
    ctx.fillStyle='#3f2323'; ctx.fillRect(0,py+ph-1,DESIGN_W,1);
  }
  // 縦梁（垂直木柱，3根，貫通天花板）
  for(const bx of[DESIGN_W*.25,DESIGN_W*.5,DESIGN_W*.75]){
    const bw=14, bxr=bx|0;
    ctx.fillStyle='#3f2323'; ctx.fillRect(bxr-bw/2,0,bw,h);
    ctx.fillStyle='#633b3f'; ctx.fillRect(bxr-bw/2+1,0,3,h);
    ctx.fillStyle='#28192f'; ctx.fillRect(bxr+bw/2-4,0,4,h);
    ctx.strokeStyle='#28192f'; ctx.lineWidth=1;
    ctx.strokeRect(bxr-bw/2+.5,0,bw-1,h);
  }
  // 横桁（1根橫梁，中段）
  const hb=Math.round(h*.42);
  ctx.fillStyle='#3f2323'; ctx.fillRect(0,hb,DESIGN_W,14);
  ctx.fillStyle='#633b3f'; ctx.fillRect(0,hb+1,DESIGN_W,3);
  ctx.fillStyle='#28192f'; ctx.fillRect(0,hb+11,DESIGN_W,3);
  // 天井縁（底部收邊橫梁）
  ctx.fillStyle='#3f2323'; ctx.fillRect(0,h-14,DESIGN_W,14);
  ctx.fillStyle='#633b3f'; ctx.fillRect(0,h-14,DESIGN_W,4);
  ctx.fillStyle='#28192f'; ctx.fillRect(0,h-3,DESIGN_W,3);
  // 向下投影陰影
  const sh=ctx.createLinearGradient(0,h,0,h+12);
  sh.addColorStop(0,'rgba(0,0,0,.45)'); sh.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=sh; ctx.fillRect(0,h,DESIGN_W,12);
}

// ── 室內常數 ─────────────────────────────────────────────
const ENT_X=990;  // 玄關起始X
const BED_X=430;  // 寢室結束X

// ── 背景：直立式木板拼接 + 白色色塊（和室感）───────────────
function drawInteriorBackground(gY){
  const PW=22;
  // 底部1/5家具區頂部
  const furY=gY-Math.round((gY-CEIL_H)/5);

  // ══ 上方牆壁（三區間各異風格）══════════════════════════════

  // ── 寢室（左 x=0~BED_X）：暖淺木色，明亮障子感 ──
  for(let c=0;c<=(BED_X/PW)|0;c++){
    const x2=c*PW, dw=Math.min(PW,BED_X-x2); if(dw<=0)break;
    ctx.fillStyle=['#a9a48d','#9f705a','#c8bc9e'][c%3];
    ctx.fillRect(x2,CEIL_H,dw,furY-CEIL_H);
    if(c>0){ctx.fillStyle='#845750';ctx.fillRect(x2,CEIL_H,1,furY-CEIL_H);}
    if(c%4===1){ctx.fillStyle='rgba(219,207,177,.30)';ctx.fillRect(x2+2,CEIL_H+8,dw-3,furY-CEIL_H-16);}
    ctx.fillStyle='rgba(0,0,0,.05)';
    for(let gy=CEIL_H;gy<furY;gy+=((c*43+28)%80+38)) ctx.fillRect(x2+1,gy,dw-2,1);
  }

  // ── 客廳（中 x=BED_X~ENT_X）：標準深木板，局部障子 ──
  for(let c=(BED_X/PW)|0;c<=(ENT_X/PW)|0;c++){
    const x2=c*PW, dx=Math.max(BED_X,x2), dw=Math.min(ENT_X,x2+PW)-dx; if(dw<=0)continue;
    ctx.fillStyle=c%5===0||c%5===2?'#845750':'#9f705a';
    ctx.fillRect(dx,CEIL_H,dw,furY-CEIL_H);
    if(x2>BED_X){ctx.fillStyle='#3f2323';ctx.fillRect(x2,CEIL_H,1,furY-CEIL_H);}
    if(c%6===3||c%6===4){ctx.fillStyle='rgba(219,207,177,.18)';ctx.fillRect(dx+2,CEIL_H+8,dw-3,furY-CEIL_H-16);}
    ctx.fillStyle='rgba(0,0,0,.07)';
    for(let gy=CEIL_H;gy<furY;gy+=((c*43+28)%80+38)) ctx.fillRect(dx+1,gy,dw-2,1);
  }

  // ── 玄關（右 x=ENT_X~DESIGN_W）：暗色正式，無障子光 ──
  for(let c=(ENT_X/PW)|0;c<=(DESIGN_W/PW)|0;c++){
    const x2=c*PW, dx=Math.max(ENT_X,x2), dw=Math.min(DESIGN_W,x2+PW)-dx; if(dw<=0)continue;
    ctx.fillStyle=['#3f2323','#542323','#633b3f','#3f2323'][c%4];
    ctx.fillRect(dx,CEIL_H,dw,furY-CEIL_H);
    if(x2>ENT_X){ctx.fillStyle='#28192f';ctx.fillRect(x2,CEIL_H,1,furY-CEIL_H);}
    ctx.fillStyle='rgba(0,0,0,.1)';
    for(let gy=CEIL_H;gy<furY;gy+=((c*43+28)%80+38)) ctx.fillRect(dx+1,gy,dw-2,1);
  }

  // 腰板（上下分界）
  ctx.fillStyle='#28192f'; ctx.fillRect(0,furY,DESIGN_W,3);
  ctx.fillStyle='#3f2323'; ctx.fillRect(0,furY+3,DESIGN_W,5);
  ctx.fillStyle='#28192f'; ctx.fillRect(0,furY+8,DESIGN_W,2);

  // ══ 底部1/5（家具背景，各區單色大色塊，無木板紋路）══════════
  const BS=24;
  // 寢室家具區（暖深棕）
  for(let bx=0;bx<BED_X;bx+=BS) for(let by=furY+10;by<gY;by+=BS){
    ctx.fillStyle=['#2a1a1a','#3a2020','#221414'][(bx/BS+by/BS|0)%3];
    ctx.fillRect(bx,by,Math.min(BS,BED_X-bx),Math.min(BS,gY-by));
  }
  // 客廳家具區（深紫棕）
  for(let bx=BED_X;bx<ENT_X;bx+=BS) for(let by=furY+10;by<gY;by+=BS){
    ctx.fillStyle=['#1e1020','#28182e','#180c1e'][(bx/BS+by/BS|0)%3];
    ctx.fillRect(bx,by,Math.min(BS,ENT_X-bx),Math.min(BS,gY-by));
  }
  // 玄關家具區（深黑棕）
  for(let bx=ENT_X;bx<DESIGN_W;bx+=BS) for(let by=furY+10;by<gY;by+=BS){
    ctx.fillStyle=['#1e1212','#2a1818','#161010'][(bx/BS+by/BS|0)%3];
    ctx.fillRect(bx,by,Math.min(BS,DESIGN_W-bx),Math.min(BS,gY-by));
  }
}

// ── 空間隔斷（障子牆）────────────────────────────────────
function drawShojiWall(wx,gY){
  const wallTop=CEIL_H, wallH=gY-CEIL_H;
  ctx.fillStyle='#3f2323'; ctx.fillRect(wx-6,wallTop,12,wallH);
  ctx.fillStyle='#633b3f'; ctx.fillRect(wx-5,wallTop,2,wallH);
  ctx.fillStyle='#28192f'; ctx.fillRect(wx+4,wallTop,2,wallH);
  // 縮小至一半：寬55px，高44%牆高
  const pH=Math.round(wallH*.44), pY=wallTop+Math.round(wallH*.28);
  drawShoji(wx-6-55,pY,55,pH);
  drawShoji(wx+6,   pY,55,pH);
}

// ── 玄關木地板 ───────────────────────────────────────────
function drawEntranceFloor(gY){
  ctx.fillStyle='#845750'; ctx.fillRect(ENT_X,gY,DESIGN_W-ENT_X,DESIGN_H-gY);
  for(let x2=ENT_X;x2<DESIGN_W;x2+=18){
    ctx.fillStyle='#9f705a'; ctx.fillRect(x2,gY,17,DESIGN_H-gY);
    ctx.fillStyle='#3f2323'; ctx.fillRect(x2+17,gY,1,DESIGN_H-gY);
    ctx.fillStyle='#a9a48d'; ctx.fillRect(x2+1,gY,2,DESIGN_H-gY);
  }
  // 段差（踏み台）
  ctx.fillStyle='#3f2323'; ctx.fillRect(ENT_X,gY-10,10,10);
  ctx.fillStyle='#633b3f'; ctx.fillRect(ENT_X,gY-10,10,3);
  ctx.strokeStyle='#28192f'; ctx.lineWidth=1; ctx.strokeRect(ENT_X+.5,gY-10+.5,9,9);
}

// ── 玄關（下駄箱・提燈・出口）────────────────────────────
function drawEntrance(gY){
  ctx.fillStyle=C.accent3; ctx.font='11px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('玄關',1135,CEIL_H+16);
  // 下駄箱
  const sx=1048;
  ctx.fillStyle='#845750'; ctx.fillRect(sx-30,gY-54,60,54);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(sx-30+.5,gY-54+.5,59,53);
  ctx.fillStyle='#633b3f';
  ctx.fillRect(sx-28,gY-36,56,2); ctx.fillRect(sx-28,gY-18,56,2);
  drawGeta(sx-22,gY-52); drawGeta(sx-6,gY-52); drawGeta(sx+8,gY-52);
  drawGeta(sx-22,gY-34); drawGeta(sx-6,gY-34);
  ctx.fillStyle='#a9a48d'; ctx.fillRect(sx-20,gY-16,14,5); ctx.fillRect(sx-4,gY-16,14,5);
  // 提燈
  drawLantern(1160,gY-95);
  // 出口門框
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=3;
  ctx.strokeRect(DESIGN_W-74,CEIL_H+8,60,gY-CEIL_H-8);
  ctx.fillStyle='#102f34'; ctx.fillRect(DESIGN_W-72,CEIL_H+10,56,gY-CEIL_H-12);
  ctx.fillStyle='rgba(20,85,68,.35)'; ctx.fillRect(DESIGN_W-70,CEIL_H+12,52,gY-CEIL_H-16);
}
function drawGeta(x,y){
  ctx.fillStyle='#9f705a'; ctx.fillRect(x,y,14,4);
  ctx.fillStyle='#3f2323'; ctx.fillRect(x+3,y+4,2,4); ctx.fillRect(x+9,y+4,2,4);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x+.5,y+.5,13,7);
}
function drawLantern(x,y){
  ctx.fillStyle='#633b3f'; ctx.fillRect(x-1,y-22,2,22);
  ctx.fillStyle='#fcc539'; ctx.fillRect(x-8,y,16,22);
  ctx.fillStyle='#f87b1b'; ctx.fillRect(x-6,y+2,12,18);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x-8+.5,y+.5,15,21);
  ctx.fillStyle='#845750'; ctx.fillRect(x-5,y-2,10,3); ctx.fillRect(x-5,y+22,10,3);
  drawGlow(x,y+11,'#f87b1b',22);
}

// ── 客廳（書法・盔甲・刀座・座卓・祭壇）─────────────────
function drawLivingRoom(gY){
  ctx.fillStyle=C.accent3; ctx.font='11px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('客廳',710,CEIL_H+16);
  // 書法掛幅（cream邊框加強）
  const scX=510;
  ctx.fillStyle='#ffe08b'; ctx.fillRect(scX-22,CEIL_H+22,44,130);
  ctx.strokeStyle='#845750'; ctx.lineWidth=2; ctx.strokeRect(scX-22+.5,CEIL_H+22+.5,43,129);
  ctx.fillStyle='#633b3f'; ctx.fillRect(scX-24,CEIL_H+18,48,6); ctx.fillRect(scX-24,CEIL_H+150,48,6);
  ctx.fillStyle='#3f2323'; ctx.font='bold 18px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('真',scX,CEIL_H+70); ctx.fillText('田',scX,CEIL_H+98); ctx.fillText('義',scX,CEIL_H+126);
  // 盔甲架（外框）
  drawArmorStand(615,gY);
  drawSwordStand(720,gY);
  // 座卓
  const tx=816;
  ctx.fillStyle='#9f705a'; ctx.fillRect(tx-52,gY-14,104,5);
  ctx.fillStyle='#845750'; ctx.fillRect(tx-48,gY-9,4,9); ctx.fillRect(tx+44,gY-9,4,9);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(tx-52+.5,gY-14+.5,103,5);
  ctx.fillStyle='#3f2323'; ctx.fillRect(tx-12,gY-18,10,4);
  ctx.fillStyle='#633b3f'; ctx.fillRect(tx+5,gY-16,6,3); ctx.fillRect(tx-16,gY-16,6,3);
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('座卓',tx,gY-28);
  // 祭壇
  const ax=910;
  ctx.fillStyle='#3f2323'; ctx.fillRect(ax-32,gY-56,64,56);
  ctx.fillStyle='#845750'; ctx.fillRect(ax-30,gY-52,60,4);
  ctx.fillStyle='#fcc539'; ctx.fillRect(ax-22,gY-66,4,12); ctx.fillRect(ax+18,gY-66,4,12);
  drawGlow(ax-20,gY-67,'#f87b1b',14); drawGlow(ax+20,gY-67,'#f87b1b',14);
  ctx.fillStyle='#845750'; ctx.fillRect(ax-6,gY-60,12,10);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(ax-6+.5,gY-60+.5,11,9);
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('祭壇',ax,gY-74);
}

// ── 寢室（押入れ・書桌・布団）───────────────────────────
function drawBedroom(gY){
  ctx.fillStyle=C.accent3; ctx.font='11px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('寢室',215,CEIL_H+16);
  // 押入れ（木製滑門，無cream）
  const cX=90;
  const cwT=CEIL_H+16, cwH=gY-cwT;
  ctx.fillStyle='#633b3f'; ctx.fillRect(cX-50,cwT,100,cwH);
  // 左扉
  ctx.fillStyle='#845750'; ctx.fillRect(cX-48,cwT+4,46,cwH-8);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(cX-48+.5,cwT+4+.5,45,cwH-9);
  ctx.fillStyle='#633b3f';
  ctx.fillRect(cX-46,cwT+8,42,2); ctx.fillRect(cX-46,cwT+(cwH/3|0),42,2); ctx.fillRect(cX-46,cwT+(cwH*2/3|0),42,2);
  // 右扉
  ctx.fillStyle='#9f705a'; ctx.fillRect(cX+2,cwT+4,46,cwH-8);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(cX+2+.5,cwT+4+.5,45,cwH-9);
  ctx.fillStyle='#845750';
  ctx.fillRect(cX+4,cwT+8,42,2); ctx.fillRect(cX+4,cwT+(cwH/3|0),42,2); ctx.fillRect(cX+4,cwT+(cwH*2/3|0),42,2);
  // 引手（金色拉手）
  ctx.fillStyle='#fcc539';
  ctx.fillRect(cX-10,cwT+(cwH/2|0)-3,6,6); ctx.fillRect(cX+4,cwT+(cwH/2|0)-3,6,6);
  // 中柱+外框
  ctx.fillStyle='#3f2323'; ctx.fillRect(cX-2,cwT,4,cwH);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=2; ctx.strokeRect(cX-50+.5,cwT+.5,99,cwH-1);
  // 書桌（cream外框）
  const dX=240;
  ctx.fillStyle='#9f705a'; ctx.fillRect(dX-36,gY-38,72,5);
  ctx.fillStyle='#845750'; ctx.fillRect(dX-33,gY-33,4,33); ctx.fillRect(dX+29,gY-33,4,33);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(dX-36+.5,gY-38+.5,71,5);
  ctx.fillStyle='#28192f'; ctx.fillRect(dX-16,gY-41,22,4);
  ctx.fillStyle='#f22f46'; ctx.fillRect(dX+5,gY-50,5,12);
  ctx.fillStyle='#fcc539'; ctx.fillRect(dX+11,gY-52,5,14);
  ctx.fillStyle='#315dcd'; ctx.fillRect(dX+17,gY-48,5,10);
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('書桌',dX,gY-62);
  // 布団（cream外框）
  drawFuton(352,gY);
}

// ── 2倍玩家（室內用）────────────────────────────────────
function drawPlayerScaled(x,y,facing,frame,s){
  const rx=Math.round(x), ry=Math.round(y);
  if(!s||s===1){ drawPlayer(rx,ry,facing,frame); return; }
  ctx.save();
  ctx.translate(rx,ry); ctx.scale(s,s); ctx.translate(-rx,-ry);
  drawPlayer(rx,ry,facing,frame);
  ctx.restore();
}

function drawInterior(){
  const gY=GROUND_Y;
  drawInteriorBackground(gY);
  drawCeiling(CEIL_H);
  // 榻榻米（寢室＋客廳，x=0～ENT_X）
  ctx.save(); ctx.beginPath(); ctx.rect(0,gY,ENT_X,DESIGN_H-gY); ctx.clip();
  drawTatami(gY);
  ctx.restore();
  // 玄關木地板
  drawEntranceFloor(gY);
  // 三個空間內容
  drawBedroom(gY);
  drawLivingRoom(gY);
  drawEntrance(gY);
  // 空間隔斷（後繪覆蓋家具邊緣）
  drawShojiWall(BED_X,gY);
  drawShojiWall(ENT_X,gY);
  // 玩家（2倍大小）
  drawPlayerScaled(PL.x,PL.y,PL.facing,PL.frame,2);
  ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(0,DESIGN_H-30,DESIGN_W,30);
  ctx.fillStyle=C.accent3; ctx.font='13px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('【 E鍵 / 點擊 】 離開真田屋',DESIGN_W/2,DESIGN_H-10);
}

// ── 障子（單片拉門）─────────────────────────────────────
function drawShoji(x,y,w,h){
  ctx.fillStyle='#dbcfb1'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#845750'; ctx.lineWidth=3; ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.strokeStyle='#9f705a'; ctx.lineWidth=1;
  // 縱格子
  const vc=Math.max(2,(w/28)|0);
  for(let c=1;c<vc;c++){
    ctx.beginPath(); ctx.moveTo(x+c*(w/vc),y+4); ctx.lineTo(x+c*(w/vc),y+h-4); ctx.stroke();
  }
  // 橫格子（上段密，下段疏）
  const gridH=Math.round(h*.6);
  for(let r=1;r<5;r++){
    ctx.beginPath(); ctx.moveTo(x+4,y+r*(gridH/5)); ctx.lineTo(x+w-4,y+r*(gridH/5)); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x+4,y+gridH); ctx.lineTo(x+w-4,y+gridH); ctx.stroke();
  // 下部腰板（深色木板）
  ctx.fillStyle='#a9a48d'; ctx.fillRect(x+4,y+gridH+1,w-8,h-gridH-6);
  ctx.strokeStyle='#845750'; ctx.lineWidth=1;
  ctx.strokeRect(x+4+.5,y+gridH+1+.5,w-9,h-gridH-8);
  // 拉手（引手）
  ctx.fillStyle='#fcc539'; ctx.fillRect(x+w/2-3,y+gridH+Math.round((h-gridH)/2)-3,6,6);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x+w/2-3+.5,y+gridH+Math.round((h-gridH)/2)-3+.5,5,5);
}

function drawTatami(gY){
  // 榻榻米：僅地板表面一層（14px 薄），下方露木地板
  const surfH=14, mw=160;
  for(let c=0;c<Math.ceil(ENT_X/mw)+1;c++){
    const tx=c*mw, tw=Math.min(mw,ENT_X-tx); if(tw<=0)break;
    ctx.fillStyle=c%2===0?'#dbcfb1':'#a9a48d'; ctx.fillRect(tx,gY,tw,surfH);
    ctx.strokeStyle='#8c3132'; ctx.lineWidth=1; ctx.strokeRect(tx+.5,gY+.5,tw-1,surfH-1);
    ctx.fillStyle=c%2===0?'#c8bc9e':'#9a9480';
    for(let l=4;l<surfH;l+=4) ctx.fillRect(tx+2,gY+l,tw-4,1);
  }
  // 疊下方 = 木地板（同玄關橫向板）
  for(let x2=0;x2<ENT_X;x2+=18){
    const fw=Math.min(18,ENT_X-x2);
    ctx.fillStyle='#9f705a'; ctx.fillRect(x2,gY+surfH,fw,DESIGN_H-gY-surfH);
    ctx.fillStyle='#3f2323'; ctx.fillRect(x2+fw-1,gY+surfH,1,DESIGN_H-gY-surfH);
    ctx.fillStyle='#a9a48d'; ctx.fillRect(x2+1,gY+surfH,2,DESIGN_H-gY-surfH);
  }
}

// ── 家具（比例對應玩家46px高）──────────────────────────────
function drawFuton(x,gY){
  // 敷布団（薄墊）
  px(x-40,gY-14,80,14,'#dbcfb1',C.outline);
  ctx.fillStyle='#b8ad94';
  for(let i=0;i<5;i++) ctx.fillRect(x-34+i*14,gY-12,1,8);
  ctx.fillRect(x-34,gY-7,68,1);
  // 掛布団（蓋被）
  px(x-38,gY-24,76,10,'#4c3250',C.outline);
  px(x-36,gY-26,72,3,'#7c3ce1','#28192f');
  // 枕
  px(x-38,gY-30,24,7,'#f22f46','#3f2323');
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('寢具',x,gY-36);
}

function drawArmorStand(x,gY){
  // 台座
  ctx.fillStyle='#9f705a'; ctx.fillRect(x-16,gY-6,32,6);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x-16+.5,gY-6+.5,31,5);
  // 支柱
  ctx.fillStyle='#633b3f';
  ctx.fillRect(x-2,gY-52,4,46);
  ctx.fillRect(x-14,gY-50,28,3);
  // 胸甲（縮小為20px寬20px高）
  ctx.fillStyle='#f22f46'; ctx.fillRect(x-10,gY-46,20,20);
  ctx.fillStyle='#fcc539'; ctx.fillRect(x-8,gY-42,16,1); ctx.fillRect(x-8,gY-38,16,1);
  ctx.fillStyle='#bc1642'; ctx.fillRect(x-1,gY-45,2,18);
  // 頭盔（14px寬12px高）
  ctx.fillStyle='#f22f46'; ctx.fillRect(x-7,gY-60,14,12);
  ctx.fillStyle='#fcc539'; for(let i=0;i<3;i++) ctx.fillRect(x-2+i*2,gY-59,1,4);
  // 鹿角（小）
  ctx.fillStyle='#d49577';
  ctx.fillRect(x-9,gY-62,1,4); ctx.fillRect(x-10,gY-60,2,2);
  ctx.fillRect(x+7,gY-62,1,4); ctx.fillRect(x+8,gY-60,2,2);
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('盔甲架',x,gY-70);
}

function drawSwordStand(x,gY){
  // 台座
  ctx.fillStyle='#9f705a'; ctx.fillRect(x-20,gY-6,40,6);
  ctx.strokeStyle='#3f2323'; ctx.lineWidth=1; ctx.strokeRect(x-20+.5,gY-6+.5,39,5);
  ctx.fillStyle='#633b3f';
  ctx.fillRect(x-18,gY-24,36,3); // 上橫桿
  ctx.fillRect(x-18,gY-12,36,3); // 下橫桿
  // 刀（上）
  ctx.fillStyle='#a18897'; ctx.fillRect(x-24,gY-26,48,2);
  ctx.fillStyle='#fcc539'; ctx.fillRect(x+22,gY-28,5,6);
  ctx.fillStyle='#3f2323'; ctx.fillRect(x-26,gY-27,3,4);
  // 刀（下）
  ctx.fillStyle='#a18897'; ctx.fillRect(x-22,gY-14,46,2);
  ctx.fillStyle='#fcc539'; ctx.fillRect(x+21,gY-16,5,6);
  ctx.fillStyle='#3f2323'; ctx.fillRect(x-24,gY-15,3,4);
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('刀掛',x,gY-35);
}


// ══ UI 系統 ═══════════════════════════════════════════════

function drawLabels(){
  const isEraScene=scene==='three-kingdom'||scene==='knight'||scene==='edo';
  if(!isEraScene&&(scene!=='main'||!nearBuilding)) return;

  if(isEraScene){
    const col=scene==='three-kingdom'?eraColors.ai:
      scene==='knight'?eraColors.cowork:eraColors.code;

    // 時代場景標籤：左側傳送門（靠近 x=200）
    const distToPortal=Math.abs(PL.x-200);
    if(distToPortal<100){
      const text='[ E ] 回到領地';
      ctx.font='11px DotGothic16';
      const hw=ctx.measureText(text).width;
      ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(PL.x-hw/2-7,PL.y-62,hw+14,18);
      ctx.fillStyle=col.accent2||'#fcc539'; ctx.textAlign='center'; ctx.fillText(text,PL.x,PL.y-48);
    }

    // 右側城堡標籤（靠近 x=1050）
    const distToCastle=Math.abs(PL.x-1050);
    if(distToCastle<150){
      const text='[ E ] 選擇關卡';
      ctx.font='11px DotGothic16';
      const hw=ctx.measureText(text).width;
      ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(PL.x-hw/2-7,PL.y-62,hw+14,18);
      ctx.fillStyle=col.accent2||'#fcc539'; ctx.textAlign='center'; ctx.fillText(text,PL.x,PL.y-48);
    }
  } else {
    const b=nearBuilding;
    const lx=b.cx, ly=GROUND_Y-b.top-18;
    ctx.font='12px DotGothic16';
    const tw=ctx.measureText(b.name).width;
    ctx.fillStyle='rgba(16,47,52,.88)'; ctx.fillRect(lx-tw/2-10,ly-17,tw+20,20);
    ctx.strokeStyle=C.accent2; ctx.lineWidth=1; ctx.strokeRect(lx-tw/2-10+.5,ly-17+.5,tw+19,19);
    ctx.fillStyle=C.accent2; ctx.textAlign='center'; ctx.fillText(b.name,lx,ly);
    if(b.id!=='portal'){
      const hint=b.id==='sanada'?'[ E ] 進入 真田屋':'[ E ] 互動';
      ctx.font='11px DotGothic16';
      const hw=ctx.measureText(hint).width;
      ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(PL.x-hw/2-7,PL.y-62,hw+14,18);
      ctx.fillStyle='#ffe08b'; ctx.textAlign='center'; ctx.fillText(hint,PL.x,PL.y-48);
    }
  }
}

function drawDialog(){
  if(!dialogText) return;
  const bx=40,by=DESIGN_H-138,bw=DESIGN_W-80,bh=125;
  ctx.fillStyle='rgba(8,12,18,.92)'; ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle=C.accent2; ctx.lineWidth=2; ctx.strokeRect(bx+1,by+1,bw-2,bh-2);
  ctx.strokeStyle=C.accent3; ctx.lineWidth=1; ctx.strokeRect(bx+5,by+5,bw-10,bh-10);
  ctx.fillStyle=C.accent2; ctx.font='13px DotGothic16'; ctx.textAlign='left';
  ctx.fillText('【 '+dialogSpeaker+' 】',bx+16,by+26);
  ctx.fillStyle='#fff'; ctx.font='14px DotGothic16';
  wrapText(dialogText,bx+16,by+54,bw-32,22);
  ctx.fillStyle=C.accent3; ctx.font='10px DotGothic16'; ctx.textAlign='right';
  ctx.fillText('ESC / 輕觸 關閉',bx+bw-12,by+bh-8);
}

function wrapText(text,x,y,maxW,lineH){
  let line='';
  for(const ch of text){
    const t=line+ch;
    if(ctx.measureText(t).width>maxW){ ctx.fillText(line,x,y); line=ch; y+=lineH; }
    else line=t;
  }
  if(line) ctx.fillText(line,x,y);
}

// ── 關卡選單 ──────────────────────────────────────────────
function drawLevelMenu(){
  if(!levelMenuOpen) return;

  const eraData=currentEra==='ai'?{'themeId':'claude-ai','era':'三國時期','data':eraGameData.ai}:
    currentEra==='cowork'?{'themeId':'claude-cowork','era':'騎士時期','data':eraGameData.cowork}:
    {'themeId':'claude-code','era':'江戶時期','data':eraGameData.code};

  const MW=700, MH=450;
  const MX=(DESIGN_W-MW)/2, MY=(DESIGN_H-MH)/2;

  ctx.fillStyle='rgba(8,12,18,.94)'; ctx.fillRect(MX,MY,MW,MH);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=2; ctx.strokeRect(MX+1,MY+1,MW-2,MH-2);
  ctx.fillStyle='#fcc539'; ctx.font='16px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('── '+eraData.era+' 關卡選擇 ──',MX+MW/2,MY+32);

  // 縱向排列關卡（最多5個可见）
  const itemH=60, itemGap=8;
  const visibleItems=5;
  const startIdx=Math.max(0, Math.min(levelMenuPage*visibleItems, 30-visibleItems));
  const endIdx=Math.min(startIdx+visibleItems, 30);

  for(let i=startIdx;i<endIdx;i++){
    const displayIdx=i-startIdx;
    const ly=MY+60+displayIdx*(itemH+itemGap);
    const unlocked=levelProgress.unlockedLevels[i];
    const maxStar=levelProgress.maxStars[i];
    const stageName=eraData.data?.stages?.[i]?.stageName||'第 '+(i+1)+' 關';
    const enemy=eraData.data?.stages?.[i]?.enemy||'未知敵人';

    // 背景
    ctx.fillStyle=unlocked?'rgba(60,20,20,.3)':'rgba(30,30,30,.5)';
    ctx.fillRect(MX+20, ly, MW-40, itemH);
    ctx.strokeStyle=unlocked?'#f22f46':'#666';
    ctx.lineWidth=1;
    ctx.strokeRect(MX+20, ly, MW-40, itemH);

    if(!unlocked){
      // 鎖定狀態
      ctx.fillStyle='#999';
      ctx.font='14px DotGothic16';
      ctx.textAlign='left';
      ctx.fillText('🔒 鎖定', MX+35, ly+35);
    } else {
      // 已解鎖：顯示關卡名稱、敵人、星星
      ctx.fillStyle='#fcc539';
      ctx.font='bold 12px DotGothic16';
      ctx.textAlign='left';
      ctx.fillText(stageName, MX+35, ly+20);

      ctx.fillStyle='#ffe08b';
      ctx.font='11px DotGothic16';
      ctx.fillText('敵將：'+enemy, MX+35, ly+37);

      // 星星
      ctx.fillStyle='#fcc539';
      ctx.font='12px DotGothic16';
      for(let s=0;s<3;s++){
        ctx.fillText(s<maxStar?'★':'☆', MX+35+s*18, ly+52);
      }
    }
  }

  // 分頁按鈕
  const maxPages=Math.ceil(30/visibleItems);
  const prevBtnX=MX+20, prevBtnY=MY+MH-40, prevBtnW=50, prevBtnH=24;
  const nextBtnX=MX+MW-70, nextBtnY=MY+MH-40, nextBtnW=50, nextBtnH=24;

  ctx.fillStyle=levelMenuPage>0?'rgba(100,100,100,0.7)':'rgba(50,50,50,0.5)';
  ctx.fillRect(prevBtnX,prevBtnY,prevBtnW,prevBtnH);
  ctx.strokeStyle=levelMenuPage>0?'#fcc539':'#666';
  ctx.lineWidth=1;
  ctx.strokeRect(prevBtnX+0.5,prevBtnY+0.5,prevBtnW-1,prevBtnH-1);
  ctx.fillStyle=levelMenuPage>0?'#fcc539':'#666';
  ctx.font='11px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('◀上頁',prevBtnX+prevBtnW/2,prevBtnY+prevBtnH/2+4);

  ctx.fillStyle=levelMenuPage<maxPages-1?'rgba(100,100,100,0.7)':'rgba(50,50,50,0.5)';
  ctx.fillRect(nextBtnX,nextBtnY,nextBtnW,nextBtnH);
  ctx.strokeStyle=levelMenuPage<maxPages-1?'#fcc539':'#666';
  ctx.lineWidth=1;
  ctx.strokeRect(nextBtnX+0.5,nextBtnY+0.5,nextBtnW-1,nextBtnH-1);
  ctx.fillStyle=levelMenuPage<maxPages-1?'#fcc539':'#666';
  ctx.font='11px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('下頁▶',nextBtnX+nextBtnW/2,nextBtnY+nextBtnH/2+4);

  // 頁碼顯示
  ctx.fillStyle='#999';
  ctx.font='11px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('第 '+(levelMenuPage+1)+' / '+maxPages+' 頁',MX+MW/2,MY+MH-10);
}

function drawShopUI(){
  if(!shopOpen) return;
  const bx=DESIGN_W/2-255,by=DESIGN_H/2-165,bw=510,bh=330;
  ctx.fillStyle='rgba(8,12,18,.94)'; ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle=C.accent2; ctx.lineWidth=2; ctx.strokeRect(bx+1,by+1,bw-2,bh-2);
  ctx.strokeStyle='#334'; ctx.lineWidth=1; ctx.strokeRect(bx+6,by+6,bw-12,bh-12);
  ctx.fillStyle=C.accent2; ctx.font='16px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('── 雜 貨 舖 ──',DESIGN_W/2,by+32);

  // 顯示當前銅幣
  ctx.fillStyle='#fcc539'; ctx.font='12px DotGothic16'; ctx.textAlign='right';
  ctx.fillText('銅幣：'+coins,bx+bw-20,by+32);

  const items=[
    {name:'蕎麥麵',    heal:'+15 HP',price:30, col:'#ffe08b', key:'noodle'},
    {name:'烤魚',      heal:'+30 HP',price:60, col:'#f87b1b', key:'fish'},
    {name:'天婦羅蓋飯',heal:'+50 HP',price:100,col:'#f22f46', key:'tempura'},
  ];
  items.forEach((item,i)=>{
    const iy=by+58+i*82;
    ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(bx+14,iy,bw-28,70);
    ctx.strokeStyle='rgba(255,255,255,.1)'; ctx.lineWidth=1;
    ctx.strokeRect(bx+14+.5,iy+.5,bw-29,69);
    ctx.fillStyle=item.col; ctx.font='15px DotGothic16'; ctx.textAlign='left';
    ctx.fillText(item.name,bx+28,iy+24);
    ctx.fillStyle='#7bd7a9'; ctx.font='12px DotGothic16';
    ctx.fillText('回復 '+item.heal,bx+28,iy+46);
    ctx.fillStyle=C.accent2; ctx.font='14px DotGothic16'; ctx.textAlign='right';
    ctx.fillText(item.price+' 銅幣',bx+bw-28,iy+24);

    // 購買按鈕
    const canBuy=coins>=item.price;
    ctx.fillStyle=canBuy?'rgba(252,197,57,.28)':'rgba(100,100,100,.18)';
    ctx.fillRect(bx+bw-132,iy+40,112,26);
    ctx.strokeStyle=canBuy?C.accent2:'#666'; ctx.lineWidth=1;
    ctx.strokeRect(bx+bw-132+.5,iy+40+.5,111,25);
    ctx.fillStyle=canBuy?C.accent3:'#666'; ctx.font='11px DotGothic16'; ctx.textAlign='center';
    ctx.fillText('購買',bx+bw-76,iy+57);
  });
  ctx.fillStyle=C.accent3; ctx.font='11px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('ESC / 點擊外部 關閉',DESIGN_W/2,by+bh-10);
}

// ══ 傳送門選單（三時代大框版）════════════════════════════
function drawPortalMenu(){
  if(!portalMenuOpen) return;
  const MW=945, MH=492;
  const MX=(DESIGN_W-MW)/2, MY=(DESIGN_H-MH)/2;

  // 底板（深綠半透明）
  ctx.fillStyle='rgba(8,46,22,.92)'; ctx.fillRect(MX,MY,MW,MH);
  // 金色雙框
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=3; ctx.strokeRect(MX+1,MY+1,MW-2,MH-2);
  ctx.strokeStyle='#ffe08b'; ctx.lineWidth=1; ctx.strokeRect(MX+5,MY+5,MW-10,MH-10);
  // 標題
  ctx.fillStyle='#ffe08b'; ctx.font='18px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('── 石 製 傳 送 門 ── 選 擇 時 代 ──',MX+MW/2,MY+26);
  ctx.fillStyle='#fcc53966'; ctx.fillRect(MX+20,MY+34,MW-40,1);

  // 三個時代框（1.5x：fW=270, fH=339, gap=26）
  const fW=270, fH=339, fY=MY+42;
  const eras=[
    {era:'三國時期', sub:'Claude AI',     fX:MX+42},
    {era:'騎士時期', sub:'Claude Cowork', fX:MX+42+fW+26},
    {era:'江戶時期', sub:'Claude Code',   fX:MX+42+2*(fW+26)},
  ];
  eras.forEach((e,i)=> drawEraFrame(e.fX,fY,fW,fH,e,i));

  // 寶石缺口顯示
  const gemY=MY+MH-75;
  const gemNames=['翡翠','紅寶石','黃玉'];
  const gemColors=['#52b281','#f22f46','#fcc539'];
  for(let i=0;i<3;i++){
    const gx=MX+60+i*290;
    ctx.fillStyle=gems[i]?gemColors[i]+'66':'#333333';
    ctx.fillRect(gx,gemY,60,30);
    ctx.strokeStyle=gems[i]?gemColors[i]:'#666';
    ctx.lineWidth=gems[i]?2:1;
    ctx.strokeRect(gx+0.5,gemY+0.5,59,29);
    ctx.fillStyle=gems[i]?gemColors[i]:'#999';
    ctx.font='11px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText(gemNames[i],gx+30,gemY+20);
  }

  // 關閉提示
  ctx.fillStyle='rgba(255,255,255,.22)'; ctx.font='12px DotGothic16'; ctx.textAlign='right';
  ctx.fillText('ESC / 點外關閉',MX+MW-10,MY+MH-5);
}

function drawEraFrame(fX,fY,fW,fH,data,idx){
  const fcx=(fX+fW/2)|0;
  const bdrCol=['#f22f46','#315dcd','#fcc539'][idx];
  const bgCol =['rgba(60,8,16,.52)','rgba(8,24,72,.52)','rgba(52,42,0,.52)'][idx];

  ctx.fillStyle=bgCol;  ctx.fillRect(fX,fY,fW,fH);
  ctx.strokeStyle=bdrCol; ctx.lineWidth=2; ctx.strokeRect(fX+1,fY+1,fW-2,fH-2);
  ctx.strokeStyle=bdrCol+'55'; ctx.lineWidth=1; ctx.strokeRect(fX+4,fY+4,fW-8,fH-8);

  // 寶石鑲嵌在頂部邊框上
  drawEraGem(fcx,fY,idx);

  // 時代名稱（字體隨框放大）
  ctx.fillStyle=bdrCol; ctx.font='18px DotGothic16'; ctx.textAlign='center';
  ctx.fillText(data.era,fcx,fY+40);
  ctx.fillStyle='rgba(255,255,255,.42)'; ctx.font='13px DotGothic16';
  ctx.fillText(data.sub,fcx,fY+60);
  ctx.fillStyle=bdrCol+'55'; ctx.fillRect(fX+14,fY+68,fW-28,1);

  // 時代旗幟
  drawEraFlag(fcx,fY+148,idx);
  ctx.fillStyle=bdrCol+'44'; ctx.fillRect(fX+14,fY+158,fW-28,1);

  // 大魔王像素圖（在更大的空間內居中）
  const bossY=fY+fH-16;
  if(idx===0) drawBossCaoCao(fcx,bossY);
  else if(idx===1) drawBossArthur(fcx,bossY);
  else drawBossIeyasu(fcx,bossY);
}

// ── 寶石（菱形像素，鑲頂部邊框）────────────────────────
function drawEraGem(cx,fy,idx){
  const cols=[
    ['#52b281','#7bd7a9','#148568'],  // 翡翠
    ['#f22f46','#fb7575','#bc1642'],  // 紅寶石
    ['#fcc539','#ffe08b','#f87b1b'],  // 黃玉
  ][idx];
  const[mid,hi,dk]=cols;
  const gx=cx-8, gy=fy-9;
  ctx.fillStyle='#28192f'; ctx.fillRect(gx+3,gy,10,16);
  ctx.fillStyle=dk;  ctx.fillRect(gx+4,gy+1,8,14);
  ctx.fillStyle=mid; ctx.fillRect(gx+5,gy+2,6,12);
  ctx.fillStyle=hi;  ctx.fillRect(gx+6,gy+3,4,5);
  ctx.fillStyle='#ffffff'; ctx.fillRect(gx+7,gy+3,2,2);
  // 左右缺口（菱形感）
  ctx.fillStyle='#28192f'; ctx.fillRect(gx,gy+5,5,6); ctx.fillRect(gx+11,gy+5,5,6);
  ctx.fillStyle=mid;       ctx.fillRect(gx+2,gy+5,3,6); ctx.fillRect(gx+11,gy+5,3,6);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=1;
  ctx.strokeRect(gx+3+.5,gy+.5,10-1,16-1);
}

// ── 大魔王：曹操 ─────────────────────────────────────
function drawBossCaoCao(cx,by){
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(cx-14,by,28,3);
  // 袍服
  ctx.fillStyle='#22474c'; ctx.fillRect(cx-12,by-38,24,38);
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-12,by-36,24,2); ctx.fillRect(cx-12,by-12,24,4);
  ctx.fillStyle='#102f34'; ctx.fillRect(cx-1,by-36,2,36);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-14,by-41,5,8); ctx.fillRect(cx+9,by-41,5,8);
  // 臉
  ctx.fillStyle='#fdbd8f'; ctx.fillRect(cx-5,by-53,10,9);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-2,by-50,2,1); ctx.fillRect(cx+1,by-50,2,1);
  ctx.fillRect(cx-2,by-47,4,1);
  // 中式頭盔
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-6,by-63,12,10);
  ctx.fillStyle='#f22f46'; ctx.fillRect(cx-5,by-62,10,9);
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-2,by-68,4,6);
  ctx.fillRect(cx-8,by-64,3,6); ctx.fillRect(cx+5,by-64,3,6);
  ctx.fillStyle='#f22f46'; ctx.fillRect(cx-11,by-68,4,7); ctx.fillRect(cx+7,by-68,4,7);
  // 羽扇
  ctx.fillStyle='#ffe08b'; ctx.fillRect(cx+12,by-36,6,10);
  ctx.fillStyle='#dbcfb1'; ctx.fillRect(cx+11,by-42,2,7); ctx.fillRect(cx+15,by-42,2,7);
  ctx.fillStyle='#f22f46'; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('曹操',cx,by-72);
}

// ── 大魔王：亞瑟王 ───────────────────────────────────
function drawBossArthur(cx,by){
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(cx-14,by,28,3);
  // 甲冑
  ctx.fillStyle='#668faf'; ctx.fillRect(cx-12,by-38,24,38);
  ctx.fillStyle='#eaeae8'; ctx.fillRect(cx-10,by-36,20,2); ctx.fillRect(cx-10,by-12,20,3);
  ctx.fillStyle='#315dcd'; ctx.fillRect(cx-1,by-36,2,38);
  // 肩甲
  ctx.fillStyle='#585d81'; ctx.fillRect(cx-15,by-42,5,9); ctx.fillRect(cx+10,by-42,5,9);
  ctx.fillStyle='#668faf'; ctx.fillRect(cx-15,by-42,5,2); ctx.fillRect(cx+10,by-42,5,2);
  // 盾（左）
  ctx.fillStyle='#315dcd'; ctx.fillRect(cx-20,by-37,10,26);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=1; ctx.strokeRect(cx-20+.5,by-37+.5,9,25);
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-17,by-27,2,6); ctx.fillRect(cx-18,by-25,4,2);
  // 劍（右）
  ctx.fillStyle='#a18897'; ctx.fillRect(cx+13,by-52,2,34);
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx+9,by-34,10,3);
  // 臉
  ctx.fillStyle='#fdbd8f'; ctx.fillRect(cx-5,by-53,10,9);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-2,by-50,2,1); ctx.fillRect(cx+1,by-50,2,1);
  // 王冠頭盔
  ctx.fillStyle='#668faf'; ctx.fillRect(cx-6,by-63,12,10);
  ctx.fillStyle='#a0d8d7'; ctx.fillRect(cx-5,by-62,10,9);
  ctx.fillStyle='#fcc539';
  ctx.fillRect(cx-5,by-69,3,7); ctx.fillRect(cx-1,by-71,2,9); ctx.fillRect(cx+3,by-69,3,7);
  ctx.fillStyle='#315dcd'; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('亞瑟王',cx,by-75);
}

// ── 大魔王：德川家康 ─────────────────────────────────
function drawBossIeyasu(cx,by){
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(cx-14,by,28,3);
  // 大鎧
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-12,by-38,24,38);
  ctx.fillStyle='#845750'; ctx.fillRect(cx-10,by-36,20,2); ctx.fillRect(cx-10,by-12,20,3);
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-12,by-14,24,4);
  // 大袖
  ctx.fillStyle='#28192f'; ctx.fillRect(cx-17,by-43,7,13); ctx.fillRect(cx+10,by-43,7,13);
  ctx.fillStyle='#845750'; ctx.fillRect(cx-17,by-43,7,2); ctx.fillRect(cx+10,by-43,7,2);
  // 臉
  ctx.fillStyle='#fdbd8f'; ctx.fillRect(cx-5,by-53,10,9);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-2,by-50,2,1); ctx.fillRect(cx+1,by-50,2,1);
  // 兜（大鎧頭盔）
  ctx.fillStyle='#28192f'; ctx.fillRect(cx-7,by-63,14,10);
  ctx.fillStyle='#3f2323'; ctx.fillRect(cx-6,by-62,12,9);
  // 前立（金色）
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-2,by-73,4,11); ctx.fillRect(cx-5,by-70,10,2);
  // 葵紋
  ctx.fillStyle='#fcc539'; ctx.fillRect(cx-2,by-30,4,4); ctx.fillRect(cx-4,by-29,2,2); ctx.fillRect(cx+2,by-29,2,2);
  ctx.fillStyle='#fcc539'; ctx.font='10px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('德川家康',cx,by-77);
}

function drawFadeOverlay(){
  if(fadeAlpha<=0) return;
  ctx.fillStyle=`rgba(0,0,0,${fadeAlpha.toFixed(2)})`;
  ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
  // 過場時代場景黑屏中的六文錢跳動（淡入淡出期間顯示1.2秒）
  if(currentEra&&fadeFrame>=24&&fadeFrame<=96){
    const coinTime=(fadeFrame-20)%30;
    const bounce=coinTime<15?Math.sin(coinTime/15*Math.PI)*12:12-Math.sin((coinTime-15)/15*Math.PI)*12;
    const coin={size:6,color:'#fcc539',outlineColor:'#ffe08b'};
    // 中心六文錢（上下跳動）
    const cx=DESIGN_W/2, cy=DESIGN_H/2-bounce;
    drawSanCoins(cx,cy,coin);
  }
}

function drawSanCoins(cx,cy,coin){
  // 六文錢圖案：三個圓排成等邊三角形
  const r=coin.size;
  const pos=[
    {x:cx,y:cy-r},     // 上
    {x:cx-r*.866,y:cy+r*.5}, // 左下
    {x:cx+r*.866,y:cy+r*.5}, // 右下
  ];
  for(const p of pos){
    ctx.fillStyle=coin.color; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=coin.outlineColor; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.stroke();
  }
}

// ── 開場動畫 ───────────────────────────────────────────────
function drawIntroScene(){
  ctx.clearRect(0,0,DESIGN_W,DESIGN_H);

  const sceneNum=introScene;
  const frameInScene=introFrameInScene;

  // 前30幀：黑幕漸亮
  const fadeInDuration=30;
  const fadeInProgress=Math.min(frameInScene/fadeInDuration, 1);

  // 文字顯現時間（30-60幀）
  const textShowStart=35;
  const textShowDuration=30;
  const textShowProgress=Math.max(0, Math.min((frameInScene-textShowStart)/textShowDuration, 1));

  if(sceneNum===0){
    // 場景1：黑色背景 + 戰場像素圖
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 簡單戰場圖案
    ctx.fillStyle='rgba(68,68,68,'+fadeInProgress+')';
    for(let y=0;y<DESIGN_H;y+=8){
      for(let x=0;x<DESIGN_W;x+=8){
        if((x+y)%16===0) ctx.fillRect(x,y,4,4);
      }
    }
    // 文字顯現
    ctx.fillStyle='rgba(255,255,255,'+textShowProgress+')';
    ctx.font='bold 32px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('慶長二十年，大阪夏之戰。',DESIGN_W/2,DESIGN_H/2);
    introWaitingForClick=frameInScene>textShowStart+textShowDuration;
  } else if(sceneNum===1){
    // 場景2：真田幸村倒下
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 倒下的人物轮廓
    ctx.fillStyle='rgba(255,0,0,'+fadeInProgress+')';
    ctx.fillRect(DESIGN_W/2-30,DESIGN_H/2-40,60,20);
    ctx.fillRect(DESIGN_W/2-50,DESIGN_H/2-20,100,40);
    // 文字顯現
    ctx.fillStyle='rgba(255,255,255,'+textShowProgress+')';
    ctx.font='bold 32px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('真田幸村，最後一戰，力竭而亡。',DESIGN_W/2,DESIGN_H/2);
    introWaitingForClick=frameInScene>textShowStart+textShowDuration;
  } else if(sceneNum===2){
    // 場景3：光芒從黑暗中透出
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 光芒效果
    const glow=ctx.createRadialGradient(DESIGN_W/2,DESIGN_H/2,0,DESIGN_W/2,DESIGN_H/2,300);
    glow.addColorStop(0,'rgba(255,200,100,'+0.6*fadeInProgress+')');
    glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 文字顯現
    ctx.fillStyle='rgba(255,255,255,'+textShowProgress+')';
    ctx.font='bold 32px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('然而，翌日清晨，他睜開了雙眼。',DESIGN_W/2,DESIGN_H/2);
    introWaitingForClick=frameInScene>textShowStart+textShowDuration;
  } else if(sceneNum===3){
    // 場景4：領地全景，傳送門在遠方發光
    ctx.fillStyle='#102f34';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 遠景
    ctx.fillStyle='#22474c';
    ctx.fillRect(0,DESIGN_H*0.6,DESIGN_W,DESIGN_H*0.4);
    // 傳送門在遠方（發光）
    const portalGlow=ctx.createRadialGradient(DESIGN_W*0.75,DESIGN_H*0.4,0,DESIGN_W*0.75,DESIGN_H*0.4,100);
    portalGlow.addColorStop(0,'rgba(255,200,100,'+0.8*fadeInProgress+')');
    portalGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=portalGlow;
    ctx.fillRect(DESIGN_W*0.5,DESIGN_H*0.2,DESIGN_W*0.5,DESIGN_H*0.4);
    // 簡單傳送門形狀
    ctx.strokeStyle='rgba(176,112,235,'+fadeInProgress+')';
    ctx.lineWidth=8;
    ctx.strokeRect(DESIGN_W*0.7,DESIGN_H*0.3,60,80);
    // 文字顯現
    ctx.fillStyle='rgba(255,255,255,'+textShowProgress+')';
    ctx.font='bold 24px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('一個陌生的領地，一扇神秘的石門，',DESIGN_W/2,DESIGN_H/2-20);
    ctx.fillText('等待著他。',DESIGN_W/2,DESIGN_H/2+20);
    introWaitingForClick=frameInScene>textShowStart+textShowDuration;
  } else if(sceneNum===4){
    // 場景5：傳送門特寫，三個寶石缺口
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 傳送門框架
    ctx.strokeStyle='rgba(176,112,235,'+fadeInProgress+')';
    ctx.lineWidth=12;
    ctx.strokeRect(DESIGN_W/2-80,DESIGN_H/2-120,160,240);
    // 內部漩渦
    const vortex=ctx.createRadialGradient(DESIGN_W/2,DESIGN_H/2,20,DESIGN_W/2,DESIGN_H/2,80);
    vortex.addColorStop(0,'rgba(124,60,225,'+fadeInProgress+')');
    vortex.addColorStop(1,'rgba(74,32,112,'+fadeInProgress+')');
    ctx.fillStyle=vortex;
    ctx.fillRect(DESIGN_W/2-70,DESIGN_H/2-110,140,220);
    // 三個寶石缺口
    const gemY=DESIGN_H/2-60;
    ctx.fillStyle='rgba(68,68,68,'+fadeInProgress+')';
    ctx.beginPath(); ctx.arc(DESIGN_W/2-40,gemY,12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(DESIGN_W/2,gemY,12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(DESIGN_W/2+40,gemY,12,0,Math.PI*2); ctx.fill();
    // 文字顯現
    ctx.fillStyle='rgba(255,255,255,'+textShowProgress+')';
    ctx.font='bold 24px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('門上有三個缺口，據說集齊三顆寶石，',DESIGN_W/2,DESIGN_H*0.8-20);
    ctx.fillText('便能回到故鄉。',DESIGN_W/2,DESIGN_H*0.8+20);
    introWaitingForClick=frameInScene>textShowStart+textShowDuration;
  } else if(sceneNum===5){
    // 場景6：真田幸村握刀站立 + 過場到領地
    ctx.fillStyle='#102f34';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 簡單人物
    ctx.fillStyle='rgba(255,0,0,'+fadeInProgress+')';
    ctx.fillRect(DESIGN_W/2-15,DESIGN_H/2-60,30,60);
    ctx.fillStyle='rgba(255,255,0,'+fadeInProgress+')';
    ctx.fillRect(DESIGN_W/2-8,DESIGN_H/2-40,16,40);
    // 劍
    ctx.strokeStyle='rgba(136,136,136,'+fadeInProgress+')';
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(DESIGN_W/2+10,DESIGN_H/2-60);
    ctx.lineTo(DESIGN_W/2+30,DESIGN_H/2-120);
    ctx.stroke();
    // 文字顯現
    ctx.fillStyle='rgba(255,255,255,'+textShowProgress+')';
    ctx.font='bold 32px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('真田幸村的新征途，現在開始。',DESIGN_W/2,DESIGN_H/2+80);
    introWaitingForClick=frameInScene>textShowStart+textShowDuration;
  }

  // 左下角下一幕按鈕（只在等待點擊時顯示）
  const nextW=60, nextH=24;
  const nextX=8, nextY=DESIGN_H-nextH-8;
  if(introWaitingForClick){
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.fillRect(nextX,nextY,nextW,nextH);
    ctx.strokeStyle='rgba(255,255,255,0.8)';
    ctx.lineWidth=1;
    ctx.strokeRect(nextX+0.5,nextY+0.5,nextW-1,nextH-1);
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.font='12px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('下一幕',nextX+nextW/2,nextY+nextH/2+4);
  }

  // 右下角跳過按鈕
  const skipW=60, skipH=24;
  const skipX=DESIGN_W-skipW-8, skipY=DESIGN_H-skipH-8;
  ctx.fillStyle='rgba(0,0,0,0.7)';
  ctx.fillRect(skipX,skipY,skipW,skipH);
  ctx.strokeStyle='rgba(255,255,255,0.8)';
  ctx.lineWidth=1;
  ctx.strokeRect(skipX+0.5,skipY+0.5,skipW-1,skipH-1);
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.font='12px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('跳過',skipX+skipW/2,skipY+skipH/2+4);
}

// ── 結局動畫 ───────────────────────────────────────────────
function drawEndingScene(){
  const frameInScene=endingFrame%300;
  const sceneNum=Math.floor(endingFrame/300);
  const fade=Math.max(0, Math.min(1, (300-frameInScene)/30));

  ctx.clearRect(0,0,DESIGN_W,DESIGN_H);

  if(sceneNum===0){
    // 場景1：真田幸村走向傳送門
    ctx.fillStyle='#102f34';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    ctx.fillStyle='#22474c';
    ctx.fillRect(0,GROUND_Y,DESIGN_W,DESIGN_H-GROUND_Y);
    // 簡單傳送門
    ctx.strokeStyle='#b070eb';
    ctx.lineWidth=8;
    ctx.strokeRect(DESIGN_W-150,GROUND_Y-150,100,150);
    // 人物（向右走）
    const walkX=300+Math.min(200, frameInScene*1.2);
    ctx.fillStyle='#ff0000';
    ctx.fillRect(walkX,GROUND_Y-50,30,50);
    ctx.fillStyle='#ffff00';
    ctx.fillRect(walkX+5,GROUND_Y-35,20,30);
    ctx.fillStyle='rgba(0,0,0,'+fade+')';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    ctx.fillStyle='rgba(255,255,255,'+(1-fade)+')';
    ctx.font='bold 28px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('三顆寶石齊聚，石門緩緩開啟。',DESIGN_W/2,DESIGN_H/2);
  } else if(sceneNum===1){
    // 場景2：強光從門中溢出
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    const strongGlow=ctx.createRadialGradient(DESIGN_W/2,DESIGN_H/2,0,DESIGN_W/2,DESIGN_H/2,500);
    strongGlow.addColorStop(0,'rgba(255,255,200,1)');
    strongGlow.addColorStop(0.5,'rgba(255,200,100,0.5)');
    strongGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=strongGlow;
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    ctx.fillStyle='rgba(0,0,0,'+fade+')';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    ctx.fillStyle='rgba(255,255,255,'+(1-fade)+')';
    ctx.font='bold 32px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('幸村，你完成了不可能的征途。',DESIGN_W/2,DESIGN_H/2);
  } else if(sceneNum===2){
    // 場景3：真田幸村回到原本的時空，夕陽下的戰場
    // 夕陽背景
    const sunGrad=ctx.createLinearGradient(0,0,0,DESIGN_H);
    sunGrad.addColorStop(0,'#ff6b35');
    sunGrad.addColorStop(0.4,'#ffa06b');
    sunGrad.addColorStop(0.6,'#ffb366');
    sunGrad.addColorStop(1,'#4a5a81');
    ctx.fillStyle=sunGrad;
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    // 遠方山脈輪廓
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(0,DESIGN_H*0.6);
    ctx.lineTo(DESIGN_W*0.3,DESIGN_H*0.4);
    ctx.lineTo(DESIGN_W*0.6,DESIGN_H*0.5);
    ctx.lineTo(DESIGN_W,DESIGN_H*0.45);
    ctx.lineTo(DESIGN_W,DESIGN_H);
    ctx.lineTo(0,DESIGN_H);
    ctx.fill();
    // 人物站立（凝視遠方）
    ctx.fillStyle='#ff0000';
    ctx.fillRect(DESIGN_W/2-15,DESIGN_H*0.5-60,30,60);
    ctx.fillStyle='#ffff00';
    ctx.fillRect(DESIGN_W/2-8,DESIGN_H*0.5-40,16,40);
    ctx.fillStyle='rgba(0,0,0,'+fade+')';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    ctx.fillStyle='rgba(255,255,255,'+(1-fade)+')';
    ctx.font='bold 24px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('而那段跨越時代的記憶，',DESIGN_W/2,DESIGN_H*0.8-20);
    ctx.fillText('將永遠刻在心中。',DESIGN_W/2,DESIGN_H*0.8+20);
  } else if(sceneNum===3){
    // 場景4-5-6 統一為黑屏，顯示THE END
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
    ctx.fillStyle='rgba(255,255,255,'+(0.3+Math.sin(endingFrame*0.05)*0.3)+')';
    ctx.font='bold 64px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('THE END',DESIGN_W/2,DESIGN_H/2-50);
    // 重新遊玩按鈕
    const restartW=150, restartH=40;
    const restartX=(DESIGN_W-restartW)/2, restartY=DESIGN_H/2+80;
    ctx.fillStyle='rgba(100,100,100,0.7)';
    ctx.fillRect(restartX,restartY,restartW,restartH);
    ctx.strokeStyle='rgba(255,200,100,0.9)';
    ctx.lineWidth=2;
    ctx.strokeRect(restartX+1,restartY+1,restartW-2,restartH-2);
    ctx.fillStyle='rgba(255,200,100,0.9)';
    ctx.font='18px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('重新遊玩',DESIGN_W/2,restartY+28);
  }
}

// ── 主場景 ───────────────────────────────────────────────
function drawScene(){
  ctx.clearRect(0,0,DESIGN_W,DESIGN_H);
  if(showIntro){
    drawIntroScene(); return;
  }
  if(scene==='ending'){
    drawEndingScene(); return;
  }
  if(scene==='interior'){
    drawInterior(); drawFadeOverlay(); return;
  }
  if(scene==='teaching'){
    drawTeachingScene(); return;
  }
  if(scene==='battle'){
    drawBattleScene(); return;
  }
  if(scene==='levelClear'){
    drawLevelClearScene(); return;
  }
  if(scene==='three-kingdom'||scene==='knight'||scene==='edo'){
    drawEraScene(scene); return;
  }
  // 領地主場景
  drawSky(); drawGround();
  const gY=GROUND_Y;
  drawSanadaHouse(112, gY-140);
  drawSmithShop(428,   gY-75);
  drawShop(630,        gY-80);
  drawCamp(800,        gY-75);   // 雜貨店~傳送門正中間
  drawPortal(1089,     gY-106);
  drawPortalParticles();
  for(const w of warriors) drawWarrior(w.x,GROUND_Y,w.facing,w.state);
  drawPlayer(PL.x,PL.y,PL.facing,PL.frame);
  drawLabels();
  drawDialog(); drawShopUI(); drawPortalMenu();
  drawInventoryHUD();
  drawMusicToggleButton();
  drawFadeOverlay();
  ctx.fillStyle=C.accent3; ctx.font='12px DotGothic16'; ctx.textAlign='right';
  ctx.fillText('真田幸村の領地',DESIGN_W-16,DESIGN_H-14);
}

// ── 雲紋邊框裝飾 ───────────────────────────────────────────
function drawCloudBorder(x, y, w, h, color, lineWidth){
  // 繪製帶雲紋的邊框
  const cloudWave=6; // 雲紋波浪高度
  const waveSpacing=12; // 波浪間距

  ctx.strokeStyle=color;
  ctx.lineWidth=lineWidth;
  ctx.lineCap='round';
  ctx.lineJoin='round';

  // 上邊框（雲紋）
  ctx.beginPath();
  ctx.moveTo(x, y);
  for(let px=x;px<=x+w;px+=waveSpacing){
    const waveY=y-Math.sin((px-x)/w*Math.PI)*cloudWave;
    ctx.lineTo(px, waveY);
  }
  ctx.lineTo(x+w, y);
  ctx.stroke();

  // 下邊框（雲紋）
  ctx.beginPath();
  ctx.moveTo(x, y+h);
  for(let px=x;px<=x+w;px+=waveSpacing){
    const waveY=y+h+Math.sin((px-x)/w*Math.PI)*cloudWave;
    ctx.lineTo(px, waveY);
  }
  ctx.lineTo(x+w, y+h);
  ctx.stroke();

  // 左邊框（雲紋）
  ctx.beginPath();
  ctx.moveTo(x, y);
  for(let py=y;py<=y+h;py+=waveSpacing){
    const waveX=x-Math.sin((py-y)/h*Math.PI)*cloudWave;
    ctx.lineTo(waveX, py);
  }
  ctx.lineTo(x, y+h);
  ctx.stroke();

  // 右邊框（雲紋）
  ctx.beginPath();
  ctx.moveTo(x+w, y);
  for(let py=y;py<=y+h;py+=waveSpacing){
    const waveX=x+w+Math.sin((py-y)/h*Math.PI)*cloudWave;
    ctx.lineTo(waveX, py);
  }
  ctx.lineTo(x+w, y+h);
  ctx.stroke();
}

// ── 第三階段繪製函數 ──────────────────────────────────────
function drawTeachingScene(){
  const col=currentEra==='ai'?eraColors.ai:currentEra==='cowork'?eraColors.cowork:eraColors.code;

  // 星空背景
  const g=ctx.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0,'#1a1a2e');
  g.addColorStop(1,'#0f0f1e');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,DESIGN_W,GROUND_Y);

  // 星星（緩慢閃爍）
  for(const s of stars){
    s.phase+=s.speed*0.5;
    const b=(Math.sin(s.phase)+1)/2;
    const a=Math.floor(70+b*185).toString(16).padStart(2,'0');
    const sx=Math.round(s.bx+Math.sin(s.phase*.31)*1.4), sy=Math.round(s.by+Math.cos(s.phase*.19)*.7);
    ctx.fillStyle=(s.big?'#ffffff':'#cecac9')+a;
    ctx.fillRect(sx,sy,1,1);
  }

  // 地面（新美術效果 - 像素化地面）
  drawTeachingGround();

  // 生成紮營處列表（首次時）
  if(campList.length===0){
    for(let i=0;i<7;i++){
      campList.push({
        x:Math.random()*(DESIGN_W-120)+60,
        size:0.6+Math.random()*0.8,
      });
    }
  }

  // 繪製紮營處（7個，中央留空給火堆）
  for(const camp of campList){
    drawTeachingCamp(camp.x, GROUND_Y-40, camp.size);
  }

  // 中央大火堆（固定位置）
  drawLargeCampfire(DESIGN_W/2, GROUND_Y-50);

  // 武士和馬走動
  updateWarriors();
  for(const w of eraWarriors[currentEra==='ai'?'three-kingdom':currentEra==='cowork'?'knight':'edo']){
    drawWarrior(w.x, GROUND_Y, w.facing, w.state);
  }

  // 主角和隨從坐在火堆旁（置於地面）
  drawPlayer(DESIGN_W/2-80, GROUND_Y, 1, 0);
  drawWarrior(DESIGN_W/2+80, GROUND_Y, -1, 'sit');

  // 對話框和大頭像
  const speaker=teachingPhase===1?'隨從':'真田幸村';
  const dialogW=700, dialogH=200;
  const dialogX=(DESIGN_W-dialogW)/2, dialogY=100;

  // 頭像框（在對話框外的左方）
  const avatarFrameW=120, avatarFrameH=150;
  const avatarFrameX=dialogX-avatarFrameW-20, avatarFrameY=dialogY-10;
  const borderWidth=3;

  // 頭像框背景（深綠色）
  ctx.fillStyle='rgba(60, 140, 100, 0.5)';
  ctx.fillRect(avatarFrameX, avatarFrameY, avatarFrameW, avatarFrameH);

  // 頭像框金色邊框（直線長方形）
  ctx.strokeStyle='#D4AF37';
  ctx.lineWidth=borderWidth;
  ctx.strokeRect(avatarFrameX, avatarFrameY, avatarFrameW, avatarFrameH);

  // 頭像框內部邊距（金色邊框内側）
  const innerPadding=5;
  const innerX=avatarFrameX+innerPadding;
  const innerY=avatarFrameY+innerPadding;
  const innerW=avatarFrameW-innerPadding*2;
  const innerH=avatarFrameH-innerPadding*2;

  // 繪製人物圖像在框內（只顯示上半部，80%大小，正中間，底部切齊）
  ctx.save();

  // 設置裁剪區域（只顯示框內內容）
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerW, innerH);
  ctx.clip();

  // 角色尺寸與位置計算
  const charScale=0.8; // 縮放到 80%
  const charBaseW=80; // 角色寬度
  const charBaseH=44; // 角色上半身高度

  // 在框內居中
  const centerX=innerX+innerW/2;
  const bottomY=innerY+innerH;

  // 應用縮放
  ctx.translate(centerX, bottomY);
  ctx.scale(charScale, charScale);

  // 角色中心對齐，底部對齐
  const drawX=-charBaseW/2;
  const drawY=-charBaseH;

  if(teachingPhase===1){
    // 隨從武士
    drawWarrior(drawX, drawY, 1, 'stand');
  } else {
    // 真田幸村
    drawPlayer(drawX, drawY, 1, 0);
  }

  ctx.restore();

  // 對話框背景（深綠色）
  ctx.fillStyle='rgba(60, 140, 100, 0.5)';
  ctx.fillRect(dialogX, dialogY, dialogW, dialogH);

  // 對話框金色邊框（直線長方形）
  ctx.strokeStyle='#D4AF37';
  ctx.lineWidth=3;
  ctx.strokeRect(dialogX, dialogY, dialogW, dialogH);

  // 發言者名稱（深色以確保可讀性）
  ctx.fillStyle='#1a1a1a';
  ctx.font='bold 14px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText(speaker, dialogX+20, dialogY+25);

  // 對話內容（深色文本）
  ctx.fillStyle='#1a1a1a';
  ctx.font='14px DotGothic16';
  const dialogText=teachingPhase===1?currentStage.teachingDialogue:'知道了，出發吧';
  const lines=dialogText.match(/.{1,48}/g)||[];
  let ty=dialogY+55;
  for(const line of lines.slice(0,5)){
    if(ty>dialogY+dialogH-25) break;
    ctx.fillText(line, dialogX+20, ty);
    ty+=22;
  }

  // 提示文字（按E或點擊繼續）
  ctx.fillStyle='#4a4a4a';
  ctx.font='12px DotGothic16';
  ctx.textAlign='right';
  ctx.fillText('按E或點擊繼續', dialogX+dialogW-20, dialogY+dialogH-12);

  drawMusicToggleButton();
  drawFadeOverlay();
}

function drawTeachingGround(){
  // 教學場景地面（參考新美術效果色板）
  const S=8; // 像素大小

  // 地面色板（從新美術效果.md）
  const TeachingGP={
    // 上層綠色
    g0:['#0d3a3f','#0d5648'],
    g1:['#0d5648','#117a59'],
    g2:['#117a59','#4a9b6f'],
    g3:['#4a9b6f','#68c98d'],
    // 中層過渡
    t0:['#3a4d44','#5a7a62'],
    t1:['#5a7a62','#7a9a7a'],
    t2:['#8a6d52','#7a9a7a'],
    t3:['#6d4a3a','#8a6d52'],
    // 下層泥土
    b0:['#8a6d52','#a8835a'],
    b1:['#6d4a3a','#8a6d52'],
    b2:['#4a2e1a','#6d4a3a'],
    b3:['#2a1810','#4a2e1a'],
  };

  // 繪製分層地面
  const groundHeight=DESIGN_H-GROUND_Y;
  const layerHeight=Math.ceil(groundHeight/S);

  for(let row=0;row<layerHeight;row++){
    for(let col=0;col<Math.ceil(DESIGN_W/S);col++){
      const tx=col*S, ty=GROUND_Y+row*S;
      if(ty>=DESIGN_H) break;

      // 根據深度選擇顏色層級
      let colorSet;
      if(row<3){
        // 上層綠色（0-3行）
        colorSet=TeachingGP[['g0','g1','g2'][Math.min(row,2)]];
      } else if(row<7){
        // 中層過渡（4-7行）
        colorSet=TeachingGP[['t0','t1','t2','t3'][Math.min(row-3,3)]];
      } else {
        // 下層泥土（8行以下）
        colorSet=TeachingGP[['b0','b1','b2','b3'][Math.min(Math.floor((row-7)/2),3)]];
      }

      // 隨機輕微變化
      const variance=(row+col)%4;
      const [dk,lt]=colorSet;
      ctx.fillStyle=variance===0?lt:dk;
      ctx.fillRect(tx, ty, S, S);

      // 像素邊框（增強感）
      ctx.fillStyle=dk;
      ctx.fillRect(tx+S-1, ty, 1, S);
      ctx.fillRect(tx, ty+S-1, S, 1);
    }
  }

  // 地面頂層分隔線（雙層）
  ctx.fillStyle='#051a1f';
  ctx.fillRect(0, GROUND_Y-2, DESIGN_W, 2);
  ctx.fillStyle='#0a2a32';
  ctx.fillRect(0, GROUND_Y, DESIGN_W, 1);
}

function drawTeachingCamp(x,y,size){
  const col=currentEra==='ai'?eraColors.ai:currentEra==='cowork'?eraColors.cowork:eraColors.code;
  // 小規模紮營處（真田領地風格）
  const w=45*size, h=35*size;
  const groundY=GROUND_Y-2;

  // 帳篷框架（深色）
  ctx.fillStyle=col.buildDark;
  ctx.fillRect(x-w/2, groundY-h*0.7, w, h*0.7);

  // 帳篷頂部（中色）
  ctx.fillStyle=col.buildMid;
  ctx.beginPath();
  ctx.moveTo(x-w/2, groundY-h*0.7);
  ctx.lineTo(x, groundY-h);
  ctx.lineTo(x+w/2, groundY-h*0.7);
  ctx.closePath();
  ctx.fill();

  // 帳篷邊框
  ctx.strokeStyle=col.buildDark;
  ctx.lineWidth=1;
  ctx.stroke();

  // 燈籠（發光，閃爍）
  const lanternX=x-w/2-10, lanternY=groundY-h*0.5;
  const lanternGlow=(Math.sin(portalTime*0.05)*0.5+0.5)*20+8;
  drawGlow(lanternX, lanternY, col.accent2, lanternGlow);
  ctx.fillStyle=col.accent2;
  ctx.fillRect(lanternX-3, lanternY-4, 6, 8);
}

function drawLargeCampfire(x,y){
  const groundY=GROUND_Y-2;

  // 柴堆底座（棕色像素塊）
  ctx.fillStyle='#8B6F47';
  ctx.fillRect(x-35, groundY-8, 70, 10);
  ctx.fillStyle='#6B5637';
  ctx.fillRect(x-30, groundY-15, 60, 8);

  // 生成火焰粒子
  if(Math.random()<0.3){
    fireParticles.push({
      x:x+Math.random()*20-10,
      y:groundY,
      vx:Math.random()*2-1,
      vy:-(Math.random()+0.5)*1.5,
      life:60,
      maxLife:60,
      color:Math.random()<0.6?'#FFA500':Math.random()<0.8?'#FFD700':'#FF6B35'
    });
  }

  // 更新並繪製火焰粒子
  for(let i=fireParticles.length-1;i>=0;i--){
    const p=fireParticles[i];
    p.x+=p.vx;
    p.y+=p.vy;
    p.life--;

    if(p.life<=0){
      fireParticles.splice(i,1);
      continue;
    }

    const opacity=p.life/p.maxLife;
    const alpha=Math.floor(opacity*200).toString(16).padStart(2,'0');
    const size=4+Math.sin(p.life*Math.PI/p.maxLife)*2;

    ctx.fillStyle=p.color+alpha;
    ctx.fillRect(Math.round(p.x)-size/2, Math.round(p.y)-size/2, size, size);
  }

  // 像素火焰層（多層燃燒效果）
  const waveOffset=Math.sin(portalTime*0.1);
  const colors=['#FF6B35', '#FFA500', '#FFD700'];

  for(let i=0;i<3;i++){
    const fireX=x-25+i*25;
    const flameHeight=25+Math.sin(portalTime*0.12+i)*8+waveOffset*3;
    const pixelSize=6;

    // 繪製像素火焰塊
    for(let py=0;py<Math.ceil(flameHeight/pixelSize);py++){
      const rowHeight=Math.max(0, flameHeight-py*pixelSize);
      if(rowHeight<=0) break;

      const alpha=(1-py/(flameHeight/pixelSize))*0.8;
      ctx.fillStyle=colors[i]+Math.floor(alpha*255).toString(16).padStart(2,'0');

      // 寬度隨高度變化（火焰形狀）
      const waveAmount=Math.sin(portalTime*0.08+i*Math.PI/3)*4;
      const blockWidth=12+waveAmount-py*0.5;
      ctx.fillRect(fireX-blockWidth/2, groundY-py*pixelSize, Math.max(2, blockWidth), Math.min(pixelSize, rowHeight));
    }
  }

  // 發光效果（呼吸動畫）
  const glowSize=55+Math.sin(portalTime*0.05)*12;
  drawGlow(x, groundY-20, '#FF8C00', glowSize);
}

function drawWarriorAvatar(x,y){
  // 隨從的大頭像（頭部細節，放大3倍）
  ctx.fillStyle='#845750';
  ctx.fillRect(x, y, 100, 100);
  ctx.save();
  ctx.scale(3, 3);
  ctx.translate(x/3+5, y/3);
  drawWarrior(0, 0, -1, 'stand');
  ctx.restore();
}

function drawSanadaAvatar(x,y){
  // 真田幸村的大頭像（頭部細節，放大3倍）
  ctx.fillStyle='#633b3f';
  ctx.fillRect(x, y, 100, 100);
  ctx.save();
  ctx.scale(3, 3);
  ctx.translate(x/3+5, y/3);
  drawPlayer(0, 0, 1, 0);
  ctx.restore();
}

function drawBattleScene(){
  if(isPortrait) drawBattleScenePortrait();
  else drawBattleSceneLandscape();
}

// 閃爍星空（重用全域 stars，與其他場景一致）
function drawTwinkleStars(){
  for(const s of stars){
    s.phase+=s.speed;
    s.x=s.bx+Math.sin(s.phase*.31)*1.4;
    s.y=s.by+Math.cos(s.phase*.19)*.7;
    const b=(Math.sin(s.phase)+1)/2;
    const a=Math.floor(70+b*185).toString(16).padStart(2,'0');
    const sx=Math.round(s.x), sy=Math.round(s.y);
    ctx.fillStyle=(s.big?'#ffffff':'#cecac9')+a;
    ctx.fillRect(sx,sy,1,1);
    if(s.big&&b>.65){
      ctx.fillStyle='#ffffff33';
      ctx.fillRect(sx-1,sy,1,1); ctx.fillRect(sx+1,sy,1,1);
      ctx.fillRect(sx,sy-1,1,1);
    }
  }
}

// 發射一支從 (sx,sy) 飛向 (tx,ty) 的弧線箭矢（參數化，弧高固定不隨距離爆增）
function spawnBattleArrow(sx,sy,tx,ty,color){
  const dist=Math.hypot(tx-sx,ty-sy)||1;
  battleArrows.push({sx,sy,tx,ty,t:0,speed:9/dist,arc:38+Math.random()*28,color});
}
function arrowPos(a,t){
  return {
    x:a.sx+(a.tx-a.sx)*t,
    y:a.sy+(a.ty-a.sy)*t-a.arc*Math.sin(Math.PI*t), // 弧線：中段最高
  };
}

// 更新雙方背景飛箭：敵方(左)→我方(右)，我方(右)→敵方(左)
function updateBattleArrows(ex,ey,px,py){
  battleArrowTimer++;
  if(battleArrowTimer>=42){
    battleArrowTimer=0;
    spawnBattleArrow(ex,ey,px+(Math.random()*40-20),py+(Math.random()*30-15),'#ffcf6b'); // 敵方箭（金黃）
    spawnBattleArrow(px,py,ex+(Math.random()*40-20),ey+(Math.random()*30-15),'#aee4ff'); // 我方箭（淺藍）
  }
  for(let i=battleArrows.length-1;i>=0;i--){
    battleArrows[i].t+=battleArrows[i].speed;
    if(battleArrows[i].t>=1) battleArrows.splice(i,1);
  }
}

// 繪製飛箭（依飛行方向旋轉的像素箭）
function drawBattleArrows(){
  for(const a of battleArrows){
    const p=arrowPos(a,a.t);
    const p2=arrowPos(a,Math.min(1,a.t+0.02)); // 取下一點求飛行方向
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(Math.atan2(p2.y-p.y,p2.x-p.x));
    ctx.fillStyle=a.color;
    ctx.fillRect(-9,-1,15,2);                 // 箭桿
    ctx.beginPath();                          // 箭頭
    ctx.moveTo(6,-3); ctx.lineTo(12,0); ctx.lineTo(6,3); ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#ffffff';                  // 尾羽
    ctx.fillRect(-9,-2,3,1); ctx.fillRect(-9,1,3,1);
    ctx.restore();
  }
}

function drawBattleSceneLandscape(){
  // 更新動畫幀數
  if(playerAttackFrame>0) playerAttackFrame--;
  if(enemyShakeFrame>0) enemyShakeFrame--;
  for(let i=damageDisplays.length-1;i>=0;i--){
    damageDisplays[i].timer--;
    if(damageDisplays[i].timer<=0) damageDisplays.splice(i,1);
  }

  const col=currentEra==='ai'?eraColors.ai:currentEra==='cowork'?eraColors.cowork:eraColors.code;
  const g=ctx.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0,col.bgMain);
  g.addColorStop(1,col.bgSub);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,DESIGN_W,GROUND_Y);

  // 星空（隨機閃爍）
  drawTwinkleStars();

  // 雙方背景飛箭（敵左→我右、我右→敵左）
  updateBattleArrows(150, GROUND_Y-55, DESIGN_W-150, GROUND_Y-55);
  drawBattleArrows();

  // 左上：答題進度
  ctx.fillStyle='#ffffff';
  ctx.font='14px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText(`${currentQuestionIndex+1}/${currentStage.questions.length}`, 16, 20);

  // 右上：撤退按鈕
  const retractX=DESIGN_W-80, retractY=8, retractW=60, retractH=24;
  ctx.fillStyle='#666666';
  ctx.fillRect(retractX, retractY, retractW, retractH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(retractX, retractY, retractW, retractH);
  ctx.fillStyle='#ffffff';
  ctx.font='12px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('撤退', retractX+retractW/2, retractY+16);

  // 敵人（左上）- 放大1.5倍
  ctx.fillStyle='#ffffff';
  ctx.font='bold 21px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText(currentStage.enemy, 16, 55);

  // 敵人血條
  const hpBarW=200, hpBarH=16;
  ctx.fillStyle='#cccccc';
  ctx.fillRect(16, 70, hpBarW, hpBarH);
  ctx.fillStyle='#ff4444';
  ctx.fillRect(16, 70, (enemyHP/maxHP)*hpBarW, hpBarH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(16, 70, hpBarW, hpBarH);

  // 敵人角色（放大3倍）- 添加晃動效果
  ctx.save();
  ctx.scale(3, 3);
  const enemyShake=enemyShakeFrame>0?Math.sin(enemyShakeFrame*0.5)*3:0;
  drawWarrior(100/3+enemyShake/3, GROUND_Y/3, 1, 'stand');
  ctx.restore();

  // 真田幸村（右上）- 放大1.5倍
  ctx.font='bold 21px DotGothic16';
  ctx.textAlign='right';
  ctx.fillText('真田幸村', DESIGN_W-16, 55);

  // 幸村血條
  ctx.fillStyle='#cccccc';
  ctx.fillRect(DESIGN_W-hpBarW-16, 70, hpBarW, hpBarH);
  ctx.fillStyle='#44ff44';
  ctx.fillRect(DESIGN_W-hpBarW-16, 70, (playerHP/maxHP)*hpBarW, hpBarH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(DESIGN_W-hpBarW-16, 70, hpBarW, hpBarH);
  ctx.fillStyle='#ffffff';
  ctx.font='12px DotGothic16';
  ctx.textAlign='right';
  ctx.fillText(`${playerHP} HP`, DESIGN_W-16, 102);

  // 幸村角色（放大）- 添加揮刀效果
  ctx.save();
  ctx.scale(3, 3);
  const playerShake=playerAttackFrame>0?Math.sin(playerAttackFrame*0.5)*2:0;
  const playerAngle=playerAttackFrame>0?(15-playerAttackFrame)*0.2:0; // 揮刀角度
  ctx.translate((DESIGN_W-100)/3+playerShake/3, GROUND_Y/3);
  ctx.rotate(playerAngle*Math.PI/180);
  ctx.translate(-((DESIGN_W-100)/3+playerShake/3), -GROUND_Y/3);
  drawPlayer((DESIGN_W-100)/3+playerShake/3, GROUND_Y/3, -1, 0);
  ctx.restore();

  // 題目區域（黑色區域正中心）
  if(currentQuestion){
    const qW=DESIGN_W-160, qH=120; // 減小高度以完整顯示
    const qX=(DESIGN_W-qW)/2; // 水平居中
    const qY=GROUND_Y+(DESIGN_H-GROUND_Y-qH)/2; // 下方黑色區塊垂直居中

    // 半透明紅色底色
    ctx.fillStyle='rgba(242, 47, 70, 0.3)';
    ctx.fillRect(qX, qY, qW, qH);

    // 金色邊框
    ctx.strokeStyle='#fcc539';
    ctx.lineWidth=3;
    ctx.strokeRect(qX, qY, qW, qH);

    // 題目文字
    ctx.fillStyle='#ffffff';
    ctx.font='bold 12px DotGothic16';
    ctx.textAlign='left';
    const qLines=currentQuestion.question.match(/.{1,40}/g)||[];
    let qTy=qY+15;
    for(const line of qLines.slice(0,1)){
      ctx.fillText(line, qX+15, qTy);
    }

    // 選項（改為一行四個）
    if(currentQuestion.type==='選擇題'){
      drawMultipleChoiceInline(currentQuestion.options, qX+15, qY+40);
    } else {
      drawFillInBlankInline(currentQuestion.question, currentQuestion.options, qX+15, qY+40);
    }
  }

  // 伤害显示
  for(const dmg of damageDisplays){
    const alpha=dmg.timer/60;
    ctx.fillStyle=`rgba(255, 100, 100, ${alpha*0.8})`;
    ctx.font='bold 20px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText(`-${dmg.damage}`, dmg.x, dmg.y-(60-dmg.timer)*0.5);
  }

  // 答題反饋與解釋（等待玩家點擊）
  if(questionAnswered){
    const feedbackX=DESIGN_W/2, feedbackY=200;
    if(answerCorrect){
      ctx.fillStyle='#00ff00';
      ctx.font='bold 24px DotGothic16';
      ctx.textAlign='center';
      ctx.fillText('✓ 正確！', feedbackX, feedbackY);
    } else {
      ctx.fillStyle='#ff0000';
      ctx.font='bold 24px DotGothic16';
      ctx.textAlign='center';
      ctx.fillText('✗ 答錯了！', feedbackX, feedbackY);
    }

    // 顯示題目解釋（對錯都顯示）
    ctx.font='13px DotGothic16';
    ctx.fillStyle='#ffffdd';
    ctx.textAlign='center';
    const expLines=currentQuestion.explanation.match(/.{1,50}/g)||[];
    let expY=feedbackY+45;
    for(const line of expLines.slice(0,3)){
      ctx.fillText(line, feedbackX, expY);
      expY+=18;
    }

    // 如果是答錯，顯示正確答案
    if(!answerCorrect){
      ctx.fillStyle='#ffff00';
      ctx.font='bold 12px DotGothic16';
      expY+=5;
      ctx.fillText(`正確答案：${currentQuestion.answer}`, feedbackX, expY);
    }

    // 提示玩家點擊繼續
    ctx.fillStyle='#cccccc';
    ctx.font='11px DotGothic16';
    ctx.fillText('(點擊螢幕繼續)', feedbackX, feedbackY+120);
  }

  // 道具欄（右中處）
  drawInventoryBar();

  // 撤退確認對話框
  if(showRetractConfirm){
    drawRetractConfirmDialog();
  }

  drawMusicToggleButton();
  drawFadeOverlay();
}

function drawRetractConfirmDialog(){
  const dialogW=300, dialogH=150;
  const dialogX=(DESIGN_W-dialogW)/2, dialogY=(DESIGN_H-dialogH)/2;

  // 半透明紅色背景
  ctx.fillStyle='rgba(242, 47, 70, 0.5)';
  ctx.fillRect(dialogX, dialogY, dialogW, dialogH);

  // 金色邊框
  ctx.strokeStyle='#fcc539';
  ctx.lineWidth=3;
  ctx.strokeRect(dialogX, dialogY, dialogW, dialogH);

  // 提醒文字
  ctx.fillStyle='#ffffff';
  ctx.font='bold 16px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('確定要撤退嗎？', DESIGN_W/2, dialogY+35);

  ctx.font='13px DotGothic16';
  ctx.fillText('關卡進度不保留', DESIGN_W/2, dialogY+58);

  // 按鈕
  const btnW=120, btnH=40, btnY=dialogY+dialogH-55;

  // "狠心撤退"按鈕（紅色）
  const retractBtnX=dialogX+20;
  ctx.fillStyle='#ff4444';
  ctx.fillRect(retractBtnX, btnY, btnW, btnH);
  ctx.strokeStyle='#fcc539';
  ctx.lineWidth=2;
  ctx.strokeRect(retractBtnX, btnY, btnW, btnH);
  ctx.fillStyle='#ffffff';
  ctx.font='bold 14px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('狠心撤退', retractBtnX+btnW/2, btnY+28);

  // "繼續作戰"按鈕（藍色）
  const continueBtnX=dialogX+dialogW-btnW-20;
  ctx.fillStyle='#4444ff';
  ctx.fillRect(continueBtnX, btnY, btnW, btnH);
  ctx.strokeStyle='#fcc539';
  ctx.lineWidth=2;
  ctx.strokeRect(continueBtnX, btnY, btnW, btnH);
  ctx.fillStyle='#ffffff';
  ctx.font='bold 14px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('繼續作戰', continueBtnX+btnW/2, btnY+28);
}

function drawBattleScenePortrait(){
  const col=currentEra==='ai'?eraColors.ai:currentEra==='cowork'?eraColors.cowork:eraColors.code;
  const g=ctx.createLinearGradient(0,0,0,DESIGN_H);
  g.addColorStop(0,col.bgMain);
  g.addColorStop(1,col.bgSub);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,DESIGN_W,DESIGN_H);

  // 星空（隨機閃爍）
  drawTwinkleStars();

  // 雙方背景飛箭（上方，敵左↔我右）
  updateBattleArrows(70, 95, DESIGN_W-70, 95);
  drawBattleArrows();

  // 左上：答題進度
  ctx.fillStyle='#ffffff';
  ctx.font='14px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText(`${currentQuestionIndex+1}/${currentStage.questions.length}`, 16, 20);

  // 右上：撤退按鈕
  const retractX=DESIGN_W-80, retractY=8, retractW=60, retractH=24;
  ctx.fillStyle='#666666';
  ctx.fillRect(retractX, retractY, retractW, retractH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(retractX, retractY, retractW, retractH);
  ctx.fillStyle='#ffffff';
  ctx.font='12px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('撤退', retractX+retractW/2, retractY+16);

  // 敵人信息（上方，縮小）
  ctx.fillStyle='#ffffff';
  ctx.font='bold 12px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText(currentStage.enemy, 16, 50);

  // 敵人血條（上方）
  const hpBarW=140, hpBarH=14;
  ctx.fillStyle='#cccccc';
  ctx.fillRect(16, 58, hpBarW, hpBarH);
  ctx.fillStyle='#ff4444';
  ctx.fillRect(16, 58, (enemyHP/maxHP)*hpBarW, hpBarH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(16, 58, hpBarW, hpBarH);

  // 敵人角色（放大2倍） - 添加晃動效果
  ctx.save();
  ctx.scale(2, 2);
  const enemyShakePortrait=enemyShakeFrame>0?Math.sin(enemyShakeFrame*0.5)*2:0;
  drawWarrior(40/2+enemyShakePortrait/2, 50/2, 1, 'stand');
  ctx.restore();

  // 真田幸村信息（中上）
  ctx.textAlign='right';
  ctx.fillStyle='#ffffff';
  ctx.font='bold 12px DotGothic16';
  ctx.fillText('真田幸村', DESIGN_W-16, 50);

  // 幸村血條
  ctx.fillStyle='#cccccc';
  ctx.fillRect(DESIGN_W-hpBarW-16, 58, hpBarW, hpBarH);
  ctx.fillStyle='#44ff44';
  ctx.fillRect(DESIGN_W-hpBarW-16, 58, (playerHP/maxHP)*hpBarW, hpBarH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(DESIGN_W-hpBarW-16, 58, hpBarW, hpBarH);
  ctx.fillStyle='#ffffff';
  ctx.font='11px DotGothic16';
  ctx.textAlign='right';
  ctx.fillText(`${playerHP} HP`, DESIGN_W-16, 90);

  // 幸村角色（放大2倍，右側） - 添加揮刀效果
  ctx.save();
  ctx.scale(2, 2);
  const playerShakePortrait=playerAttackFrame>0?Math.sin(playerAttackFrame*0.5)*1.5:0;
  const playerAnglePortrait=playerAttackFrame>0?(15-playerAttackFrame)*0.15:0;
  ctx.translate((DESIGN_W-80)/2+playerShakePortrait/2, 50/2);
  ctx.rotate(playerAnglePortrait*Math.PI/180);
  ctx.translate(-((DESIGN_W-80)/2+playerShakePortrait/2), -50/2);
  drawPlayer((DESIGN_W-80)/2+playerShakePortrait/2, 50/2, -1, 0);
  ctx.restore();

  // 題目區域（中央，正中心）
  if(currentQuestion){
    const qW=DESIGN_W-40, qH=220;
    const qX=(DESIGN_W-qW)/2; // 水平居中
    const qY=(DESIGN_H-qH)/2; // 垂直居中

    ctx.fillStyle='rgba(242, 47, 70, 0.3)';
    ctx.fillRect(qX, qY, qW, qH);

    ctx.strokeStyle='#fcc539';
    ctx.lineWidth=3;
    ctx.strokeRect(qX, qY, qW, qH);

    // 題目文字
    ctx.fillStyle='#ffffff';
    ctx.font='bold 13px DotGothic16';
    ctx.textAlign='left';
    const qLines=currentQuestion.question.match(/.{1,30}/g)||[];
    let qTy=qY+15;
    for(const line of qLines.slice(0,2)){
      if(qTy>qY+qH-50) break;
      ctx.fillText(line, qX+15, qTy);
      qTy+=20;
    }

    // 選項（縱排）
    if(currentQuestion.type==='選擇題'){
      const optH=40, optW=qW-30;
      let optY=qY+60;
      ctx.font='12px DotGothic16';
      for(let i=0;i<currentQuestion.options.length;i++){
        if(optY+optH>qY+qH-10) break;
        const opt=currentQuestion.options[i];
        ctx.fillStyle=selectedAnswer===i?'#f22f46':'#cccccc';
        ctx.fillRect(qX+15, optY, optW, optH);
        ctx.strokeStyle='#000000';
        ctx.lineWidth=1;
        ctx.strokeRect(qX+15, optY, optW, optH);
        ctx.fillStyle='#000000';
        ctx.textAlign='left';
        ctx.fillText(opt.substring(0,20), qX+25, optY+26);
        optY+=optH+5;
      }
    } else {
      const optH=36, optW=(qW-30)/2;
      let optY=qY+60;
      let optX=qX+15;
      ctx.font='12px DotGothic16';
      for(let i=0;i<currentQuestion.options.length;i++){
        if(optY+optH>qY+qH-10) break;
        const opt=currentQuestion.options[i];
        ctx.fillStyle=selectedAnswer===i?'#f22f46':'#cccccc';
        ctx.fillRect(optX, optY, optW, optH);
        ctx.strokeStyle='#000000';
        ctx.lineWidth=1;
        ctx.strokeRect(optX, optY, optW, optH);
        ctx.fillStyle='#000000';
        ctx.textAlign='center';
        ctx.fillText(opt, optX+optW/2, optY+22);
        optX+=optW+5;
        if(optX+optW>qX+qW-15){
          optX=qX+15;
          optY+=optH+5;
        }
      }
    }
  }

  // 伤害显示
  for(const dmg of damageDisplays){
    const alpha=dmg.timer/60;
    ctx.fillStyle=`rgba(255, 100, 100, ${alpha*0.8})`;
    ctx.font='bold 18px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText(`-${dmg.damage}`, dmg.x, dmg.y-(60-dmg.timer)*0.5);
  }

  // 答題反饋
  if(questionAnswered){
    const feedbackX=DESIGN_W/2, feedbackY=300;
    if(answerCorrect){
      ctx.fillStyle='#00ff00';
      ctx.font='bold 20px DotGothic16';
      ctx.textAlign='center';
      ctx.fillText('✓ 正確！', feedbackX, feedbackY);
    } else {
      ctx.fillStyle='#ff0000';
      ctx.font='bold 20px DotGothic16';
      ctx.textAlign='center';
      ctx.fillText('✗ 答錯了！', feedbackX, feedbackY);
      ctx.font='12px DotGothic16';
      ctx.fillStyle='#ffffff';
      ctx.fillText(`正確答案：${currentQuestion.answer}`, feedbackX, feedbackY+25);
    }
  }

  // 道具欄（底部，水平顯示）
  drawInventoryBar();

  // 撤退確認對話框
  if(showRetractConfirm){
    drawRetractConfirmDialog();
  }

  drawMusicToggleButton();
  drawFadeOverlay();
}

function drawLevelClearScene(){
  const col=currentEra==='ai'?eraColors.ai:currentEra==='cowork'?eraColors.cowork:eraColors.code;
  const g=ctx.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0,col.bgMain);
  g.addColorStop(1,col.bgSub);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,DESIGN_W,GROUND_Y);

  // 大標題
  ctx.fillStyle='#fcc539';
  ctx.font='bold 32px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('關卡完成！', DESIGN_W/2, 80);

  // 星評（使用保存的星級數量）
  const starX=DESIGN_W/2-60;
  ctx.font='bold 24px DotGothic16';
  for(let i=0;i<levelClearStarCount;i++){
    ctx.fillText('⭐', starX+i*40, 140);
  }

  // 掉落物品
  ctx.fillStyle='#ffffff';
  ctx.font='14px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('掉落物品：', DESIGN_W/2, 200);

  let rewardY=230;
  ctx.fillText(`銅幣 +${levelClearReward.coins}`, DESIGN_W/2, rewardY);
  rewardY+=30;

  for(const [item, count] of Object.entries(levelClearReward.items)){
    if(count>0){
      const itemName={noodle:'蕎麥麵', fish:'烤魚', tempura:'天婦羅蓋飯'}[item]||'';
      ctx.fillText(`${itemName} +${count}`, DESIGN_W/2, rewardY);
      rewardY+=30;
    }
  }

  // 按鈕
  const btnY=380;
  if(currentStage.stageId<30){
    const nextBtnW=150, nextBtnH=40, nextBtnX=(DESIGN_W/2)-160, nextBtnY=btnY;
    ctx.fillStyle='#315dcd';
    ctx.fillRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=2;
    ctx.strokeRect(nextBtnX, nextBtnY, nextBtnW, nextBtnH);
    ctx.fillStyle='#ffffff';
    ctx.font='bold 14px DotGothic16';
    ctx.textAlign='center';
    ctx.fillText('繼續下一關', nextBtnX+nextBtnW/2, nextBtnY+26);
  }

  const homeBtnW=150, homeBtnH=40, homeBtnX=(DESIGN_W/2)+10, homeBtnY=btnY;
  ctx.fillStyle='#666666';
  ctx.fillRect(homeBtnX, homeBtnY, homeBtnW, homeBtnH);
  ctx.strokeStyle='#000000';
  ctx.lineWidth=2;
  ctx.strokeRect(homeBtnX, homeBtnY, homeBtnW, homeBtnH);
  ctx.fillStyle='#ffffff';
  ctx.font='bold 14px DotGothic16';
  ctx.textAlign='center';
  ctx.fillText('回到領地', homeBtnX+homeBtnW/2, homeBtnY+26);

  drawMusicToggleButton();
  drawFadeOverlay();
}

function drawMultipleChoice(options, x, y){
  const optW=200, optH=40, spacing=50;
  ctx.font='13px DotGothic16';
  for(let i=0;i<options.length;i++){
    const ox=x+(i%2)*240, oy=y+(Math.floor(i/2))*spacing;
    ctx.fillStyle=selectedAnswer===i?'#f22f46':'#cccccc';
    ctx.fillRect(ox, oy, optW, optH);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(ox, oy, optW, optH);
    ctx.fillStyle='#000000';
    ctx.textAlign='left';
    const text=options[i].substring(0,20);
    ctx.fillText(text, ox+10, oy+26);
  }
}

function drawFillInBlank(question, options, x, y){
  // 簡化版：顯示空白和選項
  const blanks=question.match(/_+/g)||[];
  const optW=150, optH=40, spacing=50;
  ctx.font='13px DotGothic16';
  for(let i=0;i<options.length;i++){
    const ox=x+(i%2)*200, oy=y+(Math.floor(i/2))*spacing;
    ctx.fillStyle=selectedAnswer===i?'#f22f46':'#cccccc';
    ctx.fillRect(ox, oy, optW, optH);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(ox, oy, optW, optH);
    ctx.fillStyle='#000000';
    ctx.textAlign='center';
    ctx.fillText(options[i], ox+optW/2, oy+26);
  }
}

// 新的內聯選項布局（一行四個）
function drawMultipleChoiceInline(options, x, y){
  const optH=35;
  ctx.font='11px DotGothic16';
  const perOptW=Math.max(80, (DESIGN_W-160-30)/4);
  for(let i=0;i<Math.min(options.length, 4);i++){
    const optW=perOptW-5;
    const ox=x+i*(optW+5);
    ctx.fillStyle=selectedAnswer===i?'#f22f46':'#cccccc';
    ctx.fillRect(ox, y, optW, optH);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(ox, y, optW, optH);
    ctx.fillStyle='#000000';
    ctx.textAlign='center';
    const text=options[i];
    ctx.fillText(text, ox+optW/2, y+23);
  }
}

function drawFillInBlankInline(question, options, x, y){
  const optH=35;
  ctx.font='11px DotGothic16';
  const perOptW=Math.max(80, (DESIGN_W-160-30)/4);
  for(let i=0;i<Math.min(options.length, 4);i++){
    const optW=perOptW-5;
    const ox=x+i*(optW+5);
    ctx.fillStyle=selectedAnswer===i?'#f22f46':'#cccccc';
    ctx.fillRect(ox, y, optW, optH);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(ox, y, optW, optH);
    ctx.fillStyle='#000000';
    ctx.textAlign='center';
    const text=options[i];
    ctx.fillText(text, ox+optW/2, y+23);
  }
}

// ── 背包 HUD（主畫面右上角）────────────────────────────
function drawInventoryHUD(){
  const hudX=DESIGN_W-180, hudY=8;
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(hudX, hudY, 170, 90);
  ctx.strokeStyle='#fcc539';
  ctx.lineWidth=2;
  ctx.strokeRect(hudX, hudY, 170, 90);

  ctx.fillStyle='#fcc539';
  ctx.font='bold 11px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText('💰 銅幣：'+coins, hudX+8, hudY+18);

  ctx.fillStyle='#ffe08b';
  ctx.font='10px DotGothic16';
  ctx.fillText('🍜 蕎麥麵：'+inventory.noodle, hudX+8, hudY+35);
  ctx.fillText('🐟 烤魚：'+inventory.fish, hudX+8, hudY+50);
  ctx.fillText('🍱 天婦羅蓋飯：'+inventory.tempura, hudX+8, hudY+65);
}

function useItem(key, heal){
  if(!inventory[key]||inventory[key]<=0) return;
  const newHP=Math.min(playerHP+heal, maxHP);
  inventory[key]--;
  playerHP=newHP;
  saveProgress();
}

function drawInventoryBar(){
  // 背包框位置：右中處（向上移動10像素）
  const invW=160;
  const invH=100;
  const invX=DESIGN_W-invW-10; // 右側，留10像素邊距
  const invY=(DESIGN_H-invH)/2-10; // 垂直居中，向上移動10px

  // 紅底半透明背景
  ctx.fillStyle='rgba(242, 47, 70, 0.4)';
  ctx.fillRect(invX, invY, invW, invH);

  // 金色邊框
  ctx.strokeStyle='#fcc539';
  ctx.lineWidth=2;
  ctx.strokeRect(invX, invY, invW, invH);

  // 道具列表
  const items=[
    {icon:'🍜', name:'蕎麥麵', key:'noodle'},
    {icon:'🐟', name:'烤魚', key:'fish'},
    {icon:'🍱', name:'天婦羅', key:'tempura'},
  ];

  ctx.fillStyle='#ffffff';
  ctx.font='11px DotGothic16';
  ctx.textAlign='left';

  for(let i=0;i<items.length;i++){
    const item=items[i];
    const count=inventory[item.key]||0;
    const itemSpacing=30; // 每個道具的間隔
    const y=invY+12+i*itemSpacing; // 從框內頂部12像素開始

    // 繪製icon
    ctx.font='14px Arial';
    ctx.fillText(item.icon, invX+8, y);

    // 繪製名稱和數量
    ctx.font='11px DotGothic16';
    ctx.fillText(item.name+':'+count, invX+28, y);
  }
}

// ── 傳送門懸浮粒子 ───────────────────────────────────────
const portalParts=[];
function updatePortalParticles(){
  if(scene!=='main') return;
  if(Math.random()<.28){
    const ang=Math.random()*Math.PI*2;
    const d=18+Math.random()*52;
    const gY=GROUND_Y, PCX=1123, PCY=gY-65;
    const ml=80+Math.random()*80;
    portalParts.push({
      x:PCX+Math.cos(ang)*d, y:PCY+Math.sin(ang)*d,
      vx:(Math.random()-.5)*.55, vy:-.28-Math.random()*.45,
      life:ml, ml,
      sz:Math.random()>.72?2:1,
      col:['#b070eb','#d59ff4','#7c3ce1','#ffffff','#b070eb'][Math.floor(Math.random()*5)],
    });
  }
  for(let i=portalParts.length-1;i>=0;i--){
    const p=portalParts[i];
    p.x+=p.vx; p.y+=p.vy; p.life--;
    if(p.life<=0) portalParts.splice(i,1);
  }
}
// ── 時代場景繪製 ──────────────────────────────────────────
function drawEraScene(sceneName){
  const col=sceneName==='three-kingdom'?eraColors.ai:
    sceneName==='knight'?eraColors.cowork:eraColors.code;

  // 繪製背景（漸層天空）
  const g=ctx.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0,col.bgMain);
  g.addColorStop(1,col.bgSub);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,DESIGN_W,GROUND_Y);

  // 繪製星星（使用主城相同方法）
  for(const s of stars){
    s.phase+=s.speed;
    s.x=s.bx+Math.sin(s.phase*.31)*1.4;
    s.y=s.by+Math.cos(s.phase*.19)*.7;
    const b=(Math.sin(s.phase)+1)/2;
    const a=Math.floor(70+b*185).toString(16).padStart(2,'0');
    const sx=Math.round(s.x), sy=Math.round(s.y);
    ctx.fillStyle=(s.big?'#ffffff':'#cecac9')+a;
    ctx.fillRect(sx,sy,1,1);
    if(s.big&&b>.65){
      ctx.fillStyle='#ffffff33';
      ctx.fillRect(sx-1,sy,1,1); ctx.fillRect(sx+1,sy,1,1);
      ctx.fillRect(sx,sy-1,1,1);
    }
  }

  // 繪製背景建築剪影（貼至地面）
  ctx.fillStyle='rgba(0,0,0,.3)';
  if(sceneName==='three-kingdom'){
    // 三國：宮殿和塔樓剪影（磚石風格）
    // 左側宮殿群
    const p1x=60, p1y=GROUND_Y-100;
    ctx.fillRect(p1x, p1y, 100, 100);       // 主殿
    ctx.fillRect(p1x+25, p1y-40, 50, 40);   // 屋頂
    ctx.fillRect(p1x+40, p1y-80, 20, 40);   // 塔樓頂
    // 中央塔樓
    const c1x=480, c1y=GROUND_Y-120;
    ctx.fillRect(c1x, c1y, 50, 120);        // 塔身
    ctx.fillRect(c1x+10, c1y-50, 30, 50);   // 塔樓
    ctx.fillRect(c1x+15, c1y-70, 20, 20);   // 塔頂
    // 右側宮殿
    const r1x=950, r1y=GROUND_Y-90;
    ctx.fillRect(r1x, r1y, 120, 90);        // 主殿
    ctx.fillRect(r1x+30, r1y-50, 60, 50);   // 屋頂
    ctx.fillRect(r1x+55, r1y-80, 10, 30);   // 中央塔
  } else if(sceneName==='knight'){
    // 騎士：城堡和防禦塔樓（尖塔風格）
    // 左側防禦塔
    const lt1x=50, lt1y=GROUND_Y-140;
    ctx.fillRect(lt1x, lt1y, 60, 140);      // 塔身
    ctx.fillRect(lt1x+10, lt1y-40, 40, 40); // 尖塔
    ctx.fillRect(lt1x+18, lt1y-50, 24, 10); // 塔頂尖
    // 中央城堡
    const cb1x=420, cb1y=GROUND_Y-100;
    ctx.fillRect(cb1x, cb1y, 180, 100);           // 城堡主體
    ctx.fillRect(cb1x+40, cb1y-50, 40, 50);       // 左塔
    ctx.fillRect(cb1x+100, cb1y-60, 40, 60);      // 右塔
    ctx.fillRect(cb1x+50, cb1y-30, 80, 30);       // 城牆頂
    ctx.fillRect(cb1x+60, cb1y-70, 60, 20);       // 中央堡壘
    // 右側防禦塔
    const rt1x=960, rt1y=GROUND_Y-130;
    ctx.fillRect(rt1x, rt1y, 55, 130);      // 塔身
    ctx.fillRect(rt1x+8, rt1y-35, 39, 35);  // 尖塔
  } else {
    // 江戶：寺廟和城樓（飛簷風格）
    // 左側寺廟
    const t1x=55, t1y=GROUND_Y-110;
    ctx.fillRect(t1x, t1y, 90, 110);         // 寺廟主體
    ctx.fillRect(t1x+15, t1y-40, 60, 40);    // 飛簷屋頂
    ctx.fillRect(t1x+35, t1y-60, 20, 20);    // 中央塔
    // 中央城樓
    const p2x=460, p2y=GROUND_Y-130;
    ctx.fillRect(p2x, p2y, 110, 130);       // 主樓身
    ctx.fillRect(p2x+15, p2y-50, 80, 50);   // 飛簷屋頂
    ctx.fillRect(p2x+40, p2y-80, 30, 30);   // 塔樓
    ctx.fillRect(p2x+45, p2y-100, 20, 20);  // 塔頂
    // 右側建築群
    const r2x=930, r2y=GROUND_Y-100;
    ctx.fillRect(r2x, r2y, 100, 100);       // 左建築
    ctx.fillRect(r2x+70, r2y-40, 50, 140);  // 右側塔樓
    ctx.fillRect(r2x+80, r2y-80, 30, 40);   // 塔頂
  }

  // 繪製地面
  drawEraGround(col);

  // 左側傳送門（返回領地）
  drawEraPortal(200,GROUND_Y-106);

  // 右側時代城堡（底部對齊地面 GROUND_Y）
  const gY=GROUND_Y;
  if(sceneName==='three-kingdom'){
    drawThreeKingdomCastle(1000, gY-120); // 最低點 y+120；x 左移避免基座(±250)超出右緣
  } else if(sceneName==='knight'){
    drawKnightCastle(1050, gY-40);        // 最低點 y+40
  } else {
    drawEdoCastle(1050, gY-85);           // 最低點 y+85
  }

  // 繪製時代NPC
  const npcList=sceneName==='three-kingdom'?eraWarriors['three-kingdom']:
    sceneName==='knight'?eraWarriors.knight:eraWarriors.edo;
  for(const w of npcList){
    drawWarrior(w.x,GROUND_Y,w.facing,w.state);
  }

  // 繪製玩家
  drawPlayer(PL.x,PL.y,PL.facing,PL.frame);

  // 繪製UI
  drawLabels();
  drawDialog(); drawLevelMenu();
  drawMusicToggleButton();
  drawFadeOverlay();

  // 場景標題
  const titles={
    'three-kingdom':'三國時期 - Claude AI',
    'knight':'騎士時期 - Claude Cowork',
    'edo':'江戶時期 - Claude Code',
  };
  ctx.fillStyle=col.accent3||'#ffe08b'; ctx.font='12px DotGothic16'; ctx.textAlign='right';
  ctx.fillText(titles[sceneName],DESIGN_W-16,DESIGN_H-14);
}

function drawEraGround(col){
  const S=8;
  const eraGP={
    g0:['#22474c','#146756'],
    g1:['#146756','#148568'],
    g2:['#148568','#52b281'],
    g3:['#52b281','#7bd7a9'],
    t0:['#4c6051','#61855a'],
    t1:['#61855a','#899f66'],
    t2:['#845750','#61855a'],
    t3:['#633b3f','#845750'],
    b0:['#845750','#9f705a'],
    b1:['#633b3f','#845750'],
    b2:['#542323','#633b3f'],
    b3:['#3f2323','#542323'],
  };

  // 使用預生成的地面貼圖
  if(!eraGroundMap) generateEraGroundMap();
  for(let r=0;r<eraGroundMap.length;r++){
    for(let c=0;c<eraGroundMap[r].length;c++){
      const tx=c*S, ty=GROUND_Y+r*S;
      if(ty>DESIGN_H+S)continue;
      const [dk,lt]=eraGP[eraGroundMap[r][c]];
      ctx.fillStyle=dk; ctx.fillRect(tx,ty,S,S);
      ctx.fillStyle=lt;
      ctx.fillRect(tx,ty,S-1,2); ctx.fillRect(tx,ty+2,2,S-3);
      ctx.fillStyle=dk;
      ctx.fillRect(tx+S-1,ty,1,S); ctx.fillRect(tx,ty+S-1,S,1);
    }
  }
  ctx.fillStyle='#0b2428';
  ctx.fillRect(0,GROUND_Y-1,DESIGN_W,2);
}

function drawEraPortal(x,y){
  // 與真田領地相同的傳送門樣式
  const W=68,H=82,pillarW=13,slabH=16;
  const archW=W-pillarW*2, archH=H-slabH;
  drawPortalSwirl(x+pillarW,y+slabH,archW,archH);
  drawAncientColumn(x,           y+slabH,pillarW,archH);
  drawAncientColumn(x+W-pillarW, y+slabH,pillarW,archH);
  drawAncientSlab(x-6,y,W+12,slabH);
  for(let i=0;i<3;i++){
    const gx=x+5+i*19, gy=y+3;
    px(gx,gy,9,9,C.sBlack,C.sMid);
    px(gx+2,gy+2,5,5,'#06000e',null);
    ctx.fillStyle='#845750'; ctx.fillRect(gx+1,gy+1,2,1);
  }
  drawGlow(x+W/2, y+H-2, '#f87b1b', 20);
  drawPortalStairs(x, y+H, W);
}

function drawEraCamp(x,y,sceneName){
  // 時代特定紮營處（縮小版，依照該時期設計）
  const col=sceneName==='three-kingdom'?eraColors.ai:
    sceneName==='knight'?eraColors.cowork:eraColors.code;

  // 帳篷（2個）
  const tentL=col.buildLight, tentD=col.buildMid;
  const tent1x=x-20, tent2x=x+30;

  // 帳篷1
  ctx.fillStyle=tentD;
  ctx.beginPath(); ctx.moveTo(tent1x-15, y+40); ctx.lineTo(tent1x+15, y); ctx.lineTo(tent1x+45, y+40); ctx.fill();
  ctx.fillStyle=tentL;
  ctx.fillRect(tent1x-15, y+35, 60, 5);
  ctx.fillStyle='#22472c';
  ctx.fillRect(tent1x+15, y+15, 2, 25);

  // 帳篷2
  ctx.fillStyle=tentD;
  ctx.beginPath(); ctx.moveTo(tent2x-15, y+40); ctx.lineTo(tent2x+15, y); ctx.lineTo(tent2x+45, y+40); ctx.fill();
  ctx.fillStyle=tentL;
  ctx.fillRect(tent2x-15, y+35, 60, 5);
  ctx.fillStyle='#22472c';
  ctx.fillRect(tent2x+15, y+15, 2, 25);

  // 簡單的焚火
  ctx.fillStyle=col.accent2;
  ctx.fillRect(x+8, y+40, 4, 4);
  ctx.fillStyle=col.accent1;
  ctx.fillRect(x+9, y+38, 2, 2);
}

function drawThreeKingdomCastle(x,y){
  // 三國城堡（詳細pixel art風格，依照SVG設計）
  // 尺寸：約500×200像素，三段式（左箭樓-中央城門-右箭樓）

  const col={
    wallDark: '#4a3a2a',
    wallMid: '#6a5a4a',
    wallLight: '#8a7a6a',
    brickDark: '#5a4a3a',
    brickLight: '#7a6a5a',
    doorDark: '#3a2a1a',
    doorMid: '#5a4a3a',
    roofDark: '#7a3a2a',
    roofLight: '#aa5a4a',
    flagYellow: '#d4a53a',
    flagRed: '#c94a2a',
    lantern: '#d95a2a',
    gold: '#daa520',
    wood: '#5a4a3a',
    outline: '#2a1a1a'
  };

  // ═══ 城牆基座 ════════════════════════════════════════
  ctx.fillStyle=col.wallDark;
  ctx.fillRect(x-250, y+40, 500, 80);

  // 城牆大磚塊紋理（模擬SVG的40像素寬磚塊）
  ctx.fillStyle=col.brickDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<12; i++){
    for(let j=0; j<3; j++){
      ctx.fillRect(x-250+i*40, y+40+j*26, 38, 26);
    }
  }
  ctx.globalAlpha=1.0;

  // 城牆磚線（垂直分割）
  ctx.strokeStyle=col.brickLight;
  ctx.lineWidth=1;
  for(let i=0; i<13; i++){
    ctx.beginPath();
    ctx.moveTo(x-250+i*40, y+40);
    ctx.lineTo(x-250+i*40, y+120);
    ctx.stroke();
  }

  // 城牆頂部雉堞（規則分布）
  ctx.fillStyle=col.wallMid;
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  for(let i=0; i<15; i++){
    const cx=x-240+i*33;
    ctx.fillRect(cx, y+18, 20, 22);
    ctx.strokeRect(cx, y+18, 20, 22);
  }

  // ═══ 左側箭樓（下層） ════════════════════════════════
  const ltx=x-200, lty=y-40;

  // 下層塔身
  ctx.fillStyle=col.wallMid;
  ctx.fillRect(ltx, lty, 70, 80);

  // 下層磚紋（30×45像素磚塊）
  ctx.fillStyle=col.brickDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(ltx+i*35, lty+j*40, 30, 35);
    }
  }
  ctx.globalAlpha=1.0;

  // 下層窗戶
  ctx.fillStyle=col.doorDark;
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.fillRect(ltx+10, lty+20, 12, 16);
  ctx.strokeRect(ltx+10, lty+20, 12, 16);
  ctx.fillRect(ltx+48, lty+20, 12, 16);
  ctx.strokeRect(ltx+48, lty+20, 12, 16);

  // 下層門
  ctx.fillRect(ltx+22, lty+50, 26, 30);
  ctx.strokeRect(ltx+22, lty+50, 26, 30);
  ctx.beginPath();
  ctx.moveTo(ltx+35, lty+50);
  ctx.lineTo(ltx+35, lty+80);
  ctx.stroke();

  // ═══ 左側箭樓（上層） ════════════════════════════════
  const ltx2=ltx+10, lty2=lty-60;

  // 上層塔身（縮小）
  ctx.fillStyle=col.wallMid;
  ctx.fillRect(ltx2, lty2, 50, 60);

  // 上層磚紋
  ctx.fillStyle=col.brickDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(ltx2+i*25, lty2+j*30, 22, 28);
    }
  }
  ctx.globalAlpha=1.0;

  // 上層窗戶
  ctx.fillStyle=col.doorDark;
  ctx.fillRect(ltx2+8, lty2+15, 11, 14);
  ctx.strokeRect(ltx2+8, lty2+15, 11, 14);
  ctx.fillRect(ltx2+31, lty2+15, 11, 14);
  ctx.strokeRect(ltx2+31, lty2+15, 11, 14);

  // 左箭樓屋頂（中式翹簷）
  ctx.fillStyle=col.roofDark;
  ctx.beginPath();
  ctx.moveTo(ltx2, lty2);
  ctx.lineTo(ltx2+25, lty2-30);
  ctx.lineTo(ltx2+50, lty2);
  ctx.fill();
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.stroke();

  // 屋簷上翹
  ctx.fillStyle=col.roofLight;
  ctx.globalAlpha=0.8;
  ctx.beginPath();
  ctx.moveTo(ltx2-3, lty2+2);
  ctx.lineTo(ltx2+25, lty2-28);
  ctx.lineTo(ltx2+53, lty2+2);
  ctx.fill();
  ctx.globalAlpha=1.0;

  // 屋脊金飾
  ctx.fillStyle=col.gold;
  ctx.beginPath();
  ctx.arc(ltx2+25, lty2-33, 5, 0, Math.PI*2);
  ctx.fill();

  // 燈籠（左側）
  ctx.fillStyle=col.lantern;
  ctx.beginPath();
  ctx.arc(ltx2+12, lty2+5, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle=col.gold;
  ctx.fillRect(ltx2+12, lty2-5, 1, 10);

  // 燈籠（右側）
  ctx.fillStyle=col.lantern;
  ctx.beginPath();
  ctx.arc(ltx2+38, lty2+5, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle=col.gold;
  ctx.fillRect(ltx2+38, lty2-5, 1, 10);

  // ═══ 中央城門 ════════════════════════════════════════
  const gatex=x-120, gatey=y-20;

  // 城門基座
  ctx.fillStyle=col.doorMid;
  ctx.fillRect(gatex, gatey, 240, 70);

  // 城門磚紋
  ctx.fillStyle=col.doorDark;
  ctx.globalAlpha=0.5;
  for(let i=0; i<4; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(gatex+i*60, gatey+j*35, 55, 33);
    }
  }
  ctx.globalAlpha=1.0;

  // 拱形木門（左側）
  ctx.strokeStyle=col.doorDark;
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(gatex+35, gatey+20);
  ctx.quadraticCurveTo(gatex+25, gatey-10, gatex+50, gatey-15);
  ctx.stroke();

  // 拱形木門（右側）
  ctx.beginPath();
  ctx.moveTo(gatex+190, gatey+20);
  ctx.quadraticCurveTo(gatex+200, gatey-10, gatex+175, gatey-15);
  ctx.stroke();

  // 門框
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=1;
  ctx.strokeRect(gatex+15, gatey-20, 210, 90);

  // 門上匾額
  ctx.fillStyle=col.gold;
  ctx.fillRect(gatex+45, gatey-35, 150, 20);
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=1;
  ctx.strokeRect(gatex+45, gatey-35, 150, 20);

  // 門上屋頂（中式翹簷）
  ctx.fillStyle=col.roofDark;
  ctx.beginPath();
  ctx.moveTo(gatex, gatey-20);
  ctx.lineTo(gatex+120, gatey-60);
  ctx.lineTo(gatex+240, gatey-20);
  ctx.fill();

  // 屋簷上翹
  ctx.fillStyle=col.roofLight;
  ctx.globalAlpha=0.7;
  ctx.beginPath();
  ctx.moveTo(gatex-5, gatey-18);
  ctx.lineTo(gatex+120, gatey-58);
  ctx.lineTo(gatex+245, gatey-18);
  ctx.fill();
  ctx.globalAlpha=1.0;

  // 屋脊金飾
  ctx.fillStyle=col.gold;
  ctx.beginPath();
  ctx.arc(gatex+120, gatey-63, 6, 0, Math.PI*2);
  ctx.fill();

  // 門前旗竿與旗幟（左）
  ctx.fillStyle=col.wood;
  ctx.fillRect(gatex+25, gatey-55, 2, 60);
  ctx.fillStyle=col.gold;
  ctx.fillRect(gatex+24, gatey-55, 4, 2);
  ctx.fillStyle=col.flagYellow;
  ctx.fillRect(gatex+27, gatey-48, 20, 14);
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.strokeRect(gatex+27, gatey-48, 20, 14);

  // 門前旗竿與旗幟（右）
  ctx.fillStyle=col.wood;
  ctx.fillRect(gatex+213, gatey-55, 2, 60);
  ctx.fillStyle=col.gold;
  ctx.fillRect(gatex+212, gatey-55, 4, 2);
  ctx.fillStyle=col.flagYellow;
  ctx.fillRect(gatex+193, gatey-48, 20, 14);
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.strokeRect(gatex+193, gatey-48, 20, 14);

  // ═══ 右側箭樓（對稱） ════════════════════════════════
  const rtx=x+130, rty=y-40;

  // 下層塔身
  ctx.fillStyle=col.wallMid;
  ctx.fillRect(rtx, rty, 70, 80);

  // 下層磚紋
  ctx.fillStyle=col.brickDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(rtx+i*35, rty+j*40, 30, 35);
    }
  }
  ctx.globalAlpha=1.0;

  // 下層窗戶
  ctx.fillStyle=col.doorDark;
  ctx.fillRect(rtx+10, rty+20, 12, 16);
  ctx.strokeRect(rtx+10, rty+20, 12, 16);
  ctx.fillRect(rtx+48, rty+20, 12, 16);
  ctx.strokeRect(rtx+48, rty+20, 12, 16);

  // 下層門
  ctx.fillRect(rtx+22, rty+50, 26, 30);
  ctx.strokeRect(rtx+22, rty+50, 26, 30);
  ctx.beginPath();
  ctx.moveTo(rtx+35, rty+50);
  ctx.lineTo(rtx+35, rty+80);
  ctx.stroke();

  // ═══ 右側箭樓（上層） ════════════════════════════════
  const rtx2=rtx+10, rty2=rty-60;

  // 上層塔身
  ctx.fillStyle=col.wallMid;
  ctx.fillRect(rtx2, rty2, 50, 60);

  // 上層磚紋
  ctx.fillStyle=col.brickDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(rtx2+i*25, rty2+j*30, 22, 28);
    }
  }
  ctx.globalAlpha=1.0;

  // 上層窗戶
  ctx.fillStyle=col.doorDark;
  ctx.fillRect(rtx2+8, rty2+15, 11, 14);
  ctx.strokeRect(rtx2+8, rty2+15, 11, 14);
  ctx.fillRect(rtx2+31, rty2+15, 11, 14);
  ctx.strokeRect(rtx2+31, rty2+15, 11, 14);

  // 右箭樓屋頂
  ctx.fillStyle=col.roofDark;
  ctx.beginPath();
  ctx.moveTo(rtx2, rty2);
  ctx.lineTo(rtx2+25, rty2-30);
  ctx.lineTo(rtx2+50, rty2);
  ctx.fill();
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.stroke();

  // 屋簷上翹
  ctx.fillStyle=col.roofLight;
  ctx.globalAlpha=0.8;
  ctx.beginPath();
  ctx.moveTo(rtx2-3, rty2+2);
  ctx.lineTo(rtx2+25, rty2-28);
  ctx.lineTo(rtx2+53, rty2+2);
  ctx.fill();
  ctx.globalAlpha=1.0;

  // 屋脊金飾
  ctx.fillStyle=col.gold;
  ctx.beginPath();
  ctx.arc(rtx2+25, rty2-33, 5, 0, Math.PI*2);
  ctx.fill();

  // 燈籠（左側）
  ctx.fillStyle=col.lantern;
  ctx.beginPath();
  ctx.arc(rtx2+12, rty2+5, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle=col.gold;
  ctx.fillRect(rtx2+12, rty2-5, 1, 10);

  // 燈籠（右側）
  ctx.fillStyle=col.lantern;
  ctx.beginPath();
  ctx.arc(rtx2+38, rty2+5, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle=col.gold;
  ctx.fillRect(rtx2+38, rty2-5, 1, 10);
}

function drawKnightCastle(x,y){
  // 騎士時期城堡（pixel art風格，依照SVG設計）
  // 尺寸：約260×330像素（完全對稱的中世紀城堡）

  const col={
    stoneDark: '#4a4a4a',
    stoneLight: '#6a6a6a',
    stonePale: '#b0b0b0',
    woodBrown: '#7a4a2a',
    bandColor: '#b5622a',
    roofDark: '#8b3a2a',
    roofMid: '#c0392b',
    roofLight: '#e67e22',
    roofPale: '#f5a962',
    doorDark: '#3a2a1a',
    outline: '#2a2a2a'
  };

  // ═══ 左角樓（下層） ════════════════════════════════════════
  const ltx=x-120, lty=y-80;

  // 下層塔身
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(ltx, lty, 60, 120);

  // 下層磚紋
  ctx.fillStyle=col.stoneDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    for(let j=0; j<3; j++){
      ctx.fillRect(ltx+i*30, lty+j*40, 28, 38);
    }
  }
  ctx.globalAlpha=1.0;

  // 下層磚線
  ctx.strokeStyle=col.stoneLight;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(ltx+30, lty);
  ctx.lineTo(ltx+30, lty+120);
  ctx.stroke();
  for(let j=0; j<4; j++){
    ctx.beginPath();
    ctx.moveTo(ltx, lty+j*40);
    ctx.lineTo(ltx+60, lty+j*40);
    ctx.stroke();
  }

  // ═══ 左角樓（上層，城垛） ════════════════════════════════
  // 城垛 1
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(ltx, lty-40, 18, 40);
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.strokeRect(ltx, lty-40, 18, 40);

  // 城垛 2
  ctx.fillRect(ltx+21, lty-40, 18, 40);
  ctx.strokeRect(ltx+21, lty-40, 18, 40);

  // 城垛 3
  ctx.fillRect(ltx+42, lty-40, 18, 40);
  ctx.strokeRect(ltx+42, lty-40, 18, 40);

  // ═══ 左城牆 ═══════════════════════════════════════════
  const lwx=ltx+60, lwy=y-60;

  // 城牆主體
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(lwx, lwy, 40, 90);

  // 城牆磚紋
  ctx.fillStyle=col.stoneDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<1; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(lwx, lwy+j*45, 38, 43);
    }
  }
  ctx.globalAlpha=1.0;

  // 城牆磚線
  ctx.strokeStyle=col.stoneLight;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(lwx, lwy+45);
  ctx.lineTo(lwx+40, lwy+45);
  ctx.stroke();

  // ═══ 中央主塔（第一層：城門層） ═══════════════════════════
  const gatex=x-60, gatey=y-20;

  // 城門基座
  ctx.fillStyle=col.doorDark;
  ctx.fillRect(gatex, gatey, 120, 50);

  // 城門磚紋
  ctx.fillStyle=col.stoneDark;
  ctx.globalAlpha=0.5;
  for(let i=0; i<2; i++){
    ctx.fillRect(gatex+i*60, gatey, 55, 50);
  }
  ctx.globalAlpha=1.0;

  // 拱形木門（左側）
  ctx.strokeStyle=col.woodBrown;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(gatex+25, gatey+15);
  ctx.quadraticCurveTo(gatex+20, gatey-8, gatex+40, gatey-12);
  ctx.stroke();

  // 拱形木門（右側）
  ctx.beginPath();
  ctx.moveTo(gatex+95, gatey+15);
  ctx.quadraticCurveTo(gatex+100, gatey-8, gatex+80, gatey-12);
  ctx.stroke();

  // 門框
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=1;
  ctx.strokeRect(gatex+10, gatey-15, 100, 65);

  // ═══ 中央主塔（第二層：塔身層） ═══════════════════════════
  const tbx=x-55, tby=y-80;

  // 塔身
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(tbx, tby, 110, 60);

  // 塔身磚紋
  ctx.fillStyle=col.stoneDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    ctx.fillRect(tbx+i*55, tby, 50, 60);
  }
  ctx.globalAlpha=1.0;

  // 塔身磚線
  ctx.strokeStyle=col.stoneLight;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(tbx+55, tby);
  ctx.lineTo(tbx+55, tby+60);
  ctx.stroke();

  // 腰部裝飾橫帶（橘棕色）
  ctx.fillStyle=col.bandColor;
  ctx.fillRect(tbx-5, tby+25, 120, 6);
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.strokeRect(tbx-5, tby+25, 120, 6);

  // ═══ 中央主塔（第三層：瞭望台） ═══════════════════════════
  const wtx=x-50, wty=y-145;

  // 瞭望台底座
  ctx.fillStyle=col.stonePale;
  ctx.fillRect(wtx, wty, 100, 50);

  // 瞭望台磚紋
  ctx.fillStyle=col.stoneLight;
  ctx.globalAlpha=0.5;
  for(let i=0; i<2; i++){
    ctx.fillRect(wtx+i*50, wty, 45, 50);
  }
  ctx.globalAlpha=1.0;

  // 瞭望台磚線
  ctx.strokeStyle=col.stoneLight;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(wtx+50, wty);
  ctx.lineTo(wtx+50, wty+50);
  ctx.stroke();

  // 窗洞（5個等距窗戶）
  ctx.fillStyle=col.stoneDark;
  const windowSpacing=20;
  for(let i=0; i<5; i++){
    const wx=wtx+10+i*18;
    ctx.fillRect(wx, wty+15, 5, 10);
    ctx.strokeRect(wx, wty+15, 5, 10);
  }

  // ═══ 圓錐形尖頂 ═════════════════════════════════════════
  // 最深層（黑邊）
  ctx.fillStyle=col.roofDark;
  ctx.beginPath();
  ctx.moveTo(wtx, wty);
  ctx.lineTo(wtx+50, wty-40);
  ctx.lineTo(wtx+100, wty);
  ctx.fill();

  // 中層（紅色）
  ctx.fillStyle=col.roofMid;
  ctx.beginPath();
  ctx.moveTo(wtx+2, wty-2);
  ctx.lineTo(wtx+50, wty-38);
  ctx.lineTo(wtx+98, wty-2);
  ctx.fill();

  // 淺層（橘色）
  ctx.fillStyle=col.roofLight;
  ctx.beginPath();
  ctx.moveTo(wtx+4, wty-4);
  ctx.lineTo(wtx+50, wty-36);
  ctx.lineTo(wtx+96, wty-4);
  ctx.fill();

  // 最淺層（淡橘色）
  ctx.fillStyle=col.roofPale;
  ctx.beginPath();
  ctx.moveTo(wtx+6, wty-6);
  ctx.lineTo(wtx+50, wty-34);
  ctx.lineTo(wtx+94, wty-6);
  ctx.fill();

  // 尖頂邊框
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.beginPath();
  ctx.moveTo(wtx, wty);
  ctx.lineTo(wtx+50, wty-40);
  ctx.lineTo(wtx+100, wty);
  ctx.stroke();

  // ═══ 右城牆（對稱左城牆） ════════════════════════════════
  const rwx=x+80, rwy=y-60;

  // 城牆主體
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(rwx, rwy, 40, 90);

  // 城牆磚紋
  ctx.fillStyle=col.stoneDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<1; i++){
    for(let j=0; j<2; j++){
      ctx.fillRect(rwx, rwy+j*45, 38, 43);
    }
  }
  ctx.globalAlpha=1.0;

  // 城牆磚線
  ctx.strokeStyle=col.stoneLight;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(rwx, rwy+45);
  ctx.lineTo(rwx+40, rwy+45);
  ctx.stroke();

  // ═══ 右角樓（下層） ════════════════════════════════════════
  const rtx=x+60, rty=y-80;

  // 下層塔身
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(rtx, rty, 60, 120);

  // 下層磚紋
  ctx.fillStyle=col.stoneDark;
  ctx.globalAlpha=0.6;
  for(let i=0; i<2; i++){
    for(let j=0; j<3; j++){
      ctx.fillRect(rtx+i*30, rty+j*40, 28, 38);
    }
  }
  ctx.globalAlpha=1.0;

  // 下層磚線
  ctx.strokeStyle=col.stoneLight;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(rtx+30, rty);
  ctx.lineTo(rtx+30, rty+120);
  ctx.stroke();
  for(let j=0; j<4; j++){
    ctx.beginPath();
    ctx.moveTo(rtx, rty+j*40);
    ctx.lineTo(rtx+60, rty+j*40);
    ctx.stroke();
  }

  // ═══ 右角樓（上層，城垛） ════════════════════════════════
  // 城垛 1
  ctx.fillStyle=col.stoneLight;
  ctx.fillRect(rtx, rty-40, 18, 40);
  ctx.strokeStyle=col.outline;
  ctx.lineWidth=0.5;
  ctx.strokeRect(rtx, rty-40, 18, 40);

  // 城垛 2
  ctx.fillRect(rtx+21, rty-40, 18, 40);
  ctx.strokeRect(rtx+21, rty-40, 18, 40);

  // 城垛 3
  ctx.fillRect(rtx+42, rty-40, 18, 40);
  ctx.strokeRect(rtx+42, rty-40, 18, 40);
}

function drawEdoCastle(x,y){
  // 江戶時期宮殿（放大 8 倍版本，底部與地面齊平）
  // 原始尺寸乘以 8，y 軸為底部位置

  const col={
    white: '#ffffff',
    stonePath: '#c0b898',
    stoneStep: '#d8cdb0',
    woodWall: '#3a2518',
    column: '#8b1a1a',
    roofDark: '#1e1e1e',
    roofGold: '#c8a020',
    gold: '#d4a830',
    window: '#1a1a1a',
    mapleRed: '#cc3311',
    mapleDark: '#aa2200',
    greenBush: '#2a5010',
    treeTrunk: '#5a2a00'
  };

  // 放大因子（8倍/3 ≈ 2.67倍）
  const scale = 8/3;

  // 調整 y 軸：傳入的 y 是底部位置，需要往上偏移台階高度
  const stairH = 4 * scale;  // 第一層台階高度
  const baseY = y - stairH;  // 宮殿基準線

  // ═══ 台階（3層） ══════════════════════════════════════
  // 第三層（最上）
  ctx.fillStyle=col.stoneStep;
  ctx.fillRect(x-18*scale, baseY-12*scale, 36*scale, 4*scale);
  // 第二層
  ctx.fillStyle=col.stoneStep;
  ctx.fillRect(x-30*scale, baseY-8*scale, 60*scale, 4*scale);
  // 第一層
  ctx.fillStyle=col.stoneStep;
  ctx.fillRect(x-42*scale, baseY-4*scale, 84*scale, 4*scale);

  // ═══ 第一層宮殿主體 ════════════════════════════════════
  const layer1W = 108*scale, layer1H = 36*scale;

  // 牆身
  ctx.fillStyle=col.woodWall;
  ctx.fillRect(x-layer1W/2, baseY, layer1W, layer1H);

  // 6根紅柱（縮小版）
  const colSpacing = layer1W / 5;
  for(let i=0; i<6; i++){
    const colX = x - layer1W/2 + i*colSpacing;
    ctx.fillStyle=col.column;
    ctx.fillRect(colX, baseY-6*scale, 4*scale, layer1H+6*scale);
  }

  // 屋頂（翹簷效果）
  drawSmallRoof(x-layer1W/2, baseY-12*scale, layer1W, col.roofDark, col.roofGold, 12);

  // ═══ 第二層宮殿主體 ════════════════════════════════════
  const layer2W = 72*scale, layer2H = 24*scale;

  ctx.fillStyle=col.woodWall;
  ctx.fillRect(x-layer2W/2, baseY-42*scale, layer2W, layer2H);

  // 2個小窗戶
  ctx.fillStyle=col.window;
  ctx.fillRect(x-24*scale, baseY-36*scale, 10*scale, 8*scale);
  ctx.fillRect(x+14*scale, baseY-36*scale, 10*scale, 8*scale);

  // 屋頂
  drawSmallRoof(x-layer2W/2, baseY-54*scale, layer2W, col.roofDark, col.roofGold, 8);

  // ═══ 第三層（頂部小塔） ═══════════════════════════════
  const layer3W = 30*scale, layer3H = 15*scale;

  ctx.fillStyle=col.woodWall;
  ctx.fillRect(x-layer3W/2, baseY-75*scale, layer3W, layer3H);

  // 小屋頂
  drawSmallRoof(x-layer3W/2, baseY-86*scale, layer3W, col.roofDark, col.roofGold, 6);

  // 頂端金色細柱
  ctx.fillStyle=col.gold;
  ctx.fillRect(x-1*scale, baseY-100*scale, 2*scale, 12*scale);
  ctx.fillRect(x-0.5*scale, baseY-102*scale, 1*scale, 2*scale);

  // ═══ 左側紅葉楓樹 ══════════════════════════════════════
  const mapleX = x - 54*scale;
  const mapleY = baseY - 24*scale;

  // 樹幹
  ctx.fillStyle=col.treeTrunk;
  ctx.fillRect(mapleX-2*scale, mapleY, 3*scale, 24*scale);

  // 樹冠（不規則矩形堆疊）
  const maplePositions = [
    // 中心層（深紅）
    { dx: 0, dy: 6*scale, w: 15*scale, h: 8*scale, color: col.mapleDark },
    { dx: -2*scale, dy: 8*scale, w: 6*scale, h: 5*scale, color: col.mapleDark },
    { dx: 5*scale, dy: 8*scale, w: 6*scale, h: 5*scale, color: col.mapleDark },

    // 外層（紅色）
    { dx: -4*scale, dy: 4*scale, w: 10*scale, h: 6*scale, color: col.mapleRed },
    { dx: 6*scale, dy: 4*scale, w: 10*scale, h: 6*scale, color: col.mapleRed },
    { dx: -3*scale, dy: 0, w: 8*scale, h: 6*scale, color: col.mapleRed },
    { dx: 4*scale, dy: 0, w: 8*scale, h: 6*scale, color: col.mapleRed },

    // 上層（紅色）
    { dx: 0, dy: -5*scale, w: 10*scale, h: 8*scale, color: col.mapleRed },
  ];

  for(let pos of maplePositions){
    ctx.fillStyle=pos.color;
    ctx.fillRect(mapleX+pos.dx, mapleY+pos.dy, pos.w, pos.h);
  }

  // ═══ 右側綠灌木（3叢） ═════════════════════════════════
  const bushStartX = x + 54*scale;
  const bushStartY = baseY - 20*scale;

  const bushPositions = [
    // 灌木1（上方）
    { x: -9*scale, y: -12*scale, w: 10*scale, h: 10*scale, color: col.greenBush },
    { x: -6*scale, y: -15*scale, w: 8*scale, h: 8*scale, color: col.greenBush },
    { x: 2*scale, y: -12*scale, w: 10*scale, h: 10*scale, color: col.greenBush },

    // 灌木2（中間）
    { x: -8*scale, y: 3*scale, w: 9*scale, h: 8*scale, color: col.greenBush },
    { x: 2*scale, y: 4*scale, w: 10*scale, h: 8*scale, color: col.greenBush },

    // 灌木3（下方）
    { x: -9*scale, y: 18*scale, w: 10*scale, h: 8*scale, color: col.greenBush },
    { x: 3*scale, y: 20*scale, w: 9*scale, h: 8*scale, color: col.greenBush },
  ];

  for(let bush of bushPositions){
    ctx.fillStyle=bush.color;
    ctx.fillRect(bushStartX+bush.x, bushStartY+bush.y, bush.w, bush.h);
  }
}

// 輔助函數：繪製縮小的屋頂
function drawSmallRoof(x, y, w, roofColor, goldColor, steps){
  const maxHeight = w / 6;

  for(let i=0; i<steps; i++){
    let height;
    let distFromCenter = Math.abs(i - (steps-1)/2);
    height = Math.max(2, maxHeight - (distFromCenter * maxHeight / (steps/2)));

    let rectX = x + (i * w / steps);
    let rectW = w / steps + 1;
    let rectY = y + maxHeight - height;

    ctx.fillStyle = roofColor;
    ctx.fillRect(rectX, rectY, rectW, height);
  }

  // 屋脊金線
  ctx.fillStyle = goldColor;
  ctx.fillRect(x, y - 2, w, 2);
}

function drawPortalParticles(){
  for(const p of portalParts){
    const a=Math.floor((p.life/p.ml)*255).toString(16).padStart(2,'0');
    ctx.fillStyle=p.col+a;
    ctx.fillRect(Math.round(p.x),Math.round(p.y),p.sz,p.sz);
  }
}

// ── 進度儲存 ──────────────────────────────────────────────
// 目前記憶體中的進度（不含時間戳；updatedAt 由實際存檔時才蓋上）
function currentStateData(){
  return {
    coins,
    inventory,
    levelProgress,
    gems,
    flagsPlanted,
    musicEnabled,
    introShown:!showIntro, // 已看過開場動畫
  };
}
function applySaveData(data){
  if(!data) return;
  coins=data.coins||0;
  inventory=data.inventory||{noodle:0,fish:0,tempura:0};
  levelProgress=data.levelProgress||{unlockedLevels:Array(30).fill(false).map((v,i)=>i===0),maxStars:Array(30).fill(0)};
  gems=data.gems||[false,false,false];
  flagsPlanted=data.flagsPlanted||{ai:false, cowork:false, code:false};
  musicEnabled=data.musicEnabled!==false;
  showIntro=!data.introShown;
}
function saveProgress(){
  const data=currentStateData();
  data.updatedAt=Date.now(); // 真正存檔的時間，用於跨裝置比對哪份較新
  localStorage.setItem('sanadaGameProgress',JSON.stringify(data));
  // 若已登入雲端，順便同步上傳（非阻塞）
  if(window.CloudSave && window.CloudSave.onLocalSave) window.CloudSave.onLocalSave(data);
}
function loadProgress(){
  const saved=localStorage.getItem('sanadaGameProgress');
  if(saved){
    try{ applySaveData(JSON.parse(saved)); } catch(e){}
  }
}

// ── 提供給雲端存檔層（cloud-save.js）的橋接 API ──────────
window.SanadaGame={
  // 回傳 localStorage 中「真正存過」的進度（含真實 updatedAt）；從未存過則回 null，
  // 讓全新裝置在登入時以雲端為準，避免空進度覆蓋雲端。
  getLocalData(){
    const s=localStorage.getItem('sanadaGameProgress');
    if(!s) return null;
    try{ return JSON.parse(s); } catch(e){ return null; }
  },
  // 套用雲端拉回的進度並寫回 localStorage，保留雲端的 updatedAt（避免本機看起來較新）
  applyCloudData(data){
    applySaveData(data);
    const d=currentStateData();
    d.updatedAt=data.updatedAt||Date.now();
    localStorage.setItem('sanadaGameProgress',JSON.stringify(d));
  },
};

// ── 音頻管理 ─────────────────────────────────────────────
const AudioManager={
  audioContext:null,
  currentScene:null,
  oscillators:[],
  gains:[],

  init(){
    if(this.audioContext) return;
    this.audioContext=new (window.AudioContext||window.webkitAudioContext)();
  },

  playSceneMusic(sceneName){
    if(!musicEnabled||sceneName===this.currentScene) return;
    this.stopMusic();
    this.currentScene=sceneName;

    switch(sceneName){
      case 'main': this.playMainTheme(); break;
      case 'three-kingdom': this.playThreeKingdomTheme(); break;
      case 'knight': this.playKnightTheme(); break;
      case 'edo': this.playEdoTheme(); break;
      case 'battle': this.playBattleTheme(); break;
      case 'teaching': this.playMainTheme(); break;
      case 'levelClear': this.playVictoryFanfare(); break;
    }
  },

  stopMusic(){
    for(const osc of this.oscillators){
      osc.stop(this.audioContext.currentTime+0.1);
    }
    for(const gain of this.gains){
      gain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
    }
    this.oscillators=[];
    this.gains=[];
  },

  playMainTheme(){
    const ctx=this.audioContext;
    const notes=[262,294,330,392,440]; // C D E G A
    const tempo=0.4;
    let time=ctx.currentTime;

    for(let i=0;i<8;i++){
      const note=notes[i%5];
      this.playNote(note, time+i*tempo, tempo*0.9, 0.1);
    }
  },

  playThreeKingdomTheme(){
    const ctx=this.audioContext;
    const notes=[262,294,330,349,392,440,494]; // 五音階加4,7
    const tempo=0.35;
    let time=ctx.currentTime;

    for(let i=0;i<12;i++){
      const note=notes[Math.floor(i/2)%7];
      this.playNote(note, time+i*tempo, tempo*0.85, 0.12);
    }
  },

  playKnightTheme(){
    const ctx=this.audioContext;
    const notes=[220,247,262,294]; // A B C D (A minor scale)
    const tempo=0.45;
    let time=ctx.currentTime;

    for(let i=0;i<10;i++){
      const note=notes[i%4];
      this.playNote(note, time+i*tempo, tempo*0.95, 0.08);
    }
  },

  playEdoTheme(){
    const ctx=this.audioContext;
    const notes=[330,349,392,440,494]; // E F G A B (pentatonic)
    const tempo=0.3;
    let time=ctx.currentTime;

    // Taiko drum simulation (low frequency burst)
    for(let i=0;i<16;i++){
      if(i%4===0){
        this.playNote(60, time+i*tempo, tempo*0.4, 0.3); // Kick
      } else {
        this.playNote(notes[Math.floor(Math.random()*5)], time+i*tempo, tempo*0.8, 0.1);
      }
    }
  },

  playBattleTheme(){
    const ctx=this.audioContext;
    const notes=[330,349,392,440]; // E F G A
    const tempo=0.25;
    let time=ctx.currentTime;

    for(let i=0;i<16;i++){
      this.playNote(notes[i%4], time+i*tempo, tempo*0.9, 0.15);
    }
  },

  playVictoryFanfare(){
    const ctx=this.audioContext;
    const notes=[262,330,392,523]; // C E G C (高八度)

    for(let i=0;i<4;i++){
      this.playNote(notes[i], ctx.currentTime+i*0.3, 0.25, 0.1);
    }
  },

  playNote(freq, startTime, duration, volume){
    const ctx=this.audioContext;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();

    osc.frequency.value=freq;
    osc.type='square';

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.setTargetAtTime(0, startTime+duration*0.8, 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime+duration);

    this.oscillators.push(osc);
    this.gains.push(gain);
  }
};

function detectOrientation(){
  const newPortrait=window.innerHeight>window.innerWidth;
  if(newPortrait!==isPortrait){
    isPortrait=newPortrait;
  }
}

function drawMusicToggleButton(){
  const btnX=12; // 左下角
  const btnY=isPortrait?DESIGN_H-45:DESIGN_H-40; // 左下角，避免被UI挡住
  const btnW=48;
  const btnH=24;

  ctx.fillStyle=musicEnabled?'#4ade80':'#ef4444';
  ctx.fillRect(btnX, btnY, btnW, btnH);

  ctx.strokeStyle='#000000';
  ctx.lineWidth=1;
  ctx.strokeRect(btnX+0.5, btnY+0.5, btnW-1, btnH-1);

  ctx.fillStyle='#ffffff';
  ctx.font='bold 10px Arial';
  ctx.textAlign='center';
  ctx.fillText(musicEnabled?'🔊':'🔇', btnX+btnW/2, btnY+16);
}

function handleMusicButtonClick(x,y){
  const btnX=12; // 左下角
  const btnY=isPortrait?DESIGN_H-45:DESIGN_H-40;
  const btnW=48;
  const btnH=24;

  const scaledX=x/scale;
  const scaledY=y/scale;

  if(scaledX>=btnX&&scaledX<=btnX+btnW&&scaledY>=btnY&&scaledY<=btnY+btnH){
    toggleMusic();
    return true;
  }
  return false;
}

function toggleMusic(){
  musicEnabled=!musicEnabled;
  localStorage.setItem('musicEnabled', musicEnabled);

  if(musicEnabled){
    AudioManager.playSceneMusic(scene);
  } else {
    AudioManager.stopMusic();
  }
}

function gameLoop(){
  portalTime++;
  detectOrientation();

  if(showIntro){
    introFrameInScene++;
    // 防止幀數無限增長
    if(introFrameInScene>300){
      introFrameInScene=300;
    }
  } else if(scene==='ending'){
    endingFrame++;
    if(endingFrame>=1200){ // 4場景 * 300幀
      endingFrame=0;
      // 結局完成，停留在重新遊玩頁面
    }
  } else {
    // 更新場景音樂
    if(['main','three-kingdom','knight','edo','battle','teaching','levelClear'].includes(scene)){
      AudioManager.playSceneMusic(scene);
    }

    updatePlayer();
    updateWarriors();
    updatePortalParticles();
    if(scene==='main') checkNear();
    if(scene==='battle') updateBattle();
  }
  updateFade();
  drawScene();
  requestAnimationFrame(gameLoop);
}

function updateBattle(){
  // 答題後等待玩家點擊，不再自動進行下一題
  // answerTimer不再使用，等待onTap中的點擊檢測
}

// ── 初始化 ─────────────────────────────────────────────
// 檢查URL參數 ?reset 來重置遊戲進度
if(window.location.search.includes('reset')){
  localStorage.removeItem('sanadaGameProgress');
  window.history.replaceState({}, '', window.location.pathname);
}
AudioManager.init();
loadProgress();
generateStars(55);
generateGroundMap();
gameLoop();

// ── 音樂開關按鈕點擊事件 ───────────────────────────────
document.addEventListener('click',(e)=>{
  if(showIntro||scene==='ending') return;
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;
  handleMusicButtonClick(x,y);
});

document.addEventListener('touchend',(e)=>{
  if(showIntro||scene==='ending') return;
  const rect=canvas.getBoundingClientRect();
  const touch=e.changedTouches[0];
  const x=touch.clientX-rect.left;
  const y=touch.clientY-rect.top;
  handleMusicButtonClick(x,y);
});
