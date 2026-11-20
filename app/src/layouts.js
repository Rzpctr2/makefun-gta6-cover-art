/* layouts.js — three cover layouts, drawn on canvas from the user's photos.
 * A: grid (landscape 1920x1080, title PALMA VERDE)
 * C: magazine (portrait 1080x1350, title HEAT WAVE)
 * B: couple portrait (square 1080x1080, title GOLDEN HOUR)
 * Layout D (vertical ensemble) was cut in practice: its background letters
 * were invisible, its mini panels collided with the title bar, and three
 * of its five minis were near-identical. The portrait slot is the
 * magazine layout instead.
 *
 * Every panel carries a real label from the game: one of the six districts
 * of Palma Verde, a time, and a mission / radio / character note. No label
 * is invented filler. The sun disc is code-drawn only inside a flat title
 * lockup, never pasted over a daylight photo.
 */
import { renderPhoto } from './illustrate.js';
import { heroOpts, smallOpts } from './presets.js';

export const GUTTER = '#160027';
export const DISTRICT_LABELS = {
  heli: ['PELABUHAN SOLMAR', '17:40', 'KIKO "TANGAN EMAS"'],
  hero: ['BOULEVARD PALMA', '18:52', 'LEO & NADIA'],
  car: ['CASCO VIEJO', '19:05', 'PAKET PANAS'],
  carDetail: ['BUKIT MARISOL', '18:52', 'GOLDEN HOUR'],
  walk: ['LA ROSA', '20:15', 'CORAL FM 88.4'],
  close: ['MERCADO', '06:10', 'BANK SOLMARINA'],
  sunset: ['PELABUHAN SOLMAR', '05:30', 'SARANG DI MENARA'],
};

const cache = new Map();
function photoCanvas(img, w, h, opts, focus) {
  const key = [img._uid || img.src || '', w, h, JSON.stringify(opts), focus.fx, focus.fy].join('|');
  if (cache.has(key)) return cache.get(key);
  const cv = renderPhoto(img, w, h, opts, focus);
  if (cache.size > 24) cache.clear();
  cache.set(key, cv);
  return cv;
}

function fitFont(ctx, text, maxW, size, family, weight = '') {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 10 && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function labelBar(ctx, x, y, w, h, parts, preset) {
  if (h < 14) return;
  ctx.fillStyle = 'rgba(12, 2, 24, 0.88)';
  ctx.fillRect(x, y, w, h);
  const fs = Math.max(9, Math.round(h * 0.42));
  ctx.font = `600 ${fs}px Inter, sans-serif`;
  ctx.textBaseline = 'middle';
  const left = `${parts[0]}  ${parts[1]}`;
  const right = parts[2];
  ctx.fillStyle = '#f2e8d5';
  ctx.textAlign = 'left';
  ctx.fillText(left, x + h * 0.35, y + h / 2 + 1);
  ctx.fillStyle = preset.accent;
  ctx.textAlign = 'right';
  ctx.fillText(right, x + w - h * 0.35, y + h / 2 + 1);
  ctx.textAlign = 'left';
}

function drawPanel(ctx, x, y, w, h, img, opts, focus, label, preset) {
  if (!img) {
    ctx.fillStyle = preset.bg; ctx.fillRect(x, y, w, h);
    return;
  }
  const cv = photoCanvas(img, Math.max(2, Math.round(w)), Math.max(2, Math.round(h)), opts, focus);
  ctx.drawImage(cv, x, y, w, h);
  if (label) labelBar(ctx, x, y + h - Math.max(18, h * 0.11), w, Math.max(18, h * 0.11), label, preset);
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -22, 2, -40); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.16);
    ctx.beginPath(); ctx.moveTo(2, -40);
    ctx.quadraticCurveTo(2 + Math.cos(a) * 22, -40 + Math.sin(a) * 16, 2 + Math.cos(a) * 34, -40 + Math.sin(a) * 26 + 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBurst(ctx, cx, cy, r, lines, fill, ink) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = fill;
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = ink; ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = r * 0.26;
  ctx.font = `700 ${fs}px Inter, sans-serif`;
  lines.forEach((ln, i) => ctx.fillText(ln, 0, (i - (lines.length - 1) / 2) * fs * 1.25));
  ctx.restore();
}

function titleText(ctx, text, cx, y, size, colors, ink, maxW, family = 'Anton, sans-serif') {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const fitted = fitFont(ctx, text, maxW || ctx.canvas.width * 0.96, size, family);
  const grad = ctx.createLinearGradient(0, y - fitted * 0.75, 0, y + fitted * 0.25);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.55, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(3, fitted * 0.07);
  ctx.strokeText(text, cx, y);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, y);
  ctx.restore();
  return fitted;
}

function quoteBar(ctx, x, y, w, h, quote, preset) {
  ctx.fillStyle = '#0c0218';
  ctx.fillRect(x, y, w, h);
  let fs = Math.max(9, Math.round(h * 0.4));
  ctx.font = `600 ${fs}px Inter, sans-serif`;
  const text = `"${quote}"  —  THE COAST HERALD`;
  while (fs > 8 && ctx.measureText(text).width > w * 0.72) {
    fs -= 1;
    ctx.font = `600 ${fs}px Inter, sans-serif`;
  }
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c81e';
  ctx.fillText('★★★★★', x + w * 0.09, y + h / 2 + 1);
  ctx.fillStyle = '#f2e8d5';
  ctx.fillText(text, x + w * 0.55, y + h / 2 + 1);
  ctx.textAlign = 'left';
}

function footerStrip(ctx, x, y, w, h, preset, vol) {
  ctx.fillStyle = '#0c0218';
  ctx.fillRect(x, y, w, h);
  drawPalm(ctx, x + h * 0.5, y + h - 2, h * 0.016, '#2a1a5e');
  drawPalm(ctx, x + h * 1.1, y + h - 2, h * 0.013, '#2a1a5e');
  const fs = Math.max(9, Math.round(h * 0.36));
  ctx.font = `600 ${fs}px Inter, sans-serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#f2e8d5';
  ctx.fillText('ONE COAST · NO RULES', x + w * 0.42, y + h / 2);
  ctx.textAlign = 'left';
  // Barcode: deterministic bars.
  let bx = x + w - h * 2.6;
  for (let i = 0; i < 28; i++) {
    const bw = ((i * 7 + 3) % 3) + 1;
    if (i % 3 !== 0) ctx.fillStyle = '#f2e8d5';
    else ctx.fillStyle = '#8a7a9a';
    ctx.fillRect(bx, y + h * 0.22, bw, h * 0.56);
    bx += bw + 2;
  }
  ctx.fillStyle = preset.accent;
  ctx.beginPath(); ctx.arc(x + w - h * 0.55, y + h / 2, h * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0c0218';
  ctx.font = `700 ${Math.round(h * 0.34)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('TS', x + w - h * 0.55, y + h / 2 + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8a7a9a';
  ctx.font = `600 ${Math.round(h * 0.34)}px Inter, sans-serif`;
  ctx.fillText(vol, x + h * 1.7, y + h / 2 + 1);
}

function focusFor(state, key, def) {
  return (state.focus && state.focus[key]) || def;
}

export function drawGrid(ctx, W, H, state) {
  const { preset, ui, photos } = state;
  const g = Math.round(W * 0.0073);
  ctx.fillStyle = GUTTER; ctx.fillRect(0, 0, W, H);
  const X = g, Y = g, CW = W - 2 * g, CH = H - 2 * g;
  const rows = [0.30, 0.28, 0.42];
  const rh = rows.map((f) => f * (CH - 2 * g));
  const y0 = Y, y1 = y0 + rh[0] + g, y2 = y1 + rh[1] + g;
  const cw = (CW - 2 * g) / 3;
  const x0 = X, x1 = X + cw + g, x2 = X + 2 * (cw + g);
  const hero = heroOpts(preset, ui), small = smallOpts(preset, ui);
  drawPanel(ctx, x0, y0, cw, rh[0], photos.sunset, small, focusFor(state, 'heli', { fx: 0.5, fy: 0.4 }), DISTRICT_LABELS.heli, preset);
  drawPanel(ctx, x1, y0, cw, rh[0], photos.couple, hero, focusFor(state, 'hero', { fx: 0.5, fy: 0.32 }), DISTRICT_LABELS.hero, preset);
  drawPanel(ctx, x2, y0, cw, rh[0], photos.car, hero, focusFor(state, 'car', { fx: 0.5, fy: 0.55 }), DISTRICT_LABELS.car, preset);
  drawPanel(ctx, x0, y1, cw, rh[1], photos.car, small, focusFor(state, 'carDetail', { fx: 0.28, fy: 0.45 }), DISTRICT_LABELS.carDetail, preset);
  drawPanel(ctx, x1, y1, cw, rh[1], photos.sunset, small, focusFor(state, 'walk', { fx: 0.5, fy: 0.62 }), DISTRICT_LABELS.walk, preset);
  drawPanel(ctx, x2, y1, cw, rh[1], photos.couple, small, focusFor(state, 'close', { fx: 0.72, fy: 0.3 }), DISTRICT_LABELS.close, preset);
  drawPanel(ctx, x0, y2, cw, rh[2], photos.sunset, small, focusFor(state, 'sunset', { fx: 0.5, fy: 0.5 }), DISTRICT_LABELS.sunset, preset);
  // Title block: two cells wide, flat magenta, title ~30% of cover height.
  const tx = x1, ty = y2, tw = cw * 2 + g, th = rh[2];
  ctx.fillStyle = preset.band; ctx.fillRect(tx, ty, tw, th);
  quoteBar(ctx, tx, ty, tw, Math.round(th * 0.11), state.quote || 'A FEVER DREAM IN NEON', preset);
  const titleY = ty + th * 0.60;
  titleText(ctx, state.title || 'PALMA VERDE', tx + tw / 2, titleY, th * 0.55, preset.title, preset.ink, tw * 0.97);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(th * 0.17)}px Pacifico, cursive`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = preset.accent; ctx.shadowBlur = th * 0.05;
  ctx.fillText(state.script || 'Golden Hour', tx + tw * 0.68, titleY + th * 0.13);
  ctx.restore();
  ctx.fillStyle = '#0c0218';
  ctx.fillRect(tx, ty + th * 0.82, tw, th * 0.07);
  ctx.fillStyle = '#f2c81e';
  ctx.font = `600 ${Math.round(th * 0.045)}px Inter, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.tagline || '8 MISSIONS · 6 DISTRICTS · GOLDEN HOUR 18:52', tx + tw / 2, ty + th * 0.855);
  ctx.textAlign = 'left';
  footerStrip(ctx, tx, ty + th * 0.89, tw, th * 0.11, preset, 'VOL. 01');
  drawBurst(ctx, x1 - g * 0.4, y0 + rh[0] * 0.5, Math.max(34, W * 0.032), ['NEW', 'EST. 2026'], '#f2c81e', '#160027');
}

export function drawMagazine(ctx, W, H, state) {
  const { preset, ui, photos } = state;
  const g = Math.round(W * 0.013);
  ctx.fillStyle = preset.bg; ctx.fillRect(0, 0, W, H);
  const hero = heroOpts(preset, ui), small = smallOpts(preset, ui);
  // Masthead: small brand line, then the portrait title HEAT WAVE.
  ctx.fillStyle = preset.band; ctx.fillRect(0, 0, W, H * 0.235);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2e8d5';
  ctx.font = `600 ${Math.round(H * 0.016)}px Inter, sans-serif`;
  ctx.fillText('P A L M A   V E R D E', W / 2, H * 0.035);
  titleText(ctx, 'HEAT WAVE', W / 2, H * 0.155, H * 0.115, preset.title, preset.ink);
  ctx.save();
  ctx.font = `${Math.round(H * 0.032)}px Pacifico, cursive`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = preset.accent; ctx.shadowBlur = 10;
  ctx.fillText('Coast to Coast', W * 0.68, H * 0.185);
  ctx.restore();
  ctx.fillStyle = preset.accent;
  ctx.fillRect(W * 0.08, H * 0.215, W * 0.84, Math.max(4, H * 0.006));
  const hy = H * 0.235, hh = H * 0.46;
  drawPanel(ctx, g, hy + g, W - 2 * g, hh - g, photos.couple, hero, focusFor(state, 'hero', { fx: 0.5, fy: 0.32 }), DISTRICT_LABELS.hero, preset);
  const cy = hy + hh + g, ch = H * 0.155;
  drawPanel(ctx, g, cy, W - 2 * g, ch, photos.car, small, focusFor(state, 'car', { fx: 0.5, fy: 0.55 }), DISTRICT_LABELS.car, preset);
  ctx.fillStyle = '#0c0218';
  ctx.fillRect(g, cy + ch + g, W - 2 * g, H * 0.04);
  ctx.fillStyle = '#f2e8d5';
  ctx.font = `700 ${Math.round(H * 0.018)}px Inter, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('THE HEIST OF THE CENTURY  ·  BANK SOLMARINA  ·  $5,000', W / 2, cy + ch + g + H * 0.02);
  ctx.textAlign = 'left';
  quoteBar(ctx, g, H - H * 0.075, W - 2 * g, H * 0.032, state.quote || 'A FEVER DREAM IN NEON', preset);
  footerStrip(ctx, 0, H - H * 0.043, W, H * 0.043, preset, 'VOL. 02');
  drawBurst(ctx, W * 0.86, hy + H * 0.06, Math.max(30, W * 0.045), ['NEW', 'EST. 2026'], '#f2c81e', '#160027');
}

export function drawCouple(ctx, W, H, state) {
  const { preset, ui, photos } = state;
  const g = Math.round(W * 0.013);
  ctx.fillStyle = preset.bg; ctx.fillRect(0, 0, W, H);
  const hero = heroOpts(preset, ui);
  const ph = H * 0.66;
  drawPanel(ctx, g, g, W - 2 * g, ph - g, photos.couple, hero, focusFor(state, 'hero', { fx: 0.5, fy: 0.32 }), DISTRICT_LABELS.hero, preset);
  const ly = ph + g, lh = H - ph - 2 * g;
  ctx.fillStyle = preset.band; ctx.fillRect(g, ly, W - 2 * g, lh);
  // Sun disc, code-drawn inside the flat lockup — never pasted on the photo.
  const sx = g + lh * 0.42, sy = ly + lh * 0.42, sr = lh * 0.3;
  const sg = ctx.createLinearGradient(sx, sy - sr, sx, sy + sr);
  sg.addColorStop(0, '#fff3c4'); sg.addColorStop(0.6, '#f2a35e'); sg.addColorStop(1, '#e82e8a');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = preset.ink; ctx.lineWidth = Math.max(3, sr * 0.08); ctx.stroke();
  ctx.fillStyle = '#f2e8d5';
  ctx.font = `600 ${Math.round(lh * 0.09)}px Inter, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('PALMA VERDE', g + lh * 0.85, ly + lh * 0.18);
  titleText(ctx, 'GOLDEN HOUR', W * 0.56, ly + lh * 0.58, lh * 0.34, preset.title, preset.ink);
  ctx.save();
  ctx.font = `${Math.round(lh * 0.17)}px Pacifico, cursive`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = preset.accent; ctx.shadowBlur = 8;
  ctx.textAlign = 'center';
  ctx.fillText('Leo & Nadia', W * 0.62, ly + lh * 0.78);
  ctx.restore();
  footerStrip(ctx, g, ly + lh * 0.86, W - 2 * g, lh * 0.14, preset, 'VOL. 03');
  drawBurst(ctx, W * 0.88, g + ph * 0.14, Math.max(30, W * 0.045), ['NEW', 'EST. 2026'], '#f2c81e', '#160027');
}

export const LAYOUTS = [
  { id: 'grid', name: 'Grid', size: [1920, 1080], draw: drawGrid, title: 'PALMA VERDE' },
  { id: 'magazine', name: 'Magazine', size: [1080, 1350], draw: drawMagazine, title: 'HEAT WAVE' },
  { id: 'couple', name: 'Couple', size: [1080, 1080], draw: drawCouple, title: 'GOLDEN HOUR' },
];

export function drawCover(canvas, layoutId, state) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0];
  const [W, H] = layout.size;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  layout.draw(ctx, W, H, state);
  return layout;
}
