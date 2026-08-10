/* app.js — state machine, password gate, scene switching */

(function () {
  const PASSWORD = "1947";
  const MAX = PASSWORD.length;

  const state = { value: "", locked: true };

  const input = document.getElementById("codeInput");
  const slots = Array.from(document.querySelectorAll("#codeSlots .slot"));
  const codeBox = document.getElementById("codeSlots");
  const btn = document.getElementById("reconstructBtn");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- section switching ---------- */
  function switchTo(id) {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.toggle("is-active", s.id === id);
    });
    const dustMap = { lock: 0.35, fragments: 0.45, reconstruction: 0.7, ending: 0.9 };
    if (window.Dust) Dust.setIntensity(dustMap[id] ?? 1);
    if (window.Network && window.Network.setActive) Network.setActive(id === "reconstruction");
  }

  /* ---------- code slots ---------- */
  function render() {
    slots.forEach((slot, i) => {
      const c = state.value[i] || "";
      slot.textContent = c;
      slot.classList.toggle("filled", !!c);
      slot.classList.toggle("cursor", i === state.value.length && state.value.length < MAX);
    });
  }

  function push(d) {
    if (state.value.length >= MAX) return;
    state.value += d;
    render();
    if (state.value.length === MAX) check();
  }

  function pop() {
    if (state.value.length === 0) return;
    state.value = state.value.slice(0, -1);
    render();
  }

  function clear() {
    state.value = "";
    render();
  }

  function reject() {
    codeBox.classList.remove("shake");
    void codeBox.offsetWidth;
    codeBox.classList.add("shake");
    setTimeout(() => {
      clear();
      if (!state.locked) input.focus({ preventScroll: true });
    }, reduced ? 120 : 420);
  }

  function check() {
    if (state.value === PASSWORD) {
      if (!state.locked) return;
      state.locked = false;
      if (window.Anim) {
        Anim.unlock(afterUnlock);
      } else {
        afterUnlock();
      }
    } else {
      reject();
    }
  }

  /* ---------- scene flow ---------- */
  function afterUnlock() {
    input.blur();
    switchTo("fragments");
    Anim.fragmentsIn();
    setTimeout(() => Anim.showFragmentsMessage(), reduced ? 200 : 2000);
  }

  function startReconstruction() {
    Anim.reconstruct(() => {
      switchTo("reconstruction");
      Anim.flagAssembly(() => {
        Anim.reconstruction(() => {
          switchTo("ending");
          Anim.ending();
        });
      });
    });
  }

  /* ---------- input wiring ---------- */
  codeBox.addEventListener("click", () => input.focus());

  /* keep the code slots visible above the on-screen keyboard */
  const lockWrap = document.querySelector("#lock .lock-wrap");
  let kbLift = 0;

  function applyLift(px) {
    kbLift = px;
    if (lockWrap) lockWrap.style.transform = kbLift ? "translateY(" + (-kbLift) + "px)" : "";
  }

  function adjustForKeyboard() {
    const vv = window.visualViewport;
    if (!vv || document.activeElement !== input) { applyLift(0); return; }
    if (vv.height > window.innerHeight - 80) { applyLift(0); return; }
    const bottom = codeBox.getBoundingClientRect().bottom + kbLift - (vv.offsetTop || 0);
    const overlap = bottom - vv.height + 36;
    if (overlap <= 0) { applyLift(0); return; }
    const maxLift = lockWrap ? lockWrap.getBoundingClientRect().top + kbLift : overlap;
    applyLift(Math.round(Math.min(overlap, maxLift)));
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", adjustForKeyboard);
    window.visualViewport.addEventListener("scroll", adjustForKeyboard);
  }
  window.addEventListener("resize", adjustForKeyboard);
  input.addEventListener("focus", () => {
    applyLift(0);
    codeBox.scrollIntoView({ block: "center", behavior: "smooth" });
    [150, 300, 500, 800].forEach((t) => setTimeout(adjustForKeyboard, t));
  });
  input.addEventListener("input", adjustForKeyboard);
  input.addEventListener("blur", () => applyLift(0));

  document.addEventListener("keydown", (e) => {
    if (!state.locked) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); push(e.key); return; }
    if (e.key === "Backspace") { e.preventDefault(); pop(); return; }
    if (e.key === "Enter") { e.preventDefault(); if (state.value.length === MAX) check(); return; }
    if (e.key.length === 1) e.preventDefault();
  });

  btn.addEventListener("click", startReconstruction);

  /* ---------- restart flow ---------- */
  const restartBtn = document.getElementById("restartBtn");
  restartBtn.addEventListener("click", () => {
    if (state.locked) return;
    const overlay = document.getElementById("flashOverlay");
    const done = () => location.reload();
    if (window.gsap) {
      gsap.fromTo(overlay, { opacity: 0 }, {
        opacity: 1, duration: 0.45, ease: "power2.in", onComplete: done
      });
    } else {
      done();
    }
  });

  /* ---------- boot ---------- */
  function boot() {
    render();
    if (!window.gsap) {
      // CDN unavailable — show a usable static fallback
      document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
      document.getElementById("fragments").classList.add("is-active");
      document.querySelectorAll(".fragment").forEach((f) => (f.style.opacity = 1));
      document.getElementById("reconstructBtn").classList.add("ready");
      return;
    }
    Anim.init();
    setTimeout(() => input.focus({ preventScroll: true }), 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
