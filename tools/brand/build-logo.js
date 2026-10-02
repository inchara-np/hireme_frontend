/**
 * Rebuilds Valahatti Technologies logo assets from the original public/logo.png.
 *
 * The original is a 1536x1024 24-bit RGB PNG (~1.0 MB) with the "transparency"
 * checkerboard baked in as real pixels. This script:
 *   1. keys the checkerboard out into a real alpha channel,
 *   2. trims to the artwork bounding box,
 *   3. emits correctly sized, compressed assets.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');
const SRC = path.join(__dirname, 'logo-source.png');

const NAVY = { r: 24, g: 61, b: 137 };
const AMBER = { r: 248, g: 161, b: 2 };

async function main() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;

  // --- 1. key out the baked-in checkerboard into a real alpha channel ---
  const rgba = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const i = p * C;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha;
    if (mx - mn <= 18 && lum >= 200) {
      // neutral + bright => checkerboard / white gap. Ramp so antialiased
      // edges keep a soft falloff instead of a hard jagged cut.
      alpha = Math.round(Math.max(0, Math.min(1, (236 - lum) / 34)) * 255);
    } else {
      alpha = 255;
    }

    const o = p * 4;
    if (alpha === 0) {
      // Pre-fill the RGB of fully transparent pixels with the nearest brand
      // colour so no white halo bleeds when the PNG is downscaled.
      rgba[o] = NAVY.r;
      rgba[o + 1] = NAVY.g;
      rgba[o + 2] = NAVY.b;
      rgba[o + 3] = 0;
    } else {
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = alpha;
    }
  }

  // --- 2. trim to artwork bounds (tight, then a small even margin) ---
  let minX = W;
  let minY = H;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rgba[(y * W + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  console.log(`artwork bbox: ${boxW}x${boxH} at ${minX},${minY}`);

  const trimmed = sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: boxW, height: boxH });
  const trimmedBuf = await trimmed.png().toBuffer();

  // --- 3. emit assets ---
  // Square, padded mark: used by the navbar, admin sidebar and login screen,
  // all of which render it at 32-44 CSS px (so 128px covers 3x DPR).
  const side = Math.max(boxW, boxH);
  const pad = Math.round(side * 0.06);
  const square = side + pad * 2;

  async function squareMark(size, outName) {
    const inner = Math.round(size * (side / square));
    const resized = await sharp(trimmedBuf)
      .resize({
        width: inner,
        height: inner,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toFile(path.join(PUBLIC_DIR, outName));
    const bytes = fs.statSync(path.join(PUBLIC_DIR, outName)).size;
    console.log(`${outName}: ${size}x${size}, ${(bytes / 1024).toFixed(1)} KB`);
  }

  await squareMark(128, 'logo.png');            // in-app mark (navbar/sidebar/login)
  await squareMark(192, 'logo-192.png');        // PWA / rich results
  await squareMark(512, 'logo-512.png');        // schema.org logo + PWA
  await squareMark(180, 'apple-touch-icon.png');

  // --- Open Graph / Twitter card image, 1200x630 ---
  const ogW = 1200;
  const ogH = 630;
  const markSize = 300;
  const mark = await sharp(trimmedBuf)
    .resize({
      width: markSize,
      height: markSize,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0B1B3A"/>
        <stop offset="55%" stop-color="#12295C"/>
        <stop offset="100%" stop-color="#183D89"/>
      </linearGradient>
    </defs>
    <rect width="${ogW}" height="${ogH}" fill="url(#g)"/>
    <rect x="0" y="${ogH - 10}" width="${ogW}" height="10" fill="#F8A102"/>
    <g stroke="#F8A102" stroke-opacity="0.22" fill="none" stroke-width="3">
      <path d="M760 96 L830 96 L870 56 L1010 56"/>
      <circle cx="744" cy="96" r="13"/>
      <path d="M760 566 L860 566 L900 526 L1030 526"/>
      <circle cx="744" cy="566" r="13"/>
    </g>
    <rect x="${ogW - 372}" y="145" width="340" height="340" rx="52" fill="#FFFFFF" fill-opacity="0.97"/>
  </svg>`);

  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}">
    <style>
      .brand { font-family: "Segoe UI Semibold","Segoe UI",Arial,Helvetica,sans-serif; font-size: 62px; font-weight: 700; fill: #FFFFFF; letter-spacing: -1px; }
      .sub   { font-family: "Segoe UI","Segoe UI Semibold",Arial,Helvetica,sans-serif; font-size: 23px; font-weight: 600; fill: #F8A102; letter-spacing: 7px; }
      .tag   { font-family: "Segoe UI","Segoe UI Light",Arial,Helvetica,sans-serif; font-size: 30px; fill: #C6D2EC; }
    </style>
    <text class="brand" x="96" y="292">Valahatti Technologies</text>
    <text class="sub"   x="99" y="338">SOFTWARE DEVELOPMENT</text>
    <text class="tag"   x="96" y="420">Academic projects and freelance engineering,</text>
    <text class="tag"   x="96" y="463">built and delivered end to end.</text>
  </svg>`);

  await sharp(bg)
    .composite([
      { input: text, top: 0, left: 0 },
      { input: mark, top: 165, left: ogW - 372 + Math.round((340 - markSize) / 2) }
    ])
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  const ogBytes = fs.statSync(path.join(PUBLIC_DIR, 'og-image.png')).size;
  console.log(`og-image.png: ${ogW}x${ogH}, ${(ogBytes / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
