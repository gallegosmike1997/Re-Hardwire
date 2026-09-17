import os

BASE = "/home/kalimike/Re-Hardwire/frontend"

def w(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"WROTE {path} ({len(content)} bytes)")
