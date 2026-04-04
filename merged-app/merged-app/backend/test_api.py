import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env file from root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(env_path)

api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

test_models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-2.0-flash",
    "gemini-flash-latest"
]

for model_name in test_models:
    try:
        print(f"Testing {model_name}...")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say 'OK'")
        print(f"SUCCESS: {model_name} responded: {response.text.strip()}")
        break
    except Exception as e:
        print(f"FAILED: {model_name} Error: {e}")
