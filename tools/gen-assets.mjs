import fs from 'fs';
let r=1;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647};
// ---- skyline backdrop (sunset + industrial silhouettes + hyperbolic towers)
function tower(cx,base,h,wTop,wMid,wBot,fill){
  const t=base-h, m=base-h*0.35;
  return `<path d="M${cx-wBot} ${base} Q${cx-wMid} ${m} ${cx-wTop} ${t} L${cx+wTop} ${t} Q${cx+wMid} ${m} ${cx+wBot} ${base}Z" fill="${fill}"/>`;
}
let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 260" preserveAspectRatio="xMidYMax slice">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1330"/><stop offset=".35" stop-color="#3b2a6b"/><stop offset=".62" stop-color="#b4476e"/><stop offset=".82" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ffb347"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#040b17" stop-opacity="1"/><stop offset=".3" stop-color="#040b17" stop-opacity=".55"/><stop offset="1" stop-color="#040b17" stop-opacity="0"/></linearGradient>
<linearGradient id="steam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="9"/></filter></defs>
<rect width="1672" height="260" fill="url(#sky)"/>`;
for(let i=0;i<60;i++)s+=`<circle cx="${rnd()*1672}" cy="${rnd()*90}" r="${rnd()*1.2+.3}" fill="#fff" opacity="${rnd()*.6+.2}"/>`;
s+=`<ellipse cx="1180" cy="250" rx="420" ry="60" fill="#ffd27a" opacity=".45" filter="url(#b)"/>`;
// steam
s+=`<g filter="url(#b)" opacity=".8"><ellipse cx="1090" cy="55" rx="70" ry="50" fill="#e8d9f0" opacity=".6"/><ellipse cx="1130" cy="30" rx="80" ry="40" fill="#d9c8ee" opacity=".5"/><ellipse cx="1500" cy="70" rx="70" ry="45" fill="#f1d3d8" opacity=".5"/></g>`;
// far buildings
let x=0;while(x<1672){const w=20+rnd()*45,h=25+rnd()*55;s+=`<rect x="${x}" y="${260-h}" width="${w}" height="${h}" fill="#2a2150" opacity=".85"/>`;x+=w+rnd()*8}
s+=tower(1100,262,175,52,40,78,'#1c1840')+tower(1500,262,190,56,43,84,'#1a1640');
// near industrial
x=0;while(x<1672){const w=14+rnd()*40,h=18+rnd()*42;s+=`<rect x="${x}" y="${260-h}" width="${w}" height="${h}" fill="#0d1030"/>`;
 if(rnd()>.6)s+=`<rect x="${x+w/2-2}" y="${260-h-22}" width="4" height="22" fill="#0d1030"/><circle cx="${x+w/2}" cy="${260-h-24}" r="1.6" fill="#ff5a3c"/>`;
 for(let k=0;k<3;k++)if(rnd()>.5)s+=`<rect x="${x+3+rnd()*(w-8)}" y="${260-h+4+rnd()*(h-10)}" width="3" height="2" fill="#ffc86b" opacity=".9"/>`;x+=w+rnd()*5}
s+=`<rect width="1672" height="260" fill="url(#fade)"/></svg>`;
fs.writeFileSync('../assets/skyline.svg',s);

// ---- hyperbolic tower illustration (sidebar)
let t=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 300">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c2a4a"/><stop offset="1" stop-color="#0a4a78"/></linearGradient>
<radialGradient id="st" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#cfe8ff" stop-opacity=".7"/><stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></radialGradient>
<filter id="gl"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g opacity=".85"><ellipse cx="95" cy="38" rx="42" ry="26" fill="url(#st)"/><ellipse cx="125" cy="22" rx="46" ry="22" fill="url(#st)" opacity=".7"/><ellipse cx="150" cy="40" rx="30" ry="20" fill="url(#st)" opacity=".6"/></g>
<path d="M62 215 Q95 120 78 62 L182 62 Q165 120 198 215Z" fill="url(#g)" stroke="#9fe3ff" stroke-width="2.4" filter="url(#gl)"/>
<g stroke="#38d0ff" stroke-width="1" opacity=".55" fill="none"><path d="M85 100 L175 100"/><path d="M80 130 L180 130"/><path d="M76 160 L184 160"/></g>
<g fill="#5fd4ff" filter="url(#gl)">${Array.from({length:46},()=>`<circle cx="${80+rnd()*100}" cy="${95+rnd()*115}" r="1.6"/>`).join('')}</g>
<g fill="#38d0ff" filter="url(#gl)"><path d="M98 95 l8 -14 l8 14 h-5 v18 h-6 v-18z"/><path d="M122 95 l8 -14 l8 14 h-5 v18 h-6 v-18z"/><path d="M146 95 l8 -14 l8 14 h-5 v18 h-6 v-18z"/></g>
<path d="M44 235 H216 V262 H44Z" fill="#0a4a78" stroke="#59d3ff" stroke-width="2"/><path d="M52 262 H208" stroke="#59d3ff" stroke-width="3"/>
<g stroke="#1b86bf" stroke-width="2.5"><path d="M60 215 V262"/><path d="M85 215 V262"/><path d="M110 215 V262"/><path d="M150 215 V262"/><path d="M175 215 V262"/><path d="M200 215 V262"/></g>
<rect x="46" y="262" width="168" height="24" fill="#16212f" stroke="#59d3ff" stroke-width="1.6"/>
<g stroke="#59d3ff" stroke-width="1.6" fill="none"><path d="M46 286 L88 262 M88 286 L130 262 M130 286 L172 262 M172 286 L214 262"/></g>
<g fill="#38d0ff" filter="url(#gl)"><path d="M4 238 h26 m-8 -6 l8 6 l-8 6" stroke="#38d0ff" stroke-width="3" fill="none"/><path d="M256 238 h-26 m8 -6 l-8 6 l8 6" stroke="#38d0ff" stroke-width="3" fill="none"/></g>
</svg>`;
fs.writeFileSync('../assets/tower-illustration.svg',t);
