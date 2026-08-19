# Honesty & messy data

A dashboard is used to make decisions, so a wrong or invented number is worse
than a missing one. These are the habits that keep it trustworthy.

## Never fabricate, never smooth

- **Missing stays missing.** A blank source cell becomes `null` in the data and
  "—" on the page — not `0`, not an interpolation, not last month's value carried
  forward. `0` is a real measurement; a blank is the absence of one. Conflating
  them silently corrupts every total, average, and conversion rate built on top.
- **Show the gap in plain sight.** If a metric is only tracked for part of the
  period (e.g. reach filled only for May), put the value with a tag ("май") and
  add one line under the block saying so. The reader should never have to wonder
  whether a small number means "small" or "not recorded".
- **A bottom note earns trust.** End the page with a short "Как читать / что
  заполнено": what's populated, what's empty in the source, and any caveat. It
  makes the honesty a visible feature rather than a thing to be discovered.
- **When a source number looks wrong, flag it — don't launder it.** If an annual
  target is 10x the plausible value, or a column header contradicts its contents,
  surface it to the user and ask, rather than quietly presenting it as fact. (Real
  example: a "plan" that lived under a column literally labelled "December" — worth
  a question, not a silent assumption.)

## Reading real spreadsheets

- **Row roles.** In a wide sheet, some rows are section headers (a channel or
  owner name in the label column) and the rest are metric rows under them. The
  same metric name ("Лиды", "Budget") repeats inside each section — scope by the
  section it sits in, not globally.
- **Plan / Fact / Diff.** Columns often come in triples. Fact is the truth of what
  happened; Plan is the target; Diff is usually a formula (frequently broken:
  `#REF!`, `-100%`). Prefer computing your own aggregates from Fact rather than
  trusting a Diff/Total formula cell — those are the first to break.
- **Time layout.** A frequent shape is, per month: a month-total column then five
  weekly columns, each of those a Plan/Fact/Diff triple. Plans may cover the whole
  year while facts only reach the current month. Detect the populated window and
  build for it. Offer a month/week toggle only when both granularities have data.
- **Multi-sheet files.** Summary and detail often live on different sheets (e.g. a
  per-source or per-lead sheet separate from the roll-up). Pull each number from
  wherever it's actually filled, and tell the user which sheet it came from.

## Number formats (ru-RU / European)

`clean_number()` in `scripts/parse_spreadsheet.py` already handles all of this —
use it rather than re-deriving the rules — but for reference, the cells you'll see:

- Thousands separated by spaces, including **non-breaking (\xa0)** and thin
  spaces: `"1 234 567"`, `"16 950 000 ₽"`.
- **Comma as decimal**: `"4,8"` = 4.8, `"1 234,5"` = 1234.5.
- Currency and unit noise: `"р.90 560"`, `"90 560 ₽"`, `"5%"`.
- Formula errors to treat as missing: `#REF!`, `#DIV/0!`, `#VALUE!`, `#N/A`,
  `#NAME?`, `#NUM!`.

On the page, format for humans: big money as `"1,39 млн ₽"` (see `fmtK` in
charts.js), align digits with `tabular-nums`, and keep percentages to one decimal.

## Deriving metrics safely

Guard every division — a rate over a zero or missing denominator is undefined, not
zero. `cpl = leads > 0 ? budget / leads : null`. Show derived metrics ("cost per
sale", conversion %) only where both inputs exist, and label what they're computed
from so the reader can sanity-check them.
