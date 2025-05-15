import firebase_admin
from firebase_admin import credentials, firestore
import os

# Flag to track if we're using Firebase
firebase_available = False
db = None

# Initialize Firebase if not already initialized and if service key exists
if not firebase_admin._apps:
    try:
        if os.path.exists('service_key3.json'):
            cred = credentials.Certificate('service_key3.json')
            firebase_admin.initialize_app(cred, {
                'projectId': 'sturdy-analyzer-381018',
                'storageBucket': 'bxscioly-455318.appspot.com'
            })
            
            # Get Firestore client
            db = firestore.client()
            
            # Explicitly specify the database name using internal method
            # This is a private method but currently the only way to specify a non-default database
            db._database_string_internal = "projects/sturdy-analyzer-381018/databases/sciwebdb"
            
            firebase_available = True
            print("Successfully connected to Firestore database: sciwebdb")
        else:
            print("Warning: service_key3.json not found. Firebase functionality will be disabled.")
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
        print("Firebase functionality will be disabled.")

def is_firebase_available():
    return firebase_available 