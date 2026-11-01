// Renders one infographic card from a folder containing card.json, flow.d2 and chart.vl.json.
// Usage: node sns-infographic/render.mjs <card-folder>
//
// Inputs may be derived from collected web text, so remote references are rejected
// and network access from Node is disabled. Output: card.png, card.svg in the folder.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.fetch = async () => {
  throw new Error('network access is disabled');
};

const { Resvg } = await import('@resvg/resvg-js');
const vega = await import('vega');
const vegaLite = await import('vega-lite');

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = 'C:/Windows/Fonts';
const FONT_REGULAR = `${FONT_DIR}/malgun.ttf`;
const FONT_BOLD = `${FONT_DIR}/malgunbd.ttf`;
const FONT = 'Malgun Gothic';
const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 64;
const COLOR = { ink: '#1f2937', muted: '#6b7280', line: '#d1d5db', bg: '#ffffff', accent: '#1d4ed8', soft: '#eff6ff' };

const dir = resolve(process.argv[2] ?? '');
if (!process.argv[2]) {
  console.error('Usage: node render.mjs <card-folder>');
  process.exit(2);
}

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

function assertNoRemote(text, name) {
  if (/https?:\/\/|file:\/\/|data:|\/\/www\./i.test(text.replace(/http:\/\/www\.w3\.org\/\S*/g, ''))) {
    throw new Error(`${name}: remote or embedded references are not allowed`);
  }
}

function renderD2(path) {
  const source = readFileSync(path, 'utf8');
  assertNoRemote(source, 'flow.d2');
  if (/\bicon\s*:|\bimage\b|^\s*\.\.\.@|@[\w./-]+|\blink\s*:/m.test(source)) {
    throw new Error('flow.d2: icons, images, imports and links are not allowed');
  }
  const out = join(dir, 'flow.svg');
  execFileSync(
    join(HERE, 'bin', 'd2.exe'),
    ['--pad', '10', '--theme', '0', '--font-regular', FONT_REGULAR, '--font-bold', FONT_BOLD, path, out],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  return readFileSync(out, 'utf8');
}

async function renderVega(path) {
  const source = readFileSync(path, 'utf8');
  assertNoRemote(source, 'chart.vl.json');
  const spec = JSON.parse(source);
  if (JSON.stringify(spec).match(/"(url|href|image)"\s*:/)) {
    throw new Error('chart.vl.json: url, href and image are not allowed');
  }
  spec.config = { ...spec.config, font: FONT };
  const compiled = vegaLite.compile(spec).spec;
  const denied = () => Promise.reject(new Error('loading is disabled'));
  const view = new vega.View(vega.parse(compiled), { renderer: 'none', loader: { load: denied, sanitize: denied, http: denied, file: denied } });
  const svg = await view.toSVG();
  writeFileSync(join(dir, 'chart.svg'), svg, 'utf8');
  return svg;
}

function toPng(svg, fitTo) {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: [FONT_REGULAR, FONT_BOLD], defaultFontFamily: FONT },
    fitTo,
    background: COLOR.bg,
  });
  return resvg.render();
}

function embed(svg, x, y, maxWidth, maxHeight) {
  const scale = 2;
  const image = toPng(svg, { mode: 'width', value: maxWidth * scale });
  const fitted = Math.min(1, maxHeight / (image.height / scale));
  const width = (image.width / scale) * fitted;
  const height = (image.height / scale) * fitted;
  const left = x + (maxWidth - width) / 2;
  const data = Buffer.from(image.asPng()).toString('base64');
  return `<image x="${left}" y="${y}" width="${width}" height="${height}" href="data:image/png;base64,${data}"/>`;
}

function textLines(lines, x, y, size, lineHeight, attrs = '') {
  return lines
    .map((line, i) => `<text x="${x}" y="${y + i * lineHeight}" font-size="${size}" ${attrs}>${escapeXml(line)}</text>`)
    .join('\n');
}

const card = JSON.parse(readFileSync(join(dir, 'card.json'), 'utf8'));
for (const key of ['badge', 'title', 'answer', 'flowHeading', 'chartHeading', 'notes', 'source']) {
  if (card[key] === undefined) throw new Error(`card.json: missing ${key}`);
}

const flow = renderD2(join(dir, 'flow.d2'));
const chart = await renderVega(join(dir, 'chart.vl.json'));

const titleY = 136;
const titleEnd = titleY + (card.title.length - 1) * 56;
const answerY = titleEnd + 34;
const answerHeight = 44 + card.answer.length * 38;
const flowHeadingY = answerY + answerHeight + 54;
const noteLineHeight = 31;
const footerY = HEIGHT - 44;
const notesY = footerY - 42 - (card.notes.length - 1) * noteLineHeight;
const chartHeight = 170;
const chartY = notesY - 42 - chartHeight;
const chartHeadingY = chartY - 14;
const flowY = flowHeadingY + 16;
const flowHeight = chartHeadingY - 44 - flowY;

const contentWidth = WIDTH - MARGIN * 2;
const composed = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}" fill="${COLOR.ink}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLOR.bg}"/>
<text x="${MARGIN}" y="72" font-size="24" font-weight="700" fill="${COLOR.accent}">${escapeXml(card.badge)}</text>
${textLines(card.title, MARGIN, titleY, 44, 56, 'font-weight="700"')}
<rect x="${MARGIN}" y="${answerY}" width="${contentWidth}" height="${answerHeight}" rx="12" fill="${COLOR.soft}"/>
${textLines(card.answer, MARGIN + 28, answerY + 48, 28, 38, 'font-weight="700"')}
<text x="${MARGIN}" y="${flowHeadingY}" font-size="26" font-weight="700">${escapeXml(card.flowHeading)}</text>
${embed(flow, MARGIN, flowY, contentWidth, flowHeight)}
<text x="${MARGIN}" y="${chartHeadingY}" font-size="26" font-weight="700">${escapeXml(card.chartHeading)}</text>
${embed(chart, MARGIN, chartY, contentWidth, chartHeight)}
${textLines(card.notes, MARGIN, notesY, 23, noteLineHeight, `fill="${COLOR.ink}"`)}
<line x1="${MARGIN}" x2="${WIDTH - MARGIN}" y1="${footerY - 28}" y2="${footerY - 28}" stroke="${COLOR.line}"/>
<text x="${MARGIN}" y="${footerY}" font-size="20" fill="${COLOR.muted}">${escapeXml(card.source)}</text>
</svg>`;

writeFileSync(join(dir, 'card.svg'), composed, 'utf8');
writeFileSync(join(dir, 'card.png'), toPng(composed, { mode: 'width', value: WIDTH }).asPng());
console.log(`rendered: ${join(dir, 'card.png')} (flow area ${Math.round(flowHeight)}px)`);
process.exit(0);
