from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
import smtplib
from flask import Blueprint, request, jsonify, session
import firebase_admin
from firebase_admin import credentials, firestore, storage
from datetime import datetime, timedelta

from urllib.parse import urlparse, parse_qs

# Try to import from our initialization module
try:
    from db_init import db, is_firebase_available
except ImportError:
    # Fall back to a local initialization if import fails
    is_firebase_available = lambda: False
    db = None

# Get Firebase Storage bucket if Firebase is available
bucket = None
if is_firebase_available():
    try:
        bucket = storage.bucket('sciweb-files')
    except Exception as e:
        print(f"Error getting Firebase Storage bucket: {str(e)}")

firebase_routes = Blueprint('firebase_routes', __name__)

# Helper to check Firebase availability for routes
def firebase_required(f):
    def decorated_function(*args, **kwargs):
        if not is_firebase_available():
            return jsonify({"error": "Firebase functionality is not available. Please set up your service_key3.json file."}), 503
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Helper to check authentication for routes
def login_required(f):
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@firebase_routes.route('/<collection>', methods=['GET'])
@firebase_required
def get_all(collection):
    """Get all documents from a collection"""
    try:
        docs = db.collection(collection).stream()
        items = [{doc.id: doc.to_dict()} for doc in docs]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/<collection>/<document_id>', methods=['GET'])
@firebase_required
def get_one(collection, document_id):
    """Get a specific document from a collection"""
    try:
        doc = db.collection(collection).document(document_id).get()
        if doc.exists:
            return jsonify({doc.id: doc.to_dict()}), 200
        return jsonify({"error": "Document not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/<collection>', methods=['POST'])
@firebase_required
def create(collection):
    """Create a new document in a collection"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Add timestamp if not provided
        if 'createdAt' not in data:
            data['createdAt'] = firestore.SERVER_TIMESTAMP
        if 'updatedAt' not in data:
             data['updatedAt'] = firestore.SERVER_TIMESTAMP
             
        # Add document with auto-generated ID
        doc_ref = db.collection(collection).document()
        doc_ref.set(data)
        
        return jsonify({"id": doc_ref.id, "message": "Document created successfully"}), 201
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/<collection>/<document_id>', methods=['PUT', 'PATCH'])
@firebase_required
def update(collection, document_id):
    """Update a document in a collection"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        doc_ref = db.collection(collection).document(document_id)
        doc = doc_ref.get()
        
        # For PATCH, only update specified fields if document exists
        # For PUT, replace entire document (or create if it doesn't exist)
        if not doc.exists:
            if request.method == 'PATCH':
                return jsonify({"error": "Document not found"}), 404
            else:
                # Create the document with the specified ID
                doc_ref.set(data)
                return jsonify({"message": "Document created successfully", "id": document_id}), 201
        
        # Document exists, update it
        if request.method == 'PATCH':
            doc_ref.update(data)
            message = "Document updated successfully"
        else:
            doc_ref.set(data)
            message = "Document replaced successfully"
        
        return jsonify({"message": message}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/<collection>/<document_id>', methods=['DELETE'])
@firebase_required
def delete(collection, document_id):
    """Delete a document from a collection"""
    try:
        doc_ref = db.collection(collection).document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"error": "Document not found"}), 404
        
        doc_ref.delete()
        return jsonify({"message": "Document deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Trees route for current logged-in user
@firebase_routes.route('/Trees', methods=['GET'])
@firebase_required
@login_required
def get_user_trees():
    """Get trees for the current logged-in user"""
    try:
        user_id = session.get('user_id')
        
        # Filter trees by session user_id only
        trees_ref = db.collection('Trees')
        query = trees_ref.where('userId', '==', user_id)
        docs = query.get()
        
        trees = []
        for doc in docs:
            tree_data = doc.to_dict()
            tree_data['id'] = doc.id
            trees.append(tree_data)
        
        return jsonify({'trees': trees})
        
    except Exception as e:
        print(f"Error fetching trees: {str(e)}")
        return jsonify({'error': 'Failed to fetch trees'}), 500

@firebase_routes.route('/profile-photo', methods=['POST'])
@firebase_required
def upload_profile_photo():
    """
    Upload a profile photo to Firebase Storage and update the user's profile
    """
    try:
        # Check if file is in the request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        # Get file and user ID
        file = request.files['file']
        user_id = request.form.get('userId')
        
        if not user_id:
            return jsonify({"error": "No user ID provided"}), 400
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        # Check file type (only allow images)
        if not file.content_type.startswith('image/'):
            return jsonify({"error": "Only image files are allowed"}), 400
        
        # Get user document to find old profilePicUrl
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        old_url = None
        if user_doc.exists:
            user_data = user_doc.to_dict()
            old_url = user_data.get('profilePicUrl')
        
        # Delete old profile photo from storage if it exists and is in our bucket
        if old_url and 'sciweb-files' in old_url:
            from urllib.parse import urlparse, unquote
            parsed = urlparse(old_url)
            # Extract the object path from the URL
            # Example: /v0/b/sciweb-files/o/profile_photos%2Fprofile_...png?alt=media
            path = parsed.path
            if '/o/' in path:
                encoded_blob_path = path.split('/o/')[1]
                # Remove any trailing parts like ?alt=media
                encoded_blob_path = encoded_blob_path.split('?')[0]
                blob_path_old = unquote(encoded_blob_path)
                old_blob = bucket.blob(blob_path_old)
                if old_blob.exists():
                    old_blob.delete()

        # Generate a unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"profile_{user_id}_{timestamp}.{file.filename.split('.')[-1]}"
        
        # Upload to Firebase Storage
        blob_path = f"profile_photos/{filename}"
        blob = bucket.blob(blob_path)
        
        # Set appropriate content type
        blob.upload_from_file(file, content_type=file.content_type)
        
        # Use Firebase Storage URL format
        import urllib.parse
        encoded_path = urllib.parse.quote(blob_path, safe='')
        url = f"https://firebasestorage.googleapis.com/v0/b/sciweb-files/o/{encoded_path}?alt=media"
        
        # Update user document with the profile picture URL
        user_ref.update({
            'profilePicUrl': url,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({"url": url, "success": True})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Current user profile endpoint
@firebase_routes.route('/profile', methods=['GET'])
@firebase_required
@login_required
def get_current_user_profile():
    """Get current user's profile data"""
    try:
        user_id = session.get('user_id')
        
        # Get user document
        user_doc = db.collection('Members').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Return the user data
        user_data = user_doc.to_dict()
        
        # Remove sensitive information
        if 'password' in user_data:
            del user_data['password']
        if 'verification_code' in user_data:
            del user_data['verification_code']
        
        return jsonify({"user": user_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# User profile related endpoints
@firebase_routes.route('/Members/<user_id>', methods=['GET'])
@firebase_required
def get_user_profile(user_id):
    """Get a user's profile data with settings"""
    try:
        # Get user document
        user_doc = db.collection('Members').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Return the user data
        user_data = user_doc.to_dict()
        
        # Remove sensitive information
        if 'password' in user_data:
            del user_data['password']
        if 'verification_code' in user_data:
            del user_data['verification_code']
        
        return jsonify({"user": user_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@firebase_routes.route('/profile', methods=['PATCH'])
@firebase_required
@login_required
def update_current_user_profile():
    """Update current user's profile data"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        user_id = session.get('user_id')
        
        # Get user document
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Update the user data
        user_ref.update(data)
        
        return jsonify({"message": "User profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Members/<user_id>', methods=['PATCH'])
def update_user_profile(user_id):
    """Update a user's profile data"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get user document
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Update the user data
        user_ref.update(data)
        
        return jsonify({"message": "User profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@firebase_routes.route('/classes', methods=['GET'])
@firebase_required
@login_required
def get_current_user_classes():
    """Get current user's classes"""
    try:
        user_id = session.get('user_id')
        
        # Get user document
        user_doc = db.collection('Members').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Get classes array from user data
        user_data = user_doc.to_dict()
        classes = user_data.get('classes', [])
        
        return jsonify({"classes": classes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Members/<user_id>/classes', methods=['GET'])
def get_user_classes(user_id):
    """Get a user's classes"""
    try:
        # Get user document
        user_doc = db.collection('Members').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Get classes array from user data
        user_data = user_doc.to_dict()
        classes = user_data.get('classes', [])
        
        return jsonify({"classes": classes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@firebase_routes.route('/Members/<user_id>/classes', methods=['POST'])
def manage_user_classes(user_id):
    """Add, update or remove a class for a user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        class_data = data.get('classData')
        operation = data.get('operation', 'add')
        
        if not class_data:
            return jsonify({"error": "No class data provided"}), 400
        
        # Get user document
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Get current classes
        user_data = user_doc.to_dict()
        classes = user_data.get('classes', [])
        
        # Operation: add, update, or remove
        if operation == 'add':
            # Check if class already exists
            for i, cls in enumerate(classes):
                if cls.get('id') == class_data.get('id'):
                    # Update existing class
                    classes[i] = class_data
                    break
            else:
                # Add new class
                classes.append(class_data)
        elif operation == 'update':
            # Update existing class
            for i, cls in enumerate(classes):
                if cls.get('id') == class_data.get('id'):
                    classes[i] = class_data
                    break
            else:
                return jsonify({"error": "Class not found"}), 404
        
        # Update the user document
        user_ref.update({
            'classes': classes,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            "message": f"Class {operation}d successfully", 
            "class": class_data
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@firebase_routes.route('/Members/<user_id>/classes', methods=['DELETE'])
def delete_user_class(user_id):
    """Delete a class for a user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        class_id = data.get('classId')
        
        if not class_id:
            return jsonify({"error": "No class ID provided"}), 400
        
        # Get user document
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        # Get current classes
        user_data = user_doc.to_dict()
        classes = user_data.get('classes', [])
        
        # Remove the class with matching ID
        updated_classes = [cls for cls in classes if cls.get('id') != class_id]
        
        if len(updated_classes) == len(classes):
            return jsonify({"error": "Class not found"}), 404
        
        # Update the user document
        user_ref.update({
            'classes': updated_classes,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({"message": "Class removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/friends', methods=['GET'])
@firebase_required
@login_required
def get_current_user_friends():
    """Get current user's friends"""
    try:
        user_id = session.get('user_id')
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        friend_ids = user_data.get('friends', [])  # Default to empty list if not exists
        
        # Initialize friends field if it doesn't exist
        if 'friends' not in user_data:
            user_ref.update({'friends': []})
        
        # Fetch friend details
        friends = []
        for friend_id in friend_ids:
            friend_doc = db.collection('Members').document(friend_id).get()
            if friend_doc.exists:
                friend_data = friend_doc.to_dict()
                # Remove sensitive information
                for field in ['password', 'verificationCode']:
                    if field in friend_data:
                        del friend_data[field]
                
                # Add the ID to the friend data
                friend_data['id'] = friend_id
                friends.append(friend_data)
        
        return jsonify({'friends': friends})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Members/<user_id>/friends', methods=['GET'])
def get_user_friends(user_id):
    try:
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        friend_ids = user_data.get('friends', [])  # Default to empty list if not exists
        
        # Initialize friends field if it doesn't exist
        if 'friends' not in user_data:
            user_ref.update({'friends': []})
        
        # Fetch friend details
        friends = []
        for friend_id in friend_ids:
            friend_doc = db.collection('Members').document(friend_id).get()
            if friend_doc.exists:
                friend_data = friend_doc.to_dict()
                # Remove sensitive information
                for field in ['password', 'verificationCode']:
                    if field in friend_data:
                        del friend_data[field]
                
                # Add the ID to the friend data
                friend_data['id'] = friend_id
                friends.append(friend_data)
        
        return jsonify({'friends': friends})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Members/<user_id>/friends', methods=['DELETE'])
def remove_user_friend(user_id):
    try:
        data = request.json
        if not data or 'friendId' not in data:
            return jsonify({'error': 'No friend ID provided'}), 400
        
        friend_id = data['friendId']
        
        # Check if user exists
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        # Remove friend from user's list
        user_data = user_doc.to_dict()
        user_friends = user_data.get('friends', [])
        
        if friend_id not in user_friends:
            return jsonify({'error': 'Friend not in friend list'}), 400
        
        user_friends.remove(friend_id)
        user_ref.update({'friends': user_friends})
        
        # Remove user from friend's list
        friend_ref = db.collection('Members').document(friend_id)
        friend_doc = friend_ref.get()
        
        if friend_doc.exists:
            friend_data = friend_doc.to_dict()
            friend_friends = friend_data.get('friends', [])
            
            if user_id in friend_friends:
                friend_friends.remove(user_id)
                friend_ref.update({'friends': friend_friends})
        
        return jsonify({'message': 'Friend removed successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add a specific route for adding a channel to a class
@firebase_routes.route('/Classes/<class_id>/channels', methods=['POST'])
def add_channel_to_class(class_id):
    """Add a new channel object to the channels array of a specific class."""
    try:
        channel_data = request.get_json()
        if not channel_data:
            return jsonify({"error": "No channel data provided"}), 400

        # Basic validation (can be expanded)
        if 'name' not in channel_data or not channel_data['name']:
            return jsonify({"error": "Channel name is required"}), 400

        # Get the class document reference
        class_ref = db.collection('Classes').document(class_id)
        class_doc = class_ref.get()

        if not class_doc.exists:
            return jsonify({"error": "Class not found"}), 404

        # Generate a unique ID for the channel (e.g., using Firestore's auto-ID)
        # Alternatively, could use uuid on the client/server
        channel_id = db.collection('Classes').document().id # Re-using document() for ID generation
        
        # Add required fields to the channel data
        channel_data['id'] = channel_id
        # channel_data['createdAt'] = firestore.SERVER_TIMESTAMP # Removed: Set on client
        # Assume createdBy should be added (needs user context from request/session)
        # channel_data['createdBy'] = get_current_user_id() # Replace with actual user ID retrieval
        
        # Use ArrayUnion to add the new channel object to the array
        class_ref.update({
            'channels': firestore.ArrayUnion([channel_data]),
            'updatedAt': firestore.SERVER_TIMESTAMP # Update class timestamp
        })

        # Return the newly added channel data including its ID
        return jsonify({"message": "Channel added successfully", "channel": channel_data}), 201

    except Exception as e:
        print(f"Error adding channel: {e}")
        return jsonify({"error": str(e)}), 500

# Route to get messages for a specific channel within a class
@firebase_routes.route('/Classes/<class_id>/channels/<channel_id>/messages', methods=['GET'])
def get_channel_messages(class_id, channel_id):
    """Get all messages for a specific channel, ordered by timestamp."""
    try:
        messages_query = db.collection('Messages') \
            .where('classId', '==', class_id) \
            .where('channelId', '==', channel_id) \
            .stream()

        messages = []
        for msg in messages_query:
            msg_data = msg.to_dict()
            # Convert Firestore timestamp to ISO string for JSON compatibility
            if isinstance(msg_data.get('sentAt'), datetime):
                 msg_data['sentAt'] = msg_data['sentAt'].isoformat()
            # Add message ID to the data
            msg_data['id'] = msg.id 
            messages.append(msg_data)

        return jsonify(messages), 200

    except Exception as e:
        print(f"Error fetching messages for channel {channel_id}: {e}")
        return jsonify({"error": str(e)}), 500

# --- Assignments Routes --- 

@firebase_routes.route('/Assignments', methods=['GET'])
def get_assignments():
    """Get assignments, optionally filtered by classId."""
    try:
        class_id = request.args.get('classId')
        
        query = db.collection('Assignments')
        if class_id:
            query = query.where('classId', '==', class_id)
        
        # Add ordering if needed, e.g., by dueDate
        # query = query.order_by('dueDate', direction=firestore.Query.ASCENDING)
        
        docs = query.stream()
        assignments = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            # Convert timestamps if necessary
            if isinstance(data.get('dueDate'), datetime):
                data['dueDate'] = data['dueDate'].isoformat()
            if isinstance(data.get('createdAt'), datetime):
                 data['createdAt'] = data['createdAt'].isoformat()
            assignments.append(data)
            
        return jsonify(assignments), 200
    except Exception as e:
        print(f"Error getting assignments: {e}")
        return jsonify({"error": str(e)}), 500

# POST route for Assignments is already covered by the generic POST /<collection>
# Ensure 'classId' is included in the JSON body when calling POST /Assignments

# --- Events Routes --- 

@firebase_routes.route('/Events', methods=['GET'])
def get_events():
    """Get events, optionally filtered by classId."""
    try:
        class_id = request.args.get('classId')
        
        query = db.collection('Events')
        if class_id:
            query = query.where('classId', '==', class_id)
        
        # Add ordering if needed, e.g., by startDate
        # query = query.order_by('startDate', direction=firestore.Query.ASCENDING)

        docs = query.stream()
        events = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            # Convert timestamps if necessary
            if isinstance(data.get('startDate'), datetime):
                 data['startDate'] = data['startDate'].isoformat()
            if isinstance(data.get('endDate'), datetime):
                 data['endDate'] = data['endDate'].isoformat()
            if isinstance(data.get('createdAt'), datetime):
                 data['createdAt'] = data['createdAt'].isoformat()
            events.append(data)
            
        return jsonify(events), 200
    except Exception as e:
        print(f"Error getting events: {e}")
        return jsonify({"error": str(e)}), 500

# POST route for Events is already covered by the generic POST /<collection>
# Ensure 'classId' is included in the JSON body when calling POST /Events

# --- Units Route (Specific POST for adding to Class array) ---

@firebase_routes.route('/Classes/<class_id>/units', methods=['POST'])
def add_unit_to_class(class_id):
    """Add a new unit object to the units array of a specific class."""
    try:
        unit_data = request.get_json()
        if not unit_data:
            return jsonify({"error": "No unit data provided"}), 400
        
        if 'title' not in unit_data or not unit_data['title']:
            return jsonify({"error": "Unit title is required"}), 400
            
        class_ref = db.collection('Classes').document(class_id)
        class_doc = class_ref.get()
        
        if not class_doc.exists:
             return jsonify({"error": "Class not found"}), 404
             
        # Generate ID, add timestamps etc.
        unit_id = db.collection('Classes').document().id # Generate unique ID
        unit_data['id'] = unit_id
        unit_data['createdAt'] = datetime.now().isoformat() # Client-side timestamp is fine here too
        unit_data['updatedAt'] = datetime.now().isoformat()
        # Add other default fields if needed based on schema
        unit_data.setdefault('description', '')
        unit_data.setdefault('position', 0) # May need logic to determine actual position
        unit_data.setdefault('status', 'draft')
        unit_data.setdefault('associatedFiles', [])
        unit_data.setdefault('associatedProblems', [])
        
        # Add to the units array
        class_ref.update({
            'units': firestore.ArrayUnion([unit_data]),
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({"message": "Unit added successfully", "unit": unit_data}), 201
        
    except Exception as e:
         print(f"Error adding unit: {e}")
         return jsonify({"error": str(e)}), 500

def send_email(email_address, message):
    """
    Sends an email to the specified address
    
    Args:
        email_address (str): The recipient's email address
        message (MIMEMultipart): The email message to send
    """
    try:
        # Email configuration
        sender_email = "sciwebbot@gmail.com"  # Replace with your actual no-reply email
        # get password from api_keys.json
        with open('api_keys1.json', 'r') as file:
            api_keys = json.load(file)
        sender_password = api_keys['email_password']
        # If message is a string, create a MIMEMultipart object
        if isinstance(message, str):
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = email_address
            msg['Subject'] = "Message from SciWeb"
            msg.attach(MIMEText(message, 'plain'))
            message = msg
        # Create SMTP session
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(message)

        print(f"Email sent successfully to {email_address}")
        return True

    except Exception as e:
        print(f"Error sending email: {e}")
        return False

# Friend Request Management Endpoints

@firebase_routes.route('/Members/<user_id>/friend-requests', methods=['GET'])
@firebase_required
def get_friend_requests(user_id):
    """Get incoming and outgoing friend requests for a user"""
    try:
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        friend_requests = user_data.get('friendRequests', {'incoming': [], 'outgoing': []})  # Default to empty structure
        
        # Initialize friendRequests field if it doesn't exist
        if 'friendRequests' not in user_data:
            default_requests = {'incoming': [], 'outgoing': []}
            user_ref.update({'friendRequests': default_requests})
            friend_requests = default_requests
        
        # Ensure the structure has both incoming and outgoing arrays
        if 'incoming' not in friend_requests:
            friend_requests['incoming'] = []
        if 'outgoing' not in friend_requests:
            friend_requests['outgoing'] = []
        
        # Fetch details for incoming requests
        incoming_requests = []
        for request in friend_requests.get('incoming', []):
            requester_id = request.get('userId')
            if requester_id:
                requester_doc = db.collection('Members').document(requester_id).get()
                if requester_doc.exists:
                    requester_data = requester_doc.to_dict()
                    # Remove sensitive information
                    for field in ['password', 'verification_code']:
                        if field in requester_data:
                            del requester_data[field]
                    
                    request_info = {
                        'userId': requester_id,
                        'name': f"{requester_data.get('first_name', '')} {requester_data.get('last_name', '')}".strip(),
                        'username': requester_data.get('username', ''),
                        'profilePicUrl': requester_data.get('profilePicUrl', ''),
                        'requestedAt': request.get('requestedAt')
                    }
                    incoming_requests.append(request_info)
        
        # Fetch details for outgoing requests
        outgoing_requests = []
        for request in friend_requests.get('outgoing', []):
            recipient_id = request.get('userId')
            if recipient_id:
                recipient_doc = db.collection('Members').document(recipient_id).get()
                if recipient_doc.exists:
                    recipient_data = recipient_doc.to_dict()
                    # Remove sensitive information
                    for field in ['password', 'verification_code']:
                        if field in recipient_data:
                            del recipient_data[field]
                    
                    request_info = {
                        'userId': recipient_id,
                        'name': f"{recipient_data.get('first_name', '')} {recipient_data.get('last_name', '')}".strip(),
                        'username': recipient_data.get('username', ''),
                        'profilePicUrl': recipient_data.get('profilePicUrl', ''),
                        'requestedAt': request.get('requestedAt')
                    }
                    outgoing_requests.append(request_info)
        
        return jsonify({
            'incoming': incoming_requests,
            'outgoing': outgoing_requests
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Members/<user_id>/friend-requests/accept', methods=['POST'])
@firebase_required
def accept_friend_request(user_id):
    """Accept a friend request"""
    try:
        data = request.json
        if not data or 'requesterId' not in data:
            return jsonify({'error': 'No requester ID provided'}), 400
        
        requester_id = data['requesterId']
        
        # Get both user documents
        user_ref = db.collection('Members').document(user_id)
        requester_ref = db.collection('Members').document(requester_id)
        
        user_doc = user_ref.get()
        requester_doc = requester_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        if not requester_doc.exists:
            return jsonify({'error': 'Requester not found'}), 404
        
        user_data = user_doc.to_dict()
        requester_data = requester_doc.to_dict()
        
        # Get current friend requests
        user_requests = user_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        requester_requests = requester_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        
        # Check if the request exists
        request_found = False
        updated_incoming = []
        for request in user_requests.get('incoming', []):
            if request.get('userId') == requester_id:
                request_found = True
            else:
                updated_incoming.append(request)
        
        if not request_found:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Remove the request from user's incoming and requester's outgoing
        user_requests['incoming'] = updated_incoming
        
        updated_outgoing = []
        for request in requester_requests.get('outgoing', []):
            if request.get('userId') != user_id:
                updated_outgoing.append(request)
        requester_requests['outgoing'] = updated_outgoing
        
        # Add to friends lists
        user_friends = user_data.get('friends', [])
        requester_friends = requester_data.get('friends', [])
        
        if requester_id not in user_friends:
            user_friends.append(requester_id)
        
        if user_id not in requester_friends:
            requester_friends.append(user_id)
        
        # Update both documents
        user_ref.update({
            'friendRequests': user_requests,
            'friends': user_friends,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        requester_ref.update({
            'friendRequests': requester_requests,
            'friends': requester_friends,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({'message': 'Friend request accepted successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Members/<user_id>/friend-requests/reject', methods=['POST'])
@firebase_required
def reject_friend_request(user_id):
    """Reject a friend request"""
    try:
        data = request.json
        if not data or 'requesterId' not in data:
            return jsonify({'error': 'No requester ID provided'}), 400
        
        requester_id = data['requesterId']
        
        # Get both user documents
        user_ref = db.collection('Members').document(user_id)
        requester_ref = db.collection('Members').document(requester_id)
        
        user_doc = user_ref.get()
        requester_doc = requester_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        if not requester_doc.exists:
            return jsonify({'error': 'Requester not found'}), 404
        
        user_data = user_doc.to_dict()
        requester_data = requester_doc.to_dict()
        
        # Get current friend requests
        user_requests = user_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        requester_requests = requester_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        
        # Remove the request from user's incoming
        request_found = False
        updated_incoming = []
        for request in user_requests.get('incoming', []):
            if request.get('userId') == requester_id:
                request_found = True
            else:
                updated_incoming.append(request)
        
        if not request_found:
            return jsonify({'error': 'Friend request not found'}), 404
        
        user_requests['incoming'] = updated_incoming
        
        # Remove the request from requester's outgoing
        updated_outgoing = []
        for request in requester_requests.get('outgoing', []):
            if request.get('userId') != user_id:
                updated_outgoing.append(request)
        requester_requests['outgoing'] = updated_outgoing
        
        # Update both documents
        user_ref.update({
            'friendRequests': user_requests,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        requester_ref.update({
            'friendRequests': requester_requests,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({'message': 'Friend request rejected successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Improved friend request sending endpoint
@firebase_routes.route('/Members/<user_id>/friend-requests/send', methods=['POST'])
@firebase_required
def send_friend_request(user_id):
    """Send a friend request (improved version)"""
    try:
        data = request.json
        if not data or 'friendUsername' not in data:
            return jsonify({'error': 'No username provided'}), 400
        
        friend_username = data['friendUsername'].strip()
        
        if not friend_username:
            return jsonify({'error': 'Username cannot be empty'}), 400
        
        # Check if user exists
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        # Find friend by username
        friend_query = db.collection('Members').where('username', '==', friend_username).limit(1).get()
        
        if not friend_query:
            return jsonify({'error': 'User with that username not found'}), 404
        
        friend_doc = list(friend_query)[0] if friend_query else None
        
        if not friend_doc:
            return jsonify({'error': 'User with that username not found'}), 404
        
        friend_id = friend_doc.id
        
        # Check if trying to add self as friend
        if friend_id == user_id:
            return jsonify({'error': 'Cannot send friend request to yourself'}), 400
        
        user_data = user_doc.to_dict()
        friend_data = friend_doc.to_dict()
        
        # Check if already friends
        user_friends = user_data.get('friends', [])
        if friend_id in user_friends:
            return jsonify({'error': 'Already friends with this user'}), 400
        
        # Check if request already exists
        user_requests = user_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        friend_requests = friend_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        
        # Check outgoing requests
        for req in user_requests.get('outgoing', []):
            if req.get('userId') == friend_id:
                return jsonify({'error': 'Friend request already sent'}), 400
        
        # Check incoming requests (maybe they sent you a request)
        for req in user_requests.get('incoming', []):
            if req.get('userId') == friend_id:
                return jsonify({'error': 'This user has already sent you a friend request'}), 400
        
        # Create request objects
        request_timestamp = datetime.now()
        
        outgoing_request = {
            'userId': friend_id,
            'requestedAt': request_timestamp
        }
        
        incoming_request = {
            'userId': user_id,
            'requestedAt': request_timestamp
        }
        
        # Add to user's outgoing requests
        user_requests['outgoing'].append(outgoing_request)
        
        # Add to friend's incoming requests
        friend_requests['incoming'].append(incoming_request)
        
        # Update both documents
        user_ref.update({
            'friendRequests': user_requests,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        db.collection('Members').document(friend_id).update({
            'friendRequests': friend_requests,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({'message': 'Friend request sent successfully', 'friendId': friend_id}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Members/<user_id>/friend-requests/cancel', methods=['POST'])
@firebase_required
def cancel_friend_request(user_id):
    """Cancel an outgoing friend request"""
    try:
        data = request.json
        if not data or 'recipientId' not in data:
            return jsonify({'error': 'No recipient ID provided'}), 400
        
        recipient_id = data['recipientId']
        
        # Get both user documents
        user_ref = db.collection('Members').document(user_id)
        recipient_ref = db.collection('Members').document(recipient_id)
        
        user_doc = user_ref.get()
        recipient_doc = recipient_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        if not recipient_doc.exists:
            return jsonify({'error': 'Recipient not found'}), 404
        
        user_data = user_doc.to_dict()
        recipient_data = recipient_doc.to_dict()
        
        # Get current friend requests
        user_requests = user_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        recipient_requests = recipient_data.get('friendRequests', {'incoming': [], 'outgoing': []})
        
        # Remove the request from user's outgoing
        request_found = False
        updated_outgoing = []
        for request in user_requests.get('outgoing', []):
            if request.get('userId') == recipient_id:
                request_found = True
            else:
                updated_outgoing.append(request)
        
        if not request_found:
            return jsonify({'error': 'Friend request not found'}), 404
        
        user_requests['outgoing'] = updated_outgoing
        
        # Remove the request from recipient's incoming
        updated_incoming = []
        for request in recipient_requests.get('incoming', []):
            if request.get('userId') != user_id:
                updated_incoming.append(request)
        recipient_requests['incoming'] = updated_incoming
        
        # Update both documents
        user_ref.update({
            'friendRequests': user_requests,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        recipient_ref.update({
            'friendRequests': recipient_requests,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({'message': 'Friend request cancelled successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Members/<user_id>/initialize-friends', methods=['POST'])
@firebase_required
def initialize_user_friends(user_id):
    """Initialize missing friend fields for existing users"""
    try:
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        updates = {}
        
        # Initialize friends field if missing
        if 'friends' not in user_data:
            updates['friends'] = []
        
        # Initialize friendRequests field if missing
        if 'friendRequests' not in user_data:
            updates['friendRequests'] = {
                'incoming': [],
                'outgoing': []
            }
        
        # Initialize classes field if missing
        if 'classes' not in user_data:
            updates['classes'] = []
        
        # Initialize enhanced settings if missing
        if 'settings' not in user_data:
            updates['settings'] = {
                'privacy': {
                    'profileVisibility': 'friends',
                    'webVisibility': 'friends',
                    'classesVisibility': 'friends',
                    'motivationsVisibility': 'private',
                    'friendsVisibility': 'friends'
                },
                'appearance': {
                    'theme': 'system',
                    'colorAccent': 'pink'
                }
            }
        else:
            # Ensure all privacy settings exist
            current_settings = user_data.get('settings', {})
            if 'privacy' not in current_settings:
                updates['settings.privacy'] = {
                    'profileVisibility': 'friends',
                    'webVisibility': 'friends',
                    'classesVisibility': 'friends',
                    'motivationsVisibility': 'private',
                    'friendsVisibility': 'friends'
                }
            else:
                privacy = current_settings['privacy']
                privacy_updates = {}
                if 'motivationsVisibility' not in privacy:
                    privacy_updates['motivationsVisibility'] = 'private'
                if 'friendsVisibility' not in privacy:
                    privacy_updates['friendsVisibility'] = 'friends'
                
                if privacy_updates:
                    for key, value in privacy_updates.items():
                        updates[f'settings.privacy.{key}'] = value
            
            # Ensure appearance settings exist
            if 'appearance' not in current_settings:
                updates['settings.appearance'] = {
                    'theme': 'system',
                    'colorAccent': 'pink'
                }
        
        # Only update if there are changes to make
        if updates:
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            user_ref.update(updates)
            return jsonify({
                'message': 'User fields initialized successfully',
                'updated_fields': list(updates.keys())
            }), 200
        else:
            return jsonify({'message': 'All fields already exist'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User search endpoint
@firebase_routes.route('/Members/search', methods=['GET'])
@firebase_required
def search_users():
    """Search for users by username or name"""
    try:
        query = request.args.get('q', '').strip()
        limit = int(request.args.get('limit', 10))  # Default limit of 10 results
        current_user_id = request.args.get('currentUserId', '')
        
        if not query:
            return jsonify({'users': []}), 200
        
        if len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Search by username (exact match and prefix match)
        username_results = []
        
        # Exact username match
        exact_query = db.collection('Members').where('username', '==', query).limit(5).get()
        for doc in exact_query:
            user_data = doc.to_dict()
            if doc.id != current_user_id:  # Don't include current user
                username_results.append({
                    'id': doc.id,
                    'username': user_data.get('username', ''),
                    'name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                    'profilePicUrl': user_data.get('profilePicUrl', ''),
                    'match_type': 'exact_username'
                })
        
        # Username prefix match (if not already found exact match)
        if len(username_results) < limit:
            # For username prefix search, we'll need to get all users and filter client-side
            # This is not ideal for large datasets, but works for smaller user bases
            prefix_query = db.collection('Members').limit(50).get()  # Limit to prevent performance issues
            for doc in prefix_query:
                user_data = doc.to_dict()
                username = user_data.get('username', '').lower()
                if (doc.id != current_user_id and 
                    username.startswith(query.lower()) and 
                    not any(user['id'] == doc.id for user in username_results)):
                    username_results.append({
                        'id': doc.id,
                        'username': user_data.get('username', ''),
                        'name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                        'profilePicUrl': user_data.get('profilePicUrl', ''),
                        'match_type': 'prefix_username'
                    })
                    
                    if len(username_results) >= limit:
                        break
        
        # Search by name (first name or last name contains query)
        name_results = []
        if len(username_results) < limit:
            # This is also not ideal for large datasets, but works for smaller user bases
            name_query = db.collection('Members').limit(50).get()
            for doc in name_query:
                user_data = doc.to_dict()
                first_name = user_data.get('first_name', '').lower()
                last_name = user_data.get('last_name', '').lower()
                full_name = f"{first_name} {last_name}".strip()
                
                if (doc.id != current_user_id and 
                    (query.lower() in first_name or query.lower() in last_name or query.lower() in full_name) and
                    not any(user['id'] == doc.id for user in username_results)):
                    name_results.append({
                        'id': doc.id,
                        'username': user_data.get('username', ''),
                        'name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                        'profilePicUrl': user_data.get('profilePicUrl', ''),
                        'match_type': 'name'
                    })
                    
                    if len(username_results) + len(name_results) >= limit:
                        break
        
        # Combine results (username matches first, then name matches)
        all_results = username_results + name_results
        all_results = all_results[:limit]  # Apply limit
        
        # Remove sensitive information and add user relationship status
        for user in all_results:
            # Remove any sensitive fields
            user.pop('password', None)
            user.pop('verification_code', None)
            
            # Check relationship status with current user if current user ID is provided
            if current_user_id:
                current_user_doc = db.collection('Members').document(current_user_id).get()
                if current_user_doc.exists:
                    current_user_data = current_user_doc.to_dict()
                    user_friends = current_user_data.get('friends', [])
                    user_requests = current_user_data.get('friendRequests', {'incoming': [], 'outgoing': []})
                    
                    if user['id'] in user_friends:
                        user['relationship'] = 'friends'
                    elif any(req.get('userId') == user['id'] for req in user_requests.get('outgoing', [])):
                        user['relationship'] = 'request_sent'
                    elif any(req.get('userId') == user['id'] for req in user_requests.get('incoming', [])):
                        user['relationship'] = 'request_received'
                    else:
                        user['relationship'] = 'none'
                else:
                    user['relationship'] = 'none'
            else:
                user['relationship'] = 'none'
        
        return jsonify({'users': all_results}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Resources', methods=['GET'])
@firebase_required
def get_resources():
    """Get resources with optional filtering by classId"""
    try:
        # Get query parameters
        class_id = request.args.get('classId')
        
        # Start with base query
        query = db.collection('Resources')
        
        # Apply filters if provided
        if class_id:
            query = query.where('classId', '==', class_id)
        
        # Execute query
        docs = query.get()
        
        resources = []
        for doc in docs:
            resource_data = doc.to_dict()
            resource_data['id'] = doc.id
            resources.append(resource_data)
        
        return jsonify({'resources': resources}), 200
        
    except Exception as e:
        print(f"Error fetching resources: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Messages', methods=['GET'])
@firebase_required
def get_messages():
    """Get messages with optional filtering by classId and channelId"""
    try:
        # Get query parameters
        class_id = request.args.get('classId')
        channel_id = request.args.get('channelId')
        limit = request.args.get('limit', type=int)
        
        # Start with base query
        query = db.collection('Messages')
        
        # Apply filters if provided
        if class_id:
            query = query.where('classId', '==', class_id)
        if channel_id:
            query = query.where('channelId', '==', channel_id)
        
        # Order by timestamp
        query = query.order_by('sentAt', direction=firestore.Query.ASCENDING)
        
        # Apply limit if provided
        if limit:
            query = query.limit(limit)
        
        # Execute query
        docs = query.get()
        
        messages = []
        for doc in docs:
            message_data = doc.to_dict()
            message_data['id'] = doc.id
            messages.append(message_data)
        
        return jsonify({'messages': messages}), 200
        
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Grades', methods=['GET'])
@firebase_required  
def get_grades():
    """Get grades with optional filtering by classId and studentId"""
    try:
        # Get query parameters
        class_id = request.args.get('classId')
        student_id = request.args.get('studentId')
        
        # Start with base query
        query = db.collection('Grades')
        
        # Apply filters if provided
        if class_id:
            query = query.where('classId', '==', class_id)
        if student_id:
            query = query.where('studentId', '==', student_id)
        
        # Order by graded date
        query = query.order_by('gradedAt', direction=firestore.Query.DESCENDING)
        
        # Execute query
        docs = query.get()
        
        grades = []
        for doc in docs:
            grade_data = doc.to_dict()
            grade_data['id'] = doc.id
            grades.append(grade_data)
        
        return jsonify({'grades': grades}), 200
        
    except Exception as e:
        print(f"Error fetching grades: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/ClassMindWebs', methods=['GET'])
@firebase_required
def get_class_mind_webs():
    """Get class mind webs with optional filtering by classId"""
    try:
        # Get query parameters
        class_id = request.args.get('classId')
        
        # Start with base query
        query = db.collection('ClassMindWebs')
        
        # Apply filters if provided
        if class_id:
            query = query.where('classId', '==', class_id)
        
        # Execute query
        docs = query.get()
        
        mind_webs = []
        for doc in docs:
            mind_web_data = doc.to_dict()
            mind_web_data['id'] = doc.id
            mind_webs.append(mind_web_data)
        
        return jsonify({'mindWebs': mind_webs}), 200
        
    except Exception as e:
        print(f"Error fetching class mind webs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Classes/<class_id>', methods=['GET'])
@firebase_required
def get_class(class_id):
    """Get a specific class by ID"""
    try:
        # Get the class document
        class_doc = db.collection('Classes').document(class_id).get()
        
        if not class_doc.exists:
            return jsonify({"error": "Class not found"}), 404
        
        class_data = class_doc.to_dict()
        class_data['id'] = class_id
        
        return jsonify({class_id: class_data}), 200
        
    except Exception as e:
        print(f"Error fetching class {class_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Classes/<class_id>/stats', methods=['GET'])
@firebase_required
def get_class_stats(class_id):
    """Get statistics for a specific class"""
    try:
        # Initialize stats
        stats = {
            'assignments': 0,
            'resources': 0,
            'discussions': 0,
            'average_grade': 'N/A'
        }
        
        # Count assignments
        assignments_query = db.collection('Assignments').where('classId', '==', class_id)
        assignments_docs = assignments_query.get()
        stats['assignments'] = len(assignments_docs)
        
        # Count resources
        resources_query = db.collection('Resources').where('classId', '==', class_id)
        resources_docs = resources_query.get()
        stats['resources'] = len(resources_docs)
        
        # Count messages (discussions)
        messages_query = db.collection('Messages').where('classId', '==', class_id)
        messages_docs = messages_query.get()
        stats['discussions'] = len(messages_docs)
        
        # Calculate average grade
        grades_query = db.collection('Grades').where('classId', '==', class_id)
        grades_docs = grades_query.get()
        
        if grades_docs:
            total_percentage = 0
            count = 0
            
            for doc in grades_docs:
                grade_data = doc.to_dict()
                if 'percentage' in grade_data:
                    total_percentage += grade_data['percentage']
                    count += 1
                elif 'score' in grade_data and 'possible' in grade_data:
                    percentage = (grade_data['score'] / grade_data['possible']) * 100
                    total_percentage += percentage
                    count += 1
            
            if count > 0:
                avg_percentage = round(total_percentage / count)
                stats['average_grade'] = f"{avg_percentage}%"
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        print(f"Error fetching class stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Classes/<class_id>/recent-activities', methods=['GET'])
@firebase_required
def get_class_recent_activities(class_id):
    """Get recent activities for a specific class"""
    try:
        activities = []
        
        # Get recent grades (limit to 2)
        grades_query = db.collection('Grades').where('classId', '==', class_id).order_by('gradedAt', direction=firestore.Query.DESCENDING).limit(2)
        for doc in grades_query.get():
            grade_data = doc.to_dict()
            graded_time = grade_data.get('gradedAt')
            if graded_time:
                activities.append({
                    'id': doc.id,
                    'text': f"{grade_data.get('assignmentTitle', 'Assignment')} graded ({grade_data.get('percentage', grade_data.get('score', '?'))}%)",
                    'timestamp': graded_time,
                    'icon': 'fas fa-flask',
                    'type': 'grade'
                })
        
        # Get recent resources (limit to 2)
        resources_query = db.collection('Resources').where('classId', '==', class_id).order_by('createdAt', direction=firestore.Query.DESCENDING).limit(2)
        for doc in resources_query.get():
            resource_data = doc.to_dict()
            created_time = resource_data.get('createdAt')
            if created_time:
                activities.append({
                    'id': doc.id,
                    'text': f"New resource added: {resource_data.get('title', 'Untitled Resource')}",
                    'timestamp': created_time,
                    'icon': 'fas fa-file-powerpoint',
                    'type': 'resource'
                })
        
        # Get recent messages (limit to 2)
        messages_query = db.collection('Messages').where('classId', '==', class_id).order_by('sentAt', direction=firestore.Query.DESCENDING).limit(2)
        for doc in messages_query.get():
            message_data = doc.to_dict()
            sent_time = message_data.get('sentAt')
            if sent_time:
                activities.append({
                    'id': doc.id,
                    'text': f"{message_data.get('senderName', 'Someone')} posted in discussions",
                    'timestamp': sent_time,
                    'icon': 'fas fa-comment-dots',
                    'type': 'discussion'
                })
        
        # Sort activities by timestamp (most recent first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Limit to 4 most recent activities
        activities = activities[:4]
        
        return jsonify({'activities': activities}), 200
        
    except Exception as e:
        print(f"Error fetching recent activities: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Classes/<class_id>/members', methods=['GET'])
@firebase_required
def get_class_members(class_id):
    """Get members of a specific class with optional role filtering"""
    try:
        # Get query parameters
        role = request.args.get('role')  # e.g., 'student', 'teacher'
        
        # Get the class document
        class_doc = db.collection('Classes').document(class_id).get()
        
        if not class_doc.exists:
            return jsonify({"error": "Class not found"}), 404
        
        class_data = class_doc.to_dict()
        members = class_data.get('members', [])
        
        # Filter by role if specified
        if role:
            members = [member for member in members if member.get('role') == role]
        
        # Get detailed member information
        detailed_members = []
        for member in members:
            user_id = member.get('userId')
            if user_id:
                user_doc = db.collection('Members').document(user_id).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    detailed_member = {
                        'id': user_id,
                        'name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or user_data.get('username', 'Unknown'),
                        'email': user_data.get('email', ''),
                        'profilePic': user_data.get('profilePicUrl', ''),
                        'grade': user_data.get('grade', ''),
                        'role': member.get('role', 'student'),
                        'joinedAt': member.get('joinedAt'),
                        'status': member.get('status', 'active'),
                        'lastActive': user_data.get('lastActive')
                    }
                    detailed_members.append(detailed_member)
        
        return jsonify({'members': detailed_members}), 200
        
    except Exception as e:
        print(f"Error fetching class members: {str(e)}")
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/Messages/<message_id>', methods=['DELETE'])
@firebase_required
def delete_message(message_id):
    """Delete a specific message"""
    try:
        # Get the current user ID to verify ownership
        current_user_id = session.get('user_id')
        
        # First, get the message to check ownership
        message_ref = db.collection('Messages').document(message_id)
        message_doc = message_ref.get()
        
        if not message_doc.exists:
            return jsonify({'error': 'Message not found'}), 404
            
        message_data = message_doc.to_dict()
        
        # Check if the current user owns this message
        if message_data.get('senderId') != current_user_id:
            return jsonify({'error': 'You can only delete your own messages'}), 403
        
        # Delete the message
        message_ref.delete()
        
        return jsonify({
            'success': True,
            'message': 'Message deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error in delete_message: {e}")
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Classes/<class_id>/channels/<channel_id>', methods=['DELETE'])
@firebase_required
def delete_channel(class_id, channel_id):
    """Delete a channel from a class"""
    try:
        # Get the class document
        class_ref = db.collection('Classes').document(class_id)
        class_doc = class_ref.get()
        
        if not class_doc.exists:
            return jsonify({'error': 'Class not found'}), 404
            
        class_data = class_doc.to_dict()
        channels = class_data.get('channels', [])
        
        # Find and remove the channel
        updated_channels = [ch for ch in channels if ch.get('id') != channel_id and ch.get('name') != channel_id]
        
        if len(updated_channels) == len(channels):
            return jsonify({'error': 'Channel not found'}), 404
        
        # Update the class document
        class_ref.update({
            'channels': updated_channels,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Also delete any messages in this channel
        messages_query = db.collection('Messages').where('channelId', '==', channel_id)
        messages = messages_query.get()
        
        batch = db.batch()
        for message in messages:
            batch.delete(message.reference)
        batch.commit()
        
        return jsonify({
            'success': True,
            'message': 'Channel deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error in delete_channel: {e}")
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/Classes/<class_id>/members/<member_id>', methods=['DELETE'])
@firebase_required
def remove_class_member(class_id, member_id):
    """Remove a member from a class"""
    try:
        # Get the class document
        class_ref = db.collection('Classes').document(class_id)
        class_doc = class_ref.get()
        
        if not class_doc.exists:
            return jsonify({'error': 'Class not found'}), 404
            
        class_data = class_doc.to_dict()
        members = class_data.get('members', [])
        
        # Find and remove the member
        updated_members = [m for m in members if m.get('userId') != member_id and m.get('id') != member_id]
        
        if len(updated_members) == len(members):
            return jsonify({'error': 'Member not found in class'}), 404
        
        # Update the class document
        class_ref.update({
            'members': updated_members,
            'studentCount': len(updated_members),
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Also remove the class from the member's classes list
        member_ref = db.collection('Members').document(member_id)
        member_doc = member_ref.get()
        
        if member_doc.exists:
            member_data = member_doc.to_dict()
            member_classes = member_data.get('classes', [])
            updated_member_classes = [c for c in member_classes if c != class_id]
            
            member_ref.update({
                'classes': updated_member_classes,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        
        return jsonify({
            'success': True,
            'message': 'Member removed from class successfully'
        }), 200
        
    except Exception as e:
        print(f"Error in remove_class_member: {e}")
        return jsonify({'error': str(e)}), 500