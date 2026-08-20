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
