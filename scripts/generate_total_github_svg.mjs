import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('D:/Codex/running_page');
const activitiesPath = path.join(root, 'src', 'static', 'activities.json');
const outputPath = path.join(root, 'assets', 'github.svg');

const TITLE = 'maweyuan Running';
const ATHLETE = 'maweyuan';
const BG = '#222222';
const TEXT = '#FFFFFF';
const EMPTY = '#444444';
const RUN = '#4dd2ff';
const OVER_10 = '#ffcc00';
const OVER_20 = '#ff0000';

const START_X = 10;
const MONTH_LABEL_Y_OFFSET = 14;
const GRID_Y_OFFSET = 15.5;
const CELL = 2.6;
const GAP = 0.9;
const STEP = CELL + GAP;
const YEAR_BLOCK_HEIGHT = 43;
const HEADER_HEIGHT = 55;
const WIDTH = 200;
const FOOTER_HEIGHT = 12;

const formatKm = (meters) => `${(meters / 1000).toFixed(1)} km`;

function mondayIndex(date) {
  return (date.getUTCDay() + 6) % 7;
}

function dayOfYearUtc(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86400000);
}

function monthLabelPositions(year) {
  const labels = [];
  for (let month = 0; month < 12; month += 1) {
    const first = new Date(Date.UTC(year, month, 1));
    const col = Math.floor((dayOfYearUtc(first) + mondayIndex(first)) / 7);
    labels.push({
      text: first.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      x: START_X + col * STEP,
    });
  }
  return labels;
}

function colorForKm(km) {
  if (km >= 20) return OVER_20;
  if (km >= 10) return OVER_10;
  if (km > 0) return RUN;
  return EMPTY;
}

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const activities = JSON.parse(await fs.readFile(activitiesPath, 'utf8'));
const runs = activities
  .filter((item) => item.type === 'Run')
  .map((item) => ({
    date: item.start_date_local.slice(0, 10),
    km: (item.distance || 0) / 1000,
  }));

const daily = new Map();
for (const run of runs) {
  daily.set(run.date, (daily.get(run.date) || 0) + run.km);
}

const years = [...new Set(runs.map((run) => Number(run.date.slice(0, 4))))].sort(
  (a, b) => b - a
);

const yearlyStats = years.map((year) => {
  const yearRuns = runs.filter((run) => Number(run.date.slice(0, 4)) === year);
  const totalKm = yearRuns.reduce((sum, run) => sum + run.km, 0);
  return {
    year,
    totalKm,
  };
});

const totalKm = runs.reduce((sum, run) => sum + run.km, 0);
const maxKm = runs.length ? Math.max(...runs.map((run) => run.km)) : 0;
const minKm = runs.length ? Math.min(...runs.map((run) => run.km)) : 0;
const weekly = years.length ? runs.length / (years.length * 52) : 0;
const avgKm = runs.length ? totalKm / runs.length : 0;
const height = HEADER_HEIGHT + years.length * YEAR_BLOCK_HEIGHT;
const footerY = height - FOOTER_HEIGHT;

let svg = '';
svg += '<?xml version="1.0" encoding="utf-8" ?>\n';
svg += `<svg baseProfile="full" height="${height}mm" version="1.1" viewBox="0,0,${WIDTH},${height}" width="${WIDTH}mm" xmlns="http://www.w3.org/2000/svg" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xlink="http://www.w3.org/1999/xlink">`;
svg += `<defs /><rect fill="${BG}" height="${height}" width="${WIDTH}" x="0" y="0" />`;
svg += `<text fill="${TEXT}" style="font-size:12px; font-family:Arial; font-weight:bold;" x="10" y="20">${esc(TITLE)}</text>`;
svg += `<text fill="${TEXT}" style="font-size:4px; font-family:Arial" x="10" y="${footerY}">Runner</text>`;
svg += `<text fill="${TEXT}" style="font-size:9px; font-family:Arial" x="10" y="${footerY + 10}">${esc(ATHLETE)}</text>`;
svg += `<text fill="${TEXT}" style="font-size:4px; font-family:Arial" x="65" y="${footerY}">SPECIAL TRACKS</text>`;
svg += `<rect fill="${OVER_10}" height="${CELL}" width="${CELL}" x="65" y="${footerY + 3}" />`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="70" y="${footerY + 5.5}">Over 10.0 km</text>`;
svg += `<rect fill="${OVER_20}" height="${CELL}" width="${CELL}" x="65" y="${footerY + 7}" />`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="70" y="${footerY + 9.5}">Over 20.0 km</text>`;
svg += `<text fill="${TEXT}" style="font-size:4px; font-family:Arial" x="120" y="${footerY}">STATISTICS</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="120" y="${footerY + 5}">Number: ${runs.length}</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="120" y="${footerY + 10}">Weekly: ${weekly.toFixed(1)}</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="141" y="${footerY + 5}">Total: ${totalKm.toFixed(1)} km</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="141" y="${footerY + 10}">Avg: ${avgKm.toFixed(1)} km</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="167" y="${footerY + 5}">Min: ${minKm.toFixed(1)} km</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="167" y="${footerY + 10}">Max: ${maxKm.toFixed(1)} km</text>`;

for (let i = 0; i < years.length; i += 1) {
  const { year, totalKm: yearKm } = yearlyStats[i];
  const baseY = 30 + i * YEAR_BLOCK_HEIGHT;
  svg += `<text dominant-baseline="hanging" fill="${TEXT}" style="font-size:10.0px; font-family:Arial;" x="10" y="${baseY}">${year}</text>`;
  svg += `<text dominant-baseline="hanging" fill="${TEXT}" style="font-size:4.125px; font-family:Arial;" x="175" y="${baseY + 5}">${yearKm.toFixed(1)} km</text>`;

  for (const label of monthLabelPositions(year)) {
    svg += `<text fill="${TEXT}" style="font-size:2.5px; font-family:Arial" x="${label.x}" y="${baseY + MONTH_LABEL_Y_OFFSET}">${label.text}</text>`;
  }

  const daysInYear =
    (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
  for (let day = 0; day < daysInYear; day += 1) {
    const date = new Date(Date.UTC(year, 0, 1 + day));
    const ymd = date.toISOString().slice(0, 10);
    const km = daily.get(ymd) || 0;
    const col = Math.floor((day + mondayIndex(new Date(Date.UTC(year, 0, 1)))) / 7);
    const row = mondayIndex(date);
    const x = START_X + col * STEP;
    const y = baseY + GRID_Y_OFFSET + row * STEP;
    const title = km > 0 ? `${ymd} ${km.toFixed(1)} km` : ymd;
    svg += `<rect fill="${colorForKm(km)}" height="${CELL}" width="${CELL}" x="${x}" y="${y}"><title>${esc(title)}</title></rect>`;
  }
}

svg += '</svg>\n';
await fs.writeFile(outputPath, svg, 'utf8');
console.log(`Wrote ${outputPath}`);
