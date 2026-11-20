/* illustrate.js — photo to cover-grade image, written fresh for this entry.
 *
 * Photo-led pipeline (fresh-participant study, 19 Nov 21:25, overrides the
 * heavy v2 defaults): hero faces get a LIGHT grade only — saturation and
 * contrast boost, a weak gradient map, no posterize on skin, no halftone on
 * the hero. The heavy print treatment (strong gradient map, posterize 5,
 * halftone) is reserved for small panels and for drawn graphics, where it
 * reads as print texture instead of a mask on a face.
 *
 * Stage order (do not reorder): work at 512 px -> edge-preserving smooth ->
 * boost -> skin mask (pre-grade) -> posterize -> gradient map -> halftone
 * -> grain (seeded, off while halftone is on) -> rim wash -> vignette.
 * No outline is ever drawn on a photo. Ink lives only in code-drawn
 * graphics: title letters, badges, frames.
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LUMA = [0.2126, 0.7152, 0.0722];
export function lumaOf(r, g, b) { return LUMA[0] * r + LUMA[1] * g + LUMA[2] * b; }

/* The real smooth used by the pipeline: per-channel box blur (radius 5,
 * two passes) blended back by edge strength. Written as one pass over the
 * packed RGBA data so the three channels share the same weights. */
export function smoothRgb(data, w, h) {
  const src = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) src[i] = data[i];
  let cur = src;
  for (let it = 0; it < 2; it++) {
    const tmp = new Float32Array(cur.length);
    const out = new Float32Array(cur.length);
    const r = 5, div = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const acc = [0, 0, 0];
      for (let x = -r; x <= r; x++) {
        const sx = Math.min(w - 1, Math.max(0, x)) * 4 + y * w * 4;
        acc[0] += cur[sx]; acc[1] += cur[sx + 1]; acc[2] += cur[sx + 2];
      }
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        tmp[o] = acc[0] / div; tmp[o + 1] = acc[1] / div; tmp[o + 2] = acc[2] / div;
        const xa = (Math.min(w - 1, x + r + 1) + y * w) * 4;
        const xb = (Math.max(0, x - r) + y * w) * 4;
        acc[0] += cur[xa] - cur[xb]; acc[1] += cur[xa + 1] - cur[xb + 1]; acc[2] += cur[xa + 2] - cur[xb + 2];
      }
    }
    for (let x = 0; x < w; x++) {
      const acc = [0, 0, 0];
      for (let y = -r; y <= r; y++) {
        const sy = (Math.min(h - 1, Math.max(0, y)) * w + x) * 4;
        acc[0] += tmp[sy]; acc[1] += tmp[sy + 1]; acc[2] += tmp[sy + 2];
      }
      for (let y = 0; y < h; y++) {
        const o = (y * w + x) * 4;
        out[o] = acc[0] / div; out[o + 1] = acc[1] / div; out[o + 2] = acc[2] / div;
        const ya = (Math.min(h - 1, y + r + 1) * w + x) * 4;
        const yb = (Math.max(0, y - r) * w + x) * 4;
        acc[0] += tmp[ya] - tmp[yb]; acc[1] += tmp[ya + 1] - tmp[yb + 1]; acc[2] += tmp[ya + 2] - tmp[yb + 2];
      }
    }
    // Blend: flat areas take the blur, strong edges keep the original.
    const next = new Float32Array(cur.length);
    for (let p = 0; p < w * h; p++) {
      const o = p * 4;
      const d = Math.abs(cur[o] - out[o]) + Math.abs(cur[o + 1] - out[o + 1]) + Math.abs(cur[o + 2] - out[o + 2]);
      const t = Math.min(1, d / 90); // 0 = flat (full blur), 1 = hard edge (keep)
      next[o] = out[o] * (1 - t) + cur[o] * t;
      next[o + 1] = out[o + 1] * (1 - t) + cur[o + 1] * t;
      next[o + 2] = out[o + 2] * (1 - t) + cur[o + 2] * t;
      next[o + 3] = cur[o + 3];
    }
    cur = next;
  }
  for (let i = 0; i < data.length; i++) data[i] = cur[i];
  return data;
}

/* Saturation +40% / contrast +25% (scaled by opts.grade, 0..1.5). */
export function boost(data, grade = 1) {
  const s = 1 + 0.4 * grade, c = 1 + 0.25 * grade;
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const l = lumaOf(r, g, b);
    let nr = l + (r - l) * s, ng = l + (g - l) * s, nb = l + (b - l) * s;
    nr = (nr - 128) * c + 128; ng = (ng - 128) * c + 128; nb = (nb - 128) * c + 128;
    data[p] = Math.max(0, Math.min(255, nr));
    data[p + 1] = Math.max(0, Math.min(255, ng));
    data[p + 2] = Math.max(0, Math.min(255, nb));
  }
  return data;
}

/* Skin mask, computed AFTER boost and BEFORE posterize, while warm skin
 * hue is still readable: R > 90 and (R-G) > 35 and (R-B) > 45. */
export function skinMask(data) {
  const mask = new Uint8Array(data.length / 4);
  for (let p = 0, i = 0; p < data.length; p += 4, i++) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    mask[i] = (r > 90 && r - g > 35 && r - b > 45) ? 1 : 0;
  }
  return mask;
}

/* Skin-tone clamp (default ON): pixels pushed too red by the grade
 * (R > 200 and R-G > 100) are pulled back toward the skin fingerprint
 * (G ~= B ~= 104): cap (R-G) at 120, cap (R-B) at 130, pull B toward G. */
export function skinClamp(data, mask) {
  for (let p = 0, i = 0; p < data.length; p += 4, i++) {
    if (!mask[i]) continue;
    let r = data[p], g = data[p + 1], b = data[p + 2];
    if (r > 200 && r - g > 100) {
      if (r - g > 120) g = r - 120;
      if (r - b > 130) b = r - 130;
      b = Math.round((b + g) / 2);
      data[p] = r; data[p + 1] = g; data[p + 2] = b;
    }
  }
  return data;
}

/* Posterize. mode 'off' leaves colour alone; 'luma8' quantises luminance
 * to 8 steps while keeping hue (faces stay faces); 'heavy' quantises each
 * channel to 5 levels, except skin pixels which get luma 6 / hue 5. */
export function posterize(data, mode, mask) {
  if (mode === 'off') return data;
  for (let p = 0, i = 0; p < data.length; p += 4, i++) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    if (mode === 'luma8') {
      const l = lumaOf(r, g, b);
      const q = Math.round(l / 255 * 7) / 7 * 255;
      const k = l > 1 ? q / l : 1;
      data[p] = Math.max(0, Math.min(255, r * k));
      data[p + 1] = Math.max(0, Math.min(255, g * k));
      data[p + 2] = Math.max(0, Math.min(255, b * k));
    } else {
      const step = 255 / 4;
      if (mask && mask[i]) {
        const l = lumaOf(r, g, b);
        const q = Math.round(l / 255 * 5) / 5 * 255;
        const k = l > 1 ? q / l : 1;
        data[p] = Math.max(0, Math.min(255, r * k));
        data[p + 1] = Math.max(0, Math.min(255, g * k));
        data[p + 2] = Math.max(0, Math.min(255, b * k));
      } else {
        data[p] = Math.round(r / step) * step;
        data[p + 1] = Math.round(g / step) * step;
        data[p + 2] = Math.round(b / step) * step;
      }
    }
  }
  return data;
}

/* Gradient map: luma (Rec.709) addresses a 3-stop ramp
 * violet #2A0E3F -> magenta #C8397A -> peach #FFD9A0, mixed by amount. */
export function gradientMap(data, amount, ramp) {
  if (amount <= 0) return data;
  const stops = ramp || [[42, 14, 63], [200, 57, 122], [255, 217, 160]];
  const lut = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const a = stops[0], b = stops[1], c = stops[2];
    let col;
    if (t < 0.5) { const u = t / 0.5; col = a.map((v, k) => v + (b[k] - v) * u); }
    else { const u = (t - 0.5) / 0.5; col = b.map((v, k) => v + (c[k] - v) * u); }
    lut.push(col);
  }
  for (let p = 0; p < data.length; p += 4) {
    const l = Math.max(0, Math.min(255, Math.round(lumaOf(data[p], data[p + 1], data[p + 2]))));
    const col = lut[l];
    data[p] = data[p] + (col[0] - data[p]) * amount;
    data[p + 1] = data[p + 1] + (col[1] - data[p + 1]) * amount;
    data[p + 2] = data[p + 2] + (col[2] - data[p + 2]) * amount;
  }
  return data;
}

/* Halftone dots: print texture, not a face treatment. Dots live where
 * luma < 0.65, die where luma > 0.75, and never touch skin highlights
 * (skin mask + luma > 0.55). Cell size scales with the panel. */
export function halftone(data, w, h, cell, mask) {
  if (cell <= 0) return data;
  const ink = [22, 0, 39];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4, i = y * w + x;
      const l = lumaOf(data[p], data[p + 1], data[p + 2]) / 255;
      if (l >= 0.75) continue;
      if (mask && mask[i]) continue; // never dot skin, any tone
      if (l >= 0.5) continue;
      const cx = (x % cell) / cell - 0.5, cy = (y % cell) / cell - 0.5;
      const radius = (0.5 - l) / 0.5 * 0.45;
      if (cx * cx + cy * cy < radius * radius) {
        data[p] = ink[0]; data[p + 1] = ink[1]; data[p + 2] = ink[2];
      }
    }
  }
  return data;
}

/* Film grain, monochrome, seeded so two runs are byte-identical.
 * Off while halftone is on (double texture turns to mud); max 4%. */
export function grain(data, amount, seed = 20261120) {
  if (amount <= 0) return data;
  const rnd = mulberry32(seed);
  const tile = new Float32Array(128 * 128);
  for (let i = 0; i < tile.length; i++) tile[i] = (rnd() + rnd() + rnd() - 1.5) * 255;
  const w = Math.round(Math.sqrt(data.length / 4));
  void w;
  for (let p = 0; p < data.length; p += 4) {
    const idx = p / 4;
    const n = tile[idx % tile.length] * amount;
    data[p] = Math.max(0, Math.min(255, data[p] + n));
    data[p + 1] = Math.max(0, Math.min(255, data[p + 1] + n));
    data[p + 2] = Math.max(0, Math.min(255, data[p + 2] + n));
  }
  return data;
}

/* Rim wash: a diagonal magenta wash from the sun side, screen blend,
 * capped at 10% and off by default. */
export function rimWash(data, w, h, amount) {
  if (amount <= 0) return data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const t = (x / w * 0.6 + (1 - y / h) * 0.4) * amount;
      data[p] = 255 - (255 - data[p]) * (1 - t * 0.4);
      data[p + 1] = data[p + 1] * (1 - t * 0.25);
      data[p + 2] = 255 - (255 - data[p + 2]) * (1 - t * 0.55);
    }
  }
  return data;
}

/* Vignette, 12% by default: darkens the corners, centres the eye. */
export function vignette(data, w, h, amount = 0.12) {
  if (amount <= 0) return data;
  const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxD;
      const f = 1 - amount * Math.max(0, (d - 0.55) / 0.45);
      const p = (y * w + x) * 4;
      data[p] *= f; data[p + 1] *= f; data[p + 2] *= f;
    }
  }
  return data;
}

/* Full pipeline for one photo. opts:
 *   grade (0..1.5), mapAmount (0..0.6), poster ('off'|'luma8'|'heavy'),
 *   halftoneCell (0 = off), grainAmt, rimAmt, vigAmt, skinClampOn.
 * Returns a canvas of tw x th, cover-cropped around focus {fx, fy}. */
export function renderPhoto(img, tw, th, opts, focus = { fx: 0.5, fy: 0.42 }) {
  const cv = document.createElement('canvas');
  cv.width = tw; cv.height = th;
  const ctx = cv.getContext('2d');
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const scale = Math.max(tw / iw, th / ih);
  const pw = iw * scale, ph = ih * scale;
  const dx = (tw - pw) * focus.fx, dy = (th - ph) * focus.fy;
  ctx.drawImage(img, dx, dy, pw, ph);
  // Work at 512 px on the long side for the heavy stages, then upscale.
  const work = 512;
  const ws = Math.min(1, work / Math.max(tw, th));
  const ww = Math.max(2, Math.round(tw * ws)), wh = Math.max(2, Math.round(th * ws));
  const wc = document.createElement('canvas');
  wc.width = ww; wc.height = wh;
  wc.getContext('2d').drawImage(cv, 0, 0, ww, wh);
  const wctx = wc.getContext('2d');
  const imgData = wctx.getImageData(0, 0, ww, wh);
  const d = imgData.data;
  smoothRgb(d, ww, wh);
  boost(d, opts.grade ?? 1);
  const mask = skinMask(d);
  posterize(d, opts.poster ?? 'luma8', mask);
  if (opts.skinClampOn !== false) skinClamp(d, mask);
  gradientMap(d, opts.mapAmount ?? 0.3);
  if (opts.halftoneCell) halftone(d, ww, wh, Math.max(3, Math.round(opts.halftoneCell * ws)), mask);
  if (!opts.halftoneCell && opts.grainAmt) grain(d, opts.grainAmt);
  if (opts.rimAmt) rimWash(d, ww, wh, opts.rimAmt);
  vignette(d, ww, wh, opts.vigAmt ?? 0.12);
  wctx.putImageData(imgData, 0, 0);
  ctx.clearRect(0, 0, tw, th);
  ctx.drawImage(wc, 0, 0, tw, th);
  return cv;
}
