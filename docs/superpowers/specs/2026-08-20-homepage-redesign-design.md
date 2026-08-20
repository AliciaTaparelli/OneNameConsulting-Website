# Homepage redesign — design

**Date:** 2026-08-20
**Status:** approved, not yet implemented
**Scope:** `index.html` and additions to `css/styles.css`. No other page changes.

## Problem

The homepage is ~128 words with no photography at all: a text hero on flat
bisque, two plain service cards, a small grey credentials list, and a CTA
banner. The owner's assessment is that it does not attract or hold a
prospective client. The strongest asset the site owns — a professional
headshot — does not appear on it.

## Reference research

McKinsey, Bain and BCG were given as references. Bain's homepage was fetched
and read; McKinsey timed out and BCG returned 403, but the pattern is
consistent across the three.

**What transfers:** a hero carried by a real photograph rather than flat
colour; proof expressed as concrete figures; each service given real visual
weight as an entry point.

**What does not transfer:** most of those pages are a content-marketing
engine — insight carousels, article grids, case-study libraries, an
industry/need quiz. They work because a large firm publishes continuously.
This practice has none of that content, and imitating the shell of it would
read thinner than the current page.

**Inversion:** those firms deliberately show no founder's face because they
sell an institution. A solo practice is the opposite — the practitioner is
the product, so the headshot leads.

## Constraints

1. **Art direction is evolved, not replaced.** Forest/bisque, Lora display,
   Work Sans body, rule-work, no filled cards, no shadows, no radii.
2. **No testimonials, no client names, no outcome numbers exist.** Confirmed
   with the owner. Proof is built from the ABB career facts already on the
   site, given display weight. Nothing is invented.
3. **Both services carry equal weight.** The visitor self-selects.
4. **Headline and CTA are unchanged.** "Grow, lead with *purpose*, create
   lasting impact" was chosen from Lisette's own bio in an earlier deliberate
   pass (commit `0f4caed`). Only its setting changes.
5. **No text is overlaid on photography** at any breakpoint. Overlaid type
   needs a scrim, which this stylesheet was written to avoid.
6. **Other pages are untouched.** New components are added; nothing shared is
   restyled.

## Accepted departure

The site currently has **no dark band anywhere**. The CTA banner was forest
green and a previous pass deliberately removed it (see commit `1eca29b`),
leaving the page all-bisque. This design reintroduces a full-bleed forest
band for the proof section. This is the principal source of visual contrast
on the page and was explicitly accepted by the owner.

## Section stack

```
header                        unchanged
1. Hero            split: type left, headshot bleeding off top/right
2. Proof band      full-bleed forest, reversed out
3. Two doors       coaching / advisory, image-led, equal weight
4. Panel photo     full width, evidence
5. Let's talk      unchanged (.cta-banner)
footer                        unchanged
```

## 1. Hero

**Markup:** extend the existing `.hero` with a `.hero__media` element holding
`lisette-portrait.jpg`. Existing children (`.eyebrow`, `.hero__title`,
`.hero__description`, `.hero__cta`) move into a `.hero__body` wrapper.

**Desktop (≥769px):** CSS grid, `minmax(0, 55fr) minmax(0, 45fr)`. The media
column breaks the 1240px container to bleed to the top and right viewport
edge. Implemented by giving `.hero` a full-width grid and letting the media
column run to the edge, rather than negative margins.

**Headline sizing:** `--text-display` currently resolves to
`clamp(3rem, 11.5vw, 9rem)`, which assumed a full-width headline. At 55%
width the 9rem cap sets roughly two words per line. Retune it in place to
`clamp(2.5rem, 6.5vw, 6rem)`.

Verified safe: `--text-display` has exactly one consumer in the stylesheet
(`.hero__title`, line 432), and `.hero` appears only in `index.html` — the
interior pages and 404 use `.page-hero`, About uses `.about-header`. So no
new token is needed and no other page is affected. The token's existing
"hero only" comment is accurate.

**Tablet (481–768px):** same split at 50/50, media does not bleed.

**Mobile (base):** single column, media **first** at 4:3, type below. The
image leads so the page opens on a face rather than on type.

**Image:** `lisette-portrait.jpg` (880×1100). `object-fit: cover`,
`object-position: center top` so the crop never cuts the face. Needs
`fetchpriority="high"` and **no** `loading="lazy"` — it is the LCP element.
Explicit `width`/`height` to reserve space.

## 2. Proof band

**Markup:** `<section class="proof">` containing an `.eyebrow`, one
`.proof__lead` line, and a `.proof__figures` list of three items, each an
`.proof__figure` (value) plus `.proof__label`.

**Content** — drawn only from facts already on the site:

- Lead line: *Global General Counsel, Robotics & Discrete Automation at ABB*
- `20+` — years at ABB
- `4` — regions: Europe, Asia, the Americas, the Middle East
- `4` — languages: Dutch, English, German, French

The role does not reduce to a number, so it leads as a sentence rather than
being forced into a fourth column.

**Full-bleed technique:** the section gets `background: var(--color-primary)`
at full width with an inner `.container`, matching how `.pattern-divider`
already spans edge to edge. No `100vw` — that overflows when a scrollbar is
present.

**Colour and contrast** (measured, sRGB, WCAG 2.1):

| Pair | Ratio | Verdict |
|---|---|---|
| Bisque `#F0EAE1` on forest `#1B4332` | 9.26:1 | passes AA |
| Muted label `#B8B5AE` on forest | 5.41:1 | passes AA |
| **Existing terracotta `#A55232` on forest** | **2.03:1** | **fails** |
| Band accent `#D8977E` on forest | 4.56:1 | passes AA |

The site's accent cannot be used inside the band. Add a band-scoped token
`--color-accent-on-primary: #D8977E` — the same hue lightened 25% — and use
it only there. Document why it exists so it is not mistaken for a second
brand colour.

**Layout:** three columns desktop; stacked with hairline rules between on
mobile. Figures set in Lora at `--text-3xl` or larger; labels in Work Sans
at `--text-xs` with `--tracking-meta`, uppercase.

## 3. Two doors

**Markup:** `<div class="doors">` with two `<article class="door">`, each
holding `.door__media`, an `<h3 class="door__title">`, one `.door__text`
line, and the existing link.

**Content:** titles and links unchanged. The body line is sharpened to state
who each is for. Existing copy is kept where it already does that.

**Images:** two new crops at 1200×750 (8:5), cut from the two source
photographs in `Lisette Art Images/` — the same well the interior tiles came
from. Named `door-coaching.jpg` and `door-advisory.jpg`. No stock
photography. Existing 760×456 tiles are too small for a block this size.

**Layout:** two columns desktop, stacked mobile. Hairline border on the media
matching `.index-list__media`. Reuse the existing hover convention: image
scales 1.04 inside a fixed border, suppressed under
`prefers-reduced-motion`.

## 4. Panel photograph

`lisette-panel.jpg` (1182×664) full width above the closing CTA. It shows
Lisette on a general counsel panel with other senior figures — with no
testimonials available, this is the page's only evidence of her operating at
the level being sold to.

**Uncaptioned.** The backdrop reads "General Counsel" but the event name is
not legible and will not be invented. Descriptive alt text only. If the owner
supplies the event name later, a caption can be added.

`loading="lazy"`, explicit dimensions.

## Accessibility

- Heading order stays `h1` → `h2` per section → `h3` inside doors. The proof
  band's eyebrow is a `<p>`, not a heading, so it does not break the outline.
- All decorative pattern elements keep `aria-hidden="true"`.
- Photographs get descriptive alt text; the headshot names the subject.
- All new transforms are added to the existing `prefers-reduced-motion`
  suppression list.
- Contrast verified above; no pair below 4.5:1 ships.

## Out of scope

- Any change to About, Business Coaching, Consultancy & Advisory, or 404.
- Any change to the header, footer, or the closing CTA.
- Restyling shared components. New classes only.
- New copy beyond one sharpened line per door. No invented credentials.

## Verification

1. Serve locally; confirm the page renders at 1440, 1024, 768 and 390 px.
2. Confirm no horizontal scrollbar at any of those widths — the full-bleed
   band and hero bleed are the specific risk.
3. Confirm the headshot is the LCP element and is not lazy-loaded.
4. Re-measure the shipped forest/bisque pairs against the table above.
5. Confirm the three other pages render unchanged (diff their computed
   styles for any shared class touched).
6. Confirm heading outline is h1 → h2 → h3 with no skips.
