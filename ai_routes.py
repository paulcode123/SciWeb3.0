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
with open('api_keys1.json') as f:
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

@ai_bp.route('/pull_grades', methods=['POST'])
def pull_grades():
    data = request.get_json()
    osis = data.get('osis')
    password = data.get('password')
    class_id = data.get('classId')
    if not osis or not password or not class_id:
        return jsonify({'error': 'Missing credentials or class ID'}), 400
    # Fetch Jupiter data (reuse fetch_jupiter_data logic)
    params = urllib.parse.urlencode({'osis': osis, 'password': password})
    cloud_run_url = f'https://jupiterapi-xz43fty7fq-pd.a.run.app/fetchData?{params}'
    try:
        with urllib.request.urlopen(cloud_run_url) as resp:
            resp_data = resp.read().decode('utf-8')
        result = json.loads(resp_data)
    except Exception as e:
        print(f"pull_grades: remote fetch error: {e}, falling back to sample.txt")
        try:
            with open('sample.txt') as f:
                result = json.load(f)
        except Exception as e2:
            print(f"pull_grades: sample.txt load error: {e2}")
            return jsonify({'error': 'Failed to fetch Jupiter data', 'details': str(e2)}), 500
    nested_str = result.get('data')
    if not nested_str:
        return jsonify({'error': 'Malformed response from Jupiter API'}), 500
    nested = json.loads(nested_str)
    courses = nested.get('courses', [])
    # Find the course matching the classId (by name or other logic)
    course = None
    for c in courses:
        # Try to match by name (case-insensitive, substring)
        if class_id.lower() in (c.get('name', '').lower()):
            course = c
            break
    if not course:
        # fallback: just use the first course
        course = courses[0] if courses else None
    if not course:
        return jsonify({'error': 'No matching course found.'}), 404
    # Process grade data for this course
    grade = course.get('grade')
    grade_percent = round(float(grade), 2) if grade is not None else None
    # Recent scores (last 5 graded assignments)
    assignments = course.get('assignments', [])
    recent_scores = []
    for a in assignments:
        if a.get('graded') and a.get('score') is not None:
            recent_scores.append({
                'name': a.get('name'),
                'score': f"{a.get('score')}/{a.get('points')}"
            })
        if len(recent_scores) >= 5:
            break
    # Time distribution (by assignment category)
    time_labels = []
    time_data = []
    cat_map = {}
    for a in assignments:
        cat = a.get('category', 'Other')
        cat_map.setdefault(cat, 0)
        cat_map[cat] += 1
    for k, v in cat_map.items():
        time_labels.append(k)
        time_data.append(v)
    time_distribution = {
        'labels': time_labels,
        'data': time_data
    }
    # Score timeline (line chart: x=due date or name, y=percent score, sorted by date)
    timeline = []
    for a in assignments:
        if a.get('graded') and a.get('score') is not None and a.get('points'):
            label = a.get('due') or a.get('name')
            try:
                pct = round(float(a['score']) / float(a['points']) * 100, 2)
            except Exception:
                pct = None
            timeline.append({
                'label': label,
                'date': a.get('due'),
                'pct': pct
            })
    # Sort by date if possible, else by order
    from datetime import datetime
    def parse_date(d):
        try:
            return datetime.strptime(d, '%m/%d')
        except Exception:
            return None
    def timeline_sort_key(x):
        dt = parse_date(x['date'])
        if dt:
            return (0, dt)
        else:
            return (1, x['label'].lower() if x['label'] else '')
    timeline.sort(key=timeline_sort_key)
    score_timeline = {
        'labels': [x['label'] for x in timeline],
        'data': [x['pct'] for x in timeline]
    }
    # Assignment completion rate (pie: completed vs missing)
    completed = 0
    missing = 0
    for a in assignments:
        if a.get('graded'):
            completed += 1
        else:
            missing += 1
    completion_rate = {
        'labels': ['Completed', 'Missing'],
        'data': [completed, missing]
    }
    return jsonify({
        'currentGrade': grade,
        'currentGradePercent': grade_percent,
        'recentScores': recent_scores,
        'timeDistribution': time_distribution,
        'scoreTimeline': score_timeline,
        'completionRate': completion_rate
    }) 

@ai_bp.route('/process_learning_objective_audio', methods=['POST'])
def process_learning_objective_audio():
    """
    Process audio recording for learning objective mode.
    Uses GPT-4o direct audio processing to extract correct ideas and generate follow-up questions.
    
    Expects:
      - audio file uploaded as 'audio'
      - learning_objective: JSON string with learning objective node data
      - connected_nodes: JSON string with nodes connected to the learning objective
      
    Returns:
      - JSON with correct ideas as nodes and follow-up questions
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
        
        # Get learning objective and connected nodes context
        learning_objective_json = request.form.get('learning_objective')
        connected_nodes_json = request.form.get('connected_nodes')
        
        if not learning_objective_json:
            return jsonify({"error": "No learning objective provided"}), 400
        
        learning_objective = json.loads(learning_objective_json)
        connected_nodes = json.loads(connected_nodes_json) if connected_nodes_json else []
        
        # Save audio file temporarily
        audio_filename = secure_filename(audio_file.filename)
        temp_dir = tempfile.mkdtemp()
        temp_audio_path = os.path.join(temp_dir, audio_filename)
        audio_file.save(temp_audio_path)
        
        try:
            # Step 1: Transcribe audio using Whisper (accepts many formats including WebM)
            print(f"Transcribing audio file: {audio_filename}")
            with open(temp_audio_path, "rb") as audio_data:
                transcript_response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_data
                )
            
            transcript = transcript_response.text
            print(f"Transcription successful: {transcript[:100]}...")
            
            if not transcript or len(transcript.strip()) < 5:
                raise Exception("Transcription was too short or empty. Please speak more clearly.")
            
            # Step 2: Use GPT-4 to analyze the transcript
            # Create system prompt for learning objective processing
            system_prompt = (
                f"You are a Socratic tutor analyzing a student's spoken response about the learning objective: '{learning_objective.get('title', 'Unknown')}'. "
                f"Connected concepts already on the map: {[node.get('title', '') for node in connected_nodes]}. "
                
                "Your tasks: "
                "1. Extract all CORRECT and RELEVANT ideas from the student's speech that advance understanding of the learning objective. "
                "2. Generate 1-2 follow-up questions that challenge or expand their understanding. "
                "3. Do NOT include incorrect information or tangential ideas. "
                "4. Focus on building conceptual understanding, not just facts. "
                
                "For each correct idea, determine if it should connect to: "
                "- The main learning objective (if it directly relates to the core concept) "
                "- Specific connected nodes (if it builds on or relates to existing concepts) "
                "- Both (if it bridges concepts) "
                
                "Return your analysis using the provided function."
            )
            
            # Prepare context message about the learning scenario
            context_message = (
                f"Learning Objective: {learning_objective.get('title', 'Unknown')}\n"
                f"Objective Description: {learning_objective.get('content', 'No description')}\n"
                f"Connected Concepts: {', '.join([node.get('title', '') for node in connected_nodes])}\n\n"
                f"Student's spoken response: \"{transcript}\"\n\n"
                "Please analyze this response and extract correct ideas and generate follow-up questions."
            )
            
            # Define function for structured output
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "analyze_learning_objective_response",
                        "description": "Analyze student's spoken response and generate nodes and questions for learning objective",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "correct_ideas": {
                                    "type": "array",
                                    "description": "Correct and relevant ideas extracted from the speech",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "id": {
                                                "type": "string",
                                                "description": "Unique identifier for the idea node"
                                            },
                                            "title": {
                                                "type": "string",
                                                "description": "Clear, concise title for the idea"
                                            },
                                            "content": {
                                                "type": "string",
                                                "description": "Optional additional context or explanation"
                                            },
                                            "node_type": {
                                                "type": "string",
                                                "description": "Type of node",
                                                "enum": ["keyidea", "concept", "example", "connection"]
                                            },
                                            "connections": {
                                                "type": "array",
                                                "description": "IDs of nodes this idea should connect to",
                                                "items": {"type": "string"}
                                            },
                                            "position_relative_to": {
                                                "type": "string",
                                                "description": "ID of node to position this near (usually learning objective or related node)"
                                            }
                                        },
                                        "required": ["id", "title", "node_type", "connections"]
                                    }
                                },
                                "follow_up_questions": {
                                    "type": "array",
                                    "description": "Socratic questions to challenge or expand understanding",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "id": {
                                                "type": "string",
                                                "description": "Unique identifier for the question node"
                                            },
                                            "question": {
                                                "type": "string",
                                                "description": "The follow-up question"
                                            },
                                            "purpose": {
                                                "type": "string",
                                                "description": "Why this question advances learning"
                                            },
                                            "connections": {
                                                "type": "array",
                                                "description": "IDs of nodes this question relates to",
                                                "items": {"type": "string"}
                                            },
                                            "position_relative_to": {
                                                "type": "string",
                                                "description": "ID of node to position this near"
                                            }
                                        },
                                        "required": ["id", "question", "connections"]
                                    }
                                },
                                "audio_transcript": {
                                    "type": "string",
                                    "description": "What the student said (for reference)"
                                }
                            },
                            "required": ["correct_ideas", "follow_up_questions", "audio_transcript"]
                        }
                    }
                }
            ]
            
            # Call GPT-4 with the transcript
            response = client.chat.completions.create(
                model="gpt-4.1-mini",  # Use regular GPT-4 since we're using text input now
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context_message}
                ],
                tools=tools,
                tool_choice={"type": "function", "function": {"name": "analyze_learning_objective_response"}},
                temperature=0.7
            )
            
            # Extract function call result
            tool_call = response.choices[0].message.tool_calls[0]
            function_args = json.loads(tool_call.function.arguments)
            
            # Add the original transcript to the response if not already included
            if 'audio_transcript' not in function_args:
                function_args['audio_transcript'] = transcript
            
        except Exception as processing_error:
            print(f"Error during transcription or analysis: {processing_error}")
            raise processing_error
        
        finally:
            # Clean up temporary files
            try:
                os.remove(temp_audio_path)
                os.rmdir(temp_dir)
            except Exception as cleanup_error:
                print(f"Error cleaning up files: {cleanup_error}")
        
        return jsonify(function_args)
        
    except Exception as e:
        print(f"Error in process_learning_objective_audio: {str(e)}")
        # Clean up temp files if they exist
        try:
            if 'temp_audio_path' in locals():
                os.remove(temp_audio_path)
            if 'temp_dir' in locals():
                os.rmdir(temp_dir)
        except:
            pass
        return jsonify({"error": str(e)}), 500


@ai_bp.route('/analyze_conversation', methods=['POST'])
def analyze_conversation():
    """
    Analyze a conversation between user and AI to suggest relevant nodes for the concept map.
    
    Expects JSON with:
      - node_data: Information about the node that triggered the conversation
      - feature_type: Type of feature (breakdown, ai-assist, analyze, etc.)
      - connected_nodes: Nodes connected to the original node
      - map_state: Current state of the concept map
      - conversation_history: Recent conversation messages
      - latest_exchange: The most recent AI response and user response
      
    Returns:
      - suggested_nodes: Array of nodes to create based on the conversation
    """
    # Check if AI features are available
    if not is_ai_available():
        return jsonify({"error": "AI features are currently unavailable. Please set up your OpenAI API key."}), 503
        
    try:
        data = request.get_json()
        
        node_data = data.get('node_data', {})
        analysis_type = data.get('analysis_type', 'node_feature')  # 'node_feature' or 'learning_objective'
        feature_type = data.get('feature_type', '')
        connected_nodes = data.get('connected_nodes', [])
        map_state = data.get('map_state', {})
        conversation_history = data.get('conversation_history', [])
        analysis_context = data.get('analysis_context', {})
        
        if not node_data or not conversation_history:
            return jsonify({"error": "Missing required conversation data"}), 400
            
        # For node features, feature_type is required
        if analysis_type == 'node_feature' and not feature_type:
            return jsonify({"error": "Missing feature_type for node feature analysis"}), 400
        
        # Create context-specific system prompt based on analysis type
        if analysis_type == 'learning_objective':
            conversation_context = f"The user is exploring their understanding of the learning objective: '{node_data.get('title', '')}'. Based on the conversation, identify what they know well (create 'keyidea' nodes) and what they need to learn more about (create 'question' nodes)."
        else:
            # Node feature contexts
            feature_contexts = {
                'breakdown': f"The user is working on breaking down the {node_data.get('type', 'item')}: '{node_data.get('title', '')}'. Look for concrete tasks, steps, or sub-components they mention that could become separate nodes.",
                'ai-assist': f"The user needs help with: '{node_data.get('title', '')}'. Look for challenges, resources, approaches, or specific assistance they need that could become actionable nodes.",
                'analyze': f"The user is analyzing the challenge: '{node_data.get('title', '')}'. Look for problem components, root causes, constraints, or analytical insights that could become nodes.",
                'expand': f"The user is expanding on the idea: '{node_data.get('title', '')}'. Look for related concepts, applications, implications, or extensions they mention.",
                'study-plan': f"The user is creating a study plan for: '{node_data.get('title', '')}'. Look for learning objectives, study methods, resources, or milestones they mention.",
                'resources': f"The user is seeking resources for: '{node_data.get('title', '')}'. Look for specific tools, materials, people, or information sources they mention or need.",
                'envision': f"The user is envisioning success with: '{node_data.get('title', '')}'. Look for goals, outcomes, motivations, or success metrics they express.",
                'progress': f"The user is tracking progress on: '{node_data.get('title', '')}'. Look for milestones, achievements, next steps, or progress indicators they mention."
            }
            conversation_context = feature_contexts.get(feature_type, f"The user is working with: '{node_data.get('title', '')}'.")
        
        # Get comprehensive map context
        all_nodes = map_state.get('all_nodes', [])
        all_edges = map_state.get('all_edges', [])
        total_nodes = map_state.get('total_nodes', 0)
        
        existing_titles = [node.get('title', '') for node in all_nodes]
        turns_since_analysis = analysis_context.get('turns_since_last_analysis', 0)
        
        system_prompt = (
            f"You are analyzing a conversation between a user and an AI assistant about a concept map node. "
            f"{conversation_context}\n\n"
            
            f"CONVERSATION CONTEXT:\n"
            f"- Original node: {node_data.get('title', '')} (Type: {node_data.get('type', 'unknown')})\n"
            f"- Directly connected: {', '.join([node.get('title', '') for node in connected_nodes])}\n"
            f"- Total nodes in map: {total_nodes}\n"
            f"- Conversation turns since last analysis: {turns_since_analysis}\n\n"
            
            f"EXISTING MAP STRUCTURE:\n"
            f"Current nodes: {', '.join(existing_titles[:20])}{'...' if len(existing_titles) > 20 else ''}\n"
            f"Relationships: {len(all_edges)} connections between nodes\n\n"
            
            "ANALYSIS INSTRUCTIONS:\n"
            "You are being selective and thoughtful. Only suggest nodes for substantial, concrete concepts that:\n"
            "1. The user explicitly mentioned or clearly discussed in detail\n"
            "2. Are NOT already covered by existing nodes (avoid duplicates)\n"
            "3. Would meaningfully advance their understanding or organization\n"
            "4. Represent actionable steps, important concepts, or key relationships\n\n"
            
            "QUALITY OVER QUANTITY: It's better to suggest 0-2 high-quality, necessary nodes than to spam with minor details.\n"
            "Consider whether existing nodes could be UPDATED instead of creating new ones.\n\n"
            
            f"{'LEARNING OBJECTIVE FOCUS:' if analysis_type == 'learning_objective' else 'GENERAL FOCUS:'}\n"
            f"{'- Create keyidea nodes for concepts the student clearly understands and can explain well' if analysis_type == 'learning_objective' else '- What new insights or concrete steps emerged from the conversation?'}\n"
            f"{'- Create question nodes for areas where they show uncertainty, gaps, or need to learn more' if analysis_type == 'learning_objective' else '- What important concepts are missing from their current map?'}\n"
            f"{'- Look for misconceptions that could be clarified through follow-up questions' if analysis_type == 'learning_objective' else '- What would genuinely help organize their thinking about this topic?'}\n"
            f"{'- Identify prerequisite knowledge they may be missing' if analysis_type == 'learning_objective' else '- What specific next actions or sub-components became clear?'}"
        )
        
        # Prepare comprehensive conversation context
        conversation_text = f"FULL CONVERSATION ({len(conversation_history)} messages):\n\n"
        
        for i, msg in enumerate(conversation_history):
            role = "User" if msg['role'] == 'user' else "AI Assistant"
            conversation_text += f"{i+1}. {role}: {msg['message']}\n\n"
        
        conversation_text += f"\nANALYSIS FOCUS: Look for concrete concepts, tasks, or insights that emerged from this conversation that would benefit from being represented as nodes on the concept map."
        
        # Define function for structured output
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "suggest_concept_nodes",
                    "description": "Suggest nodes to add to the concept map based on the conversation",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "suggested_nodes": {
                                "type": "array",
                                "description": "Nodes to create based on the conversation - BE SELECTIVE, only suggest meaningful additions",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "action": {
                                            "type": "string",
                                            "description": "What to do with this node",
                                            "enum": ["create", "update"]
                                        },
                                        "node_id": {
                                            "type": "string",
                                            "description": "For update actions: ID of existing node to modify"
                                        },
                                        "title": {
                                            "type": "string",
                                            "description": "Clear, concise title for the node"
                                        },
                                        "content": {
                                            "type": "string",
                                            "description": "Optional additional context or description"
                                        },
                                        "node_type": {
                                            "type": "string",
                                            "description": "Type of node based on content",
                                            "enum": ["task", "idea", "challenge", "question", "resource", "goal", "concept", "step", "keyidea"]
                                        },
                                        "connections": {
                                            "type": "array",
                                            "description": "IDs of existing nodes this should connect to",
                                            "items": {"type": "string"}
                                        },
                                        "reasoning": {
                                            "type": "string",
                                            "description": "Why this node should be created/updated based on the conversation"
                                        }
                                    },
                                    "required": ["action", "title", "node_type", "reasoning"]
                                }
                            },
                            "analysis_summary": {
                                "type": "string",
                                "description": "Brief summary of the key insights from the conversation"
                            }
                        },
                        "required": ["suggested_nodes"]
                    }
                }
            }
        ]
        
        # Call GPT-4 to analyze the conversation
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": conversation_text}
            ],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "suggest_concept_nodes"}},
            temperature=0.3  # Lower temperature for more focused analysis
        )
        
        # Extract function call result
        tool_call = response.choices[0].message.tool_calls[0]
        function_args = json.loads(tool_call.function.arguments)
        
        # Add the original node ID to connections if not specified
        for node in function_args.get('suggested_nodes', []):
            if not node.get('connections'):
                node['connections'] = [node_data.get('id')]
        
        print(f"Conversation analysis for {feature_type}: {len(function_args.get('suggested_nodes', []))} nodes suggested")
        
        return jsonify(function_args)
        
    except Exception as e:
        print(f"Error in analyze_conversation: {str(e)}")
        return jsonify({"error": str(e)}), 500


 