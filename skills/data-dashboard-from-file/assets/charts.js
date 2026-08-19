/* ============================================================================
   charts.js — vanilla SVG chart renderers + helpers for the data dashboard.
   Inline this whole file inside a <script> tag in the final single-file page.
   No dependencies, no network — draws SVG by hand so it survives a strict CSP
   and works offline. Pairs with the classes in dashboard.css.

   Every renderer takes a container element (or its id) and plain data, and is
   safe to call again to re-render (it replaces innerHTML). Number formatting is
   ru-RU by default; pass your own `fmt` for other locales/units.
   ============================================================================ */

const RU = new Intl.NumberFormat("ru-RU");
const fmtInt = v => RU.format(Math.round(v));
const fmtRub = v => RU.format(Math.round(v)) + " ₽";
/* compact money/counts: 1389625 -> "1,39 млн", 474406 -> "474к", 212 -> "212" */
const fmtK = v => {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(2).replace(".", ",") + " млн";
  if (a >= 1e4) return Math.round(v / 1000) + "к";
  if (a >= 1000) return (v / 1000).toFixed(1).replace(".", ",") + "к";
  return RU.format(Math.round(v));
};
const el = x => (typeof x === "string" ? document.getElementById(x) : x);

/* ---- shared hover tooltip (needs a <div id="tt"></div> in the page) ---- */
const _tt = () => document.getElementById("tt");
function showTip(e, html) { const t = _tt(); t.innerHTML = html; t.style.opacity = 1; moveTip(e); }
function moveTip(e) {
  const t = _tt(), p = 8; let x = e.clientX + 12, y = e.clientY + 12;
  if (x + t.offsetWidth > innerWidth - p) x = e.clientX - t.offsetWidth - 12;
  if (y + t.offsetHeight > innerHeight - p) y = e.clientY - t.offsetHeight - 12;
  t.style.left = x + "px"; t.style.top = y + "px";
}
function hideTip() { _tt().style.opacity = 0; }
document.addEventListener("mousemove", e => { const t = _tt(); if (t && t.style.opacity == 1) moveTip(e); });

/* ---- KPI tiles ----
   items: [{label, value, unit?, foot?, muted?}]  value is preformatted text  */
function kpiTiles(container, items) {
  el(container).innerHTML = items.map(i => `
    <div class="kpi ${i.muted ? "muted" : ""}">
      <div class="k-label">${i.label}</div>
      <div class="k-val tnum">${i.value}${i.unit ? ` <small>${i.unit}</small>` : ""}</div>
      <div class="k-foot">${i.foot || ""}</div>
    </div>`).join("");
}

/* ---- vertical bar chart ----
   data: [{label, value, full?}]   opts: {fmt}  (value labels shown if <=8 bars) */
function barChart(container, data, opts = {}) {
  const fmt = opts.fmt || fmtInt;
  const d = data.filter(x => x.value != null && !isNaN(x.value));
  const W = 380, H = 200, pl = 8, pr = 8, pt = 22, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(...d.map(x => x.value), 1), n = d.length, gap = n > 8 ? 4 : 10, bw = iw / n - gap;
  let g = "";
  for (let i = 0; i <= 3; i++) { const y = pt + ih - ih * i / 3;
    g += `<line class="gridline" x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}"/><text class="axis" x="${pl}" y="${y - 3}">${fmtK(max * i / 3)}</text>`; }
  d.forEach((x, i) => {
    const px = pl + i * (bw + gap) + gap / 2, h = Math.max(2, ih * x.value / max), y = pt + ih - h;
    g += `<rect class="bar" x="${px}" y="${y}" width="${bw}" height="${h}" rx="4" data-l="${x.full || x.label}" data-v="${fmt(x.value)}"></rect>`;
    if (n <= 8) g += `<text class="lbl" x="${px + bw / 2}" y="${y - 5}" text-anchor="middle">${fmtK(x.value)}</text>`;
    g += `<text class="axis" x="${px + bw / 2}" y="${H - 9}" text-anchor="middle">${x.label}</text>`;
  });
  const c = el(container); c.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  c.querySelectorAll(".bar").forEach(b => {
    b.addEventListener("mousemove", e => showTip(e, `${b.dataset.v}<div class="t-sub">${b.dataset.l}</div>`));
    b.addEventListener("mouseleave", hideTip);
  });
}

/* ---- grouped bars (e.g. plan vs fact) ----
   data: [{label, a, b, full?}]  opts: {fmt, aLabel, bLabel}  a=soft bar, b=accent bar */
function groupedBar(container, data, opts = {}) {
  const fmt = opts.fmt || fmtInt;
  const W = 380, H = 200, pl = 8, pr = 8, pt = 22, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(...data.flatMap(d => [d.a || 0, d.b || 0]), 1), n = data.length, grp = iw / n, bw = Math.min(30, (grp - 16) / 2);
  let g = "";
  for (let i = 0; i <= 3; i++) { const y = pt + ih - ih * i / 3;
    g += `<line class="gridline" x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}"/><text class="axis" x="${pl}" y="${y - 3}">${Math.round(max * i / 3)}</text>`; }
  data.forEach((d, i) => {
    const cx = pl + grp * i + grp / 2;
    [[opts.aLabel || "план", d.a, "bar-plan"], [opts.bLabel || "факт", d.b, "bar-fact"]].forEach((pp, j) => {
      const v = pp[1] || 0, h = Math.max(2, ih * v / max), y = pt + ih - h, x = cx - bw - 1 + j * (bw + 2);
      g += `<rect class="${pp[2]}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" data-l="${(d.full || d.label)} · ${pp[0]}" data-v="${fmt(v)}"></rect>`;
      g += `<text class="lbl" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" style="font-size:10px">${v}</text>`;
    });
    g += `<text class="axis" x="${cx}" y="${H - 9}" text-anchor="middle">${d.label}</text>`;
  });
  const c = el(container); c.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  c.querySelectorAll("rect").forEach(b => {
    b.addEventListener("mousemove", e => showTip(e, `${b.dataset.v}<div class="t-sub">${b.dataset.l}</div>`));
    b.addEventListener("mouseleave", hideTip);
  });
}

/* ---- line chart ---- data: [{label, value, full?}]  opts: {fmt} */
function lineChart(container, data, opts = {}) {
  const fmt = opts.fmt || fmtInt, d = data.filter(x => x.value != null && !isNaN(x.value));
  const W = 380, H = 200, pl = 8, pr = 10, pt = 22, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const c = el(container);
  if (d.length < 2) { c.innerHTML = `<svg viewBox="0 0 ${W} ${H}"><text class="axis" x="${W / 2}" y="${H / 2}" text-anchor="middle">мало данных</text></svg>`; return; }
  const max = Math.max(...d.map(x => x.value)), min = Math.min(...d.map(x => x.value), 0);
  const X = i => pl + iw * i / (d.length - 1), Y = v => pt + ih - ih * (v - min) / ((max - min) || 1);
  let g = "";
  for (let i = 0; i <= 3; i++) { const y = pt + ih - ih * i / 3;
    g += `<line class="gridline" x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}"/><text class="axis" x="${pl}" y="${y - 3}">${fmtK(min + (max - min) * i / 3)}</text>`; }
  const line = d.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(x.value).toFixed(1)}`).join(" ");
  const area = `M${X(0)} ${pt + ih} ` + d.map((x, i) => `L${X(i).toFixed(1)} ${Y(x.value).toFixed(1)}`).join(" ") + ` L${X(d.length - 1)} ${pt + ih} Z`;
  g += `<path class="lp-area" d="${area}"/><path class="lp" d="${line}"/>`;
  d.forEach((x, i) => {
    g += `<circle class="ldot" cx="${X(i).toFixed(1)}" cy="${Y(x.value).toFixed(1)}" r="4" data-l="${x.full || x.label}" data-v="${fmt(x.value)}"></circle>`;
    if (d.length <= 8) g += `<text class="lbl" x="${X(i)}" y="${Y(x.value) - 9}" text-anchor="middle">${fmtK(x.value)}</text>`;
    g += `<text class="axis" x="${X(i)}" y="${H - 9}" text-anchor="middle">${x.label}</text>`;
  });
  c.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  c.querySelectorAll(".ldot").forEach(o => {
    o.addEventListener("mousemove", e => showTip(e, `${o.dataset.v}<div class="t-sub">${o.dataset.l}</div>`));
    o.addEventListener("mouseleave", hideTip);
  });
}

/* ---- ranked horizontal bars ---- items: [{name, value}]  opts: {fmt, asc} */
function hbars(container, items, opts = {}) {
  const fmt = opts.fmt || fmtInt;
  const rows = items.filter(r => r.value != null).sort((a, b) => opts.asc ? a.value - b.value : b.value - a.value);
  const max = Math.max(...rows.map(r => r.value), 1);
  el(container).innerHTML = rows.map(r => {
    const w = Math.max(2, r.value / max * 100);
    return `<div class="hbar-row"><span class="hbar-name" title="${r.name}">${r.name}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${w}%"></div></div>
      <span class="hbar-val tnum">${fmt(r.value)}</span></div>`;
  }).join("");
}

/* ---- funnel ---- stages: [{name, value}]  opts: {fmt}  (0-value stage renders empty/dashed) */
function funnel(container, stages, opts = {}) {
  const fmt = opts.fmt || fmtInt, max = Math.max(...stages.map(s => s.value), 1);
  let h = "";
  stages.forEach((s, i) => {
    const w = Math.max(26, s.value / max * 100);
    h += `<div class="fn-stage ${s.value === 0 ? "empty" : ""}" style="width:${w}%"><span class="fn-name">${s.name}</span><span class="fn-val tnum">${fmt(s.value)}</span></div>`;
    if (i < stages.length - 1) {
      const conv = s.value > 0 ? stages[i + 1].value / s.value * 100 : 0;
      const cs = (conv > 0 && conv < 10) ? conv.toFixed(conv < 1 ? 2 : 1).replace(".", ",") : Math.round(conv);
      h += `<div class="fn-conv">↓ дальше доходит <b>${cs}%</b></div>`;
    }
  });
  el(container).innerHTML = h;
}

/* ---- segmented toggle wiring ----
   Give the group container id; each <button> carries a data-<key> attribute.
   onPick(value) fires with the chosen value; the pressed state is managed here. */
function segmented(groupId, key, onPick) {
  document.getElementById(groupId).addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll(`#${groupId} button`).forEach(x => x.setAttribute("aria-pressed", x === b));
    onPick(b.dataset[key]);
  });
}

/* ---- theme toggle (light <-> dark), for a <button id="themebtn"> ---- */
function wireTheme(btnId = "themebtn") {
  const b = document.getElementById(btnId); if (!b) return;
  b.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : cur === "light" ? "dark"
      : (matchMedia("(prefers-color-scheme:dark)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", next);
  });
}
