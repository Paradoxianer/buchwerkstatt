// Erzeugt das Material für den Marketplace-Eintrag in docs/marketplace/:
// Symbole (32, 48, 96, 128 px), Banner (220×140) und Screenshots (1280×800).
// Vorher: npm run vorschau
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ziel = path.resolve(__dirname, '../docs/marketplace');
const svg = fs.readFileSync(path.resolve(__dirname, 'symbol.svg'), 'utf8');
const vorschau = 'file://' + path.resolve(__dirname, '../dist/vorschau.html');

const MANUSKRIPT = {
  de: ['Kapitel 2 – Der Hafen', 'Lena stand am Kai und sah den Schiffen nach. Der Geruch von Diesel lag über dem Hafen, und irgendwo schrie eine Möwe, als wollte sie sie verspotten.', 'Heinrich hatte ihr die Taschenuhr nie gezeigt. Erst jetzt, Jahre später, hielt Lena sie in der Hand und spürte die feine Gravur auf der Rückseite: „Für H.“', 'Jonas wartete schon vor der Tür, als sie zurückkam. Er sagte nichts, aber sein Blick blieb an der Uhr hängen.'],
  en: ['Chapter 2 – The Harbour', 'Lena stood on the quay and watched the ships leave. The smell of diesel hung over the harbour, and somewhere a gull cried as if to mock her.', 'Heinrich had never shown her the pocket watch. Only now, years later, did Lena hold it in her hand and feel the fine engraving on the back: “For H.”', 'Jonas was already waiting at the door when she came back. He said nothing, but his eyes lingered on the watch.']
};

function seite(sprache, hash) {
  const m = MANUSKRIPT[sprache];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; width: 1280px; height: 800px; display: flex; background: #f0f2f5; font-family: Georgia, serif; overflow: hidden; }
    .dok { flex: 1; display: flex; justify-content: center; padding-top: 40px; }
    .blatt { width: 640px; height: 900px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.15); padding: 64px 72px; color: #202124; font-size: 17px; line-height: 1.75; }
    h1 { font-family: Arial, sans-serif; font-size: 24px; font-weight: 600; margin: 0 0 20px; }
    p { margin: 0 0 16px; }
    mark { background: #dfe8fb; padding: 0 2px; border-radius: 2px; }
    .leiste { width: 390px; height: 800px; overflow: hidden; border-left: 1px solid #dadce0; background: #fff; }
    /* Seitenleiste auf 130 % vergrößert, damit sie im Screenshot gut lesbar ist */
    iframe { width: 300px; height: 616px; border: 0; transform: scale(1.3); transform-origin: top left; }
  </style></head><body>
    <div class="dok"><div class="blatt"><h1>${m[0]}</h1><p>${m[1]}</p><p>${m[2]}</p><p>${m[3]}</p></div></div>
    <div class="leiste"><iframe src="${vorschau}${hash}"></iframe></div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Symbole
  for (const groesse of [32, 48, 96, 128]) {
    await page.setViewportSize({ width: groesse, height: groesse });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${groesse}" height="${groesse}" `)}</body></html>`);
    await page.screenshot({ path: path.join(ziel, `icon-${groesse}.png`), omitBackground: true });
  }

  // Banner 220×140
  await page.setViewportSize({ width: 220, height: 140 });
  await page.setContent(`<html><body style="margin:0;width:220px;height:140px;display:flex;align-items:center;justify-content:center;gap:10px;
      background:linear-gradient(135deg,#e8f0fe,#fef7e0);font-family:Arial,sans-serif;box-sizing:border-box;padding:0 10px">
      ${svg.replace('<svg ', '<svg width="56" height="56" ')}
      <div><div style="font-size:17px;font-weight:700;color:#1a3a7a">Buchwerkstatt</div>
      <div style="font-size:10px;color:#5f6368;margin-top:3px">Notizen · Figuren · Zeitstrahl</div></div></body></html>`);
  await page.screenshot({ path: path.join(ziel, 'banner-220x140.png') });

  // Screenshots 1280×800
  await page.setViewportSize({ width: 1280, height: 800 });
  const aufnahmen = [
    { name: 'screenshot-1-notizen', sprache: 'de', hash: '', schritte: async (f) => { await f.click('[data-aktion="hilfe-zu"]'); await f.click('[data-filter="hier"]'); } },
    { name: 'screenshot-2-karte', sprache: 'de', hash: '#ki', schritte: async (f) => { await f.click('#leiste [data-nav="welt"]'); await f.click('.zeile[data-id="p1"]'); } },
    { name: 'screenshot-3-zeitstrahl', sprache: 'en', hash: '#en', schritte: async (f) => { await f.click('#leiste [data-nav="zeit"]'); } },
    { name: 'screenshot-4-welt', sprache: 'en', hash: '#en', schritte: async (f) => { await f.click('#leiste [data-nav="welt"]'); } },
    { name: 'screenshot-5-ziel', sprache: 'de', hash: '', schritte: async (f) => { await f.click('#leiste [data-nav="ziel"]'); } }
  ];
  for (const a of aufnahmen) {
    // Als Datei laden: aus einer about:blank-Seite heraus dürfte der Rahmen keine lokale Datei öffnen.
    const datei = path.resolve(__dirname, '../dist/aufnahme.html');
    fs.writeFileSync(datei, seite(a.sprache, a.hash));
    await page.goto('file://' + datei);
    const frame = page.frames().find((f) => f.url().includes('vorschau.html'));
    await frame.waitForSelector('#leiste');
    await page.waitForTimeout(1200);
    await a.schritte(frame);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(ziel, a.name + '.png') });
  }
  await browser.close();
  console.log('Marketplace-Material in docs/marketplace/ erstellt');
})();
