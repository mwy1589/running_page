import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const activitiesPath = path.join(root, 'src', 'static', 'activities.json');
const outputPath = path.join(root, 'assets', 'grid.svg');

const TITLE = 'Over 1km Runs';
const ATHLETE = 'maweyuan';
const BG = '#222222';
const TEXT = '#FFFFFF';
const RUN = '#4dd2ff';
const OVER_20 = '#ffcc00';
const OVER_40 = '#ff5a00';
const SPECIAL_2 = '#ff0000';

const WIDTH = 200;
const HEADER_HEIGHT = 34;
const FOOTER_HEIGHT = 18;
const PADDING_X = 10;
const GRID_TOP = 40;
const COLS = 13;
const CELL_W = 13;
const CELL_H = 13;
const GAP_X = 1.6;
const GAP_Y = 1.6;
const STROKE = 0.9;

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function colorForKm(km) {
  if (km >= 40) return SPECIAL_2;
  if (km >= 20) return OVER_20;
  if (km >= 10) return RUN;
  return RUN;
}

function normalizePoints(points, x, y, width, height, pad = 0.8) {
  if (!points.length) return [];
  const xs = points.map((p) => p[1]);
  const ys = points.map((p) => p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dataW = Math.max(maxX - minX, 1e-6);
  const dataH = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / dataW, (height - pad * 2) / dataH);
  const offsetX = x + (width - dataW * scale) / 2;
  const offsetY = y + (height - dataH * scale) / 2;
  return points.map(([lat, lon]) => [
    offsetX + (lon - minX) * scale,
    offsetY + (maxY - lat) * scale,
  ]);
}

function pathFromPoints(points) {
  if (!points.length) return '';
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

function decodePolyline(str, precision = 5) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const factor = 10 ** precision;

  while (index < str.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

const activities = JSON.parse(await fs.readFile(activitiesPath, 'utf8'));
const runs = activities
  .filter(
    (item) =>
      item.type === 'Run' &&
      (item.distance || 0) / 1000 >= 1 &&
      item.summary_polyline
  )
  .map((item) => ({
    id: item.run_id,
    km: (item.distance || 0) / 1000,
    polyline: item.summary_polyline,
    date: item.start_date_local.slice(0, 10),
  }))
  .sort((a, b) => a.date.localeCompare(b.date));

const count = runs.length;
const totalKm = runs.reduce((sum, item) => sum + item.km, 0);
const avgKm = count ? totalKm / count : 0;
const minKm = count ? Math.min(...runs.map((item) => item.km)) : 0;
const maxKm = count ? Math.max(...runs.map((item) => item.km)) : 0;
const weekly = count / 52;

const rows = Math.max(1, Math.ceil(count / COLS));
const gridHeight = rows * CELL_H + (rows - 1) * GAP_Y;
const height = GRID_TOP + gridHeight + FOOTER_HEIGHT;
const footerY = height - 12;

let svg = '';
svg += '<?xml version="1.0" encoding="utf-8" ?>\n';
svg += `<svg baseProfile="full" height="${height}mm" version="1.1" viewBox="0,0,${WIDTH},${height}" width="${WIDTH}mm" xmlns="http://www.w3.org/2000/svg" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xlink="http://www.w3.org/1999/xlink">`;
svg += `<defs /><rect fill="${BG}" height="${height}" width="${WIDTH}" x="0" y="0" />`;
svg += `<text fill="${TEXT}" style="font-size:12px; font-family:Arial; font-weight:bold;" x="10" y="20">${esc(TITLE)}</text>`;
svg += `<text fill="${TEXT}" style="font-size:4px; font-family:Arial" x="10" y="${footerY}">Runner</text>`;
svg += `<text fill="${TEXT}" style="font-size:9px; font-family:Arial" x="10" y="${footerY + 10}">${esc(ATHLETE)}</text>`;
svg += `<text fill="${TEXT}" style="font-size:4px; font-family:Arial" x="65" y="${footerY}">SPECIAL TRACKS</text>`;
svg += `<rect fill="${OVER_20}" height="2.6" width="2.6" x="65" y="${footerY + 3}" />`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="70" y="${footerY + 5.5}">Over 20.0 km</text>`;
svg += `<rect fill="${SPECIAL_2}" height="2.6" width="2.6" x="65" y="${footerY + 7}" />`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="70" y="${footerY + 9.5}">Over 40.0 km</text>`;
svg += `<text fill="${TEXT}" style="font-size:4px; font-family:Arial" x="120" y="${footerY}">STATISTICS</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="120" y="${footerY + 5}">Number: ${count}</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="120" y="${footerY + 10}">Weekly: ${weekly.toFixed(1)}</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="141" y="${footerY + 5}">Total: ${totalKm.toFixed(1)} km</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="141" y="${footerY + 10}">Avg: ${avgKm.toFixed(1)} km</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="167" y="${footerY + 5}">Min: ${minKm.toFixed(1)} km</text>`;
svg += `<text fill="${TEXT}" style="font-size:3px; font-family:Arial" x="167" y="${footerY + 10}">Max: ${maxKm.toFixed(1)} km</text>`;

for (let i = 0; i < runs.length; i += 1) {
  const item = runs[i];
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = PADDING_X + col * (CELL_W + GAP_X);
  const y = GRID_TOP + row * (CELL_H + GAP_Y);
  let decoded = [];
  try {
    decoded = decodePolyline(item.polyline);
  } catch {
    decoded = [];
  }
  if (decoded.length < 2) continue;
  const normalized = normalizePoints(decoded, x, y, CELL_W, CELL_H);
  svg += `<path d="${pathFromPoints(normalized)}" fill="none" stroke="${colorForKm(item.km)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${STROKE}"><title>${esc(`${item.date} ${item.km.toFixed(1)}km`)}</title><desc>${item.id}</desc></path>`;
}

svg += '</svg>\n';
await fs.writeFile(outputPath, svg, 'utf8');
console.log(`Wrote ${outputPath}`);
