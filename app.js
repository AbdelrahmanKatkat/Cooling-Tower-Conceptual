(() => {
'use strict';
const $ = id => document.getElementById(id);
const S = { units:'si', type:'induced', rotate:true, mode:'rotate', zoom:1, yaw:.7, pitch:.5, panX:0, panY:0 };

/* ---------- unit helpers ---------- */
const F = {
  q:{MW:1,kW:1e-3,'BTU/h':2.93071e-7}, p:{kPa:1,psi:6.894757,bar:100},
  f:{'m³/h':1,gpm:0.227125,'L/s':3.6}
};
const toC = (v,u)=>u==='°F'?(v-32)*5/9:v;
const fromC = (v,u)=>u==='°F'?v*9/5+32:v;
const rd = (v,d=1)=>{const k=10**d;return Math.round(v*k)/k};

/* ---------- calculation ---------- */
function read(){
  const q = +$('q').value*F.q[$('qU').value];
  const tin = toC(+$('tin').value,$('tinU').value);
  const tout= toC(+$('tout').value,$('toutU').value);
  const twb = toC(+$('twb').value,$('twbU').value);
  const pamb= +$('pamb').value*F.p[$('pU').value];
  const flowRaw = $('flowIn').value;
  const flowOvr = flowRaw!=='' ? +flowRaw*F.f[$('flowU').value] : null;
  return {q,tin,tout,twb,pamb,flowOvr,cells:Math.max(1,Math.round(+$('cells').value||1)),
    fan:$('fan').value,fill:$('fill').value,drift:$('drift').checked,type:S.type};
}
function calc(i){
  const range=i.tin-i.tout, approach=i.tout-i.twb, warns=[];
  if(!(i.q>0)) warns.push('Heat rejection must be positive.');
  if(range<=0) warns.push('Hot water must be warmer than cold water.');
  if(approach<=0) warns.push('Cold water must be above the wet-bulb temperature.');
  else if(approach<2.5) warns.push('Approach below ~2.5 °C is very large / uneconomical for a real tower.');
  const cp=4.186, rho=994;                               // kJ/kg·K , kg/m³
  const mw = (range>0)? i.q*1000/(cp*range) : 0;         // kg/s
  let flow = i.flowOvr ?? mw*3600/rho;                   // m³/h
  const mwUsed = flow*rho/3600;
  const fillK = {Film:1,Splash:1.35,Trickle:1.2}[i.fill];
  const lg = 0.62*(1+Math.max(0,(approach-5))*0.0)*(i.type==='natural'?1.15:1)*(1/ (fillK>1? 0.95:1)); // L/G ratio (mass)
  const rhoAir = i.pamb*1000/(287.05*(i.twb+273.15+4))*0.97;
  const mAir = mwUsed/lg, air = mAir/rhoAir*3600;        // m³/h
  const loading = {Film:12.65,Splash:9.5,Trickle:10.8}[i.fill]*(i.type==='natural'?.9:1);
  const areaTotal = flow/loading;
  const area = areaTotal/i.cells;
  const side = Math.sqrt(area);
  const dp = ({induced:350,forced:380,natural:0})[i.type] + (i.drift?0:-20)*(i.type==='natural'?0:1)*-1*0;
  const eta=0.71;
  const fanP = i.type==='natural'?0:(air/3600*dp/eta)/1e6 * (i.fan==='Centrifugal'?1.18:1) * (i.drift?1:0.95); // MW
  const fillH = ({Film:2.8,Splash:3.6,Trickle:3.2})[i.fill];
  const basin = 2.5;
  let H = {induced:20,forced:14,natural:Math.max(60,side*2.4)}[i.type];
  H = H + (side-18.5)*0.0 ;
  const plume = ({induced:8.5,forced:6.5,natural:25})[i.type];
  return {flow,air,area,areaTotal,side,fanP,fillH,basin,H,plume,range,approach,warns,lg,mAir,mwUsed,dp,
          width: i.type==='natural'? side*1.15 : side};
}

/* ---------- formatting by unit system ---------- */
const sci = n => { const e=Math.floor(Math.log10(n)); return `${rd(n/10**e,1).toFixed(1)} × 10${sup(e)}`; };
const sup = e => String(e).replace(/-/g,'⁻').replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const len = m => S.units==='si' ? `${rd(m,1).toFixed(1)} m` : `${rd(m*3.28084,1).toFixed(1)} ft`;
function render(){
  const i=read(), c=calc(i); window.__calc=c; window.__in=i;
  const imp=S.units==='imp';
  const flowTxt = imp ? `≈ ${Math.round(c.flow*4.402868).toLocaleString('en-US')} gpm`
                      : `≈ ${(c.flow>=1000?Math.round(c.flow/100)*100:Math.round(c.flow/10)*10).toLocaleString('en-US')} m³/h`;
  const airTxt = !isFinite(c.air)||c.air<=0 ? '–' : (imp?`≈ ${sci(c.air*0.588578)} cfm`:`≈ ${sci(c.air)} m³/h`);
  const fpS = len(c.side), fp = i.cells>1 ? `${i.cells} × ${fpS}²`.replace('²','') : `${fpS} × ${fpS}`;
  $('rFlow').textContent = isFinite(c.flow)&&c.flow>0?flowTxt:'–';
  $('rAir').textContent = airTxt;
  $('rFoot').textContent = isFinite(c.side)?`≈ ${fp}`:'–';
  $('rFan').textContent = i.type==='natural'?'None (natural)':isFinite(c.fanP)?`≈ ${rd(c.fanP,2).toFixed(2)} MW`:'–';
  $('dH').textContent = len(c.H);
  $('dP').textContent = '~ '+len(c.plume);
  $('dW').textContent = isFinite(c.width)?len(c.width):'–';
  $('dB').textContent = len(c.basin);
  $('dF').textContent = len(c.fillH);
  const w=$('warn'); w.hidden=!c.warns.length; w.textContent=c.warns.join(' ');
  document.querySelectorAll('.tile b').forEach(e=>{e.classList.remove('flash');void e.offsetWidth;e.classList.add('flash')});
  drawSoon();
}

/* ---------- unit system toggle ---------- */
function setUnits(u){
  if(u===S.units) return;
  const keep = read();
  S.units=u;
  document.querySelectorAll('#units button').forEach(b=>b.classList.toggle('on',b.dataset.u===u));
  const imp=u==='imp';
  const set=(selId,val,inpId,v)=>{$(selId).value=val; $(inpId).value=rd(v,2)};
  set('qU',imp?'BTU/h':'MW','q', imp?keep.q/F.q['BTU/h']:keep.q);
  if(imp) $('q').value = rd(keep.q*3.412142e6/1e6,2)+''; // stored as MBTU/h-equivalent number below
  document.querySelectorAll('.tU').forEach(s=>s.value=imp?'°F':'°C');
  $('tin').value=rd(fromC(keep.tin,imp?'°F':'°C'),1);
  $('tout').value=rd(fromC(keep.tout,imp?'°F':'°C'),1);
  $('twb').value=rd(fromC(keep.twb,imp?'°F':'°C'),1);
  $('pU').value=imp?'psi':'kPa'; $('pamb').value=rd(keep.pamb/F.p[imp?'psi':'kPa'],imp?2:1);
  $('flowU').value=imp?'gpm':'m³/h';
  if(keep.flowOvr!=null) $('flowIn').value=rd(keep.flowOvr/F.f[imp?'gpm':'m³/h'],0);
  render();
}
/* BTU/h option: keep numbers sane by converting to MBH-free value: use MBH? simple: show in 10^6 BTU/h */
F.q['BTU/h']=0.29307107; // so the number entered is MBTU/h (millions) -> MW

/* ---------- events ---------- */
document.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',render));
['qU','tinU','toutU','twbU','pU','flowU'].forEach(id=>$(id).addEventListener('change',()=>{ /* unit changed: reinterpret number */ render()}));
$('qU').querySelectorAll('option')[2].textContent='MBTU/h';
$('qU').querySelectorAll('option')[2].value='BTU/h';
$('units').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setUnits(b.dataset.u)});
$('typeCards').addEventListener('click',e=>{
  const b=e.target.closest('.card'); if(!b) return;
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('active',c===b));
  S.type=b.dataset.type;
  $('fan').value = S.type==='natural'?$('fan').value:$('fan').value;
  render();
});
$('menu').addEventListener('click',e=>{
  const li=e.target.closest('li'); if(!li) return;
  document.querySelectorAll('#menu li').forEach(x=>x.classList.toggle('active',x===li));
  const t=$(li.dataset.go); if(t){t.scrollIntoView({behavior:'smooth',block:'center'});t.style.boxShadow='0 0 28px #ffd21aaa';setTimeout(()=>t.style.boxShadow='',900)}
});
$('tabs').addEventListener('click',e=>{
  const b=e.target.closest('.tab'); if(!b) return;
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
  const m={design:'inputs',simulate:'results',results:'results',export:'export',guide:'inputs'}[b.dataset.tab];
  if(b.dataset.tab==='guide') toast('Guide: 1) enter loads  2) pick a tower type  3) review sizing  4) check the 3D preview  5) export the package.');
  else if(b.dataset.tab==='simulate') toast('Simulation runs in ANSYS — export the package and open the Fluent journal.');
  else $(m).scrollIntoView({behavior:'smooth',block:'center'});
});
$('steps').addEventListener('click',e=>{
  const li=e.target.closest('li'); if(!li) return;
  document.querySelectorAll('#steps li').forEach(x=>x.classList.toggle('active',x===li));
  const m={1:'inputs',2:'config',3:'results',4:'cv',5:'export'}[li.dataset.s]; $(m).scrollIntoView({behavior:'smooth',block:'center'});
});

/* ---------- toast ---------- */
let tt; function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3800)}

/* ---------- 3D preview (canvas, software projection) ---------- */
const cv=$('cv'), ctx=cv.getContext('2d');
let raf=0, W=0,H=0, dpr=1;
function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);
  const r=cv.getBoundingClientRect(); W=r.width;H=r.height;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); drawSoon();
}
function proj(p,sc){ // p in metres, y up
  const cy=Math.cos(S.yaw), sy=Math.sin(S.yaw), cp=Math.cos(S.pitch), sp=Math.sin(S.pitch);
  const x=p[0]*cy - p[2]*sy, z=p[0]*sy + p[2]*cy, y=p[1];
  const Y=y*cp - z*sp, Z=y*sp + z*cp;
  return [W/2 + S.panX + x*sc, H*0.78 + S.panY - Y*sc, Z];
}
function poly(pts,sc,fill,stroke,lw=1){
  ctx.beginPath(); pts.forEach((p,k)=>{const q=proj(p,sc);k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}); ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
}
function box(x0,y0,z0,x1,y1,z1,sc,cols){
  // draw visible faces sorted by depth
  const f=[
   {p:[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],c:cols[0]},
   {p:[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],c:cols[0]},
   {p:[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],c:cols[1]},
   {p:[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],c:cols[1]},
   {p:[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],c:cols[2]}
  ].map(o=>({...o,d:o.p.reduce((a,p)=>a+proj(p,1)[2],0)/4}));
  f.sort((a,b)=>b.d-a.d);
  f.forEach(o=>{poly(o.p,sc,o.c,'rgba(20,40,60,.6)',1)});
}
function ring(cx,cy,cz,r,n,sc){return Array.from({length:n},(_,k)=>{const a=k/n*6.2832;return [cx+Math.cos(a)*r,cy,cz+Math.sin(a)*r]})}
function draw(){
  raf=0; if(!W) return;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const i=window.__in, c=window.__calc; if(!c||!isFinite(c.side)) return;
  const cells=i.cells, s=Math.min(c.side,60);
  const cols=Math.min(cells,Math.ceil(Math.sqrt(cells))), rows=Math.ceil(cells/cols);
  const gap=1.2, tw=s, tot=Math.max(cols*(tw+gap),rows*(tw+gap));
  const th=c.H, fh=c.fillH, bd=c.basin;
  const sc=Math.min(W*.70/ (tot*1.1+th*.25), H*.80/(th+tot*.25))*S.zoom*(i.type==='natural'?.75:1);
  // ground shadow plate
  poly([[-tot,0,-tot],[tot,0,-tot],[tot,0,tot],[-tot,0,tot]].map(p=>[p[0]*1.1,0,p[2]*1.1]),sc,'rgba(10,60,110,.28)','rgba(40,160,230,.35)',1);
  const cellsList=[];
  for(let k=0;k<cells;k++){const cx=(k%cols-(cols-1)/2)*(tw+gap), cz=(Math.floor(k/cols)-(rows-1)/2)*(tw+gap); cellsList.push([cx,cz])}
  cellsList.sort((a,b)=>proj([b[0],0,b[1]],1)[2]-proj([a[0],0,a[1]],1)[2]);
  cellsList.forEach(([cx,cz])=>{
    if(i.type==='natural') return drawNatural(cx,cz,tw,th,sc,c);
    const h=tw/2;
    // support columns
    const sup=3.0;
    [[-h,-h],[h-.7,-h],[-h,h-.7],[h-.7,h-.7],[-.35,-h],[-.35,h-.7]].forEach(([a,b])=>box(cx+a,0,cz+b,cx+a+.7,sup,cz+b+.7,sc,['#8d99a6','#6f7b88','#aab4be']));
    // basin
    box(cx-h,sup,cz-h,cx+h,sup+bd*.55,cz+h,sc,['#c7ced6','#a9b2bc','#2aa8e0']);
    const y0=sup+bd*.55, y1=y0+ (th-sup-bd*.55-3), yTop=sup+th*0.78;
    // fill block (dark) visible through louvre openings
    box(cx-h,y0,cz-h,cx+h,y0+fh,cz+h,sc,['#161a20','#10141a','#2a3037']);
    // casing / louvre wall
    box(cx-h,y0+fh,cz-h,cx+h,yTop,cz+h,sc,['#d8dde3','#bcc4cc','#e6eaee']);
    // spray + droplets cutaway on front panel
    ctx.save(); ctx.strokeStyle='rgba(120,215,255,.85)'; ctx.lineWidth=1;
    for(let k=0;k<7;k++){const x=cx-h+ (k+.5)*tw/7;
      const a=proj([x,yTop-.8,cz-h],sc),b=proj([x+ (k%2?1:-1)*.6,y0+fh+.9,cz-h],sc);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
    ctx.restore();
    if(i.drift){ box(cx-h,yTop,cz-h,cx+h,yTop+.5,cz+h,sc,['#9aa5b1','#8793a0','#b8c1ca']) }
    const yFan=yTop+(i.drift?.5:0);
    if(i.type==='induced'){
      // fan stack
      const r=Math.min(h*.82,9), hh=3.2; const A=ring(cx,yFan,cz,r,28,1), B=ring(cx,yFan+hh,cz,r*1.12,28,1);
      ctx.fillStyle='#d9dee4'; ctx.beginPath();
      B.forEach((p,k)=>{const q=proj(p,sc);k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}); ctx.closePath(); ctx.fillStyle='#dfe4ea'; ctx.fill(); ctx.strokeStyle='#8e99a5'; ctx.stroke();
      // stack wall side (silhouette)
      const L=proj([cx-r*1.12*Math.cos(S.yaw)*0,0,0],1);
      const pa=ring(cx,yFan,cz,r,36,1).map(p=>proj(p,sc)), pb=ring(cx,yFan+hh,cz,r*1.12,36,1).map(p=>proj(p,sc));
      ctx.beginPath(); for(let k=0;k<36;k++){const q=pb[k];k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])} for(let k=35;k>=0;k--){ctx.lineTo(pa[k][0],pa[k][1])} ctx.closePath();
      ctx.fillStyle='#c9d0d8';ctx.fill();
      // top rim + fan blades
      ctx.beginPath(); pb.forEach((q,k)=>k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.closePath(); ctx.fillStyle='#2b3138'; ctx.fill(); ctx.strokeStyle='#eef2f6'; ctx.lineWidth=2; ctx.stroke();
      const ft=window.__fan||0; const nb=8, hub=proj([cx,yFan+hh*.6,cz],sc);
      for(let k=0;k<nb;k++){const a=ft+k/nb*6.2832, a2=a+.32;
        const p1=proj([cx+Math.cos(a)*r*.15,yFan+hh*.6,cz+Math.sin(a)*r*.15],sc), p2=proj([cx+Math.cos(a)*r*1.05,yFan+hh*.6,cz+Math.sin(a)*r*1.05],sc), p3=proj([cx+Math.cos(a2)*r*1.0,yFan+hh*.6,cz+Math.sin(a2)*r*1.0],sc);
        ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.lineTo(p3[0],p3[1]);ctx.closePath();ctx.fillStyle='#aeb7c1';ctx.fill()}
      ctx.beginPath();ctx.arc(hub[0],hub[1],Math.max(3,r*sc*.07),0,6.3);ctx.fillStyle='#e8edf2';ctx.fill();
    } else if(i.type==='forced'){
      // side-mounted fan housings
      [[-h-1.4,0],[h,0]].forEach(([dx])=>box(cx+dx,sup+bd*.55+.8,cz-2.2,cx+dx+1.4,sup+bd*.55+4.6,cz+2.2,sc,['#9fa9b4','#808b97','#c2cad2']));
      box(cx-h*.3,yTop,cz-h*.3,cx+h*.3,yTop+.8,cz+h*.3,sc,['#a9b3be','#8e99a5','#c9d1d9']);
    }
    // handrail strip
    poly([[cx-h,yTop+.9,cz-h],[cx+h,yTop+.9,cz-h],[cx+h,yTop+.9,cz+h],[cx-h,yTop+.9,cz+h]],sc,null,'rgba(255,205,30,.9)',1.5);
    // plume
    const pl=proj([cx,yTop+ (i.type==='induced'?3.4:0.8),cz],sc);
    const g=ctx.createRadialGradient(pl[0],pl[1]-c.plume*sc*.3,2,pl[0],pl[1]-c.plume*sc*.3,c.plume*sc*.7);
    g.addColorStop(0,'rgba(235,245,255,.35)');g.addColorStop(1,'rgba(235,245,255,0)');ctx.fillStyle=g;ctx.fillRect(pl[0]-c.plume*sc,pl[1]-c.plume*sc*1.3,c.plume*sc*2,c.plume*sc*1.6);
  });
  // basin water glow
  ctx.fillStyle='rgba(40,190,255,.08)';
}
function drawNatural(cx,cz,tw,th,sc,c){
  const n=40, r0=tw*.62, rT=tw*.42, rMid=tw*.34, base=6;
  const prof=y=>{const t=y/th; return r0+(rMid-r0)*Math.sin(Math.min(1,t/.78)*1.5708)*(t<.78?1:1)+(t>.78?(rT-rMid)*((t-.78)/.22):0)};
  const rings=[];for(let k=0;k<=24;k++){const y=base+(th-base)*k/24;rings.push(ring(cx,y,cz,prof(y-base),n,1))}
  // legs
  for(let k=0;k<n;k+=3){const a=ring(cx,0,cz,r0*1.02,n,1)[k], b=ring(cx,base,cz,r0,n,1)[k];const p=proj(a,sc),q=proj(b,sc);ctx.strokeStyle='#7d8996';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}
  // shell quads
  const quads=[];for(let j=0;j<24;j++)for(let k=0;k<n;k++){const a=rings[j][k],b=rings[j][(k+1)%n],cc=rings[j+1][(k+1)%n],d=rings[j+1][k];quads.push({p:[a,b,cc,d],z:proj(a,1)[2]})}
  quads.sort((a,b)=>b.z-a.z).forEach(q=>{const sh=180+Math.round(35*Math.sin(Math.atan2(q.p[0][2]-cz,q.p[0][0]-cx)-S.yaw));poly(q.p,sc,`rgb(${sh},${sh+4},${sh+10})`,'rgba(60,80,100,.25)',.5)});
  const top=rings[24].map(p=>proj(p,sc));ctx.beginPath();top.forEach((q,k)=>k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
}
function drawSoon(){ if(!raf) raf=requestAnimationFrame(draw) }
function loop(t){
  if(S.rotate){S.yaw+=.004}
  window.__fan=(window.__fan||0)+.18;
  draw(); requestAnimationFrame(loop);
}
// controls
const mode=m=>{S.mode=m; ['vPan','vZoom'].forEach(id=>$(id).classList.toggle('on',(id==='vPan')===(m==='pan')&&m!=='rotate'&&(id==='vPan'?m==='pan':m==='zoom')))};
$('vRot').onclick=()=>{S.rotate=!S.rotate;$('vRot').classList.toggle('on',S.rotate)};
$('vPan').onclick=()=>{S.mode=S.mode==='pan'?'rotate':'pan';$('vPan').classList.toggle('on',S.mode==='pan');$('vZoom').classList.remove('on')};
$('vZoom').onclick=()=>{S.zoom=Math.min(2.5,S.zoom*1.2);if(S.zoom>2.4)S.zoom=1};
$('vFull').onclick=()=>{cv.parentElement.classList.toggle('full');setTimeout(resize,50)};
let drag=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};S.rotate=false;$('vRot').classList.remove('on')});
cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};
  if(S.mode==='pan'||e.shiftKey){S.panX+=dx;S.panY+=dy}else{S.yaw+=dx*.008;S.pitch=Math.max(.05,Math.min(1.45,S.pitch+dy*.006))}});
cv.addEventListener('pointerup',()=>drag=null);
cv.addEventListener('wheel',e=>{e.preventDefault();S.zoom=Math.max(.4,Math.min(3,S.zoom*(e.deltaY<0?1.1:.9)))},{passive:false});
new ResizeObserver(resize).observe(cv);

/* ---------- export package (STEP, DXF, Fluent journal, report) ---------- */
function crc32(b){let c,crc=~0;for(let n=0;n<b.length;n++){c=(crc^b[n])&255;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xEDB88320:c>>>1;crc=(crc>>>8)^c}return ~crc>>>0}
function zip(files){
  const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  const u16=v=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>24&255];
  files.forEach(f=>{const n=enc.encode(f.name),d=enc.encode(f.data),c=crc32(d);
    const h=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(d.length),...u32(d.length),...u16(n.length),...u16(0)]);
    parts.push(h,n,d);
    cd.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(d.length),...u32(d.length),...u16(n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),n);
    off+=h.length+n.length+d.length});
  const cdSize=cd.reduce((a,b)=>a+b.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdSize),...u32(off),0,0]);
  return new Blob([...parts,...cd,end],{type:'application/zip'});
}
function stepBox(name,x,y,z,dx,dy,dz,id0){ // minimal AP214 faceted box body
  const v=[[x,y,z],[x+dx,y,z],[x+dx,y+dy,z],[x,y+dy,z],[x,y,z+dz],[x+dx,y,z+dz],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]];
  let n=id0,L=[];const add=s=>{L.push(`#${n}=${s};`);return n++};
  const f=x=>x.toFixed(4);
  const pts=v.map(p=>add(`CARTESIAN_POINT('',(${p.map(f).join(',')}))`));
  const faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].map(q=>{
    const poly=add(`POLY_LOOP('',(${q.map(k=>'#'+pts[k]).join(',')}))`);
    const b=add(`FACE_BOUND('',#${poly},.T.)`);
    const pl=add(`PLANE('',#${add(`AXIS2_PLACEMENT_3D('',#${pts[q[0]]},#${add("DIRECTION('',(0.,0.,1.))")},#${add("DIRECTION('',(1.,0.,0.))")})`)})`);
    return add(`ADVANCED_FACE('',(#${b}),#${pl},.T.)`)});
  const sh=add(`CLOSED_SHELL('',(${faces.map(k=>'#'+k).join(',')}))`);
  add(`MANIFOLD_SOLID_BREP('${name}',#${sh})`);
  return {text:L.join('\n'),next:n,body:n-1};
}
function buildStep(i,c){
  const s=c.side,h=c.H,hs=3,parts=[
    ['SUPPORT_STRUCTURE',-s/2,0,-s/2,s,hs,s],['BASIN',-s/2,hs,-s/2,s,c.basin*.55,s],
    ['FILL_PACK',-s/2,hs+c.basin*.55,-s/2,s,c.fillH,s],
    ['CASING_PLENUM',-s/2,hs+c.basin*.55+c.fillH,-s/2,s,h-hs-c.basin*.55-c.fillH-3,s]];
  let id=10,body='',ids=[];
  parts.forEach(p=>{const r=stepBox(p[0],p[1],p[2],p[3],p[4],p[5],p[6],id);body+=r.text+'\n';id=r.next;ids.push(r.body)});
  return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Cooling tower conceptual geometry, single cell'),'2;1');\nFILE_NAME('${$('projName').textContent}.step','${new Date().toISOString()}',(''),(''),'Cooling Tower Designer','','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));\nENDSEC;\nDATA;\n${body}ENDSEC;\nEND-ISO-10303-21;\n`;
}
function buildDxf(i,c){
  const s=c.side,h=c.H;let o='0\nSECTION\n2\nENTITIES\n';
  const line=(a,b,c2,d,l)=>`0\nLINE\n8\n${l}\n10\n${a}\n20\n${b}\n30\n0\n11\n${c2}\n21\n${d}\n31\n0\n`;
  const rect=(x,y,w,hh,l)=>line(x,y,x+w,y,l)+line(x+w,y,x+w,y+hh,l)+line(x+w,y+hh,x,y+hh,l)+line(x,y+hh,x,y,l);
  o+=rect(0,0,s,s,'PLAN');                         // plan view
  const ox=s+10; o+=rect(ox,0,s,h,'ELEVATION')+rect(ox,3,s,c.basin*.55,'BASIN')+rect(ox,3+c.basin*.55,s,c.fillH,'FILL');
  o+=`0\nCIRCLE\n8\nFAN\n10\n${s/2}\n20\n${s/2}\n30\n0\n40\n${Math.min(s*.41,9)}\n`;
  return o+'0\nENDSEC\n0\nEOF\n';
}
function buildJournal(i,c){return `; ANSYS Fluent journal – ${$('projName').textContent}
; Conceptual setup generated by Cooling Tower Designer (preliminary, verify before use)
/file/set-tui-version "24.1"
/file/import/cad-options/import-body-names yes
/file/import cad ${$('projName').textContent}.step
/mesh/size-functions/set-global-min-max .05 1.5
/mesh/poly-hexcore/controls/hexcore-controls yes
/define/models/energy yes no no no no
/define/models/viscous/ke-realizable yes
/define/models/multiphase/model eulerian-wall-film? no
/define/materials/change-create air air yes ideal-gas no no no no no no
/define/operating-conditions/operating-pressure ${(i.pamb*1000).toFixed(0)}
/define/boundary-conditions/mass-flow-inlet water-inlet yes yes no ${c.mwUsed.toFixed(2)} no ${(i.tin+273.15).toFixed(2)}
/define/boundary-conditions/pressure-inlet air-inlet yes no 0 no ${(i.twb+273.15+4).toFixed(2)}
/define/boundary-conditions/fan fan-1 yes no ${c.dp.toFixed(0)}
; design water flow ${(c.flow).toFixed(0)} m3/h, air flow ${(c.air).toExponential(2)} m3/h, cells ${i.cells}
/solve/initialize/hyb-initialization
/solve/iterate 500
`;}
function buildReport(i,c){return `COOLING TOWER DESIGN REPORT - ${$('projName').textContent}
Generated ${new Date().toISOString().slice(0,10)}  (preliminary / conceptual – not for construction)
==========================================================
Tower type        : ${i.type} draft     Cells: ${i.cells}   Fan: ${i.fan}   Fill: ${i.fill}   Drift eliminator: ${i.drift?'yes':'no'}
Heat rejection    : ${i.q.toFixed(2)} MW
Hot / cold / wet-bulb : ${i.tin.toFixed(1)} / ${i.tout.toFixed(1)} / ${i.twb.toFixed(1)} C  (range ${c.range.toFixed(1)} K, approach ${c.approach.toFixed(1)} K)
Ambient pressure  : ${i.pamb.toFixed(1)} kPa
----------------------------------------------------------
Water flow        : ${c.flow.toFixed(0)} m3/h
Air flow          : ${c.air.toExponential(2)} m3/h   (L/G = ${c.lg.toFixed(2)})
Total plan area   : ${c.areaTotal.toFixed(0)} m2   -> ${c.side.toFixed(1)} m x ${c.side.toFixed(1)} m per cell
Fan power         : ${c.fanP.toFixed(2)} MW
Tower height ${c.H.toFixed(1)} m | fill ${c.fillH.toFixed(1)} m | basin ${c.basin.toFixed(1)} m | plume ~${c.plume.toFixed(1)} m
----------------------------------------------------------
Method: energy balance m = Q/(cp*dT); L/G and hydraulic loading are fixed design correlations. Use for sizing studies only.
`;}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
$('btnExport').addEventListener('click',()=>{
  const i=window.__in,c=window.__calc; if(c.warns.some(w=>/must/.test(w))){toast('Fix the input errors before exporting.');return}
  const nm=($('projName').textContent.trim()||'CT-01').replace(/[^\w-]+/g,'_'), files=[];
  if($('xStep').checked) files.push({name:`${nm}/geometry.step`,data:buildStep(i,c)});
  if($('xDxf').checked) files.push({name:`${nm}/drawing.dxf`,data:buildDxf(i,c)});
  if($('xMesh').checked) files.push({name:`${nm}/fluent_setup.jou`,data:buildJournal(i,c)});
  if($('xRep').checked) files.push({name:`${nm}/design_report.txt`,data:buildReport(i,c)});
  if(!files.length){toast('Select at least one item to export.');return}
  download(zip(files),`${nm}_package.zip`); toast(`Exported ${files.length} file(s) in ${nm}_package.zip`);
});

render(); resize(); requestAnimationFrame(loop);
})();
