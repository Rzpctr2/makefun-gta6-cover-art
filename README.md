# Palma Verde Cover Studio

A photo-led cover maker for the make.fun cover-art bounty. Load your own
photos, pick one of four sunset grades and one of three layouts, and export
a multi-panel cover at 1920×1080, 1080×1350, or 1080×1080 — all offline,
in the browser. Photos are read locally and never uploaded.

## What it does

- **Photo-led grade (the default):** hero faces get a light grade —
  saturation +40%, contrast +25%, gradient map at most 0.3, posterize
  luma-8, no halftone on the hero. The heavy print look (gradient map 0.6,
  posterize 5, halftone dots) is reserved for small panels and drawn
  title graphics, where it reads as print texture instead of a mask.
- **Skin protection:** the skin mask is computed after the boost and
  before posterize, while warm skin hue is still readable, and a
  skin-tone clamp pulls over-red pixels back toward the skin fingerprint.
  Halftone never touches skin highlights.
- **Four grades:** Vice Sunset (default), Dusk Pink, Night Neon, Indoor Warm.
- **Three layouts, three titles:** Grid (landscape, PALMA VERDE),
  Magazine (portrait, HEAT WAVE), Couple (square, GOLDEN HOUR).
- **Real labels on every panel:** the six districts of Palma Verde
  (Pelabuhan Solmar, Boulevard Palma, Casco Viejo, La Rosa, Bukit Marisol,
  Mercado), golden hour 18:52, mission names, Coral FM 88.4, and Kiko
  "Tangan Emas".
- **Cover devices:** starburst badge, five-star quote bar, footer strip
  with palm silhouettes, tagline, small print, barcode and TSULACE
  monogram, and a VOL number on every format.
- **Four controls only:** Grade, Halftone, Grain, Rim light — plus preset
  and layout chips. Three export sizes, one click each.

## Photos

The demo photos in `app/demo/` (couple, car, sunset) were generated in
the recorded build session as one golden-hour session — the same couple,
car and light in every panel. Replace them with your own photos in the
editor; the starter kit's sample photos remain in `app/samples/` only as
a fallback and are not used as the main content.

## Fonts

Anton, Pacifico and Inter SemiBold, all SIL OFL 1.1, bundled in
`app/fonts/` with their licence texts. No network fonts, no network
requests of any kind.

## Run it

```
node serve.ts
# open http://localhost:8080
```

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with
the vendored make.fun library.

## License

MIT — see LICENSE.
