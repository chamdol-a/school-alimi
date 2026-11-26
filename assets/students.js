/* 학교알리미 탐색기 · 학생 수 변화 (원본: 학생 수 변화 대시보드) — 자료는 students-data.js 를 처음 열 때 불러온다 */
window.Students = (function () {
  'use strict';
  let api = null, loading = null;
  function load() {
    if (window.STUDENTS_DATA) return Promise.resolve();
    if (!loading) loading = new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = 'assets/students-data.js';
      s.onload = () => ok(); s.onerror = () => { loading = null; fail(new Error('students-data.js')); };
      document.head.append(s);
    });
    return loading;
  }
  function init() {
const {D, RF, HF} = window.STUDENTS_DATA;
const visible = () => { const v = document.getElementById('view-students'); return v && !v.hidden; };
const safeRender = () => { if (visible()) render(); };
// 압축 데이터 풀기 → 원래 RAW/HS 형식 그대로 복원
const RAW=[],HS=[];
for(let i=0;i<RF.length;i+=D.nR){RAW.push([RF[i]+D.y0,D.lv[RF[i+1]],D.si[RF[i+2]],D.sg[RF[i+3]],D.ty[RF[i+4]],D.ru[RF[i+5]],...RF.slice(i+6,i+D.nR)]);}
const HN=D.nH-5;
for(let i=0;i<HF.length;i+=HN){const s=D.sch[HF[i+1]];HS.push([HF[i]+D.y0,D.si[s[0]],D.sg[s[1]],s[2],D.fo[s[3]],D.ty[s[4]],D.ru[s[5]],...HF.slice(i+2,i+HN)]);}

// 고등학교별: [연도, 시도, 시군구, 학교명, 설립구분, 고교유형, 지역구분, (학생,남,여,학급)×1·2·3학년]
// [연도, 학교급, 시도, 시군구, 고교유형, 지역구분, 학교수, 남, 여]
const COLORS = ['--c1','--c2','--c3','--c4','--c5','--c6','--c7','--c8'];
const LEVELS = ['초','중','고'];
const $ = id => document.getElementById('st-'+id);
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const fmt1 = n => n.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1});
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const years = [...new Set(RAW.map(r=>r[0]))].sort((a,b)=>a-b);
const sidos = [...new Set(RAW.map(r=>r[2]))].sort((a,b)=>a.localeCompare(b,'ko'));
const types = ['일반고','특목고','자율고','특성화고','마이스터고','기타'].filter(t=>RAW.some(r=>r[4]===t));

function fill(sel, items, val){ // items: [value,label]
  sel.innerHTML = items.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  if(val!==undefined) sel.value = val;
}
fill($('fLevel'), [['all','전체(초·중·고)'],['초','초등학교'],['중','중학교'],['고','고등학교']],'all');
fill($('fSido'), [['all','전국'],...sidos.map(s=>[s,s])],'all');
fill($('fType'), [['all','전체'],...types.map(t=>[t,t])],'all');
fill($('fRural'), [['all','전체'],['읍면','읍·면 지역'],['동(도시)','동 지역']],'all');
fill($('fGender'), [['all','남녀 합계'],['m','남학생'],['w','여학생']],'all');
fill($('fFrom'), years.map(y=>[y,y+'년']), years[0]);
fill($('fTo'), years.map(y=>[y,y+'년']), years[years.length-1]);
fill($('fGroup'), [['none','나누지 않음(합계)'],['level','학교급'],['gender','성별'],['type','고교 유형'],['sido','시도'],['sgg','시군구'],['rural','읍면/동 구분']],'level');
fill($('fMetric'), [['n','학생 수'],['s','학교 수'],['p','학교당 학생 수']],'n');
$('fFrom').value = years[years.length-1]-9 >= years[0] ? years[years.length-1]-9 : years[0];

const state = {chart:'line', hidden:new Set()};

const GJ_SIDO='전남광주통합특별시', GJ_GU=new Set(['동구','서구','남구','북구','광산구']);
const gjPart=n=>GJ_GU.has(n)?'광주':'전남';
// 광주·전남을 나눠 볼 때 쓰는 '광주'·'전남' 묶음도 시군구 자리에서 고를 수 있게 한다
const sggOK=(sido,sgg,sel)=> sgg===sel || (sido===GJ_SIDO && (sel==='광주'||sel==='전남') && gjPart(sgg)===sel);
function updateSgg(){
  const sido = $('fSido').value, cur = $('fSgg').value;
  const list = new Set();
  RAW.forEach(r=>{ if(sido==='all'||r[2]===sido) list.add(sido==='all' ? r[2]+'|'+r[3] : r[3]); });
  const items = [...list].sort((a,b)=>a.localeCompare(b,'ko')).map(v=>[v, sido==='all'? v.replace('|',' ') : v]);
  const parts = sido===GJ_SIDO ? [['광주','광주(구 5곳)'],['전남','전남(시·군)']] : [];
  fill($('fSgg'), [['all', sido==='all'?'전체':'전체 시군구'],...parts,...items]);
  $('fSgg').value = [...parts,...items].some(i=>i[0]===cur) ? cur : 'all';
}

function normalize(changed){
  const lv=$('fLevel'), ty=$('fType'), gr=$('fGroup'), ge=$('fGender');
  if(changed==='type' && ty.value!=='all') lv.value='고';
  if(changed==='group' && gr.value==='type') lv.value='고';
  if(changed==='group' && gr.value==='gender') ge.value='all';
  if(lv.value==='초'||lv.value==='중'){ ty.value='all'; ty.disabled=true; if(gr.value==='type') gr.value='level'; } else ty.disabled=false;
  ge.disabled = gr.value==='gender';
  $('fSgg').disabled = $('fSido').disabled = false;
  if(+$('fFrom').value > +$('fTo').value){ if(changed==='to') $('fFrom').value=$('fTo').value; else $('fTo').value=$('fFrom').value; }
}

function compute(){
  const f = {lv:$('fLevel').value, sido:$('fSido').value, sgg:$('fSgg').value, ty:$('fType').value, ru:$('fRural').value,
    ge:$('fGender').value, from:+$('fFrom').value, to:+$('fTo').value, g:$('fGroup').value, met:$('fMetric').value};
  const yrs = years.filter(y=>y>=f.from&&y<=f.to);
  const groups = new Map(); // key -> {label, byYear:{y:{s,n}}}
  const grades = {}; let gradeOK = true;   // 학년별 학생 수(중·고만 있음)
  for(const r of RAW){
    const [y,lv,sido,sgg,ty,ru,ns,m,w] = r;
    if(y<f.from||y>f.to) continue;
    if(f.lv!=='all'&&lv!==f.lv) continue;
    if(f.sido!=='all'&&sido!==f.sido) continue;
    if(f.sgg!=='all'&&(f.sido==='all'? (sido+'|'+sgg)!==f.sgg : !sggOK(sido,sgg,f.sgg))) continue;
    if(f.ty!=='all'&&ty!==f.ty) continue;
    if(f.ru!=='all'&&ru!==f.ru) continue;
    if(lv==='초') gradeOK=false; else { const G=grades[y]||(grades[y]=[0,0,0]); G[0]+=r[9]; G[1]+=r[10]; G[2]+=r[11]; }
    const parts = f.g==='gender' ? [['남학생',m],['여학생',w]] : [[null, f.ge==='m'?m:f.ge==='w'?w:m+w]];
    for(const [gl,stu] of parts){
      let key,label;
      switch(f.g){
        case 'none': key=label='선택한 조건 합계'; break;
        case 'level': key=label=lv+(lv==='초'?'등학교':lv==='중'?'학교':'등학교'); break;
        case 'gender': key=label=gl; break;
        case 'type': key=label=ty; break;
        case 'sido': key=label=sido; break;
        case 'sgg': key=label=(f.sido==='all'? sido+' '+sgg : sgg); break;
        case 'rural': key=label=ru; break;
      }
      let g = groups.get(key); if(!g){ g={label,by:{}}; groups.set(key,g); }
      const c = g.by[y] || (g.by[y]={s:0,n:0});
      c.s += ns; c.n += stu;
    }
  }
  const val = c => !c ? null : f.met==='n' ? c.n : f.met==='s' ? c.s : (c.s? c.n/c.s : null);
  let list = [...groups.values()].map(g=>({label:g.label, v:yrs.map(y=>val(g.by[y])), by:g.by}));
  const last = yrs[yrs.length-1];
  list.sort((a,b)=>(b.v[b.v.length-1]??-1)-(a.v[a.v.length-1]??-1));
  // 합계 행 (학생수/학교수에서만, 그룹이 여럿일 때)
  let total=null;
  if(list.length>1 && f.met!=='p'){
    total={label:'합계', v:yrs.map((y,i)=>list.reduce((a,g)=>a+(g.v[i]||0),0))};
  }
  if(list.length===1) total=null;
  return {f,yrs,list,total,grades:(gradeOK && f.ge==='all' && f.met==='n' && Object.keys(grades).length)?grades:null};
}

function metricName(f){ return f.met==='n'?'학생 수':f.met==='s'?'학교 수':'학교당 학생 수'; }
function unit(f){ return f.met==='n'?'단위: 명':f.met==='s'?'단위: 개교':'단위: 명/학교'; }
function fv(f,v){ return v==null?'-': f.met==='p'? fmt1(v): fmt(v); }
function axisFmt(v){ return v>=10000 ? (v/10000).toLocaleString('ko-KR',{maximumFractionDigits:1})+'만' : v.toLocaleString('ko-KR'); }

function describe(f){
  const bits=[];
  bits.push(f.sido==='all'?'전국':f.sido);
  if(f.sgg!=='all') bits.push(f.sgg.replace('|',' '));
  bits.push(f.lv==='all'?'초·중·고':f.lv+(f.lv==='중'?'학교':'등학교'));
  if(f.ty!=='all') bits.push(f.ty);
  if(f.ru!=='all') bits.push(f.ru==='읍면'?'읍·면 지역':f.ru==='동(도시)'?'동 지역':'지역 미상');
  if(f.ge!=='all') bits.push(f.ge==='m'?'남학생':'여학생');
  return bits.join(' · ');
}

function niceTicks(min,max,count){
  if(max===min){ max=min+1; }
  const span=max-min, step0=span/count, mag=Math.pow(10,Math.floor(Math.log10(step0)));
  const norm=step0/mag, step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag;
  const lo=Math.floor(min/step)*step, hi=Math.ceil(max/step)*step, t=[];
  for(let v=lo; v<=hi+step/2; v+=step) t.push(+v.toFixed(6));
  return t;
}


// ── 조건 단추: 숨긴 select를 상태 저장소로 쓰고, 단추는 그 값을 바꾼 뒤 change 이벤트를 보냄
const SIDO_ORDER=['서울특별시','부산광역시','대구광역시','인천광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전남광주통합특별시','경상북도','경상남도','제주특별자치도'];
const SHORT={'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전남광주통합특별시':'전남광주','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주','all':'전국'};
const LBL={'전체(초·중·고)':'전체','나누지 않음(합계)':'합계','읍면/동 구분':'지역 구분','남녀 합계':'합계','남학생':'남','여학생':'여','읍·면 지역':'읍·면','동 지역':'동','전체 시군구':'전체','학교당 학생 수':'학교당 학생'};
let yrStep=0;
function setSel(id,v){ const s=$(id); if(s.value===String(v)) return; s.value=v; s.dispatchEvent(new Event('change')); }
function chipsFrom(boxId,selId,labelFn,orderFn){
  const s=$(selId), box=$(boxId); let opts=[...s.options].map(o=>[o.value,o.text]);
  if(orderFn) opts=orderFn(opts);
  box.innerHTML=opts.map(([v,t])=>`<button type="button" class="ch" data-v="${v}" aria-pressed="${s.value===v}" ${s.disabled?'disabled':''}>${labelFn?labelFn(v,t):(LBL[t]||t)}</button>`).join('');
  box.onclick=e=>{const b=e.target.closest('.ch'); if(!b||b.disabled) return; setSel(selId,b.dataset.v);};
}
function drawFP(){
  chipsFrom('cLevel','fLevel');
  chipsFrom('cSido','fSido',(v)=>SHORT[v]||v,opts=>{const m=new Map(opts);return [['all','전국'],...SIDO_ORDER.filter(x=>m.has(x)).map(x=>[x,x]),...opts.filter(([v])=>v!=='all'&&!SIDO_ORDER.includes(v))];});
  const sido=$('fSido').value, sb=$('cSggBox');
  if(sido==='all'){ sb.hidden=true; }
  else { sb.hidden=false; $('cSggCap').textContent=`${sido} · 시군구 ${$('fSgg').options.length-1-(sido===GJ_SIDO?2:0)}곳`+(sido===GJ_SIDO?' · 광주·전남으로 나눠 볼 수도 있습니다':''); chipsFrom('cSgg','fSgg'); }
  chipsFrom('cType','fType'); chipsFrom('cRural','fRural'); chipsFrom('cGender','fGender');
  chipsFrom('cGroup','fGroup'); chipsFrom('cMetric','fMetric');
  const from=+$('fFrom').value, to=+$('fTo').value, yb=$('cYear');
  yb.innerHTML=years.map(y=>`<button type="button" class="ch ${y>from&&y<to?'in':''}" data-y="${y}" aria-pressed="${y===from||y===to}">${y}</button>`).join('');
  yb.onclick=e=>{const b=e.target.closest('.ch'); if(!b) return; const y=+b.dataset.y;
    if(yrStep===0){ $('fFrom').value=y; $('fTo').value=y; yrStep=1; }
    else { const f=+$('fFrom').value; if(y<f){ $('fTo').value=f; $('fFrom').value=y; } else $('fTo').value=y; yrStep=0; }
    $('fFrom').dispatchEvent(new Event('change')); };
  $('cYearNow').textContent = yrStep===1 ? `${from}년 선택됨 · 끝 연도를 누르세요` : `${from}–${to}`;
}
let model=null;
function render(){
  model = compute();
  drawFP();
  const {f,yrs,list,total} = model;
  const colorOf = i => css(COLORS[i%COLORS.length]);
  // 요약 타일: 합계 기준
  const tot = f.g==='none'||list.length<=1 ? (list[0]?list[0].v:[]) : (total? total.v : null);
  const tiles=$('tiles');
  if(tot && tot.length){
    const a=tot[0], b=tot[tot.length-1], d=(b??0)-(a??0), pct=a? d/a*100 : null;
    const cls=d>0?'up':d<0?'down':'';
    const sign=d>0?'+':'';
    tiles.innerHTML = `
      <div class="k-card tile"><div class="k">${yrs[0]}년 ${metricName(f)}</div><div class="v">${fv(f,a)}</div></div>
      <div class="k-card tile"><div class="k">${yrs[yrs.length-1]}년 ${metricName(f)}</div><div class="v">${fv(f,b)}</div></div>
      <div class="k-card tile"><div class="k">기간 증감</div><div class="v ${cls}">${sign}${f.met==='p'?fmt1(d):fmt(d)}</div></div>
      <div class="k-card tile"><div class="k">증감률</div><div class="v ${cls}">${pct==null?'-':sign+fmt1(pct)+'%'}</div></div>`;
  } else {
    tiles.innerHTML = `<div class="k-card tile" style="grid-column:1/-1"><div class="k">요약</div><div class="v" style="font-size:15px;font-weight:700">비교 기준으로 나눈 항목별 값은 아래 표에서 확인하세요.</div></div>`;
  }
  $('cTitle').textContent = `${describe(f)} · ${metricName(f)} 변화 (${yrs[0]}–${yrs[yrs.length-1]})`;
  $('cUnit').textContent = unit(f);
  $('tTitle').textContent = `${metricName(f)} 표`;
  // 그래프 계열: 상위 8개
  const shown = list.slice(0,8);
  const gnote = model.grades ? '' : (f.met==='n' ? (f.ge!=='all' ? '학년별 줄은 성별을 합계로 둘 때 나옵니다. ' : '학년별 줄은 중학교·고등학교만 골랐을 때 나옵니다. ') : '');
  $('tNote').textContent = gnote + (list.length>8 ? `그래프는 ${yrs[yrs.length-1]}년 값이 큰 8개만 그립니다. 표에는 ${list.length}개가 모두 있습니다.` : '');
  $('hint').textContent = (f.g==='type'||f.ty!=='all') ? '고교 유형은 고등학교에만 있어 학교급이 고등학교로 맞춰집니다.' : '';
  // 범례
  $('legend').innerHTML = shown.map((g,i)=>`<li><button type="button" data-k="${g.label}" aria-pressed="${!state.hidden.has(g.label)}"><span class="sw" style="background:${colorOf(i)}"></span>${g.label}</button></li>`).join('');
  $('legend').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; state.hidden.has(k)?state.hidden.delete(k):state.hidden.add(k); render(); });
  drawChart(shown,yrs,f,colorOf);
  drawTable(list,total,yrs,f);
  drawHS(f);
}

function drawHS(f){
  const body=$('hBody'), title=$('hTitle'), note=$('hNote'), down=$('hDown'); down.hidden=true;
  if(f.sgg==='all'){
    title.textContent='고등학교별 학년 현황';
    note.textContent='';
    body.innerHTML='<p class="hs-empty">시도와 시군구를 고르면 그 지역 고등학교 전체의 학년별 학생 수(전체·남·여)와 학급 수가 여기에 나옵니다.</p>';
    return;
  }
  const yr=f.to;
  const rows=HS.filter(r=>r[0]===yr
    && (f.sido==='all' || r[1]===f.sido)
    && (f.sido==='all' ? (r[1]+'|'+r[2])===f.sgg : sggOK(r[1],r[2],f.sgg))
    && (f.ty==='all' || r[5]===f.ty)
    && (f.ru==='all' || r[6]===f.ru));
  const place=f.sgg.replace('|',' ');
  title.textContent=`${place} 고등학교 ${rows.length}곳 · ${yr}년`;
  note.textContent='기준 연도는 "끝 연도"입니다. 고교 유형·지역 구분 선택도 적용됩니다.';
  if(!rows.length){ body.innerHTML=`<p class="hs-empty">${yr}년에 이 조건에 맞는 고등학교가 없습니다. 끝 연도나 고교 유형을 바꿔 보세요.</p>`; return; }
  const sum=r=>[0,1,2,3].map(k=>r[7+k]+r[11+k]+r[15+k]);
  rows.sort((a,b)=>sum(b)[0]-sum(a)[0] || a[3].localeCompare(b[3],'ko'));
  const cell=v=>`<td>${fmt(v)}</td>`;
  let h='<table class="hs"><thead><tr><th rowspan="2" style="text-align:left;left:0;z-index:3">학교명</th><th rowspan="2">설립</th><th rowspan="2">유형</th><th rowspan="2">지역</th>';
  ['전체 학년','1학년','2학년','3학년'].forEach(t=>{ h+=`<th colspan="4" class="gl">${t}</th>`; });
  h+='</tr><tr>'+[0,1,2,3].map(()=>['학생','남','여','학급'].map((t,i)=>`<th class="${i===0?'gl':''}">${t}</th>`).join('')).join('')+'</tr></thead><tbody>';
  const tot=new Array(16).fill(0);
  rows.forEach(r=>{
    const s=sum(r), vals=[...s,...r.slice(7,19)];
    vals.forEach((v,i)=>tot[i]+=v);
    h+=`<tr><td class="nm">${r[3]}</td><td class="tag">${r[4]}</td><td class="tag">${r[5]}</td><td class="tag">${r[6]==='읍면'?'읍·면':r[6]==='미상'?'-':'동'}</td>`
      +vals.map((v,i)=>`<td class="${i%4===0?'gl':''}">${fmt(v)}</td>`).join('')+'</tr>';
  });
  h+=`<tr class="total"><td class="nm">합계 (${rows.length}곳)</td><td></td><td></td><td></td>`+tot.map((v,i)=>`<td class="${i%4===0?'gl':''}">${fmt(v)}</td>`).join('')+'</tr></tbody></table>';
  body.innerHTML=`<div class="hs-wrap">${h}</div>`;
  down.hidden=false; down.textContent=`고등학교 ${rows.length}곳 엑셀로 내려받기`;
  down.onclick=()=>{
    const G=['전체 학년','1학년','2학년','3학년'], head=[['학교명','설립','유형','지역',...G.flatMap(x=>[x,'','',''])],['','','','',...G.flatMap(()=>['학생','남','여','학급'])]];
    const data=rows.map(r=>{ const s2=sum(r); return [r[3],r[4],r[5],r[6]==='읍면'?'읍·면':r[6]==='미상'?'-':'동',...s2,...r.slice(7,19)]; });
    data.push([`합계 (${rows.length}곳)`,'','','',...tot]);
    window.XlsxLite.download({filename:`${place} 고등학교 ${rows.length}곳_${yr}년.xlsx`, sheet:'고등학교별 학년 현황', title:`${place} 고등학교 ${rows.length}곳 · ${yr}년 공시 (학교알리미 공개용데이터)`, head,
      merges:[[0,0,1,0],[0,1,1,1],[0,2,1,2],[0,3,1,3],[0,4,0,7],[0,8,0,11],[0,12,0,15],[0,16,0,19]], rows:data, widths:[30,7,10,7,...new Array(16).fill(7)], totalRow:true});
  };
  // 두 번째 머리글 줄 고정 위치를 실제 첫 줄 높이에 맞춤(글꼴·화면 크기에 따라 달라짐)
  const r1=body.querySelector('thead tr:first-child th[colspan]');
  if(r1){ const t=r1.offsetHeight; body.querySelectorAll('thead tr:nth-child(2) th').forEach(th=>th.style.top=t+'px'); }
}

function drawChart(series,yrs,f,colorOf){
  const box=$('chartBox'); const W=Math.max(300,box.clientWidth||600), H=W<520?300:380;
  const m={l:W<520?44:54,r:16,t:14,b:28}, iw=W-m.l-m.r, ih=H-m.t-m.b;
  const vis=series.map((s,i)=>({s,i})).filter(o=>!state.hidden.has(o.s.label));
  const all=vis.flatMap(o=>o.s.v.filter(v=>v!=null));
  if(!all.length){ box.innerHTML='<p class="hint" style="padding:40px 0;text-align:center">조건에 맞는 학교가 없습니다. 선택을 바꿔 보세요.</p>'; return; }
  let mn=Math.min(...all), mx=Math.max(...all);
  const zero=$('fZero').checked||state.chart==='bar';
  if(zero) mn=0; else { const pad=(mx-mn)*.08||1; mn-=pad; mx+=pad; }
  const ticks=niceTicks(mn,mx,5); const lo=ticks[0], hi=ticks[ticks.length-1];
  const yS=v=>m.t+ih-(v-lo)/(hi-lo)*ih;
  const N=yrs.length, band=iw/N;
  const xS=i=> state.chart==='bar' ? m.l+band*(i+.5) : (N===1? m.l+iw/2 : m.l+i*iw/(N-1));
  const ink=css('--ink-soft'), grid=css('--line');
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${describe(f)} ${metricName(f)} 그래프">`;
  ticks.forEach(t=>{ const y=yS(t); s+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}" stroke="${grid}" stroke-width="1"/><text x="${m.l-6}" y="${y+4}" text-anchor="end" font-size="11" fill="${ink}">${f.met==='p'?t.toLocaleString('ko-KR'):axisFmt(t)}</text>`; });
  const step=Math.ceil(N/(W<520?5:12));
  yrs.forEach((y,i)=>{ if(i%step===0||i===N-1) s+=`<text x="${xS(i)}" y="${H-8}" text-anchor="middle" font-size="11" fill="${ink}">${y}</text>`; });
  if(state.chart==='bar'){
    const k=vis.length, bw=Math.min(28,(band*.78)/k);
    vis.forEach(({s:ser,i:ci},j)=>{ ser.v.forEach((v,i)=>{ if(v==null) return; const x=xS(i)-bw*k/2+j*bw, y=yS(v);
      s+=`<rect x="${x}" y="${y}" width="${Math.max(1,bw-1)}" height="${Math.max(0,yS(lo)-y)}" fill="${colorOf(ci)}" rx="1"/>`; }); });
  } else {
    vis.forEach(({s:ser,i:ci})=>{
      let d='',pen=false; ser.v.forEach((v,i)=>{ if(v==null){pen=false;return;} d+=(pen?'L':'M')+xS(i).toFixed(1)+' '+yS(v).toFixed(1); pen=true; });
      s+=`<path d="${d}" fill="none" stroke="${colorOf(ci)}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      ser.v.forEach((v,i)=>{ if(v!=null&&(N<=12||i===N-1||i===0)) s+=`<circle cx="${xS(i)}" cy="${yS(v)}" r="${i===N-1?4.2:3}" fill="${css('--surface')}" stroke="${colorOf(ci)}" stroke-width="2"/>`; });
    });
  }
  s+=`<line id="st-guide" x1="0" x2="0" y1="${m.t}" y2="${m.t+ih}" stroke="${ink}" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>`;
  s+=`<rect id="st-hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/></svg><div class="st-tip" id="st-tip" hidden></div>`;
  box.innerHTML=s;
  const hit=$('hit'), guide=$('guide'), tip=$('tip'), svg=box.querySelector('svg');
  const move=e=>{
    const pt=svg.getBoundingClientRect(), scale=W/pt.width, px=(e.clientX-pt.left)*scale;
    let i=state.chart==='bar'? Math.floor((px-m.l)/band) : Math.round((px-m.l)/(N===1?1:iw/(N-1)));
    i=Math.max(0,Math.min(N-1,i));
    guide.setAttribute('x1',xS(i)); guide.setAttribute('x2',xS(i)); guide.setAttribute('visibility','visible');
    tip.innerHTML=`<b>${yrs[i]}년</b>`+vis.map(({s:ser,i:ci})=>`<div><span><i style="background:${colorOf(ci)}"></i>${ser.label}</span><span>${fv(f,ser.v[i])}</span></div>`).join('');
    tip.hidden=false;
    const tw=tip.offsetWidth, left=xS(i)/scale+10; tip.style.left=(left+tw>pt.width? left-tw-20 : left)+'px'; tip.style.top='8px';
  };
  hit.addEventListener('pointermove',move); hit.addEventListener('pointerdown',move);
  hit.addEventListener('pointerleave',()=>{ guide.setAttribute('visibility','hidden'); tip.hidden=true; });
}

function drawTable(list,total,yrs,f){
  const rows=[...list]; if(total) rows.unshift(total);
  const gr = model && model.grades;   // 전체 학생 수 바로 아래에 1·2·3학년 줄
  if(gr && rows.length){ const many=list.length>1; rows.splice(1,0,...[0,1,2].map(k=>({label:`└ ${k+1}학년`+(many?' (전체)':''), v:yrs.map(y=>gr[y]?gr[y][k]:null), grade:true}))); }
  const head=`<tr><th>${f.g==='none'?'조건':'구분'}</th>${yrs.map(y=>`<th>${y}</th>`).join('')}<th>증감</th><th>증감률</th></tr>`;
  const body=rows.map(g=>{
    const a=g.v[0], b=g.v[g.v.length-1];
    const d=(a==null||b==null)?null:b-a, pct=(d==null||!a)?null:d/a*100;
    const cls=d>0?'up':d<0?'down':''; const sg=d>0?'+':'';
    return `<tr class="${g===total?'total':g.grade?'grade':''}"><td>${g.label}</td>${g.v.map(v=>`<td>${fv(f,v)}</td>`).join('')}<td class="${cls}">${d==null?'-':sg+(f.met==='p'?fmt1(d):fmt(d))}</td><td class="${cls}">${pct==null?'-':sg+fmt1(pct)+'%'}</td></tr>`;
  }).join('');
  $('tbl').innerHTML = rows.length? `<thead>${head}</thead><tbody>${body}</tbody>` : '<tbody><tr><td>조건에 맞는 학교가 없습니다.</td></tr></tbody>';
}

const idMap={fLevel:'level',fSido:'sido',fSgg:'sgg',fType:'type',fRural:'rural',fGender:'gender',fFrom:'from',fTo:'to',fGroup:'group',fMetric:'metric'};
Object.keys(idMap).forEach(id=>$(id).addEventListener('change',()=>{
  if(id==='fSido') updateSgg();
  state.hidden.clear();
  normalize(idMap[id]); render();
}));
$('fZero').addEventListener('change',render);
function setChart(k){ state.chart=k; $('bLine').setAttribute('aria-pressed',k==='line'); $('bBar').setAttribute('aria-pressed',k==='bar'); render(); }
$('bLine').onclick=()=>setChart('line'); $('bBar').onclick=()=>setChart('bar');
let rz; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(safeRender,120); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>setTimeout(safeRender,50));
new MutationObserver(()=>setTimeout(safeRender,30)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-skin','data-mode']});


updateSgg(); normalize();
    return {
      render: safeRender,
      set(st) {
        const lv = $('fLevel'); if (st.level && [...lv.options].some(o => o.value === st.level)) lv.value = st.level;
        const sel = $('fSido'), v = st.sido || 'all';
        if ([...sel.options].some(o => o.value === v)) {
          sel.value = v; updateSgg();
          const sg = $('fSgg'); sg.value = (st.sido && st.sgg && [...sg.options].some(o => o.value === st.sgg)) ? st.sgg : 'all';
        }
        if (st.ru !== undefined) $('fRural').value = st.ru === '동' ? '동(도시)' : st.ru === '읍면' ? '읍면' : 'all';
        if (st.gender !== undefined) { $('fGender').value = st.gender || 'all'; if (st.gender && $('fGroup').value === 'gender') $('fGroup').value = 'level'; }
        state.hidden.clear(); normalize('level');
      },
      get() {
        const sido = $('fSido').value === 'all' ? '' : $('fSido').value, sg = $('fSgg').value, ru = $('fRural').value, ge = $('fGender').value;
        return { level: $('fLevel').value, sido, sgg: (sido && sg !== 'all') ? sg : '', ru: ru === '동(도시)' ? '동' : ru === '읍면' ? '읍면' : '', gender: ge === 'all' ? '' : ge };
      }
    };
  }
  return {
    state() { return api ? api.get() : null; },
    show(sido) {
      const status = document.getElementById('st-status'), body = document.getElementById('st-body');
      return load().then(() => {
        if (!api) api = init();
        status.hidden = true; body.hidden = false;
        if (sido !== undefined) api.set(typeof sido === 'string' ? { sido } : sido);
        api.render();
      }).catch(e => { console.error(e); status.textContent = '학생 수 자료를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 열어 주세요.'; });
    }
  };
})();
