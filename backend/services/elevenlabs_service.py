import os
import httpx

VOICE_ID = "qMQOB3tFW2YBGdNHa6xE"

async def generate_speech(text: str) -> bytes:
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        print("Warning: ELEVENLABS_API_KEY missing, skipping TTS.")
        return b""

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }

    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data, headers=headers, timeout=20.0)
            if response.status_code == 200:
                print(f"ElevenLabs TTS success: {len(response.content)} bytes")
                return response.content
            else:
                print(f"ElevenLabs error ({response.status_code}): {response.text[:200]}")
                return b""
        except Exception as e:
            print(f"ElevenLabs request failed: {e}")
            return b""
