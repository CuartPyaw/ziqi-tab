"""Generate 4 showcase images for Ziqi Tab dot-z-bold logo."""
import sys
sys.path.insert(0, r"C:\Users\Aodsp\.agents\skills\logo-generator\scripts")

from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env from skill directory
load_dotenv(r"C:\Users\Aodsp\.agents\skills\logo-generator\.env")

from generate_showcase import generate_showcase_image, BACKGROUND_STYLES

LOGO_NAME = "Ziqi Tab"
REF_PNG = r"C:\Users\Aodsp\dev\ziqi-tab\logo\dot-z-bold.png"
OUTPUT_DIR = Path(r"C:\Users\Aodsp\dev\ziqi-tab\logo\showcases")
OUTPUT_DIR.mkdir(exist_ok=True)

DESCRIPTION = "Browser New Tab · Minimal Warm · Dot Matrix System"

# 4 most fitting styles for Ziqi Tab (warm, minimal, browser tool)
STYLES = [
    "editorial",     # 纸本编辑 — 素纸暖调，完美匹配
    "morning",       # 晨雾光域 — 暖白奶油底，呼应"温暖"
    "ui_container",  # 容器化界面 — 浏览器扩展定位
    "spotlight",     # 物理影棚 — 暖碳灰，提供深色对比
]

results = []
for style in STYLES:
    print(f"\n{'='*60}")
    print(f"Generating: {style} ({BACKGROUND_STYLES[style][:40]}...)")
    print(f"{'='*60}")

    output_path = OUTPUT_DIR / f"ziqi-tab_{style}.png"
    success = generate_showcase_image(
        logo_name=LOGO_NAME,
        reference_image_path=REF_PNG,
        style=style,
        output_path=str(output_path),
        product_description=DESCRIPTION
    )
    results.append((style, success))
    print(f"Result: {'✓ SUCCESS' if success else '✗ FAILED'}")

print(f"\n{'='*60}")
print("SUMMARY:")
for style, success in results:
    print(f"  {'✓' if success else '✗'} {style}")
print(f"  Output: {OUTPUT_DIR}")
