# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the OneName Consulting homepage around Lisette's photograph and her ABB credentials, so it attracts and holds a prospective client instead of presenting 128 words on flat bisque.

**Architecture:** Static HTML/CSS. `index.html` gains four rebuilt sections; `css/styles.css` gains new component blocks appended in their numbered section order. No shared component is restyled, so the other three pages are untouched. A new `tools/check-homepage.py` asserts the spec's structural, accessibility and contrast requirements and is the red/green cycle for every task.

**Tech Stack:** Hand-written HTML5 and CSS (mobile-first, three breakpoints: base ≤480, ≥481, ≥769). Python 3 + Pillow for asset cropping and verification. No build step, no package manager, no test runner.

**Spec:** `docs/superpowers/specs/2026-08-20-homepage-redesign-design.md`

## Global Constraints

Every task's requirements implicitly include this section. Values copied verbatim from the spec.

- **Art direction evolved, not replaced.** Forest/bisque, Lora display, Work Sans body, rule-work. No filled cards, no shadows, no radii (`--radius-sm` and `--radius-md` both resolve to `0`).
- **Nothing is invented.** Source of record for all credentials is `Dev Projects/Lisette Website/One Consulting Bios/*.docx`. Anything not traceable to those bios does not ship.
- **No text overlaid on photography** at any breakpoint.
- **Headline and CTA unchanged.** `Grow, lead with <em>purpose</em>, create lasting impact.` and both existing buttons keep their exact current markup and `mailto:` targets.
- **Other pages untouched.** Only `index.html`, `css/styles.css`, `tools/check-homepage.py` and new files under `assets/images/` may change. Enforced by a scripted check in Task 1.
- **Forbidden on the homepage:** the string `100+ countries` in any form, and any languages figure. Both excluded deliberately — see spec §2 "Deliberately excluded".
- **Contrast floor 4.5:1.** Measured pairs: bisque `#F0EAE1` on forest `#1B4332` = 9.26:1; muted `#B8B5AE` on forest = 5.41:1; band accent `#D8977E` on forest = 4.56:1. The site accent `#A55232` on forest = **2.03:1 and must never appear inside the band**.
- **No `100vw`.** It overflows when a scrollbar is present. Full-bleed uses `100%` of the section box.
- **Commit after every task.** Do not push; the owner pushes.

---

### Task 1: Verification harness and band colour tokens

Establishes the red/green cycle everything else runs against, and adds the three tokens the forest band needs. The harness fails on the current page — that is the point.

**Files:**
- Create: `tools/check-homepage.py`
- Modify: `css/styles.css` (token block, after the `--color-accent` declaration ~line 38)

**Interfaces:**
- Produces: `python3 tools/check-homepage.py` exits `0` when all checks pass, `1` otherwise, printing one line per check. Tokens `--color-on-primary-muted`, `--color-accent-on-primary`, `--rule-on-primary` become available to later tasks.
- Consumes: nothing.

- [ ] **Step 1: Write the failing verification script**

Create `tools/check-homepage.py`:

```python
#!/usr/bin/env python3
"""Verify the homepage against docs/superpowers/specs/2026-08-20-homepage-redesign-design.md

No dependencies beyond the standard library and Pillow (already used for the
image crops). Run from the repository root:

    python3 tools/check-homepage.py
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
CSS = os.path.join(ROOT, "css", "styles.css")

failures = []
checks = 0


def check(name, condition, detail=""):
    global checks
    checks += 1
    if condition:
        print(f"  PASS  {name}")
    else:
        print(f"  FAIL  {name}{(' — ' + detail) if detail else ''}")
        failures.append(name)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# --- contrast ---------------------------------------------------------------

def _lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hexs):
    h = hexs.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def check_contrast():
    print("\ncontrast")
    forest = "#1B4332"
    for name, fg in [
        ("bisque on forest", "#F0EAE1"),
        ("muted label on forest", "#B8B5AE"),
        ("band accent on forest", "#D8977E"),
    ]:
        ratio = contrast(fg, forest)
        check(f"{name} >= 4.5:1", ratio >= 4.5, f"measured {ratio:.2f}:1")

    # The site accent must never be used on forest.
    ratio = contrast("#A55232", forest)
    check("site accent is known-bad on forest (guard)", ratio < 4.5,
          f"measured {ratio:.2f}:1 — if this now passes, the guard is stale")


# --- tokens -----------------------------------------------------------------

def check_tokens():
    print("\ntokens")
    css = read(CSS)
    for token, value in [
        ("--color-on-primary-muted", "#B8B5AE"),
        ("--color-accent-on-primary", "#D8977E"),
        ("--rule-on-primary", None),
    ]:
        present = re.search(rf"{re.escape(token)}\s*:", css) is not None
        check(f"{token} declared", present)
        if value and present:
            declared = re.search(rf"{re.escape(token)}\s*:\s*([^;]+);", css).group(1).strip()
            check(f"{token} == {value}", declared.upper() == value.upper(), f"got {declared}")


# --- structure --------------------------------------------------------------

def check_structure():
    print("\nstructure")
    html = read(INDEX)

    for cls in ["hero__grid", "hero__body", "hero__media",
                "proof", "proof__figures", "proof__roles",
                "doors", "door", "showcase"]:
        check(f"class {cls} present", f'class="{cls}' in html or f' {cls}"' in html or f'"{cls}"' in html)

    check("hero title unchanged",
          "Grow, lead with <em>purpose</em>, create lasting impact." in html)

    # Section order down the page.
    order = ["hero__grid", "proof", "doors", "showcase", "cta-banner"]
    positions = [html.find(f'"{name}') if html.find(f'"{name}') != -1 else html.find(name)
                 for name in order]
    check("sections appear in spec order", positions == sorted(positions),
          f"found at {positions}")


def check_content_rules():
    print("\ncontent rules")
    html = read(INDEX)
    check("no '100+ countries' on the homepage", "100+ countries" not in html)
    check("no languages figure on the homepage",
          not re.search(r"\b4\s*languages\b", html, re.I))
    for role in ["Global General Counsel",
                 "ABB Group Legal &amp; Integrity Leadership Team",
                 "Supervisory Board Member"]:
        check(f"role present: {role}", role in html)
    for figure in ["20+ years", "4 regions"]:
        check(f"figure present: {figure}", figure in html)


# --- accessibility ----------------------------------------------------------

def check_images():
    print("\nimages")
    html = read(INDEX)

    imgs = re.findall(r"<img\b[^>]*>", html)
    check("every img has alt", all("alt=" in tag for tag in imgs))

    portrait = [t for t in imgs if "lisette-portrait" in t]
    check("headshot present", len(portrait) == 1)
    if portrait:
        tag = portrait[0]
        check("headshot is not lazy-loaded (LCP)", 'loading="lazy"' not in tag)
        check("headshot has fetchpriority=high", 'fetchpriority="high"' in tag)
        check("headshot has explicit dimensions",
              "width=" in tag and "height=" in tag)

    panel = [t for t in imgs if "lisette-panel" in t]
    check("panel photograph present", len(panel) >= 1)
    if panel:
        check("panel photograph is lazy-loaded", 'loading="lazy"' in panel[0])

    # Every referenced local asset must exist.
    for src in re.findall(r'src="([^"]+)"', html):
        if src.startswith(("http://", "https://", "data:")):
            continue
        path = os.path.join(ROOT, src.split("?")[0])
        check(f"asset exists: {src}", os.path.isfile(path))


def check_headings():
    print("\nheadings")
    html = read(INDEX)
    levels = [int(m) for m in re.findall(r"<h([1-6])\b", html)]
    check("exactly one h1", levels.count(1) == 1, f"found {levels.count(1)}")
    skips = [(a, b) for a, b in zip(levels, levels[1:]) if b > a + 1]
    check("no heading level skipped", not skips, f"{skips}")


def check_reduced_motion():
    print("\nreduced motion")
    css = read(CSS)
    block = css[css.find("prefers-reduced-motion"):]
    block = block[:block.find("\n}\n\n")] if "\n}\n\n" in block else block
    check("door hover transform suppressed",
          "door__media img" in block or ".door:hover" in block)


# --- scope ------------------------------------------------------------------

def check_scope():
    print("\nscope")
    out = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                         capture_output=True, text=True).stdout
    touched = [line[3:].strip() for line in out.splitlines() if line.strip()]
    allowed_exact = {"index.html", "css/styles.css", "tools/check-homepage.py"}
    offenders = [
        p for p in touched
        if p not in allowed_exact
        and not p.startswith("assets/images/")
        and not p.startswith("docs/superpowers/")
    ]
    check("only in-scope files modified", not offenders, f"{offenders}")


if __name__ == "__main__":
    check_contrast()
    check_tokens()
    check_structure()
    check_content_rules()
    check_images()
    check_headings()
    check_reduced_motion()
    check_scope()
    print(f"\n{checks - len(failures)}/{checks} checks passed")
    if failures:
        print("FAILED: " + ", ".join(failures))
    sys.exit(1 if failures else 0)
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/aliciataparelli/Documents/GitHub/OneNameConsulting-Website
chmod +x tools/check-homepage.py
python3 tools/check-homepage.py
```

Expected: exit 1. Contrast checks PASS (they are arithmetic). Token, structure, content-rule, heading and image checks FAIL — none of that markup exists yet.

- [ ] **Step 3: Add the three band tokens**

In `css/styles.css`, immediately after the `--color-accent: #A55232;` declaration and its comment block, insert:

```css
  /* Reversed-out variants for the forest proof band. The band is the only
     dark surface on the site, and the base accent measures 2.03:1 on forest —
     far below the 4.5:1 floor — so it cannot be used there. These three exist
     for that band alone and are not a second brand palette. */
  --color-on-primary-muted: #B8B5AE;   /* 5.41:1 on forest */
  --color-accent-on-primary: #D8977E;  /* base accent lightened 25%, 4.56:1 */
  --rule-on-primary: rgba(240, 234, 225, 0.24);
```

- [ ] **Step 4: Run the token checks**

```bash
python3 tools/check-homepage.py 2>&1 | sed -n '/^tokens/,/^structure/p'
```

Expected: all five token lines PASS. Overall exit is still 1 — later tasks fix the rest.

- [ ] **Step 5: Commit**

```bash
git add tools/check-homepage.py css/styles.css
git commit -m "Add a homepage verification harness and the reversed-out band tokens"
```

---

### Task 2: Split hero with the headshot

**Files:**
- Modify: `index.html:124-146` (the `<section class="hero">` block)
- Modify: `css/styles.css` — `--text-display` (line 56), the `.hero` rules (~line 417-455), and the desktop media query (~line 1440)

**Interfaces:**
- Consumes: nothing from Task 1 except the harness.
- Produces: `.hero__grid`, `.hero__body`, `.hero__media`. Later tasks rely on none of these.

- [ ] **Step 1: Restructure the hero markup**

Replace the whole `<section class="hero">` block in `index.html` with:

```html
    <!-- Hero -->
    <section class="hero">
      <div class="pattern-accent pattern-accent--hero" aria-hidden="true"></div>

      <div class="hero__grid">
        <div class="hero__body">
          <p class="eyebrow">Executive Coaching &amp; Advisory</p>

          <h1 class="hero__title">Grow, lead with <em>purpose</em>, create lasting impact.</h1>

          <p class="hero__description">
            Executive coaching and advisory for leaders, teams and organizations,
            drawing on more than 20 years of international leadership experience.
          </p>

          <div class="hero__cta">
            <a class="btn btn--solid" href="mailto:OnenameConsulting@outlook.com?subject=Enquiry">Book a conversation</a>
            <a class="btn btn--secondary" href="about/">About Lisette</a>
          </div>
        </div>

        <div class="hero__media">
          <img src="assets/images/lisette-portrait.jpg"
               alt="Lisette van Eenennaam, executive coach and compliance advisor"
               width="880" height="1100"
               fetchpriority="high" decoding="async">
        </div>
      </div>
    </section>
```

Note: the old `<div class="container">` wrapper is gone. `.hero__body` carries its own gutter so the media column can reach the viewport edge.

- [ ] **Step 2: Run the harness to see the hero checks flip**

```bash
python3 tools/check-homepage.py 2>&1 | sed -n '/^structure/,/^content rules/p; /^images/,/^headings/p'
```

Expected: `class hero__grid/hero__body/hero__media present` PASS, headshot checks PASS. `proof`, `doors`, `showcase` still FAIL.

- [ ] **Step 3: Retune the display token**

In `css/styles.css` line 56, change:

```css
  --text-display: clamp(3rem, 11.5vw, 9rem);             /* hero only */
```

to:

```css
  /* Homepage hero only — one consumer, .hero__title. The 9rem cap assumed a
     full-width headline; at 56% of the grid it set two words per line. */
  --text-display: clamp(2.5rem, 6.5vw, 6rem);
```

- [ ] **Step 4: Add the base (mobile) hero rules**

Replace the existing `.hero` and `.hero > .container` rules with:

```css
.hero {
  position: relative;
  overflow: hidden;
  padding-block: 0 var(--space-3xl);
}

/* Mobile opens on the photograph, not on type. */
.hero__grid {
  position: relative;
  z-index: 1;
  display: grid;
}

.hero__media {
  order: -1;
}

.hero__media img {
  width: 100%;
  height: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  object-position: center 22%;
}

.hero__body {
  padding-inline: var(--container-gutter);
  padding-block: var(--space-xl) 0;
}
```

- [ ] **Step 5: Add the desktop split**

Inside the existing `@media (min-width: 769px)` block, add:

```css
  /* Three columns: a left gutter that lines .hero__body up with the site
     container, the type, then the photograph running to the right edge.
     The gutter is computed from 100% of the section box, never 100vw, so a
     scrollbar cannot push the page into horizontal overflow. */
  .hero__grid {
    grid-template-columns:
      minmax(
        var(--container-gutter),
        calc((100% - var(--container-max)) / 2 + var(--container-gutter))
      )
      minmax(0, 1fr)
      minmax(0, 0.82fr);
    align-items: stretch;
    min-height: 76vh;
  }

  .hero__body {
    grid-column: 2;
    align-self: center;
    padding-block: var(--space-3xl);
    padding-inline: 0 var(--space-2xl);
  }

  .hero__media {
    order: 0;
    grid-column: 3;
  }

  .hero__media img {
    aspect-ratio: auto;
    height: 100%;
    object-position: center top;
  }
```

Also add the tablet step inside the existing `@media (min-width: 481px)` block:

```css
  .hero__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-xl);
    padding-inline: var(--container-gutter);
  }

  .hero__body {
    order: -1;
    padding-inline: 0;
  }

  .hero__media {
    order: 0;
  }

  .hero__media img {
    aspect-ratio: 4 / 5;
  }
```

- [ ] **Step 6: Verify in the browser at four widths**

Serve and measure. The specific risk is horizontal overflow from the bleed.

```bash
(python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
```

In the browser, for each of 1440, 1024, 768 and 390 px, confirm:
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (no horizontal scroll)
- at ≥769px the image's right edge equals the viewport width
- at ≤480px the image renders above the headline
- the headline sets on three lines or fewer at 1440px

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css
git commit -m "Lead the homepage with Lisette's photograph"
```

---

### Task 3: Forest proof band

**Files:**
- Modify: `index.html` — insert a new `<section class="proof">` directly after `</section>` of the hero and before the services section
- Modify: `css/styles.css` — new component block appended after the `.cta-banner` rules; responsive rules in the two media queries

**Interfaces:**
- Consumes: `--color-on-primary-muted`, `--color-accent-on-primary`, `--rule-on-primary` from Task 1.
- Produces: `.proof` and children. Nothing later depends on them.

- [ ] **Step 1: Add the markup**

Insert after the hero section:

```html
    <!-- Track record -->
    <section class="proof">
      <div class="container proof__grid">
        <div>
          <p class="eyebrow proof__eyebrow">Track record</p>

          <div class="proof__figures">
            <div class="proof__fact">
              <p class="proof__figure">20+ years</p>
              <p class="proof__label">Legal, compliance and leadership roles at ABB</p>
            </div>
            <div class="proof__fact">
              <p class="proof__figure">4 regions</p>
              <p class="proof__label">Europe, Asia, the Americas and the Middle East</p>
            </div>
          </div>
        </div>

        <ul class="proof__roles">
          <li class="proof__role">Global General Counsel, ABB Robotics &amp; Discrete Automation</li>
          <li class="proof__role">Member, ABB Group Legal &amp; Integrity Leadership Team</li>
          <li class="proof__role">Supervisory Board Member, ABB Discrete Automation (Austria)</li>
        </ul>
      </div>
    </section>
```

Every line above already appears on `about/index.html`. Do not add, embellish or reword any of it.

- [ ] **Step 2: Run the content checks**

```bash
python3 tools/check-homepage.py 2>&1 | sed -n '/^content rules/,/^images/p'
```

Expected: all five role/figure checks PASS, and both exclusion guards (`100+ countries`, languages) PASS.

- [ ] **Step 3: Add the base styles**

Append after the `.cta-banner__fallback` rule:

```css
/* --------------------------------------------------------------------------
   13a. Proof band — the one dark surface on the site
   Full-bleed forest. Because the base accent measures 2.03:1 here, everything
   inside uses the reversed-out tokens; see the token block for why.
   -------------------------------------------------------------------------- */

.proof {
  padding-block: var(--space-3xl);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.proof__grid {
  display: grid;
  gap: var(--space-2xl);
}

.proof__eyebrow {
  color: var(--color-accent-on-primary);
}

.proof__figures {
  display: grid;
  gap: var(--space-xl);
  margin-top: var(--space-xl);
}

/* Mirrors .story__fact on About: figure carries its unit, label sits under a
   rule. Set larger here — this band is the page's punch. */
.proof__fact {
  padding-top: var(--space-md);
  border-top: 1px solid var(--rule-on-primary);
}

.proof__figure {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
}

.proof__label {
  margin-top: var(--space-sm);
  font-size: var(--text-xs);
  line-height: 1.6;
  color: var(--color-on-primary-muted);
}

.proof__role {
  padding-block: var(--space-md);
  border-top: 1px solid var(--rule-on-primary);
  font-size: var(--text-base);
  line-height: 1.5;
}

.proof__role:last-child {
  border-bottom: 1px solid var(--rule-on-primary);
}
```

- [ ] **Step 4: Add the responsive rules**

In `@media (min-width: 481px)`:

```css
  .proof__figures {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--space-xl);
  }
```

In `@media (min-width: 769px)`:

```css
  .proof {
    padding-block: var(--space-4xl);
  }

  .proof__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    column-gap: var(--space-3xl);
    align-items: start;
  }
```

- [ ] **Step 5: Verify contrast on the shipped page**

In the browser, read the computed colours of `.proof__figure`, `.proof__label` and `.proof__eyebrow` against the computed background of `.proof`, and confirm each pair measures ≥4.5:1 using the same formula as the harness. Confirm no element inside `.proof` computes to `rgb(165, 82, 50)` — the forbidden base accent.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css
git commit -m "Give the ABB record a dark band of its own"
```

---

### Task 4: Image-led doors

**Files:**
- Create: `assets/images/door-coaching.jpg` (1200×750)
- Create: `assets/images/door-advisory.jpg` (1200×750)
- Modify: `index.html` — replace the `.services-grid` block and drop the `.credentials-line` list now superseded by the proof band
- Modify: `css/styles.css` — new `.doors` block; add the hover transform to the reduced-motion list (~line 1560)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `.doors`, `.door`, `.door__media`, `.door__title`, `.door__text`.

- [ ] **Step 1: Cut the two door images**

```bash
cd /Users/aliciataparelli/Documents/GitHub/OneNameConsulting-Website
SRC="/Users/aliciataparelli/Documents/Dev Projects/Lisette Website/Lisette Art Images"
python3 - "$SRC" <<'PY'
import sys
from PIL import Image
src = sys.argv[1]

# 8:5 to match .door__media's aspect-ratio, so object-fit never re-crops.
crops = {
    # The studies wall: skull, nose, ear, lips. Coaching is listening work.
    "door-coaching.jpg": ("Scuptures.png",     (34,  60, 1234,  810)),
    # Clay body meeting the rusted steel frame. Advisory is structure.
    "door-advisory.jpg": ("scupture back.png", (60, 260, 1060,  885)),
}
for out, (name, box) in crops.items():
    im = Image.open(f"{src}/{name}").convert("RGB")
    w, h = box[2] - box[0], box[3] - box[1]
    assert abs(w / h - 8 / 5) < 0.02, (out, w, h, w / h)
    assert box[2] <= im.width and box[3] <= im.height, (out, im.size, box)
    im.crop(box).resize((1200, 750), Image.LANCZOS).save(
        f"assets/images/{out}", quality=82, optimize=True)
    print(out, f"{w}x{h} -> 1200x750")
PY
du -h assets/images/door-*.jpg
```

Expected: two files, each roughly 100–200 KB. Open both and confirm neither crop cuts a subject awkwardly; adjust the box and re-run if so.

- [ ] **Step 2: Replace the services block**

Replace the entire `<section class="section">` containing `.services-grid` with:

```html
    <!-- Two ways in -->
    <section class="section">
      <div class="container">
        <h2 class="section__title">What Lisette offers</h2>

        <div class="doors">
          <article class="door">
            <a class="door__media" href="business-coaching/" tabindex="-1" aria-hidden="true">
              <img src="assets/images/door-coaching.jpg"
                   alt="" width="1200" height="750" loading="lazy" decoding="async">
            </a>
            <h3 class="door__title">Executive Coaching</h3>
            <p class="door__text">
              For senior leaders and executives working through transitions,
              decision-making, resilience and leading with greater confidence.
            </p>
            <a class="services-card__link" href="business-coaching/">Executive coaching &rarr;</a>
          </article>

          <article class="door">
            <a class="door__media" href="consultancy-advisory/" tabindex="-1" aria-hidden="true">
              <img src="assets/images/door-advisory.jpg"
                   alt="" width="1200" height="750" loading="lazy" decoding="async">
            </a>
            <h3 class="door__title">Consultancy &amp; Advisory</h3>
            <p class="door__text">
              For organizations strengthening governance, compliance, legal
              operations, investigations and organizational change.
            </p>
            <a class="services-card__link" href="consultancy-advisory/">Consultancy &amp; advisory &rarr;</a>
          </article>
        </div>
      </div>
    </section>
```

The media link is `aria-hidden` with `tabindex="-1"` because the text link below it goes to the same place — exposing both would put two identical destinations in the tab order. `alt=""` for the same reason.

Delete the `<ul class="sep-list credentials-line hero__proof">` block entirely — the proof band now carries that material with more weight.

Verified before writing this plan: `.sep-list` and `.credentials-line` are
**also used by** `business-coaching/index.html:254` and
`consultancy-advisory/index.html:210`, so their CSS stays. `.hero__proof` is
homepage-only (one use, now removed), so its rule becomes dead — see the next
step. `.services-card__link` is reused above and is also used on About, so it
is untouched.

- [ ] **Step 3: Remove the now-dead `.hero__proof` rule**

Deleting the credentials list leaves `.hero__proof` with no consumer anywhere
in the site. Delete its rule at `css/styles.css:1186-1190`:

```css
.hero__proof {
  margin-top: var(--space-2xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--rule-strong);
}
```

Confirm it is genuinely orphaned first:

```bash
grep -rn "hero__proof" --include="*.html" . || echo "no consumers — safe to delete"
```

- [ ] **Step 4: Add the door styles**

Append after the proof band block:

```css
/* --------------------------------------------------------------------------
   13b. Doors — the two ways into the practice, equal weight
   -------------------------------------------------------------------------- */

.doors {
  display: grid;
  gap: var(--space-2xl);
  margin-top: var(--space-2xl);
}

.door__media {
  display: block;
  position: relative;
  aspect-ratio: 8 / 5;
  border: 1px solid var(--rule-hairline);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.door__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-fast);
}

.door:hover .door__media img {
  transform: scale(1.04);
}

.door:hover .door__media {
  border-color: var(--color-accent);
}

.door__title {
  margin-top: var(--space-lg);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--color-primary);
}

.door__text {
  max-width: 42ch;
  margin-top: var(--space-md);
  color: var(--color-text-muted);
}
```

In `@media (min-width: 769px)`:

```css
  .doors {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--space-2xl);
  }
```

- [ ] **Step 5: Add the hover transform to the reduced-motion list**

In the `@media (prefers-reduced-motion: reduce)` block, add `.door:hover .door__media img` to the existing comma-separated selector list that already contains `.index-list__item:hover .index-list__media::before`.

- [ ] **Step 6: Run the harness**

```bash
python3 tools/check-homepage.py
```

Expected: the `doors`/`door` structure checks and the reduced-motion check now PASS. Only `showcase` should still FAIL.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css assets/images/door-coaching.jpg assets/images/door-advisory.jpg
git commit -m "Make the two services real entry points"
```

---

### Task 5: Panel photograph

**Files:**
- Modify: `index.html` — insert `<section class="showcase">` between the doors section and `.cta-banner`
- Modify: `css/styles.css` — append a `.showcase` block

**Interfaces:**
- Consumes: nothing.
- Produces: `.showcase`.

- [ ] **Step 1: Add the markup**

Insert directly before `<section class="cta-banner">`:

```html
    <!-- Evidence -->
    <section class="showcase" aria-label="Lisette on a general counsel panel">
      <img src="assets/images/lisette-panel.jpg"
           alt="Lisette van Eenennaam speaking on a general counsel panel alongside two other senior legal executives"
           width="1182" height="664" loading="lazy" decoding="async">
    </section>
```

Uncaptioned by decision — no bio names the event and it will not be invented. See spec §4.

- [ ] **Step 2: Add the styles**

```css
/* --------------------------------------------------------------------------
   13c. Showcase — full-bleed evidence band
   With no testimonials available, this photograph is the page's only proof
   that Lisette works at the level being sold to. Cropped rather than letter-
   boxed so it reads as a band; object-position keeps the faces in frame.
   -------------------------------------------------------------------------- */

.showcase {
  margin-top: var(--section-padding-lg);
}

.showcase img {
  width: 100%;
  height: clamp(220px, 34vw, 440px);
  object-fit: cover;
  object-position: center 32%;
}
```

- [ ] **Step 3: Run the full harness — expect green**

```bash
python3 tools/check-homepage.py
```

Expected: exit 0, every check PASS.

- [ ] **Step 4: Confirm the faces survive the crop**

At 1440, 1024, 768 and 390 px, confirm all three people remain in frame and none is cut at the eyeline. Adjust `object-position` if not.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "Close the page with evidence of the work"
```

---

### Task 6: Whole-page verification and cross-page regression

The one task that proves the Global Constraint "other pages untouched" actually held.

**Files:**
- Modify: none expected. Fix-ups only if a check fails.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Run the harness clean**

```bash
python3 tools/check-homepage.py
echo "exit: $?"
```

Expected: exit 0.

- [ ] **Step 2: Confirm no out-of-scope file changed**

```bash
git diff --stat HEAD~5 -- . ':(exclude)docs'
```

Expected: only `index.html`, `css/styles.css`, `tools/check-homepage.py` and files under `assets/images/`. If `about/index.html`, `business-coaching/index.html`, `consultancy-advisory/index.html` or `404.html` appear, revert that change — it is out of scope.

- [ ] **Step 3: Confirm the other three pages render unchanged**

Serve locally and load each of `/about/`, `/business-coaching/`, `/consultancy-advisory/` with a cache-busting query. For each, confirm:
- the page still renders its hero, index-list and footer
- no console errors
- `.page-hero__title` computed `font-size` is unchanged from before the work — this is the specific risk from retuning `--text-display`, even though it has only one consumer

- [ ] **Step 4: Check every width for horizontal overflow**

For 1440, 1280, 1024, 768, 600 and 390 px on the homepage, assert:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

The full-bleed proof band, the hero bleed and the showcase band are the three candidates if this fails.

- [ ] **Step 5: Confirm the LCP element**

Confirm the headshot is the largest contentful paint element and is not lazy-loaded. It carries `fetchpriority="high"` from Task 2.

- [ ] **Step 6: Final commit if anything was fixed**

```bash
git add -A
git commit -m "Fix up homepage verification findings"
```

If nothing needed fixing, skip — do not create an empty commit.

---

## Notes for the owner, not the implementer

Two items surfaced during design that are out of scope here and need a separate decision:

1. **`about/index.html:362`** reads "Experience in 100+ countries across Europe, Asia, Americas and Middle East". The source bio gives 100+ countries as *ABB's operating footprint*, not Lisette's personal reach. The same page states it correctly at line 160 and line 207. That one line should be reworded.
2. **The panel photograph is uncaptioned** because no bio names the event. If Lisette recalls it, a caption can be added to `.showcase`.
