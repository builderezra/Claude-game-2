#!/usr/bin/env python3
"""Render the ZENITH app icon (stacked iso blocks) to PNG at several sizes."""
from PIL import Image, ImageDraw
import os

SIZES = [180, 192, 512]
OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon(size):
    s = size / 512.0
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # rounded-rect background with vertical gradient
    top, bottom = (27, 23, 69), (61, 31, 94)
    grad = Image.new('RGBA', (size, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        gd.line([(0, y), (size, y)], fill=lerp(top, bottom, y / size) + (255,))
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(110 * s), fill=255)
    img.paste(grad, (0, 0), mask)

    def poly(points, color):
        d.polygon([(x * s, y * s) for x, y in points], fill=color)

    # bottom block
    poly([(256, 318), (368, 374), (256, 430), (144, 374)], (232, 93, 117))
    poly([(144, 374), (256, 430), (256, 486), (144, 430)], (178, 60, 82))
    poly([(368, 374), (256, 430), (256, 486), (368, 430)], (204, 74, 97))
    # middle block
    poly([(256, 222), (356, 272), (256, 322), (156, 272)], (242, 161, 84))
    poly([(156, 272), (256, 322), (256, 372), (156, 322)], (192, 118, 58))
    poly([(356, 272), (256, 322), (256, 372), (356, 322)], (217, 138, 69))
    # top block
    poly([(256, 134), (344, 178), (256, 222), (168, 178)], (255, 217, 122))
    poly([(168, 178), (256, 222), (256, 266), (168, 222)], (210, 168, 82))
    poly([(344, 178), (256, 222), (256, 266), (344, 222)], (232, 191, 98))
    # star
    d.ellipse([(256 - 26) * s, (78 - 26) * s, (256 + 26) * s, (78 + 26) * s],
              fill=(255, 255, 255, 64))
    d.ellipse([(256 - 14) * s, (78 - 14) * s, (256 + 14) * s, (78 + 14) * s],
              fill=(255, 255, 255, 255))
    return img


os.makedirs(OUT, exist_ok=True)
for sz in SIZES:
    path = os.path.join(OUT, f'icon-{sz}.png')
    draw_icon(sz).save(path)
    print('wrote', path)
