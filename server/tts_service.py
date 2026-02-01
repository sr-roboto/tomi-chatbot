from gtts import gTTS
import io

class TTSService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TTSService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("-------- TTS SERVICE INITIALIZING (Google TTS) --------")
        # gTTS doesn't need model loading
        pass

    def generate_audio(self, text: str):
        """Generates audio bytes (MP3) from text using gTTS."""
        try:
            # Create gTTS object
            # lang='es' for Spanish
            tts = gTTS(text=text, lang='es', slow=False)
            
            # Save to BytesIO buffer
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            buffer.seek(0)
            
            return buffer

        except Exception as e:
            print(f"Error generating audio with gTTS: {e}")
            return None

# Singleton usage
tts_service = TTSService()
