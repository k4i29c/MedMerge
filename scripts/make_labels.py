"""Generate the fictional sample medication labels used in demo mode.

Run: python3 scripts/make_labels.py
All clinics, people and phone numbers are made up.
"""
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent.parent / "samples"

CLINIC = ("SUNRISE FAMILY CLINIC", "Blk 123 Example Ave 4 #01-23 Singapore 000123 · Tel 6000 0000")
PATIENT = "LIM BOON HUAT"
DATE = "13 Nov 2026"

LABELS = {
    "panadol": dict(
        drug="PANADOL 500MG TABLET", generic="(Paracetamol)",
        lines=["TAKE 2 TABLET(S) 3 TIMES A DAY", "AFTER FOOD"],
        purpose="For fever / pain", qty="30 TAB", days="5 days", caution="Do not take with other paracetamol products",
    ),
    "nurofen": dict(
        drug="NUROFEN 400MG TABLET", generic="(Ibuprofen)",
        lines=["TAKE 1 TABLET WHEN NECESSARY", "AFTER FOOD"],
        purpose="For pain", qty="10 TAB", days="", caution="Take with food. Stop if stomach pain.",
        handwritten="max 3x / day",
    ),
    "klacid": dict(
        drug="KLACID 500MG TABLET", generic="(Clarithromycin)",
        lines=["TAKE 1 TABLET 2 TIMES A DAY", "WITH OR WITHOUT FOOD"],
        purpose="Antibiotic for chest infection", qty="14 TAB", days="7 days", caution="Complete the full course",
    ),
    "clarityne": dict(
        drug="CLARITYNE 10MG TABLET", generic="(Loratadine)",
        lines=["TAKE 1 TABLET ONCE A DAY", "IN THE MORNING"],
        purpose="For runny nose", qty="5 TAB", days="5 days", caution="",
    ),
    "augmentin": dict(
        clinic=("EASTPOINT MEDICAL CLINIC", "88 Sample Road #02-01 Singapore 000456 · Tel 6000 0001"), header="#6b3fa0",
        drug="AUGMENTIN 625MG TABLET", generic="(Amoxicillin / Clavulanic acid)",
        lines=["TAKE 1 TABLET 2 TIMES A DAY", "AFTER FOOD"],
        purpose="Antibiotic for throat infection", qty="10 TAB", days="5 days", caution="Complete the full course",
    ),
}


def svg(label: dict) -> str:
    W, H = 640, 380
    t = []
    a = t.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Arial, Helvetica, sans-serif">')
    a(f'<rect x="4" y="4" width="{W-8}" height="{H-8}" rx="14" fill="#ffffff" stroke="#9aa3ad" stroke-width="2"/>')
    clinic = label.get("clinic", CLINIC)
    head = label.get("header", "#1f5f8b")
    a(f'<rect x="4" y="4" width="{W-8}" height="62" rx="14" fill="{head}"/><rect x="4" y="50" width="{W-8}" height="16" fill="{head}"/>')
    a(f'<text x="24" y="34" font-size="22" font-weight="700" fill="#fff">{escape(clinic[0])}</text>')
    a(f'<text x="24" y="56" font-size="12" fill="#e8e8f3">{escape(clinic[1])}</text>')
    a(f'<text x="24" y="92" font-size="14" fill="#333">Name: <tspan font-weight="700">{PATIENT}</tspan></text>')
    a(f'<text x="{W-24}" y="92" font-size="14" fill="#333" text-anchor="end">Date: {DATE}</text>')
    a(f'<line x1="24" y1="102" x2="{W-24}" y2="102" stroke="#ccc"/>')
    a(f'<text x="24" y="134" font-size="24" font-weight="700" fill="#111">{escape(label["drug"])}</text>')
    a(f'<text x="24" y="156" font-size="15" fill="#444">{escape(label["generic"])}</text>')
    y = 192
    for line in label["lines"]:
        a(f'<text x="24" y="{y}" font-size="21" font-weight="700" fill="#111">{escape(line)}</text>')
        y += 28
    a(f'<text x="24" y="{y+4}" font-size="15" fill="#333">{escape(label["purpose"])}</text>')
    info = f'Qty: {label["qty"]}' + (f'   ·   Duration: {label["days"]}' if label["days"] else "")
    a(f'<text x="24" y="{y+30}" font-size="14" fill="#333">{escape(info)}</text>')
    if label["caution"]:
        a(f'<text x="24" y="{y+52}" font-size="13" font-style="italic" fill="#8a1c1c">{escape(label["caution"])}</text>')
    if label.get("handwritten"):
        a(f'<text x="430" y="226" font-size="26" fill="#1d3fbf" transform="rotate(-8 430 226)" '
          f'font-family="\'Comic Sans MS\', \'Segoe Print\', cursive">{escape(label["handwritten"])}</text>')
    a(f'<text x="{W/2}" y="{H-16}" font-size="11" fill="#888" text-anchor="middle">SAMPLE LABEL · FICTIONAL CLINIC AND PATIENT · FOR DEMO ONLY</text>')
    a("</svg>")
    return "\n".join(t)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, label in LABELS.items():
        (OUT / f"label-{name}.svg").write_text(svg(label), encoding="utf-8")
        print("wrote", OUT / f"label-{name}.svg")
