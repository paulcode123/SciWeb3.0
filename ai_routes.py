from flask import Blueprint, request, jsonify
import openai
import json
import os

# Load OpenAI API key from api_keys.json
with open('api_keys.json') as f:
    api_keys = json.load(f)
OPENAI_API_KEY = api_keys.get('OpenAiAPIKey')

# Use the new OpenAI client (openai>=1.0.0)
client = openai.OpenAI(api_key=OPENAI_API_KEY)

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/challenge', methods=['POST'])
def challenge_user():
    """
    Expects JSON with:
      - chat_history: list of dicts with 'role' ('user' or 'assistant') and 'content' (last 5 messages)
      - concept_map: list of nodes and edges (user's current map/tree structure)
      - subject: string (optional, for context)
    Returns:
      - message: a single AI-generated Socratic, constructivist message (plain text)
    """
    data = request.get_json()
    chat_history = data.get('chat_history', [])
    concept_map = data.get('concept_map', [])
    subject = data.get('subject', '')

    # Compose system prompt
    system_prompt = (
        "You are a Socratic AI tutor for concept mapping. "
        "Your goal is to enable constructivist learning by asking targeted, stimulating questions or prompts, "
        "but never more than one question at a time. "
        "Base your response on the user's current concept map and the ongoing conversation. "
        "Do not provide direct answers unless the user is truly stuck. "
        "Encourage the user to make new connections or reflect on their understanding. "
        "Keep the conversation back-and-forth and focused on deepening understanding. "
        "If the user seems lost, offer a gentle nudge or hint, not a full answer. "
        "Always keep your message concise and focused."
    )

    # Build messages for OpenAI
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"The current concept map/tree structure for the subject '{subject}' is: {concept_map}"}
    ]
    # Add the last 5 chat messages (in order)
    for msg in chat_history[-5:]:
        if msg.get('role') in ('user', 'assistant') and msg.get('content'):
            messages.append({"role": msg['role'], "content": msg['content']})

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            max_tokens=300,
            temperature=0.7
        )
        ai_content = response.choices[0].message.content
        return jsonify({"message": ai_content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500 