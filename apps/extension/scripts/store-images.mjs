// Chrome Web Store images: 1280x800 screenshots and the 440x280 small promo tile, rendered from the
// popup screenshots (light theme). Usage after popup-screenshots.mjs:
//   node apps/extension/scripts/store-images.mjs tmp/extension-shots docs/store/extension .
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [shots, out, root] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const font = readFileSync(
  `${root}/node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2`,
).toString('base64');
const img = (name) =>
  `data:image/png;base64,${readFileSync(`${shots}/light-${name}.png`).toString('base64')}`;
const logo =
  '<svg width="40" height="40" viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="22" rx="6" fill="#18181A"/><path d="M19 5h6v11l-3-2.4-3 2.4z" fill="#8DBB86"/></svg>';
const base = `@font-face{font-family:Onest;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}
*{box-sizing:border-box}body{margin:0;font-family:Onest,sans-serif;color:#18181a}`;

const slides = [
  {
    file: '1-save-in-one-click',
    shot: 'form',
    title: 'Save the page you are on',
    text: 'One click or Alt+Shift+S. The folder from your rules and your recent folders are already filled in.',
  },
  {
    file: '2-saved',
    shot: 'saved',
    title: 'On your shelf in a second',
    text: 'The link lands in your Shelfmark library with its preview, folder and tags.',
  },
  {
    file: '3-already-saved',
    shot: 'duplicate',
    title: 'No accidental duplicates',
    text: 'Shelfmark tells you when a page is saved already, and where.',
  },
  {
    file: '4-sign-in',
    shot: 'signedOut',
    title: 'Uses your Shelfmark sign-in',
    text: 'Sign in once in the browser. Only the page you save is ever sent.',
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const s of slides) {
  await page.setContent(`<style>${base}
    .wrap{width:1280px;height:800px;background:#f4f4f1;display:flex;align-items:center;gap:72px;padding:0 96px;overflow:hidden;position:relative}
    .glow{position:absolute;right:-160px;top:-160px;width:720px;height:720px;border-radius:50%;background:#e3eedf}
    .copy{flex:1;display:flex;flex-direction:column;gap:24px;position:relative}
    .brand{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:600}
    h1{margin:0;font-size:56px;line-height:62px;font-weight:600;letter-spacing:-0.02em}
    p{margin:0;font-size:24px;line-height:34px;color:#5e5e63;max-width:520px}
    .pop{position:relative;width:420px;height:607px;border-radius:24px;overflow:hidden;box-shadow:0 24px 64px rgba(24,24,26,.18),0 2px 6px rgba(24,24,26,.08)}
    .pop img{width:100%;height:100%;display:block}</style>
    <div class="wrap"><div class="glow"></div><div class="copy"><div class="brand">${logo}Shelfmark</div><h1>${s.title}</h1><p>${s.text}</p></div>
    <div class="pop"><img src="${img(s.shot)}"></div></div>`);
  await page.screenshot({ path: `${out}/screenshot-${s.file}.png` });
}
await page.setViewportSize({ width: 440, height: 280 });
await page.setContent(`<style>${base}
  .tile{width:440px;height:280px;background:#18181a;color:#ededef;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:0 36px;position:relative;overflow:hidden}
  .glow{position:absolute;right:-90px;bottom:-110px;width:300px;height:300px;border-radius:50%;background:#2c3a2a}
  .brand{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:600;position:relative}
  h1{margin:0;font-size:30px;line-height:36px;font-weight:600;letter-spacing:-0.02em;position:relative}
  </style><div class="tile"><div class="glow"></div><div class="brand"><svg width="34" height="34" viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="22" rx="6" fill="#EDEDEF"/><path d="M19 5h6v11l-3-2.4-3 2.4z" fill="#4F7A4B"/></svg>Shelfmark</div><h1>Save any page to your shelf in one click</h1></div>`);
await page.screenshot({ path: `${out}/promo-tile-440x280.png` });
await browser.close();
