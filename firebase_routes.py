from flask import Blueprint, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, storage
from datetime import datetime, timedelta

from urllib.parse import urlparse, parse_qs

# Try to import from our initialization module
try:
    from db_init import db
except ImportError:
    # If import fails, initialize Firebase here
    if not firebase_admin._apps:
        cred = credentials.Certificate('service_key.json')
        firebase_admin.initialize_app(cred, {
            'projectId': 'sturdy-analyzer-381018',
            'storageBucket': 'sciweb-files'
        })
    db = firestore.client()
    # Explicitly specify the database name using internal method
    db._database_string_internal = "projects/sturdy-analyzer-381018/databases/sciwebdb"

# Get Firebase Storage bucket
bucket = storage.bucket('sciweb-files')

firebase_routes = Blueprint('firebase_routes', __name__)

@firebase_routes.route('/<collection>', methods=['GET'])
def get_all(collection):
    """Get all documents from a collection"""
    try:
        docs = db.collection(collection).stream()
        items = [{doc.id: doc.to_dict()} for doc in docs]
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@firebase_routes.route('/<collection>/<document_id>', methods=['GET'])
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



@firebase_routes.route('/profile-photo', methods=['POST'])
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

# User profile related endpoints
@firebase_routes.route('/Members/<user_id>', methods=['GET'])
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

@firebase_routes.route('/api/Members/<user_id>/friends', methods=['GET'])
def get_user_friends(user_id):
    try:
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        friend_ids = user_data.get('friends', [])
        
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

@firebase_routes.route('/api/Members/<user_id>/friends', methods=['POST'])
def add_user_friend(user_id):
    try:
        data = request.json
        if not data or 'friendUsername' not in data:
            return jsonify({'error': 'No username provided'}), 400
        
        friend_username = data['friendUsername']
        
        # Check if user exists
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        # Find friend by username
        friend_query = db.collection('Members').where('username', '==', friend_username).limit(1).get()
        
        if not friend_query:
            return jsonify({'error': 'Friend not found'}), 404
        
        friend_doc = list(friend_query)[0] if friend_query else None
        
        if not friend_doc:
            return jsonify({'error': 'Friend not found'}), 404
        
        friend_id = friend_doc.id
        
        # Check if trying to add self as friend
        if friend_id == user_id:
            return jsonify({'error': 'Cannot add yourself as a friend'}), 400
        
        # Check if already friends
        user_data = user_doc.to_dict()
        user_friends = user_data.get('friends', [])
        
        if friend_id in user_friends:
            return jsonify({'error': 'Already friends with this user'}), 400
        
        # Add friend
        user_friends.append(friend_id)
        user_ref.update({'friends': user_friends})
        
        # Add back as friend for the other user
        friend_data = friend_doc.to_dict()
        friend_friends = friend_data.get('friends', [])
        
        if user_id not in friend_friends:
            friend_friends.append(user_id)
            db.collection('Members').document(friend_id).update({'friends': friend_friends})
        
        return jsonify({'message': 'Friend added successfully', 'friendId': friend_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@firebase_routes.route('/api/Members/<user_id>/friends', methods=['DELETE'])
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

