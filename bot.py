import telebot
import requests

# 1. MASUKKAN TOKEN DARI BOTFATHER DI SINI
TELEGRAM_TOKEN = "8755863533:AAElBHmy7RDwoM_ffPcbyyVZpNkFqF_gvDI" #awa
bot = telebot.TeleBot(TELEGRAM_TOKEN)

# 2. MASUKKAN URL LANGFLOW KAMU DI SINI
# Sesuai screenshot, ID Flow kamu adalah 91050936-5a04-4be8-b3f3-148478e28ca7
LANGFLOW_URL = "http://127.0.0.1:7860/api/v1/run/91050936-5a04-4be8-b3f3-148478e28ca7"

# 3. MASUKKAN LANGFLOW API KEY DI SINI
# Berdasarkan screenshot-mu, kamu punya API Key bernama "QibalExpenseTracker"
LANGFLOW_API_KEY = "sk-t4DEfQe1QtcYD6xjTQFx4R3s6tR-_Jdnpq8ml3LV0yk" # MASUKKAN FULL KEY-NYA DI SINI

print("[INFO] Bot Telegram menyala dan siap menerima pesan...")

@bot.message_handler(func=lambda message: True)
def handle_message(message):
    user_text = message.text
    chat_id = message.chat.id
    sender_name = message.from_user.first_name

    # Beri tahu user bahwa bot sedang berpikir
    bot.send_chat_action(chat_id, 'typing')

    # Payload untuk dikirim ke Langflow
    payload = {
        "input_value": user_text,
        "output_type": "chat",
        "input_type": "chat",
        "tweaks": {},
        "session_id": str(chat_id) 
    }
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": LANGFLOW_API_KEY
    }

    try:
        # Tembak ke Langflow dengan Header API Key
        response = requests.post(LANGFLOW_URL, json=payload, headers=headers)
        response_data = response.json()

        # Ekstrak jawaban dari Langflow
        # (Struktur JSON balasan Langflow bisa sedikit berbeda tergantung versi)
        outputs = response_data.get("outputs", [])
        if outputs:
            # Ambil pesan teks dari Chat Output
            bot_reply = outputs[0]["outputs"][0]["results"]["message"]["text"]
            bot.reply_to(message, bot_reply)
        else:
            bot.reply_to(message, "Waduh, Langflow nggak merespons dengan benar nih.")

    except Exception as e:
        print("Error:", e)
        bot.reply_to(message, f"Oops, sistem lagi error: {e}")

# Jalankan bot terus-menerus
bot.infinity_polling()
