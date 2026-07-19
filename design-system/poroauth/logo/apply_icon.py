# -*- coding: utf-8 -*-
"""把 v3-02-ledger 落地为项目全套图标。母版 3072px，每档独立 LANCZOS 降采样。"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_v3 import ledger          # noqa: E402  (母版函数，不重复实现)

# logo/ -> poroauth/ -> design-system/ -> 仓库根
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir, os.pardir))
master = ledger()                  # 3072x3072 RGBA
print("master", master.size)


def out(size):
    return master.resize((size, size), Image.LANCZOS)


# 注意：renderer 标题栏用的是 App.vue 里的内联 SVG，不是位图。
# 这里不要再产出 src/renderer/src/assets/icon.png —— 那是已删除的死文件。
targets = {
    os.path.join(ROOT, "build", "icon.png"): 512,        # electron-builder 源图
    os.path.join(ROOT, "resources", "icon.png"): 512,    # main/index.ts 的 BrowserWindow icon
}
for path, size in targets.items():
    out(size).save(path)
    print(f"  {os.path.relpath(path, ROOT)}  {size}x{size}")

# Windows .ico —— 多尺寸，从各自的 LANCZOS 结果入册
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_path = os.path.join(ROOT, "build", "icon.ico")
out(256).save(ico_path, format="ICO", sizes=[(s, s) for s in ico_sizes])
print(f"  build/icon.ico  {ico_sizes}")

# macOS .icns
icns_path = os.path.join(ROOT, "build", "icon.icns")
try:
    out(1024).save(icns_path, format="ICNS")
    print("  build/icon.icns  1024")
except Exception as e:
    print(f"  !! icns 失败，旧文件保留: {e}")

print("done")
