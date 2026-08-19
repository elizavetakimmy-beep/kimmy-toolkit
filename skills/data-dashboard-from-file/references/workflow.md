# Workflow — file to shareable dashboard

The detailed version of the six phases in SKILL.md. Read once at the start.

## 1. Inspect the structure

```bash
python3 scripts/parse_spreadsheet.py --inspect "path/to/file.xlsx"
```

Read the dump and answer, in your head or out loud to the user:
- Where are the header row(s)? (often 1–3 rows, sometimes merged/repeated)
- Are columns grouped as **Plan / Fact / Diff** triples? By **month**, and within
  each month by **week**? A common layout is `[MonthTotal, W1..W5]` per month.
- Which rows are **section headers** (a channel/owner name) vs **metric rows**?
- Which time range actually has data? (Plans often span the year; facts only the
  months that have happened.) Build for the populated window; don't show 8 empty
  months.

Multi-sheet .xlsx: `--inspect` lists every sheet. Detail (per-lead, per-source)
often lives on separate sheets from the summary — pull the metric you need from
wherever it's actually filled, and say which sheet.

## 2. Parse to clean JSON

Write a short parser that walks the layout. Column math for the common
month×(total+5 weeks)×(Plan/Fact/Diff) grid: a month `m` (0-based) starting after
`L` label columns begins at `L + 18*m`; within it, the month total is the first
triple and weeks `w=1..5` are at `+3*w`; Fact is the middle column of each triple.

Always clean cells through the helper — don't hand-roll it:

```python
from parse_spreadsheet import load, clean_number
rows = load(path)                       # or sheets = load(path) for xlsx
val = clean_number(rows[ri][ci])        # -> float or None (None = blank/error)
```

Emit one tidy object, e.g. `{ "channels": {...}, "plan": {...} }`, and write it to
a JSON file. Keep `null` for anything missing.

## 3. Verify before drawing

Print the headline aggregates and a couple of rows, and check them against the
file (open it or `--inspect` a region). State the key numbers back to the user —
"1 225 лидов, 41 продажа, бюджет 1,39 млн" — so a wrong parse surfaces now, not
after it's shared.

## 4. Build the page

The page is one `.html` file. Inline `assets/dashboard.css` in a `<style>` and
`assets/charts.js` in a `<script>`, embed the parsed data as a JS object, and add
one render call per section. Minimal skeleton:

```html
<title>…</title>
<style>/* paste dashboard.css here */</style>

<div class="wrap">
  <header class="top">
    <div>
      <span class="eyebrow">Проект X · 2026</span>
      <h1>Понятный заголовок</h1>
      <p class="sub">Одна строка: что это и за какой период.</p>
    </div>
    <div class="meta">
      <button class="themebtn" id="themebtn">◐ Тема</button>
      <span class="period-pill"><span class="dot"></span> Апрель–Июль · факт</span>
      <span>Источник: …</span>
    </div>
  </header>

  <div class="kpis" id="kpis"></div>

  <section>
    <div class="sec-head"><div><h2>Заголовок блока</h2><p>Что тут смотреть, простыми словами</p></div>
      <div class="seg" id="gran"><button data-g="month" aria-pressed="true">Месяцы</button><button data-g="week" aria-pressed="false">Недели</button></div>
    </div>
    <div class="cards grid-3">
      <div class="card"><h3>…</h3><div id="ch-a"></div></div>
      …
    </div>
  </section>

  <div class="card" style="margin-top:26px"><b>Как читать.</b> Что заполнено, что пусто в источнике, любые оговорки.</div>
</div>

<div id="tt"></div>
<script>
const DATA = /* embed parsed JSON here */;
/* paste charts.js here */
kpiTiles("kpis", [ {label:"Лиды", value:fmtInt(1225), foot:"апрель–июль"}, … ]);
let gran = "month";
function drawTrend(){ barChart("ch-a", seriesFor(gran), {fmt:fmtInt}); }
segmented("gran", "g", v => { gran = v; drawTrend(); });
wireTheme();
drawTrend();
</script>
```

Assemble only the sections the data supports (see "Composing the page" in
SKILL.md). Write plain-language section captions and gloss any acronym the first
time ("Цена лида (CPL)").

## 5. Preview

`file://` tends to hang in embedded browser panes, and bare `http.server` mangles
Cyrillic. Use the bundled server:

```bash
python3 scripts/serve.py 8799 "dir/with/the/html"   # then open http://localhost:8799/file.html
```

Screenshot it, in both themes if you can, and read it as a first-time viewer:
labels legible, nothing overflowing, numbers matching the file, toggles working.
Fix, re-serve, repeat. Stop the server when done.

## 6. Deliver

- **Publish as an Artifact** for a shareable link (this is the "send my boss a
  link" path). Note it's private until the user hits Share on the page — say so.
- **Save a local copy** next to the user's file or project so they have it on
  disk and can host it anywhere (it's a single self-contained file — drag onto a
  static host or email it).
- Remind them the numbers are baked in as of the current data; a refresh means
  re-running with a new file.

## Rebranding: validated accent sets

Swap only the `--accent / --accent-soft / --accent-ghost` triples in dashboard.css
(all four palette blocks: `:root`, dark `@media`, and both `[data-theme]`). Light
value first, dark-mode value second:

| Brand feel   | light accent / soft / ghost         | dark accent / soft / ghost          |
|--------------|-------------------------------------|-------------------------------------|
| Blue (tech)  | #2563EB / #BAD0F6 / #E3ECFB         | #5B9BF7 / #2C4A73 / #1A2738         |
| Teal         | #0E8C86 / #A9E0DC / #DDF3F1         | #4FC7BF / #1E4B48 / #14322F         |
| Violet       | #6D46D6 / #CFC0F2 / #ECE4FB         | #9C7CF0 / #3A2C63 / #221A38         |
| Rose/mauve   | #B14A72 / #E7C6D4 / #F3E4EA         | #D67CA0 / #5A2E42 / #2A1F26         |
| Amber        | #B5710E / #F0D3A0 / #F9EBD3         | #E0A94C / #5A421E / #332714         |

Keep the neutrals biased slightly toward whatever accent you pick — a pure grey
reads as unconsidered. The `--good/--warn/--bad` status colors stay separate from
the accent; never reuse the accent for "good/bad".
