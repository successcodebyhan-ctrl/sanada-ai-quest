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

// ── 圖片資源載入 ─────────────────────────────────────────
const IMAGES = {};
function loadImage(key, src){
  const img = new Image();
  img.src = src;
  IMAGES[key] = img;
  return img;
}
// 三座主城已改為程式手繪（drawEdoCastle / drawThreeKingdomCastle / drawKnightCastle），不再載入照片

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
const BATTLE_GY=Math.round(DESIGN_H*.56);    // 對戰專用地面線（較高，下方留更大題目框）

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
// 每個時代各自一份關卡進度（避免三時代共用同一組索引）
function freshEraProgress(){ return {unlockedLevels:Array(30).fill(false).map((v,i)=>i===0), maxStars:Array(30).fill(0)}; }
function freshLevelProgress(){ return {ai:freshEraProgress(), cowork:freshEraProgress(), code:freshEraProgress()}; }
function isNewProgressFormat(lp){ return !!(lp && lp.ai && Array.isArray(lp.ai.unlockedLevels) && lp.cowork && lp.code); }
let levelProgress=freshLevelProgress();
function curProg(){ return levelProgress[currentEra] || levelProgress.ai; }
// 修復單一時代進度：確保 unlockedLevels / maxStars 為長度30的陣列，且第一關必解鎖
function sanitizeEraProgress(p){
  const fresh=freshEraProgress();
  if(!p||typeof p!=='object') return fresh;
  if(!Array.isArray(p.unlockedLevels)||p.unlockedLevels.length!==30){
    for(let i=0;i<30;i++) fresh.unlockedLevels[i]=!!(Array.isArray(p.unlockedLevels)&&p.unlockedLevels[i]);
    p.unlockedLevels=fresh.unlockedLevels;
  }
  p.unlockedLevels[0]=true; // 第一關永遠可進入
  if(!Array.isArray(p.maxStars)||p.maxStars.length!==30){
    const m=Array(30).fill(0);
    if(Array.isArray(p.maxStars)) for(let i=0;i<30;i++) m[i]=p.maxStars[i]||0;
    p.maxStars=m;
  }
  return p;
}
// 修復整份進度（防止存檔損壞導致某時代關卡全鎖、點不進去）
function sanitizeLevelProgress(){
  if(!levelProgress||typeof levelProgress!=='object') levelProgress=freshLevelProgress();
  levelProgress.ai    =sanitizeEraProgress(levelProgress.ai);
  levelProgress.cowork=sanitizeEraProgress(levelProgress.cowork);
  levelProgress.code  =sanitizeEraProgress(levelProgress.code);
}
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
let bagOpen=false; // 對戰背包道具選單是否展開
let settingsOpen=false; // 設定面板是否開啟
let deviceMode=localStorage.getItem('deviceMode')||'pc'; // 'pc' | 'mobile'（先做 UI，實際功能後續）

// ── 戰鬥動畫系統 ──────────────────────────────
let battleAnimations=[]; // 正在進行的動畫
let playerAttackFrame=0; // 我方揮刀幀數
let enemyShakeFrame=0; // 敵方晃動幀數
let damageDisplays=[]; // 傷害顯示 [{x,y,damage,timer}]
let battleArrows=[]; // 對戰背景飛箭
// 各陣營獨立的隨機發射排程（隨機間隔、隨機爆發支數）
let arrowSched={
  enemy:{cd:30+Math.floor(Math.random()*120), burst:0, burstCd:0},
  player:{cd:30+Math.floor(Math.random()*120), burst:0, burstCd:0},
};

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
  AudioManager.onUserGesture();   // 首次互動解鎖背景音樂自動播放
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
    // 時代場景：左側傳送門（靠近 x=200）或右側城堡（圖片版主城對齊大門：江戶 860、三國 900、騎士 1000）
    const castleX=scene==='edo'?860:scene==='three-kingdom'?880:880;
    const distToPortal=Math.abs(PL.x-200);
    const distToCastle=Math.abs(PL.x-castleX);

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
  AudioManager.onUserGesture();   // 首次互動解鎖背景音樂自動播放
  if(!showIntro && scene!=='ending'){ if(handleSettingsTap(cx,cy)) return; }
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
    // 選項點擊（與 battleOptGeo() 繪製幾何完全同步）
    if(!questionAnswered&&currentQuestion){
      const L=battleOptGeo();
      for(let i=0;i<Math.min(currentQuestion.options.length, 4);i++){
        const ox=L.optX0+i*(L.perOptW+L.gap);
        if(cx>=ox&&cx<ox+L.perOptW&&cy>=L.optY&&cy<L.optY+L.optH){
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
    // 背包按鈕 + 道具選單（與 drawInventoryBar 幾何同步）
    {
      const g=bagGeo();
      // 點背包按鈕 → 展開/收起選單
      if(cx>=g.bagX&&cx<g.bagX+g.size&&cy>=g.bagY&&cy<g.bagY+g.size){
        bagOpen=!bagOpen;
        return;
      }
      // 選單展開時，點道具格 → 使用該道具
      if(bagOpen){
        const items=[
          {key:'noodle', heal:15},
          {key:'fish', heal:30},
          {key:'tempura', heal:50},
        ];
        for(let i=0;i<items.length;i++){
          const sx=g.bagX-(i+1)*(g.size+g.gap), sy=g.bagY;
          if(cx>=sx&&cx<sx+g.size&&cy>=sy&&cy<sy+g.size){
            useItem(items[i].key, items[i].heal);
            return;
          }
        }
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
        if(curProg().unlockedLevels[i]){
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
        levelProgress=freshLevelProgress();
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
  // 主城背包鈕（點開/收起，不需靠近建築；點選單格不消耗、僅攔截避免誤觸走動）
  if(scene==='main'){
    const g=bagGeo();
    if(cx>=g.bagX&&cx<g.bagX+g.size&&cy>=g.bagY&&cy<g.bagY+g.size){ bagOpen=!bagOpen; return; }
    if(bagOpen){
      for(let i=1;i<=4;i++){ const sx=g.bagX-i*(g.size+g.gap);
        if(cx>=sx&&cx<sx+g.size&&cy>=g.bagY&&cy<g.bagY+g.size) return; }
    }
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
    bagOpen=false; // 每場對戰背包預設收起
    battleArrows=[]; // 清空背景飛箭並重置發射排程
    arrowSched={ enemy:{cd:20+Math.floor(Math.random()*100),burst:0,burstCd:0},
                 player:{cd:20+Math.floor(Math.random()*100),burst:0,burstCd:0} };
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

  const prog=curProg(); // 當前時代的進度
  if(starCount>prog.maxStars[currentStage.stageId-1]){
    prog.maxStars[currentStage.stageId-1]=starCount;
  }

  if(currentStage.stageId<30){
    prog.unlockedLevels[currentStage.stageId]=true;
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

    // 右側城堡標籤（圖片版主城對齊大門：江戶 860、三國 900、騎士 1000）
    const castleX=scene==='edo'?860:scene==='three-kingdom'?880:880;
    const distToCastle=Math.abs(PL.x-castleX);
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
    const prog=levelProgress[currentEra]||levelProgress.ai;
    const unlocked=prog.unlockedLevels[i];
    const maxStar=prog.maxStars[i];
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
  drawSettingsUI();
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

  // 對話框（已移除頭像框，置中顯示）
  const speaker=teachingPhase===1?'隨從':'真田幸村';
  const dialogW=820, dialogH=290;
  const dialogX=(DESIGN_W-dialogW)/2, dialogY=64;

  // 對話框背景（深綠色）
  ctx.fillStyle='rgba(18, 34, 28, 0.86)';
  ctx.fillRect(dialogX, dialogY, dialogW, dialogH);

  // 對話框金色邊框（直線長方形）
  ctx.strokeStyle='#D4AF37';
  ctx.lineWidth=3;
  ctx.strokeRect(dialogX, dialogY, dialogW, dialogH);

  // 發言者名稱（金色、放大）
  ctx.fillStyle='#ffe08b';
  ctx.font='bold 19px DotGothic16';
  ctx.textAlign='left';
  ctx.fillText(speaker, dialogX+22, dialogY+34);
  ctx.strokeStyle='#D4AF37'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(dialogX+22, dialogY+42); ctx.lineTo(dialogX+dialogW-22, dialogY+42); ctx.stroke();

  // 對話內容（淺色、放大，與深底高對比）
  ctx.fillStyle='#f6efdd';
  ctx.font='17px DotGothic16';
  const dialogText=teachingPhase===1?currentStage.teachingDialogue:'知道了，出發吧';
  const lines=dialogText.match(/.{1,44}/g)||[];
  let ty=dialogY+66;
  for(const line of lines.slice(0,8)){
    if(ty>dialogY+dialogH-24) break;
    ctx.fillText(line, dialogX+22, ty);
    ty+=26;
  }

  // 提示文字（按E或點擊繼續）
  ctx.fillStyle='#cfc8b8';
  ctx.font='13px DotGothic16';
  ctx.textAlign='right';
  ctx.fillText('按E或點擊繼續', dialogX+dialogW-22, dialogY+dialogH-12);

  drawSettingsUI();
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

// 閃爍星空（重用全域 stars，與其他場景一致）；clipY 以下不繪製（避免畫到題目框）
function drawTwinkleStars(clipY){
  const cap=clipY||DESIGN_H;
  for(const s of stars){
    s.phase+=s.speed;
    s.x=s.bx+Math.sin(s.phase*.31)*1.4;
    s.y=s.by+Math.cos(s.phase*.19)*.7;
    if(s.y>=cap) continue;
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
const ARROW_SPEED=4; // 像素/幀（越小越慢）
function spawnBattleArrow(sx,sy,tx,ty,color){
  const dist=Math.hypot(tx-sx,ty-sy)||1;
  battleArrows.push({sx,sy,tx,ty,t:0,speed:ARROW_SPEED/dist,arc:34+Math.random()*30,color});
}
function arrowPos(a,t){
  return {
    x:a.sx+(a.tx-a.sx)*t,
    y:a.sy+(a.ty-a.sy)*t-a.arc*Math.sin(Math.PI*t), // 弧線：中段最高
  };
}
const rrange=r=>r[0]+Math.random()*(r[1]-r[0]);

// 單一陣營的隨機發射排程：隨機間隔觸發一輪，一輪隨機 1~3 支，支與支間隔隨機
function tickArrowFaction(s, fire){
  if(s.burst>0){
    if(--s.burstCd<=0){ fire(); s.burst--; s.burstCd=5+Math.floor(Math.random()*12); }
  } else if(--s.cd<=0){
    s.burst=1+Math.floor(Math.random()*3);      // 本輪 1~3 支
    s.burstCd=0;
    s.cd=40+Math.floor(Math.random()*150);       // 下一輪間隔 ~0.7~3.2 秒
  }
}

// 更新雙方背景飛箭：從各自螢幕邊緣（士兵後方）射向對面
// L = {enemy:{ox,oy,tx,ty}, player:{ox,oy,tx,ty}}，每項為 [min,max] 範圍
function updateBattleArrows(L){
  tickArrowFaction(arrowSched.enemy, ()=>
    spawnBattleArrow(rrange(L.enemy.ox),rrange(L.enemy.oy),rrange(L.enemy.tx),rrange(L.enemy.ty),'#ffcf6b'));
  tickArrowFaction(arrowSched.player, ()=>
    spawnBattleArrow(rrange(L.player.ox),rrange(L.player.oy),rrange(L.player.tx),rrange(L.player.ty),'#aee4ff'));
  for(let i=battleArrows.length-1;i>=0;i--){
    battleArrows[i].t+=battleArrows[i].speed;
    if(battleArrows[i].t>=1) battleArrows.splice(i,1);
  }
}

// 繪製某陣營後方的一排士兵（弓兵）
function drawBattleSoldiers(xs, feetY, s, facing, isPlayer){
  for(const x of xs){
    ctx.save(); ctx.scale(s,s);
    if(isPlayer) drawPlayer(x/s, feetY/s, facing, 0);
    else drawWarrior(x/s, feetY/s, facing, 'stand');
    ctx.restore();
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
  const g=ctx.createLinearGradient(0,0,0,BATTLE_GY);
  g.addColorStop(0,col.bgMain);
  g.addColorStop(1,col.bgSub);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,DESIGN_W,BATTLE_GY);

  // 星空（隨機閃爍，只畫在地面線以上）
  drawTwinkleStars(BATTLE_GY);

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

  // 後方士兵（弓兵）：敵方在左、我方在右
  drawBattleSoldiers([120,215,310], BATTLE_GY, 2, 1, false);                                  // 敵方士兵（朝右）
  drawBattleSoldiers([DESIGN_W-120,DESIGN_W-215,DESIGN_W-310], BATTLE_GY, 2, -1, true);       // 我方士兵（朝左）

  // 敵人角色（放大3倍，往中間移動）- 添加晃動效果
  ctx.save();
  ctx.scale(3, 3);
  const enemyShake=enemyShakeFrame>0?Math.sin(enemyShakeFrame*0.5)*3:0;
  drawWarrior(430/3+enemyShake/3, BATTLE_GY/3, 1, 'stand');
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

  // 幸村角色（放大，往中間移動）- 添加揮刀效果
  ctx.save();
  ctx.scale(3, 3);
  const playerShake=playerAttackFrame>0?Math.sin(playerAttackFrame*0.5)*2:0;
  const playerAngle=playerAttackFrame>0?(15-playerAttackFrame)*0.2:0; // 揮刀角度
  ctx.translate((DESIGN_W-430)/3+playerShake/3, BATTLE_GY/3);
  ctx.rotate(playerAngle*Math.PI/180);
  ctx.translate(-((DESIGN_W-430)/3+playerShake/3), -BATTLE_GY/3);
  drawPlayer((DESIGN_W-430)/3+playerShake/3, BATTLE_GY/3, -1, 0);
  ctx.restore();

  // 雙方背景飛箭（從螢幕邊緣的後方士兵射向對面）
  updateBattleArrows({
    enemy:{ ox:[15,140], oy:[BATTLE_GY-60,BATTLE_GY-35], tx:[850,1160], ty:[BATTLE_GY-85,BATTLE_GY-30] },
    player:{ ox:[DESIGN_W-140,DESIGN_W-15], oy:[BATTLE_GY-60,BATTLE_GY-35], tx:[120,430], ty:[BATTLE_GY-85,BATTLE_GY-30] },
  });
  drawBattleArrows();

  // 題目區域（下方大區塊，放大）
  if(currentQuestion){
    const L=battleOptGeo();
    // 半透明紅色底色 + 金色邊框
    ctx.fillStyle='rgba(242, 47, 70, 0.32)';
    ctx.fillRect(L.qX, L.qY, L.qW, L.qH);
    ctx.strokeStyle='#fcc539';
    ctx.lineWidth=3;
    ctx.strokeRect(L.qX, L.qY, L.qW, L.qH);

    // 題目文字（放大、多行）
    ctx.fillStyle='#ffffff';
    ctx.textAlign='left';
    ctx.font='bold 22px DotGothic16';
    const maxChars=Math.floor((L.qW-44)/22);
    const qt=currentQuestion.question;
    let qty=L.qY+40;
    for(let i=0;i<qt.length && qty<L.optY-14;i+=maxChars){
      ctx.fillText(qt.slice(i,i+maxChars), L.qX+22, qty);
      qty+=30;
    }

    // 選項（一行四個，放大；選擇題與填空題共用）
    drawBattleOptions(currentQuestion.options);
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
    const feedbackX=DESIGN_W/2, feedbackY=120;
    if(answerCorrect){
      ctx.fillStyle='#00ff00';
      ctx.font='bold 32px DotGothic16';
      ctx.textAlign='center';
      ctx.fillText('✓ 正確！', feedbackX, feedbackY);
    } else {
      ctx.fillStyle='#ff0000';
      ctx.font='bold 32px DotGothic16';
      ctx.textAlign='center';
      ctx.fillText('✗ 答錯了！', feedbackX, feedbackY);
    }

    // 顯示題目解釋（對錯都顯示，放大）
    ctx.font='17px DotGothic16';
    ctx.fillStyle='#ffffdd';
    ctx.textAlign='center';
    const expLines=currentQuestion.explanation.match(/.{1,40}/g)||[];
    let expY=feedbackY+44;
    for(const line of expLines.slice(0,4)){
      ctx.fillText(line, feedbackX, expY);
      expY+=26;
    }

    // 如果是答錯，顯示正確答案
    if(!answerCorrect){
      ctx.fillStyle='#ffff00';
      ctx.font='bold 17px DotGothic16';
      expY+=6;
      ctx.fillText(`正確答案：${currentQuestion.answer}`, feedbackX, expY);
    }

    // 提示玩家點擊繼續
    ctx.fillStyle='#cccccc';
    ctx.font='14px DotGothic16';
    ctx.fillText('(點擊螢幕繼續)', feedbackX, BATTLE_GY-16);
  }

  // 道具欄（右中處）
  drawInventoryBar();

  // 撤退確認對話框
  if(showRetractConfirm){
    drawRetractConfirmDialog();
  }

  drawSettingsUI();
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

  // 後方士兵（弓兵）：敵方在左、我方在右
  const pFeet=155;
  drawBattleSoldiers([110,200,290], pFeet, 1.4, 1, false);                               // 敵方士兵（朝右）
  drawBattleSoldiers([DESIGN_W-110,DESIGN_W-200,DESIGN_W-290], pFeet, 1.4, -1, true);    // 我方士兵（朝左）

  // 敵人角色（放大2倍，往中間移動） - 添加晃動效果
  ctx.save();
  ctx.scale(2, 2);
  const enemyShakePortrait=enemyShakeFrame>0?Math.sin(enemyShakeFrame*0.5)*2:0;
  drawWarrior(430/2+enemyShakePortrait/2, pFeet/2, 1, 'stand');
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

  // 幸村角色（放大2倍，往中間移動） - 添加揮刀效果
  ctx.save();
  ctx.scale(2, 2);
  const playerShakePortrait=playerAttackFrame>0?Math.sin(playerAttackFrame*0.5)*1.5:0;
  const playerAnglePortrait=playerAttackFrame>0?(15-playerAttackFrame)*0.15:0;
  ctx.translate((DESIGN_W-430)/2+playerShakePortrait/2, pFeet/2);
  ctx.rotate(playerAnglePortrait*Math.PI/180);
  ctx.translate(-((DESIGN_W-430)/2+playerShakePortrait/2), -pFeet/2);
  drawPlayer((DESIGN_W-430)/2+playerShakePortrait/2, pFeet/2, -1, 0);
  ctx.restore();

  // 雙方背景飛箭（從螢幕邊緣的後方士兵射向對面）
  updateBattleArrows({
    enemy:{ ox:[10,120], oy:[120,pFeet], tx:[850,1150], ty:[110,pFeet] },
    player:{ ox:[DESIGN_W-120,DESIGN_W-10], oy:[120,pFeet], tx:[130,430], ty:[110,pFeet] },
  });
  drawBattleArrows();

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

  drawSettingsUI();
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

  drawSettingsUI();
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
// 對戰題目框/選項的共用幾何（繪製與點擊判定都用這個，確保同步）
function battleOptGeo(){
  const qX=60, qW=DESIGN_W-120;
  const qY=BATTLE_GY+16, qH=DESIGN_H-qY-16;
  const padX=20, gap=14, optH=64;
  const perOptW=(qW-padX*2-gap*3)/4;
  const optX0=qX+padX;
  const optY=qY+qH-optH-20;
  return {qX,qW,qY,qH,optX0,perOptW,gap,optH,optY,padX};
}

// 在指定方框內置中、自動換行繪製文字（CJK 友善）
function drawCenteredWrapped(text, cx, boxY, boxH, maxW, fontPx){
  ctx.font='bold '+fontPx+'px DotGothic16';
  const maxChars=Math.max(3, Math.floor(maxW/fontPx));
  const lines=[];
  for(let i=0;i<text.length;i+=maxChars) lines.push(text.slice(i,i+maxChars));
  const shown=lines.slice(0,3);
  const lh=fontPx+4;
  let ty=boxY+boxH/2-(shown.length-1)*lh/2+fontPx*0.36;
  for(const ln of shown){ ctx.fillText(ln, cx, ty); ty+=lh; }
}

// 一行四個的選項（選擇題與填空題共用）
function drawBattleOptions(options){
  const L=battleOptGeo();
  ctx.textAlign='center';
  for(let i=0;i<Math.min(options.length, 4);i++){
    const ox=L.optX0+i*(L.perOptW+L.gap);
    ctx.fillStyle=selectedAnswer===i?'#f22f46':'#e8e8e8';
    ctx.fillRect(ox, L.optY, L.perOptW, L.optH);
    ctx.strokeStyle='#000000';
    ctx.lineWidth=1;
    ctx.strokeRect(ox, L.optY, L.perOptW, L.optH);
    ctx.fillStyle=selectedAnswer===i?'#ffffff':'#000000';
    drawCenteredWrapped(options[i], ox+L.perOptW/2, L.optY, L.optH, L.perOptW-14, 16);
  }
}

// ── 背包 HUD（主畫面右上角，背包鈕＋展開選單：3道具格＋1銅幣格）──
function drawInventoryHUD(){
  const g=bagGeo();
  const items=[
    {icon:'🍜', key:'noodle'},
    {icon:'🐟', key:'fish'},
    {icon:'🍱', key:'tempura'},
  ];
  if(bagOpen){
    // 三格道具
    for(let i=0;i<items.length;i++){
      const sx=g.bagX-(i+1)*(g.size+g.gap);
      drawItemCell(sx, g.bagY, g.size, items[i]);
    }
    // 多一格銅幣
    drawCoinCell(g.bagX-4*(g.size+g.gap), g.bagY, g.size);
  }
  drawBagButton(g);
}

function useItem(key, heal){
  if(scene!=='battle') return;            // 僅對戰中可消耗道具，避免誤觸
  if(!inventory[key]||inventory[key]<=0) return;
  const newHP=Math.min(playerHP+heal, maxHP);
  inventory[key]--;
  playerHP=newHP;
  saveProgress();
}

// 背包按鈕幾何（繪製與點擊共用；主畫面置頂右，對戰置中右）
function bagGeo(){
  const size=54, gap=8, margin=14;
  const bagX=DESIGN_W-size-margin;
  const bagY = scene==='main' ? 12 : (isPortrait?300:112);
  return {size, gap, margin, bagX, bagY};
}

// 背包按鈕本體（方形 🎒）
function drawBagButton(g){
  ctx.fillStyle='rgba(20,16,28,0.82)';
  ctx.fillRect(g.bagX, g.bagY, g.size, g.size);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth= bagOpen?3:2;
  ctx.strokeRect(g.bagX, g.bagY, g.size, g.size);
  ctx.fillStyle='#ffffff'; ctx.font='28px Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🎒', g.bagX+g.size/2, g.bagY+g.size/2+1);
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}

// 銅幣方格（主畫面背包多出的一欄）
function drawCoinCell(x,y,size){
  ctx.fillStyle='rgba(252,197,57,0.20)'; ctx.fillRect(x,y,size,size);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=2; ctx.strokeRect(x,y,size,size);
  ctx.font='23px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('💰', x+size/2, y+size/2-6);
  ctx.fillStyle='#ffe08b'; ctx.font='bold 13px DotGothic16';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillText(coins, x+size/2, y+size-6);
  ctx.textAlign='left';
}

// 單一道具方格
function drawItemCell(x,y,size,item){
  const count=inventory[item.key]||0;
  ctx.fillStyle = count>0?'rgba(242,47,70,0.34)':'rgba(40,40,46,0.6)';
  ctx.fillRect(x,y,size,size);
  ctx.strokeStyle = count>0?'#fcc539':'#6a6a6a';
  ctx.lineWidth=2; ctx.strokeRect(x,y,size,size);
  // 道具圖樣（缺貨時變暗）
  ctx.globalAlpha = count>0?1:0.4;
  ctx.font='26px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(item.icon, x+size/2, y+size/2-3);
  ctx.globalAlpha=1; ctx.textBaseline='alphabetic';
  // 右下角數量
  ctx.fillStyle='#ffffff'; ctx.font='bold 13px DotGothic16'; ctx.textAlign='right';
  ctx.fillText('x'+count, x+size-4, y+size-5);
}

function drawInventoryBar(){
  const g=bagGeo();
  const items=[
    {icon:'🍜', key:'noodle'},
    {icon:'🐟', key:'fish'},
    {icon:'🍱', key:'tempura'},
  ];
  // 展開時：自背包按鈕往左延伸三格道具選單
  if(bagOpen){
    for(let i=0;i<items.length;i++){
      const sx=g.bagX-(i+1)*(g.size+g.gap), sy=g.bagY;
      drawItemCell(sx, sy, g.size, items[i]);
    }
  }
  drawBagButton(g);
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
    // 右側宮殿剪影已移除，改用 assets/three-kingdom-castle.png 主城圖
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
    // 右側防禦塔剪影已移除，改用 assets/knight-castle.png 主城圖
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
    // 右側建築群剪影已移除，改用 assets/edo-castle.png 主城圖
  }

  // 繪製地面
  drawEraGround(col);

  // 左側傳送門（返回領地）
  drawEraPortal(200,GROUND_Y-106);

  // 右側時代城堡（底部對齊地面，等比放大；以「底部中心(cx,gY)」為原點縮放→底部仍貼地、置中不變）
  const gY=GROUND_Y, CASTLE_S=1.35;     // 放大倍率（改這個調整三座大小）
  const drawScaled=(fn,cx)=>{ ctx.save(); ctx.translate(cx,gY); ctx.scale(CASTLE_S,CASTLE_S); ctx.translate(-cx,-gY); fn(cx,gY); ctx.restore(); };
  if(sceneName==='three-kingdom'){
    drawScaled(drawThreeKingdomCastle, 880);   // 中心 x=880
  } else if(sceneName==='knight'){
    drawScaled(drawKnightCastle, 880);         // 中心 x=880（左移，原本 1000 太靠右）
  } else {
    drawScaled(drawEdoCastle, 860);            // 中心 x=860
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
  drawSettingsUI();
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
  const C={
    stoneD:'#4a463f', stoneM:'#5e584d', stoneL:'#7c7363', stoneOL:'#2a2722',
    wall:'#6b4636', wallHi:'#8a5d45', wallSh:'#4e3327', wallOL:'#321f16',
    col:'#9c2b20', colHi:'#c24437', colSh:'#6e1d15', beam:'#7a2018',
    roofD:'#28332f', roofM:'#3a4a44', roofHi:'#566a62', roofEave:'#161d1a', roofSh:'#1a2320',
    gold:'#d4a830', goldL:'#f2d564',
    banner:'#b9302a', bannerD:'#8f201c', bannerGold:'#e8c45a',
    lan:'#d23a2a', lanHi:'#f06a4a',
    win:'#16110c', door:'#241208',
  };
  const R=Math.round;
  const baseTop=y-58;            // 石牆頂
  const bandTop=baseTop-26;      // 牆身頂

  function stoneBase(botW,topW){
    const h=y-baseTop;
    for(let i=0;i<h;i++){const t=i/h, w=botW-(botW-topW)*t;
      ctx.fillStyle=i<2?C.stoneOL:(i%6<3?C.stoneD:C.stoneM); ctx.fillRect(R(x-w/2),baseTop+i,R(w),1);}
    ctx.fillStyle=C.stoneOL;
    for(let ry=baseTop+6;ry<y;ry+=10){const t=(ry-baseTop)/h,w=botW-(botW-topW)*t;
      ctx.fillRect(R(x-w/2),ry,R(w),1);
      const off=((ry-baseTop)/10|0)%2?14:0;
      for(let sx=R(x-w/2)+off;sx<x+w/2;sx+=28) ctx.fillRect(sx,ry-10<baseTop?baseTop:ry-10,1,11);}
    ctx.fillStyle=C.stoneL; ctx.fillRect(R(x-topW/2),baseTop,R(topW),2);
  }

  // 中式飛簷瓦頂（大翹角 + 脊飾）
  function roof(cx,eaveY,eaveW,h){
    const topW=Math.max(8,eaveW*0.24);
    for(let i=0;i<h;i++){const rw=eaveW-(eaveW-topW)*(i/h);const L=R(cx-rw/2),W=R(rw);
      const half=Math.ceil(W*0.55);
      ctx.fillStyle=C.roofM; ctx.fillRect(L,R(eaveY-1-i),half,1);
      ctx.fillStyle=C.roofD; ctx.fillRect(L+half,R(eaveY-1-i),W-half,1);}
    for(let i=0;i<h;i+=2){const rw=eaveW-(eaveW-topW)*(i/h);const L=R(cx-rw/2),W=R(rw);
      ctx.fillStyle=C.roofSh; for(let gx=L+4;gx<L+W-2;gx+=7) ctx.fillRect(gx,R(eaveY-1-i),1,1);}
    // 簷口
    ctx.fillStyle=C.roofEave; ctx.fillRect(R(cx-eaveW/2-3),R(eaveY-1),R(eaveW+6),4);
    ctx.fillStyle=C.roofSh;   ctx.fillRect(R(cx-eaveW/2-3),R(eaveY+3),R(eaveW+6),2);
    // 大翹角（向上外掃）
    for(const sd of [-1,1]){const ex=cx+sd*(eaveW/2);
      ctx.fillStyle=C.roofEave;
      ctx.fillRect(R(ex+sd*0-(sd<0?4:0)),R(eaveY-3),4,3);
      ctx.fillRect(R(ex+sd*4-(sd<0?4:0)),R(eaveY-7),4,4);
      ctx.fillStyle=C.gold; ctx.fillRect(R(ex+sd*6-(sd<0?2:0)),R(eaveY-10),2,2);}
    // 屋脊 + 脊端金飾（鴟吻）
    ctx.fillStyle=C.roofHi; ctx.fillRect(R(cx-topW/2),R(eaveY-h),R(topW),2);
    ctx.fillStyle=C.gold;   ctx.fillRect(R(cx-topW/2-2),R(eaveY-h-3),4,4); ctx.fillRect(R(cx+topW/2-2),R(eaveY-h-3),4,4);
  }

  // 殿身（褐牆 + 紅柱 + 門窗）
  function body(cx,topY,botY,w){
    const L=R(cx-w/2),W=R(w),H=R(botY-topY),T=R(topY);
    ctx.fillStyle=C.wall;   ctx.fillRect(L,T,W,H);
    ctx.fillStyle=C.wallHi; ctx.fillRect(L,T,2,H);
    ctx.fillStyle=C.wallSh; ctx.fillRect(L+W-2,T,2,H);
    const n=w>=130?6:w>=90?5:w>=60?4:3;
    for(let i=0;i<n;i++){const colX=L+i*(W-4)/(n-1);
      ctx.fillStyle=C.col;   ctx.fillRect(R(colX),T,4,H);
      ctx.fillStyle=C.colHi; ctx.fillRect(R(colX),T,1,H);}
    ctx.fillStyle=C.beam; ctx.fillRect(L,T,W,3);                  // 上枋
    ctx.fillStyle=C.gold; ctx.fillRect(L,T+3,W,1);               // 金線
    // 門窗（柱間深色）
    ctx.fillStyle=C.win;
    for(let i=0;i<n-1;i++){const a=L+i*(W-4)/(n-1)+5, b=L+(i+1)*(W-4)/(n-1);
      if(b-a>6) ctx.fillRect(R(a),T+6,R(b-a-4),H-9);}
  }

  // 階梯狀石台（中央高台，含石塊紋理）
  function platform(topW,botW,topY,botY){
    const steps=4, H=botY-topY, sh=H/steps;
    for(let s=0;s<steps;s++){
      const t=s/(steps-1), w=topW+(botW-topW)*t;
      const sy=topY+s*sh, L=R(x-w/2), W=R(w), Y=R(sy), SH=R(sh)+1;
      ctx.fillStyle=C.stoneM; ctx.fillRect(L,Y,W,SH);                       // 主體
      // 石塊紋（水平縫 + 交錯直縫）
      ctx.fillStyle=C.stoneOL;
      for(let ry=Y+6; ry<sy+sh; ry+=6){
        ctx.fillRect(L,ry,W,1);
        const off=((ry-Y)/6|0)%2?14:0;
        for(let sx=L+off; sx<L+W; sx+=28) ctx.fillRect(sx, ry-6<Y?Y:ry-6, 1, 7);
      }
      ctx.fillStyle=C.stoneL;  ctx.fillRect(L,Y,W,2);                       // 頂面受光
      ctx.fillStyle=C.stoneD;  ctx.fillRect(L,Y,2,SH);                      // 左側暗
      ctx.fillStyle=C.stoneOL; ctx.fillRect(L+W-2,Y,2,SH);                  // 右側暗
      ctx.fillStyle=C.stoneOL; ctx.fillRect(L,Y+SH-1,W,1);                  // 前緣陰影
    }
  }

  // 多層樓閣
  function pagoda(cx,baseBot){
    let cy=baseBot;
    const tiers=[{w:150,h:30,ew:182,rh:22},{w:120,h:27,ew:150,rh:20},
                 {w:92,h:25,ew:118,rh:18},{w:64,h:24,ew:88,rh:16}];
    for(const t of tiers){const wt=cy-t.h; body(cx,wt,cy,t.w); roof(cx,wt,t.ew,t.rh); cy=wt-R(t.rh*0.5);}
    ctx.fillStyle=C.gold;  ctx.fillRect(R(cx-2),R(cy-12),4,14);   // 頂剎
    ctx.fillStyle=C.goldL; ctx.fillRect(R(cx-3),R(cy-15),6,3);
  }

  // 角樓（2層）
  function pavilion(cx,baseBot){
    let cy=baseBot;
    const tiers=[{w:64,h:28,ew:84,rh:18},{w:42,h:20,ew:60,rh:14}];
    for(const t of tiers){const wt=cy-t.h; body(cx,wt,cy,t.w); roof(cx,wt,t.ew,t.rh); cy=wt-R(t.rh*0.5);}
  }

  // 紅旗（直幟）
  function banner(bx,topY,h){
    ctx.fillStyle=C.bannerGold; ctx.fillRect(R(bx-5),R(topY),10,2);     // 橫桿
    ctx.fillStyle=C.banner;     ctx.fillRect(R(bx-4),R(topY+2),8,h);
    ctx.fillStyle=C.bannerD;    ctx.fillRect(R(bx+1),R(topY+2),3,h);
    ctx.fillStyle=C.bannerGold; ctx.fillRect(R(bx-1),R(topY+4),2,2);    // 徽
    ctx.fillStyle=C.bannerD;    ctx.fillRect(R(bx-4),R(topY+2+h),3,3); ctx.fillRect(R(bx+1),R(topY+2+h),3,3); // 燕尾
  }

  // 紅燈籠（圓）
  function lantern(lx,topY){
    ctx.fillStyle=C.gold;  ctx.fillRect(R(lx-1),R(topY),2,3);
    ctx.fillStyle='#ff885555'; ctx.fillRect(R(lx-7),R(topY+2),14,13);
    ctx.fillStyle=C.lan;   ctx.fillRect(R(lx-5),R(topY+3),10,10);
    ctx.fillStyle=C.lanHi; ctx.fillRect(R(lx-5),R(topY+3),3,10);
    ctx.fillStyle=C.gold;  ctx.fillRect(R(lx-5),R(topY+3),10,1); ctx.fillRect(R(lx-5),R(topY+12),10,1);
    ctx.fillStyle=C.bannerGold; ctx.fillRect(R(lx-1),R(topY+13),2,3);
  }

  // 城門 + 匾額 + 石階
  function gate(cx,baseBot){
    const gw=74, gtop=bandTop-10, totalH=y-baseBot;
    ctx.fillStyle=C.wall;   ctx.fillRect(R(cx-gw/2),R(gtop),gw,baseBot-gtop);
    ctx.fillStyle=C.wallSh; ctx.fillRect(R(cx+gw/2-2),R(gtop),2,baseBot-gtop);
    ctx.fillStyle=C.col;    ctx.fillRect(R(cx-gw/2),R(gtop),4,baseBot-gtop); ctx.fillRect(R(cx+gw/2-4),R(gtop),4,baseBot-gtop);
    // 匾額
    ctx.fillStyle=C.gold;  ctx.fillRect(R(cx-15),R(gtop+5),30,9);
    ctx.fillStyle=C.door;  ctx.fillRect(R(cx-13),R(gtop+7),26,5);
    // 門洞 + 紅門
    const dh=30;
    ctx.fillStyle='#0c0a08'; ctx.fillRect(R(cx-18),R(baseBot-dh),36,dh);
    ctx.fillStyle='#7a1a14'; ctx.fillRect(R(cx-17),R(baseBot-dh),17,dh); ctx.fillRect(R(cx),R(baseBot-dh),17,dh);
    ctx.fillStyle=C.colSh;   ctx.fillRect(R(cx-1),R(baseBot-dh),2,dh);
    ctx.fillStyle=C.gold; for(let dy=baseBot-dh+5;dy<baseBot-4;dy+=8){ctx.fillRect(R(cx-11),R(dy),2,2);ctx.fillRect(R(cx+9),R(dy),2,2);}
    roof(cx,gtop,gw+16,16);
    // 石階
    const steps=5;
    for(let s=0;s<steps;s++){const sw=46+s*13, sy=baseBot+s*(totalH/steps), sh=totalH/steps+1;
      ctx.fillStyle=C.stoneM; ctx.fillRect(R(cx-sw/2),R(sy),R(sw),R(sh));
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(cx-sw/2),R(sy),R(sw),2);
      ctx.fillStyle=C.stoneOL;ctx.fillRect(R(cx-sw/2),R(sy+sh-1),R(sw),1);
      for(let gx=R(cx-sw/2)+13;gx<cx+sw/2-7;gx+=16) ctx.fillRect(gx,R(sy)+2,1,R(sh)-3);}
    const bw=46+(steps-1)*13;
    for(const sd of[-1,1]){const ex=cx+sd*(bw/2+3);
      ctx.fillStyle=C.stoneD; ctx.fillRect(R(ex-3),R(baseBot),6,R(totalH));
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(ex-3),R(baseBot),6,2);}
    lantern(cx-bw/2-14,baseBot-2); lantern(cx+bw/2+8,baseBot-2);
  }

  // ═══ 繪製順序 ═══
  stoneBase(580,512);
  // 牆身（柱列）
  body(x, bandTop, baseTop, 496);
  // 中央高台 + 樓閣
  platform(190,300, baseTop-92, baseTop);
  pagoda(x, baseTop-92);
  // 側殿（中層矮殿）
  body(x-150, baseTop-44, baseTop, 96); roof(x-150, baseTop-44, 122, 18);
  body(x+150, baseTop-44, baseTop, 96); roof(x+150, baseTop-44, 122, 18);
  // 角樓
  pavilion(x-218, baseTop); pavilion(x+218, baseTop);
  // 旗幟（角樓旁）
  banner(x-180, bandTop-34, 30); banner(x+180, bandTop-34, 30);
  // 燈籠（牆上等距）
  for(const lx of [x-110,x+110]) lantern(lx, bandTop-2);
  // 城門
  gate(x, baseTop);
}

function drawKnightCastle(x,y){
  const C={
    stoneD:'#4c4a52', stoneM:'#636069', stoneL:'#888591', stoneOL:'#2a2830',
    rRed:{m:'#b23a2c',d:'#7e2218',hi:'#d65e46',eave:'#541410'},
    rBlue:{m:'#3f5bb0',d:'#283c80',hi:'#6280da',eave:'#1a2752'},
    blade:'#b4c0cc', bladeHi:'#e6eef4', bladeBlue:'#8ea0ba', bladeD:'#6c7884', fuller:'#525e6c',
    gold:'#d8af3c', goldL:'#f4d878', goldD:'#9a7620',
    grip:'#3a2418', gripWrap:'#7a5230',
    red:'#b9302a', redD:'#8f201c', blue:'#3552a8', blueD:'#223878', bannerGold:'#e8c45a',
    wood:'#3a2518', woodL:'#5a3d28', woodOL:'#211309',
    win:'#15110d',
  };
  const R=Math.round;
  const baseTop=y-60;            // 石牆頂

  function stoneBase(botW,topW){
    const h=y-baseTop;
    for(let i=0;i<h;i++){const t=i/h,w=botW-(botW-topW)*t;
      ctx.fillStyle=i<2?C.stoneOL:(i%6<3?C.stoneD:C.stoneM); ctx.fillRect(R(x-w/2),baseTop+i,R(w),1);}
    ctx.fillStyle=C.stoneOL;
    for(let ry=baseTop+6;ry<y;ry+=10){const t=(ry-baseTop)/h,w=botW-(botW-topW)*t;
      ctx.fillRect(R(x-w/2),ry,R(w),1);
      const off=((ry-baseTop)/10|0)%2?14:0;
      for(let sx=R(x-w/2)+off;sx<x+w/2;sx+=28) ctx.fillRect(sx,ry-10<baseTop?baseTop:ry-10,1,11);}
    ctx.fillStyle=C.stoneL; ctx.fillRect(R(x-topW/2),baseTop,R(topW),2);
  }

  // 雉堞（城垛）
  function battlements(left,right,topY){
    for(let mx=left; mx<right-6; mx+=15){
      ctx.fillStyle=C.stoneM; ctx.fillRect(R(mx),R(topY-7),9,7);
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(mx),R(topY-7),9,1);
      ctx.fillStyle=C.stoneD; ctx.fillRect(R(mx+7),R(topY-7),2,7);
    }
  }

  // 石塔身（含箭孔）
  function stoneBox(cx,topY,botY,w){
    const L=R(cx-w/2),W=R(w),T=R(topY),H=R(botY-topY);
    ctx.fillStyle=C.stoneM; ctx.fillRect(L,T,W,H);
    ctx.fillStyle=C.stoneL; ctx.fillRect(L,T,2,H);
    ctx.fillStyle=C.stoneD; ctx.fillRect(L+W-2,T,2,H);
    ctx.fillStyle=C.stoneOL;
    for(let ry=T+7; ry<botY-1; ry+=7){ ctx.fillRect(L,ry,W,1);
      const off=((ry-T)/7|0)%2?R(w/3):0;
      for(let sx=L+off; sx<L+W; sx+=R(w*0.5)+2) ctx.fillRect(sx,ry-7<T?T:ry-7,1,8);}
    ctx.fillStyle=C.win; ctx.fillRect(R(cx-2),T+R(H*0.32),4,R(H*0.36));   // 箭孔
  }

  // 圓錐尖頂（可指定顏色）
  function coneRoof(cx,baseY,w,h,rc){
    for(let i=0;i<h;i++){const rw=w*(1-i/h); const L=R(cx-rw/2),W=Math.max(1,R(rw));
      const half=Math.ceil(W*0.5);
      ctx.fillStyle=rc.m; ctx.fillRect(L,R(baseY-1-i),half,1);
      ctx.fillStyle=rc.d; ctx.fillRect(L+half,R(baseY-1-i),W-half,1);}
    ctx.fillStyle=rc.eave; ctx.fillRect(R(cx-w/2-2),R(baseY-1),R(w)+4,2);
    ctx.fillStyle=rc.hi;   ctx.fillRect(R(cx-1),R(baseY-h),2,3);
  }

  // 三角旗（可指定顏色）
  function pennant(cx,apexY,dir,col){ dir=dir||1;
    ctx.fillStyle=C.gold; ctx.fillRect(R(cx),R(apexY-12),1,13);
    ctx.fillStyle=col;
    for(let i=0;i<9;i++){const len=9-i; ctx.fillRect(dir>0?R(cx+1):R(cx+1-len),R(apexY-11+i),len,1);}
  }

  // 尖塔（石身 + 錐頂 + 旗）
  function tower(cx,baseBot,w,bodyH,roofH,dir,rc,fcol){
    stoneBox(cx,baseBot-bodyH,baseBot,w);
    coneRoof(cx,baseBot-bodyH,w+6,roofH,rc);
    pennant(cx,baseBot-bodyH-roofH+2,dir,fcol);
  }

  // 火把
  function torch(tx,baseY){
    ctx.fillStyle=C.wood; ctx.fillRect(R(tx-1),R(baseY-10),2,10);
    ctx.fillStyle='#ff6a1e55'; ctx.fillRect(R(tx-5),R(baseY-22),10,13);
    ctx.fillStyle='#ff6a1e';   ctx.fillRect(R(tx-2),R(baseY-19),4,9);
    ctx.fillStyle='#ffb43a';   ctx.fillRect(R(tx-1),R(baseY-22),2,8);
    ctx.fillStyle='#ffe89a';   ctx.fillRect(R(tx),R(baseY-21),1,4);
  }

  // 倒插巨劍（中央主塔：劍尖朝下，劍身向下延伸成主塔）
  function sword(cx,tipY,topY){
    const cgY=topY+52;                 // 護手中心
    // 握柄（柄頭→護手）
    ctx.fillStyle=C.grip;     ctx.fillRect(R(cx-6),R(topY+9),12,cgY-7-(topY+9));
    ctx.fillStyle=C.gripWrap; for(let gy=topY+12; gy<cgY-8; gy+=5) ctx.fillRect(R(cx-6),R(gy),12,2);
    // 柄頭（圓）
    ctx.fillStyle=C.gold;  ctx.fillRect(R(cx-8),R(topY+2),16,10); ctx.fillRect(R(cx-10),R(topY+4),20,6);
    ctx.fillStyle=C.goldL; ctx.fillRect(R(cx-7),R(topY+3),6,3);
    ctx.fillStyle=C.goldD; ctx.fillRect(R(cx-10),R(topY+8),20,2);
    // 護手（寬金十字 + 末端球）
    ctx.fillStyle=C.gold;  ctx.fillRect(R(cx-52),R(cgY-7),104,13);
    ctx.fillStyle=C.goldL; ctx.fillRect(R(cx-52),R(cgY-7),104,2);
    ctx.fillStyle=C.goldD; ctx.fillRect(R(cx-52),R(cgY+4),104,2);
    ctx.fillStyle=C.gold;  ctx.fillRect(R(cx-57),R(cgY-5),6,9); ctx.fillRect(R(cx+51),R(cgY-5),6,9);
    ctx.fillStyle=C.goldL; ctx.fillRect(R(cx-56),R(cgY-4),2,3); ctx.fillRect(R(cx+52),R(cgY-4),2,3);
    // 雙旗（紅 / 藍）垂自護手 — 先畫，劍身蓋其上
    function flag(fx,col,colD){const bnTop=cgY+5, bnH=70;
      ctx.fillStyle=col;  ctx.fillRect(R(fx),R(bnTop),22,bnH);
      ctx.fillStyle=colD; ctx.fillRect(R(fx+14),R(bnTop),8,bnH);
      ctx.fillStyle=C.bannerGold; ctx.fillRect(R(fx+7),R(bnTop+16),6,6);
      ctx.fillStyle=colD; ctx.fillRect(R(fx),R(bnTop+bnH),9,4); ctx.fillRect(R(fx+13),R(bnTop+bnH),9,4);}
    flag(cx-48,C.red,C.redD); flag(cx+26,C.blue,C.blueD);
    // 劍身（自護手向下漸尖到 tipY）— 大支
    const bladeTop=cgY+6, bladeLen=tipY-bladeTop, topW=46, tipLen=Math.round(bladeLen*0.18);
    for(let i=0;i<bladeLen-tipLen;i++){const w=topW-(topW-32)*(i/(bladeLen-tipLen));
      const yy=bladeTop+i, L=R(cx-w/2), W=R(w);
      ctx.fillStyle=C.bladeHi;   ctx.fillRect(L,yy,3,1);
      ctx.fillStyle=C.blade;     ctx.fillRect(L+3,yy,W-7,1);
      ctx.fillStyle=C.bladeBlue; ctx.fillRect(L+W-4,yy,2,1);
      ctx.fillStyle=C.bladeD;    ctx.fillRect(L+W-2,yy,2,1);
      ctx.fillStyle=C.fuller;    ctx.fillRect(R(cx-1),yy,2,1);}     // 血槽
    // 劍尖（漸縮成點）
    for(let i=0;i<tipLen;i++){const w=32*(1-i/tipLen); const yy=bladeTop+(bladeLen-tipLen)+i; const L=R(cx-w/2),W=Math.max(1,R(w));
      ctx.fillStyle=C.blade;   ctx.fillRect(L,yy,W,1);
      ctx.fillStyle=C.bladeHi; ctx.fillRect(L,yy,2,1);
      ctx.fillStyle=C.bladeD;  ctx.fillRect(L+W-1,yy,1,1);}
  }

  // 城門（尖拱 + 石階）
  function gate(cx,baseBot){
    const gw=72, totalH=y-baseBot;
    ctx.fillStyle=C.stoneM; ctx.fillRect(R(cx-gw/2),R(baseBot-46),gw,46);
    ctx.fillStyle=C.stoneL; ctx.fillRect(R(cx-gw/2),R(baseBot-46),2,46);
    ctx.fillStyle=C.stoneD; ctx.fillRect(R(cx+gw/2-2),R(baseBot-46),2,46);
    battlements(cx-gw/2+2,cx+gw/2-2,baseBot-46+1);
    // 尖拱門洞
    ctx.fillStyle='#0c0a08';
    ctx.fillRect(R(cx-16),R(baseBot-34),32,34);
    for(let i=0;i<10;i++) ctx.fillRect(R(cx-16+i),R(baseBot-34-i),32-i*2,2);
    // 木門 + 鐵件
    ctx.fillStyle=C.wood; ctx.fillRect(R(cx-13),R(baseBot-28),26,28);
    ctx.fillStyle=C.woodOL; ctx.fillRect(R(cx-1),R(baseBot-28),2,28);
    ctx.fillStyle='#8a8a8a'; for(let dy=baseBot-24;dy<baseBot-4;dy+=7){ctx.fillRect(R(cx-9),R(dy),2,2);ctx.fillRect(R(cx+7),R(dy),2,2);}
    // 石階
    const steps=5;
    for(let s=0;s<steps;s++){const sw=46+s*13, sy=baseBot+s*(totalH/steps), sh=totalH/steps+1;
      ctx.fillStyle=C.stoneM; ctx.fillRect(R(cx-sw/2),R(sy),R(sw),R(sh));
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(cx-sw/2),R(sy),R(sw),2);
      ctx.fillStyle=C.stoneOL;ctx.fillRect(R(cx-sw/2),R(sy+sh-1),R(sw),1);
      for(let gx=R(cx-sw/2)+13;gx<cx+sw/2-7;gx+=16) ctx.fillRect(gx,R(sy)+2,1,R(sh)-3);}
    const bw=46+(steps-1)*13;
    for(const sd of[-1,1]){const ex=cx+sd*(bw/2+3);
      ctx.fillStyle=C.stoneD; ctx.fillRect(R(ex-3),R(baseBot),6,R(totalH));
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(ex-3),R(baseBot),6,2);}
    torch(cx-bw/2-12,baseBot-2); torch(cx+bw/2+12,baseBot-2);
  }

  // 牆上掛旗（紅/藍交錯）
  function wallBanner(bx,topY,col,colD){const h=30;
    ctx.fillStyle=C.gold; ctx.fillRect(R(bx-6),R(topY),12,2);
    ctx.fillStyle=col;  ctx.fillRect(R(bx-5),R(topY+2),10,h);
    ctx.fillStyle=colD; ctx.fillRect(R(bx+1),R(topY+2),4,h);
    ctx.fillStyle=C.bannerGold; ctx.fillRect(R(bx-2),R(topY+10),4,4);
    ctx.fillStyle=colD; ctx.fillRect(R(bx-5),R(topY+2+h),4,3); ctx.fillRect(R(bx+1),R(topY+2+h),4,3);
  }

  // ═══ 繪製順序 ═══
  stoneBase(580,512);
  battlements(x-256+18, x+256-18, baseTop+1);
  // 尖塔群（紅藍交錯，旗色配合）
  tower(x-220, baseTop, 58, 120, 34, -1, C.rBlue, C.blue); tower(x+220, baseTop, 58, 120, 34, 1, C.rBlue, C.blue);
  tower(x-150, baseTop, 46, 140, 30, -1, C.rRed,  C.red);  tower(x+150, baseTop, 46, 140, 30, 1, C.rRed,  C.red);
  tower(x-92,  baseTop, 40, 110, 26, -1, C.rBlue, C.blue); tower(x+92,  baseTop, 40, 110, 26, 1, C.rBlue, C.blue);
  // 牆上掛旗 + 火把
  wallBanner(x-120, baseTop-2, C.red, C.redD); wallBanner(x+120, baseTop-2, C.blue, C.blueD);
  for(const tx of [x-178,x+178]) torch(tx, baseTop-1);
  // 城門
  gate(x, baseTop);
  // 中央倒插巨劍（最前、最高，劍尖插入城門頂）
  sword(x, baseTop-44, baseTop-244);
}

function drawEdoCastle(x,y){
  // 江戶主城（手繪像素風）：石垣台基 + 白牆下見板 + 多層天守 + 角樓 + 城門石階 + 石燈籠
  // (x,y) = 底部中心點，底部對齊地面
  const C={
    stoneD:'#4e4842', stoneM:'#615a50', stoneL:'#827869', stoneOL:'#2c2924',
    plaster:'#ddd8c8', plasterHi:'#efe9da', plasterSh:'#b3ac98', wood:'#3a2518', woodL:'#5a3d28', woodOL:'#211309',
    board:'#2e2620', boardHi:'#473b2d', boardOL:'#1c1610',
    roofD:'#242c35', roofM:'#36424e', roofHi:'#566472', roofEave:'#151a20', roofSh:'#1b2128',
    gold:'#d4a830', goldL:'#f2d564', win:'#101216',
    pine:'#1f5030', pineD:'#143a22', trunk:'#4a2a14',
  };
  const R=Math.round;
  const baseTop=y-56;            // 石垣台基頂
  const bandTop=baseTop-24;      // 白牆頂

  function stoneBase(){
    const botW=560, topW=496, h=y-baseTop;
    for(let i=0;i<h;i++){
      const t=i/h, w=botW-(botW-topW)*t;
      ctx.fillStyle = i<2?C.stoneOL:(i%6<3?C.stoneD:C.stoneM);
      ctx.fillRect(R(x-w/2), baseTop+i, R(w), 1);
    }
    ctx.fillStyle=C.stoneOL;
    for(let ry=baseTop+6; ry<y; ry+=10){
      const t=(ry-baseTop)/h, w=botW-(botW-topW)*t;
      ctx.fillRect(R(x-w/2), ry, R(w), 1);
      const off=((ry-baseTop)/10|0)%2?14:0;
      for(let sx=R(x-w/2)+off; sx<x+w/2; sx+=28) ctx.fillRect(sx, ry-10<baseTop?baseTop:ry-10, 1, 11);
    }
    ctx.fillStyle=C.stoneL; ctx.fillRect(R(x-topW/2), baseTop, R(topW), 2);
  }

  function win(cx,cy,ww,wh){
    ctx.fillStyle=C.wood;  ctx.fillRect(R(cx-ww/2-1),R(cy-1),R(ww)+2,R(wh)+2);
    ctx.fillStyle=C.win;   ctx.fillRect(R(cx-ww/2),R(cy),R(ww),R(wh));
    ctx.fillStyle=C.woodL;
    for(let lx=R(cx-ww/2)+2; lx<cx+ww/2-1; lx+=3) ctx.fillRect(lx,R(cy)+1,1,R(wh)-2);
  }

  function plasterWall(left,right,topY,botY){
    left=R(left);right=R(right);topY=R(topY);botY=R(botY);
    const w=right-left, h=botY-topY;
    ctx.fillStyle=C.plaster;   ctx.fillRect(left,topY,w,h);
    ctx.fillStyle=C.plasterHi; ctx.fillRect(left,topY,2,h);
    ctx.fillStyle=C.plasterSh; ctx.fillRect(right-3,topY,3,h);
    const bH=Math.max(5,Math.round(h*0.36));
    ctx.fillStyle=C.board;   ctx.fillRect(left,botY-bH,w,bH);
    ctx.fillStyle=C.boardHi; ctx.fillRect(left,botY-bH,w,1);
    ctx.fillStyle=C.boardOL; for(let by=botY-bH+3; by<botY; by+=3) ctx.fillRect(left,by,w,1);
    ctx.fillStyle=C.boardOL; ctx.fillRect(right-2,botY-bH,2,bH);
    ctx.fillStyle=C.wood;   ctx.fillRect(left,topY,w,3);
    ctx.fillStyle=C.woodOL; ctx.fillRect(left,topY+3,w,1);
  }

  function roof(cx,eaveY,eaveW,h){
    const topW=Math.max(10,eaveW*0.30);
    for(let i=0;i<h;i++){const rw=eaveW-(eaveW-topW)*(i/h); const L=R(cx-rw/2), W=R(rw);
      const half=Math.ceil(W*0.55);
      ctx.fillStyle=C.roofM; ctx.fillRect(L,R(eaveY-1-i),half,1);
      ctx.fillStyle=C.roofD; ctx.fillRect(L+half,R(eaveY-1-i),W-half,1);
    }
    for(let i=0;i<h;i+=2){const rw=eaveW-(eaveW-topW)*(i/h); const L=R(cx-rw/2), W=R(rw);
      ctx.fillStyle=C.roofSh; for(let gx=L+4; gx<L+W-2; gx+=7) ctx.fillRect(gx,R(eaveY-1-i),1,1);}
    ctx.fillStyle=C.roofHi;   ctx.fillRect(R(cx-topW/2),R(eaveY-h),R(topW),2);
    ctx.fillStyle=C.roofEave; ctx.fillRect(R(cx-eaveW/2-3),R(eaveY-1),R(eaveW+6),4);
    ctx.fillStyle=C.roofSh;   ctx.fillRect(R(cx-eaveW/2-3),R(eaveY+3),R(eaveW+6),2);
    ctx.fillStyle=C.roofEave;
    ctx.fillRect(R(cx-eaveW/2-5),R(eaveY-7),5,7);
    ctx.fillRect(R(cx+eaveW/2),  R(eaveY-7),5,7);
  }

  function plasterBox(cx,topY,botY,w){
    plasterWall(cx-w/2,cx+w/2,topY,botY);
    const wy=topY+7, wh=Math.max(7,Math.round((botY-topY)*0.30));
    if(w>=120){win(cx-40,wy,16,wh);win(cx,wy,16,wh);win(cx+40,wy,16,wh);}
    else if(w>=82){win(cx-24,wy,15,wh);win(cx+24,wy,15,wh);}
    else if(w>=50){win(cx,wy,16,wh);}
    else {win(cx,wy,11,wh);}
  }

  function keep(cx,baseBot){
    let cy=baseBot;
    const tiers=[{ww:152,wh:34,ew:188,rh:26},{ww:124,wh:30,ew:156,rh:22},
                 {ww:96,wh:27,ew:124,rh:19},{ww:70,wh:25,ew:94,rh:17},
                 {ww:48,wh:23,ew:66,rh:15}];
    for(const t of tiers){const wt=cy-t.wh; plasterBox(cx,wt,cy,t.ww); roof(cx,wt,t.ew,t.rh); cy=wt-R(t.rh*0.5);}
    ctx.fillStyle=C.gold;
    ctx.fillRect(R(cx-26),R(cy+2),6,4); ctx.fillRect(R(cx-28),R(cy-2),4,5);
    ctx.fillRect(R(cx+20),R(cy+2),6,4); ctx.fillRect(R(cx+24),R(cy-2),4,5);
    ctx.fillStyle=C.goldL; ctx.fillRect(R(cx-1),R(cy-10),3,12);
  }

  function turret(cx,baseBot){
    let cy=baseBot;
    const tiers=[{ww:56,wh:26,ew:72,rh:16},{ww:36,wh:18,ew:50,rh:12}];
    for(const t of tiers){const wt=cy-t.wh; plasterBox(cx,wt,cy,t.ww); roof(cx,wt,t.ew,t.rh); cy=wt-R(t.rh*0.5);}
  }

  function lantern(lx,baseY,s){ s=s||1;
    ctx.fillStyle=C.stoneD; ctx.fillRect(R(lx-1.5*s),R(baseY-10*s),Math.max(2,R(3*s)),R(10*s));
    ctx.fillStyle=C.stoneM; ctx.fillRect(R(lx-4*s),R(baseY-13*s),R(8*s),R(3*s));
    ctx.fillStyle='#ffcf6a55'; ctx.fillRect(R(lx-5*s),R(baseY-20*s),R(10*s),R(8*s));
    ctx.fillStyle=C.gold;   ctx.fillRect(R(lx-3*s),R(baseY-19*s),R(6*s),R(6*s));
    ctx.fillStyle='#ffe7a0';ctx.fillRect(R(lx-2*s),R(baseY-18*s),R(4*s),R(4*s));
    ctx.fillStyle=C.stoneL; ctx.fillRect(R(lx-5*s),R(baseY-23*s),R(10*s),R(4*s));
    ctx.fillStyle=C.stoneD; ctx.fillRect(R(lx-1.5*s),R(baseY-26*s),Math.max(2,R(3*s)),R(3*s));
  }

  function gate(cx,baseBot){
    const gw=68, gtop=bandTop-8, totalH=y-baseBot;
    ctx.fillStyle=C.wood;   ctx.fillRect(R(cx-gw/2),R(gtop),gw,baseBot-gtop);
    ctx.fillStyle=C.woodL;  ctx.fillRect(R(cx-gw/2),R(gtop),3,baseBot-gtop);
    ctx.fillStyle=C.woodOL; ctx.fillRect(R(cx-gw/2),R(gtop),2,baseBot-gtop);
    ctx.fillStyle=C.woodOL; ctx.fillRect(R(cx+gw/2-3),R(gtop),3,baseBot-gtop);
    const dh=28;
    ctx.fillStyle='#0c0a08'; ctx.fillRect(R(cx-17),R(baseBot-dh),34,dh);
    ctx.fillStyle='#23150b'; ctx.fillRect(R(cx-16),R(baseBot-dh),16,dh); ctx.fillRect(R(cx),R(baseBot-dh),16,dh);
    ctx.fillStyle=C.woodOL;  ctx.fillRect(R(cx-1),R(baseBot-dh),2,dh);
    ctx.fillStyle=C.gold; for(let dy=baseBot-dh+5; dy<baseBot-4; dy+=8){ctx.fillRect(R(cx-11),R(dy),2,2);ctx.fillRect(R(cx+9),R(dy),2,2);}
    roof(cx,gtop,gw+16,16);
    const steps=5;
    for(let s=0;s<steps;s++){
      const sw=42+s*13, sy=baseBot+s*(totalH/steps), sh=totalH/steps+1;
      ctx.fillStyle=C.stoneM; ctx.fillRect(R(cx-sw/2),R(sy),R(sw),R(sh));
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(cx-sw/2),R(sy),R(sw),2);
      ctx.fillStyle=C.stoneOL;ctx.fillRect(R(cx-sw/2),R(sy+sh-1),R(sw),1);
      for(let gx=R(cx-sw/2)+13; gx<cx+sw/2-7; gx+=16) ctx.fillRect(gx,R(sy)+2,1,R(sh)-3);
    }
    const bw=42+(steps-1)*13;
    for(const sd of [-1,1]){const ex=cx+sd*(bw/2+3);
      ctx.fillStyle=C.stoneD; ctx.fillRect(R(ex-3),R(baseBot),6,R(totalH));
      ctx.fillStyle=C.stoneL; ctx.fillRect(R(ex-3),R(baseBot),6,2);
    }
    lantern(cx-bw/2-12, y, 1); lantern(cx+bw/2+12, y, 1);
  }

  function pine(px,py,s){
    ctx.fillStyle=C.trunk; ctx.fillRect(R(px-1),R(py),3,R(10*s));
    ctx.fillStyle=C.pineD; ctx.fillRect(R(px-10*s),R(py-6*s),R(20*s),R(8*s));
    ctx.fillStyle=C.pine;  ctx.fillRect(R(px-8*s),R(py-12*s),R(16*s),R(8*s));
    ctx.fillRect(R(px-5*s),R(py-17*s),R(10*s),R(7*s));
  }

  // ═══ 繪製順序 ═══
  stoneBase();
  plasterWall(x-248+30, x+248-30, bandTop, baseTop);
  for(let wx=x-248+44; wx<x+248-40; wx+=30){ if(Math.abs(wx-x)<40) continue; win(wx, bandTop+6, 12, 7); }
  pine(x-150, baseTop, 1.3); pine(x+150, baseTop, 1.3);
  keep(x, baseTop-2);
  turret(x-208, baseTop); turret(x+208, baseTop);
  for(const lx of [x-150,x-100,x+100,x+150]) lantern(lx, bandTop, 0.7);
  gate(x, baseTop);
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
  // 舊版「三時代共用進度」格式不相容 → 整份視為失效，全部重置（保留是否看過開場與音樂設定）
  if(!isNewProgressFormat(data.levelProgress)){
    coins=0;
    inventory={noodle:0,fish:0,tempura:0};
    gems=[false,false,false];
    flagsPlanted={ai:false, cowork:false, code:false};
    levelProgress=freshLevelProgress();
    musicEnabled=data.musicEnabled!==false;
    showIntro=!data.introShown;
    sanitizeLevelProgress();
    return;
  }
  coins=data.coins||0;
  inventory=data.inventory||{noodle:0,fish:0,tempura:0};
  levelProgress=data.levelProgress;
  gems=data.gems||[false,false,false];
  flagsPlanted=data.flagsPlanted||{ai:false, cowork:false, code:false};
  musicEnabled=data.musicEnabled!==false;
  showIntro=!data.introShown;
  sanitizeLevelProgress(); // 自動修復損壞/不完整的進度，避免某時代關卡全鎖
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
  // 兩軌：territory（領地，所有非對戰畫面）/ battle（對戰，教學＋對戰畫面）
  files:{
    territory:'assets/audio/領地.mp3',
    battle:'assets/audio/對戰.mp3',
  },
  el:{},              // track key -> HTMLAudioElement
  current:null,       // 目前應播放的音軌
  fadeTimer:null,
  VOL:0.5,
  FADE_MS:900,        // 淡入/淡出時間

  init(){
    for(const k in this.files){
      const a=new Audio(this.files[k]);
      a.loop=true; a.preload='auto'; a.volume=0;
      this.el[k]=a;
    }
  },

  // 場景 → 音軌（對戰/教學=對戰；領地/各時代/破關/室內/結局…=領地）
  trackFor(s){ return (s==='battle'||s==='teaching') ? 'battle' : 'territory'; },

  // gameLoop 每幀呼叫；音軌相同就略過（同為領地→切換時代不重播）
  playSceneMusic(sceneName){
    const want=this.trackFor(sceneName);
    if(want===this.current) return;
    this.current=want;
    if(musicEnabled) this._crossfade(want);
  },

  // 淡出其他音軌、淡入指定音軌
  _crossfade(toKey){
    clearInterval(this.fadeTimer);
    const to=this.el[toKey];
    if(to){ try{ to.currentTime=0; }catch(e){} to.volume=0; to.play().catch(()=>{}); }
    const starts={}; for(const k in this.el) starts[k]=this.el[k].volume;
    const steps=Math.max(1, Math.round(this.FADE_MS/40)); let s=0;
    this.fadeTimer=setInterval(()=>{
      s++; const t=Math.min(1, s/steps);
      for(const k in this.el){
        const a=this.el[k];
        if(k===toKey) a.volume=this.VOL*t;                              // 漸強
        else { a.volume=Math.max(0, starts[k]*(1-t)); if(t>=1) a.pause(); } // 漸弱後暫停
      }
      if(t>=1){ clearInterval(this.fadeTimer); this.fadeTimer=null; }
    }, 40);
  },

  // 首次使用者互動 → 解鎖瀏覽器自動播放限制
  onUserGesture(){
    if(musicEnabled && this.current){
      const a=this.el[this.current];
      if(a && a.paused) this._crossfade(this.current);
    }
  },

  // 音樂開關：開→淡入目前音軌；關→全部停止
  refresh(){
    if(musicEnabled){ if(this.current) this._crossfade(this.current); }
    else this.stopMusic();
  },

  stopMusic(){
    clearInterval(this.fadeTimer); this.fadeTimer=null;
    for(const k in this.el){ this.el[k].pause(); this.el[k].volume=0; }
  },
};

function detectOrientation(){
  const newPortrait=window.innerHeight>window.innerWidth;
  if(newPortrait!==isPortrait){
    isPortrait=newPortrait;
  }
}

// ── 設定按鈕（左下角）與設定面板 ─────────────────────────
function settingsBtnGeo(){
  const s=40;
  if(scene==='battle') return {x:Math.round(DESIGN_W/2-s/2), y:10, w:s, h:s}; // 對戰：頂部中間（避開敵我名字與題目框）
  return {x:12, y:(isPortrait?DESIGN_H-52:DESIGN_H-50), w:s, h:s};            // 其餘場景：左下角
}
function settingsPanelGeo(){
  const w=380, h=250, x=Math.round((DESIGN_W-w)/2), y=Math.round((DESIGN_H-h)/2);
  const cx=x+Math.round(w/2);
  return { x,y,w,h,
    mute:  {x:cx-44,  y:y+98,  w:88,  h:38},
    pc:    {x:cx-150, y:y+182, w:132, h:42},
    mobile:{x:cx+18,  y:y+182, w:132, h:42},
  };
}
function inRect(cx,cy,r){ return cx>=r.x&&cx<r.x+r.w&&cy>=r.y&&cy<r.y+r.h; }

function drawSettingsUI(){
  const b=settingsBtnGeo();
  ctx.save();
  ctx.globalAlpha=0.5;   // 設定鈕半透明 50%
  ctx.fillStyle='rgba(20,16,28,0.82)'; ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=2; ctx.strokeRect(b.x+0.5,b.y+0.5,b.w-1,b.h-1);
  ctx.fillStyle='#ffffff'; ctx.font='20px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('⚙', b.x+b.w/2, b.y+b.h/2+1); ctx.textBaseline='alphabetic';
  ctx.restore();
  if(settingsOpen) drawSettingsPanel();
}

function drawSettingsPanel(){
  const p=settingsPanelGeo();
  // 半透明遮罩（點此區域即關閉）
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,DESIGN_W,DESIGN_H);
  // 面板
  ctx.fillStyle='rgba(14,22,30,0.96)'; ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.strokeStyle='#fcc539'; ctx.lineWidth=2; ctx.strokeRect(p.x+1,p.y+1,p.w-2,p.h-2);
  // 標題
  ctx.fillStyle='#fcc539'; ctx.font='bold 18px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('設　定', p.x+p.w/2, p.y+34);
  // 帳號
  const email=(window.CloudSave&&window.CloudSave.userEmail&&window.CloudSave.userEmail())||null;
  ctx.font='13px DotGothic16'; ctx.textAlign='left';
  ctx.fillStyle='#ffe08b'; ctx.fillText('帳號：', p.x+24, p.y+66);
  ctx.fillStyle='#ffffff'; ctx.fillText(email||'訪客模式', p.x+24+ctx.measureText('帳號：').width, p.y+66);
  // 音樂
  ctx.fillStyle='#ffe08b'; ctx.font='13px DotGothic16'; ctx.textAlign='left';
  ctx.fillText('音樂', p.x+24, p.mute.y-8);
  const mu=p.mute;
  ctx.fillStyle=musicEnabled?'rgba(74,222,128,0.25)':'rgba(239,68,68,0.25)'; ctx.fillRect(mu.x,mu.y,mu.w,mu.h);
  ctx.strokeStyle=musicEnabled?'#4ade80':'#ef4444'; ctx.lineWidth=2; ctx.strokeRect(mu.x+0.5,mu.y+0.5,mu.w-1,mu.h-1);
  ctx.fillStyle='#ffffff'; ctx.font='15px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(musicEnabled?'🔊 開':'🔇 關', mu.x+mu.w/2, mu.y+mu.h/2+1); ctx.textBaseline='alphabetic';
  // 模式
  ctx.fillStyle='#ffe08b'; ctx.font='13px DotGothic16'; ctx.textAlign='left';
  ctx.fillText('模式', p.x+24, p.pc.y-8);
  const modeBtn=(r,label,active)=>{
    ctx.fillStyle=active?'rgba(252,197,57,0.28)':'rgba(40,40,46,0.6)'; ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.strokeStyle=active?'#fcc539':'#6a6a6a'; ctx.lineWidth=2; ctx.strokeRect(r.x+0.5,r.y+0.5,r.w-1,r.h-1);
    ctx.fillStyle=active?'#fcc539':'#cccccc'; ctx.font='bold 14px DotGothic16'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, r.x+r.w/2, r.y+r.h/2+1); ctx.textBaseline='alphabetic';
  };
  modeBtn(p.pc,'🖥 電腦',deviceMode==='pc');
  modeBtn(p.mobile,'📱 手機',deviceMode==='mobile');
  // 關閉提示
  ctx.fillStyle='#9aa6ab'; ctx.font='11px DotGothic16'; ctx.textAlign='center';
  ctx.fillText('點擊介面外區域關閉', p.x+p.w/2, p.y+p.h-12);
}

// 設定相關點擊（回傳 true 表示已消化此點擊，阻擋穿透到遊戲）
function handleSettingsTap(cx,cy){
  const b=settingsBtnGeo();
  if(settingsOpen){
    const p=settingsPanelGeo();
    if(inRect(cx,cy,p.mute)){ toggleMusic(); return true; }
    if(inRect(cx,cy,p.pc)){ deviceMode='pc'; localStorage.setItem('deviceMode','pc'); return true; }
    if(inRect(cx,cy,p.mobile)){ deviceMode='mobile'; localStorage.setItem('deviceMode','mobile'); return true; }
    if(cx<p.x||cx>p.x+p.w||cy<p.y||cy>p.y+p.h){ settingsOpen=false; return true; } // 點面板外 → 關閉
    return true; // 點面板內空白 → 吃掉
  }
  if(inRect(cx,cy,b)){ settingsOpen=true; return true; }
  return false;
}

function toggleMusic(){
  musicEnabled=!musicEnabled;
  localStorage.setItem('musicEnabled', musicEnabled);

  if(musicEnabled){
    AudioManager.refresh();   // 依目前場景啟動背景音樂（若該場景已設定音樂檔）
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

// （設定按鈕點擊已整合進 onTap → handleSettingsTap）
