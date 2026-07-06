/*
 * story-field.js — 3D story analysis client.
 *
 * Two views over one story, in one canvas:
 *   FIELDS    — grammatical + semantic fields as trajectories, at a chosen scale
 *               (sentences / paragraphs / chapters); connectors colored by decoupling.
 *   NARRATIVE — the events as an arc (height = tension), an as-told ⇄ as-happened
 *               toggle (position = chosen order, color = chronology, so a flashback
 *               reads as colors out of sequence), with character threads.
 *
 * Field data: POST /api/fields (local Python). Narrative data: POST /api/narrative (LLM).
 * Plain Three.js (ES module), hand-rolled orbit — no build step.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
(function () {
  let scene, camera, renderer, group, raycaster, pointer, tooltipEl;
  let inited = false;
  let data = null;        // field data
  let narrative = null;   // narrative data
  let view = "fields";    // "fields" | "narrative"
  let scale = "sentences";
  let ordering = "told";  // "told" | "happened"
  let hoverable = [];

  let theta = 0.7, phi = 1.15, radius = 14;
  let target;

  const GRAMMAR_COLOR = 0x60a5fa;
  const SEMANTIC_COLOR = 0xfbbf24;
  const CHAPTER_HUES = [0x60a5fa, 0xf472b6, 0x4ade80, 0xa78bfa, 0xfb923c, 0x38bdf8, 0xf87171, 0xfacc15];
  const SCALE_RANGE = 9;
  const SPLIT = 6;

  function el(id) { return document.getElementById(id); }

  function init() {
    const host = el("sf-canvas");
    target = new THREE.Vector3(0, 0, 0);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a14);
    const w = host.clientWidth, h = host.clientHeight;
    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w, h);
    host.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.5); dir.position.set(5, 10, 7); scene.add(dir);
    group = new THREE.Group(); scene.add(group);
    raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
    tooltipEl = el("sf-tooltip");
    bindControls(renderer.domElement);
    window.addEventListener("resize", onResize);
    updateCamera(); animate(); inited = true;
  }

  function makeLabel(text, x, y, color) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
    ctx.font = "bold 38px monospace"; ctx.fillText(text, 6, 44);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.position.set(x, y, 0); spr.scale.set(4.5, 1.1, 1); group.add(spr);
  }

  function clearGroup() {
    for (let i = group.children.length - 1; i >= 0; i--) {
      const c = group.children[i]; group.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
    }
    hoverable = [];
  }

  function sphere(pos, color, r) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, roughness: 0.5 })
    );
    m.position.copy(pos); return m;
  }

  function line(points, color, opacity) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
  }

  // ── FIELDS view ──
  function nodesFor(s) {
    if (!data) return [];
    return data.scales[s] || data.scales.sentences;
  }
  function vpos(coord3, xOffset) {
    return new THREE.Vector3(coord3[0] * SCALE_RANGE + xOffset, coord3[1] * SCALE_RANGE, coord3[2] * SCALE_RANGE);
  }
  function buildFields() {
    if (!inited || !data) return;
    clearGroup();
    const nodes = nodesFor(scale);
    if (!nodes.length) return;
    makeLabel("GRAMMAR", -SPLIT - 2, -SCALE_RANGE * 0.75, GRAMMAR_COLOR);
    makeLabel("SEMANTIC", SPLIT - 2, -SCALE_RANGE * 0.75, SEMANTIC_COLOR);
    const byField = !data.counts || data.counts.chapters <= 1;
    const gPts = [], sPts = [];
    nodes.forEach((n, i) => {
      const chapter = n.chapter != null ? n.chapter : (n.level === "chapter" ? n.i : 0);
      const hue = CHAPTER_HUES[chapter % CHAPTER_HUES.length];
      const gColor = byField ? GRAMMAR_COLOR : hue;
      const sColor = byField ? SEMANTIC_COLOR : hue;
      const weight = n.weight != null ? n.weight : 0.5;
      const r = 0.18 + weight * 0.5;
      const gp = vpos(n.grammar3d, -SPLIT), sp = vpos(n.semantic3d, SPLIT);
      gPts.push(gp); sPts.push(sp);
      const gNode = sphere(gp, gColor, r), sNode = sphere(sp, sColor, r);
      gNode.userData = sNode.userData = { node: n };
      group.add(gNode); group.add(sNode); hoverable.push(gNode, sNode);
      const div = n.divergence != null ? n.divergence : 0;
      const cc = new THREE.Color().lerpColors(new THREE.Color(0x334155), new THREE.Color(0xf87171), Math.min(1, div * 1.6));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([gp, sp]), new THREE.LineBasicMaterial({ color: cc, transparent: true, opacity: 0.35 })));
    });
    line(gPts, GRAMMAR_COLOR, 0.55);
    line(sPts, SEMANTIC_COLOR, 0.55);
  }

  // ── NARRATIVE view ──
  function chronoColor(e, n) {
    const t = (e.happened_order - 1) / Math.max(1, n - 1); // 0 early → 1 late
    const c = new THREE.Color(); c.setHSL(0.62 - 0.62 * t, 0.7, 0.55); return c; // blue → red
  }
  function buildNarrative() {
    if (!inited || !narrative) return;
    clearGroup();
    const evs = narrative.events.slice().sort((a, b) =>
      ordering === "happened" ? a.happened_order - b.happened_order : a.told_order - b.told_order);
    const N = evs.length; if (!N) return;
    const spanX = Math.min(22, N * 1.4);
    const stepX = N > 1 ? spanX / (N - 1) : 0;
    const x0 = -spanX / 2;
    const xy = (e, i) => new THREE.Vector3(x0 + i * stepX, (e.tension - 0.5) * 10, 0);

    const arcPts = [];
    evs.forEach((e, i) => {
      const p = xy(e, i); arcPts.push(p);
      const col = chronoColor(e, N);
      const m = sphere(p, col.getHex(), 0.25 + e.tension * 0.55);
      m.material.emissive = col; m.material.emissiveIntensity = 0.35;
      m.userData = { node: { text: e.summary, level: "event", i: e.told_order, title: "told " + e.told_order + " · happened " + e.happened_order, chars: e.characters } };
      group.add(m); hoverable.push(m);
    });
    line(arcPts, 0x94a3b8, 0.5); // the arc

    // character threads (each character linked through the events it appears in)
    const chars = narrative.characters || [];
    chars.forEach((ch, ci) => {
      const z = (ci - (chars.length - 1) / 2) * 0.9;
      const col = CHAPTER_HUES[ci % CHAPTER_HUES.length];
      const pts = [];
      evs.forEach((e, i) => { if ((e.characters || []).includes(ch.id)) { const p = xy(e, i); pts.push(new THREE.Vector3(p.x, p.y, z)); } });
      if (pts.length > 1) line(pts, col, 0.4);
    });

    makeLabel(ordering === "happened" ? "AS HAPPENED" : "AS TOLD", x0, -6.5, 0x94a3b8);
    makeLabel("tension", x0 - 2.5, 4.5, 0x475569);
  }

  function build() { if (view === "narrative") buildNarrative(); else buildFields(); }

  // ── camera / controls ──
  function updateCamera() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.sin(theta));
    camera.lookAt(target);
  }
  function bindControls(dom) {
    let dragging = false, px = 0, py = 0;
    dom.addEventListener("mousedown", (e) => { dragging = true; px = e.clientX; py = e.clientY; });
    window.addEventListener("mouseup", () => { dragging = false; });
    window.addEventListener("mousemove", (e) => {
      if (dragging) {
        theta -= (e.clientX - px) * 0.008;
        phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi - (e.clientY - py) * 0.008));
        px = e.clientX; py = e.clientY; updateCamera();
      }
      onPointerMove(e);
    });
    dom.addEventListener("wheel", (e) => { e.preventDefault(); radius = Math.max(3, Math.min(60, radius + (e.deltaY > 0 ? 1 : -1))); updateCamera(); }, { passive: false });
  }
  function onResize() {
    if (!inited) return;
    const host = el("sf-canvas"); const w = host.clientWidth, h = host.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  }

  function onPointerMove(e) {
    if (!inited) return;
    const rect = renderer.domElement.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) { tooltipEl.style.display = "none"; return; }
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hoverable, false);
    if (hits.length) {
      const n = hits[0].object.userData.node; const bits = [];
      if (n.text) bits.push(n.text);
      if (n.cell) bits.push("<span style='color:#60a5fa'>" + n.cell + "</span>");
      if (n.title) bits.push("<span style='color:#64748b'>" + n.title + "</span>");
      if (n.weight != null) bits.push("<span style='color:#fbbf24'>weight " + n.weight + "</span>");
      tooltipEl.innerHTML = bits.join("<br>");
      tooltipEl.style.display = "block";
      tooltipEl.style.left = (e.clientX - rect.left + 14) + "px";
      tooltipEl.style.top = (e.clientY - rect.top + 14) + "px";
    } else { tooltipEl.style.display = "none"; }
  }

  function animate() { requestAnimationFrame(animate); if (renderer) renderer.render(scene, camera); }

  function updateReadout() {
    if (!data) return;
    const f = data.fields, c = data.counts;
    el("sf-readout").innerHTML =
      "<span class='badge'>" + c.sentences + " sentences</span>" +
      "<span class='badge'>" + c.paragraphs + " paragraphs</span>" +
      "<span class='badge'>" + c.chapters + " chapters</span>" +
      "<span class='badge'>coupling r = " + f.coupling_r + "</span>" +
      "<span class='meta' style='margin-left:8px'>grammar PCA " + f.grammar_pca_explained.map(x => Math.round(x * 100) + "%").join("/") +
      " · semantic PCA " + f.semantic_pca_explained.map(x => Math.round(x * 100) + "%").join("/") + "</span>";
  }

  function setActive(cls, attr, val) {
    document.querySelectorAll("." + cls).forEach(b => b.classList.toggle("active", b.dataset[attr] === val));
  }

  // ── public API ──
  window.sfAnalyze = async function () {
    const txt = el("sf-text").value.trim(); const err = el("sf-error"); err.textContent = "";
    if (!txt) { err.textContent = "Paste a story first."; return; }
    const btn = el("sf-btn"); btn.disabled = true; btn.textContent = "Analyzing…";
    try {
      const resp = await fetch("/api/fields", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: txt }) });
      const j = await resp.json();
      if (!resp.ok || j.error) throw new Error(j.error || ("HTTP " + resp.status));
      data = j; if (!inited) init(); updateReadout();
      window.sfSetView("fields");
    } catch (e) { err.textContent = "Error: " + (e.message || e); }
    btn.disabled = false; btn.textContent = "Analyze fields";
  };
  window.sfNarrative = async function () {
    const txt = el("sf-text").value.trim(); const err = el("sf-error"); err.textContent = "";
    if (!txt) { err.textContent = "Paste a story first."; return; }
    const btn = el("sf-nbtn"); btn.disabled = true; btn.textContent = "Extracting… (LLM)";
    try {
      const resp = await fetch("/api/narrative", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: txt }) });
      const j = await resp.json();
      if (!resp.ok || j.error) throw new Error(j.error || ("HTTP " + resp.status));
      narrative = j; if (!inited) init();
      el("sf-arc").textContent = j.arc && j.arc.shape ? ("arc: " + j.arc.shape + (j.truncated ? "  (text truncated for analysis)" : "")) : "";
      window.sfSetView("narrative");
    } catch (e) { err.textContent = "Error: " + (e.message || e); }
    btn.disabled = false; btn.textContent = "Show narrative";
  };
  window.sfSetView = function (v) {
    if (v === "fields" && !data) return;
    if (v === "narrative" && !narrative) { el("sf-error").textContent = "Run Narrative first."; return; }
    view = v; setActive("sf-view", "view", v);
    el("sf-scale-controls").style.display = v === "fields" ? "inline" : "none";
    el("sf-order-controls").style.display = v === "narrative" ? "inline" : "none";
    build();
  };
  window.sfSetScale = function (s) { scale = s; setActive("sf-scale", "scale", s); if (view === "fields") buildFields(); };
  window.sfSetOrder = function (o) { ordering = o; setActive("sf-order", "order", o); if (view === "narrative") buildNarrative(); };
})();
