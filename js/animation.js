/* animation.js — GSAP timelines, SplitType text, scene orchestration */

(function () {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const splitMap = {};

  function splitText(el) {
    if (!window.SplitType) return null;
    try {
      const st = new SplitType(el, { types: "words,chars" });
      return st.chars || null;
    } catch (e) {
      return null;
    }
  }

  /* ---------------- LOCK ---------------- */
  function lockIntro() {
    const tl = gsap.timeline({ delay: 0.25 });
    tl.fromTo(".cs-badge",
        { opacity: 0, scale: 0.5, y: -10 },
        { opacity: 0.3, scale: 1, y: 0, duration: 1.2, stagger: 0.14, ease: "power2.out" }, 0.2)
      .from(".lock-svg", { y: 30, opacity: 0, duration: 1.3, ease: "power3.out" }, 0.25)
      .from(".lock-label", { opacity: 0, y: 14, duration: 0.8, ease: "power2.out" }, "-=0.8")
      .from(".slot", { opacity: 0, y: 20, duration: 0.55, stagger: 0.09, ease: "back.out(2)" }, "-=0.6")
      .from(".lock-hint", { opacity: 0, duration: 0.9 }, "-=0.4")
      .from(".lock-brand", { opacity: 0, duration: 0.9 }, "-=0.5");

    gsap.to(".lock-svg", {
      rotation: 1.1,
      yoyo: true,
      repeat: -1,
      duration: 3.4,
      ease: "sine.inOut",
      transformOrigin: "50% 100%"
    });
  }

  function unlock(onComplete) {
    gsap.killTweensOf(".lock-svg");
    const tl = gsap.timeline();
    tl.to(".lock-wrap", { x: -7, duration: 0.05, yoyo: true, repeat: 5 })
      .to(".lock-wrap", { x: 0, duration: 0.1 })
      .add(() => {
        gsap.to(".key-glow", { opacity: 1, duration: 0.5, ease: "power2.out" });
        gsap.to("#shackle", {
          rotation: 34,
          transformOrigin: "100px 20px",
          duration: 0.55,
          ease: "power2.out",
          delay: 0.15
        });
        gsap.to("#lockBody", { y: 8, duration: 0.55, ease: "power2.in", delay: 0.15 });
        gsap.to(".lock-label", { color: "#d4af37", duration: 0.5, delay: 0.2 });
      })
      .to({}, { duration: 0.7 })
      .add(flash)
      .add(() => { if (onComplete) onComplete(); });
  }

  function flash() {
    const el = document.getElementById("flashOverlay");
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: "power2.out" });
    gsap.to(el, { opacity: 0, duration: 1.1, ease: "power2.inOut", delay: 0.35 });
  }

  /* ---------------- FRAGMENTS ---------------- */
  function fragmentsIn() {
    const rand = gsap.utils.random;
    gsap.fromTo(".fragment",
      {
        opacity: 0,
        x: () => rand(-70, 70),
        y: () => rand(70, 130),
        scale: 0.82,
        rotation: () => rand(-9, 9)
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        duration: 1.15,
        stagger: 0.11,
        ease: "power3.out",
        delay: 0.15
      });
  }

  function revealQuote(key) {
    const chars = splitMap[key];
    const el = document.querySelector(`[data-split="${key}"]`);
    if (!el) return;
    gsap.to(el, { opacity: 1, duration: 0.5 });
    if (chars && chars.length) {
      gsap.fromTo(chars,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.022, ease: "power2.out" });
    } else {
      gsap.to(el, { opacity: 1, duration: 0.7 });
    }
  }

  function showFragmentsMessage() {
    revealQuote("msg1");
    gsap.to("#fragmentsMessage .frag-rule", { opacity: 1, duration: 0.6, delay: 0.12 });
    gsap.to("#reconstructBtn", {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      delay: 0.6,
      onComplete: () => document.getElementById("reconstructBtn").classList.add("ready")
    });
  }

  function reconstruct(onComplete) {
    const field = document.getElementById("fragmentsField");
    const sheet = document.getElementById("assembledSheet");
    const els = Array.from(document.querySelectorAll(".fragment"));
    const tapes = Array.from(document.querySelectorAll(".tape"));
    const rand = gsap.utils.random;

    if (!field || !sheet) {
      gsap.to(els, { opacity: 0, duration: 0.3 });
      gsap.delayedCall(0.35, () => { flash(); if (onComplete) onComplete(); });
      return;
    }

    if (REDUCED) {
      gsap.set(els, { opacity: 0 });
      gsap.set(sheet, { opacity: 1 });
      gsap.set("#assembledSheet > *", { opacity: 1 });
      flash();
      gsap.delayedCall(0.3, () => { if (onComplete) onComplete(); });
      return;
    }

    const fr = field.getBoundingClientRect();

    gsap.to("#fragments .quote", { opacity: 0, duration: 0.5 });
    gsap.to("#reconstructBtn", { opacity: 0, duration: 0.4 });

    // where each piece belongs inside the page (fractions of the field)
    const TARGETS = {
      mast:    { x: 0.5,  y: 0.10, scale: 0.94 },
      head:    { x: 0.5,  y: 0.30, scale: 0.96 },
      map:     { x: 0.33, y: 0.55, scale: 0.95 },
      "body-a": { x: 0.53, y: 0.56, scale: 0.95 },
      "body-b": { x: 0.68, y: 0.72, scale: 0.95 },
      foot:    { x: 0.5,  y: 0.88, scale: 0.94 }
    };

    const tl = gsap.timeline();

    // every scrap glides to its place in the page — a smooth, weightless settle
    els.forEach((el, i) => {
      const kind = el.dataset.kind || "mast";
      const t = TARGETS[kind] || { x: 0.5, y: 0.5, scale: 0.95 };
      const r = el.getBoundingClientRect();
      const tx = t.x * fr.width - (r.left - fr.left + r.width / 2);
      const ty = t.y * fr.height - (r.top - fr.top + r.height / 2);
      tl.to(el, {
        rotate: 0,
        x: tx,
        y: ty,
        scale: t.scale,
        duration: 0.9,
        ease: "power2.inOut",
        delay: i * 0.06
      }, 0);
      tl.fromTo(el,
        { rotation: () => rand(-10, 10) },
        { rotation: 0, duration: 0.9, ease: "power2.inOut", delay: i * 0.06 },
        0);
    });

    // little bursts where the pieces meet
    tl.add(() => {
      Object.keys(TARGETS).forEach((k) => {
        joinFlash(TARGETS[k].x * fr.width, TARGETS[k].y * fr.height);
      });
    }, 1.0);

    // the impact — the instant the sheet lands, the scraps are gone
    tl.add(() => {
      gsap.set(els, { opacity: 0 });
      flash();
      shakeField();
      gsap.fromTo(sheet, { scale: 1.06 }, { scale: 1, duration: 0.65, ease: "elastic.out(1, 0.5)", delay: 0.04 });
    }, 1.3)
      .fromTo(sheet,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.75, ease: "power3.out" }, 1.3)
      .fromTo("#assembledSheet > *",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }, 1.55)
      .fromTo(tapes,
        { opacity: 0, scale: 1.5 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out", stagger: 0.12 }, 1.7);

    tl.call(() => { if (onComplete) onComplete(); }, null, 3.3);
  }

  function joinFlash(x, y) {
    const field = document.getElementById("fragmentsField");
    if (!field) return;
    const div = document.createElement("div");
    div.className = "join-flash";
    div.style.left = x + "px";
    div.style.top = y + "px";
    field.appendChild(div);
    gsap.fromTo(div,
      { opacity: 1, scale: 0.4 },
      { opacity: 0, scale: 1.9, duration: 0.7, ease: "power2.out", onComplete: () => div.remove() });
  }

  function shakeField() {
    const field = document.getElementById("fragmentsField");
    if (!field) return;
    gsap.timeline()
      .to(field, { x: -10, duration: 0.05, yoyo: true, repeat: 5, ease: "power1.inOut" })
      .to(field, { x: 0, duration: 0.12 });
  }

  /* ---------------- FLAG ASSEMBLY ---------------- */
  function flagAssembly(onComplete) {
    const shards = Array.from(document.querySelectorAll("#reconFlag .shard"));
    const cres = document.getElementById("reconCrescent");
    const star = document.getElementById("reconStar");
    const done = () => { if (onComplete) onComplete(); };
    if (!shards.length || !cres || !star) { done(); return; }

    if (REDUCED) {
      gsap.set(shards, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });
      gsap.set([cres, star], { attr: { fill: "#ffffff", "fill-opacity": 1, stroke: "none" } });
      gsap.set("#reconFlag", { opacity: 1 });
      gsap.delayedCall(0.01, done);
      return;
    }

    const rand = gsap.utils.random;
    gsap.set(shards, {
      opacity: 0,
      x: () => rand(-230, 230),
      y: () => rand(-130, 130),
      rotation: () => rand(-32, 32),
      scale: () => rand(0.5, 1.25),
      transformOrigin: "50% 50%"
    });
    gsap.set("#reconFlag", { opacity: 1, scale: 0.6, transformOrigin: "50% 50%" });
    gsap.set([cres, star], {
      attr: { fill: "#ffffff", "fill-opacity": 0, stroke: "#ffffff", "stroke-width": 2.5, "stroke-dasharray": 1, "stroke-dashoffset": 1 }
    });

    const tl = gsap.timeline();
    tl.to("#reconFlag", { scale: 1, duration: 0.65, ease: "power3.out" }, 0)
      .to(shards, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: 0.7, stagger: 0.04, ease: "power3.out" }, 0)
      .to(cres, { attr: { "stroke-dashoffset": 0 }, duration: 0.5, ease: "power1.inOut" }, "+=0.1")
      .to(cres, { attr: { "fill-opacity": 1 }, duration: 0.3, ease: "power2.out" }, "-=0.12")
      .to(cres, { attr: { "stroke-width": 0 }, duration: 0.2 }, "<")
      .to(star, { attr: { "stroke-dashoffset": 0 }, duration: 0.4, ease: "power1.inOut" }, "+=0.08")
      .to(star, { attr: { "fill-opacity": 1 }, duration: 0.28, ease: "power2.out" }, "-=0.12")
      .to(star, { attr: { "stroke-width": 0 }, duration: 0.2 }, "<")
      .to("#reconFlag", { opacity: 0, duration: 0.4, ease: "power1.inOut", onComplete: done });
  }

  /* ---------------- RECONSTRUCTION ---------------- */
  function scatterProvinces() {
    const fills = Array.from(document.querySelectorAll(".prov-fill"));
    const lines = Array.from(document.querySelectorAll(".prov-line"));
    const rand = gsap.utils.random;
    fills.forEach((p, i) => {
      let bb;
      try { bb = p.getBBox(); } catch (e) { return; }
      const px = bb.x + bb.width / 2;
      const py = bb.y + bb.height / 2;
      const dx = px - 500;
      const dy = py - 400;
      const len = Math.hypot(dx, dy) || 1;
      const dist = rand(70, 165);
      const ox = (dx / len) * dist + rand(-40, 40);
      const oy = (dy / len) * dist + rand(-40, 40);
      gsap.set([p, lines[i]], { x: ox, y: oy, rotation: rand(-9, 9), svgOrigin: "500 400" });
    });
  }

  function slamImpact() {
    const stage = document.querySelector("#reconstruction .stage");
    if (stage) {
      gsap.timeline()
        .to(stage, { x: -11, duration: 0.05, yoyo: true, repeat: 5, ease: "power1.inOut" })
        .to(stage, { x: 0, duration: 0.12 });
    }
    const flashEl = document.getElementById("recFlash");
    if (flashEl) {
      gsap.timeline()
        .fromTo(flashEl, { opacity: 1, scale: 0.8 }, { opacity: 0, scale: 3.6, duration: 0.7, ease: "power2.out" });
    }
    gsap.fromTo("#mapSvg",
      { scale: 1.05, transformOrigin: "50% 50%" },
      { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.45)", delay: 0.05 });
    gsap.fromTo("#dnaSvg",
      { scale: 1.04, transformOrigin: "50% 50%" },
      { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)", delay: 0.06 });
    gsap.fromTo(".prov-fill",
      { filter: "brightness(1.5)" },
      { filter: "brightness(1)", duration: 0.5, ease: "power2.out", delay: 0.05 });
  }

  function reconstruction(onComplete) {
    const tl = gsap.timeline();

    if (REDUCED) {
      tl.set("#mapSvg, #networkSvg, #dnaSvg, .map-label, #mapLabel, #dnaLabel", { opacity: 1 })
        .set(".prov-fill", { opacity: 1 })
        .set(".prov-line", { strokeDashoffset: 0, opacity: 1 })
        .call(() => window.Network.show(), null, 0)
        .call(() => revealQuote("msg2"), null, 0.1);
      gsap.delayedCall(14, () => { if (onComplete) onComplete(); });
      return;
    }

    // provinces start as separated scraps — gaps between them
    scatterProvinces();

    tl.set("#recFlash", { opacity: 1, scale: 0.4 }, 0)
      .to("#recFlash", { opacity: 0, scale: 3.2, duration: 0.85, ease: "power2.out" }, 0)
      .to("#mapSvg", { opacity: 1, duration: 0.45, ease: "power2.out" }, 0.15)

      // ragged outlines of the separated pieces draw themselves — brisk but smooth
      .fromTo(".prov-line",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 1.25, stagger: 0.05, ease: "power1.inOut" }, 0.3)
      .to(".prov-fill",
        { opacity: 1, duration: 0.9, ease: "power1.inOut", stagger: 0.05 }, 1.0)

      // DNA builds beside the map — strand draw-in then rungs snap into place
      .to("#dnaSvg", { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.5)
      .call(() => animateDNA(), null, 0.5)

      // migration network traces over the still-separated pieces
      .call(() => window.Network.show(), null, 2.0)
      .to("#networkSvg", { opacity: 1, duration: 0.7, ease: "power2.out" }, 2.0)

      // THE MERGE — every province slams home: no gaps, one nation
      .to(".prov-fill, .prov-line",
        { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.7, ease: "power4.in", stagger: 0.06 }, 3.8)
      .add(() => slamImpact(), 5.5)
      // internal seams dissolve into a single silhouette
      .to(".prov-line", { opacity: 0.22, duration: 1.0, ease: "power1.inOut" }, 5.6)
      .to(".map-label", { opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out" }, 6.0)
      .to("#mapLabel", { opacity: 1, duration: 0.5, ease: "power2.out" }, 6.4)
      .to("#dnaLabel", { opacity: 1, duration: 0.5, ease: "power2.out" }, 6.45)
      .call(() => revealQuote("msg2"), null, 6.9);

    gsap.delayedCall(21, () => {
      if (onComplete) onComplete();
    });
  }

  function animateDNA() {
    const strands = Array.from(document.querySelectorAll("#dnaSvg .dna-strand"));
    if (!strands.length) return;

    const svg = document.getElementById("dnaSvg");

    const rungs = Array.from(document.querySelectorAll("#dnaSvg .dna-rung")).map((el) => ({
      el,
      x1: parseFloat(el.getAttribute("x1")),
      x2: parseFloat(el.getAttribute("x2"))
    }));

    // the two strands uncoil smoothly, offset so the helix forms with a wave
    strands.forEach((s, i) => {
      const len = s.getTotalLength();
      gsap.set(s, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(s, { strokeDashoffset: 0, duration: 2.8, ease: "power2.inOut", delay: 0.2 + i * 0.4 });
    });

    // rungs stream into place top to bottom, trailing the strands
    rungs.forEach((r, i) => {
      gsap.fromTo(r.el,
        { attr: { x1: 100, x2: 100 }, opacity: 0 },
        {
          attr: { x1: r.x1, x2: r.x2 },
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          delay: 2.2 + i * 0.08
        });
    });

    // a soft gold glow settles over the finished helix
    gsap.fromTo(svg,
      { filter: "drop-shadow(0 0 0px rgba(212, 175, 55, 0))" },
      { filter: "drop-shadow(0 0 15px rgba(212, 175, 55, 0.42))", duration: 1.6, ease: "sine.out", delay: 4.4 });

    // a gentle sway so the double helix keeps turning, alive
    gsap.to(svg, {
      rotation: 1.8,
      yoyo: true,
      repeat: -1,
      duration: 3.6,
      ease: "sine.inOut",
      transformOrigin: "50% 50%",
      delay: 4.9
    });

    // the helix breathes
    gsap.fromTo(svg, { y: 0 }, { y: -4, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 5.4 });

    // a signal pulses down the helix forever — rungs shimmer in sequence
    const pulse = gsap.timeline({ repeat: -1, delay: 5.2 });
    rungs.forEach((r, i) => {
      pulse.fromTo(r.el, { opacity: 0.45 }, { opacity: 1, duration: 0.22, ease: "sine.inOut" }, i * 0.06);
      pulse.fromTo(r.el, { opacity: 1 }, { opacity: 0.45, duration: 0.3, ease: "sine.inOut" }, i * 0.06 + 0.24);
    });
  }

  /* ---------------- ENDING ---------------- */
  function waveFlag() {
    if (REDUCED) return;
    gsap.to(".flag-cloth", {
      skewX: 3.2, rotation: 0.8, y: 1.5,
      duration: 1.7, yoyo: true, repeat: -1, ease: "sine.inOut"
    });
    gsap.to("#flagRig", {
      rotation: 0.4, duration: 2.1, yoyo: true, repeat: -1, ease: "sine.inOut",
      transformOrigin: "50% 100%"
    });
  }

  function ending() {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo(".ghost-path",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 1.9, stagger: 0.1, ease: "power1.inOut" }, 0)
      .to(".end-map-ghost", { opacity: 1, duration: 1.1, ease: "power1.inOut" }, 0)
      .to(".end-map-ghost", { opacity: 0, duration: 1.3, ease: "power1.inOut" }, 2.2)
      .to(".end-cs", { opacity: 0.08, duration: 1.4, ease: "power1.inOut" }, 0)
      .fromTo(".end-divider", { width: 0, opacity: 0 }, { width: 72, opacity: 1, duration: 1.0, stagger: 0.2, ease: "power3.out" }, 0.5)
      .call(() => revealQuote("msg3"), null, 1.0)
      .to(".end-foot", { opacity: 1, duration: 0.7, ease: "power2.out" }, 2.0)
      /* flag hoist */
      .to("#flagRig", { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.2)
      .fromTo(".flag-cloth",
        { y: 165, scaleY: 0.06, skewX: -12, transformOrigin: "50% 0%" },
        { y: 0, scaleY: 1, skewX: 0, duration: 1.9, ease: "power3.out", onComplete: waveFlag }, 0.4)
      .to(".flag-mark", { opacity: 1, duration: 0.8, ease: "power2.out" }, 1.6)
      .to(".flag-caption", { opacity: 1, duration: 0.6, ease: "power2.out" }, 2.1)
      .to("#restartBtn", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 2.6)
      .add(() => document.getElementById("restartBtn").classList.add("ready"), 2.6);
  }

  /* ---------------- PUBLIC ---------------- */
  function init() {
    if (REDUCED) gsap.globalTimeline.timeScale(8);

    // pre-split quotes and hold them hidden
    document.querySelectorAll(".split-me").forEach((el) => {
      const key = el.dataset.split;
      const chars = splitText(el);
      splitMap[key] = chars;
      if (chars && chars.length) {
        gsap.set(chars, { opacity: 0, y: 14 });
      } else {
        gsap.set(el, { opacity: 0 });
      }
    });

    window.Network.init();
    window.Network.buildDNA();

    lockIntro();
  }

  window.Anim = {
    init,
    unlock,
    fragmentsIn,
    showFragmentsMessage,
    reconstruct,
    flagAssembly,
    reconstruction,
    ending
  };
})();
