import os
import uuid
from pathlib import Path
from typing import Optional

from TTS.api import TTS


class TTSEngine:
    """
    Offline-capable Coqui TTS engine for Re-Hardwire.
    Loads a local model and synthesizes speech without any internet access.
    """

    def __init__(
        self,
        model_name: str = "tts_models/en/ljspeech/tacotron2-DDC",
        output_dir: str = "audio/output"
    ):
        self.model_name = model_name
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Load model locally (Coqui caches models in ~/.local/share/tts/)
        self.tts = TTS(model_name, progress_bar=False, gpu=False)

    def synthesize(self, text: str, voice: Optional[str] = None) -> str:
        """
        Synthesizes speech from text and returns the path to the WAV file.
        Fully offline once the model is cached.
        """

        if not text or not text.strip():
            raise ValueError("Cannot synthesize empty text.")

        file_id = uuid.uuid4().hex
        wav_path = self.output_dir / f"{file_id}.wav"

        self.tts.tts_to_file(
            text=text,
            file_path=str(wav_path),
            speaker=voice
        )

        return str(wav_path)

    def synthesize_to_memory(self, text: str, voice: Optional[str] = None) -> bytes:
        """
        Synthesizes speech and returns raw WAV bytes.
        Useful for streaming audio directly to the UI.
        """

        if not text or not text.strip():
            raise ValueError("Cannot synthesize empty text.")

        audio, sr = self.tts.tts(text=text, speaker=voice)

        import io
        import soundfile as sf

        buffer = io.BytesIO()
        sf.write(buffer, audio, sr, format="WAV")
        return buffer.getvalue()
