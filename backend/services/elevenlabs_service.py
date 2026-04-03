from gtts import gTTS
import asyncio
from io import BytesIO

async def generate_speech(text: str) -> bytes:
    """
    Generates text-to-speech using Google's free TTS.
    Since ElevenLabs quota was completely blocked ("Unusual Activity"), 
    this bypasses API keys and gives seamless MP3 byte output directly to the frontend.
    """
    if not text.strip():
        return b""

    try:
        # We wrap the synchronous gTTS call in a thread to keep FastAPI completely non-blocking
        def _sync_gtts():
            tts = gTTS(text=text, lang='en', slow=False)
            fp = BytesIO()
            tts.write_to_fp(fp)
            return fp.getvalue()

        # Run completely async
        return await asyncio.to_thread(_sync_gtts)
    except Exception as e:
        print(f"gTTS error: {e}")
        return b""
