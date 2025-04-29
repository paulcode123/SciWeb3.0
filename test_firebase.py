import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import datetime
import json
import os

def verify_service_account_file():
    """Verify that the service account file exists and is valid JSON."""
    try:
        if not os.path.exists('service_key3.json'):
            print("Error: service_key3.json file not found in the current directory")
            return False
        
        with open('service_key3.json', 'r') as f:
            cred_dict = json.load(f)
            
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in cred_dict:
                print(f"Error: Missing required field '{field}' in service_key3.json")
                return False
                
        if cred_dict['type'] != 'service_account':
            print("Error: Invalid credential type. Must be 'service_account'")
            return False
            
        return True
    except json.JSONDecodeError:
        print("Error: service_key3.json is not a valid JSON file")
        return False
    except Exception as e:
        print(f"Error verifying service account file: {e}")
        return False

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials."""
    try:
        # First verify the service account file
        if not verify_service_account_file():
            return False
            
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate('service_key3.json')
        
        # Initialize with database configuration
        app_options = {
            'projectId': 'sturdy-analyzer-381018',
        }
        firebase_admin.initialize_app(cred, app_options)
        
        return True
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
        return False

def add_user_document():
    """Add a test document to the Users collection."""
    try:
        # Get Firestore client
        db = firestore.client()
        
        # Explicitly specify the database name using internal method
        # This is a private method but currently the only way to specify a non-default database
        db._database_string_internal = "projects/sturdy-analyzer-381018/databases/sciwebdb"
        
        print("Successfully connected to Firestore database: sciwebdb")
        
        # Sample user data
        user_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'created_at': firestore.SERVER_TIMESTAMP,
            'active': True
        }
        
        print("Attempting to add document to Users collection in sciwebdb...")
        # Add document to Users collection using add()
        doc_ref = db.collection('Users').add(user_data)
        print(f"Document added successfully with ID: {doc_ref[1].id}")
        return True
    except Exception as e:
        print(f"Error adding document: {str(e)}")
        if hasattr(e, 'code') and hasattr(e, 'message'):
            print(f"Error code: {e.code}, Message: {e.message}")
        return False

def main():
    # Check if Firebase is already initialized
    if firebase_admin._apps:
        print("Firebase already initialized, cleaning up...")
        for app in firebase_admin._apps.values():
            firebase_admin.delete_app(app)
    
    # Initialize Firebase
    if initialize_firebase():
        print("Firebase initialized successfully!")
        
        # Add user document
        if add_user_document():
            print("User document added successfully!")
        else:
            print("Failed to add user document.")
    else:
        print("Failed to initialize Firebase.")

if __name__ == "__main__":
    main() 