/* 학교알리미 탐색기 · app.js (v.1111-9)
   데이터: data/meta.json, schools.json, assess.json, curriculum.json  (collector/가 같은 구조로 생성) */
(function () {
  'use strict';

  // ───────── 공통 도우미 ─────────
  const $ = (s, r = document) => r.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') continue; // innerHTML 사용 금지(데이터 안전)
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const fmt = n => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('ko-KR');
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const avg = arr => arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : NaN;
  const norm = t => String(t || '').toLowerCase().replace(/\s+/g, '');
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2200); }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 불가 환경 */ } }
  };

  // 비슷한 말 찾기
  const SYN = [['보고서', '리포트', '소논문', '탐구보고'], ['발표', '프레젠테이션', '구술'], ['토론', '토의', '논쟁'],
    ['포트폴리오', '누적', '모음'], ['실험', '실습', '실험·실습'], ['ai', '인공지능', '디지털', 'ai·디지털'], ['독서', '책', '읽기']];
  function expand(q) {
    const n = norm(q); if (!n) return [];
    const set = new Set([n]);
    SYN.forEach(g => { if (g.some(w => norm(w).includes(n) || n.includes(norm(w)))) g.forEach(w => set.add(norm(w))); });
    return [...set];
  }

  // ───────── 상태 ─────────
  const D = { meta: null, cube: null, schools: [], demo: [], sById: new Map(), assess: [], curri: new Map(), plans: null, status: {}, subjInfo: new Map(), plansReady: false };
  const S = {
    view: 'map', sido: '', sgg: '', gj: '', q: '', metric: 'schools', level: '고', grade: 0, ru: '', gender: '', htype: '',
    a: { group: '', subject: '', cur: '', grade: '', sem: '', methods: [], feats: [], ratio: '', rubric: '', sort: 'evidence', mode: 'cards', limit: 30 },
    c: { subjects: ['미적분Ⅱ', '기하', '역학과 에너지', '화학 반응의 세계'], onlyAll: false, focus: '', preset: '' },
  };
  // 과목 묶음: 화면 사용 예시(계열별로 흔히 함께 살펴보는 과목). 대학이 정한 권장 과목이 아니다.
  const PRESET_GROUPS = [
    { cat: '의약·보건', items: [
      { name: '의학·치의학·한의학', list: ['미적분Ⅱ', '확률과 통계', '물질과 에너지', '화학 반응의 세계', '세포와 물질대사', '생물의 유전'] },
      { name: '약학', list: ['미적분Ⅱ', '화학', '물질과 에너지', '화학 반응의 세계', '세포와 물질대사', '생물의 유전'] },
      { name: '간호·보건', list: ['확률과 통계', '화학', '생명과학', '세포와 물질대사', '생물의 유전', '윤리문제 탐구'] },
      { name: '수의·생명과학', list: ['생명과학', '세포와 물질대사', '생물의 유전', '화학 반응의 세계', '기후변화와 환경생태'] } ] },
    { cat: '공학', items: [
      { name: '기계·항공·자동차', list: ['미적분Ⅱ', '기하', '물리학', '역학과 에너지', '전자기와 양자'] },
      { name: '전기·전자·반도체', list: ['미적분Ⅱ', '기하', '물리학', '전자기와 양자', '물질과 에너지'] },
      { name: '컴퓨터·AI·소프트웨어', list: ['미적분Ⅱ', '기하', '확률과 통계', '인공지능 수학', '실용 통계'] },
      { name: '화공·신소재', list: ['미적분Ⅱ', '화학', '물질과 에너지', '화학 반응의 세계', '역학과 에너지'] },
      { name: '건축·토목·도시', list: ['미적분Ⅱ', '기하', '역학과 에너지', '지구시스템과학', '도시의 미래 탐구'] },
      { name: '환경·에너지', list: ['화학 반응의 세계', '지구시스템과학', '기후변화와 환경생태', '기후변화와 지속가능한 세계', '융합과학 탐구'] },
      { name: '산업·데이터', list: ['미적분Ⅱ', '확률과 통계', '실용 통계', '인공지능 수학', '경제 수학'] } ] },
    { cat: '자연', items: [
      { name: '수학·통계', list: ['미적분Ⅱ', '기하', '확률과 통계', '실용 통계', '수학과제 탐구'] },
      { name: '물리·천문', list: ['미적분Ⅱ', '기하', '역학과 에너지', '전자기와 양자', '행성우주과학'] },
      { name: '화학·생명', list: ['물질과 에너지', '화학 반응의 세계', '세포와 물질대사', '생물의 유전'] },
      { name: '지구·대기·해양', list: ['지구과학', '지구시스템과학', '행성우주과학', '기후변화와 환경생태'] } ] },
    { cat: '상경', items: [
      { name: '경영·회계', list: ['확률과 통계', '경제 수학', '경제', '금융과 경제생활', '실용 통계'] },
      { name: '경제·금융', list: ['미적분Ⅰ', '확률과 통계', '경제 수학', '경제', '금융과 경제생활'] },
      { name: '무역·국제통상', list: ['경제', '국제 관계의 이해', '세계시민과 지리', '심화 영어', '영어 발표와 토론'] } ] },
    { cat: '국제·사회', items: [
      { name: '국제·외교', list: ['국제 관계의 이해', '정치', '세계사', '역사로 탐구하는 현대 세계', '심화 영어', '영어 발표와 토론'] },
      { name: '법·행정·정치', list: ['정치', '법과 사회', '사회와 문화', '윤리와 사상', '사회문제 탐구'] },
      { name: '사회·심리·복지', list: ['사회와 문화', '사회문제 탐구', '현대사회와 윤리', '확률과 통계', '생명과학'] },
      { name: '미디어·언론·광고', list: ['매체 의사소통', '문학과 영상', '독서 토론과 글쓰기', '미디어 영어', '사회와 문화'] } ] },
    { cat: '인문·교육', items: [
      { name: '국어·어문', list: ['화법과 언어', '문학', '주제 탐구 독서', '문학과 영상', '언어생활 탐구'] },
      { name: '영어·외국어', list: ['영어 독해와 작문', '심화 영어', '영미 문학 읽기', '세계 문화와 영어', '영어 발표와 토론'] },
      { name: '역사·철학', list: ['세계사', '동아시아 역사 기행', '역사로 탐구하는 현대 세계', '윤리와 사상', '인문학과 윤리'] },
      { name: '지리·관광', list: ['세계시민과 지리', '한국지리 탐구', '여행지리', '도시의 미래 탐구'] },
      { name: '교육(사범·교대)', list: ['주제 탐구 독서', '독서 토론과 글쓰기', '사회문제 탐구', '윤리문제 탐구', '확률과 통계'] } ] },
  ];

  // URL 해시 ↔ 상태 (링크 공유용)
  function writeHash() {
    const p = new URLSearchParams();
    p.set('v', S.view);
    if (S.sido) p.set('sido', S.sido);
    if (S.sgg) p.set('sgg', S.sgg);
    if (S.gj) p.set('gj', S.gj);
    if (S.q) p.set('q', S.q);
    const a = S.a;
    ['group', 'subject', 'cur', 'grade', 'sem', 'ratio', 'rubric'].forEach(k => a[k] && p.set(k, a[k]));
    if (a.sort !== 'evidence') p.set('sort', a.sort);
    if (a.mode !== 'cards') p.set('mode', a.mode);
    if (a.mode === 'cloud' && a.cloudBy && a.cloudBy !== 'group') p.set('by', a.cloudBy);
    if (a.methods.length) p.set('m', a.methods.join('|'));
    if (a.feats.length) p.set('t', a.feats.join('|'));
    if (S.view === 'curri') { p.set('subj', S.c.subjects.join('|')); if (S.c.focus) p.set('find', S.c.focus); }
    if (S.metric !== 'schools') p.set('metric', S.metric);
    if (S.level !== '고') p.set('level', S.level);
    if (S.grade) p.set('g', S.grade);
    if (S.ru) p.set('ru', S.ru);
    if (S.gender) p.set('sex', S.gender);
    if (S.htype) p.set('ht', S.htype);
    history.replaceState(null, '', '#' + p.toString());
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (!p.has('v')) return;
    S.view = ['map', 'assess', 'curri', 'students', 'stats', 'about'].includes(p.get('v')) ? p.get('v') : 'map'; S.sido = p.get('sido') || ''; S.sgg = p.get('sgg') || ''; S.gj = p.get('gj') === 'split' ? 'split' : ''; S.q = p.get('q') || '';
    ['group', 'subject', 'cur', 'grade', 'sem', 'ratio', 'rubric'].forEach(k => S.a[k] = p.get(k) || '');
    S.a.sort = p.get('sort') || 'evidence';
    S.a.mode = ['cards', 'table', 'cloud'].includes(p.get('mode')) ? p.get('mode') : 'cards';
    S.a.cloudBy = p.get('by') || 'group';
    S.a.methods = p.get('m') ? p.get('m').split('|') : [];
    S.a.feats = p.get('t') ? p.get('t').split('|') : [];
    if (p.get('subj')) S.c.subjects = p.get('subj').split('|');
    S.c.focus = p.get('find') || '';
    S.metric = p.get('metric') || 'schools';
    S.level = ['중', '초'].includes(p.get('level')) ? p.get('level') : '고';
    S.ru = ['동', '읍면'].includes(p.get('ru')) ? p.get('ru') : '';
    S.gender = ['m', 'w'].includes(p.get('sex')) ? p.get('sex') : '';
    S.htype = p.get('ht') || '';
    S.grade = [1, 2, 3].includes(+p.get('g')) ? +p.get('g') : 0;
  }

  // ───────── 광주·전남: 원자료는 「전남광주통합특별시」 하나 → 구(區) 5곳을 광주로 나눠 볼 수 있게 ─────────
  const GJ_SIDO = '전남광주통합특별시', GJ_GU = new Set(['동구', '서구', '남구', '북구', '광산구']);
  const gjPart = n => GJ_GU.has(n.split(' ')[0]) ? '광주' : '전남';
  const partPred = (sido, sel) => sido === GJ_SIDO && (sel === '광주' || sel === '전남') ? (n => gjPart(n) === sel) : null;
  function sggIn(sido, name, sel) { if (!sel) return true; if (name === sel || name.startsWith(sel + ' ')) return true; const f = partPred(sido, sel); return !!(f && f(name)); }
  const gjSplit = () => S.gj === 'split';
  function regionList() {   // 시·도 목록(나눠 보기면 광주·전남을 따로)
    if (!gjSplit()) return D.meta.sido;
    return D.meta.sido.flatMap(sd => sd.name !== GJ_SIDO ? [sd] : [{ id: 'gwangju', name: GJ_SIDO, short: '광주', part: '광주', ids: ['gwangju'] }, { id: 'south-jeolla', name: GJ_SIDO, short: '전남', part: '전남', ids: ['south-jeolla'] }]);
  }
  const natKey = k => k.sido === GJ_SIDO && gjSplit() ? gjPart(k.sgg) : k.sido;   // 시·도 묶음 이름
  const regKey = sd => sd.part || sd.name;

  // ───────── 범위(지역·검색) ─────────
  const sumBy = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  const demoOn = () => !!(D.meta && D.meta.assessSample);
  const assessSchools = () => demoOn() ? D.demo : D.schools;   // 수행평가·개설 과목이 붙는 학교 목록(수집 전에는 가상 학교)
  function inRegion(sc) {
    return (!S.sido || sc.sido === S.sido) && (!S.sgg || sggIn(sc.sido, sc.sigungu, S.sgg) || (sc.sample && S.sgg.startsWith(sc.sigungu)));
  }
  function regionSchools(list) { return (list || D.schools).filter(x => inRegion(x) && schoolOK(x)); }
  function schoolsInScope(ignoreQ, list) {
    const qs = ignoreQ ? [] : expand(S.q);
    return (list || D.schools).filter(sc => inRegion(sc) && schoolOK(sc) && (!qs.length || qs.some(q => norm(sc.name + sc.sigungu + sc.sido + sc.type).includes(q))));
  }
  function regionKey() { return !S.sido ? '전국' : (S.sgg ? S.sido + '|' + S.sgg : S.sido); }
  function sumHist(sido, sgg) {   // 시 이름만 고른 경우(예: 수원시)는 그 아래 구를 모두 더한다
    const H = D.meta.hist || {}, exact = H[sido + '|' + sgg]; if (exact) return exact;
    const pre = sido + '|', out = [];
    Object.keys(H).forEach(k => { if (k.startsWith(pre) && sggIn(sido, k.slice(pre.length), sgg)) H[k].forEach((v, i) => out[i] = (out[i] || 0) + (v || 0)); });
    return out;
  }
  function regionHist() { return S.sgg ? sumHist(S.sido, S.sgg) : ((D.meta.hist && D.meta.hist[regionKey()]) || []); }
  function assessText(r) { return norm(r.subject + r.group + r.areas.map(a => a.name + a.methods.join('') + a.features.join('')).join('')); }

  function filteredAssess() {
    const ids = new Set(regionSchools(assessSchools()).map(x => x.id));
    const qs = expand(S.q), a = S.a;
    let rows = D.assess.filter(r => ids.has(r.schoolId));
    if (qs.length) rows = rows.filter(r => { const t = assessText(r) + norm(D.sById.get(r.schoolId).name); return qs.some(q => t.includes(q)); });
    if (a.group) rows = rows.filter(r => r.group === a.group);
    if (a.subject) rows = rows.filter(r => r.subject === a.subject);
    if (a.cur) rows = rows.filter(r => r.curriculum === a.cur);
    if (a.grade) rows = rows.filter(r => String(r.grade) === a.grade);
    if (a.sem) rows = rows.filter(r => String(r.semester) === a.sem);
    if (a.methods.length) rows = rows.filter(r => a.methods.every(m => r.methods.includes(m)));
    if (a.feats.length) rows = rows.filter(r => a.feats.every(m => r.features.includes(m)));
    if (a.rubric === 'y') rows = rows.filter(r => r.rubric);
    if (a.rubric === 't') rows = rows.filter(r => r.titleFound);
    if (a.ratio) { const [lo, hi] = a.ratio.split('-').map(Number); rows = rows.filter(r => r.ratio >= lo && r.ratio <= hi); }
    const by = {
      evidence: (x, y) => y.evidence - x.evidence || y.areas.length - x.areas.length,
      name: (x, y) => D.sById.get(x.schoolId).name.localeCompare(D.sById.get(y.schoolId).name, 'ko'),
      hi: (x, y) => y.ratio - x.ratio, lo: (x, y) => x.ratio - y.ratio,
    }[a.sort] || (() => 0);
    return rows.slice().sort(by);
  }
  const ST = { ok: 1, subj: 2, nohit: 3, pdf: 4, none: 5, wait: 6 };
  const stOf = sc => D.status[sc.id] || 0;
  const hasPlan = sc => { const c = stOf(sc); return c === ST.ok || c === ST.subj; };
  const stText = c => ({ 1: '수집됨', 2: '과목만 확인', 3: '표를 읽지 못함', 4: 'PDF 공시(미수집)', 5: '공시 파일 없음', 6: '수집 대기' })[c] || '미수집';
  function demoBanner() {   // 수행평가·개설 과목 화면 위쪽의 자료 안내(이 지역의 수집 현황)
    if (demoOn()) return h('div', { class: 'k-card demo-banner' }, h('b', { class: 'k-warn' }, '이 메뉴는 아직 예시 자료입니다. '), '평가계획 첨부파일을 수집하면 실제 자료로 바뀝니다.');
    if (!D.plansReady) return h('div', { class: 'k-card demo-banner' }, '평가계획 자료를 불러오는 중입니다…');
    const sc = regionSchools(D.schools), n = c => sc.filter(x => stOf(x) === c).length, p = D.plans;
    const ok = n(ST.ok), sub = n(ST.subj), pdf = n(ST.pdf), rest = sc.length - ok - sub - pdf;
    return h('div', { class: 'k-card demo-banner plan-banner' }, h('span', { class: 'real-badge' }, '실제 공시 자료'),
      ` 학교알리미 ${p.year}년 ${p.round} 공시 「${p.item}」 첨부 문서에서 자동으로 뽑은 ${p.year}학년도 ${p.semester}학기 자료입니다. `,
      h('b', null, `${S.sgg || S.sido || '전국'} 고등학교 ${fmt(sc.length)}곳 중 ${fmt(ok)}곳 수집`), sub ? ` · 과목만 확인 ${fmt(sub)}곳` : '', ` · PDF 공시(미수집) ${fmt(pdf)}곳 · 그 밖 ${fmt(rest)}곳. `,
      h('span', { class: 'k-muted' }, '자동 추출이라 원문과 다를 수 있습니다. 학교 이름을 눌러 학교알리미 원문을 함께 확인하세요.'));
  }

  // ───────── 학교급·학년·지역 구분·성별·고교 유형 공통 값(지도·통계가 함께 쓴다) ─────────
  const LVK = () => S.level === '중' ? 'ms' : S.level === '초' ? 'es' : 'hs';
  const lvName = () => ({ 고: '고등학교', 중: '중학교', 초: '초등학교' })[S.level] || '고등학교';
  const gradeName = () => S.grade ? S.grade + '학년' : '전체 학년';
  const condText = () => [S.grade ? S.grade + '학년' : '', S.ru ? (S.ru === '동' ? '동 지역' : '읍·면 지역') : '', S.gender ? (S.gender === 'm' ? '남학생' : '여학생') : '', S.level === '고' ? S.htype : ''].filter(Boolean).join(' · ');
  const TYPE_TREE = [{ k: '일반고' }, { k: '자율고', kids: ['자공고', '자사고'] }, { k: '특목고', kids: ['과학고', '외고', '국제고', '예술고', '체육고', '특목고(기타)'] }, { k: '영재학교' }, { k: '특성화고' }, { k: '마이스터고' }];
  const typeKids = k => (TYPE_TREE.find(t => t.k === k) || {}).kids || [];
  const typeMatch = sub => !S.htype || sub === S.htype || typeKids(S.htype).includes(sub);
  const schoolOK = x => x.sample || ((!S.ru || x.rural === (S.ru === '동' ? '동' : '읍·면')) && typeMatch(x.sub));
  const gi = () => S.gender === 'm' ? 1 : S.gender === 'w' ? 2 : 0;
  const stuOf = x => S.grade ? x.g[S.grade - 1][gi()] : (S.gender === 'm' ? x.m : S.gender === 'w' ? x.f : x.students);   // 고등학교 한 곳의 학생 수(선택 조건)
  const clsOf = x => S.grade ? x.g[S.grade - 1][3] : x.classes;
  const inCur = k => (!S.sido || k.sido === S.sido) && (!S.sgg || sggIn(k.sido, k.sgg, S.sgg));
  function fixState() {   // 자료가 없는 조합은 자동으로 풀어 준다
    if (S.level !== '고') { S.htype = ''; if (S.level === '초' || S.gender) S.grade = 0; }
    if (!metricList().includes(S.metric)) S.metric = 'schools';
  }
  // 집계표(cube)를 한 번 훑어 묶음별 연도 값을 만든다. groupFn(지역) → 묶음 이름 또는 null
  function cubeGroup(groupFn) {
    const C = D.cube, lv = LVK(), A = C[lv], W = lv === 'hs' ? 17 : 9, NY = C.years.length, ru = S.ru === '동' ? 0 : S.ru === '읍면' ? 1 : -1, gs = S.grade, g0 = gi(), out = new Map();
    for (let i = 0; i < A.length; i += W) {
      if (ru >= 0 && A[i + 2] !== ru) continue;
      let n, stu = 0, cls = 0, g = null;
      if (lv === 'hs') {
        if (!typeMatch(C.subs[A[i + 3]])) continue;
        n = A[i + 4]; g = [0, 0, 0];
        for (let k = 0; k < 3; k++) { const b = i + 5 + k * 4, v = A[b + g0]; g[k] = v; if (!gs || gs === k + 1) { stu += v; cls += A[b + 3]; } }
      } else {
        n = A[i + 3]; if (lv === 'ms') g = [A[i + 6], A[i + 7], A[i + 8]];
        stu = g0 ? A[i + 3 + g0] : (lv === 'ms' && gs ? A[i + 5 + gs] : A[i + 4] + A[i + 5]);
      }
      const label = groupFn(C.keys[A[i + 1]]); if (label == null) continue;
      let o = out.get(label); if (!o) out.set(label, o = { n: new Array(NY).fill(0), stu: new Array(NY).fill(0), cls: new Array(NY).fill(0), g: [0, 0, 0] });
      const y = A[i]; o.n[y] += n; o.stu[y] += stu; o.cls[y] += cls; if (y === NY - 1 && g) g.forEach((v, k) => o.g[k] += v);
    }
    return out;
  }
  function vals(o) {
    const NY = D.cube.years.length, L = NY - 1; if (!o) o = { n: new Array(NY).fill(0), stu: new Array(NY).fill(0), cls: new Array(NY).fill(0), g: [0, 0, 0] };
    const has = o.n[L] > 0, hs = S.level === '고';
    return { schools: has ? o.n[L] : NaN, students: has ? o.stu[L] : NaN, perClass: hs && !S.gender && o.cls[L] ? Math.round(o.stu[L] / o.cls[L] * 10) / 10 : NaN,
      perSchool: has ? Math.round(o.stu[L] / o.n[L]) : NaN, change: pctChange(o.stu[0], o.stu[L]), hist: o.stu, nHist: o.n, grades: o.g };
  }
  const regNow = () => vals(cubeGroup(k => inCur(k) ? 1 : null).get(1));
  function subRegions() {   // 현재 범위의 하위 지역: 전국→시·도, 시·도→시·군·구, 시(구 있음)→구
    const short = {}; D.meta.sido.forEach(x => short[x.name] = x.short);
    const g = cubeGroup(k => !inCur(k) || k.sido === '미상' ? null : (!S.sido ? (natKey(k) === k.sido ? short[k.sido] : natKey(k)) : k.sgg));
    return [...g].map(([label, o]) => ({ label, r: vals(o) })).filter(x => !isNaN(x.r.schools));
  }
  // 지도·통계 위에 붙는 조건 줄(지역 경로, 학교급, 학년, 지역 구분, 성별)
  function ctxBar() {
    const go = (sido, sgg) => () => { S.sido = sido; S.sgg = sgg; refresh(); };
    const seg = (label, items, cur, on, offFn) => h('span', { class: 'ctx-seg', role: 'group', 'aria-label': label }, h('span', { class: 'ctx-lbl' }, label),
      items.map(([k, t]) => { const off = offFn && offFn(k); return h('button', { type: 'button', class: 'ctx-btn' + (cur === k ? ' on' : ''), 'aria-pressed': cur === k, disabled: off || null, title: off || null, onclick: () => { on(k); fixState(); refresh(); } }, t); }));
    const crumbs = h('span', { class: 'ctx-crumbs' },
      S.sido ? h('button', { type: 'button', onclick: go('', '') }, '전국') : h('b', null, '전국'),
      S.sido ? [' › ', S.sgg ? h('button', { type: 'button', onclick: go(S.sido, '') }, S.sido) : h('b', null, S.sido)] : null,
      S.sgg ? [' › ', h('b', null, S.sgg)] : null,
      S.htype && S.level === '고' ? h('button', { type: 'button', class: 'k-chip', style: 'margin-left:10px', title: '유형 선택 풀기', onclick: () => { S.htype = ''; refresh(); } }, S.htype + ' ×') : null);
    const gradeOff = k => !k ? null : S.level === '초' ? '초등학교는 학년별 자료가 없습니다' : (S.level === '중' && S.gender) ? '중학교는 성별과 학년을 함께 볼 수 없습니다' : null;
    return h('div', { class: 'ctx k-card' }, crumbs,
      seg('학교급', [['고', '고등학교'], ['중', '중학교'], ['초', '초등학교']], S.level, k => { S.level = k; }),
      seg('학년', [[0, '전체'], [1, '1학년'], [2, '2학년'], [3, '3학년']], S.grade, k => { S.grade = k; }, gradeOff),
      seg('지역 구분', [['', '전체'], ['동', '동'], ['읍면', '읍·면']], S.ru, k => { S.ru = k; }),
      seg('성별', [['', '전체'], ['m', '남'], ['w', '여']], S.gender, k => { S.gender = k; if (k && S.level === '중') S.grade = 0; }),
      !S.sido ? seg('광주·전남', [['', '합쳐 보기'], ['split', '나눠 보기']], S.gj, k => { S.gj = k; })
        : S.sido === GJ_SIDO ? seg('광주·전남', [['', '통합'], ['광주', '광주'], ['전남', '전남']], (S.sgg === '광주' || S.sgg === '전남') ? S.sgg : (S.sgg ? null : ''), k => { S.sgg = k; }) : null);
  }
  // 고교 유형(큰 분류 아래에 세부 분류를 접어 넣음). 누르면 그 유형만 보기
  function typeTree(schools) {
    const cnt = {}; schools.forEach(x => cnt[x.sub] = (cnt[x.sub] || 0) + 1);
    const rows = TYPE_TREE.map(t => ({ t, n: t.kids ? t.kids.reduce((a, k) => a + (cnt[k] || 0), 0) : (cnt[t.k] || 0) })), mx = Math.max(1, ...rows.map(x => x.n));
    const line = (k, n, child) => n ? [h('button', { type: 'button', class: 'subj-link tt-name' + (child ? ' child' : '') + (S.htype === k ? ' on' : ''), title: '누르면 이 유형만 봅니다', onclick: () => { S.htype = S.htype === k ? '' : k; refresh(); } }, k.replace('특목고(기타)', '기타')),
      h('span', { class: 'bar' + (child ? ' thin' : '') }, h('i', { style: `width:${n / mx * 100}%;background:var(--c${child ? 2 : 1})` })), h('span', { class: 'val' }, fmt(n))] : [];
    return h('div', { class: 'hbar tt' }, rows.map(({ t, n }) => [line(t.k, n, false), (t.kids || []).map(k => line(k, cnt[k] || 0, true))]));
  }

  // ───────── 좌측 패널 ─────────
  function renderPanel() {
    const crumbs = $('#crumbs'); crumbs.textContent = '';
    const go = (sido, sgg) => () => { S.sido = sido; S.sgg = sgg; refresh(); };
    crumbs.append(S.sido ? h('button', { type: 'button', onclick: go('', '') }, '전국') : h('span', { class: 'here' }, '전국'));
    if (S.sido) { crumbs.append(' › ', S.sgg ? h('button', { type: 'button', onclick: go(S.sido, '') }, S.sido) : h('span', { class: 'here' }, S.sido)); }
    if (S.sgg) crumbs.append(' › ', h('span', { class: 'here' }, S.sgg));
    const L = D.cube.years.length - 1, isHS = S.level === '고';
    const body = $('#panelBody'); body.textContent = '';
    if (!S.sido) {
      const g = cubeGroup(natKey);
      body.append(h('div', { class: 'p-h' }, h('span', null, '시·도 선택'), h('span', null, lvName() + ' 수')),
        h('div', { class: 'region-grid' }, regionList().filter(sd => g.get(regKey(sd)) && g.get(regKey(sd)).n[L]).map(sd => h('button', {
          type: 'button', class: 'region-btn', 'data-sido': sd.id,
          onclick: () => { S.sido = sd.name; S.sgg = sd.part || ''; refresh(); },
          onmouseenter: () => hotRegion(sd, true), onmouseleave: () => hotRegion(sd, false)
        }, h('b', null, sd.short), h('small', null, fmt(g.get(regKey(sd)).n[L]) + '곳')))),
        h('label', { class: 'gj-switch' }, h('input', { type: 'checkbox', checked: gjSplit() || null, onchange: e => { S.gj = e.target.checked ? 'split' : ''; refresh(); } }), ' 광주·전남 나눠 보기'));
    } else {
      const g = cubeGroup(k => k.sido === S.sido ? k.sgg : null), names = [...g.keys()].filter(k => g.get(k).n[L]).sort((a, b) => a.localeCompare(b, 'ko'));
      body.append(h('div', { class: 'p-h' }, h('span', null, '시·군·구'), h('span', null, lvName() + ' 수')), sggPicker(names, k => g.get(k).n[L], go));
    }
    if (!isHS && !S.q) {
      body.append(h('p', { class: 'k-muted', style: 'font-size:13px;margin:14px 4px' }, `${lvName()}는 지역별 합계 자료만 있어 학교 목록은 나오지 않습니다. 학교별 자료는 고등학교에서 볼 수 있습니다.`));
      return;
    }
    const list = schoolsInScope().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (S.sido || S.q || S.htype) {
      body.append(h('div', { class: 'p-h' }, h('span', null, S.q ? `‘${S.q}’ 검색 결과(고등학교)` : (S.htype || '고등학교')), h('span', null, fmt(list.length) + '곳')));
      if (!list.length) body.append(h('div', { class: 'empty' }, '조건에 맞는 고등학교가 없습니다. 검색어나 조건을 바꿔 보세요.'));
      body.append(h('div', { class: 'school-list' }, list.slice(0, 150).map(sc =>
        h('button', { type: 'button', class: 'school-item', onclick: () => openSchool(sc.id) },
          h('span', { class: 'nm' }, sc.name), h('span', { class: 'cnt' }, (S.grade ? S.grade + '학년 ' : '') + (S.gender ? (S.gender === 'm' ? '남 ' : '여 ') : (S.grade ? '' : '학생 ')) + fmt(stuOf(sc)) + '명'),
          h('span', { class: 'meta' }, `${sc.sidoShort} ${sc.sigungu} · ${sc.sub} · ${sc.found} · ${sc.gender}`)))));
      if (list.length > 150) body.append(h('p', { class: 'k-muted', style: 'font-size:12.5px;margin:10px 4px' }, `이름순 150곳만 보입니다. 시·군·구를 고르거나 검색어를 넣어 좁혀 주세요. (전체 ${fmt(list.length)}곳)`));
    } else {
      body.append(h('p', { class: 'k-muted', style: 'font-size:13px;margin:14px 4px' },
        '지도를 누르거나 시·도를 고르면 고등학교 목록이 나옵니다. 검색창에 학교 이름이나 시·군·구를 넣어도 됩니다.'));
    }
  }
  // 시·군·구 고르기: 이름과 학교 수를 나란히, 구가 있는 시는 한 묶음으로
  function sggPicker(names, cnt, go) {
    const it = (k, label, cls) => h('button', { type: 'button', class: cls + (S.sgg === k ? ' on' : (S.sgg && sggIn(S.sido, k, S.sgg) ? ' in' : '')), 'aria-pressed': S.sgg === k, onclick: go(S.sido, k) },
      h('span', null, label), h('b', null, fmt(names.filter(n => sggIn(S.sido, n, k)).reduce((a, n) => a + cnt(n), 0))));
    const group = (head, label, kids, strip) => h('div', { class: 'sgg-grp' }, it(head, label, 'sgg-gh'),
      h('div', { class: 'sgg-sub' }, kids.map(k => it(k, strip ? k.slice(strip.length + 1) : k, 'sgg-it'))));
    const out = [it('', '전체', 'sgg-all')];
    if (S.sido === GJ_SIDO) {
      out.push(group('광주', '광주', names.filter(n => gjPart(n) === '광주')), group('전남', '전남', names.filter(n => gjPart(n) === '전남')));
    } else {
      const city = {}; names.forEach(n => { const i = n.indexOf(' '); if (i > 0) (city[n.slice(0, i)] = city[n.slice(0, i)] || []).push(n); });
      const seen = new Set();
      names.forEach(n => { const c = n.indexOf(' ') > 0 ? n.slice(0, n.indexOf(' ')) : null;
        if (c) { if (!seen.has(c)) { seen.add(c); out.push(group(c, c, city[c], c)); } } else out.push(it(n, n, 'sgg-it')); });
    }
    return h('div', { class: 'sgg-pick' }, out);
  }
  function hotRegion(sd, on) { (sd.ids || [sd.id]).forEach(id => { const p = document.querySelector(`.map-svg path[data-id="${id}"]`); if (p) p.style.stroke = on ? 'var(--ink)' : ''; }); }

  // ───────── 지도 ─────────
  const LABEL_NUDGE = { seoul: [6, -16], incheon: [-34, 4], gyeonggi: [22, 26], sejong: [-8, -14], daejeon: [10, 12],
    daegu: [6, 0], ulsan: [18, 0], busan: [8, 12], 'south-chungcheong': [-12, 0], 'north-chungcheong': [6, -10], 'south-jeolla': [4, -6] };
  const pctChange = (a, b) => a ? Math.round((b - a) / a * 1000) / 10 : NaN;
  const compact = v => (v == null || isNaN(v)) ? '—' : Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + '만' : fmt(v);
  const METRICS = {
    schools: { label: '학교 수', unit: '곳' }, students: { label: '학생 수', unit: '명' }, perClass: { label: '학급당 학생 수', unit: '명' },
    perSchool: { label: '학교당 학생 수', unit: '명' }, change: { label: '10년 학생 수 증감률', unit: '%' },
  };
  const metricList = () => S.level === '고' ? ['schools', 'students', 'perClass', 'change'] : ['schools', 'students', 'perSchool', 'change'];
  const metricTitle = () => [lvName(), condText(), METRICS[S.metric].label].filter(Boolean).join(' · ');
  // 색 단계: 값을 순위로 5등분해 옅은 색 → 진한 색(선명한 대비)
  const RAMP = [15, 36, 58, 80, 100];
  const rampColor = i => i < 4 ? `color-mix(in srgb, var(--accent) ${RAMP[i]}%, var(--surface))` : 'color-mix(in srgb, var(--accent) 82%, var(--ink))';
  function classify(nums) {
    const u = [...new Set(nums)].sort((a, b) => a - b), k = Math.min(5, u.length);
    const cut = []; for (let i = 1; i < k; i++) cut.push(u[Math.floor(i * u.length / k)]);
    const cls = v => { let c = 0; cut.forEach(t => { if (v >= t) c++; }); return k < 5 ? Math.round(c * 4 / Math.max(1, k - 1)) : c; };
    const ranges = {}; nums.forEach(v => { const c = cls(v); const r = ranges[c] || (ranges[c] = [v, v]); r[0] = Math.min(r[0], v); r[1] = Math.max(r[1], v); });
    return { cls, ranges };
  }
  function mapLegend(cl, M, extra) {
    return h('div', { class: 'legend' }, Object.keys(cl.ranges).map(Number).sort((a, b) => a - b).map(c =>
      h('span', { class: 'lg' }, h('i', { style: 'background:' + rampColor(c) }), cl.ranges[c][0] === cl.ranges[c][1] ? compact(cl.ranges[c][0]) : compact(cl.ranges[c][0]) + '~' + compact(cl.ranges[c][1]))),
      h('span', { class: 'k-muted' }, M.unit), h('span', { style: 'margin-left:auto' }, extra));
  }
  let sggLoading = null, lastMapKey = '';
  function loadSgg() {
    if (window.SGG_MAP) return Promise.resolve();
    if (!sggLoading) sggLoading = new Promise((ok, fail) => { const el = document.createElement('script'); el.src = 'assets/sgg-map.js'; el.onload = ok; el.onerror = () => { sggLoading = null; fail(); }; document.head.append(el); });
    return sggLoading;
  }
  function renderMap() {
    const v = $('#view-map'); v.textContent = ''; fixState();
    const zoom = S.sido && D.meta.sido.some(x => x.name === S.sido && x.id !== 'unknown');
    if (zoom && !window.SGG_MAP) loadSgg().then(() => { if (S.view === 'map') refresh(); }, () => {});
    const box = (zoom && window.SGG_MAP && window.SGG_MAP[S.sido]) ? sidoMapBox() : nationalMapBox();
    v.append(ctxBar(),
      h('div', { class: 'view-head' }, h('h1', { class: 'k-display' }, `${S.sgg || S.sido || '전국'} ${S.level === '고' && S.htype ? S.htype : lvName()}`),
        h('span', { class: 'k-muted no-print' }, h('span', { class: 'real-badge' }, '실제 공시 자료'), S.sido ? '시·군·구를 누르면 그 지역으로 좁혀집니다. 다시 누르면 풀립니다.' : '시·도를 누르면 그 지역이 확대되고 시·군·구가 나옵니다.',
          h('button', { type: 'button', class: 'k-btn print-btn', onclick: printPage }, '이 화면 인쇄'))),
      printMeta(),
      h('div', { class: 'map-wrap' }, box, sideSummary()),
      h('p', { class: 'print-foot' }, `자료: 학교알리미 공개용데이터 「성별 학생수」 ${D.meta.year}년 공시 · 제작 : 김진석 (소명여고 교사, EBS 입시정보 대표강사, tedkim0103@naver.com)`));
  }
  // 인쇄용: 고른 조건을 한 줄로 보여 준다(화면에서는 숨김)
  function printMeta() {
    const item = (k, v) => h('span', { class: 'pm' }, h('b', null, k), v);
    return h('div', { class: 'print-meta' }, item('지역', [S.sido || '전국', S.sgg].filter(Boolean).join(' › ')), item('학교급', lvName()),
      item('학년', S.level === '초' ? '전체' : gradeName().replace(' 학년', '')), item('지역 구분', S.ru ? (S.ru === '동' ? '동' : '읍·면') : '전체'), item('성별', S.gender ? (S.gender === 'm' ? '남' : '여') : '전체'),
      S.level === '고' ? item('고교 유형', S.htype || '전체') : null, item('지도 색 기준', METRICS[S.metric].label));
  }
  function printPage() {   // 미리 보기(A4 가로 종이 모양)를 먼저 보여 주고, 거기서 인쇄한다. 어두운 디자인이어도 밝게 바꾼다
    const root = document.documentElement, body = document.body, skin = root.dataset.skin, mode = root.dataset.mode;
    if (body.classList.contains('pv')) return;
    if (skin === 'night') root.dataset.skin = 'base';
    root.dataset.mode = 'light';
    const note = h('span', { class: 'pv-note' }, '');
    const close = () => { body.classList.remove('pv'); bar.remove(); root.style.removeProperty('--pv-zoom'); root.style.removeProperty('--pv-over'); root.dataset.skin = skin; if (mode) root.dataset.mode = mode; else delete root.dataset.mode;
      window.removeEventListener('resize', fit); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const bar = h('div', { class: 'pv-bar', role: 'toolbar', 'aria-label': '인쇄 미리 보기' }, h('b', null, '인쇄 미리 보기'), h('span', { class: 'pv-note' }, 'A4 가로'), note, h('span', { class: 'sp' }),
      h('button', { type: 'button', class: 'go', onclick: () => window.print() }, '인쇄'), h('button', { type: 'button', onclick: close }, '닫기'));
    const fit = () => { const st = $('#stage'), mm = 96 / 25.4, z = Math.min(1, (window.innerWidth - 32) / (297 * mm)); root.style.setProperty('--pv-zoom', z.toFixed(3));
      const over = st.scrollHeight > 210 * mm + 4; root.style.setProperty('--pv-over', over ? 'block' : 'none');
      note.textContent = over ? '· 내용이 1쪽을 넘습니다(빨간 점선 아래는 2쪽)' : '· 1쪽에 모두 들어갑니다'; note.className = 'pv-note' + (over ? ' warn' : ''); };
    body.append(bar); body.classList.add('pv'); window.scrollTo(0, 0);
    window.addEventListener('resize', fit); document.addEventListener('keydown', onKey); setTimeout(fit, 80);
  }
  const mapCaption = () => h('div', { class: 'map-cap' }, h('b', null, '색 기준 '), metricTitle());
  function nationalMapBox() {
    const M = METRICS[S.metric], vals0 = {}, g = cubeGroup(natKey);
    regionList().forEach(sd => { const r = vals(g.get(regKey(sd))); (sd.ids || [sd.id]).forEach((id, i) => { vals0[id] = { sd, v: r[S.metric], n: r.schools, primary: i === 0 }; }); });
    const cl = classify(Object.values(vals0).filter(x => x.primary && x.sd.id !== 'unknown' && !isNaN(x.v)).map(x => x.v));
    const svg = s('svg', { class: 'map-svg', viewBox: window.KOREA_MAP.viewBox, role: 'img', 'aria-label': '시·도별 ' + metricTitle() + ' 지도' });
    const gPaths = s('g'), gPins = s('g');
    svg.append(gPaths, gPins);
    Object.entries(window.KOREA_MAP.paths).forEach(([id, d]) => {
      const info = vals0[id];
      const p = s('path', { d, 'data-id': id, tabindex: 0, role: 'button', 'aria-label': info ? info.sd.name : id });
      p.style.fill = info && !isNaN(info.v) ? rampColor(cl.cls(info.v)) : 'var(--surface-2)';
      const pick = () => { if (!info) return; S.sido = info.sd.name; S.sgg = info.sd.part || ''; refresh(); };
      p.addEventListener('click', pick);
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      p.addEventListener('mousemove', e => tip(e, info ? `${info.sd.part || info.sd.name}\n${M.label}: ${isNaN(info.v) ? '해당 없음' : fmt(info.v) + M.unit}${S.metric === 'schools' ? '' : ` · ${isNaN(info.n) ? 0 : fmt(info.n)}곳`}\n누르면 확대` : id));
      p.addEventListener('mouseleave', () => tip(null));
      gPaths.append(p);
    });
    lastMapKey = '';
    requestAnimationFrame(() => {
      gPaths.querySelectorAll('path').forEach(p => {
        const id = p.dataset.id, info = vals0[id]; if (!info || !info.primary || isNaN(info.v)) return;
        const b = p.getBBox(), nd = (gjSplit() && { gwangju: [0, -2], 'south-jeolla': [14, 30] }[id]) || LABEL_NUDGE[id] || [0, 0];
        const t1 = s('text', { x: 7, y: 13 }, info.sd.short + ' '), t2 = s('tspan', { class: 'n' }, compact(info.v));
        t1.append(t2);
        const rect = s('rect', { height: 18, rx: 9 }), gg = s('g', { class: 'pin' }, rect, t1);
        gPins.append(gg);
        const w = (t1.getComputedTextLength() || (info.sd.short.length * 11 + 30)) + 14;
        rect.setAttribute('width', w);
        gg.setAttribute('transform', `translate(${b.x + b.width / 2 + nd[0] - w / 2},${b.y + b.height / 2 + nd[1] - 9})`);
      });
    });
    return h('div', { class: 'map-box k-card' }, mapCaption(), svg, mapLegend(cl, M, `${D.meta.year}년 공시 · 지도: MapSVG (CC BY 4.0)`));
  }
  function sidoMapBox() {
    const M = METRICS[S.metric], geo = window.SGG_MAP[S.sido], U = new Set(geo.u.map(u => u.n));
    const g = cubeGroup(k => { if (k.sido !== S.sido) return null; if (U.has(k.sgg)) return k.sgg; const f = k.sgg.split(' ')[0]; return U.has(f) ? f : null; });
    const units = geo.u.map(u => { const r = vals(g.get(u.n)); return { u, v: r[S.metric], n: r.schools }; });
    const cl = classify(units.filter(x => !isNaN(x.v)).map(x => x.v));
    const svg = s('svg', { class: 'map-svg sgg' + (lastMapKey !== S.sido ? ' zoom-in' : ''), viewBox: geo.vb, role: 'img', 'aria-label': `${S.sido} 시·군·구별 ${metricTitle()} 지도` });
    lastMapKey = S.sido;
    const gP = s('g'), gL = s('g'); svg.append(gP, gL);
    const pickUnit = n => { S.sgg = S.sgg === n ? '' : n; refresh(); };
    const isOn = n => S.sgg && (S.sgg === n || S.sgg.startsWith(n + ' ') || sggIn(S.sido, n, S.sgg));
    units.forEach(({ u, v, n }) => {
      const p = s('path', { d: u.d, 'data-n': u.n, class: isOn(u.n) ? 'is-on' : '', tabindex: 0, role: 'button', 'aria-label': u.n });
      p.style.fill = isNaN(v) ? 'var(--surface-2)' : rampColor(cl.cls(v));
      p.addEventListener('click', () => pickUnit(u.n));
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickUnit(u.n); } });
      p.addEventListener('mousemove', e => tip(e, `${u.n}\n${M.label}: ${isNaN(v) ? '해당 없음' : fmt(v) + M.unit}${S.metric === 'schools' ? '' : ` · ${isNaN(n) ? 0 : fmt(n)}곳`}`));
      p.addEventListener('mouseleave', () => tip(null));
      gP.append(p);
    });
    const many = units.length > 20;
    units.forEach(({ u, v }) => {
      if (u.off || !u.c || u.c[0] == null || u.a < (many ? 260 : 120)) return;
      const big = u.a > (many ? 1500 : 700), dark = !isNaN(v) && cl.cls(v) >= 3;
      const t = s('text', { x: u.c[0], y: u.c[1] + (big ? -1 : 4), 'text-anchor': 'middle', class: 'sgg-label' + (dark ? ' on-dark' : '') }, u.n);
      if (big) t.append(s('tspan', { x: u.c[0], dy: 13, class: 'n' }, isNaN(v) ? '—' : compact(v)));
      gL.append(t);
    });
    const off = units.filter(x => x.u.off);
    return h('div', { class: 'map-box k-card' },
      h('div', { class: 'map-top' }, h('button', { type: 'button', class: 'k-btn', onclick: () => { S.sido = ''; S.sgg = ''; refresh(); } }, '← 전국 지도'), mapCaption()),
      svg,
      off.length ? h('div', { class: 'chip-row', style: 'margin:4px 0' }, h('span', { class: 'lbl' }, '지도 밖 지역'), off.map(x =>
        h('button', { type: 'button', class: 'k-chip' + (isOn(x.u.n) ? '' : ' is-off'), onclick: () => pickUnit(x.u.n) }, `${x.u.n} ${isNaN(x.v) ? '—' : compact(x.v) + M.unit}`))) : null,
      mapLegend(cl, M, `${D.meta.year}년 공시 · 경계: 통계청 SGIS · vuski/admdongkor (CC BY 4.0)`));
  }
  function metricValueText(r, k) {
    const v = r[k]; if (v == null || isNaN(v)) return '—';
    return k === 'change' ? (v > 0 ? '+' : '') + v + '%' : k === 'perClass' ? v.toFixed(1) : fmt(v);
  }
  function gradeBars(r, color, clickable) {
    const gmax = Math.max(1, ...r.grades);
    return h('div', { class: 'hbar' }, r.grades.map((n, i) => [clickable ? h('button', { type: 'button', class: 'subj-link' + (S.grade === i + 1 ? ' on' : ''), onclick: () => { S.grade = S.grade === i + 1 ? 0 : i + 1; refresh(); } }, (i + 1) + '학년') : h('span', null, (i + 1) + '학년'),
      h('span', { class: 'bar' }, h('i', { style: `width:${n / gmax * 100}%;background:var(--c${S.grade === i + 1 || !S.grade ? color : 8})` })), h('span', { class: 'val' }, fmt(n))]));
  }
  const hasGrades = () => S.level === '고' || (S.level === '중' && !S.gender);
  function sideSummary() {
    const r = regNow(), yrs = D.cube.years, pre = [S.grade ? S.grade + '학년' : '', S.gender ? (S.gender === 'm' ? '남' : '여') : ''].filter(Boolean).join(' ');
    const kLabel = k => k === 'schools' ? (S.level === '고' && S.htype ? S.htype : lvName()) + ' 수' : k === 'change' ? `${yrs[0]}→${yrs[yrs.length - 1]} 학생 수` : (pre ? pre + ' ' : '') + METRICS[k].label;
    const tiles = metricList().map(k => h('button', { type: 'button', class: 'k-card kpi kpi-btn' + (S.metric === k ? ' on' : ''), 'aria-pressed': S.metric === k, title: '누르면 지도 색 기준이 바뀝니다',
      onclick: () => { S.metric = k; refresh(); } },
      h('div', { class: 'v' + (k === 'change' && !isNaN(r.change) ? (r.change < 0 ? ' k-bad' : ' k-good') : '') }, metricValueText(r, k)), h('div', { class: 'l' }, kLabel(k))));
    const stack = [h('p', { class: 'kpi-hint k-muted' }, '숫자 카드를 누르면 지도 색 기준이 바뀝니다.'), h('div', { class: 'kpis' }, tiles)];
    if (hasGrades()) stack.push(h('div', { class: 'k-card k-memo' }, h('div', { class: 'p-h', style: 'margin-top:0' }, h('span', null, (S.gender ? (S.gender === 'm' ? '남학생 ' : '여학생 ') : '') + '학년별 학생 수'), h('span', null, '명')), gradeBars(r, 1, true)));
    if (S.level === '고') stack.push(h('div', { class: 'k-card k-memo' }, h('div', { class: 'p-h', style: 'margin-top:0' }, h('span', null, '고교 유형별 학교 수'), h('span', null, '곳')),
      typeTree(D.schools.filter(x => inRegion(x) && (!S.ru || x.rural === (S.ru === '동' ? '동' : '읍·면')))),
      h('p', { class: 'k-muted', style: 'font-size:11.5px;margin:8px 0 0' }, '유형 이름을 누르면 지도와 목록이 그 유형만 보여 줍니다. 세부 분류는 학교 이름과 설립으로 나눈 것입니다.')));
    return h('div', { class: 'side-stack' }, stack);
  }
  function kpi(v, l, cls) { return h('div', { class: 'k-card kpi' }, h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v), h('div', { class: 'l' }, l)); }
  // 말풍선: 마우스에서는 따라다니고, 손가락(터치)·스크롤·다른 곳 누르기·화면 바뀜에는 바로 사라진다
  let tipTouch = false, tipTimer = 0;
  const hideTip = () => { clearTimeout(tipTimer); const t = document.getElementById('tip'); if (t) t.hidden = true; };
  document.addEventListener('pointerdown', e => { tipTouch = e.pointerType !== 'mouse'; hideTip(); }, true);
  document.addEventListener('touchstart', () => { tipTouch = true; hideTip(); }, { capture: true, passive: true });
  window.addEventListener('scroll', hideTip, { capture: true, passive: true });
  window.addEventListener('resize', hideTip); window.addEventListener('blur', hideTip);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') tipTouch = false; }, { passive: true });
  function tip(e, text) {
    const t = $('#tip'); if (!e) { hideTip(); return; }
    if (tipTouch || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) { hideTip(); return; }   // 터치로 생긴 가짜 마우스 이동은 무시
    t.textContent = ''; text.split('\n').forEach((line, i) => { if (i) t.append(h('br')); t.append(line); });
    t.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - t.offsetWidth - 8), y = Math.min(e.clientY + 14, innerHeight - t.offsetHeight - 8);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }

  // ───────── 수행평가 ─────────
  function sel(id, label, opts, val, on) {
    return h('select', { class: 'k-select', id, 'aria-label': label, onchange: e => on(e.target.value) },
      opts.map(([v, t]) => h('option', { value: v, selected: v === val }, t)));
  }
  function renderAssess() {
    const v = $('#view-assess'); v.textContent = '';
    const a = S.a, set = (k) => val => { a[k] = val; a.limit = 30; if (k === 'group') a.subject = ''; refresh(); };
    const sCnt = new Map(); D.assess.forEach(r => { if (!a.group || r.group === a.group) sCnt.set(r.subject, (sCnt.get(r.subject) || 0) + 1); });
    const subjects = [...sCnt].filter(([n, c]) => c >= (a.group ? 2 : 10) || n === a.subject).map(x => x[0]).sort((x, y) => x.localeCompare(y, 'ko'));
    const toggle = (arr, x) => { const i = arr.indexOf(x); i < 0 ? arr.push(x) : arr.splice(i, 1); a.limit = 30; refresh(); };
    const rows = filteredAssess();
    v.append(
      h('div', { class: 'view-head' }, h('h1', { class: 'k-display' }, '수행평가 사례'),
        h('span', { class: 'k-muted' }, `${S.sgg || S.sido || '전국'} · 교과별 평가계획에서 찾은 수행평가 영역`)),
      demoBanner(),
      h('div', { class: 'filters k-card' },
        sel('fGroup', '교과군', [['', '교과군 전체'], ...D.meta.groups.map(g => [g, g])], a.group, set('group')),
        sel('fSubject', '과목', [['', '과목 전체'], ...subjects.map(x => [x, x])], a.subject, set('subject')),
        sel('fCur', '교육과정', [['', '교육과정 전체'], ['2022', '2022 개정'], ['2015', '2015 개정']], a.cur, set('cur')),
        sel('fGrade', '학년', [['', '학년 전체'], ['1', '1학년'], ['2', '2학년'], ['3', '3학년']], a.grade, set('grade')),
        sel('fSem', '학기', [['', '학기 전체'], ['1', '1학기'], ['2', '2학기']], a.sem, set('sem')),
        sel('fRatio', '반영 비율', [['', '반영 비율 전체'], ['0-20', '20% 이하'], ['21-30', '21~30%'], ['31-40', '31~40%'], ['41-99', '41~99%'], ['100-100', '100%']], a.ratio, set('ratio')),
        sel('fRubric', '근거', [['', '근거 전체'], ['y', '채점 기준표 있음'], ['t', '과제명 확인됨']], a.rubric, set('rubric')),
        sel('fSort', '정렬', [['evidence', '근거가 잘 갖춰진 순'], ['name', '학교 이름순'], ['hi', '반영 비율 높은 순'], ['lo', '반영 비율 낮은 순']], a.sort, set('sort')),
        h('div', { class: 'chip-row', style: 'flex-basis:100%' }, h('span', { class: 'lbl' }, '평가 방법'),
          D.meta.methods.map(m => h('button', { type: 'button', class: 'k-chip' + (a.methods.includes(m) ? '' : ' is-off'), 'aria-pressed': a.methods.includes(m), onclick: () => toggle(a.methods, m) }, m))),
        h('div', { class: 'chip-row', style: 'flex-basis:100%' }, h('span', { class: 'lbl' }, '활동 특징'),
          D.meta.features.map(m => h('button', { type: 'button', class: 'k-chip' + (a.feats.includes(m) ? '' : ' is-off'), 'aria-pressed': a.feats.includes(m), onclick: () => toggle(a.feats, m) }, m)))),
      h('div', { class: 'toolbar' },
        h('span', { class: 'count' }, h('b', null, fmt(rows.length)), '건'),
        h('span', { class: 'k-tabs mode-seg', role: 'group', 'aria-label': '보기 방식' }, [['cards', '카드'], ['table', '표'], ['cloud', '워드 클라우드']].map(([k, t]) =>
          h('button', { type: 'button', class: 'k-chip' + (a.mode === k ? '' : ' is-off'), 'aria-pressed': a.mode === k, onclick: () => { a.mode = k; refresh(); } }, t))),
        h('button', { class: 'k-btn', type: 'button', onclick: () => downloadCSV(rows) }, '엑셀(CSV) 내려받기'),
        h('button', { class: 'k-btn', type: 'button', onclick: copyLink }, '조건 링크 복사'),
        h('button', { class: 'k-btn', type: 'button', onclick: resetAll }, '초기화')));
    if (!rows.length) { v.append(h('div', { class: 'empty k-card' }, '조건에 맞는 사례가 없습니다. 평가 방법·특징 선택을 줄여 보세요.')); return; }
    if (a.mode === 'cloud') { v.append(renderCloud(rows)); return; }
    const shown = rows.slice(0, a.limit);
    if (a.mode === 'table') {
      v.append(h('div', { class: 'k-card k-table-wrap', style: 'padding:0' }, h('table', { class: 'k-table' },
        h('thead', null, h('tr', null, ['학교', '지역', '학년·학기', '과목', '반영', '수행평가 영역(비율)', '평가 방법'].map((t, i) => h('th', { class: i === 4 ? 'k-num' : null }, t)))),
        h('tbody', null, shown.map(r => { const sc = D.sById.get(r.schoolId); return h('tr', null,
          h('td', null, h('button', { type: 'button', class: 'linkish', style: 'border:0;background:none;padding:0;color:var(--accent);font-weight:700;cursor:pointer', onclick: () => openSchool(sc.id) }, sc.name)),
          h('td', null, sc.sidoShort + ' ' + sc.sigungu), h('td', null, `${r.grade || '–'}-${r.semester}`), h('td', null, r.subject),
          h('td', { class: 'k-num k-mono' }, r.ratio + '%'), h('td', null, r.areas.map(x => `${x.name}(${x.ratio})`).join(', ')), h('td', null, r.methods.join(', '))); })))));
    } else {
      v.append(h('div', { class: 'cards' }, shown.map(assessCard)));
    }
    if (rows.length > a.limit) v.append(h('button', { class: 'k-btn more', type: 'button', onclick: () => { a.limit += 30; refresh(); } }, `더 보기 (${fmt(rows.length - a.limit)}건 남음)`));
  }
  function assessCard(r) {
    const sc = D.sById.get(r.schoolId);
    return h('article', { class: 'k-card a-card' },
      h('div', { class: 'sch' }, h('button', { type: 'button', onclick: () => openSchool(sc.id) }, sc.name), ` · ${sc.sidoShort} ${sc.sigungu}`),
      h('h3', null, `${r.subject}`, h('span', { class: 'k-muted', style: 'font-size:12.5px;font-weight:500' }, `  ${r.grade ? r.grade + '학년' : '학년 미상'} ${r.semester}학기 · ${r.curriculum} 개정`)),
      h('div', { class: 'ratio-line' }, h('span', { class: 'k-muted' }, '수행평가'), h('span', { class: 'k-bar' }, h('i', { style: `width:${r.ratio}%` })), h('b', null, r.ratio + '%')),
      h('ul', { class: 'areas' }, r.areas.map(x => h('li', null, h('span', null, x.name), h('span', { class: 'r' }, x.ratio + '%'), h('small', null, x.methods.join(' · '))))),
      h('div', { class: 'tags' }, r.features.map(f => h('span', { class: 'k-chip' }, f)), r.standards.slice(0, 2).map(c => h('span', { class: 'k-chip is-off k-mono' }, c))),
      h('div', { class: 'foot' }, h('span', { title: r.source.file || null }, r.rubric ? '채점 기준 있음' : '채점 기준 미검출'),
        h('span', { title: '근거 갖춤 정도(설계 품질 평가가 아님)' }, '근거 ', h('span', { class: 'ev' }, [1, 2, 3, 4, 5].map(i => h('i', { class: i <= r.evidence ? 'on' : '' }))))));
  }
  function downloadCSV(rows) {
    const head = ['학교', '시도', '시군구', '학교유형', '학년', '학기', '교과군', '과목', '교육과정', '수행평가비율', '영역', '평가방법', '활동특징', '채점기준표', '성취기준', '공시차수'];
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [head.map(q).join(',')].concat(rows.map(r => { const sc = D.sById.get(r.schoolId); return [sc.name, sc.sido, sc.sigungu, sc.type, r.grade, r.semester, r.group, r.subject, r.curriculum, r.ratio,
      r.areas.map(a => `${a.name}(${a.ratio}%)`).join(' / '), r.methods.join(' / '), r.features.join(' / '), r.rubric ? 'O' : '', r.standards.join(' '), r.source.round].map(q).join(','); }));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    window.XlsxLite.saveFile(`수행평가_${S.sgg || S.sido || '전국'}_${rows.length}건.csv`, blob).then(r => toast(r === 'saved' ? 'CSV 파일을 내려받았습니다. 엑셀에서 바로 열 수 있습니다.' : r === 'declined' ? '내려받기를 취소했습니다.' : '내려받지 못했습니다. 브라우저의 다운로드 차단을 확인해 주세요.'));
  }
  function copyLink() {
    writeHash();
    const url = location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('현재 조건 링크를 복사했습니다.'), () => toast('주소창의 링크를 복사해 주세요.'));
  }
  function resetAll() {
    Object.assign(S.a, { group: '', subject: '', cur: '', grade: '', sem: '', methods: [], feats: [], ratio: '', rubric: '', sort: 'evidence', limit: 30 });
    S.q = ''; $('#q').value = ''; refresh();
  }

  // ───────── 워드 클라우드(수행평가 영역명 낱말) ─────────
  const CLOUD_STOP = new Set(['및', '의', '과', '와', '로', '을', '를', '보는', '평가', '수행', '수행평가', '활동', '등']);
  function wordCounts(rows) {
    const m = new Map(); let total = 0;
    rows.forEach(r => r.areas.forEach(a => String(a.name).split(/[\s·,()\/]+/).forEach(w => {
      w = w.trim(); if (w.length < 2 || CLOUD_STOP.has(w)) return;
      m.set(w, (m.get(w) || 0) + 1); total++;
    })));
    return { m, total };
  }
  let _cv;
  function layoutCloud(items, W, H) {   // items: [{w, n, hot}] 큰 것부터. 나선형으로 겹치지 않게 놓는다.
    const ctx = (_cv || (_cv = document.createElement('canvas'))).getContext('2d');
    const fam = getComputedStyle(document.body).fontFamily;
    const mx = Math.max(...items.map(x => x.n)), mn = Math.min(...items.map(x => x.n));
    const size = n => Math.round(14 + 30 * Math.sqrt((n - mn) / ((mx - mn) || 1)));
    const placed = [];
    items.forEach(it => {
      const fs = size(it.n); ctx.font = `700 ${fs}px ${fam}`;
      const w = ctx.measureText(it.w).width + 8, hh = fs * 1.12 + 4;
      for (let t = 0; t < 900; t++) {
        const ang = t * 0.35, rad = 6 * Math.sqrt(t);
        const x = W / 2 + rad * Math.cos(ang) * 1.9 - w / 2, y = H / 2 + rad * Math.sin(ang) * 0.9 - hh / 2;
        if (x < 2 || y < 2 || x + w > W - 2 || y + hh > H - 2) continue;
        if (placed.some(p => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + hh > p.y)) continue;
        placed.push({ x, y, w, h: hh, fs, it }); break;
      }
    });
    return placed;
  }
  function cloudCard(title, rows, base, onPick) {
    const { m, total } = wordCounts(rows);
    const items = [...m].map(([w, n]) => {
      const lift = base && base.total && total ? (n / total) / ((base.m.get(w) || 0) / base.total || 1) : 1;
      return { w, n, lift, hot: !!base && n >= 2 && lift >= 1.25 };
    }).sort((a, b) => b.n - a.n).slice(0, 26);
    const card = h('div', { class: 'k-card k-memo cloud-card' }, h('h2', null, title, h('span', { class: 'k-muted' }, ` ${fmt(rows.length)}건`)));
    if (!items.length) { card.append(h('div', { class: 'empty' }, '사례가 없습니다.')); return card; }
    const W = 420, H = 230, svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': title + ' 수행평가 낱말 구름' });
    layoutCloud(items, W, H).forEach((p, i) => {
      const t = s('text', { x: p.x + p.w / 2, y: p.y + p.h / 2 + p.fs * 0.34, 'text-anchor': 'middle', 'font-size': p.fs, class: 'cw' + (p.it.hot ? ' hot' : ''), tabindex: 0, role: 'button' }, p.it.w);
      if (!p.it.hot) t.style.fill = `var(--c${(i % 6) + 1})`;
      if (base && !p.it.hot) t.style.opacity = .62;
      const pick = () => onPick(p.it.w);
      t.addEventListener('click', pick); t.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      t.addEventListener('mousemove', e => tip(e, `${p.it.w}: ${p.it.n}회` + (base ? `\n전체 대비 ${p.it.lift.toFixed(1)}배` : '')));
      t.addEventListener('mouseleave', () => tip(null));
      svg.append(t);
    });
    card.append(h('div', { class: 'cloud' }, svg));
    if (base) {
      const hot = items.filter(x => x.hot).sort((a, b) => b.lift - a.lift).slice(0, 4).map(x => x.w);
      card.append(h('p', { class: 'cloud-note' }, h('b', null, '특징 낱말 '), hot.length ? hot.join(' · ') : '전체와 비슷합니다'));
    }
    return card;
  }
  function renderCloud(rows) {
    const a = S.a, by = a.cloudBy || 'group';
    const pick = w => { S.q = w; $('#q').value = w; a.mode = 'cards'; a.limit = 30; refresh(); toast(`‘${w}’가 들어간 사례를 보여 줍니다.`); };
    const base = wordCounts(rows);
    const chips = h('div', { class: 'chip-row', style: 'margin-bottom:12px' }, h('span', { class: 'lbl' }, '나누어 보기'),
      [['group', '교과별'], ['region', S.sido ? '시·군·구별' : '지역별'], ['all', '전체 한 장']].map(([k, t]) =>
        h('button', { type: 'button', class: 'k-chip' + (by === k ? '' : ' is-off'), 'aria-pressed': by === k, onclick: () => { a.cloudBy = k; refresh(); } }, t)),
      h('span', { class: 'k-muted', style: 'font-size:12.5px;margin-left:8px' }, by === 'all' ? '글자가 클수록 자주 나온 낱말입니다. 낱말을 누르면 그 사례가 나옵니다.' : '진한 강조색은 그 교과·지역에서 전체보다 1.25배 이상 자주 나온 낱말입니다.'));
    let cards;
    if (by === 'all') cards = [cloudCard(S.sgg || S.sido || '전국', rows, null, pick)];
    else if (by === 'group') cards = D.meta.groups.map(g => cloudCard(g, rows.filter(r => r.group === g), base, pick));
    else {
      const key = S.sido ? 'sigungu' : 'sidoShort', g = {};
      rows.forEach(r => { const k = D.sById.get(r.schoolId)[key]; (g[k] || (g[k] = [])).push(r); });
      cards = Object.entries(g).sort((x, y) => y[1].length - x[1].length).map(([k, rs]) => cloudCard(k, rs, base, pick));
    }
    return h('div', null, chips, h('div', { class: 'cloud-grid' + (by === 'all' ? ' one' : '') }, cards));
  }

  // ───────── 개설 과목 ─────────
  function allCourses() {
    const m = new Map(); // subject -> {group, kind, n(개설 학교 수)}
    if (D.meta.catalog) Object.entries(D.meta.catalog).forEach(([g, ks]) => Object.entries(ks).forEach(([k, list]) => list.forEach(n => m.set(n, { group: g, kind: k, n: 0 }))));
    D.subjInfo.forEach((v, n) => m.set(n, v));
    if (!D.subjInfo.size) D.curri.forEach(c => c.courses.forEach(x => { if (!m.has(x.subject)) m.set(x.subject, { group: x.group, kind: x.kind, n: 1 }); }));
    return m;
  }
  function renderCurri() {
    const v = $('#view-curri'); v.textContent = '';
    const C = S.c, courses = allCourses();
    const toggle = x => { const i = C.subjects.indexOf(x); if (i < 0) { C.subjects.push(x); C.focus = x; } else { C.subjects.splice(i, 1); if (C.focus === x) C.focus = ''; } C.preset = ''; refresh(); };
    const focusOn = x => { C.focus = C.focus === x ? '' : x; refresh(); const el = document.getElementById('finder'); if (el && C.focus) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    const kinds = [['공통', '공통'], ['일반', '일반선택'], ['진로', '진로선택'], ['융합', '융합선택'], ['2015', '2015 개정(3학년)'], ['기타', '그 밖(5곳 이상)']];
    const picker = h('div', { class: 'subj-pick' }, D.meta.groups.map((g, gi) => h('details', { open: gi < 2 ? true : null },
      h('summary', null, g, h('span', { class: 'k-muted', style: 'font-weight:500;font-size:12px' }, '  ' + C.subjects.filter(x => courses.get(x)?.group === g).length + '개 선택')),
      kinds.map(([k, kl]) => { const list = [...courses].filter(([n, i]) => i.group === g && i.kind === k && (k !== '기타' || i.n >= 5 || C.subjects.includes(n))).sort((a, b) => k === '기타' ? b[1].n - a[1].n : 0);
        return list.length ? h('div', { class: 'chip-row' }, h('span', { class: 'lbl' }, kl),
          list.map(([n, i]) => h('button', { type: 'button', class: 'k-chip' + (C.subjects.includes(n) ? '' : ' is-off'), 'aria-pressed': C.subjects.includes(n), title: i.n ? `${fmt(i.n)}곳` : '수집된 학교 없음', onclick: () => toggle(n) }, n))) : null; }))));
    const sc = schoolsInScope(false, assessSchools()).filter(x => demoOn() || hasPlan(x));
    const stat = C.subjects.map(n => { let o = 0, hh = 0; sc.forEach(x => { const c = (D.curri.get(x.id)?.courses || []).find(y => y.subject === n); if (c) c.mode === '학교 개설' ? o++ : hh++; }); return { n, o, hh }; });
    let rows = sc.map(x => {
      const cs = D.curri.get(x.id)?.courses || [];
      const cells = C.subjects.map(n => cs.find(y => y.subject === n) || null);
      return { x, cells, score: cells.filter(c => c && c.mode === '학교 개설').length + cells.filter(c => c && c.mode !== '학교 개설').length * .5 };
    }).sort((p, q) => q.score - p.score || p.x.name.localeCompare(q.x.name, 'ko'));
    if (C.onlyAll) rows = rows.filter(r => r.cells.every(Boolean));
    v.append(
      h('div', { class: 'view-head' }, h('h1', { class: 'k-display' }, '개설 과목 비교'),
        h('span', { class: 'k-muted' }, `${S.sgg || S.sido || '전국'} · ${D.plans ? D.plans.year + '학년도 ' + D.plans.semester + '학기 평가계획에 실린 과목 · 수집된 ' + fmt(sc.length) + '곳 기준' : ''}`)),
      demoBanner(),
      h('div', { class: 'k-card', style: 'margin-bottom:12px' },
        h('div', { class: 'p-h', style: 'margin-top:0' }, h('span', null, '과목 묶음 (계열별 예시)'),
          h('button', { type: 'button', class: 'k-chip is-off', onclick: () => { C.subjects = []; C.focus = ''; C.preset = ''; refresh(); } }, '모두 해제')),
        h('div', { class: 'preset-groups' }, PRESET_GROUPS.map(g => h('div', { class: 'preset-line' }, h('span', { class: 'cat' }, g.cat),
          h('span', { class: 'chip-row' }, g.items.map(p => h('button', { type: 'button', class: 'k-chip' + (C.preset === p.name ? '' : ' is-off'), 'aria-pressed': C.preset === p.name,
            onclick: () => { C.subjects = p.list.slice(); C.preset = p.name; C.focus = ''; refresh(); } }, p.name)))))),
        h('p', { class: 'k-muted', style: 'font-size:12px;margin:8px 0 10px' }, '과목 묶음은 계열별로 함께 살펴볼 만한 과목을 모아 둔 예시입니다. 대학이 정한 권장 과목이 아닙니다. 여기서 「개설」은 이번 학기 평가계획에 그 과목이 실려 있다는 뜻이며, 다른 학기에만 여는 과목은 나오지 않습니다.'),
        picker),
      courseFinder(sc, focusOn),
      h('div', { class: 'stat-grid', style: 'margin-bottom:12px' }, h('div', { class: 'k-card' }, h('h2', null, '선택 과목 개설률'),
        stat.length ? h('div', { class: 'hbar' }, stat.map(t => [h('button', { type: 'button', class: 'subj-link' + (C.focus === t.n ? ' on' : ''), title: '이 과목을 개설한 고등학교 보기', onclick: () => focusOn(t.n) }, t.n), h('span', { class: 'bar', title: `학교 개설 ${t.o}곳, 공동교육과정 ${t.hh}곳` },
          h('i', { style: `width:${pct(t.o, sc.length)}%;background:var(--c1);display:inline-block` }), h('i', { style: `width:${pct(t.hh, sc.length)}%;background:var(--c3);display:inline-block` })),
          h('span', { class: 'val' }, pct(t.o + t.hh, sc.length) + '%')])) : h('div', { class: 'empty' }, '위에서 과목을 골라 주세요.'),
        h('div', { class: 'key' }, h('span', null, h('b', { style: 'color:var(--c1)' }, '■'), ' 학교 개설'), h('span', null, h('b', { style: 'color:var(--c3)' }, '■'), ' 공동교육과정')))),
      h('div', { class: 'toolbar' }, h('span', { class: 'count' }, h('b', null, fmt(rows.length)), '개 학교'),
        h('label', { class: 'k-chip is-off', style: 'cursor:pointer' }, h('input', { type: 'checkbox', id: 'onlyAll', checked: C.onlyAll || null, onchange: e => { C.onlyAll = e.target.checked; refresh(); } }), ' 모두 개설(공동 포함)된 학교만'),
        h('button', { class: 'k-btn', type: 'button', onclick: copyLink }, '조건 링크 복사')),
      h('div', { class: 'key' }, h('span', null, h('b', { class: 'o', style: 'color:var(--good)' }, '●'), ' 학교 개설'), h('span', null, h('b', { style: 'color:var(--warn)' }, '◐'), ' 공동교육과정'), h('span', null, '– 이번 학기 평가계획에 없음'), h('span', null, '숫자는 학년')));
    if (!C.subjects.length) return;
    v.append(h('div', { class: 'k-card k-table-wrap', style: 'padding:0' }, h('table', { class: 'k-table mx' },
      h('thead', null, h('tr', null, h('th', null, '학교'), h('th', null, '지역'), C.subjects.map(n => h('th', { class: 's' }, h('button', { type: 'button', class: 'subj-link' + (C.focus === n ? ' on' : ''), title: '이 과목을 개설한 고등학교 보기', onclick: () => focusOn(n) }, n))))),
      h('tbody', null, rows.slice(0, 200).map(r => h('tr', { class: r.cells.every(c => c && c.mode === '학교 개설') ? 'all' : null },
        h('td', { class: 'nm' }, h('button', { type: 'button', onclick: () => openSchool(r.x.id) }, r.x.name)),
        h('td', null, r.x.sidoShort + ' ' + r.x.sigungu),
        r.cells.map(c => h('td', { class: 'c', title: c ? `${c.mode} · ${c.grade || '?'}학년` : '이번 학기 평가계획에 없음' },
          c ? h('span', { class: c.mode === '학교 개설' ? 'o' : 'h' }, (c.mode === '학교 개설' ? '●' : '◐'), h('sub', { class: 'k-muted', style: 'font-size:10px' }, c.grade || '')) : h('span', { class: 'x' }, '–')))))))));
  }

  function courseFinder(sc, focusOn) {
    const C = S.c, n = C.focus;
    if (!n) return h('div', { class: 'k-card finder', id: 'finder' }, h('b', null, '과목으로 학교 찾기 '), h('span', { class: 'k-muted' }, '과목 이름을 누르면 그 과목을 개설한 고등학교가 여기에 나옵니다.'));
    const hit = sc.map(x => ({ x, c: (D.curri.get(x.id)?.courses || []).find(y => y.subject === n) })).filter(r => r.c)
      .sort((a, b) => (a.c.mode === '학교 개설' ? 0 : 1) - (b.c.mode === '학교 개설' ? 0 : 1) || a.x.sidoShort.localeCompare(b.x.sidoShort, 'ko') || a.x.name.localeCompare(b.x.name, 'ko'));
    const own = hit.filter(r => r.c.mode === '학교 개설').length, name = S.sgg || S.sido || '전국';
    return h('div', { class: 'k-card finder', id: 'finder' },
      h('div', { class: 'view-head', style: 'margin-bottom:8px' }, h('h2', { class: 'k-display', style: 'margin:0;font-size:17px' }, `「${n}」 개설 고등학교 ${fmt(hit.length)}곳`),
        h('span', { class: 'k-muted' }, `${name} ${fmt(sc.length)}곳 중 · 학교 개설 ${own}곳, 공동교육과정 ${hit.length - own}곳  `,
          h('button', { type: 'button', class: 'k-chip is-off', onclick: () => { C.focus = ''; refresh(); } }, '닫기'))),
      hit.length ? h('div', { class: 'k-table-wrap finder-list' }, h('table', { class: 'k-table' },
        h('thead', null, h('tr', null, ['학교', '지역', '유형', '개설 방식', '학년'].map(t => h('th', null, t)))),
        h('tbody', null, hit.map(r => h('tr', null,
          h('td', null, h('button', { type: 'button', class: 'subj-link', onclick: () => openSchool(r.x.id) }, r.x.name)),
          h('td', null, r.x.sidoShort + ' ' + r.x.sigungu), h('td', null, r.x.type),
          h('td', null, h('span', { class: r.c.mode === '학교 개설' ? 'k-good' : 'k-warn' }, r.c.mode)), h('td', null, r.c.grade ? r.c.grade + '학년' : '–'))))))
        : h('div', { class: 'empty' }, '이 지역에는 이 과목을 개설한 학교가 없습니다. 지역을 넓혀 보세요.'));
  }

  // ───────── 통계(실제 자료: 고등학교는 학교별, 중·초등학교는 지역 합계) ─────────
  function lineChart(values, years, label, unit) {
    const W = 360, H = 190, P = { l: 42, r: 14, t: 20, b: 24 }, pts = values.map((v, i) => [i, v]).filter(p => p[1] != null);
    if (!pts.length) return h('div', { class: 'empty' }, '자료가 없습니다.');
    const mx = Math.max(...pts.map(p => p[1])), mn = 0, n = values.length;
    const X = i => P.l + (n === 1 ? 0 : i * (W - P.l - P.r) / (n - 1)), Y = v => P.t + (H - P.t - P.b) * (1 - (v - mn) / ((mx - mn) || 1));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
    [0, .5, 1].forEach(t => { const val = mx * t, y = Y(val); svg.append(s('g', { class: 'grid' }, s('line', { x1: P.l, x2: W - P.r, y1: y, y2: y })), s('text', { x: P.l - 6, y: y + 4, 'text-anchor': 'end' }, compact(Math.round(val)))); });
    svg.append(s('path', { d: pts.map((p, k) => (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(''), fill: 'none', stroke: 'var(--c1)', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
    pts.forEach(([i, val]) => {
      const c = s('circle', { cx: X(i), cy: Y(val), r: i === n - 1 ? 4.5 : 3.2, fill: 'var(--surface)', stroke: 'var(--c1)', 'stroke-width': 2 });
      c.addEventListener('mousemove', e => tip(e, `${years[i]}년: ${fmt(val)}${unit || '명'}`)); c.addEventListener('mouseleave', () => tip(null));
      svg.append(c, s('text', { x: X(i), y: H - 8, 'text-anchor': 'middle' }, String(years[i]).slice(2)));
    });
    const first = pts[0], last = pts[pts.length - 1];
    svg.append(s('text', { x: X(first[0]) + 4, y: Y(first[1]) - 8 }, compact(first[1])), s('text', { x: X(last[0]) - 2, y: Y(last[1]) - 9, 'text-anchor': 'end' }, compact(last[1])));
    return h('div', { class: 'chart' }, svg);
  }
  function countBars(pairs, color, unit, total) {
    const mx = Math.max(1, ...pairs.map(x => Math.abs(x[1])));
    return h('div', { class: 'hbar' }, pairs.map(([k, n]) => [h('span', null, k), h('span', { class: 'bar', title: total ? pct(n, total) + '%' : '' }, h('i', { style: `width:${Math.abs(n) / mx * 100}%;background:${n < 0 ? 'var(--bad)' : color}` })), h('span', { class: 'val' }, (Number.isInteger(n) ? fmt(n) : n.toFixed(1)) + (unit || ''))]));
  }
  function renderStats() {
    const v = $('#view-stats'); v.textContent = ''; fixState();
    const name = S.sgg || S.sido || '전국', isHS = S.level === '고', r = regNow(), yrs = D.cube.years, cond = condText(), gtxt = cond ? cond + ' ' : '';
    const subs = subRegions(), SUB = !S.sido ? '시·도별' : (S.sgg && !partPred(S.sido, S.sgg) ? '구별' : '시·군·구별');
    const top = (key, n) => subs.filter(x => !isNaN(x.r[key])).map(x => [x.label, x.r[key]]).sort((a, b) => b[1] - a[1]).slice(0, n || 18);
    const card = (title, ...kids) => h('div', { class: 'k-card k-memo' }, h('h2', null, title), kids);
    v.append(ctxBar(),
      h('div', { class: 'view-head' }, h('h1', { class: 'k-display' }, `${name} ${lvName()} 통계`),
        h('span', { class: 'k-muted' }, h('span', { class: 'real-badge' }, '실제 공시 자료'), `${D.meta.year}년 공시 · ${isNaN(r.schools) ? 0 : fmt(r.schools)}곳 · ${gtxt}학생 ${isNaN(r.students) ? 0 : fmt(r.students)}명`)));
    if (isNaN(r.schools)) { v.append(h('div', { class: 'empty k-card' }, `이 조건에 해당하는 ${lvName()} 자료가 없습니다. 위쪽 조건을 바꿔 보세요.`)); return; }
    const cards = [card(`${gtxt}학생 수 추이 (${yrs[0]}~${yrs[yrs.length - 1]})`, lineChart(r.hist, yrs, `${name} ${lvName()} ${gtxt}학생 수 추이`)),
      card(`학교 수 추이 (${yrs[0]}~${yrs[yrs.length - 1]})`, lineChart(r.nHist, yrs, `${name} ${lvName()} 수 추이`, '곳'))];
    if (hasGrades()) cards.push(card((S.gender ? (S.gender === 'm' ? '남학생 ' : '여학생 ') : '') + '학년별 학생 수', gradeBars(r, 2, false),
      h('p', { class: 'k-muted', style: 'font-size:12px;margin:8px 0 0' }, '위쪽 학년 단추를 누르면 추이와 지역 비교가 그 학년 기준으로 바뀝니다.')));
    let sc = [];
    if (isHS) {
      sc = regionSchools();
      const count = key => { const m = {}; sc.forEach(x => m[x[key]] = (m[x[key]] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const bins = [['~200', 0, 200], ['201~400', 201, 400], ['401~600', 401, 600], ['601~800', 601, 800], ['801~1000', 801, 1000], ['1001~', 1001, 1e9]].map(([l, a, b]) => [l + '명', sc.filter(x => x.students >= a && x.students <= b).length]);
      cards.push(card('고교 유형별 학교 수', typeTree(D.schools.filter(x => inRegion(x) && (!S.ru || x.rural === (S.ru === '동' ? '동' : '읍·면'))))),
        card('학교 규모(전체 학년 학생 수)별 학교 수', countBars(bins, 'var(--c2)', '곳', sc.length)),
        card('설립·학생 구성', countBars(count('found'), 'var(--c3)', '곳', sc.length), h('div', { style: 'height:10px' }),
          countBars(count('gender').map(([k, n]) => [k === '남녀공학' ? k : k + '학생만', n]), 'var(--c4)', '곳', sc.length),
          h('p', { class: 'k-muted', style: 'font-size:12px;margin:8px 0 0' }, '학생 구성은 재학생 성별로 나눈 것입니다.')));
      if (subs.length > 1) { if (!S.gender) cards.push(card(`${SUB} ${gtxt}학급당 학생 수`, countBars(top('perClass'), 'var(--c5)', '명'))); cards.push(card(`${SUB} ${gtxt}학교당 학생 수`, countBars(top('perSchool'), 'var(--c6)', '명'))); }
    } else if (subs.length > 1) cards.push(card(`${SUB} ${gtxt}학생 수`, countBars(top('students'), 'var(--c1)', '명')), card(`${SUB} ${gtxt}학교당 학생 수`, countBars(top('perSchool'), 'var(--c6)', '명')),
      card(`${SUB} 10년 ${gtxt}학생 수 증감률`, countBars(top('change', 30), 'var(--c5)', '%')));
    v.append(h('div', { class: 'stat-grid' }, cards));
    if (!isHS) { v.append(h('p', { class: 'k-muted', style: 'font-size:12.5px;margin-top:12px' }, `${lvName()}는 지역별 합계 자료만 있어 학급 수와 학교별 표는 제공하지 않습니다.` + (S.level === '초' ? ' 초등학교는 학년별 자료도 없습니다.' : ''))); return; }
    const sorted = sc.slice().sort((a, b) => stuOf(b) - stuOf(a)), big = S.sgg ? sorted : sorted.slice(0, 10);
    v.append(h('div', { class: 'k-card', style: 'margin-top:14px;padding:0' },
      h('div', { class: 'toolbar', style: 'padding:14px 16px 6px;margin:0' }, h('h2', { style: 'margin:0 auto 0 0;font-size:16px', class: 'k-display' }, S.sgg ? `${S.sgg} 고등학교 전체 ${fmt(big.length)}곳 (${gtxt}학생 수 순)` : `${gtxt}학생 수가 많은 고등학교 (상위 10곳 · 시·군·구를 고르면 전체)`),
        h('button', { class: 'k-btn', type: 'button', onclick: () => downloadSchools(sc, name) }, `고등학교 ${fmt(sc.length)}곳 엑셀로 내려받기`)),
      h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-table' },
        h('thead', null, h('tr', null, ['학교', '지역', '유형', '설립', gtxt + '학생 수', (S.grade ? S.grade + '학년 ' : '') + '학급 수', '학급당'].map((t, i) => h('th', { class: i > 3 ? 'k-num' : null }, t)))),
        h('tbody', null, big.map(x => h('tr', null,
          h('td', null, h('button', { type: 'button', class: 'subj-link', onclick: () => openSchool(x.id) }, x.name)),
          h('td', null, x.sidoShort + ' ' + x.sigungu), h('td', null, x.sub), h('td', null, x.found),
          h('td', { class: 'k-num' }, fmt(stuOf(x))), h('td', { class: 'k-num' }, fmt(clsOf(x))), h('td', { class: 'k-num' }, clsOf(x) && !S.gender ? (stuOf(x) / clsOf(x)).toFixed(1) : '—'))))))));
  }
  function downloadSchools(rows, name) {
    const yrs = D.meta.years;
    const head = [['학교명', '시도', '시군구', '고교유형', '세부유형', '설립', '지역구분', '학생구성', '학생수', '남', '여', '학급수', '1학년', '2학년', '3학년', ...yrs.map(y => y + '년')]];
    const body = rows.map(x => [x.name, x.sido, x.sigungu, x.type, x.sub, x.found, x.rural, x.gender, x.students, x.m, x.f, x.classes, x.g[0][0], x.g[1][0], x.g[2][0], ...x.hist.map(v => v == null ? '' : v)]);
    const done = window.XlsxLite.download({ filename: `고등학교_${name}_${rows.length}곳.xlsx`, sheet: '고등학교', title: `${name} 고등학교 ${rows.length}곳 · 학교알리미 공개용데이터 ${D.meta.year}년 공시`, head, rows: body,
      widths: [30, 16, 14, 9, 9, 6, 7, 9, 8, 7, 7, 7, 7, 7, 7, ...yrs.map(() => 7)] });
    Promise.resolve(done).then(r => toast(r === 'saved' ? '엑셀 파일을 내려받았습니다.' : r === 'declined' ? '내려받기를 취소했습니다.' : '내려받지 못했습니다. 브라우저의 다운로드 차단을 확인해 주세요.'));
  }

  // ───────── 자료 안내 ─────────
  function renderAbout() {
    const v = $('#view-about'); v.textContent = '';
    const m = D.meta;
    const sec = (title, ...kids) => h('section', { class: 'k-card k-memo' }, h('h2', { class: 'k-display' }, title), kids);
    v.append(h('div', { class: 'about' },
      h('div', { class: 'view-head' }, h('h1', { class: 'k-display' }, '자료 안내')),
      sec('메뉴별 자료 상태',
        h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-table' }, h('thead', null, h('tr', null, h('th', null, '메뉴'), h('th', null, '상태'), h('th', null, '자료'))),
          h('tbody', null, [['지도 · 학교 목록 · 학교 상세 · 통계', '실제', `학교알리미 공개용데이터 「성별 학생수」 ${m.year}년 공시 고등학교 ${fmt(m.counts.schools)}곳`],
            ['지도 · 통계의 중학교 · 초등학교', '실제', `같은 자료의 지역별 합계(학교 수, 학생 수, 성별, 지역 구분). 학교별 자료와 학급 수는 없고, 학년별 값은 중학교만 있음`],
            ['학생 수', '실제', `같은 자료의 ${m.years[0]}~${m.year}년 초·중·고 전체`],
            ['수행평가 · 개설 과목', '실제', m.plans ? `학교알리미 ${m.plans.year}년 ${m.plans.round} 공시 평가계획 첨부 문서(HWP·HWPX)에서 자동 추출 · 고등학교 ${fmt(m.plans.schools.ok)}곳 · 수행평가 ${fmt(m.counts.assess)}건` : '학교알리미 평가계획 첨부 문서']]
            .map(r => h('tr', null, h('td', null, r[0]), h('td', null, h('span', { class: r[1] === '실제' ? 'real-badge' : 'sample-badge' }, r[1])), h('td', null, r[2]))))))),
      sec('고등학교 자료에 담긴 것',
        h('ul', null,
          h('li', null, '학교명, 시·도, 시·군·구, 고교 유형(일반고·특목고·자율고·특성화고·마이스터고), 설립(공립·사립·국립)'),
          h('li', null, '학년별 학생 수(전체·남·여)와 학급 수, 학급당 학생 수'),
          h('li', null, `${m.years[0]}~${m.year}년 학교별 학생 수 추이`)),
        h('p', null, '출처: ', h('a', { href: 'https://www.schoolinfo.go.kr', target: '_blank', rel: 'noopener' }, '학교알리미(schoolinfo.go.kr)'), ' 공개용데이터')),
      sec('읽을 때 주의할 점',
        h('ul', null,
          h('li', null, '공시에서 제외된 학교는 빠져 있습니다. 지역 합계 추이에는 그사이 문을 닫은 학교의 학생 수도 들어 있습니다.'),
          h('li', null, '광주와 전남은 원자료에서 「전남광주통합특별시」로 합쳐져 있어 지도에서도 한 지역으로 다룹니다.'),
          h('li', null, '마이스터고는 별도 목록과 학교명으로 맞췄고, 종합고는 일반고에 들어 있습니다. 원자료에 주소가 없던 고등학교 5곳은 학교 이름과 연도별 자료를 대조해 해당 시·군·구에 넣었고, 지역을 알 수 없는 중학교 3곳·초등학교 11곳의 합계는 뺐습니다.'),
          h('li', null, '지역 구분(읍·면/동)은 학교 주소로 추정한 값이며 실제 농어촌학교 지정과 다를 수 있습니다.'),
          h('li', null, '학생 구성(남·여·공학)은 재학생 성별로 나눈 것이라 학교의 공식 구분과 다를 수 있습니다.'),
          h('li', null, '고교 세부 유형은 원자료에 없어 학교 이름과 설립으로 나눴습니다. 과학고·외고·국제고·예술고·체육고·영재학교는 이름으로, 자사고(사립)·자공고(공립)는 설립으로 구분합니다.'),
          h('li', null, '중학교의 전체 학생 수는 남녀 합계이고, 학년별 값을 더한 것과 조금 다를 수 있습니다.'))),
      sec('수행평가·개설 과목 자료',
        h('ul', null,
          h('li', null, '학교알리미 공시 「4-가. 교과별(학년별) 교수·학습 및 평가계획」에 학교가 올린 첨부 문서를 읽어, 과목마다 「평가의 종류와 반영 비율」 표에서 수행평가 영역 이름과 비율을 뽑았습니다.'),
          h('li', null, m.plans ? `${m.plans.year}학년도 ${m.plans.semester}학기(${m.plans.round} 공시) 기준이며 수집일은 ${m.plans.collected}입니다. 수행평가를 뽑은 학교 ${fmt(m.plans.schools.ok)}곳, 과목만 확인한 학교 ${fmt(m.plans.schools.subj)}곳, 표를 읽지 못한 학교 ${fmt(m.plans.schools.nohit)}곳, PDF로만 공시해 수집하지 못한 학교 ${fmt(m.plans.schools.pdf)}곳, 공시 파일이 없는 학교 ${fmt(m.plans.schools.none)}곳입니다.` : ''),
          h('li', null, 'HWP·HWPX 문서만 읽었습니다. PDF는 표 구조가 남아 있지 않아 같은 정확도로 읽을 수 없어 이번에는 뺐습니다.'),
          h('li', null, '「개설 과목」은 이번 학기 평가계획에 실린 과목입니다. 다른 학기에만 여는 과목과 공동교육과정 일부는 빠질 수 있습니다.'),
          h('li', null, '평가 방법·활동 특징은 영역 이름과 평가 방법 칸의 낱말로 나눈 것이고, 「근거」 점수는 채점 기준·성취기준·영역 이름이 문서에 갖춰진 정도일 뿐 평가의 질을 뜻하지 않습니다.'),
          h('li', null, '자동 추출이라 학교 문서와 다를 수 있습니다. 중요한 판단에는 반드시 학교알리미 원문을 확인하세요.'),
          h('li', null, '출처: 학교알리미(한국교육학술정보원) 공시 자료. 원 공시 화면에는 공공누리 「출처표시+변경금지」 표시가 있습니다. 이 사이트는 문서를 옮겨 싣지 않고 과목·영역 이름·비율 같은 사실 정보만 찾아보기 쉽게 정리해 원문으로 안내합니다.'))),
      sec('현재 자료',
        h('ul', null, h('li', null, `고등학교 ${fmt(m.counts.schools)}곳 · 학생 ${fmt(m.counts.students)}명 (${m.year}년 공시)`),
          h('li', null, `수행평가 ${fmt(m.counts.assess)}건 · 과목 목록을 확인한 학교 ${fmt(m.counts.curriculum)}곳`),
          h('li', null, '자료 만든 날: ' + new Date(m.generated).toLocaleString('ko-KR')))),
      sec('만든 사람·문의',
        h('p', null, '제작 : 김진석 (소명여고 교사, EBS 입시정보 대표강사, tedkim0103@naver.com)'),
        h('p', { class: 'k-muted' }, '오류 신고나 삭제 요청은 위 운영자에게 알려 주세요. 시·도 지도: MapSVG South Korea (CC BY 4.0). 시·군·구 경계: 통계청 SGIS 행정구역 경계를 가공한 vuski/admdongkor ver20261001 (CC BY 4.0). 글꼴: G마켓 산스, 학교안심 바른돋움.'))));
  }

  // ───────── 학교 상세 ─────────
  function openSchool(id) {
    const sc = D.sById.get(id); if (!sc) return;
    const body = $('#sheetBody'); body.textContent = '';
    const yrs = D.meta.years, first = sc.hist.findIndex(x => x != null), ch = first >= 0 ? pctChange(sc.hist[first], sc.students) : NaN;
    body.append(
      h('h2', { id: 'sheetTitle', class: 'k-display' }, sc.name),
      h('div', { class: 'k-muted' }, `${sc.sido} ${sc.sigungu} · ${sc.sub === sc.type ? sc.type : sc.type + '(' + sc.sub + ')'} · ${sc.found} · ${sc.gender}` + (sc.rural === '읍·면' ? ' · 읍·면 지역' : '')),
      h('div', { class: 'kpis', style: 'margin-top:14px;grid-template-columns:repeat(3,1fr)' },
        kpi(fmt(sc.students), '학생 수'), kpi(fmt(sc.classes), '학급 수'), kpi(sc.classes ? (sc.students / sc.classes).toFixed(1) : '—', '학급당 학생 수')),
      h('h3', null, `학년별 현황 (${D.meta.year}년 공시)`),
      h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-table' },
        h('thead', null, h('tr', null, ['학년', '학생', '남', '여', '학급', '학급당'].map((t, i) => h('th', { class: i ? 'k-num' : null }, t)))),
        h('tbody', null, sc.g.map((g, i) => h('tr', null, h('td', null, (i + 1) + '학년'), g.map(x => h('td', { class: 'k-num' }, fmt(x))), h('td', { class: 'k-num' }, g[3] ? (g[0] / g[3]).toFixed(1) : '—'))),
          h('tr', null, h('td', null, h('b', null, '합계')), [sc.students, sc.m, sc.f, sc.classes].map(x => h('td', { class: 'k-num' }, h('b', null, fmt(x)))), h('td', { class: 'k-num' }, sc.classes ? (sc.students / sc.classes).toFixed(1) : '—'))))),
      h('h3', null, `학생 수 추이` + (isNaN(ch) ? '' : ` · ${yrs[first]}년 대비 ${ch > 0 ? '+' : ''}${ch}%`)),
      lineChart(sc.hist, yrs, sc.name + ' 학생 수 추이'),
      planBlock(sc),
      h('div', { class: 'toolbar', style: 'margin-top:16px' },
        h('button', { class: 'k-btn k-primary', type: 'button', onclick: () => { S.sido = sc.sido; S.sgg = sc.sigungu; S.level = '고'; closeSheet(); setView('stats'); } }, sc.sigungu + ' 통계 보기'),
        h('a', { class: 'k-btn', target: '_blank', rel: 'noopener', href: sc.alimi ? 'https://www.schoolinfo.go.kr/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=' + encodeURIComponent(sc.alimi) : 'https://www.schoolinfo.go.kr/ei/ss/pneiss_a03_s0.do' },
          sc.alimi ? '학교알리미에서 이 학교 보기' : '학교알리미에서 찾기')));
    $('#sheet').hidden = false; $('#sheetClose').focus();
  }
  function planBlock(sc) {   // 학교 상세의 평가계획(수행평가·과목) 부분
    if (demoOn() || !D.plansReady) return null;
    const p = D.plans, c = stOf(sc), rs = D.assess.filter(r => r.schoolId === sc.id).sort((a, b) => a.grade - b.grade || a.group.localeCompare(b.group, 'ko') || a.subject.localeCompare(b.subject, 'ko'));
    const cs = (D.curri.get(sc.id)?.courses || []).slice().sort((a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject, 'ko'));
    const head = h('h3', null, `${p.year}학년도 ${p.semester}학기 평가계획 `, h('span', { class: c === ST.ok ? 'real-badge' : 'sample-badge' }, stText(c)));
    if (!rs.length && !cs.length) return h('div', null, head, h('p', { class: 'k-muted', style: 'font-size:13px' },
      c === ST.pdf ? '이 학교는 평가계획을 PDF로 공시해 아직 수집하지 못했습니다. 아래 학교알리미 버튼에서 원문을 볼 수 있습니다.'
        : c === ST.nohit ? '공시 문서는 읽었지만 반영 비율 표의 모양이 달라 자동으로 뽑지 못했습니다. 학교알리미 원문을 확인하세요.'
        : '이번 공시에서 읽을 수 있는 평가계획 문서를 찾지 못했습니다.'));
    return h('div', null, head,
      rs.length ? h('div', { class: 'k-table-wrap plan-list' }, h('table', { class: 'k-table' }, h('thead', null, h('tr', null, h('th', null, '학년'), h('th', null, '과목'), h('th', { class: 'k-num' }, '수행'), h('th', null, '수행평가 영역(비율)'))),
        h('tbody', null, rs.map(r => h('tr', null, h('td', null, r.grade || '–'), h('td', null, r.subject), h('td', { class: 'k-num k-mono' }, r.ratio + '%'), h('td', null, r.areas.map(a => `${a.name}(${a.ratio})`).join(', '))))))) : null,
      cs.length ? h('div', { class: 'kind-block' }, h('b', null, `평가계획에 실린 과목 ${cs.length}개`),
        h('div', { class: 'tags' }, [1, 2, 3, 0].map(g => { const l = cs.filter(x => x.grade === g); return l.length ? h('div', { style: 'margin:4px 0' }, h('span', { class: 'k-muted', style: 'font-size:12px;margin-right:6px' }, g ? g + '학년' : '학년 미상'), l.map(x => h('span', { class: 'k-chip is-off' }, x.subject))) : null; }))) : null,
      h('p', { class: 'k-muted', style: 'font-size:12px;margin:6px 0 0' }, '공시 문서에서 자동으로 뽑은 값입니다. 정확한 내용은 학교알리미 원문으로 확인하세요.'));
  }
  function expandPlans(p) {   // plans.json(줄인 표기)을 화면에서 쓰는 모양으로 푼다
    const M = p.methods, F = p.features, nb = s => s.replace(/\s/g, '').length;
    D.plans = p; D.status = p.status || {}; D.subjInfo = new Map(p.subjects.map(s => [s[0], { group: s[1], kind: s[2], n: s[4] || 0 }]));
    D.assess = p.rows.map((r, i) => { const s = p.subjects[r[2]], areas = r[6].map(a => ({ name: a[0], ratio: a[1], methods: a[2].map(k => M[k]), features: [] }));
      const titled = areas.every(a => nb(a.name) >= 4), fl = (p.files && p.files[r[0]]) || [];
      return { id: 'A' + i, schoolId: r[0], year: p.year, grade: r[1], semester: p.semester, group: s[1], subject: s[0], curriculum: r[1] === 3 ? '2015' : r[1] ? '2022' : (s[3] || '2022'), ratio: r[3], areas,
        methods: [...new Set(areas.flatMap(a => a.methods))], features: r[7].map(k => F[k]), rubric: !!r[4], titleFound: titled, standards: r[5],
        evidence: Math.min(5, 1 + (r[4] ? 1 : 0) + (titled ? 1 : 0) + (r[5].length ? 1 : 0) + (areas.length > 1 ? 1 : 0)), source: { item: p.item, round: p.round, file: fl[r[8]] || '' } }; });
    D.curri = new Map(Object.keys(p.courses).map(sid => [sid, { schoolId: sid, courses: p.courses[sid].map(c => { const s = p.subjects[c[0]]; return { group: s[1], kind: s[2], subject: s[0], grade: c[1], mode: c[2] ? '공동교육과정' : '학교 개설' }; }) }]));
    D.plansReady = true;
  }
  function closeSheet() { $('#sheet').hidden = true; }

  // ───────── 앱 설치(PWA) ─────────
  let deferred = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function setupInstall() {
    const btn = $('#installBtn');
    if (isStandalone()) return;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
    window.addEventListener('appinstalled', () => { btn.hidden = true; toast('앱을 설치했습니다.'); });
    if (isIOS()) btn.hidden = false;
    btn.addEventListener('click', async () => {
      if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; if (r.outcome === 'accepted') btn.hidden = true; return; }
      const body = $('#sheetBody'); body.textContent = '';
      body.append(h('h2', { id: 'sheetTitle', class: 'k-display' }, '앱으로 설치하기'),
        h('p', null, '홈 화면에 아이콘이 생기고, 주소창 없이 앱처럼 열립니다. 한 번 연 자료는 인터넷이 없어도 볼 수 있습니다.'),
        h('h3', null, '아이폰·아이패드 (사파리)'), h('ol', { class: 'install-steps' }, h('li', null, '아래쪽 공유 버튼(□↑)을 누릅니다.'), h('li', null, '「홈 화면에 추가」를 누릅니다.'), h('li', null, '오른쪽 위 「추가」를 누릅니다.')),
        h('h3', null, '안드로이드 (크롬·삼성 인터넷)'), h('ol', { class: 'install-steps' }, h('li', null, '오른쪽 위 ⋮ 메뉴를 엽니다.'), h('li', null, '「앱 설치」 또는 「홈 화면에 추가」를 누릅니다.')),
        h('h3', null, 'PC (크롬·엣지)'), h('ol', { class: 'install-steps' }, h('li', null, '주소창 오른쪽의 설치 아이콘(⊕)을 누릅니다.')));
      $('#sheet').hidden = false;
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ───────── 화면 갱신 ─────────
  const RENDER = { map: renderMap, assess: renderAssess, curri: renderCurri, students: renderStudents, stats: renderStats, about: renderAbout };
  let pushStudents = true;   // 학생 수 화면에 들어갈 때 지도·통계에서 고른 지역·학교급·지역 구분·성별을 넘겨준다
  function renderStudents() {
    window.Students.show(pushStudents ? { level: S.level, sido: S.sido, sgg: S.sgg, ru: S.ru, gender: S.gender } : undefined); pushStudents = false;
  }
  function pullStudents() {   // 학생 수 화면에서 바꾼 조건을 지도·통계로 가져온다
    const st = window.Students.state && window.Students.state(); if (!st) return;
    if (st.sido !== S.sido) { S.sido = st.sido; S.sgg = st.sgg; } else if (st.sgg) S.sgg = st.sgg;
    if (['고', '중', '초'].includes(st.level)) S.level = st.level;
    S.ru = st.ru; S.gender = st.gender; fixState();
  }
  function setView(v) { if (S.view === 'students' && v !== 'students') pullStudents(); if (v === 'students' && S.view !== 'students') pushStudents = true; S.view = v; refresh(); $('#stage').scrollTop = 0; }
  function refresh() {
    document.querySelectorAll('.main-tabs .k-tab').forEach(b => b.setAttribute('aria-selected', b.dataset.view === S.view));
    document.querySelectorAll('.view').forEach(x => x.hidden = x.id !== 'view-' + S.view);
    $('.shell').classList.toggle('no-panel', S.view === 'students');
    $('#sampleBadge').hidden = !(demoOn() && (S.view === 'assess' || S.view === 'curri'));
    hideTip(); renderPanel(); RENDER[S.view](); writeHash();
    $('#qClear').hidden = !S.q;
  }

  async function boot() {
    readHash();
    const skin = $('#skinSelect');
    skin.value = document.documentElement.dataset.skin || 'bluememo';
    skin.addEventListener('change', () => { document.documentElement.dataset.skin = skin.value; store.set('skin', skin.value); });
    document.querySelectorAll('.main-tabs .k-tab').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    const q = $('#q'); q.value = S.q;
    let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.q = q.value.trim(); S.a.limit = 30; refresh(); }, 180); });
    $('#qClear').addEventListener('click', () => { q.value = ''; S.q = ''; refresh(); q.focus(); });
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
    if (window.matchMedia('(max-width: 880px)').matches) { const p = $('#panel'), t = $('#panelToggle'); p.classList.add('is-folded'); t.textContent = '목록 펼치기'; t.setAttribute('aria-expanded', 'false'); }   // 휴대폰에서는 지도가 첫 화면에 보이도록 목록을 접어 둔다
    $('#panelToggle').addEventListener('click', e => { const p = $('#panel'); const f = p.classList.toggle('is-folded'); e.target.textContent = f ? '목록 펼치기' : '목록 접기'; e.target.setAttribute('aria-expanded', !f); });
    setupInstall();
    try {
      const get = f => fetch('data/' + f, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
      const [meta, schools] = await Promise.all(['meta.json', 'schools.json'].map(get));
      const cube = await get('cube.json'); cube.keys = cube.keys.map(k => { const i = k.indexOf('|'); return { sido: k.slice(0, i), sgg: k.slice(i + 1) }; });
      D.cube = cube;
      D.meta = meta; D.schools = schools;
      schools.forEach(x => D.sById.set(x.id, x));
      refresh();
      // 평가계획 자료는 크기가 커서 첫 화면을 그린 뒤에 받는다
      get('plans.json').then(p => p.parts ? Promise.all(p.parts.map(get)).then(rs => { p.rows = [].concat(...rs); return p; }) : p).then(p => { expandPlans(p); refresh(); }).catch(() => { D.plans = { year: meta.year, semester: 2, round: '', item: '', subjects: [] }; D.plansReady = true; refresh(); toast('평가계획 자료를 불러오지 못했습니다.'); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (S.view === 'assess' && S.a.mode === 'cloud') refresh(); });
    } catch (e) {
      $('#stage').textContent = '';
      $('#stage').append(h('div', { class: 'k-card empty' }, '자료 파일을 불러오지 못했습니다. data 폴더가 사이트와 함께 올라가 있는지 확인하세요. (', String(e.message || e), ')'));
    }
  }
  boot();
})();
