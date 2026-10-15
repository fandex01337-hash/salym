"""
Генератор PDF-презентации «Салым» в стиле «Вселенная».

1. Собирает HTML: каждый слайд 1600×900, «анимации» — отдельные страницы-билды (элементы появляются по шагам).
2. Печатает HTML в векторный PDF через headless Chrome/Edge.
3. Через pypdf добавляет переходы между страницами (/Trans) и полноэкранный режим при открытии.

Запуск:  python presentation/build.py
"""

from __future__ import annotations

import json
import math
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

import segno
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, FloatObject, NameObject, NumberObject

HERE = Path(__file__).resolve().parent
OUT_PDF = HERE / "Салым — презентация.pdf"
OUT_HTML = HERE / "slides.html"
DEMO_URL = "https://fandex01337-hash.github.io/salym/"
REPO_URL = "github.com/fandex01337-hash/salym"
W, H = 1600, 900

BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

# ---------------------------------------------------------------- оформление

CSS = """
@page { size: 1600px 900px; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #04040c; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; color: #eceaff; }
.page { position: relative; width: 1600px; height: 900px; overflow: hidden; break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
.layer { position: absolute; inset: 0; }
.content { position: absolute; inset: 0; padding: 120px 110px 90px; }
.hide { opacity: 0 !important; }

.top { position: absolute; top: 46px; left: 110px; right: 110px; display: flex; align-items: center; justify-content: space-between; font-size: 15px; letter-spacing: .28em; text-transform: uppercase; color: rgba(205, 205, 240, .55); }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 600; color: rgba(225, 222, 255, .8); }
.logo { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 19px; letter-spacing: 0; color: #fff; background: linear-gradient(135deg, #8b5cf6, #3b82f6 55%, #06b6d4); box-shadow: 0 0 24px rgba(139, 92, 246, .55); }
.num b { color: #fff; font-weight: 600; }

.eyebrow { font-size: 17px; font-weight: 600; letter-spacing: .34em; text-transform: uppercase; color: #a5b4fc; }
.title { font-size: 60px; line-height: 1.06; font-weight: 700; letter-spacing: -.015em; margin: 16px 0 0; max-width: 1180px; }
.lead { font-size: 25px; line-height: 1.5; color: #c9c8e6; margin-top: 22px; max-width: 980px; }
.grad { background: linear-gradient(92deg, #ddd6fe 0%, #a5b4fc 30%, #7dd3fc 65%, #67e8f9 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.grad-warm { background: linear-gradient(92deg, #fde68a, #f9a8d4 50%, #c4b5fd); -webkit-background-clip: text; background-clip: text; color: transparent; }
.muted { color: #9d9cc0; }

.card { position: relative; background: linear-gradient(160deg, rgba(255,255,255,.085), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.14); border-radius: 28px; padding: 30px 32px; box-shadow: 0 20px 60px -30px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08); }
.card h3 { margin: 0; font-size: 30px; font-weight: 650; letter-spacing: -.01em; }
.card p { margin: 10px 0 0; font-size: 19px; line-height: 1.5; color: #c4c3e2; }
.card ul { margin: 16px 0 0; padding: 0; list-style: none; }
.card li { position: relative; padding-left: 26px; margin-top: 11px; font-size: 19.5px; line-height: 1.42; color: #d4d3ee; }
.card li::before { content: ""; position: absolute; left: 2px; top: 10px; width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle, #fff, #a5b4fc 45%, rgba(165,180,252,0) 75%); box-shadow: 0 0 10px #a5b4fc; }
.icon { width: 58px; height: 58px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.icon svg { width: 30px; height: 30px; }
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 9px 18px; border-radius: 999px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); font-size: 18px; color: #e3e1fb; }
.tag { display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.note { position: absolute; left: 110px; bottom: 52px; font-size: 15px; color: rgba(190,190,225,.55); letter-spacing: .02em; }
.big { font-size: 92px; font-weight: 750; line-height: 1; letter-spacing: -.03em; }
.glow { text-shadow: 0 0 28px rgba(165, 180, 252, .55); }
"""

PALETTE = [
    ("#c4b5fd", "#7c3aed", "#2e1065"),  # фиолетовая
    ("#93c5fd", "#2563eb", "#0b1d4d"),  # синяя
    ("#67e8f9", "#0891b2", "#083344"),  # бирюзовая
    ("#f9a8d4", "#db2777", "#4a0626"),  # розовая
    ("#fde68a", "#d97706", "#451a03"),  # золотая
    ("#86efac", "#059669", "#052e16"),  # изумрудная
]

_uid = 0


def uid(prefix: str) -> str:
    global _uid
    _uid += 1
    return f"{prefix}{_uid}"


def nebula(seed: int) -> str:
    r = random.Random(seed)
    spots = [
        (r.randint(5, 35), r.randint(10, 45), "124,58,237", r.uniform(.30, .42), r.randint(38, 50)),
        (r.randint(65, 95), r.randint(55, 90), "6,182,212", r.uniform(.18, .28), r.randint(34, 46)),
        (r.randint(40, 70), r.randint(0, 25), "219,39,119", r.uniform(.10, .18), r.randint(30, 44)),
        (r.randint(70, 95), r.randint(5, 30), "59,130,246", r.uniform(.14, .22), r.randint(28, 40)),
    ]
    layers = ", ".join(f"radial-gradient(ellipse at {x}% {y}%, rgba({c},{a:.2f}), transparent {s}%)" for x, y, c, a, s in spots)
    return f'<div class="layer" style="background: {layers}, linear-gradient(160deg, #06051a 0%, #0b0824 55%, #030309 100%);"></div>'


def starfield(seed: int, count: int = 230) -> str:
    r = random.Random(seed * 7919)
    parts = []
    for _ in range(count):
        x, y = r.uniform(0, W), r.uniform(0, H)
        rad = r.choice([0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 1.6])
        op = r.uniform(.25, .95)
        color = r.choice(["#ffffff", "#ffffff", "#e0e7ff", "#c7d2fe", "#fde68a", "#a5f3fc"])
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad}" fill="{color}" opacity="{op:.2f}"/>')
    gid = uid("sg")
    bright = []
    for _ in range(7):
        x, y = r.uniform(40, W - 40), r.uniform(40, H - 40)
        s = r.uniform(10, 22)
        bright.append(
            f'<g opacity="{r.uniform(.6, 1):.2f}"><circle cx="{x:.1f}" cy="{y:.1f}" r="{s:.1f}" fill="url(#{gid})"/>'
            f'<path d="M{x - s * 1.6:.1f} {y:.1f} H{x + s * 1.6:.1f} M{x:.1f} {y - s * 1.6:.1f} V{y + s * 1.6:.1f}" stroke="#fff" stroke-width="0.8" opacity=".55"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="#fff"/></g>'
        )
    # Млечный путь — полоса мелкой пыли по диагонали
    dust = []
    for _ in range(260):
        t = r.uniform(0, 1)
        x = t * W + r.gauss(0, 60)
        y = H * (0.95 - 0.8 * t) + r.gauss(0, 55)
        dust.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r.uniform(.3, .8):.2f}" fill="#dbeafe" opacity="{r.uniform(.1, .45):.2f}"/>')
    return (
        f'<svg class="layer" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
        f'<defs><radialGradient id="{gid}"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#c7d2fe" stop-opacity=".35"/><stop offset="1" stop-color="#c7d2fe" stop-opacity="0"/></radialGradient></defs>'
        + "".join(dust) + "".join(parts) + "".join(bright) + "</svg>"
    )


def planet(cx: float, cy: float, rad: float, colors: tuple[str, str, str], ring: bool = False, glow: bool = True, tilt: float = -18) -> str:
    light, mid, dark = colors
    g, h, sh = uid("pg"), uid("ph"), uid("ps")
    out = [
        "<defs>",
        f'<radialGradient id="{g}" cx="32%" cy="28%" r="78%"><stop offset="0" stop-color="{light}"/><stop offset=".45" stop-color="{mid}"/><stop offset="1" stop-color="{dark}"/></radialGradient>',
        f'<radialGradient id="{h}"><stop offset=".55" stop-color="{mid}" stop-opacity=".45"/><stop offset="1" stop-color="{mid}" stop-opacity="0"/></radialGradient>',
        f'<linearGradient id="{sh}" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>',
        "</defs>",
    ]
    if glow:
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{rad * 1.55:.1f}" fill="url(#{h})"/>')
    if ring:
        out.append(
            f'<g transform="rotate({tilt} {cx} {cy})"><ellipse cx="{cx}" cy="{cy}" rx="{rad * 1.9:.1f}" ry="{rad * .42:.1f}" fill="none" stroke="{light}" stroke-opacity=".35" stroke-width="{max(2, rad * .06):.1f}"/></g>'
        )
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="url(#{g})"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="url(#{sh})"/>')
    if ring:  # передняя половина кольца поверх планеты
        out.append(
            f'<g transform="rotate({tilt} {cx} {cy})"><path d="M{cx - rad * 1.9:.1f} {cy} A{rad * 1.9:.1f} {rad * .42:.1f} 0 0 0 {cx + rad * 1.9:.1f} {cy}" fill="none" stroke="{light}" stroke-opacity=".55" stroke-width="{max(2, rad * .06):.1f}"/></g>'
        )
    return "".join(out)


def svg_layer(inner: str, cls: str = "") -> str:
    return f'<svg class="layer {cls}" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{inner}</svg>'


def star(cx: float, cy: float, rad: float) -> str:
    a, b = uid("st"), uid("sc")
    return (
        f'<defs><radialGradient id="{a}"><stop offset="0" stop-color="#fff7ed" stop-opacity=".95"/><stop offset=".18" stop-color="#fde68a" stop-opacity=".75"/>'
        f'<stop offset=".45" stop-color="#a78bfa" stop-opacity=".32"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></radialGradient>'
        f'<radialGradient id="{b}" cx="40%" cy="38%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#fef3c7"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs>'
        f'<circle cx="{cx}" cy="{cy}" r="{rad * 3.2:.1f}" fill="url(#{a})"/>'
        f'<path d="M{cx - rad * 4.2:.1f} {cy} H{cx + rad * 4.2:.1f} M{cx} {cy - rad * 3:.1f} V{cy + rad * 3:.1f}" stroke="#fff7ed" stroke-opacity=".35" stroke-width="1.5"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="url(#{b})"/>'
    )


ICONS = {
    "chat": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    "wallet": '<rect x="3" y="6" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12.5h2M3 9h15a3 3 0 0 0-3-3H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    "megaphone": '<path d="M3 10v4a1 1 0 0 0 1 1h3l7 4V5L7 9H4a1 1 0 0 0-1 1Zm15-1.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    "users": '<circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    "briefcase": '<rect x="3" y="7" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 12.5h18" fill="none" stroke="currentColor" stroke-width="2"/>',
    "phone": '<path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    "brain": '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    "spark": '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" fill="currentColor"/>',
    "shield": '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
}

ICON_BG = [
    "background: linear-gradient(135deg, rgba(139,92,246,.45), rgba(59,130,246,.25)); color: #ede9fe; box-shadow: 0 0 30px rgba(139,92,246,.45);",
    "background: linear-gradient(135deg, rgba(6,182,212,.45), rgba(16,185,129,.22)); color: #cffafe; box-shadow: 0 0 30px rgba(6,182,212,.4);",
    "background: linear-gradient(135deg, rgba(236,72,153,.45), rgba(245,158,11,.22)); color: #fce7f3; box-shadow: 0 0 30px rgba(236,72,153,.4);",
    "background: linear-gradient(135deg, rgba(245,158,11,.45), rgba(234,88,12,.22)); color: #fef3c7; box-shadow: 0 0 30px rgba(245,158,11,.4);",
]


def icon(name: str, variant: int) -> str:
    return f'<div class="icon" style="{ICON_BG[variant % len(ICON_BG)]}"><svg viewBox="0 0 24 24">{ICONS[name]}</svg></div>'


def hide(step: int, need: int) -> str:
    return " hide" if step < need else ""


# ---------------------------------------------------------------- слайды
# Каждый слайд: функция(step) -> HTML, число шагов (страниц-билдов) и переход при входе на слайд.


def s_title(step: int) -> str:
    deco = svg_layer(
        planet(1250, 640, 230, PALETTE[0], ring=True, tilt=-16)
        + planet(1480, 250, 46, PALETTE[2])
        + planet(990, 205, 22, PALETTE[3], glow=False)
        + star(260, 170, 16)
    )
    return f"""
    {deco}
    <div class="content" style="padding-top: 210px;">
      <div class="eyebrow">Хакатон · Тараз · 2026</div>
      <div style="display:flex; align-items:center; gap: 30px; margin-top: 26px;">
        <div class="logo" style="width:110px;height:110px;border-radius:32px;font-size:62px;box-shadow:0 0 70px rgba(139,92,246,.75);">С</div>
        <div class="big grad glow" style="font-size:150px;">Салым</div>
      </div>
      <div class="{hide(step, 2).strip()}">
        <div style="font-size: 40px; font-weight: 600; margin-top: 34px; color: #f1f0ff;">ИИ-сотрудник для малого и среднего бизнеса</div>
        <div class="lead" style="max-width: 760px;">Один агент с общей памятью о бизнесе: заявки, бухгалтерия, маркетинг, команда и звонки — как одна вселенная навыков.</div>
      </div>
    </div>"""


def s_problem(step: int) -> str:
    roles = [("Администратор", "заявки и запись"), ("Бухгалтер", "доходы и налоги"), ("SMM-маркетолог", "посты и акции"), ("HR-менеджер", "найм и команда")]
    role_html = "".join(
        f'<div class="card" style="padding:22px 26px; display:flex; align-items:center; gap:18px;">'
        f'<svg width="54" height="54" viewBox="0 0 54 54">{planet(27, 27, 18, PALETTE[i], glow=False)}</svg>'
        f'<div><div style="font-size:24px;font-weight:650;">{n}</div><div class="muted" style="font-size:17px;margin-top:2px;">{d}</div></div></div>'
        for i, (n, d) in enumerate(roles)
    )
    pains = [
        ("Заявки рассыпаны по пяти каналам", "Instagram, WhatsApp, Telegram, сайт, 2ГИС. Ответили через час — клиент уже у конкурента."),
        ("Деньги в тетради и Excel", "Непонятно, сколько заработали и что «съело» прибыль в этом месяце."),
        ("Маркетинг наугад", "Акции и посты не опираются на данные: слабые дни и товары никто не замечает."),
    ]
    pain_html = "".join(
        f'<div style="display:flex; gap:20px; margin-top:{0 if i == 0 else 30}px;">'
        f'<div style="flex:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;background:rgba(244,114,182,.16);color:#f9a8d4;border:1px solid rgba(244,114,182,.4);">{i + 1}</div>'
        f'<div><div style="font-size:27px;font-weight:650;">{t}</div><div style="font-size:20px;line-height:1.5;color:#c4c3e2;margin-top:6px;">{d}</div></div></div>'
        for i, (t, d) in enumerate(pains)
    )
    return f"""
    <div class="content">
      <div class="eyebrow">Проблема</div>
      <div class="title">Малый бизнес <span class="grad-warm">тонет в рутине</span></div>
      <div style="display:grid; grid-template-columns: 560px 1fr; gap: 80px; margin-top: 56px;">
        <div>
          <div style="font-size:21px;color:#c9c8e6;margin-bottom:18px;">Нужны четыре специалиста — а работает один владелец:</div>
          <div style="display:grid; gap:16px;">{role_html}</div>
        </div>
        <div class="{hide(step, 2).strip()}" style="padding-top:44px;">{pain_html}</div>
      </div>
    </div>"""


SKILLS_INNER = [("Администратор", "заявки и чаты", 205), ("Бухгалтер", "финансы и документы", 335), ("Маркетолог", "акции и контент", 125)]
SKILLS_OUTER = [("Голосовой оператор", "звонки 24/7", 160), ("HR-менеджер", "найм и собеседования", 20), ("Аналитик команды", "мониторинг сотрудников", 270)]


def s_solution(step: int) -> str:
    cx, cy = 800, 560
    orbits = (
        f'<ellipse cx="{cx}" cy="{cy}" rx="330" ry="118" fill="none" stroke="#c7d2fe" stroke-opacity=".22" stroke-width="1.5" stroke-dasharray="4 8"/>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="620" ry="232" fill="none" stroke="#c7d2fe" stroke-opacity=".16" stroke-width="1.5" stroke-dasharray="4 10"/>'
    )

    def place(skills, rx, ry, start_color, need, size):
        out = []
        for i, (name, desc, ang) in enumerate(skills):
            a = math.radians(ang)
            x, y = cx + rx * math.cos(a), cy + ry * math.sin(a)
            out.append(
                f'<g opacity="{0 if step < need else 1}">{planet(round(x), round(y), size, PALETTE[(start_color + i) % 6], ring=(i == 1 and size > 30))}'
                f'<text x="{x:.0f}" y="{y + size + 34:.0f}" text-anchor="middle" font-size="24" font-weight="650" fill="#f4f3ff">{name}</text>'
                f'<text x="{x:.0f}" y="{y + size + 60:.0f}" text-anchor="middle" font-size="17" fill="#aeadd2">{desc}</text></g>'
            )
        return "".join(out)

    center = star(cx, cy, 34) + (
        f'<text x="{cx}" y="{cy + 92}" text-anchor="middle" font-size="30" font-weight="700" fill="#fff" letter-spacing="2">САЛЫМ</text>'
        f'<text x="{cx}" y="{cy + 120}" text-anchor="middle" font-size="17" fill="#d6d4f5">общая память о бизнесе</text>'
    )
    art = svg_layer(orbits + center + place(SKILLS_INNER, 330, 118, 0, 2, 30) + place(SKILLS_OUTER, 620, 232, 3, 3, 24))
    return f"""
    {art}
    <div class="content">
      <div class="eyebrow">Решение</div>
      <div class="title">Одна звезда — <span class="grad">шесть навыков</span></div>
      <div class="lead{hide(step, 3)}" style="max-width:560px;">Навыки — не отдельные сервисы. Их держит одна «гравитация»: общие данные о клиентах, деньгах и команде.</div>
    </div>"""


CHAIN = [
    ("Заявка из Instagram", "клиент пишет в 23:10"),
    ("Ответ за 11 секунд", "агент предлагает время"),
    ("Запись и сделка", "карточка в воронке"),
    ("Оплата → счёт", "документ в WhatsApp"),
    ("Доход учтён", "бухгалтерия без ввода"),
    ("Агент заметил", "вторник слабее на 45%"),
    ("Акция и пост", "−15% по вторникам"),
    ("Отчёт по команде", "кто отвечает медленно"),
]


def s_chain(step: int) -> str:
    visible = step * 2
    pts = [(165 + i * 181, 505 if i % 2 == 0 else 660) for i in range(len(CHAIN))]
    lines, nodes = [], []
    lg = uid("lg")
    defs = f'<defs><linearGradient id="{lg}" x1="0" x2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>'
    for i in range(len(pts) - 1):
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        op = 1 if i + 1 < visible else 0
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="url(#{lg})" stroke-width="2.5" stroke-opacity="{.75 * op}" stroke-dasharray="2 9" stroke-linecap="round"/>')
    for i, ((x, y), (t, d)) in enumerate(zip(pts, CHAIN)):
        op = 1 if i < visible else 0
        color = PALETTE[i % 6]
        label_y = y - 110 if i % 2 == 0 else y + 58
        nodes.append(
            f'<g opacity="{op}">{star(x, y, 9) if i in (0, 5) else planet(x, y, 15, color, glow=True)}'
            f'<text x="{x}" y="{label_y}" text-anchor="middle" font-size="15" font-weight="700" fill="#a5b4fc" letter-spacing="2">{i + 1:02d}</text>'
            f'<text x="{x}" y="{label_y + 27}" text-anchor="middle" font-size="21" font-weight="650" fill="#f5f4ff">{t}</text>'
            f'<text x="{x}" y="{label_y + 52}" text-anchor="middle" font-size="16" fill="#adacd1">{d}</text></g>'
        )
    art = svg_layer(defs + "".join(lines) + "".join(nodes))
    modules = [("Заявки", 0, 2), ("Продажи", 2, 3), ("Бухгалтерия", 3, 5), ("Маркетинг", 5, 7), ("Команда", 7, 8)]
    return f"""
    {art}
    <div class="content">
      <div class="eyebrow">Как это работает</div>
      <div class="title" style="font-size:52px;">Одна заявка проходит <span class="grad">через всю вселенную</span></div>
      <div class="lead" style="font-size:22px;margin-top:16px;">Каждый навык передаёт данные следующему — без ручного ввода и без потерь.</div>
    </div>
    <div style="position:absolute;left:110px;right:110px;bottom:60px;display:flex;gap:12px;flex-wrap:wrap;">
      {"".join(f'<span class="pill{hide(visible, b)}">{m}</span>' for m, a, b in modules)}
    </div>"""


CORE = [
    ("chat", "Заявки и чаты", ["Единый инбокс: Instagram, WhatsApp, Telegram, сайт, 2ГИС", "ИИ отвечает за секунды, менеджер перехватывает в один клик", "Воронка, которую агент двигает сам", "Отзывы с тональностью и готовым ответом"]),
    ("wallet", "Бухгалтерия", ["Доходы и расходы без ручного ввода", "Счета, акты и накладные — сразу в PDF", "Налоговый календарь ИП и черновик формы 910", "«Что съело прибыль?» — ответ с графиком"]),
    ("megaphone", "Маркетинг", ["Умные акции из данных продаж", "Посты, сторис и объявления за минуту", "Контент-план на месяц — агент заполняет сам", "Кампании с ценой заявки"]),
]


def s_core(step: int) -> str:
    cards = "".join(
        f'<div class="card{hide(step, i + 1)}" style="padding:36px 34px;">{icon(ic, i)}<h3>{t}</h3><ul>{"".join(f"<li>{x}</li>" for x in items)}</ul></div>'
        for i, (ic, t, items) in enumerate(CORE)
    )
    deco = svg_layer(planet(1530, 830, 85, PALETTE[1], ring=True))
    return f"""
    {deco}
    <div class="content">
      <div class="eyebrow">Ядро продукта</div>
      <div class="title">Три навыка, которые <span class="grad">окупают агента сразу</span></div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 52px;">{cards}</div>
    </div>"""


EXT = [
    ("users", "Сотрудники", "Скорость ответа, конверсия и выручка каждого. Инсайты вроде «Айгерим отвечает в 3 раза медленнее вечером»."),
    ("briefcase", "HR и найм", "Вакансия по описанию, скоринг резюме 0–100 и ИИ-собеседование с отчётом."),
    ("phone", "Звонки", "Голосовой агент отвечает и записывает клиента, расшифровка — в реальном времени."),
    ("brain", "Мозг агента", "Услуги, цены, правила («скидка не больше 10%»), каналы и уровень автономности."),
]


def s_ext(step: int) -> str:
    cards = "".join(f'<div class="card" style="padding:32px;">{icon(ic, i + 1)}<h3>{t}</h3><p>{d}</p></div>' for i, (ic, t, d) in enumerate(EXT))
    deco = svg_layer(planet(120, 820, 120, PALETTE[2], glow=True) + planet(1500, 160, 34, PALETTE[4]))
    return f"""
    {deco}
    <div class="content">
      <div class="eyebrow">Расширения платформы</div>
      <div class="title">Новые навыки — <span class="grad">на той же памяти</span></div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 60px;">{cards}</div>
      <div class="lead" style="margin-top:44px;font-size:22px;">Каждый новый навык сразу видит клиентов, деньги и команду — его не нужно «настраивать с нуля».</div>
    </div>"""


INSIGHTS = [
    ("Выручка по вторникам ниже на 45%", "В среднем 60 тыс ₸ против 110 тыс ₸ в другие дни.", "Запустить акцию −15% по вторникам", "#fbbf24"),
    ("«Материалы» выросли на 53%", "Поставщик гель-лаков поднял цены, закупка — на два месяца вперёд.", "Найти альтернативного поставщика", "#f472b6"),
    ("«Чистка лица» продаётся плохо", "7 продаж за месяц при среднем 34; постоянные клиенты «уснули».", "Вернуть спящих клиентов персональной акцией", "#34d399"),
]


def s_insights(step: int) -> str:
    cards = "".join(
        f'<div class="card{hide(step, i + 1)}" style="display:flex;gap:28px;align-items:center;padding:30px 34px;">'
        f'<div style="flex:none;width:16px;height:16px;border-radius:50%;background:{c};box-shadow:0 0 22px {c};"></div>'
        f'<div style="flex:1;"><div style="font-size:30px;font-weight:650;">{t}</div><div style="font-size:20px;color:#c4c3e2;margin-top:6px;">{d}</div></div>'
        f'<div class="pill" style="flex:none;background:rgba(139,92,246,.18);border-color:rgba(167,139,250,.45);">→ {a}</div></div>'
        for i, (t, d, a, c) in enumerate(INSIGHTS)
    )
    deco = svg_layer(star(1420, 170, 14))
    return f"""
    {deco}
    <div class="content">
      <div class="eyebrow">Агент заметил</div>
      <div class="title">Не просто отвечает — <span class="grad">замечает и предлагает</span></div>
      <div style="display:grid; gap: 22px; margin-top: 56px;">{cards}</div>
    </div>
    <div class="note">Примеры из демо-данных салона красоты «Aru Beauty», г. Тараз</div>"""


RESULTS = [("11 сек", "ответ клиенту вместо ~18 минут у человека"), ("64 часа", "рутины в месяц закрывает агент"), ("≈160 тыс ₸", "экономии в месяц при 2 500 ₸ за час работы"), ("24/7", "без выходных, больничных и отпусков")]


def s_results(step: int) -> str:
    cells = "".join(
        f'<div class="card" style="padding:32px 40px;">'
        f'<div class="big grad glow" style="font-size:84px;white-space:nowrap;">{v}</div>'
        f'<div style="font-size:23px;color:#cfcdee;line-height:1.4;margin-top:14px;">{d}</div></div>'
        for v, d in RESULTS
    )
    deco = svg_layer(planet(1500, 860, 120, PALETTE[4], ring=True, tilt=12))
    return f"""
    {deco}
    <div class="content">
      <div class="eyebrow">Результат</div>
      <div class="title">Что получает <span class="grad-warm">владелец бизнеса</span></div>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 60px;">{cells}</div>
    </div>
    <div class="note">Расчёт по демо-бизнесу «Aru Beauty»: ответы, документы, посты и звонки, которые агент выполняет вместо людей</div>"""


LEVELS = [
    ("Только предлагает", "Агент готовит ответы, счета и посты — отправляет владелец.", 0),
    ("С подтверждением", "Рутину делает сам, а скидки, отказы и платежи — после «ок».", 1),
    ("Полностью сам", "Отвечает, записывает, выставляет счета и публикует без участия людей.", 2),
]


def level_bars(level: int) -> str:
    bars = []
    for k in range(3):
        color = "#a78bfa" if k <= level else "rgba(255,255,255,.15)"
        glow = "box-shadow:0 0 12px #a78bfa;" if k <= level else ""
        bars.append(f'<span style="width:38px;height:8px;border-radius:4px;background:{color};{glow}"></span>')
    return f'<div style="display:flex;gap:8px;margin-bottom:24px;">{"".join(bars)}</div>'


def s_trust(step: int) -> str:
    highlight = "border-color:rgba(167,139,250,.6);box-shadow:0 0 50px -10px rgba(139,92,246,.6);"
    cards = "".join(
        f'<div class="card" style="padding:34px;{highlight if i == 1 else ""}">{level_bars(lvl)}<h3>{t}</h3><p style="font-size:20px;">{d}</p></div>'
        for i, (t, d, lvl) in enumerate(LEVELS)
    )
    rules = ["Скидка не больше 10% без согласования", "Жалобы — сразу администратору", "Не записывать на окрашивание позже 18:00"]
    shield = f'<div class="icon" style="{ICON_BG[1]} margin:0; width:46px; height:46px; border-radius:14px;"><svg viewBox="0 0 24 24">{ICONS["shield"]}</svg></div>'
    pills = "".join(f'<span class="pill">{r}</span>' for r in rules)
    deco = svg_layer(planet(1430, 790, 105, PALETTE[2], ring=True, tilt=-10) + planet(1180, 840, 26, PALETTE[3]))
    return f"""
    {deco}
    <div class="content">
      <div class="eyebrow">Контроль и доверие</div>
      <div class="title">Владелец решает, <span class="grad">сколько свободы у агента</span></div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin-top: 56px;">{cards}</div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:40px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:12px;font-size:20px;color:#cfcdee;margin-right:8px;">{shield}Правила, которые агент не нарушает:</div>
        {pills}
      </div>
    </div>"""


BUSINESSES = [("Салон красоты", "Aru Beauty", "запись к мастерам", 0), ("Кафе", "«Шанырак»", "брони и доставка", 4), ("Магазин", "«Ayana Home»", "заказы и Kaspi", 3), ("Автосервис", "«Жол Сервис»", "запись на ремонт", 2)]


def s_universal(step: int) -> str:
    xs = [250, 615, 985, 1350]
    art = "".join(
        f'{planet(x, 470, 82, PALETTE[c], ring=(i % 2 == 1), tilt=-14 + i * 8)}'
        f'<text x="{x}" y="640" text-anchor="middle" font-size="30" font-weight="650" fill="#fff">{t}</text>'
        f'<text x="{x}" y="676" text-anchor="middle" font-size="20" fill="#c4b5fd">{n}</text>'
        f'<text x="{x}" y="706" text-anchor="middle" font-size="18" fill="#a7a6cc">{d}</text>'
        for i, (x, (t, n, d, c)) in enumerate(zip(xs, BUSINESSES))
    )
    orbit = '<path d="M100 470 Q 800 330 1500 470" fill="none" stroke="#c7d2fe" stroke-opacity=".18" stroke-width="1.5" stroke-dasharray="4 9"/>'
    return f"""
    {svg_layer(orbit + art)}
    <div class="content">
      <div class="eyebrow">Для кого</div>
      <div class="title">Любой малый бизнес — <span class="grad">своя планета</span></div>
      <div class="lead" style="font-size:23px;">В демо тип бизнеса переключается в один клик: агент подгружает клиентов, услуги, финансы и сценарии.</div>
    </div>
    <div style="position:absolute;left:110px;right:110px;bottom:70px;display:flex;gap:12px;justify-content:center;">
      <span class="pill">Казахский и русский</span><span class="pill">Kaspi</span><span class="pill">2ГИС</span><span class="pill">WhatsApp и Instagram</span><span class="pill">Цены в тенге</span>
    </div>"""


def s_tech(step: int) -> str:
    def box(x, y, w, h, title, sub, accent="#a78bfa"):
        return (
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="#ffffff" fill-opacity=".06" stroke="{accent}" stroke-opacity=".55" stroke-width="1.5"/>'
            f'<text x="{x + w / 2}" y="{y + h / 2 - 6}" text-anchor="middle" font-size="24" font-weight="650" fill="#fff">{title}</text>'
            f'<text x="{x + w / 2}" y="{y + h / 2 + 22}" text-anchor="middle" font-size="16" fill="#b7b5da">{sub}</text>'
        )

    arrow = uid("ar")
    defs = f'<defs><marker id="{arrow}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#a5b4fc"/></marker></defs>'
    channels = ["Instagram", "WhatsApp", "Telegram", "Сайт", "2ГИС"]
    ch = "".join(box(110, 330 + i * 92, 230, 72, c, "канал", "#67e8f9") for i, c in enumerate(channels))
    core = (
        f'<rect x="560" y="330" width="480" height="440" rx="34" fill="#8b5cf6" fill-opacity=".12" stroke="#a78bfa" stroke-opacity=".7" stroke-width="2"/>'
        + star(800, 420, 14)
        + '<text x="800" y="500" text-anchor="middle" font-size="30" font-weight="700" fill="#fff">Ядро Салыма</text>'
        + box(600, 530, 400, 92, "Общая память", "клиенты · сделки · деньги · команда")
        + box(600, 640, 400, 92, "ИИ-модель Claude", "или офлайн демо-режим", "#fbbf24")
    )
    outs = ["Ответы клиентам", "Счета и учёт", "Посты и акции", "Отчёты и инсайты"]
    out = "".join(box(1260, 345 + i * 105, 230, 82, o, "действие", "#f472b6") for i, o in enumerate(outs))
    arrows = "".join(f'<line x1="345" y1="{366 + i * 92}" x2="552" y2="{470 + i * 30}" stroke="#a5b4fc" stroke-opacity=".5" stroke-width="1.6" marker-end="url(#{arrow})"/>' for i in range(5))
    arrows += "".join(f'<line x1="1045" y1="{500 + i * 40}" x2="1252" y2="{386 + i * 105}" stroke="#a5b4fc" stroke-opacity=".5" stroke-width="1.6" marker-end="url(#{arrow})"/>' for i in range(4))
    return f"""
    {svg_layer(defs + arrows + ch + core + out)}
    <div class="content">
      <div class="eyebrow">Технологии</div>
      <div class="title">Как устроен <span class="grad">Салым</span></div>
    </div>
    <div class="note">Next.js · TypeScript · Tailwind · Claude API · работает на телефоне и ПК · демо без интернета и ключа</div>"""


PLANS = [("Старт", "9 900 ₸", ["1–2 канала", "Заявки и бухгалтерия", "Документы в PDF"]), ("Бизнес", "24 900 ₸", ["Все каналы", "Маркетинг и акции", "Голосовые звонки"]), ("Сеть", "49 900 ₸", ["Несколько точек", "HR и аналитика команды", "Приоритетная поддержка"])]


def s_model(step: int) -> str:
    cards = "".join(
        f'<div class="card" style="padding:36px;{"border-color:rgba(167,139,250,.65);box-shadow:0 0 60px -12px rgba(139,92,246,.65);" if i == 1 else ""}">'
        f'<div class="tag" style="background:rgba(165,180,252,.14);color:#c7d2fe;">{t}</div>'
        f'<div style="margin-top:20px;"><span class="big grad" style="font-size:58px;">{p}</span><span class="muted" style="font-size:22px;"> / мес</span></div>'
        f'<ul>{"".join(f"<li>{x}</li>" for x in items)}</ul></div>'
        for i, (t, p, items) in enumerate(PLANS)
    )
    return f"""
    {svg_layer(planet(1470, 770, 80, PALETTE[5], ring=True))}
    <div class="content">
      <div class="eyebrow">Модель</div>
      <div class="title">Подписка дешевле, чем <span class="grad-warm">один сотрудник</span></div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 26px; margin-top: 54px;">{cards}</div>
    </div>
    <div class="note">Ориентировочные тарифы для пилота. Для сравнения: зарплата администратора салона в демо — 220–260 тыс ₸ в месяц</div>"""


ROADMAP = [("Сейчас", "MVP: 6 навыков, демо на 4 типах бизнеса, телефон и ПК"), ("3 месяца", "Пилот с 10 бизнесами в Таразе"), ("6 месяцев", "Интеграции: WhatsApp Business API, Instagram, Kaspi"), ("12 месяцев", "Голосовой агент на казахском и русском, сети филиалов")]


def s_roadmap(step: int) -> str:
    y = 520
    xs = [250, 615, 985, 1350]
    lg = uid("rl")
    # userSpaceOnUse: у горизонтальной линии нулевая высота, градиент по bbox не отрисуется
    line = (
        f'<defs><linearGradient id="{lg}" gradientUnits="userSpaceOnUse" x1="140" y1="0" x2="1460" y2="0"><stop offset="0" stop-color="#fde68a"/><stop offset=".35" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".3"/></linearGradient></defs>'
        f'<path d="M140 {y} C 500 {y - 70}, 1100 {y + 70}, 1460 {y}" fill="none" stroke="url(#{lg})" stroke-width="3" stroke-dasharray="1 0"/>'
        f'<path d="M140 {y} C 500 {y - 70}, 1100 {y + 70}, 1460 {y}" fill="none" stroke="#c4b5fd" stroke-opacity=".18" stroke-width="14"/>'
    )

    def bez(t: float, a: float, b: float, c: float, d: float) -> float:
        return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d

    def curve_y(x: float) -> float:  # точка на кривой Безье с заданным x (бисекция по t)
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if bez(mid, 140, 500, 1100, 1460) < x:
                lo = mid
            else:
                hi = mid
        return bez(lo, y, y - 70, y + 70, y)

    marks = "".join((star(x, round(curve_y(x)), 12) if i == 0 else planet(x, round(curve_y(x)), 20, PALETTE[(i + 1) % 6])) for i, x in enumerate(xs))
    marks += planet(1400, 210, 70, PALETTE[0], ring=True, tilt=-20) + planet(1220, 150, 16, PALETTE[2], glow=False)
    texts = "".join(
        f'<div style="position:absolute;left:{x - 170}px;top:{y + 75}px;width:340px;text-align:center;">'
        f'<div class="tag" style="background:{"rgba(251,191,36,.18);color:#fde68a" if i == 0 else "rgba(165,180,252,.14);color:#c7d2fe"};">{t}</div>'
        f'<div style="font-size:22px;line-height:1.45;margin-top:14px;color:#e6e4fb;">{d}</div></div>'
        for i, (x, (t, d)) in enumerate(zip(xs, ROADMAP))
    )
    return f"""
    {svg_layer(line + marks)}
    <div class="content">
      <div class="eyebrow">Дорожная карта</div>
      <div class="title">Маршрут <span class="grad">к звёздам</span></div>
    </div>
    {texts}"""


def s_final(step: int) -> str:
    qr = segno.make(DEMO_URL, error="m").svg_inline(scale=7, dark="#0b0820", light="#ffffff", border=2)
    deco = svg_layer(planet(360, 880, 300, PALETTE[1], ring=True, tilt=-8) + planet(1500, 140, 40, PALETTE[3]) + star(200, 160, 14))
    return f"""
    {deco}
    <div class="content" style="padding-top: 170px;">
      <div class="eyebrow">Спасибо!</div>
      <div class="big grad glow" style="font-size:110px;margin-top:20px;">Салым</div>
      <div style="font-size:40px;font-weight:600;margin-top:20px;">Ваш бизнес — ваша вселенная.</div>
      <div class="lead" style="font-size:24px;max-width:720px;">Наведите камеру на QR-код и попробуйте демо прямо сейчас: с телефона или ноутбука, без регистрации.</div>
    </div>
    <div style="position:absolute;right:130px;top:230px;width:400px;" class="card">
      <div style="background:#fff;border-radius:20px;padding:18px;display:flex;justify-content:center;">{qr}</div>
      <div style="text-align:center;margin-top:18px;font-size:20px;font-weight:600;">Демо онлайн</div>
      <div style="text-align:center;margin-top:6px;font-size:16px;color:#c4c3e2;">fandex01337-hash.github.io/salym</div>
      <div style="text-align:center;margin-top:4px;font-size:14px;color:#9d9cc0;">{REPO_URL}</div>
    </div>"""


# (функция, шагов, переход при входе на слайд)
SLIDES = [
    (s_title, 2, {"S": "/Fade", "D": 1.2}),
    (s_problem, 2, {"S": "/Push", "Di": 180, "D": 0.8}),
    (s_solution, 3, {"S": "/Fade", "D": 1.0}),
    (s_chain, 4, {"S": "/Cover", "Di": 180, "D": 0.8}),
    (s_core, 3, {"S": "/Push", "Di": 180, "D": 0.8}),
    (s_ext, 1, {"S": "/Push", "Di": 180, "D": 0.8}),
    (s_insights, 3, {"S": "/Fade", "D": 0.9}),
    (s_results, 1, {"S": "/Box", "M": "/O", "D": 1.0}),
    (s_trust, 1, {"S": "/Split", "Dm": "/V", "M": "/O", "D": 0.9}),
    (s_universal, 1, {"S": "/Push", "Di": 180, "D": 0.8}),
    (s_tech, 1, {"S": "/Fade", "D": 0.9}),
    (s_model, 1, {"S": "/Cover", "Di": 180, "D": 0.8}),
    (s_roadmap, 1, {"S": "/Wipe", "Di": 0, "D": 1.0}),
    (s_final, 1, {"S": "/Fade", "D": 1.4}),
]
BUILD_TRANSITION = {"S": "/Dissolve", "D": 0.6}


def frame(index: int, total: int, body: str, seed: int, page_no: int) -> str:
    top = (
        f'<div class="top"><div class="brand"><div class="logo">С</div>Салым</div>'
        f'<div class="num"><b>{index:02d}</b> / {total:02d}</div></div>'
    )
    return f'<section class="page" id="p{page_no}">{nebula(seed)}{starfield(seed)}{body}{top if index > 1 else ""}</section>'


def build_html() -> tuple[str, list[dict]]:
    pages, transitions = [], []
    total = len(SLIDES)
    for i, (fn, steps, trans) in enumerate(SLIDES, start=1):
        for step in range(1, steps + 1):
            pages.append(frame(i, total, fn(step), seed=i * 13 + 5, page_no=len(pages) + 1))
            transitions.append(trans if step == 1 else BUILD_TRANSITION)
    html = f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Салым — презентация</title><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'
    return html, transitions


def print_pdf(html_path: Path, pdf_path: Path) -> None:
    browser = next((b for b in BROWSERS if Path(b).exists()), None)
    if not browser:
        raise SystemExit("Не найден Chrome или Edge для печати в PDF")
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [
                browser, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                f"--user-data-dir={profile}", "--no-pdf-header-footer", "--virtual-time-budget=4000",
                f"--print-to-pdf={pdf_path}", html_path.as_uri(),
            ],
            check=True, capture_output=True, timeout=240,
        )


def add_transitions(src: Path, dst: Path, transitions: list[dict]) -> int:
    reader = PdfReader(str(src))
    writer = PdfWriter()
    for page, t in zip(reader.pages, transitions):
        trans = DictionaryObject({NameObject("/Type"): NameObject("/Trans")})
        for key, value in t.items():
            if isinstance(value, str):
                trans[NameObject(f"/{key}")] = NameObject(value)
            elif isinstance(value, float):
                trans[NameObject(f"/{key}")] = FloatObject(value)
            else:
                trans[NameObject(f"/{key}")] = NumberObject(value)
        page[NameObject("/Trans")] = trans
        writer.add_page(page)
    # Полноэкранный режим при открытии (Adobe Acrobat / Reader) — переходы видны сразу
    writer._root_object[NameObject("/PageMode")] = NameObject("/FullScreen")
    writer.add_metadata({"/Title": "Салым — ИИ-сотрудник для бизнеса", "/Subject": "Презентация для хакатона", "/Creator": "Салым"})
    with open(dst, "wb") as f:
        writer.write(f)
    return len(reader.pages)


def main() -> None:
    html, transitions = build_html()
    OUT_HTML.write_text(html, encoding="utf-8")
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.pdf"
        print_pdf(OUT_HTML, raw)
        n = add_transitions(raw, Path(tmp) / "final.pdf", transitions)
        shutil.copyfile(Path(tmp) / "final.pdf", OUT_PDF)
    print(json.dumps({"pages": n, "expected": len(transitions), "slides": len(SLIDES), "pdf": str(OUT_PDF)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
