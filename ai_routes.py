from flask import Blueprint, request, jsonify
import openai
import json
import os
import tempfile
from werkzeug.utils import secure_filename

import urllib.request
import urllib.error
import urllib.parse
from db_init import db
from firebase_admin import firestore

# Load OpenAI API key from api_keys.json
with open('api_keys.json') as f:
    api_keys = json.load(f)
OPENAI_API_KEY = api_keys.get('OpenAiAPIKey') or os.environ.get('OPENAI_API_KEY')

# Only initialize the OpenAI client if we have an API key
client = None
if OPENAI_API_KEY:
    client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Add a helper function to check if AI features are available
def is_ai_available():
    return client is not None

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
    # Check if AI features are available
    if not is_ai_available():
        return jsonify({"message": "AI features are currently unavailable. Please set up your OpenAI API key."}), 503
        
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

@ai_bp.route('/voice_to_nodes', methods=['POST'])
def voice_to_nodes():
    """
    Process voice recording and existing tree state to generate new nodes.
    
    Expects:
      - audio file uploaded as 'audio'
      - tree_state: JSON string with current nodes, edges, and view information
      
    Returns:
      - JSON with nodes to create and edges to establish
    """
    # Check if AI features are available
    if not is_ai_available():
        return jsonify({"error": "AI features are currently unavailable. Please set up your OpenAI API key."}), 503
        
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "Empty audio file name"}), 400
        
        # Get tree state
        tree_state_json = request.form.get('tree_state')
        if not tree_state_json:
            return jsonify({"error": "No tree state provided"}), 400
        
        tree_state = json.loads(tree_state_json)
        
        # Save audio file temporarily
        audio_filename = secure_filename(audio_file.filename)
        temp_dir = tempfile.mkdtemp()
        temp_audio_path = os.path.join(temp_dir, audio_filename)
        audio_file.save(temp_audio_path)
        
        # Transcribe audio using OpenAI Whisper
        with open(temp_audio_path, "rb") as audio_data:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_data
            )
        
        transcript = transcript_response.text
        
        # Define function for structured output
        functions = [
            {
                "name": "generate_nodes",
                "description": "Generate nodes and connections based on the transcript and current tree state",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "nodes": {
                            "type": "array",
                            "description": "List of nodes to create",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {
                                        "type": "string",
                                        "description": "Unique identifier for the node"
                                    },
                                    "type": {
                                        "type": "string",
                                        "description": "Type of the node (motivator, task, challenge, idea, class, assignment, test, project, essay)",
                                        "enum": ["motivator", "task", "challenge", "idea", "class", "assignment", "test", "project", "essay"]
                                    },
                                    "title": {
                                        "type": "string",
                                        "description": "Title/content of the node"
                                    },
                                    
                                    "position": {
                                        "type": "object",
                                        "description": "Position of the node (can't be on top of existing or newly created nodes)",
                                        "properties": {
                                            "x": {"type": "number"},
                                            "y": {"type": "number"}
                                        }
                                    }
                                },
                                "required": ["id", "type", "title"]
                            }
                        },
                        "edges": {
                            "type": "array",
                            "description": "Connections between nodes",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "from": {
                                        "type": "string",
                                        "description": "ID of the source node"
                                    },
                                    "to": {
                                        "type": "string",
                                        "description": "ID of the target node"
                                    }
                                },
                                "required": ["from", "to"]
                            }
                        }
                    },
                    "required": ["nodes"]
                }
            }
        ]

        # Create system prompt
        system_prompt = (
            "You are an AI assistant that aims to contextualize the user's existing concept map based on their new thoughts and ideas."
            "You will be given a transcript of the user speaking, and a current concept map."
            "Your job is to generate new nodes and edges that connect to the existing nodes in the concept map."
            "The concept map is a lens for you to understand the user. Use these nodes to store new information."
            "The nodes you add should primarily be idea nodes centered around, and contextualizing, motivator, challenge, and project nodes."
            "If the user explicitly wants to add a new motivator, challenge, or project node, do so. Otherwise, only add idea nodes that help contextualize the existing nodes."
            "The goal of the concept map is to help the user understand their own thinking and learning. Use the concept map as a lens to understand the user's new thoughts and ideas."
        )
        
        # Prepare messages for OpenAI
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the current tree state: {json.dumps(tree_state)}"},
            {"role": "user", "content": (
                f"I just recorded the following speech: '{transcript}'. "
            )}
        ]
        
        # Call OpenAI API with function calling
        response = client.chat.completions.create(
            model="gpt-4.1-mini",  # Using GPT-4 for better comprehension
            messages=messages,
            functions=functions,
            function_call={"name": "generate_nodes"},
            temperature=0.7
        )
        
        # Extract function call result
        function_args = json.loads(response.choices[0].message.function_call.arguments)
        
        # Clean up temporary files
        os.remove(temp_audio_path)
        os.rmdir(temp_dir)
        
        return jsonify(function_args)
        
    except Exception as e:
        print(f"Error in voice_to_nodes: {str(e)}")
        return jsonify({"error": str(e)}), 500 

@ai_bp.route('/analyze_onboarding', methods=['POST'])
def analyze_onboarding():
    """
    Process onboarding responses to generate personalized recommendations.
    
    Expects JSON with:
      - responses: array of user's answers to onboarding questions
    
    Returns:
      - cards: array of personalized recommendation cards
    """
    # Check if AI features are available
    if not is_ai_available():
        return jsonify({"error": "AI features are currently unavailable. Please set up your OpenAI API key."}), 503
        
    try:
        data = request.get_json()
        responses = data.get('responses', [])
        print(responses)
        
        if not responses or len(responses) < 6:
            return jsonify({"error": "Incomplete responses"}), 400
        
        # Extract individual responses
        academic_success = responses[1] if len(responses) > 1 else ""
        motivation = responses[2] if len(responses) > 2 else ""
        challenges = responses[3] if len(responses) > 3 else ""
        learning_style = responses[4] if len(responses) > 4 else ""
        accountability = responses[5] if len(responses) > 5 else ""
        
        # Create system prompt
        system_prompt = (
            "You are an AI assistant analyzing a student's onboarding responses for SciWeb, "
            "a platform that helps users build a knowledge web of their academic journey. "
            "Based on their responses about academic success, motivation, challenges, learning style, "
            "and desired accountability, generate 5 personalized, inspiring cards (title and content) "
            "that explain how SciWeb's features align with their needs. "
            "Each card should be insightful and specific to their responses, not generic. "
            "Use an uplifting, encouraging tone that builds anticipation for using the platform."
        )
        
        # User prompt with responses
        user_prompt = f"""
        Here are the user's responses to SciWeb's onboarding questions:
        
        1. Academic success definition: "{academic_success}"
        2. Motivation: "{motivation}"
        3. Challenges: "{challenges}"
        4. Learning style: "{learning_style}"
        5. Desired accountability: "{accountability}"
        
        Based on these responses, generate 5 personalized cards with a title and content that show how 
        SciWeb's features will specifically help this user. Each card should have:
        1. A title (5-7 words)
        2. Content (40-80 words)
        3. A suggested emoji icon that represents the card's theme
        
        Format your response as a JSON array of cards, with each card having 'title', 'content', and 'icon' fields.
        """
        
        # Define function for structured output
        functions = [
            {
                "name": "generate_personalized_cards",
                "description": "Generate personalized cards based on the user's onboarding responses",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "cards": {
                            "type": "array",
                            "description": "Array of personalized cards",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {
                                        "type": "string",
                                        "description": "Title of the card"
                                    },
                                    "content": {
                                        "type": "string",
                                        "description": "Content of the card"
                                    },
                                    "icon": {
                                        "type": "string",
                                        "description": "Emoji icon for the card"
                                    }
                                },
                                "required": ["title", "content", "icon"]
                            }
                        }
                    },
                    "required": ["cards"]
                }
            }
        ]
        
        # Call OpenAI API with function calling
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=messages,
            functions=functions,
            function_call={"name": "generate_personalized_cards"},
            temperature=0.7
        )
        
        # Extract and return the generated cards
        function_args = json.loads(response.choices[0].message.function_call.arguments)
        return jsonify(function_args)
        
    except Exception as e:
        print(f"Error in analyze_onboarding: {str(e)}")
        return jsonify({"error": str(e)}), 500 

@ai_bp.route('/fetch_jupiter_data', methods=['POST'])
def fetch_jupiter_data():
    data = request.get_json()
    osis = data.get('osis')
    password = data.get('password')
    if not osis or not password:
        return jsonify({"error": "Missing credentials"}), 400
    # Attempt to fetch from remote Jupiter API; fallback to sample.txt if it fails
    # URL-encode credentials to safely include spaces and special characters
    params = urllib.parse.urlencode({'osis': osis, 'password': password})
    cloud_run_url = f'https://jupiterapi-xz43fty7fq-pd.a.run.app/fetchData?{params}'
    try:
        with urllib.request.urlopen(cloud_run_url) as resp:
            resp_data = resp.read().decode('utf-8')
        result = json.loads(resp_data)
    except Exception as e:
        print(f"fetch_jupiter_data: remote fetch error: {e}, falling back to sample.txt")
        try:
            # Load sample response for local development
            with open('sample.txt') as f:
                result = json.load(f)
        except Exception as e2:
            print(f"fetch_jupiter_data: sample.txt load error: {e2}")
            return jsonify({"error": "Failed to fetch Jupiter data", "details": str(e2)}), 500
    nested_str = result.get('data')
    if not nested_str:
        return jsonify({"error": "Malformed response from Jupiter API"}), 500
    nested = json.loads(nested_str)
    courses = nested.get('courses', [])
    classes_list = []
    for c in courses:
        name = c.get('name')
        teacher = c.get('teacher')
        schedule = c.get('schedule', '')
        period = schedule.split(',')[0] if ',' in schedule else schedule
        classes_list.append({"name": name, "teacher": teacher, "period": period})
    return jsonify({"classes": classes_list}) 

@ai_bp.route('/initialize_tree', methods=['POST'])
def initialize_tree():
    data = request.get_json()
    user_id = data.get('userId')
    responses = data.get('responses')
    classes = data.get('classes')
    if not user_id or not isinstance(responses, list) or classes is None:
        return jsonify({"error": "Missing initialization data"}), 400
    # Load platform plan for context
    try:
        with open('SciWebPlan31.md') as f:
            plan_content = f.read()
    except Exception:
        plan_content = ""
    system_prompt = (
        f"Use the platform plan for context:\n{plan_content}\n"
        "Generate initial nodes and edges for a new knowledge web. "
        "Include motivation nodes based on user's responses, "
        "challenge nodes if any obstacles were mentioned, "
        "and class nodes for each class. "
        "Each node must have an 'id', 'type', 'title', optional 'content', and 'position' with 'x' and 'y'. "
        "Return JSON via function 'generate_initial_tree'."
    )
    functions = [
        {
            "name": "generate_initial_tree",
            "description": "Generate initial nodes and edges for a new user's knowledge web",
            "parameters": {
                "type": "object",
                "properties": {
                    "nodes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "type": {"type": "string"},
                                "title": {"type": "string"},
                                "content": {"type": "string"},
                                "position": {
                                    "type": "object",
                                    "properties": {
                                        "x": {"type": "number"},
                                        "y": {"type": "number"}
                                    },
                                    "required": ["x", "y"]
                                }
                            },
                            "required": ["id", "type", "title", "position"]
                        }
                    },
                    "edges": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "from": {"type": "string"},
                                "to": {"type": "string"}
                            },
                            "required": ["from", "to"]
                        }
                    }
                },
                "required": ["nodes"]
            }
        }
    ]
    # Call OpenAI to generate the tree
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User responses: {json.dumps(responses)}"},
            {"role": "user", "content": f"User classes: {json.dumps(classes)}"}
        ]
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            functions=functions,
            function_call={"name": "generate_initial_tree"},
            temperature=0.7
        )
        tree_args = json.loads(response.choices[0].message.function_call.arguments)
        nodes = tree_args.get("nodes", [])
        edges = tree_args.get("edges", [])
    except Exception as e:
        print(f"initialize_tree AI error: {e}")
        return jsonify({"error": str(e)}), 500
    # Save to Firestore
    try:
        doc_ref = db.collection("Trees").document()
        tree_data = {
            "userId": user_id,
            "nodes": nodes,
            "edges": edges,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(tree_data)
        print(f"initialize_tree: tree_data: {tree_data}")
    except Exception as e:
        print(f"initialize_tree DB error: {e}")
        return jsonify({"error": "Failed to save tree", "details": str(e)}), 500
    return jsonify({"id": doc_ref.id, "nodes": nodes, "edges": edges}), 201 

@ai_bp.route('/get_realtime_token', methods=['POST'])
def get_realtime_token():
    """
    Generate a token for OpenAI's Realtime API WebRTC connection.
    
    Returns:
        - token: Bearer token for Realtime API
        - peer_id: ID for WebRTC connection
    """
    try:
        import requests
        import logging

        # Get the model to use for realtime API
        model = "gpt-4o-mini-realtime-preview"  # Use the correct model name
        
        logging.info(f"Requesting OpenAI Realtime token for model: {model}")
        
        # Make request to OpenAI API to get a WebRTC token using the updated endpoint
        response = requests.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
                "OpenAI-Beta": "realtime=v1"
            },
            json={
                "model": model,
                "voice": "alloy"  # Default voice option
            }
        )
        
        logging.info(f"OpenAI Realtime token response status: {response.status_code}")
        
        if response.status_code != 200:
            logging.error(f"Failed to get OpenAI token: {response.text}")
            raise Exception(f"Failed to get token: {response.text}")
        
        token_data = response.json()
        
        # Extract token from the new response format
        # Debug the actual response structure
        print(f"Response data structure: {json.dumps(token_data, indent=2)}")
        
        # Check if client_secret is a dictionary with a value field
        if isinstance(token_data.get("client_secret"), dict) and "value" in token_data["client_secret"]:
            token = token_data["client_secret"]["value"]
        else:
            # Fallback in case structure is different
            token = token_data.get("client_secret", "")
            
        # The peer_id might not be present in newer API versions
        # Just return the token which is sufficient for WebRTC connection
        return jsonify({
            "token": token
        })
    except Exception as e:
        print(f"Error generating realtime token: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ai_bp.route('/get_openai_key', methods=['GET'])
def get_openai_key():
    """
    Provide the OpenAI API key to authorized clients.
    This is needed since browsers can't set headers for WebSocket connections.
    
    WARNING: In a production environment, you should use a more secure method
    such as generating short-lived tokens with limited scopes.
    
    Returns:
        - key: OpenAI API key 
    """
    try:
        # In a real production system, this should use proper auth
        # and generate a limited scope/time token
        return jsonify({
            "key": OPENAI_API_KEY
        })
    except Exception as e:
        print(f"Error providing API key: {str(e)}")
        return jsonify({"error": str(e)}), 500 