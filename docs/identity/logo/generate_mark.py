#!/usr/bin/env python3
"""møni logo generator - "Insel im Pegel" (IDENTITY-PLAN D13).

Recipe (canvas units 0..1, centre 0.5/0.5): disc d=0.62; wave v(u)=0.05*sin(2*pi*u/0.78)
in a frame rotated by -32 deg (u along the line, v down). Above the wave: lime (food),
below: ember (training tide). Gap 0.024 (measured vertically). Second finer gap 0.019 on
the wave shifted +0.17 down with phase 0.9 rad, inside the lower part.

All geometry is emitted as SVG paths: sine waves as cubic Beziers (Hermite, 8 per period),
the disc as clip circle. Run:  python3 generate_mark.py
Writes docs/identity/assets/logo-*.svg and src/components/brand/markGeometry.ts.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / "docs/identity/assets"
TS_OUT = ROOT / "src/components/brand/markGeometry.ts"

LIME, EMBER = "#C6F135", "#FF8A3D"
TILT = -32.0
DIA = 0.62
A, LAM = 0.05, 0.78
GAP1 = 0.024
OFF2, PH2, GAP2 = 0.17, 0.9, 0.019


def f(x):
    return f"{x:.2f}".rstrip("0").rstrip(".")


def wave_cmds(u0, u1, off, amp, lam, phase, shift, steps=8):
    """Bezier commands (no leading M) along v=off+amp*sin(..)+shift from u0 to u1."""
    def v(u):
        return off + amp * math.sin(2 * math.pi * u / lam + phase) + shift

    def dv(u):
        return amp * 2 * math.pi / lam * math.cos(2 * math.pi * u / lam + phase)

    out = []
    for i in range(steps):
        a = u0 + (u1 - u0) * i / steps
        b = u0 + (u1 - u0) * (i + 1) / steps
        h = (b - a) / 3
        out.append(
            f"C{{x({a + h})}} {{y({v(a) + dv(a) * h})}} "
            f"{{x({b - h})}} {{y({v(b) - dv(b) * h})}} {{x({b})}} {{y({v(b)})}}"
        )
    return out, v


def band(cx, cy, S, lo, hi, umax):
    """Path of the band between wave curves lo/hi (None = open to +-inf) in canvas*S coords."""
    X = lambda u: f(cx + u * S)
    Y = lambda v: f(cy + v * S)
    far = 0.9

    def render(tmpl):
        return tmpl.replace("{x(", "{X(").replace("{y(", "{Y(")

    def seg(spec, u0, u1):
        if spec is None:
            return None, None
        cmds, vf = wave_cmds(u0, u1, spec["off"], spec["amp"], LAM, spec["phase"], spec["shift"])
        res = []
        for c in cmds:
            # evaluate placeholders
            import re
            res.append(re.sub(r"\{([xy])\(([^)]*)\)\}", lambda m: (X if m.group(1) == "x" else Y)(float(m.group(2))), c))
        return res, vf

    u0, u1 = -0.39, 0.39
    parts = []
    if lo is None:
        parts.append(f"M{X(u0)} {Y(-far)}L{X(u1)} {Y(-far)}")
    else:
        c, vf = seg(lo, u0, u1)
        parts.append(f"M{X(u0)} {Y(vf(u0))}" + "".join(c))
    if hi is None:
        parts.append(f"L{X(u1)} {Y(far)}L{X(u0)} {Y(far)}Z")
    else:
        parts.append(f"L{X(u1)} {Y(hi_v(hi, u1))}")
        c, vf = seg(hi, u1, u0)
        parts.append("".join(c) + "Z")
    return "".join(parts)


def hi_v(spec, u):
    return spec["off"] + spec["amp"] * math.sin(2 * math.pi * u / LAM + spec["phase"]) + spec["shift"]


def mark_geometry(cx, cy, S, dia=DIA, second=True, gap1=GAP1, amp=A):
    """Returns dict(radius, rotate, bands=[(role, d)]) in a coordinate space of size S."""
    w1u = dict(off=0, amp=amp, phase=0.0, shift=-gap1 / 2)
    w1l = dict(off=0, amp=amp, phase=0.0, shift=+gap1 / 2)
    bands = []
    if second:
        w2u = dict(off=OFF2, amp=amp, phase=PH2, shift=-GAP2 / 2)
        w2l = dict(off=OFF2, amp=amp, phase=PH2, shift=+GAP2 / 2)
        bands.append(("upper", band(cx, cy, S, None, w1u, 0.39)))
        bands.append(("lower", band(cx, cy, S, w1l, w2u, 0.39)))
        bands.append(("lower", band(cx, cy, S, w2l, None, 0.39)))
    else:
        bands.append(("upper", band(cx, cy, S, None, w1u, 0.39)))
        bands.append(("lower", band(cx, cy, S, w1l, None, 0.39)))
    return dict(radius=dia / 2 * S, rotate=TILT, bands=bands)


def mark_group(cx, cy, S, cid, fills, **kw):
    g = mark_geometry(cx, cy, S, **kw)
    paths = "".join(f'<path d="{d}" fill="{fills[role]}" stroke="none"/>' for role, d in g["bands"])
    return (
        f'<clipPath id="{cid}"><circle cx="{f(cx)}" cy="{f(cy)}" r="{f(g["radius"])}"/></clipPath>'
        f'<g clip-path="url(#{cid})"><g transform="rotate({g["rotate"]} {f(cx)} {f(cy)})">{paths}</g></g>'
    )


def svg(vb, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="none">'
        f"<title>{title}</title>{body}</svg>\n"
    )


# ---- wordmark (stroke-based geometric letters, x-height 100, stroke 22) ----
SW = 22


def wordmark_body(color_mark, cid):
    d_o = 104.0
    cx, cy = d_o / 2, 50.0
    fills = (
        {"upper": LIME, "lower": EMBER} if color_mark else {"upper": "currentColor", "lower": "currentColor"}
    )
    # miniature: canvas S such that disc diameter d_o -> S = d_o / DIA; single wave, wider gap
    S = d_o / DIA
    o = mark_group(cx, cy, S, cid, fills, second=False, gap1=0.05, amp=0.05)
    m_x, n_x, i_x = 120, 268, 360
    letters = (
        f'<g stroke="currentColor" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">'
        f'<path d="M{m_x + 11} 11V89M{m_x + 11} 39A28 28 0 0 1 {m_x + 67} 39V89M{m_x + 67} 39A28 28 0 0 1 {m_x + 123} 39V89"/>'
        f'<path d="M{n_x + 11} 11V89M{n_x + 11} 39A28 28 0 0 1 {n_x + 67} 39V89"/>'
        f'<path d="M{i_x + 11} 11V89"/></g>'
        f'<circle cx="{i_x + 11}" cy="-30" r="13" fill="currentColor"/>'
    )
    return o + letters


WM_VB = "-8 -50 402 158"


def write_assets():
    ASSETS.mkdir(parents=True, exist_ok=True)
    fills = {"upper": LIME, "lower": EMBER}
    mono = {"upper": "currentColor", "lower": "currentColor"}
    (ASSETS / "logo-mark.svg").write_text(
        svg("0 0 1000 1000", mark_group(500, 500, 1000, "disc", fills), "møni")
    )
    (ASSETS / "logo-mark-mono.svg").write_text(
        svg("0 0 1000 1000", mark_group(500, 500, 1000, "disc", mono), "møni")
    )
    (ASSETS / "logo-wordmark.svg").write_text(svg(WM_VB, wordmark_body(False, "o"), "møni"))
    (ASSETS / "logo-lockup-horizontal.svg").write_text(svg(WM_VB, wordmark_body(True, "o"), "møni"))
    # TS geometry
    g = mark_geometry(500, 500, 1000)
    gw = mark_geometry(52, 50, 104 / DIA, second=False, gap1=0.05)
    def bands(gg):
        return ",\n".join(f"  {{ role: '{r}', d: '{d}' }}" for r, d in gg["bands"])
    TS_OUT.write_text(
        "// GENERATED by docs/identity/logo/generate_mark.py - do not edit by hand.\n"
        "export type MarkRole = 'upper' | 'lower';\n"
        f"export const MARK_RADIUS = {f(g['radius'])}; // viewBox 0 0 1000 1000, centre 500/500\n"
        f"export const MARK_ROTATE = {g['rotate']};\n"
        f"export const MARK_BANDS: { '{' } role: MarkRole; d: string { '}' }[] = [\n{bands(g)},\n];\n\n"
        "// Miniature for the wordmark o (single wave, wider gap); viewBox -8 -50 402 158.\n"
        f"export const WM_O_RADIUS = {f(gw['radius'])};\n"
        f"export const WM_O_BANDS: { '{' } role: MarkRole; d: string { '}' }[] = [\n{bands(gw)},\n];\n"
    )


if __name__ == "__main__":
    write_assets()
    print("ok")
