// 조세법령정보시스템(taxlaw.nts.go.kr) 신규 해석례·판례·결정례 수집 스크립트
// 사용법:
//   node tax-monitor/scripts/fetch.mjs [--from YYYYMMDD] [--to YYYYMMDD] [--run YYYY-MM-DD] [--dry-run]
//   --from 생략 시 state/seen.json의 lastRunDate(없으면 오늘-lookbackDays)
//   --dry-run: 목록 건수만 확인하고 파일을 쓰지 않음
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://taxlaw.nts.go.kr';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) tax-monitor/1.0';
const QUESTION_CODES = ['01', '02', '03', '04', '15'];
const HIGH_DECISIONS = ['06', '07', '08', '09', '11', '12', '15', '16']; // 경정·인용·일부인용·재조사·국패·일부국패·위헌·헌법불합치

const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
const statePath = join(ROOT, 'state', 'seen.json');
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { lastRunDate: null, docs: {} };

// ---------- 인자 ----------
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry-run');

const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
const dashed = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

const today = new Date();
const to = arg('--to') ?? ymd(today);
const from =
  arg('--from') ??
  state.lastRunDate ??
  ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - config.lookbackDays));
// 같은 날 이미 처리(commit)된 실행이 있으면 리포트를 덮어쓰지 않도록 -2, -3 … 을 붙인다
let runDate = arg('--run') ?? dashed(ymd(today));
for (let n = 2, base = runDate; state.notion?.[runDate]; n++) runDate = `${base}-${n}`;

// ---------- HTTP ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = '';

async function initSession() {
  const res = await fetch(`${BASE}/qt/USEQTJ001M.do`, { headers: { 'User-Agent': UA } });
  cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

async function action(actionId, paramData) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sleep(config.requestDelayMs);
      const res = await fetch(`${BASE}/action.do`, {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: cookie,
        },
        body: new URLSearchParams({ actionId, paramData: JSON.stringify(paramData) }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== 'SUCCESS') throw new Error(`status=${json.status} message=${json.message}`);
      return json.data[actionId];
    } catch (e) {
      lastErr = e;
      await sleep(2000 * attempt);
    }
  }
  throw new Error(`${actionId} 실패: ${lastErr.message}`);
}

// ---------- 목록 ----------
async function listDay(collectionName, day) {
  const data = await action('ASIPDI002PR01', {
    collectionName,
    sortField: 'DCM_RGT_DTM/DESC',
    startCount: 1,
    viewCount: 1000,
    schDtBase: 'FRS_RGT_DTM',
    bltnStrtDt: day,
    bltnEndDt: day,
  });
  const cats = data.top?.[0]?.categoryMap?.SUB_ID_CATEGORY ?? [];
  const total = cats.reduce((s, c) => s + Number(c.count), 0);
  const docs = data.body.map((b) => b.dcm).filter(Boolean);
  return { total, docs };
}

// ---------- 상세 ----------
function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

async function detail(ntstDcmId) {
  const data = await action('ASIQTB002PR01', { dcmDVO: { ntstDcmId } });
  const dvo = data?.dcmDVO;
  if (!dvo) return null;
  const html = (data.dcmHwpEditorDVOList ?? []).map((e) => e.dcmFleByte ?? '').join('');
  const statutes = [...new Set((data.dcmRltnStttList ?? []).map((r) => r.ntstTextNm).filter(Boolean))];
  const body = html ? htmlToText(html) : '';
  const cntn = htmlToText(dvo.ntstDcmCntn ?? '');
  // 해석례의 회신은 HTML 본문(질의 내용)에 없고 ntstDcmCntn에만 있다
  const reply = QUESTION_CODES.includes(dvo.ntstDcmClCd) && cntn && !body.includes(cntn) ? `[회신]\n${cntn}\n\n` : '';
  return {
    fullText: body ? reply + body : cntn,
    statutes,
    keywords: (dvo.ntstDcmMatrCntn ?? '').split('#').map((s) => s.trim()).filter(Boolean),
  };
}

// ---------- 정규화 ----------
function normalize(dcm, collection) {
  const code = dcm.NTST_DCM_CL_CD;
  const source = config.sourceOrg[dcm.NTST_DCM_SRCS_ORGN_CL_CD] ?? '';
  const decision = config.decision[dcm.NTST_DCM_DCS_CL_CD] ?? '';
  const isQuestion = QUESTION_CODES.includes(code);
  const link = `${BASE}${isQuestion ? '/qt/USEQTA002P.do' : '/pd/USEPDA002P.do'}?ntstDcmId=${dcm.DOC_ID}`;

  let hint = 'normal';
  let reason = '';
  if (['54', '55'].includes(dcm.NTST_DCM_SRCS_ORGN_CL_CD) || ['10', '20'].includes(code)) {
    hint = 'high'; reason = `${source || '헌재'} 판단`;
  } else if (dcm.NTST_DCM_SRCS_ORGN_CL_CD === '02') {
    hint = 'high'; reason = '기획재정부 해석';
  } else if (['03', '21'].includes(code)) {
    hint = 'high'; reason = config.docClass[code];
  } else if (!isQuestion && HIGH_DECISIONS.includes(dcm.NTST_DCM_DCS_CL_CD)) {
    hint = 'high'; reason = `납세자 인용 계열 결정(${decision})`;
  }

  return {
    docId: dcm.DOC_ID,
    collection,
    group: isQuestion ? '해석례' : ['05', '06', '07', '08', '11', '12', '13', '14'].includes(code) ? '심판·심사례' : '판례',
    docClassCode: code,
    docClass: config.docClass[code] ?? dcm.NTST_DCM_CL_NM ?? dcm.LBL1_TTL,
    taxType: dcm.NTST_TLAW_CL_NM,
    docNo: dcm.NTST_DCM_DSCM_CNTN,
    replyNo: dcm.NTST_DCM_RPLY_CNTN || '',
    title: dcm.TTL,
    gist: dcm.GIST_CNTN,
    producedDate: dashed(dcm.NTST_DCM_RGT_DT ?? ''),
    registeredAt: dcm.FRS_RGT_DTM,
    sourceOrg: source,
    decision,
    link,
    importanceHint: hint,
    hintReason: reason,
    listContent: (dcm.CNTN ?? '').trim(),
  };
}

// ---------- 실행 ----------
function* days(fromS, toS) {
  for (let d = parseYmd(fromS); d <= parseYmd(toS); d.setDate(d.getDate() + 1)) yield ymd(d);
}

await initSession();
const warnings = [];
const found = new Map();
let listedTotal = 0;

for (const day of days(from, to)) {
  for (const collection of Object.keys(config.collections)) {
    const { total, docs } = await listDay(collection, day);
    listedTotal += total;
    if (docs.length < total) warnings.push(`${day} ${collection}: 목록 ${docs.length}건 < 총 ${total}건`);
    for (const dcm of docs) if (!found.has(dcm.DOC_ID)) found.set(dcm.DOC_ID, normalize(dcm, collection));
  }
}

const all = [...found.values()];
const fresh = all.filter((it) => !state.docs[it.docId]);
const countBy = (items, key) => items.reduce((m, it) => ((m[it[key]] = (m[it[key]] ?? 0) + 1), m), {});

if (dryRun) {
  console.log(JSON.stringify({ from, to, listedTotal, unique: all.length, new: fresh.length,
    byClass: countBy(fresh, 'docClass'), warnings }, null, 2));
  process.exit(0);
}

const runDir = join(ROOT, 'runs', runDate);
mkdirSync(join(runDir, 'docs'), { recursive: true });

for (const it of fresh) {
  let d = null;
  try {
    d = await detail(it.docId);
  } catch (e) {
    warnings.push(`${it.docId} 상세 조회 실패: ${e.message}`);
  }
  let text = d?.fullText || it.listContent || '';
  if (text.length > config.maxFullTextChars) text = `${text.slice(0, config.maxFullTextChars)}\n\n[...이하 생략]`;
  it.statutes = d?.statutes ?? [];
  it.keywords = d?.keywords ?? [];
  it.textLength = text.length;
  it.docFile = `runs/${runDate}/docs/${it.docId}.md`;
  delete it.listContent;
  writeFileSync(
    join(runDir, 'docs', `${it.docId}.md`),
    [
      `# ${it.title}`,
      '',
      `- 구분: ${it.docClass} (${it.group})`,
      `- 세목: ${it.taxType}`,
      `- 문서번호: ${it.docNo}${it.replyNo ? ` / ${it.replyNo}` : ''}`,
      `- 생산일: ${it.producedDate} / 등록: ${it.registeredAt}`,
      `- 출처기관: ${it.sourceOrg || '-'} / 결정: ${it.decision || '-'}`,
      `- 관련조문: ${it.statutes.join(', ') || '-'}`,
      `- 원문: ${it.link}`,
      '',
      '## 요지',
      it.gist || '-',
      '',
      '## 본문',
      text || '(본문 없음)',
      '',
    ].join('\n'),
    'utf8',
  );
}

const collected = {
  runDate, from, to, generatedAt: new Date().toISOString(),
  listedTotal, uniqueListed: all.length, newCount: fresh.length,
  byGroup: countBy(fresh, 'group'), byClass: countBy(fresh, 'docClass'),
  highHints: fresh.filter((it) => it.importanceHint === 'high').length,
  warnings, items: fresh,
};
writeFileSync(join(runDir, 'collected.json'), JSON.stringify(collected, null, 2), 'utf8');

console.log(JSON.stringify({ runDir: `tax-monitor/runs/${runDate}`, from, to, listedTotal,
  new: fresh.length, byGroup: collected.byGroup, highHints: collected.highHints, warnings }, null, 2));
