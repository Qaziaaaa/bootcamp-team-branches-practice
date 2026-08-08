const puppeteer = require("puppeteer-core");
const path = require("path");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const URL = "file:///" + path.join(__dirname, "..", "index.html").replace(/\\/g, "/");
const OUT = (n) => path.join(__dirname, "output", n + ".png");

// reconstruction starts ~5.5s after clicking Reconstruct (3.3s reconstruct + ~2.2s flag)
// recon phases: map 0.15-0.6, prov-line 0.3-1.55, fills 1.0-1.9, merge 3.8-5.5, labels 6.0-6.5, quote 6.9

async function run(vp, label) {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-first-run", "--disable-gpu"]
  });
  const page = await browser.newPage();
  await page.setViewport(vp);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(URL, { waitUntil: "load" });
  await sleep(2200);
  await page.keyboard.type("1947");
  await page.waitForFunction(() => document.getElementById("reconstructBtn").classList.contains("ready"), { timeout: 25000 });
  await sleep(1800);

  // --- fragments scene: tape hidden, sheet hidden, pieces visible with ink text ---
  const frag = await page.evaluate(() => {
    const field = document.querySelector(".fragments-field").getBoundingClientRect();
    const kinds = Array.from(document.querySelectorAll(".fragment")).map((f) => {
      const r = f.getBoundingClientRect();
      const sheet = f.querySelector(".frag-sheet");
      return {
        kind: f.className.replace("fragment fragment--", ""),
        w: Math.round(r.width), h: Math.round(r.height), t: Math.round(r.top), l: Math.round(r.left),
        op: getComputedStyle(f).opacity,
        text: sheet.textContent.trim().replace(/\s+/g, " ").slice(0, 40),
        clip: getComputedStyle(sheet, "::before").clipPath.indexOf("polygon") === 0
      };
    });
    const fieldRect = { l: Math.round(field.left), t: Math.round(field.top), r: Math.round(field.right), b: Math.round(field.bottom) };
    const out = kinds.filter((k) => k.l < fieldRect.l - 16 || (k.l + k.w) > fieldRect.r + 16 || k.t < fieldRect.t - 16 || (k.t + k.h) > fieldRect.b + 16).map((k) => k.kind);
    return {
      kinds,
      outOfField: out,
      tapeOp: getComputedStyle(document.querySelector(".tape")).opacity,
      sheetOp: getComputedStyle(document.getElementById("assembledSheet")).opacity
    };
  });
  console.log(label, "fragments:", JSON.stringify(frag));
  await page.screenshot({ path: OUT(label + "_fragments") });

  await page.click("#reconstructBtn");

  // during reconstruct flight: pieces should be mid-flight (not at rest), tape not yet in
  await sleep(800);
  const mid = await page.evaluate(() => {
    const f = document.querySelector(".fragment--mast");
    const r = f.getBoundingClientRect();
    const tape = document.querySelector(".tape");
    return {
      mastMidX: Math.round(r.left), mastMidY: Math.round(r.top),
      mastTransform: f.style.transform,
      tapeOp: getComputedStyle(tape).opacity
    };
  });
  console.log(label, "reconstruct mid:", JSON.stringify(mid));
  await page.screenshot({ path: OUT(label + "_recon_tape") });

  // composed: sheet visible, fragments gone, tapes visible (recon starts ~5.5s)
  await sleep(5500);
  const done = await page.evaluate(() => {
    const el = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).opacity : null; };
    return {
      sheetOp: el("#assembledSheet"),
      tapeOp: el(".tape"),
      fragOp: el(".fragment"),
      reconActive: document.getElementById("reconstruction").classList.contains("is-active")
    };
  });
  console.log(label, "reconstruct done:", JSON.stringify(done));

  // --- reconstruction hold (map composed, labels + quote visible) ---
  await sleep(8200);
  await page.screenshot({ path: OUT(label + "_recon_composed") });
  await sleep(4000);
  const recon = await page.evaluate(() => {
    const el = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).opacity : null; };
    const strand = document.querySelector("#dnaSvg .dna-strand");
    const rung = document.querySelector("#dnaSvg .dna-rung");
    return {
      reconActive: document.getElementById("reconstruction").classList.contains("is-active"),
      mapOp: el("#mapSvg"), dnaOp: el("#dnaSvg"), networkOp: el("#networkSvg"),
      mapLabel: el("#mapLabel"), dnaLabel: el("#dnaLabel"), quoteOp: el("#recMessage .quote"),
      provLineOffset: document.querySelector(".prov-line").style.strokeDashoffset,
      dnaStrandOffset: strand.style.strokeDashoffset,
      dnaRungOp: rung ? getComputedStyle(rung).opacity : null,
      stageFlexDir: getComputedStyle(document.querySelector(".stage")).flexDirection,
      mapFrameH: Math.round(document.querySelector(".map-frame").getBoundingClientRect().height),
      dnaH: Math.round(document.querySelector("#dnaSvg").getBoundingClientRect().height)
    };
  });
  await page.screenshot({ path: OUT(label + "_recon_hold") });
  console.log(label, "recon hold:", JSON.stringify(recon));
  console.log(label, "errors:", errors.length ? errors.join(" | ") : "none");
  await browser.close();
}

(async () => {
  await run({ width: 1280, height: 800 }, "new_1280");
  await run({ width: 390, height: 844 }, "new_390");
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
