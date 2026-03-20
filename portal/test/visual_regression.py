#!/usr/bin/env python3
"""
Visual regression test for abstracts portal.
Screenshots each game's start screen and compares against baselines.

Usage:
  python3 test/visual_regression.py                    # compare against baselines
  python3 test/visual_regression.py --update           # update baselines with current screenshots
  python3 test/visual_regression.py --port 3009        # use custom port (default: 3009)

Requires: playwright, Pillow
"""

import argparse
import os
import sys
import time

GAMES = ['trees', 'circles', 'hexes', 'marbles', 'walls', 'bugs', 'bridges', 'pairs', 'stacks', 'towers', 'blocks', 'sowing', 'mills']
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASELINE_DIR = os.path.join(SCRIPT_DIR, 'baselines')
DIFF_DIR = os.path.join(SCRIPT_DIR, 'diffs')
VIEWPORT = {'width': 1280, 'height': 900}
# Percentage of pixels that can differ before failing (accounts for antialiasing, font rendering)
THRESHOLD = 0.5


def take_screenshots(port):
    """Take a screenshot of each game's start screen. Returns dict of game_id -> PNG bytes."""
    from playwright.sync_api import sync_playwright

    shots = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for game in GAMES:
            page = browser.new_page(viewport=VIEWPORT)
            page.goto(f'http://localhost:{port}/game/{game}', wait_until='networkidle')
            time.sleep(1)
            shots[game] = page.screenshot()
            page.close()
        browser.close()
    return shots


def compare_images(baseline_bytes, current_bytes):
    """Compare two PNG images. Returns (diff_percent, diff_image_or_None)."""
    from PIL import Image
    import io

    img_a = Image.open(io.BytesIO(baseline_bytes)).convert('RGB')
    img_b = Image.open(io.BytesIO(current_bytes)).convert('RGB')

    if img_a.size != img_b.size:
        return 100.0, None

    pixels_a = img_a.load()
    pixels_b = img_b.load()
    w, h = img_a.size
    diff_count = 0
    diff_img = Image.new('RGB', (w, h))
    diff_pixels = diff_img.load()

    for y in range(h):
        for x in range(w):
            pa, pb = pixels_a[x, y], pixels_b[x, y]
            # Per-channel threshold of 16 to ignore antialiasing
            if abs(pa[0]-pb[0]) > 16 or abs(pa[1]-pb[1]) > 16 or abs(pa[2]-pb[2]) > 16:
                diff_count += 1
                diff_pixels[x, y] = (255, 0, 80)
            else:
                # Dimmed version of current
                diff_pixels[x, y] = (pb[0]//3, pb[1]//3, pb[2]//3)

    total = w * h
    pct = (diff_count / total) * 100
    return pct, diff_img


def main():
    parser = argparse.ArgumentParser(description='Visual regression test for abstracts portal')
    parser.add_argument('--update', action='store_true', help='Update baselines')
    parser.add_argument('--port', type=int, default=3009, help='Dev server port')
    args = parser.parse_args()

    print(f'Taking screenshots from localhost:{args.port}...')
    shots = take_screenshots(args.port)

    if args.update:
        os.makedirs(BASELINE_DIR, exist_ok=True)
        for game, data in shots.items():
            path = os.path.join(BASELINE_DIR, f'{game}.png')
            with open(path, 'wb') as f:
                f.write(data)
            print(f'  updated {game}.png')
        print(f'\nBaselines updated ({len(shots)} games)')
        return

    # Compare mode
    os.makedirs(DIFF_DIR, exist_ok=True)
    passed = 0
    failed = 0
    missing = 0

    for game in GAMES:
        baseline_path = os.path.join(BASELINE_DIR, f'{game}.png')
        if not os.path.exists(baseline_path):
            print(f'  {game}: SKIP (no baseline)')
            missing += 1
            continue

        with open(baseline_path, 'rb') as f:
            baseline_bytes = f.read()

        pct, diff_img = compare_images(baseline_bytes, shots[game])

        if pct <= THRESHOLD:
            print(f'  {game}: PASS ({pct:.2f}% diff)')
            passed += 1
        else:
            diff_path = os.path.join(DIFF_DIR, f'{game}_diff.png')
            if diff_img:
                diff_img.save(diff_path)
            current_path = os.path.join(DIFF_DIR, f'{game}_current.png')
            with open(current_path, 'wb') as f:
                f.write(shots[game])
            print(f'  {game}: FAIL ({pct:.2f}% diff) -> {diff_path}')
            failed += 1

    print(f'\nResults: {passed} passed, {failed} failed, {missing} skipped')
    if failed > 0:
        print(f'Diff images saved to {DIFF_DIR}/')
        sys.exit(1)


if __name__ == '__main__':
    main()
