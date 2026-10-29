// Renders the CÉU app icon (SVG) to PNG sizes with the preinstalled Playwright.
// Usage: node scripts/generate-icons.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { writeFile } from "node:fs/promises";

const icon = (scale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2D5F92"/>
      <stop offset="0.55" stop-color="#16365A"/>
      <stop offset="1" stop-color="#0B1F33"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFD9A6"/>
      <stop offset="0.45" stop-color="#F6B26B" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#F18F6E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#D6E2EF"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="300" cy="214" r="118" fill="url(#sun)"/>
    <path d="M150 340 C112 340 96 312 104 286 C112 260 140 248 164 254 C170 214 204 188 244 190 C282 192 308 216 316 248 C346 240 384 256 392 292 C400 326 376 344 350 340 Z"
          fill="url(#cloud)"/>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(file, size, scale) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${icon(scale).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await writeFile(file, await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
}
await render("public/icons/icon-512.png", 512, 1);
await render("public/icons/icon-192.png", 192, 1);
await render("public/icons/apple-touch-icon.png", 180, 1);
await render("public/icons/icon-maskable-512.png", 512, 0.78);
await browser.close();
console.log("icons written");
