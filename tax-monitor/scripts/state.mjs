// 처리 상태 관리
//   node tax-monitor/scripts/state.mjs commit <YYYY-MM-DD>   해당 실행분을 처리 완료로 기록(seen.json 갱신)
//   node tax-monitor/scripts/state.mjs notion-done <YYYY-MM-DD> [url]   Notion 업로드 완료 표시
//   node tax-monitor/scripts/state.mjs pending                Notion 업로드가 남은 실행일 목록
//   node tax-monitor/scripts/state.mjs show                   현재 상태 요약
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statePath = join(ROOT, 'state', 'seen.json');
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { lastRunDate: null, docs: {}, notion: {} };
state.notion ??= {};

const save = () => {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
};

const [cmd, runDate, extra] = process.argv.slice(2);

switch (cmd) {
  case 'commit': {
    const collected = JSON.parse(readFileSync(join(ROOT, 'runs', runDate, 'collected.json'), 'utf8'));
    for (const it of collected.items) state.docs[it.docId] = runDate;
    state.lastRunDate = collected.to;
    if (collected.items.length === 0) state.notion[runDate] = { status: 'done', url: null, at: new Date().toISOString() };
    else state.notion[runDate] = { status: 'pending' };
    save();
    console.log(`commit ${runDate}: ${collected.items.length}건 기록, lastRunDate=${state.lastRunDate}`);
    break;
  }
  case 'notion-done': {
    state.notion[runDate] = { status: 'done', url: extra ?? null, at: new Date().toISOString() };
    save();
    console.log(`notion-done ${runDate}`);
    break;
  }
  case 'pending': {
    const runs = existsSync(join(ROOT, 'runs')) ? readdirSync(join(ROOT, 'runs')) : [];
    const pending = runs.filter(
      (d) => existsSync(join(ROOT, 'runs', d, 'summaries.json')) && state.notion[d]?.status === 'pending',
    );
    console.log(JSON.stringify(pending));
    break;
  }
  case 'show':
    console.log(JSON.stringify({ lastRunDate: state.lastRunDate, seen: Object.keys(state.docs).length, notion: state.notion }, null, 2));
    break;
  default:
    console.error('usage: state.mjs commit|notion-done|pending|show <YYYY-MM-DD>');
    process.exit(1);
}
