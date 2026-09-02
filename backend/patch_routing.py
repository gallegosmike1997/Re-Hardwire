import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class MockSessionState:
    def __init__(self):
        from backend.state import load_state
        self._state = load_state()
    def __getattr__(self, name):
        return self._state.get(name)
    def __setattr__(self, name, value):
        if name.startswith("_"):
            super().__setattr__(name, value)
        else:
            self._state[name] = value
            from backend.state import save_state
            save_state(self._state)
    def __contains__(self, name):
        return name in self._state
    def setdefault(self, name, default):
        if name not in self._state:
            self._state[name] = default
            from backend.state import save_state
            save_state(self._state)
        return self._state.get(name, default)

class MockStreamlit:
    def __init__(self):
        self.session_state = MockSessionState()
    def error(self, msg): print(f"[ERROR] {msg}")
    def stop(self): raise SystemExit("stop")
    def warning(self, msg): print(f"[WARN] {msg}")
    def info(self, msg): print(f"[INFO] {msg}")
    def success(self, msg): print(f"[OK] {msg}")
    def write(self, msg): print(msg)
    def markdown(self, msg, **kwargs): pass
    def subheader(self, msg): pass
    def header(self, msg): pass
    def caption(self, msg): pass
    def divider(self): pass
    def json(self, data): print(str(data))
    def progress(self, value): pass
    def status(self, label, **kwargs): return self
    def __enter__(self): return self
    def __exit__(self, *a): pass
    def columns(self, n): return [self] * n
    def __enter__(self): return self
    def __exit__(self, *a): pass
    def selectbox(self, label, options, **kwargs): return options[0] if options else None
    def slider(self, label, min_value=None, max_value=None, value=None, **kwargs): return value or 0
    def toggle(self, label, **kwargs): return False
    def button(self, label, **kwargs): return False
    def text_input(self, label, **kwargs): return ""
    def text_area(self, label, **kwargs): return ""
    def chat_input(self, placeholder): return None
    def chat_message(self, role, **kwargs): return self
    def file_uploader(self, label, **kwargs): return None
    def image(self, img, **kwargs): pass
    def audio(self, path, **kwargs): pass
    def download_button(self, label, data, **kwargs): return False
    def html(self, html, **kwargs): pass
    def cache_resource(self, func):
        return func

    def set_page_config(self, **kwargs): pass
    def update(self, **kwargs): pass

def install_mock_streamlit():
    if "streamlit" not in sys.modules:
        sys.modules["streamlit"] = MockStreamlit()
    return sys.modules["streamlit"]

st = install_mock_streamlit()