# -*- coding: utf-8 -*-
"""
v3 —— 参考当代深色 app icon 手法重做（手法借鉴，非临摹）：
  · 中偏深底 + 类似色对角渐变（非单色明度滑动）
  · 极淡同心纹理，底不再是死平面
  · 符号改描边式 + 自身亮色渐变 + 外发光
  · 顶缘内高光 / 底缘暗收
"""
import math, os
from PIL import Image, ImageDraw, ImageChops, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__))   # 产物与脚本同目录
S, SS = 512, 6
W = S * SS

# 中偏深 · 类似色配对（靛→蓝 / 靛→紫 / 青→绿，均非互补）
P_INDIGO = ((44, 51, 76), (23, 27, 43))
P_TEAL   = ((32, 56, 62), (15, 28, 34))
P_PLUM   = ((52, 42, 74), (26, 20, 40))
P_STEEL  = ((45, 50, 63), (24, 27, 35))

C_LILAC  = ((165, 180, 252), (125, 211, 252))   # 丁香 → 天蓝
C_AQUA   = ((153, 246, 228), (94, 211, 243))    # 薄荷 → 青
C_ROSE   = ((233, 213, 255), (196, 181, 253))   # 淡紫 → 薰衣草
GLOW_L   = (129, 140, 248)
GLOW_A   = (45, 212, 191)
GLOW_R   = (167, 139, 250)


def squircle(cx, cy, r, n=4.0, steps=2880):
    p = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        p.append((cx + r * math.copysign(abs(ct) ** (2.0 / n), ct),
                  cy + r * math.copysign(abs(st) ** (2.0 / n), st)))
    return p


PLATE = squircle(W / 2, W / 2, W * 0.5 * 0.985, n=4.0)
PLATE_MASK = Image.new("L", (W, W), 0)
ImageDraw.Draw(PLATE_MASK).polygon(PLATE, fill=255)


def diag_grad(c0, c1, angle=118, n=640):
    g = Image.new("RGB", (n, n))
    px = g.load()
    a = math.radians(angle)
    dx, dy = math.cos(a), math.sin(a)
    lo = min(0, n * dx) + min(0, n * dy)
    hi = max(0, n * dx) + max(0, n * dy)
    span = hi - lo
    for y in range(n):
        yd = y * dy
        for x in range(n):
            t = (x * dx + yd - lo) / span
            px[x, y] = (int(c0[0] + (c1[0] - c0[0]) * t),
                        int(c0[1] + (c1[1] - c0[1]) * t),
                        int(c0[2] + (c1[2] - c0[2]) * t))
    return g.resize((W, W), Image.BICUBIC)


def vgrad_img(c_top, c_bot):
    g = Image.new("RGBA", (1, W))
    for y in range(W):
        t = y / (W - 1)
        g.putpixel((0, y), tuple(int(c_top[i] + (c_bot[i] - c_top[i]) * t) for i in range(3)) + (255,))
    return g.resize((W, W))


def plate(pal, weave=True):
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    img.paste(diag_grad(pal[0], pal[1]), (0, 0), PLATE_MASK)
    if weave:
        # 极淡同心纹理：只在放大时被察觉，缩小后化为质感
        tex = Image.new("L", (W, W), 0)
        td = ImageDraw.Draw(tex)
        cx = cy = W / 2
        step = W * 0.030
        r = step
        while r < W * 0.78:
            td.ellipse([cx - r, cy - r, cx + r, cy + r], outline=255, width=int(W * 0.0022))
            r += step
        tex = tex.filter(ImageFilter.GaussianBlur(W * 0.0016))
        tex = ImageChops.multiply(tex, PLATE_MASK)
        img.paste(Image.new("RGBA", (W, W), (255, 255, 255, 255)), (0, 0),
                  tex.point(lambda v: int(v * 0.045)))
    return img


def rim(base, strength=0.32):
    ring = Image.new("L", (W, W), 0)
    ImageDraw.Draw(ring).polygon(PLATE, outline=255, width=int(W * 0.0075))
    top = Image.new("L", (1, W)); bot = Image.new("L", (1, W))
    for y in range(W):
        t = y / (W - 1)
        top.putpixel((0, y), int(255 * max(0.0, 1.0 - t * 2.6) ** 1.4))
        bot.putpixel((0, y), int(255 * max(0.0, (t - 0.55) * 2.2) ** 1.4))
    base.paste(Image.new("RGBA", (W, W), (255, 255, 255, 255)), (0, 0),
               ImageChops.multiply(ring, top.resize((W, W))).point(lambda v: int(v * strength)))
    base.paste(Image.new("RGBA", (W, W), (0, 0, 0, 255)), (0, 0),
               ImageChops.multiply(ring, bot.resize((W, W))).point(lambda v: int(v * strength * 0.6)))
    return base


def emit(base, mask, ramp, glow_c, glow_amt=0.50, glow_r=0.026):
    g = ImageChops.multiply(mask.filter(ImageFilter.GaussianBlur(W * glow_r)), PLATE_MASK)
    base.paste(Image.new("RGBA", (W, W), glow_c + (255,)), (0, 0),
               g.point(lambda v: int(v * glow_amt)))
    base.paste(vgrad_img(ramp[0], ramp[1]), (0, 0), mask)
    return base


def newmask():
    m = Image.new("L", (W, W), 0)
    return m, ImageDraw.Draw(m)


def rr(d, x0, y0, x1, y1, r, fill):
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill)


# ── KEY ─────────────────────────────────────────────────────
def key():
    base = rim(plate(P_INDIGO))
    m, d = newmask()
    cx = W / 2
    R, t = W * 0.140, W * 0.046          # 弓：描边环
    rcy, sw = W * 0.318, W * 0.036
    d.ellipse([cx - R, rcy - R, cx + R, rcy + R], fill=255)
    d.ellipse([cx - R + t, rcy - R + t, cx + R - t, rcy + R - t], fill=0)
    d.rectangle([cx - sw, rcy + R - t * 0.6, cx + sw, W * 0.792], fill=255)
    d.rectangle([cx + sw, W * 0.600, cx + W * 0.126, W * 0.652], fill=255)
    d.rectangle([cx + sw, W * 0.696, cx + W * 0.104, W * 0.744], fill=255)
    return emit(base, m, C_LILAC, GLOW_L)


# ── LEDGER ──────────────────────────────────────────────────
def ledger():
    base = rim(plate(P_STEEL))
    x0, x1 = W * 0.272, W * 0.728
    y0, y1 = W * 0.226, W * 0.794
    t = W * 0.044
    m, d = newmask()
    rr(d, x0, y0, x1, y1, W * 0.050, 255)
    rr(d, x0 + t, y0 + t, x1 - t, y1 - t, W * 0.050 - t * 0.5, 0)   # 描边卡壳
    lh = W * 0.040
    lx0 = x0 + t * 2.0
    for i, w in enumerate((0.260, 0.260, 0.150)):
        ly = y0 + W * (0.128 + i * 0.128)
        rr(d, lx0, ly, lx0 + W * w, ly + lh, lh / 2, 255)
    base = emit(base, m, C_AQUA, GLOW_A, glow_amt=0.44)
    return base


# ── PADLOCK ─────────────────────────────────────────────────
def padlock():
    base = rim(plate(P_INDIGO))
    m, d = newmask()
    cx = W / 2
    bx, by0, by1 = W * 0.178, W * 0.450, W * 0.780
    R, t = W * 0.116, W * 0.046
    scy = W * 0.370
    d.arc([cx - R, scy - R, cx + R, scy + R], 180, 360, fill=255, width=int(t))
    d.rectangle([cx - R - t / 2, scy, cx - R + t / 2, by0 + W * 0.010], fill=255)
    d.rectangle([cx + R - t / 2, scy, cx + R + t / 2, by0 + W * 0.010], fill=255)
    rr(d, cx - bx, by0, cx + bx, by1, W * 0.044, 255)
    rr(d, cx - bx + t, by0 + t, cx + bx - t, by1 - t, W * 0.044 - t * 0.5, 0)  # 锁体镂空
    kr = W * 0.040
    kcy = W * 0.560
    d.ellipse([cx - kr, kcy - kr, cx + kr, kcy + kr], fill=255)
    d.polygon([(cx - kr * 0.52, kcy), (cx + kr * 0.52, kcy),
               (cx + kr * 0.30, kcy + W * 0.084), (cx - kr * 0.30, kcy + W * 0.084)], fill=255)
    return emit(base, m, C_LILAC, GLOW_L)


# ── KEYHOLE ─────────────────────────────────────────────────
def keyhole():
    base = rim(plate(P_PLUM))
    m, d = newmask()
    cx, cy = W / 2, W * 0.398
    R, t = W * 0.196, W * 0.048
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)     # 外环
    d.ellipse([cx - R + t, cy - R + t, cx + R - t, cy + R - t], fill=0)
    r = W * 0.082                                            # 环内的锁孔本体
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    tw = W * 0.040
    d.polygon([(cx - tw, cy), (cx + tw, cy),
               (cx + tw * 0.55, cy + W * 0.250), (cx - tw * 0.55, cy + W * 0.250)], fill=255)
    return emit(base, m, C_ROSE, GLOW_R)


# ── TOGGLE ──────────────────────────────────────────────────
def toggle():
    base = rim(plate(P_TEAL))
    m, d = newmask()
    cy = W / 2
    x0, x1 = W * 0.220, W * 0.780
    h, t = W * 0.118, W * 0.044
    rr(d, x0, cy - h, x1, cy + h, h, 255)
    rr(d, x0 + t, cy - h + t, x1 - t, cy + h - t, h - t, 0)   # 描边胶囊
    kr, kcx = h - t * 1.55, x1 - h
    d.ellipse([kcx - kr, cy - kr, kcx + kr, cy + kr], fill=255)
    return emit(base, m, C_AQUA, GLOW_A, glow_amt=0.55)


# ── SHIELD ──────────────────────────────────────────────────
def shield():
    base = rim(plate(P_INDIGO))
    m, d = newmask()
    cx = W / 2
    yt, yb, hw = W * 0.232, W * 0.792, W * 0.238
    t = W * 0.046

    def body(shrink):
        h = (yb - yt) - shrink * 2
        y0 = yt + shrink
        w = hw - shrink
        ys = y0 + h * 0.36
        pts = [(cx + w, y0), (cx + w, ys)]
        for i in range(81):
            u = i / 80.0
            k = 1 - u
            pts.append((k**3*(cx+w) + 3*k*k*u*(cx+w) + 3*k*u*u*(cx+w*0.70) + u**3*cx,
                        k**3*ys + 3*k*k*u*(y0+h*0.74) + 3*k*u*u*(y0+h*0.88) + u**3*(y0+h)))
        for i in range(81):
            u = i / 80.0
            k = 1 - u
            pts.append((k**3*cx + 3*k*k*u*(cx-w*0.70) + 3*k*u*u*(cx-w) + u**3*(cx-w),
                        k**3*(y0+h) + 3*k*k*u*(y0+h*0.88) + 3*k*u*u*(y0+h*0.74) + u**3*ys))
        pts.append((cx - w, y0))
        return pts

    d.polygon(body(0), fill=255)
    d.polygon(body(t), fill=0)
    kr, kcy = W * 0.052, W * 0.442
    d.ellipse([cx - kr, kcy - kr, cx + kr, kcy + kr], fill=255)
    d.polygon([(cx - kr * 0.50, kcy), (cx + kr * 0.50, kcy),
               (cx + kr * 0.28, kcy + W * 0.118), (cx - kr * 0.28, kcy + W * 0.118)], fill=255)
    return emit(base, m, C_LILAC, GLOW_L)


CANDIDATES = [
    ("v3-01-key",     "KEY",     key,     "钥匙 · 深靛"),
    ("v3-02-ledger",  "LEDGER",  ledger,  "备忘录 · 石墨"),
    ("v3-03-padlock", "PADLOCK", padlock, "挂锁 · 深靛"),
    ("v3-04-keyhole", "KEYHOLE", keyhole, "锁孔 · 深梅"),
    ("v3-05-toggle",  "TOGGLE",  toggle,  "开关 · 深青"),
    ("v3-06-shield",  "SHIELD",  shield,  "盾 · 深靛"),
]

if __name__ == "__main__":
    for slug, name, fn, note in CANDIDATES:
        fn().resize((S, S), Image.LANCZOS).save(os.path.join(OUT, f"{slug}.png"))
        print(f"  {slug}.png  {name}")
    print("done")
