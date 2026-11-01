"""Build every page of the site in every language.

Usage:  python _src/build.py          all languages
        python _src/build.py pl en    only these

Sources:
  _src/layout.html, _src/pages/*.html    templates
  _src/i18n/<lang>.json                  interface text and the home page
  _src/content/<lang>.json               text of the other pages
  _src/routes.json                       URL slug of each page per language
  _src/reviews.json                      patient reviews, all languages

Writes <lang>/.../index.html. Edit the sources, never the output.
"""
import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

SRC = Path(__file__).resolve().parent
SITE = SRC.parent

# Order shown in the language menu: target audiences first.
LANGS = [
    {"code": "pl", "short": "PL", "name": "Polski"},
    {"code": "uk", "short": "UA", "name": "Українська"},
    {"code": "ru", "short": "RU", "name": "Русский"},
    {"code": "en", "short": "EN", "name": "English"},
    {"code": "tr", "short": "TR", "name": "Türkçe"},
]

TREATMENTS = ["dentistry", "plastic", "hair", "bariatric", "eye"]

# key -> (template, parent key)
PAGES = {
    "home": ("home.html", None),
    "treatments": ("treatments.html", None),
    **{k: ("treatment.html", "treatments") for k in TREATMENTS},
    "about": ("about.html", None),
    "process": ("process.html", None),
    "guide": ("guide.html", None),
    "reviews": ("reviews.html", None),
    "faq": ("faq.html", None),
    "contact": ("contact.html", None),
}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main(only):
    env = Environment(loader=FileSystemLoader(SRC), autoescape=True, undefined=StrictUndefined,
                      keep_trailing_newline=True, trim_blocks=True, lstrip_blocks=True)
    routes = load(SRC / "routes.json")
    reviews = load(SRC / "reviews.json")
    ba_cases = load(SRC / "ba.json")["cases"]

    def parts(key, lang):
        out = [lang]
        parent = PAGES[key][1]
        if parent:
            out.append(routes[parent][lang])
        if key != "home":
            out.append(routes[key][lang])
        return out

    for lang in LANGS:
        code = lang["code"]
        if only and code not in only:
            continue
        t = load(SRC / "i18n" / f"{code}.json") | load(SRC / "content" / f"{code}.json")
        tx = {x["key"]: x for x in t["tx"]}
        lang_reviews = [{"name": r["name"], "text": r["text"][code]} for r in reviews]
        cases = [{"treatment": c["treatment"], "img": c["img"],
                  "title": tx[c["treatment"]]["procedures"][c["proc"]]["name"]} for c in ba_cases]

        for key, (tpl, parent) in PAGES.items():
            here = parts(key, code)
            prefix = "../" * len(here)

            def href(target, l=code, prefix=prefix):
                return prefix + "/".join(parts(target, l)) + "/"

            # A page photo is optional: the layout changes when assets/photos/<name>.webp exists.
            def photo(name, prefix=prefix):
                f = SITE / "assets" / "photos" / f"{name}.webp"
                return f"{prefix}assets/photos/{name}.webp" if f.exists() else None

            html = env.get_template(f"pages/{tpl}").render(
                lang=code, t=t, langs=LANGS, current=lang, key=key, parent=parent,
                tx=tx, treatments=TREATMENTS, item=tx.get(key), reviews=lang_reviews, cases=cases,
                href=href, photo=photo, root=prefix,
            )
            out = SITE.joinpath(*here, "index.html")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding="utf-8")
        print(f"built {code}: {len(PAGES)} pages")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
