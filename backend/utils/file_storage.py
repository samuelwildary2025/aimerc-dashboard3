import os
import base64
import uuid
import re
from typing import Optional, Tuple

# Diretório padrão para uploads
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "comprovantes")

def ensure_upload_dir():
    """Garante que o diretório de uploads existe."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

def detect_base64_type(base64_string: str) -> Tuple[Optional[str], str]:
    """
    Detecta o tipo de arquivo a partir de um data URI base64.
    Retorna (mime_type, pure_base64_data)
    
    Formatos suportados:
    - data:image/png;base64,XXXX
    - data:image/jpeg;base64,XXXX
    - data:application/pdf;base64,XXXX
    - Base64 puro (tenta detectar pelos magic bytes)
    """
    # Verifica se é um data URI
    data_uri_pattern = r'^data:([^;]+);base64,(.+)$'
    match = re.match(data_uri_pattern, base64_string)
    
    if match:
        mime_type = match.group(1)
        pure_base64 = match.group(2)
        return mime_type, pure_base64
    
    # Se não for data URI, tenta decodificar e detectar pelos magic bytes
    try:
        # Limpa espaços e quebras de linha
        clean_base64 = base64_string.replace('\n', '').replace('\r', '').replace(' ', '')
        decoded = base64.b64decode(clean_base64[:100])  # Só precisa dos primeiros bytes
        
        # Magic bytes para diferentes formatos
        if decoded[:8] == b'\x89PNG\r\n\x1a\n':
            return 'image/png', clean_base64
        elif decoded[:2] == b'\xff\xd8':
            return 'image/jpeg', clean_base64
        elif decoded[:4] == b'%PDF':
            return 'application/pdf', clean_base64
        elif decoded[:4] == b'GIF8':
            return 'image/gif', clean_base64
        else:
            # Assume imagem genérica
            return 'application/octet-stream', clean_base64
    except Exception:
        return None, base64_string

def get_extension_from_mime(mime_type: str) -> str:
    """Retorna a extensão de arquivo baseada no MIME type."""
    mime_to_ext = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'application/pdf': '.pdf',
        'application/octet-stream': '.bin',
    }
    return mime_to_ext.get(mime_type, '.bin')

def is_base64(value: str) -> bool:
    """Verifica se uma string parece ser base64."""
    if not value:
        return False
    
    # Se começa com data:, é data URI
    if value.startswith('data:'):
        return True
    
    # Se começa com http, é URL
    if value.startswith('http://') or value.startswith('https://'):
        return False
    
    # Tenta verificar se é base64 válido
    # Base64 tem apenas caracteres específicos e tamanho mínimo
    base64_pattern = r'^[A-Za-z0-9+/=]+$'
    clean_value = value.replace('\n', '').replace('\r', '').replace(' ', '')
    
    if len(clean_value) > 100 and re.match(base64_pattern, clean_value):
        return True
    
    return False

def save_base64_file(base64_data: str, subfolder: str = "comprovantes") -> Optional[str]:
    """
    Salva um arquivo base64 no sistema de arquivos.
    
    Args:
        base64_data: String base64 (pode ser data URI ou base64 puro)
        subfolder: Subpasta dentro de uploads
        
    Returns:
        Caminho relativo do arquivo salvo (ex: /uploads/comprovantes/abc123.png)
        ou None se falhar
    """
    if not base64_data or not is_base64(base64_data):
        return None
    
    try:
        # Detecta tipo e extrai base64 puro
        mime_type, pure_base64 = detect_base64_type(base64_data)
        
        if not mime_type:
            print(f"⚠️ Não foi possível detectar o tipo do arquivo base64")
            return None
        
        # Decodifica
        file_data = base64.b64decode(pure_base64)
        
        # Gera nome único
        file_id = str(uuid.uuid4())
        extension = get_extension_from_mime(mime_type)
        filename = f"{file_id}{extension}"
        
        # Garante diretório
        upload_path = os.path.join(os.path.dirname(__file__), "..", "uploads", subfolder)
        os.makedirs(upload_path, exist_ok=True)
        
        # Salva arquivo
        full_path = os.path.join(upload_path, filename)
        with open(full_path, 'wb') as f:
            f.write(file_data)
        
        print(f"✅ Arquivo salvo: {filename} ({len(file_data)} bytes, {mime_type})")
        
        # Retorna URL relativa
        return f"/uploads/{subfolder}/{filename}"
        
    except Exception as e:
        print(f"❌ Erro ao salvar arquivo base64: {e}")
        import traceback
        traceback.print_exc()
        return None

def process_comprovante_pix(value: Optional[str]) -> Optional[str]:
    """
    Processa o campo comprovante_pix.
    
    Se for base64, converte para arquivo e retorna URL.
    Se for URL, retorna como está.
    Se for None/vazio, retorna None.
    """
    if not value:
        return None
    
    # Se já é URL, retorna como está
    if value.startswith('http://') or value.startswith('https://') or value.startswith('/uploads/'):
        return value
    
    # Se é base64, converte
    if is_base64(value):
        return save_base64_file(value, subfolder="comprovantes")
    
    # Se não é nenhum dos dois, retorna o valor original
    return value
