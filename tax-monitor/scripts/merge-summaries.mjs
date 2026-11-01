// 요약 파트 파일(runs/<날짜>/summaries/part-*.json)을 summaries.json으로 병합하고 누락을 검사
//   node tax-monitor/scripts/merge-summaries.mjs <YYYY-MM-DD>
//   node tax-monitor/scripts/merge-summaries.mjs <YYYY-MM-DD> --batches 15   요약 배치(docId 목록) 출력
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [runDate, flag, size] = process.argv.slice(2);
const runDir = join(ROOT, 'runs', runDate);
const collected = JSON.parse(readFileSync(join(runDir, 'collected.json'), 'utf8'));

if (flag === '--batches') {
  // 중요 후보를 먼저, 같은 구분끼리 묶어서 배치 구성
  const n = Number(size ?? 15);
  const items = [...collected.items].sort(
    (a, b) => (a.importanceHint === b.importanceHint ? a.group.localeCompare(b.group) : a.importanceHint === 'high' ? -1 : 1),
  );
  const batches = [];
  for (let i = 0; i < items.length; i += n) batches.push(items.slice(i, i + n).map((it) => it.docId));
  console.log(JSON.stringify(batches));
  process.exit(0);
}

const partDir = join(runDir, 'summaries');
const parts = existsSync(partDir) ? readdirSync(partDir).filter((f) => f.endsWith('.json')) : [];
const byId = new Map();
for (const f of parts) {
  for (const s of JSON.parse(readFileSync(join(partDir, f), 'utf8'))) byId.set(s.docId, s);
}

const merged = collected.items.map((it) => ({ ...it, summary: byId.get(it.docId) ?? null }));
const missing = merged.filter((m) => !m.summary).map((m) => m.docId);
writeFileSync(join(runDir, 'summaries.json'), JSON.stringify({ ...collected, items: merged }, null, 2), 'utf8');

console.log(JSON.stringify({
  total: merged.length,
  summarized: merged.length - missing.length,
  high: merged.filter((m) => m.summary?.importance === 'high').length,
  missing,
}));
