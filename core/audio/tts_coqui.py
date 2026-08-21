from TTS.api import TTS
import os

VOICE_MODELS = {
    "natural": "tts_models/en/ljspeech/tacotron2-DDC",
    "multi": "tts_models/en/vctk/vits",
    "accented": "tts_models/multilingual/multi-dataset/your_tts"
}

class CoquiEngine:
    def __init__(self, voice="natural"):
        model_name = VOICE_MODELS.get(voice, VOICE_MODELS["natural"])
        self.tts = TTS(model_name)

    def speak(self, text, output_path="output.wav"):
        self.tts.tts_to_file(text=text, file_path=output_path)
        return output_path
