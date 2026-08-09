#!/usr/bin/env python3
"""Fill in every URL that has to be absolute, once the domain is known.

    python3 tools/set-domain.py https://www.example.com

Writes canonical, og:url and og:image into each page, and regenerates
sitemap.xml and robots.txt. Safe to re-run — it replaces what it wrote last
time rather than stacking duplicates, so switching domains is one command.
"""
import pathlib, re, sys

PAGES = {
    "index.html": "",
    "about/index.html": "about/",
    "business-coaching/index.html": "business-coaching/",
    "consultancy-advisory/index.html": "consultancy-advisory/",
}
# Rough relative priority, and how often each page is likely to change.
META = {"": ("1.0", "monthly"), "about/": ("0.8", "yearly"),
        "business-coaching/": ("0.9", "monthly"),
        "consultancy-advisory/": ("0.9", "monthly")}

def main(base):
    base = base.rstrip("/")
    root = pathlib.Path(__file__).resolve().parent.parent

    for page, slug in PAGES.items():
        p = root / page
        s = p.read_text()
        url = f"{base}/{slug}"

        # Remove anything a previous run inserted.
        s = re.sub(r'\n  <link rel="canonical"[^>]*>', "", s)
        s = re.sub(r'\n  <meta property="og:url"[^>]*>', "", s)
        s = re.sub(r'\n  <meta (property="og:image"|name="twitter:image")[^>]*>', "", s)

        s = s.replace('\n  <!-- Open Graph',
                      f'\n  <link rel="canonical" href="{url}">\n\n  <!-- Open Graph', 1)
        s = s.replace('  <meta property="og:locale"',
                      f'  <meta property="og:url" content="{url}">\n'
                      f'  <meta property="og:image" content="{base}/assets/images/og-image.jpg">\n'
                      f'  <meta property="og:locale"', 1)
        s = s.replace('  <meta name="twitter:title"',
                      f'  <meta name="twitter:image" content="{base}/assets/images/og-image.jpg">\n'
                      f'  <meta name="twitter:title"', 1)
        p.write_text(s)
        print("urls  ->", page)

    urls = "\n".join(
        f"  <url>\n    <loc>{base}/{slug}</loc>\n"
        f"    <changefreq>{META[slug][1]}</changefreq>\n"
        f"    <priority>{META[slug][0]}</priority>\n  </url>"
        for slug in PAGES.values())
    (root / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n")
    print("wrote -> sitemap.xml")

    (root / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n")
    print("wrote -> robots.txt")

if __name__ == "__main__":
    if len(sys.argv) != 2 or not sys.argv[1].startswith("http"):
        sys.exit("usage: python3 tools/set-domain.py https://www.example.com")
    main(sys.argv[1])
