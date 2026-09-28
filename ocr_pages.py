import subprocess, os
from pathlib import Path

pages_dir = str(Path(__file__).resolve().parent / 'pages')
for i in range(1, 9):
    fp = os.path.join(pages_dir, f'page_{i:02d}.png')
    print(f'\n===== PAGE {i} =====')
    try:
        r = subprocess.run(['tesseract', fp, 'stdout', '-l', 'eng', '--psm', '6'], capture_output=True, text=True, timeout=30)
        text = r.stdout.strip()
        print(text if text else '(no text)')
    except FileNotFoundError:
        print('(tesseract not available)')
    except Exception as e:
        print(f'(error: {e})')
