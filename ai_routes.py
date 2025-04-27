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
    # system_prompt = (
    #     "You are a Socratic AI tutor for concept mapping. "
    #     "Your goal is to enable constructivist learning by asking a targeted, stimulating question or prompt."
    #     "Your question should challenge or aim to expand the users current understanding as defined by the concept map."
    #     "Do not spontaneously give direct information unless the user asks you a question, in which case you should answer it in full."
    #     "Never directly reference the concept map or suggest changes to it, use it as a window into the user's understanding. "
    #     "Keep the conversation back-and-forth and focused on deepening understanding. "
    #     "If the user doesn't understand your question, get at the same idea in a whole new way."
    #     "Always keep your message concise and focused."
    # )
    system_prompt = (
        "Your goal is to get the user to connect with their existing understanding of the subject by adding nodes to the concept map."
        "Try not to give too much direct information, in order to make it feel more like a conversation."
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