"""Монтаж промо: кадры панели из capture.mjs → зацикленный WebP.

Холст GitHub Dark #0d1117, обводка #3d444d, скругление 20 pt, без курсора:
клики показаны кольцами в измеренных центрах кнопок, камера плавная,
первый и последний кадры совпадают.

    python scripts/promo/compose.py ПАПКА docs/assets/ds-analytics-demo.webp [--keys-only]
"""
import argparse
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_W, OUT_H = 1600, 900
K = 1.25                      # px ролика на pt, как у Agent Pulse
BG = "#0d1117"
BORDER = "#3d444d"
PANEL_RADIUS = 12             # CSS px: скругление окна плагина
QUALITY = 92                  # сжатие без потерь: с потерями тёмные карточки шли блоками
PAD = 8                       # px снимка


def cubic_in_out(t):
    t = min(max(t, 0.0), 1.0)
    return 4 * t * t * t if t < .5 else 1 - (-2 * t + 2) ** 3 / 2


def cubic_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def camera_progress(elapsed, duration=.75):
    """Камера Agent Pulse V4: основной ход ~0.4 s, один перелёт ~1.3%, покой к 0.75 s."""
    if elapsed <= 0:
        return 0.0
    if elapsed >= duration:
        return 1.0
    t = elapsed / duration * .75
    value = 1 - math.exp(-11 * t) * (math.cos(8 * t) + (11 / 8) * math.sin(8 * t))
    blend = cubic_in_out((t - .60) / .15)
    return value * (1 - blend) + blend


def tap_state(rel):
    """Кольцо касания Agent Pulse V4: радиус / максимум, прозрачность, отверстие / радиус."""
    hole = .58
    if rel < -.37 or rel > .28:
        return 0.0, 0.0, hole
    if rel < -.17:
        p = (rel + .37) / .20
        return .45 + .55 * cubic_out(p), cubic_in_out(p / .6), hole
    if rel < 0:
        p = (rel + .17) / .17
        return 1 - .5 * cubic_in_out(p), 1.0, hole
    p = rel / .28
    return .5 + .24 * cubic_out(p), 1 - cubic_in_out(p), hole + .2 * cubic_in_out(p)


class Panels:
    """Кадры панели со скруглением и обводкой окна, в масштабе снимка."""

    def __init__(self, folder, scale):
        self.folder, self.scale, self.cache = folder, scale, {}

    def __getitem__(self, name):
        if name not in self.cache:
            if len(self.cache) > 48:
                self.cache.clear()
            img = Image.open(self.folder / name).convert("RGBA")
            r = PANEL_RADIUS * self.scale
            mask = Image.new("L", img.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=r, fill=255)
            img.putalpha(mask)
            ImageDraw.Draw(img).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=r,
                                                  outline=(61, 68, 77, 255), width=self.scale)
            # Прозрачное поле: субпиксельная рамка выборки может выйти за край снимка.
            padded = Image.new("RGBA", (img.width + 2 * PAD, img.height + 2 * PAD))
            padded.paste(img, (PAD, PAD))
            self.cache[name] = padded
        return self.cache[name]


def camera_at(camera, t, panel_h):
    cy, s = camera[0]["cy"], camera[0]["s"]
    for key in camera:
        if key["t"] > t:
            break
        p = camera_progress(t - key["t"], key["duration"]) if key["duration"] > 0 else 1.0
        cy += (key["cy"] - cy) * p
        s += (key["s"] - s) * p
    # Камера не уходит за верх и низ панели.
    half = OUT_H / 2 / s
    cy = panel_h / 2 if 2 * half >= panel_h else min(max(cy, half), panel_h - half)
    return cy, s


def draw_ring(img, cx, cy, rel, radius):
    radius_share, alpha, hole = tap_state(rel)
    if alpha <= 0.01:
        return
    r = radius * radius_share
    pad = int(r + 12)
    box = (int(cx - pad), int(cy - pad), int(cx + pad), int(cy + pad))
    sample = img.crop(box).filter(ImageFilter.GaussianBlur(max(2, r * .16)))
    light = sample.convert("L").resize((1, 1), Image.BOX).getpixel((0, 0)) > 170
    tint = Image.new("RGBA", sample.size, (120, 126, 140, 255) if light else (234, 241, 250, 255))
    glass = Image.blend(sample, tint, .45 if light else .28)
    size, sup = sample.size, 4
    mask = Image.new("L", (size[0] * sup, size[1] * sup), 0)
    d = ImageDraw.Draw(mask)
    ox, oy = (cx - box[0]) * sup, (cy - box[1]) * sup
    d.ellipse((ox - r * sup, oy - r * sup, ox + r * sup, oy + r * sup), fill=int(235 * alpha))
    ri = r * hole
    d.ellipse((ox - ri * sup, oy - ri * sup, ox + ri * sup, oy + ri * sup), fill=0)
    mask = mask.resize(size, Image.LANCZOS)
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(r * .12 + 2)).point(lambda v: int(v * .3)))
    img.alpha_composite(shadow, (box[0], box[1] + max(1, int(r * .05))))
    glass.putalpha(mask)
    img.alpha_composite(glass, (box[0], box[1]))


def outer_frame():
    sup = 3
    border = Image.new("RGBA", (OUT_W * sup, OUT_H * sup))
    ImageDraw.Draw(border).rounded_rectangle((sup / 2, sup / 2, OUT_W * sup - sup / 2, OUT_H * sup - sup / 2),
                                             radius=20 * K * sup, outline=BORDER, width=round(K * sup))
    mask = Image.new("L", (OUT_W * sup, OUT_H * sup), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, OUT_W * sup - 1, OUT_H * sup - 1), radius=20 * K * sup, fill=255)
    return border.resize((OUT_W, OUT_H), Image.LANCZOS), mask.resize((OUT_W, OUT_H), Image.LANCZOS)


def render(panels, tl, i, border, mask):
    fps, scale = tl["fps"], tl["scale"]
    pw, ph = tl["panel"]["width"], tl["panel"]["height"]
    t = i / fps
    entry = tl["frames"][i]
    if "img" in entry:
        src = panels[entry["img"]]
    else:
        src = Image.blend(panels[entry["a"]], panels[entry["b"]], entry["mix"])
    cy, s = camera_at(tl["camera"], t, ph)
    left, top = OUT_W / 2 - pw / 2 * s, OUT_H / 2 - cy * s
    # Видимая часть панели в координатах ролика и снимка — субпиксельно, без дрожи.
    x0, y0 = max(0.0, left), max(0.0, top)
    x1, y1 = min(float(OUT_W), left + pw * s), min(float(OUT_H), top + ph * s)
    ix0, iy0, ix1, iy1 = math.floor(x0), math.floor(y0), math.ceil(x1), math.ceil(y1)
    k = scale / s
    box = ((ix0 - left) * k + PAD, (iy0 - top) * k + PAD, (ix1 - left) * k + PAD, (iy1 - top) * k + PAD)
    view = src.resize((ix1 - ix0, iy1 - iy0), Image.LANCZOS, box=box)
    frame = Image.new("RGBA", (OUT_W, OUT_H), BG)
    frame.alpha_composite(view, (ix0, iy0))
    for c in tl["clicks"]:
        draw_ring(frame, left + c["x"] * s, top + c["y"] * s, t - c["t"], 20 * s)
    frame.putalpha(mask)
    frame.alpha_composite(border)
    return frame


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--keys-only", action="store_true", help="только контрольные PNG, без кодирования")
    parser.add_argument("--step", type=float, default=.5, help="шаг контрольных кадров, с")
    parser.add_argument("--quality", type=int, default=QUALITY)
    parser.add_argument("--fps", type=int, default=30, help="частота ролика; таймлайн снят в 60")
    parser.add_argument("--ffmpeg", help="путь к ffmpeg с libwebp; по умолчанию из imageio-ffmpeg")
    args = parser.parse_args()

    tl = json.loads((args.folder / "timeline.json").read_text())
    fps, count = tl["fps"], len(tl["frames"])
    panels = Panels(args.folder, tl["scale"])
    border, mask = outer_frame()
    keys_dir = args.folder / "keys"
    keys_dir.mkdir(exist_ok=True)
    step = fps // args.fps
    keys = {round(n * args.step * fps) for n in range(int(count / fps / args.step) + 1)} | {0, count - 1}
    keys |= {min(count - 1, max(0, round((c["t"] + d) * fps))) for c in tl["clicks"] for d in (-.2, 0)}
    keys = {k - k % step for k in keys}  # только кадры, которые попадут в ролик

    encoder = None
    if not args.keys_only:
        if args.ffmpeg is None:
            import imageio_ffmpeg
            args.ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        args.out.parent.mkdir(parents=True, exist_ok=True)
        encoder = subprocess.Popen([
            args.ffmpeg, "-y", "-v", "error", "-f", "rawvideo",
            "-pix_fmt", "rgba", "-s", f"{OUT_W}x{OUT_H}", "-r", str(args.fps), "-i", "-",
            "-c:v", "libwebp_anim", "-lossless", "1", "-quality", str(args.quality),
            "-compression_level", "6", "-loop", "0", str(args.out),
        ], stdin=subprocess.PIPE)

    first = last = None
    try:
        for i in (sorted(k for k in keys if k < count) if args.keys_only else range(0, count, step)):
            frame = render(panels, tl, i, border, mask)
            if encoder:
                encoder.stdin.write(frame.tobytes())
            if i in keys:
                frame.save(keys_dir / f"key-{i / fps:05.2f}.png")
            if i == 0:
                first = frame
            last = frame
            if i % (fps * 5) == 0:
                print(f"Монтаж: {i / fps:.0f}/{count / fps:.0f} с", flush=True)
    finally:
        if encoder:
            encoder.stdin.close()
    if encoder and encoder.wait() != 0:
        raise RuntimeError("Не удалось записать WebP")

    # Стык петли: последний кадр совпадает с первым.
    diff = ImageChops.difference(first.convert("RGB"), last.convert("RGB")).getbbox()
    report = {"frames": len(range(0, count, step)), "fps": args.fps, "seconds": count / fps, "loop_seam_identical": diff is None,
              "clicks": len(tl["clicks"])}
    if encoder:
        report["bytes"] = args.out.stat().st_size
    (args.folder / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
