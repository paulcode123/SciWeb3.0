import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase if not already initialized
if not firebase_admin._apps:
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

print("Successfully connected to Firestore database: sciwebdb") 