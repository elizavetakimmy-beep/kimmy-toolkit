---
name: data-dashboard-from-file
description: >-
  Build a polished, self-contained interactive HTML dashboard from a data file
  (CSV, Excel/.xlsx, or a spreadsheet export). Use this whenever the user hands
  over a file with numbers — marketing metrics, sales, leads, budgets, KPIs,
  plan-vs-fact, funnels, channels, weekly/monthly stats — and wants to "see it",
  "свести статистику", make a report, отчёт, дашборд, визуализацию, or something
  to show a client or boss. Trigger even if the user doesn't say the word
  "dashboard": phrases like "сделай из этого файла красиво", "покажи наглядно",
  "нужен отчёт по этой таблице", "визуализируй эти данные", "build me a dashboard
  from this xlsx" all count. Handles messy real-world spreadsheets (merged
  headers, Plan/Fact/Diff columns, month×week layouts, #REF!/#DIV/0! errors,
  Russian number formats). Produces one shareable .html file plus a published
  link.
---

# Data dashboard from a file

Turn a raw data file into a single, self-contained, interactive HTML dashboard
that a non-technical person can open, understand at a glance, and share by link.

The golden rule that runs through everything here: **the dashboard reflects the
file exactly — never invent, fill, or smooth over missing numbers.** People trust
these dashboards to make decisions. A blank cell stays blank ("—"), and you say
so plainly. Honesty is the feature.

## The workflow

Follow these phases in order. `references/workflow.md` has the detailed version —
read it once at the start; the summary below is the map.

1. **Inspect, don't inhale.** Real spreadsheets are wide and messy. Do NOT read
   the whole file into context. Run `scripts/parse_spreadsheet.py --inspect <file>`
   to dump the sheet/column/row structure, then reason about the layout (where
   the headers are, whether columns are Plan/Fact/Diff triples, whether time runs
   in months and weeks, which rows are sections vs metrics).

2. **Parse to clean JSON with a script.** Write (or adapt) a small Python parser
   that walks the structure you found and emits one tidy JSON object. Use the
   cleaning helpers in `scripts/parse_spreadsheet.py` (`clean_number`, etc.) so
   `"1 234,5 ₽"`, `"5%"`, `"#REF!"`, and non-breaking spaces all normalize
   correctly. Missing → `null`, never `0`.

3. **Verify the numbers before drawing anything.** Print the key aggregates and a
   few rows and eyeball them against the file. Catching a parsing bug here costs
   seconds; catching it after the dashboard is built and shared costs trust.

4. **Build the page** from `assets/dashboard.css` + `assets/charts.js`, assembling
   the sections the data actually supports (see "Composing the page" below).

5. **Preview it** with `scripts/serve.py` (a localhost server that sends the right
   UTF-8 header — plain `file://` and bare `python -m http.server` mangle
   Cyrillic). Screenshot it, read it as a first-time viewer would, fix what's off.

6. **Deliver**: publish as an Artifact for a shareable link, and save a local copy
   next to the user's file/project so they have it on disk.

## Composing the page

A dashboard is scanned, not read top to bottom, so lead with the summary and let
detail follow. Only build a section if the data supports it — a half-empty chart
is worse than no chart.

Typical building blocks, in a sensible order:

- **Title + period + source line.** Say what it is, what window it covers, and
  where the numbers came from ("Источник: … · обновлено вручную").
- **KPI tiles** — the 4–6 numbers someone checks first, big and tabular.
- **Plan vs fact / goal progress** — only if the file has targets.
- **Funnel** — if the data is a sequence (traffic → lead → qualified → sale),
  with the drop-off % between stages.
- **Trend over time** — bar or line, with a month/week toggle if both exist.
- **Breakdown by category/channel** — sorted bars + a table, ideally with a
  period filter so multi-month sums don't read as "we spent a fortune".
- **A short honest note** at the bottom: what's filled, what's empty in the
  source, and any caveat (e.g. "reach is only tracked for May").

`assets/charts.js` provides ready renderers: `kpiTiles`, `barChart`, `lineChart`,
`groupedBar` (plan vs fact), `hbars` (ranked breakdown), `funnel`, plus a shared
hover tooltip and a `segmented` helper for the toggles. `assets/dashboard.css`
carries the theme (light + dark) and all component styles. Read the top of each
file — they document their own inputs.

## Design defaults

- **One self-contained .html file.** Inline all CSS and JS, draw charts as SVG in
  vanilla JS. No CDNs, no external fonts, no fetch — it must work offline and
  survive a strict CSP. This is also what makes it trivially shareable.
- **Brand color in one place.** The accent lives in a single CSS variable
  (`--accent`, with light/dark values). To rebrand — e.g. "сделай в синем под
  проект X" — you change those values and nothing else. `references/workflow.md`
  lists a few validated accent palettes.
- **Theme-aware.** Define colors as tokens on `:root`, redefine under
  `@media (prefers-color-scheme: dark)` and the `[data-theme]` overrides. Give
  dark mode real care, don't just invert.
- **Numbers line up.** `font-variant-numeric: tabular-nums` everywhere digits sit
  in columns. Round big money to "1,39 млн ₽", not "1390000".
- **Plain language over jargon.** Label things the way the reader thinks
  ("Цена заявки", not just "CPL") and add a one-line "what this means" under each
  section heading. When the audience is a boss or client, this is the difference
  between "impressive" and "confusing".

## Reference files

- `references/workflow.md` — the detailed end-to-end process, preview tricks, and
  publish/deliver steps. Read at the start.
- `references/honesty-and-data.md` — handling gaps, Russian/European number
  formats, Plan/Fact/Diff, and how to talk about missing data without hiding it.
- `scripts/parse_spreadsheet.py` — CSV/xlsx loader, `--inspect` mode, and the
  number-cleaning helpers. Import or copy from it; don't rewrite cleaning by hand.
- `scripts/serve.py` — UTF-8 localhost preview server.
- `assets/dashboard.css`, `assets/charts.js` — the component library the page is
  built from.
