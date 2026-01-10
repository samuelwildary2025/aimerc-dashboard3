import requests
import re
import json

def send_whatsapp_message(phone: str, message: str, instance_token: str) -> None:
    """
    Envia mensagem de texto via WhatsApp usando a API customizada do usuário.
    URL: https://sistema-whatsapp-api.5mos1l.easypanel.host/message/text
    """
    if not phone or not instance_token:
        print(f"⚠️ WhatsApp não enviado: Telefone ({phone}) ou Token ({instance_token}) ausentes.")
        return

    # Normalizar telefone (apenas dígitos)
    phone_digits = "".join(re.findall(r"\d", phone))
    
    # Garantir formato internacional (se não começar com 55 e tiver tam 10/11, assume BR)
    if not phone_digits.startswith("55") and len(phone_digits) in [10, 11]:
        phone_digits = f"55{phone_digits}"
    
    url = "https://sistema-whatsapp-api.5mos1l.easypanel.host/message/text"
    
    payload = {
        "to": phone_digits,
        "text": message
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Instance-Token": instance_token
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            print(f"✅ WhatsApp enviado para {phone_digits}!")
        else:
            print(f"❌ Erro ao enviar WhatsApp: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exceção ao enviar WhatsApp: {e}")
