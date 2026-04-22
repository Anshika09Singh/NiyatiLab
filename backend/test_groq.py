import sys, os
sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.abspath('..'))

from dotenv import load_dotenv
load_dotenv('.env')

from config import Config
print('GROQ_API_KEY set:', bool(Config.GROQ_API_KEY and 'your_groq' not in Config.GROQ_API_KEY))
print('Primary model   :', Config.GROQ_MODEL)
print('Fallback model  :', Config.GROQ_FALLBACK_MODEL)

from utils.llm_client import call_llm_json
result = call_llm_json('Return this exact JSON: {"greeting": "hello", "status": "ok"}')
print('LLM response    :', result)
