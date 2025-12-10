import json
import os
import base64
from typing import Dict, Any, Literal
from pydantic import BaseModel
import requests

class PhotoAnalysisRequest(BaseModel):
    image_base64: str

class PhotoAnalysisResponse(BaseModel):
    category: Literal["portrait", "car", "apartment", "unknown"]
    confidence: float

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Анализирует фотографию с помощью OpenAI GPT-4 Vision
    Определяет: портрет, машина, квартира или другое
    """
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        request_data = PhotoAnalysisRequest(**body_data)
        
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'OpenAI API key not configured'}),
                'isBase64Encoded': False
            }
        
        prompt = """Проанализируй это изображение и определи его категорию:

1. "portrait" - если на фото изображено лицо человека (портрет)
2. "car" - если на фото изображена машина (автомобиль, любой транспорт)
3. "apartment" - если на фото изображена квартира, дом, интерьер жилья
4. "unknown" - если ни одна из категорий не подходит

Ответь ТОЛЬКО одним словом из списка выше: portrait, car, apartment или unknown.
Никаких дополнительных объяснений."""

        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {openai_api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4o-mini',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f'data:image/jpeg;base64,{request_data.image_base64}'
                                }
                            }
                        ]
                    }
                ],
                'max_tokens': 10,
                'temperature': 0.1
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': f'OpenAI API error: {response.text}'}),
                'isBase64Encoded': False
            }
        
        result = response.json()
        category_text = result['choices'][0]['message']['content'].strip().lower()
        
        if 'portrait' in category_text:
            category = 'portrait'
        elif 'car' in category_text:
            category = 'car'
        elif 'apartment' in category_text:
            category = 'apartment'
        else:
            category = 'unknown'
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'category': category,
                'confidence': 0.9
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
