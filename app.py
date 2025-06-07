import os
import json
import datetime
import random
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, abort, Blueprint
from ai_routes import ai_bp
from firebase_routes import firebase_routes, send_email
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
# Add email functionality imports
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Try to import from our initialization module
try:
    from db_init import db, is_firebase_available
except ImportError:
    # Fall back to a local initialization if import fails
    is_firebase_available = lambda: False
    db = None

app = Flask(__name__)
# Register the AI Blueprint
app.register_blueprint(ai_bp, url_prefix='/ai')
app.register_blueprint(firebase_routes, url_prefix='/api')

# Set a secret key for session management
app.secret_key = 'your_secret_key_here'  # This should be a secure random key in production

# Temporary storage for verification codes (in production, use Redis or database)
verification_codes = {}

# Function to send email with verification code
def send_verification_email(email, verification_code):
    """Send verification code via email"""
    try:
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = "sciwebbot@gmail.com"
        msg['To'] = email
        msg['Subject'] = "SciWeb 3.0 - Email Verification Code"
        
        # Email body
        body = f"""
Hello!

Thank you for signing up for SciWeb 3.0! To complete your registration, please enter the following verification code:

Verification Code: {verification_code}

This code will expire in 10 minutes.

If you didn't sign up for SciWeb 3.0, please ignore this email.

Best regards,
The SciWeb Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Use the existing send_email function from firebase_routes
        return send_email(email, msg)
        
    except Exception as e:
        print(f"Error creating verification email: {e}")
        return False

# Function to initialize sample class data
def init_sample_class_data():
    print("Initializing sample class data...")
    """Initialize sample class data in the database if it doesn't already exist."""
    if not is_firebase_available():
        print("Firebase not available. Sample class data not initialized.")
        return
    
    try:
        # Check if the sample class already exists
        sample_class_ref = db.collection('Classes').document('sample-ap-biology')
        sample_class = sample_class_ref.get()
        
        if sample_class.exists:
            print("Sample class already exists. Skipping initialization.")
            return
        
        print("Initializing sample class data...")
        
        # Create teacher first
        teacher_data = {
            'id': 'teacher123',
            'first_name': 'Alex',
            'last_name': 'Rodriguez',
            'email': 'arodriguez@school.edu',
            'username': 'arod_teacher',
            'password': 'teacher123',  # In production, this would be hashed
            'profilePicUrl': 'https://randomuser.me/api/portraits/men/44.jpg',
            'grade': 'Faculty',
            'userType': 'teacher',
            'createdAt': datetime.datetime.now() - datetime.timedelta(days=365),
            'updatedAt': datetime.datetime.now() - datetime.timedelta(days=1),
            'bio': 'PhD in Biology with 10+ years of teaching experience in AP Biology and molecular biology research.',
            'settings': {
                'privacy': {
                    'profileVisibility': 'everyone',
                    'webVisibility': 'everyone',
                    'classesVisibility': 'everyone'
                },
                'appearance': {
                    'theme': 'light',
                    'colorAccent': 'blue'
                }
            }
        }
        
        # Add teacher to Members collection
        db.collection('Members').document('teacher123').set(teacher_data)
        
        # Create sample students first
        students = [
            {
                'id': 'student1',
                'first_name': 'Emma',
                'last_name': 'Thompson',
                'email': 'ethompson@student.edu',
                'username': 'ethompson',
                'password': 'password123',  # In production, this would be hashed
                'profilePicUrl': 'https://randomuser.me/api/portraits/women/22.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(hours=2),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=5),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Passionate about biology and planning to study pre-med in college.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'friends',
                        'webVisibility': 'friends',
                        'classesVisibility': 'friends'
                    },
                    'appearance': {
                        'theme': 'light',
                        'colorAccent': 'pink'
                    }
                }
            },
            {
                'id': 'student2',
                'first_name': 'James',
                'last_name': 'Wilson',
                'email': 'jwilson@student.edu',
                'username': 'jwilson',
                'password': 'password123',  # In production, this would be hashed
                'profilePicUrl': 'https://randomuser.me/api/portraits/men/32.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(days=1),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=10),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Interested in biochemistry and molecular research.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'everyone',
                        'webVisibility': 'friends',
                        'classesVisibility': 'friends'
                    },
                    'appearance': {
                        'theme': 'dark',
                        'colorAccent': 'blue'
                    }
                }
            },
            {
                'id': 'student3',
                'first_name': 'Sophia',
                'last_name': 'Lee',
                'email': 'slee@student.edu',
                'username': 'slee',
                'password': 'password123',  # In production, this would be hashed
                'profilePicUrl': 'https://randomuser.me/api/portraits/women/33.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(hours=3),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=2),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Future veterinarian with a love for animal biology.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'friends',
                        'webVisibility': 'private',
                        'classesVisibility': 'friends'
                    },
                    'appearance': {
                        'theme': 'light',
                        'colorAccent': 'green'
                    }
                }
            },
            {
                'id': 'student4',
                'first_name': 'Michael',
                'last_name': 'Brown',
                'email': 'mbrown@student.edu',
                'username': 'mbrown',
                'password': 'password123',  # In production, this would be hashed
                'profilePicUrl': 'https://randomuser.me/api/portraits/men/55.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(hours=5),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=7),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Aspiring to study genetics and genomics.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'friends',
                        'webVisibility': 'friends',
                        'classesVisibility': 'friends'
                    },
                    'appearance': {
                        'theme': 'dark',
                        'colorAccent': 'purple'
                    }
                }
            },
            {
                'id': 'student5',
                'first_name': 'Olivia',
                'last_name': 'Garcia',
                'email': 'ogarcia@student.edu',
                'username': 'ogarcia',
                'profilePicUrl': 'https://randomuser.me/api/portraits/women/66.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(minutes=15),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(hours=1),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Interested in marine biology and environmental science.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'everyone',
                        'webVisibility': 'everyone',
                        'classesVisibility': 'friends'
                    },
                    'appearance': {
                        'theme': 'light',
                        'colorAccent': 'orange'
                    }
                }
            },
            {
                'id': 'student6',
                'first_name': 'William',
                'last_name': 'Chen',
                'email': 'wchen@student.edu',
                'username': 'wchen',
                'profilePicUrl': 'https://randomuser.me/api/portraits/men/77.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(days=2),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=15),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Planning to pursue biotechnology and bioengineering.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'friends',
                        'webVisibility': 'friends',
                        'classesVisibility': 'private'
                    },
                    'appearance': {
                        'theme': 'dark',
                        'colorAccent': 'blue'
                    }
                }
            },
            {
                'id': 'student7',
                'first_name': 'Ava',
                'last_name': 'Patel',
                'email': 'apatel@student.edu',
                'username': 'apatel',
                'profilePicUrl': 'https://randomuser.me/api/portraits/women/45.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(hours=4),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=3),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Fascinated by microbiology and infectious diseases.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'friends',
                        'webVisibility': 'friends',
                        'classesVisibility': 'friends'
                    },
                    'appearance': {
                        'theme': 'light',
                        'colorAccent': 'pink'
                    }
                }
            },
            {
                'id': 'student8',
                'first_name': 'Noah',
                'last_name': 'Johnson',
                'email': 'njohnson@student.edu',
                'username': 'njohnson',
                'profilePicUrl': 'https://randomuser.me/api/portraits/men/15.jpg',
                'grade': '11th Grade',
                'lastActive': datetime.datetime.now() - datetime.timedelta(hours=1),
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=120),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=1),
                'role': 'student',
                'status': 'active',
                'userType': 'student',
                'bio': 'Exploring the intersection of biology and computer science.',
                'settings': {
                    'privacy': {
                        'profileVisibility': 'everyone',
                        'webVisibility': 'friends',
                        'classesVisibility': 'everyone'
                    },
                    'appearance': {
                        'theme': 'dark',
                        'colorAccent': 'green'
                    }
                }
            }
        ]
        
        # Add students to Members collection
        for student in students:
            student_id = student['id']
            db.collection('Members').document(student_id).set(student)
        
        # Create a sample class
        class_data = {
            'id': 'sample-ap-biology',
            'name': 'AP Biology',
            'description': 'Advanced Placement Biology - An in-depth study of the fundamental concepts in biology, with emphasis on cellular processes, genetics, evolution, and ecology.',
            'teacherId': 'teacher123',
            'teacherName': 'Dr. Alex Rodriguez',
            'teacherEmail': 'arodriguez@school.edu',
            'teacherProfilePic': 'https://randomuser.me/api/portraits/men/44.jpg',
            'teacherOfficeHours': [
                'Monday: 3:00 PM - 4:30 PM',
                'Wednesday: 2:00 PM - 3:30 PM',
                'Friday: By appointment'
            ],
            'period': '2nd Period (10:15 AM - 11:45 AM)',
            'yearGroup': '11-12',
            'subject': 'Science',
            'studentCount': 28,
            'createdAt': datetime.datetime.now(),
            'updatedAt': datetime.datetime.now(),
            'syllabus': 'This course covers fundamental concepts in molecular biology and genetics, with an emphasis on recent discoveries and research methods. Students will learn about DNA structure and replication, gene expression, protein synthesis, and the regulation of cellular processes. Laboratory sessions will provide hands-on experience with techniques such as PCR, gel electrophoresis, and microscopy. The course also explores ethical implications of genetic research and biotechnology applications.',
            'syllabusFileUrl': '',
            'members': [
                {
                    'userId': 'teacher123',
                    'role': 'teacher',
                    'joinedAt': datetime.datetime.now(),
                    'status': 'active'
                },
                {
                    'userId': 'student1',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=80),
                    'status': 'active'
                },
                {
                    'userId': 'student2',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=80),
                    'status': 'active'
                },
                {
                    'userId': 'student3',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=79),
                    'status': 'active'
                },
                {
                    'userId': 'student4',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=79),
                    'status': 'active'
                },
                {
                    'userId': 'student5',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=78),
                    'status': 'active'
                },
                {
                    'userId': 'student6',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=78),
                    'status': 'active'
                },
                {
                    'userId': 'student7',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=77),
                    'status': 'active'
                },
                {
                    'userId': 'student8',
                    'role': 'student',
                    'joinedAt': datetime.datetime.now() - datetime.timedelta(days=77),
                    'status': 'active'
                }
            ],
            'channels': [
                {
                    'id': 'general',
                    'name': 'general',
                    'description': 'General class discussion',
                    'type': 'general',
                    'createdAt': datetime.datetime.now(),
                    'createdBy': 'teacher123',
                    'isPrivate': False,
                    'allowedMembers': []
                },
                {
                    'id': 'questions',
                    'name': 'questions',
                    'description': 'Ask questions about class material',
                    'type': 'help',
                    'createdAt': datetime.datetime.now(),
                    'createdBy': 'teacher123',
                    'isPrivate': False,
                    'allowedMembers': []
                },
                {
                    'id': 'resources',
                    'name': 'resources',
                    'description': 'Share helpful resources',
                    'type': 'resources',
                    'createdAt': datetime.datetime.now(),
                    'createdBy': 'teacher123',
                    'isPrivate': False,
                    'allowedMembers': []
                },
                {
                    'id': 'lab_partners',
                    'name': 'lab_partners',
                    'description': 'Coordinate with your lab partners',
                    'type': 'team',
                    'createdAt': datetime.datetime.now(),
                    'createdBy': 'teacher123',
                    'isPrivate': False,
                    'allowedMembers': []
                },
                {
                    'id': 'announcements',
                    'name': 'announcements',
                    'description': 'Important class announcements',
                    'type': 'announcement',
                    'createdAt': datetime.datetime.now(),
                    'createdBy': 'teacher123',
                    'isPrivate': False,
                    'allowedMembers': []
                }
            ],
            'units': [
                {
                    'id': 'unit1',
                    'title': 'Molecular Biology Fundamentals',
                    'description': 'An exploration of DNA structure, replication, and protein synthesis',
                    'position': 1,
                    'status': 'active',
                    'startDate': datetime.datetime.now(),
                    'endDate': datetime.datetime.now() + datetime.timedelta(days=30),
                    'progress': 65,
                    'topics': [
                        'DNA Structure and Organization',
                        'Replication Mechanisms',
                        'Transcription and RNA Processing',
                        'Translation and Protein Synthesis',
                        'Gene Regulation'
                    ],
                    'current_topic': 'Translation and Protein Synthesis',
                    'associatedFiles': [],
                    'associatedProblems': []
                },
                {
                    'id': 'unit2',
                    'title': 'Cell Structure and Function',
                    'description': 'Understanding cellular components and their roles in maintaining life',
                    'position': 2,
                    'status': 'upcoming',
                    'startDate': datetime.datetime.now() + datetime.timedelta(days=31),
                    'endDate': datetime.datetime.now() + datetime.timedelta(days=60),
                    'progress': 0,
                    'topics': [
                        'Cell Membrane Structure',
                        'Organelles and Their Functions',
                        'Cellular Transport',
                        'Cell Communication',
                        'Cell Cycle and Division'
                    ],
                    'current_topic': '',
                    'associatedFiles': [],
                    'associatedProblems': []
                }
            ],
            'settings': {
                'joinCode': 'BIO2025',
                'visibility': 'school',
                'gradingSystem': {
                    'A': 90,
                    'B': 80,
                    'C': 70,
                    'D': 60,
                    'F': 0
                }
            },
            'recentActivities': [
                {
                    'id': 'a1',
                    'text': 'Lab Report: DNA Extraction graded (92%)',
                    'time': '2 hours ago',
                    'timestamp': datetime.datetime.now() - datetime.timedelta(hours=2),
                    'icon': 'fas fa-flask',
                    'type': 'grade',
                    'userId': 'teacher123'
                },
                {
                    'id': 'a2',
                    'text': 'Dr. Rodriguez posted new lecture slides',
                    'time': 'Yesterday',
                    'timestamp': datetime.datetime.now() - datetime.timedelta(days=1),
                    'icon': 'fas fa-file-powerpoint',
                    'type': 'resource',
                    'userId': 'teacher123'
                },
                {
                    'id': 'a3',
                    'text': 'New assignment posted: Protein Synthesis Diagram',
                    'time': '2 days ago',
                    'timestamp': datetime.datetime.now() - datetime.timedelta(days=2),
                    'icon': 'fas fa-tasks',
                    'type': 'assignment',
                    'userId': 'teacher123'
                }
            ],
            'stats': {
                'assignments': 14,
                'resources': 26,
                'discussions': 72,
                'average_grade': '89%'
            }
        }
        
        # Note: Students are already added to class members array above
        
        # Add the class to Firestore
        sample_class_ref.set(class_data)
        
        # Create sample assignments
        assignments = [
            {
                'id': 'as1',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Protein Synthesis Diagram',
                'description': 'Create a detailed diagram showing the process of protein synthesis, including transcription and translation steps.',
                'type': 'project',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=5),
                'due_date': 'Oct 15, 2025',
                'time_left': '5 days left',
                'points': 50,
                'weight': 0.1,
                'status': 'not_started',
                'visibleToStudents': True,
                'allowed_formats': 'PDF, JPG, PNG',
                'resources': ['Lecture 4 Slides', 'Chapter 7 in textbook'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as2',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Gene Expression Problem Set',
                'description': 'Complete the problem set on gene expression regulation and feedback mechanisms.',
                'type': 'homework',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=8),
                'due_date': 'Oct 18, 2025',
                'time_left': '8 days left',
                'points': 25,
                'weight': 0.05,
                'status': 'in_progress',
                'visibleToStudents': True,
                'allowed_formats': 'PDF',
                'resources': ['Problem Set PDF', 'Chapter 8 in textbook'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as3',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'DNA Replication Quiz',
                'description': 'Online quiz covering DNA replication, enzymes involved, and proofreading mechanisms.',
                'type': 'quiz',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=12),
                'due_date': 'Oct 22, 2025',
                'time_left': '12 days left',
                'points': 30,
                'weight': 0.05,
                'status': 'not_started',
                'visibleToStudents': True,
                'time_limit': '30 minutes',
                'resources': ['Lecture 3 Slides', 'Study Guide'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as4',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Genetic Disorders Research Paper',
                'description': 'Write a 5-page research paper on a genetic disorder of your choice, covering causes, symptoms, treatments, and current research.',
                'type': 'paper',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=26),
                'due_date': 'Nov 5, 2025',
                'time_left': '26 days left',
                'points': 100,
                'weight': 0.15,
                'status': 'not_started',
                'visibleToStudents': True,
                'allowed_formats': 'DOCX, PDF',
                'resources': ['Research Paper Guidelines', 'Example Papers'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as5',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Cell Division Video Analysis',
                'description': 'Watch the provided video on cell division and answer the analysis questions.',
                'type': 'analysis',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=15),
                'due_date': 'Oct 25, 2025',
                'time_left': '15 days left',
                'points': 20,
                'weight': 0.05,
                'status': 'not_started',
                'visibleToStudents': True,
                'allowed_formats': 'PDF, DOCX',
                'resources': ['Video Link', 'Analysis Questions'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as6',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Midterm Exam',
                'description': 'Comprehensive exam covering all topics from the first half of the semester.',
                'type': 'exam',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=31),
                'due_date': 'Nov 10, 2025',
                'time_left': '31 days left',
                'points': 200,
                'weight': 0.25,
                'status': 'not_started',
                'visibleToStudents': True,
                'time_limit': '2 hours',
                'resources': ['Study Guide', 'Review Session Schedule'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as7',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Lab Report: Microscopy Techniques',
                'description': 'Write a detailed lab report on the microscopy techniques used in last week\'s lab session.',
                'type': 'lab',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=14),
                'dueDate': datetime.datetime.now() - datetime.timedelta(days=7),
                'due_date': 'Oct 3, 2025',
                'time_left': 'Completed',
                'points': 40,
                'weight': 0.08,
                'status': 'graded',
                'visibleToStudents': True,
                'allowed_formats': 'PDF, DOCX',
                'resources': ['Lab Manual', 'Microscopy Guidelines'],
                'submissions': {
                    'count': 28,
                    'graded': 28,
                    'average': 87.5
                }
            },
            {
                'id': 'as8',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Cellular Respiration Worksheet',
                'description': 'Complete the worksheet on cellular respiration pathways and energy production.',
                'type': 'homework',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=21),
                'dueDate': datetime.datetime.now() - datetime.timedelta(days=14),
                'due_date': 'Sep 26, 2025',
                'time_left': 'Completed',
                'points': 15,
                'weight': 0.03,
                'status': 'graded',
                'visibleToStudents': True,
                'allowed_formats': 'PDF',
                'resources': ['Chapter 9 Notes', 'Cellular Respiration Diagram'],
                'submissions': {
                    'count': 27,
                    'graded': 27,
                    'average': 91.2
                }
            },
            {
                'id': 'as9',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Enzyme Activity Lab Analysis',
                'description': 'Analyze the data from the enzyme activity lab and create graphs showing the relationship between temperature and enzyme activity.',
                'type': 'analysis',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() + datetime.timedelta(days=3),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=10),
                'due_date': 'Oct 20, 2025',
                'time_left': '10 days left',
                'points': 35,
                'weight': 0.07,
                'status': 'not_started',
                'visibleToStudents': True,
                'allowed_formats': 'PDF, Excel',
                'resources': ['Lab Data Sheet', 'Graphing Instructions'],
                'submissions': {
                    'count': 0,
                    'graded': 0,
                    'average': 0
                }
            },
            {
                'id': 'as10',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Photosynthesis vs Respiration Comparison',
                'description': 'Create a detailed comparison chart showing the similarities and differences between photosynthesis and cellular respiration.',
                'type': 'project',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=3),
                'dueDate': datetime.datetime.now() + datetime.timedelta(days=2),
                'due_date': 'Oct 12, 2025',
                'time_left': '2 days left',
                'points': 60,
                'weight': 0.12,
                'status': 'in_progress',
                'visibleToStudents': True,
                'allowed_formats': 'PDF, PowerPoint, Google Slides',
                'resources': ['Photosynthesis Notes', 'Respiration Notes', 'Comparison Template'],
                'submissions': {
                    'count': 8,
                    'graded': 0,
                    'average': 0
                }
            }
        ]
        
        # Add assignments to Firestore
        for assignment in assignments:
            db.collection('Assignments').document(assignment['id']).set(assignment)
        
        # Create sample events
        events = [
            {
                'id': 'e1',
                'classId': 'sample-ap-biology',
                'title': 'Lab Session: DNA Extraction',
                'description': 'Hands-on lab to extract DNA from various cell types.',
                'type': 'lab',
                'location': 'Lab 203',
                'date': 'Tomorrow',
                'time': '2:30 PM - 4:00 PM',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=1),
                'endDate': datetime.datetime.now() + datetime.timedelta(days=1, hours=1.5),
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'hostId': 'teacher123',
                'recurring': False
            },
            {
                'id': 'e2',
                'classId': 'sample-ap-biology',
                'title': 'Quiz: Cell Structure',
                'description': 'Short quiz covering basic cell structure topics.',
                'type': 'quiz',
                'location': 'Classroom',
                'date': 'Friday',
                'time': 'During class',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=3),
                'endDate': datetime.datetime.now() + datetime.timedelta(days=3, minutes=30),
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'hostId': 'teacher123',
                'recurring': False
            },
            {
                'id': 'e3',
                'classId': 'sample-ap-biology',
                'title': 'Study Group Session',
                'description': 'Student-led study group to review molecular biology concepts.',
                'type': 'study_group',
                'location': 'Library Study Room 4',
                'date': 'Saturday',
                'time': '11:00 AM - 1:00 PM',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=4),
                'endDate': datetime.datetime.now() + datetime.timedelta(days=4, hours=2),
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'hostId': 'teacher123',
                'recurring': False
            },
            {
                'id': 'e4',
                'classId': 'sample-ap-biology',
                'title': 'Guest Lecture: Genomic Research',
                'description': 'Special guest lecture by Dr. Janice Wong from the University Research Center.',
                'type': 'lecture',
                'location': 'Auditorium',
                'date': 'Next Tuesday',
                'time': '1:00 PM - 2:30 PM',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=6),
                'endDate': datetime.datetime.now() + datetime.timedelta(days=6, hours=1.5),
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'hostId': 'teacher123',
                'recurring': False
            },
            {
                'id': 'e5',
                'classId': 'sample-ap-biology',
                'title': 'Review Session: DNA and RNA',
                'description': 'Comprehensive review session for the upcoming quiz.',
                'type': 'review',
                'location': 'Classroom',
                'date': 'Next Wednesday',
                'time': '3:00 PM - 4:30 PM',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=7),
                'endDate': datetime.datetime.now() + datetime.timedelta(days=7, hours=1.5),
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now(),
                'hostId': 'teacher123',
                'recurring': False
            }
        ]
        
        # Add events to Firestore
        for event in events:
            db.collection('Events').document(event['id']).set(event)
        
        # Create sample resources
        resources = [
            {
                'id': 'r1',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Lecture 1: Introduction to Molecular Biology',
                'description': 'Overview of course, key concepts, and research methodologies',
                'type': 'slides',
                'date_added': 'Sep 5, 2025',
                'file_type': 'PDF',
                'file_size': '2.4 MB',
                'thumbnail': 'https://via.placeholder.com/300x200/4361ee/ffffff?text=Lecture+1',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=30),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=30),
                'visibility': 'class',
                'views': 26,
                'downloads': 18
            },
            {
                'id': 'r2',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'DNA Structure and Replication',
                'description': 'Video lecture explaining DNA structure and the replication process',
                'type': 'videos',
                'date_added': 'Sep 8, 2025',
                'duration': '28:45',
                'thumbnail': 'https://via.placeholder.com/300x200/3a0ca3/ffffff?text=DNA+Video',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=27),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=27),
                'visibility': 'class',
                'views': 22,
                'downloads': 0
            },
            {
                'id': 'r3',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Lab 1: Microscopy Techniques',
                'description': 'Handout for first lab session on microscopy techniques',
                'type': 'handouts',
                'date_added': 'Sep 10, 2025',
                'file_type': 'PDF',
                'file_size': '1.8 MB',
                'thumbnail': 'https://via.placeholder.com/300x200/f72585/ffffff?text=Lab+1',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=25),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=25),
                'visibility': 'class',
                'views': 28,
                'downloads': 24
            },
            {
                'id': 'r4',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'The Cell Cycle and Division',
                'description': 'Interactive simulation of cell division processes',
                'type': 'practice',
                'date_added': 'Sep 15, 2025',
                'duration': 'Interactive',
                'thumbnail': 'https://via.placeholder.com/300x200/4cc9f0/000000?text=Cell+Cycle',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=20),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=20),
                'visibility': 'class',
                'views': 19,
                'downloads': 0
            },
            {
                'id': 'r5',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Current Research in Gene Therapy',
                'description': 'Recent journal articles on advances in gene therapy applications',
                'type': 'readings',
                'date_added': 'Sep 18, 2025',
                'file_type': 'PDF',
                'file_size': '4.2 MB',
                'thumbnail': 'https://via.placeholder.com/300x200/7209b7/ffffff?text=Research',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=17),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=17),
                'visibility': 'class',
                'views': 12,
                'downloads': 8
            },
            {
                'id': 'r6',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Lecture 2: Protein Synthesis',
                'description': 'Detailed lecture on transcription and translation processes',
                'type': 'slides',
                'date_added': 'Sep 20, 2025',
                'file_type': 'PDF',
                'file_size': '3.1 MB',
                'thumbnail': 'https://via.placeholder.com/300x200/4361ee/ffffff?text=Lecture+2',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=15),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=15),
                'visibility': 'class',
                'views': 25,
                'downloads': 20
            },
            {
                'id': 'r7',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Genetic Engineering Techniques',
                'description': 'Video demonstration of key genetic engineering methods',
                'type': 'videos',
                'date_added': 'Sep 23, 2025',
                'duration': '34:12',
                'thumbnail': 'https://via.placeholder.com/300x200/3a0ca3/ffffff?text=Genetic+Eng',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=12),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=12),
                'visibility': 'class',
                'views': 17,
                'downloads': 0
            },
            {
                'id': 'r8',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Practice Problems: Gene Expression',
                'description': 'Practice problems with solutions for gene expression mechanisms',
                'type': 'practice',
                'date_added': 'Sep 25, 2025',
                'file_type': 'PDF',
                'file_size': '1.5 MB',
                'thumbnail': 'https://via.placeholder.com/300x200/4cc9f0/000000?text=Practice',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=10),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=10),
                'visibility': 'class',
                'views': 21,
                'downloads': 16
            }
        ]
        
        # Add resources to Firestore
        for resource in resources:
            db.collection('Resources').document(resource['id']).set(resource)
        
        # Create sample messages for discussion channels
        messages = [
            # General channel messages
            {
                'id': 'm1',
                'classId': 'sample-ap-biology',
                'channelId': 'general',
                'senderId': 'teacher123',
                'senderName': 'Dr. Alex Rodriguez',
                'senderProfilePic': 'https://randomuser.me/api/portraits/men/44.jpg',
                'content': 'Welcome to AP Biology! Looking forward to an exciting year of discovery and learning.',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=60),
                'editedAt': None,
                'reactions': {},
                'replyCount': 2,
                'isAnnouncement': False
            },
            {
                'id': 'm2',
                'classId': 'sample-ap-biology',
                'channelId': 'general',
                'senderId': 'student1',
                'senderName': 'Emma Thompson',
                'senderProfilePic': 'https://randomuser.me/api/portraits/women/22.jpg',
                'content': 'Excited to be in this class! Can\'t wait to start the labs.',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=60, hours=2),
                'editedAt': None,
                'reactions': {'👍': ['student2', 'student3']},
                'replyCount': 0,
                'isAnnouncement': False
            },
            {
                'id': 'm3',
                'classId': 'sample-ap-biology',
                'channelId': 'general',
                'senderId': 'student2',
                'senderName': 'James Wilson',
                'senderProfilePic': 'https://randomuser.me/api/portraits/men/32.jpg',
                'content': 'Same here! This is going to be an amazing year.',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=59, hours=18),
                'editedAt': None,
                'reactions': {},
                'replyCount': 0,
                'isAnnouncement': False
            },
            
            # Questions channel messages
            {
                'id': 'm4',
                'classId': 'sample-ap-biology',
                'channelId': 'questions',
                'senderId': 'student3',
                'senderName': 'Sophia Lee',
                'senderProfilePic': 'https://randomuser.me/api/portraits/women/33.jpg',
                'content': 'Can someone explain the difference between DNA and RNA structure again?',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=5),
                'editedAt': None,
                'reactions': {},
                'replyCount': 1,
                'isAnnouncement': False
            },
            {
                'id': 'm5',
                'classId': 'sample-ap-biology',
                'channelId': 'questions',
                'senderId': 'teacher123',
                'senderName': 'Dr. Alex Rodriguez',
                'senderProfilePic': 'https://randomuser.me/api/portraits/men/44.jpg',
                'content': 'Great question! The main differences are: 1) DNA is double-stranded, RNA is single-stranded, 2) DNA uses thymine, RNA uses uracil, 3) DNA has deoxyribose sugar, RNA has ribose sugar. Check out the lecture slides for more details!',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=5, hours=3),
                'editedAt': None,
                'reactions': {'📚': ['student3', 'student4', 'student5']},
                'replyCount': 0,
                'isAnnouncement': False
            },
            
            # Recent messages
            {
                'id': 'm6',
                'classId': 'sample-ap-biology',
                'channelId': 'general',
                'senderId': 'student4',
                'senderName': 'Michael Brown',
                'senderProfilePic': 'https://randomuser.me/api/portraits/men/55.jpg',
                'content': 'Has anyone started working on the protein synthesis diagram yet?',
                'sentAt': datetime.datetime.now() - datetime.timedelta(hours=6),
                'editedAt': None,
                'reactions': {},
                'replyCount': 2,
                'isAnnouncement': False
            },
            {
                'id': 'm7',
                'classId': 'sample-ap-biology',
                'channelId': 'general',
                'senderId': 'student5',
                'senderName': 'Olivia Garcia',
                'senderProfilePic': 'https://randomuser.me/api/portraits/women/66.jpg',
                'content': 'I started it last night! The transcription part is pretty straightforward.',
                'sentAt': datetime.datetime.now() - datetime.timedelta(hours=4),
                'editedAt': None,
                'reactions': {'💪': ['student4', 'student6']},
                'replyCount': 0,
                'isAnnouncement': False
            },
            
            # Announcements channel
            {
                'id': 'm8',
                'classId': 'sample-ap-biology',
                'channelId': 'announcements',
                'senderId': 'teacher123',
                'senderName': 'Dr. Alex Rodriguez',
                'senderProfilePic': 'https://randomuser.me/api/portraits/men/44.jpg',
                'content': 'Reminder: Lab session tomorrow at 2:30 PM in Lab 203. Please bring your lab notebooks and safety goggles.',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=1),
                'editedAt': None,
                'reactions': {'✅': ['student1', 'student2', 'student3', 'student4']},
                'replyCount': 0,
                'isAnnouncement': True
            },
            
            # Lab partners channel
            {
                'id': 'm9',
                'classId': 'sample-ap-biology',
                'channelId': 'lab_partners',
                'senderId': 'student1',
                'senderName': 'Emma Thompson',
                'senderProfilePic': 'https://randomuser.me/api/portraits/women/22.jpg',
                'content': 'Looking for a lab partner for the DNA extraction lab. Anyone interested?',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=2),
                'editedAt': None,
                'reactions': {},
                'replyCount': 1,
                'isAnnouncement': False
            },
            {
                'id': 'm10',
                'classId': 'sample-ap-biology',
                'channelId': 'lab_partners',
                'senderId': 'student7',
                'senderName': 'Ava Patel',
                'senderProfilePic': 'https://randomuser.me/api/portraits/women/45.jpg',
                'content': 'I\'d love to partner with you, Emma! I have some experience with lab techniques.',
                'sentAt': datetime.datetime.now() - datetime.timedelta(days=2, hours=3),
                'editedAt': None,
                'reactions': {'🤝': ['student1', 'student2']},
                'replyCount': 0,
                'isAnnouncement': False
            }
        ]
        
        # Add messages to Firestore
        for message in messages:
            db.collection('Messages').document(message['id']).set(message)
        
        # Create sample mind web data
        mind_webs = [
            {
                'id': 'mw1',
                'classId': 'sample-ap-biology',
                'unitId': 'unit1',
                'title': 'Molecular Biology Concepts Map',
                'description': 'Visual representation of key molecular biology concepts and their relationships',
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=45),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=10),
                'isPublic': True,
                'version': 1,
                'nodes': [
                    {
                        'id': 'n1',
                        'label': 'DNA Structure',
                        'type': 'concept',
                        'position': {'x': 500, 'y': 300},
                        'description': 'Double helix structure of deoxyribonucleic acid',
                        'color': '#4361ee',
                        'size': 50
                    },
                    {
                        'id': 'n2',
                        'label': 'Nucleotides',
                        'type': 'component',
                        'position': {'x': 300, 'y': 200},
                        'description': 'Building blocks of DNA containing base, sugar, and phosphate',
                        'color': '#3a0ca3',
                        'size': 40
                    },
                    {
                        'id': 'n3',
                        'label': 'Double Helix',
                        'type': 'structure',
                        'position': {'x': 700, 'y': 200},
                        'description': 'Twisted ladder structure of DNA',
                        'color': '#7209b7',
                        'size': 40
                    },
                    {
                        'id': 'n4',
                        'label': 'Base Pairs',
                        'type': 'interaction',
                        'position': {'x': 350, 'y': 450},
                        'description': 'Hydrogen bonding between complementary bases',
                        'color': '#f72585',
                        'size': 40
                    },
                    {
                        'id': 'n5',
                        'label': 'Hydrogen Bonds',
                        'type': 'bond',
                        'position': {'x': 650, 'y': 450},
                        'description': 'Weak bonds holding base pairs together',
                        'color': '#4cc9f0',
                        'size': 40
                    },
                    {
                        'id': 'n6',
                        'label': 'Phosphate Backbone',
                        'type': 'structure',
                        'position': {'x': 200, 'y': 300},
                        'description': 'Sugar-phosphate chain forming DNA backbone',
                        'color': '#4361ee',
                        'size': 40
                    },
                    {
                        'id': 'n7',
                        'label': 'RNA',
                        'type': 'concept',
                        'position': {'x': 500, 'y': 150},
                        'description': 'Ribonucleic acid - single stranded nucleic acid',
                        'color': '#f77f00',
                        'size': 45
                    },
                    {
                        'id': 'n8',
                        'label': 'Protein Synthesis',
                        'type': 'process',
                        'position': {'x': 800, 'y': 300},
                        'description': 'Process of creating proteins from genetic information',
                        'color': '#06d6a0',
                        'size': 45
                    }
                ],
                'edges': [
                    {
                        'id': 'e1',
                        'source': 'n1',
                        'target': 'n2',
                        'type': 'contains',
                        'label': 'composed of',
                        'weight': 1
                    },
                    {
                        'id': 'e2',
                        'source': 'n1',
                        'target': 'n3',
                        'type': 'has_structure',
                        'label': 'forms',
                        'weight': 1
                    },
                    {
                        'id': 'e3',
                        'source': 'n1',
                        'target': 'n4',
                        'type': 'contains',
                        'label': 'includes',
                        'weight': 1
                    },
                    {
                        'id': 'e4',
                        'source': 'n4',
                        'target': 'n5',
                        'type': 'connected_by',
                        'label': 'held by',
                        'weight': 1
                    },
                    {
                        'id': 'e5',
                        'source': 'n2',
                        'target': 'n6',
                        'type': 'part_of',
                        'label': 'forms',
                        'weight': 1
                    },
                    {
                        'id': 'e6',
                        'source': 'n1',
                        'target': 'n7',
                        'type': 'related_to',
                        'label': 'similar to',
                        'weight': 0.8
                    },
                    {
                        'id': 'e7',
                        'source': 'n7',
                        'target': 'n8',
                        'type': 'enables',
                        'label': 'used in',
                        'weight': 1
                    },
                    {
                        'id': 'e8',
                        'source': 'n1',
                        'target': 'n8',
                        'type': 'codes_for',
                        'label': 'provides info for',
                        'weight': 1
                    }
                ],
                'layout': 'force-directed',
                'style': {
                    'backgroundColor': '#ffffff',
                    'nodeStyle': 'circular',
                    'edgeStyle': 'curved',
                    'showLabels': True,
                    'showEdgeLabels': False
                }
            }
        ]
        
        # Add mind webs to Firestore
        for mind_web in mind_webs:
            db.collection('ClassMindWebs').document(mind_web['id']).set(mind_web)
        
        # Create sample grades
        grades = [
            # Grades for completed assignments
            {
                'id': 'g1',
                'classId': 'sample-ap-biology',
                'assignmentId': 'as7',
                'assignmentTitle': 'Lab Report: Microscopy Techniques',
                'studentId': 'student1',
                'score': 37,
                'possible': 40,
                'percentage': 92.5,
                'letterGrade': 'A-',
                'status': 'graded',
                'submittedAt': datetime.datetime.now() - datetime.timedelta(days=8),
                'gradedAt': datetime.datetime.now() - datetime.timedelta(days=5),
                'feedback': 'Excellent detailed observations and clear methodology. Good use of proper microscopy terminology.',
                'type': 'lab',
                'isLate': False,
                'daysLate': 0
            },
            {
                'id': 'g2',
                'classId': 'sample-ap-biology',
                'assignmentId': 'as8',
                'assignmentTitle': 'Cellular Respiration Worksheet',
                'studentId': 'student1',
                'score': 14,
                'possible': 15,
                'percentage': 93.3,
                'letterGrade': 'A',
                'status': 'graded',
                'submittedAt': datetime.datetime.now() - datetime.timedelta(days=15),
                'gradedAt': datetime.datetime.now() - datetime.timedelta(days=12),
                'feedback': 'Great understanding of the cellular respiration pathways.',
                'type': 'homework',
                'isLate': False,
                'daysLate': 0
            },
            # Additional grades for past assignments
            {
                'id': 'g3',
                'classId': 'sample-ap-biology',
                'assignmentId': 'past_quiz_1',
                'assignmentTitle': 'Quiz: DNA Structure',
                'studentId': 'student1',
                'score': 18,
                'possible': 20,
                'percentage': 90,
                'letterGrade': 'A-',
                'status': 'graded',
                'submittedAt': datetime.datetime.now() - datetime.timedelta(days=25),
                'gradedAt': datetime.datetime.now() - datetime.timedelta(days=24),
                'feedback': 'Good understanding of DNA structure concepts.',
                'type': 'quiz',
                'isLate': False,
                'daysLate': 0
            },
            {
                'id': 'g4',
                'classId': 'sample-ap-biology',
                'assignmentId': 'past_homework_1',
                'assignmentTitle': 'Molecular Biology Problem Set',
                'studentId': 'student1',
                'score': 24,
                'possible': 25,
                'percentage': 96,
                'letterGrade': 'A',
                'status': 'graded',
                'submittedAt': datetime.datetime.now() - datetime.timedelta(days=30),
                'gradedAt': datetime.datetime.now() - datetime.timedelta(days=28),
                'feedback': 'Excellent work on all problems.',
                'type': 'homework',
                'isLate': False,
                'daysLate': 0
            },
            {
                'id': 'g5',
                'classId': 'sample-ap-biology',
                'assignmentId': 'past_lab_1',
                'assignmentTitle': 'Lab: Cell Membrane Permeability',
                'studentId': 'student1',
                'score': 35,
                'possible': 40,
                'percentage': 87.5,
                'letterGrade': 'B+',
                'status': 'graded',
                'submittedAt': datetime.datetime.now() - datetime.timedelta(days=35),
                'gradedAt': datetime.datetime.now() - datetime.timedelta(days=32),
                'feedback': 'Good experimental technique. Data analysis could be more thorough.',
                'type': 'lab',
                'isLate': False,
                'daysLate': 0
            },
            # Current assignment status
            {
                'id': 'g6',
                'classId': 'sample-ap-biology',
                'assignmentId': 'as1',
                'assignmentTitle': 'Protein Synthesis Diagram',
                'studentId': 'student1',
                'status': 'not_submitted',
                'type': 'project'
            },
            {
                'id': 'g7',
                'classId': 'sample-ap-biology',
                'assignmentId': 'as10',
                'assignmentTitle': 'Photosynthesis vs Respiration Comparison',
                'studentId': 'student1',
                'status': 'in_progress',
                'type': 'project'
            }
        ]
        
        # Add grades for other students with variations
        assignment_ids = ['as7', 'as8', 'past_quiz_1', 'past_homework_1', 'past_lab_1']
        assignment_titles = [
            'Lab Report: Microscopy Techniques',
            'Cellular Respiration Worksheet', 
            'Quiz: DNA Structure',
            'Molecular Biology Problem Set',
            'Lab: Cell Membrane Permeability'
        ]
        assignment_types = ['lab', 'homework', 'quiz', 'homework', 'lab']
        assignment_totals = [40, 15, 20, 25, 40]
        
        student_ids = ['student2', 'student3', 'student4', 'student5', 'student6', 'student7', 'student8']
        for i, student_id in enumerate(student_ids):
            for j, assignment_id in enumerate(assignment_ids):
                # Create varied but realistic scores
                base_performance = random.uniform(0.75, 0.95)  # Students generally perform well
                random_variation = random.uniform(-0.08, 0.08)  # Small random variation
                performance = max(0.6, min(1.0, base_performance + random_variation))
                
                max_score = assignment_totals[j]
                score = int(max_score * performance)
                percentage = round((score / max_score) * 100, 1)
                
                # Determine letter grade
                if percentage >= 93:
                    letter_grade = 'A'
                elif percentage >= 90:
                    letter_grade = 'A-'
                elif percentage >= 87:
                    letter_grade = 'B+'
                elif percentage >= 83:
                    letter_grade = 'B'
                elif percentage >= 80:
                    letter_grade = 'B-'
                elif percentage >= 77:
                    letter_grade = 'C+'
                elif percentage >= 73:
                    letter_grade = 'C'
                elif percentage >= 70:
                    letter_grade = 'C-'
                elif percentage >= 67:
                    letter_grade = 'D+'
                elif percentage >= 60:
                    letter_grade = 'D'
                else:
                    letter_grade = 'F'
                
                # Occasional late submission
                is_late = random.random() < 0.15  # 15% chance of being late
                days_late = random.randint(1, 3) if is_late else 0
                
                grade = {
                    'id': f'g{(i+1)*10 + j+1}',
                    'classId': 'sample-ap-biology',
                    'assignmentId': assignment_id,
                    'assignmentTitle': assignment_titles[j],
                    'studentId': student_id,
                    'score': score,
                    'possible': max_score,
                    'percentage': percentage,
                    'letterGrade': letter_grade,
                    'status': 'graded',
                    'submittedAt': datetime.datetime.now() - datetime.timedelta(days=30-j*5) + datetime.timedelta(days=days_late),
                    'gradedAt': datetime.datetime.now() - datetime.timedelta(days=28-j*5),
                    'feedback': f'{"Good work" if percentage >= 85 else "Satisfactory work" if percentage >= 75 else "Needs improvement"} on {assignment_titles[j].lower()}.',
                    'type': assignment_types[j],
                    'isLate': is_late,
                    'daysLate': days_late
                }
                
                grades.append(grade)
            
            # Add current assignment statuses for each student
            # Some students have submitted the current assignments
            if random.random() < 0.3:  # 30% have submitted the protein synthesis diagram
                grades.append({
                    'id': f'g{(i+1)*10 + 6}',
                    'classId': 'sample-ap-biology',
                    'assignmentId': 'as1',
                    'assignmentTitle': 'Protein Synthesis Diagram',
                    'studentId': student_id,
                    'status': 'submitted',
                    'type': 'project',
                    'submittedAt': datetime.datetime.now() - datetime.timedelta(hours=random.randint(2, 48))
                })
            else:
                grades.append({
                    'id': f'g{(i+1)*10 + 6}',
                    'classId': 'sample-ap-biology',
                    'assignmentId': 'as1',
                    'assignmentTitle': 'Protein Synthesis Diagram',
                    'studentId': student_id,
                    'status': 'not_submitted',
                    'type': 'project'
                })
            
            # Most students are working on the comparison project
            if random.random() < 0.6:  # 60% are in progress
                grades.append({
                    'id': f'g{(i+1)*10 + 7}',
                    'classId': 'sample-ap-biology',
                    'assignmentId': 'as10',
                    'assignmentTitle': 'Photosynthesis vs Respiration Comparison',
                    'studentId': student_id,
                    'status': 'in_progress',
                    'type': 'project'
                })
            else:
                grades.append({
                    'id': f'g{(i+1)*10 + 7}',
                    'classId': 'sample-ap-biology',
                    'assignmentId': 'as10',
                    'assignmentTitle': 'Photosynthesis vs Respiration Comparison',
                    'studentId': student_id,
                    'status': 'not_started',
                    'type': 'project'
                })
        
        # Add grades to Firestore
        for grade in grades:
            db.collection('Grades').document(grade['id']).set(grade)
        
        # Note: Messages are already created above
            
        # Note: All messages already created above in the main messages array
        
        # Create mind web data
        mind_web_data = {
            'id': 'mw1',
            'classId': 'sample-ap-biology',
            'title': 'Molecular Biology Concepts',
            'description': 'A visual map of key concepts in molecular biology',
            'createdBy': 'teacher123',
            'createdAt': datetime.datetime.now() - datetime.timedelta(days=15),
            'updatedAt': datetime.datetime.now() - datetime.timedelta(days=2),
            'nodes': [
                {
                    'id': 'n1',
                    'label': 'DNA Structure',
                    'type': 'concept',
                    'position': {'x': 500, 'y': 300},
                    'notes': 'The foundational molecule of genetics',
                    'tags': ['fundamental', 'structure']
                },
                {
                    'id': 'n2',
                    'label': 'Nucleotides',
                    'type': 'concept',
                    'position': {'x': 300, 'y': 200},
                    'notes': 'Building blocks of DNA',
                    'tags': ['component', 'chemistry']
                },
                {
                    'id': 'n3',
                    'label': 'Double Helix',
                    'type': 'principle',
                    'position': {'x': 700, 'y': 200},
                    'notes': 'The 3D structure of DNA',
                    'tags': ['structure', 'discovery']
                },
                {
                    'id': 'n4',
                    'label': 'Base Pairs',
                    'type': 'concept',
                    'position': {'x': 350, 'y': 450},
                    'notes': 'A-T and G-C pairings',
                    'tags': ['principle', 'chemistry']
                },
                {
                    'id': 'n5',
                    'label': 'Hydrogen Bonds',
                    'type': 'principle',
                    'position': {'x': 650, 'y': 450},
                    'notes': 'Weak bonds that hold base pairs together',
                    'tags': ['chemistry', 'forces']
                },
                {
                    'id': 'n6',
                    'label': 'Phosphate Backbone',
                    'type': 'concept',
                    'position': {'x': 200, 'y': 300},
                    'notes': 'Structural support of DNA molecule',
                    'tags': ['structure', 'chemistry']
                },
                {
                    'id': 'n7',
                    'label': 'DNA Replication',
                    'type': 'process',
                    'position': {'x': 500, 'y': 600},
                    'notes': 'Process of copying DNA before cell division',
                    'tags': ['process', 'cell cycle']
                },
                {
                    'id': 'n8',
                    'label': 'Transcription',
                    'type': 'process',
                    'position': {'x': 800, 'y': 350},
                    'notes': 'Creation of RNA from DNA template',
                    'tags': ['process', 'gene expression']
                },
                {
                    'id': 'n9',
                    'label': 'Translation',
                    'type': 'process',
                    'position': {'x': 900, 'y': 500},
                    'notes': 'Creation of proteins from RNA',
                    'tags': ['process', 'gene expression']
                },
                {
                    'id': 'n10',
                    'label': 'Protein Synthesis',
                    'type': 'process',
                    'position': {'x': 750, 'y': 600},
                    'notes': 'Overall process of making proteins',
                    'tags': ['process', 'cellular function']
                }
            ],
            'edges': [
                {'source': 'n1', 'target': 'n2', 'label': 'composed of'},
                {'source': 'n1', 'target': 'n3', 'label': 'forms'},
                {'source': 'n1', 'target': 'n4', 'label': 'contains'},
                {'source': 'n1', 'target': 'n6', 'label': 'supported by'},
                {'source': 'n1', 'target': 'n7', 'label': 'undergoes'},
                {'source': 'n1', 'target': 'n8', 'label': 'template for'},
                {'source': 'n4', 'target': 'n5', 'label': 'held by'},
                {'source': 'n8', 'target': 'n9', 'label': 'precedes'},
                {'source': 'n8', 'target': 'n10', 'label': 'part of'},
                {'source': 'n9', 'target': 'n10', 'label': 'part of'},
                {'source': 'n7', 'target': 'n6', 'label': 'involves'}
            ],
            'settings': {
                'layout': 'force-directed',
                'theme': 'biology',
                'edgeStyle': 'curved'
            }
        }
        
        # Add mind web to Firestore
        db.collection('ClassMindWebs').document(mind_web_data['id']).set(mind_web_data)
        
        # Create sample events
        events = [
            {
                'id': 'e1',
                'classId': 'sample-ap-biology',
                'title': 'Lab Session: DNA Extraction',
                'description': 'Hands-on laboratory session to extract DNA from plant cells. Students will learn proper lab techniques and observe DNA structure.',
                'type': 'lab',
                'location': 'Lab 203',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=1, hours=2.5),  # Tomorrow at 2:30 PM
                'endDate': datetime.datetime.now() + datetime.timedelta(days=1, hours=4),  # Tomorrow at 4:00 PM
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=7),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=7),
                'hostId': 'teacher123',
                'recurring': False,
                'attendees': [
                    {'userId': 'student1', 'status': 'going', 'responseTime': datetime.datetime.now() - datetime.timedelta(days=5)},
                    {'userId': 'student2', 'status': 'going', 'responseTime': datetime.datetime.now() - datetime.timedelta(days=4)},
                    {'userId': 'student3', 'status': 'maybe', 'responseTime': datetime.datetime.now() - datetime.timedelta(days=3)}
                ],
                'reminderSent': False,
                'attachments': [],
                'icon': '🧪',
                'color': '#4361ee'
            },
            {
                'id': 'e2',
                'classId': 'sample-ap-biology',
                'title': 'Quiz: Cell Structure',
                'description': 'In-class quiz covering cell organelles, membrane structure, and cellular transport mechanisms.',
                'type': 'quiz',
                'location': 'Classroom',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=5, hours=10.25),  # Friday during class
                'endDate': datetime.datetime.now() + datetime.timedelta(days=5, hours=11.75),  # Friday during class
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=10),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=10),
                'hostId': 'teacher123',
                'recurring': False,
                'attendees': [],
                'reminderSent': False,
                'attachments': [],
                'icon': '📝',
                'color': '#f72585'
            },
            {
                'id': 'e3',
                'classId': 'sample-ap-biology',
                'title': 'Study Group Session',
                'description': 'Student-organized study group to review protein synthesis and gene expression concepts.',
                'type': 'study_group',
                'location': 'Library Study Room B',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=6, hours=15),  # Saturday at 3:00 PM
                'endDate': datetime.datetime.now() + datetime.timedelta(days=6, hours=17),  # Saturday at 5:00 PM
                'createdBy': 'student3',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=3),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=3),
                'hostId': 'student3',
                'recurring': False,
                'attendees': [
                    {'userId': 'student3', 'status': 'going', 'responseTime': datetime.datetime.now() - datetime.timedelta(days=3)},
                    {'userId': 'student4', 'status': 'going', 'responseTime': datetime.datetime.now() - datetime.timedelta(days=2)},
                    {'userId': 'student5', 'status': 'going', 'responseTime': datetime.datetime.now() - datetime.timedelta(days=1)}
                ],
                'reminderSent': False,
                'attachments': [],
                'icon': '👥',
                'color': '#4cc9f0'
            },
            {
                'id': 'e4',
                'classId': 'sample-ap-biology',
                'title': 'Review Session: Molecular Biology',
                'description': 'Comprehensive review session before the unit exam, covering DNA structure, replication, transcription, and translation.',
                'type': 'review',
                'location': 'Classroom',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=12, hours=15),  # Next Friday at 3:00 PM
                'endDate': datetime.datetime.now() + datetime.timedelta(days=12, hours=16.5),  # Next Friday at 4:30 PM
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=5),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=5),
                'hostId': 'teacher123',
                'recurring': False,
                'attendees': [],
                'reminderSent': False,
                'attachments': [],
                'icon': '📚',
                'color': '#7209b7'
            },
            {
                'id': 'e5',
                'classId': 'sample-ap-biology',
                'title': 'Unit 1 Exam: Molecular Biology',
                'description': 'Comprehensive exam covering all topics from Unit 1: DNA structure, replication, transcription, translation, and gene regulation.',
                'type': 'exam',
                'location': 'Classroom',
                'startDate': datetime.datetime.now() + datetime.timedelta(days=19, hours=10.25),  # Next next Friday during class
                'endDate': datetime.datetime.now() + datetime.timedelta(days=19, hours=11.75),  # Next next Friday during class
                'createdBy': 'teacher123',
                'createdAt': datetime.datetime.now() - datetime.timedelta(days=14),
                'updatedAt': datetime.datetime.now() - datetime.timedelta(days=14),
                'hostId': 'teacher123',
                'recurring': False,
                'attendees': [],
                'reminderSent': False,
                'attachments': [],
                'icon': '📋',
                'color': '#e63946'
            }
        ]
        
        # Add events to Firestore
        for event in events:
            db.collection('Events').document(event['id']).set(event)
        
        print("Sample class data initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing sample class data: {str(e)}")

# Simple session check function
def require_login():
    if not session.get('logged_in') or not session.get('user_id'):
        return redirect('/login')
    return None

# Initialize sample data when the app starts
if is_firebase_available():
    init_sample_class_data()

@app.route('/')
def home():
    auth_check = require_login()
    if auth_check: return auth_check
    return render_template('index.html')

@app.route('/tree')
def tree():
    auth_check = require_login()
    if auth_check: return auth_check
    return render_template('tree-modular.html')

@app.route('/counselor')
def counselor():
    return render_template('counselor.html')

@app.route('/pmods')
def pmods():
    return render_template('pmods.html')

@app.route('/profile')
def profile():
    auth_check = require_login()
    if auth_check: return auth_check
    return render_template('profile.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    # Show login page for GET requests
    if request.method == 'GET':
        return render_template('login.html')
    
    # Process login for POST requests (form submission)
    # Note: This is a fallback, most login will be handled via the API
    if request.method == 'POST':
        # In a real application, you'd validate credentials here
        # and then redirect on success or show errors
        return redirect('/')

# Authentication API endpoints
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        remember = data.get('remember', False)
        
        # Check against Firebase Members collection
        if not is_firebase_available():
            return jsonify({"error": "Database unavailable"}), 500
            
        # Query members collection
        members_ref = db.collection('Members')
        query = members_ref.where('email', '==', email).limit(1)
        results = list(query.stream())
        
        if not results:
            return jsonify({"error": "User not found"}), 404
        
        user_doc = results[0]
        user_data = user_doc.to_dict()
        
        # Simple password check (in production, use hashing)
        if user_data.get('password') != password:
            return jsonify({"error": "Invalid password"}), 401
        
        # Set session data
        session['user_id'] = user_doc.id
        session['user_email'] = email
        session['logged_in'] = True
        
        # Update last login
        db.collection('Members').document(user_doc.id).update({
            'lastLogin': datetime.datetime.now()
        })
        
        # Return user data (same format as before)
        safe_user_data = {
            'id': user_doc.id,
            'email': user_data.get('email'),
            'first_name': user_data.get('first_name'),
            'last_name': user_data.get('last_name'),
            'username': user_data.get('username'),
            'profilePicUrl': user_data.get('profilePicUrl')
        }
        
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": safe_user_data
        })
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    # Clear session data
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route('/api/auth/user', methods=['GET'])
def get_current_user():
    # Check if user is logged in
    if not session.get('logged_in'):
        return jsonify({"error": "Not authenticated"}), 401
    
    # Return current user data
    user_id = session.get('user_id')
    
    # In a real app, you'd fetch this from the database
    try:
        from firebase_admin import firestore
        db = firestore.client()
        user_doc = db.collection('Members').document(user_id).get()
        
        if not user_doc.exists:
            session.clear()  # Clear invalid session
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        
        # Return non-sensitive user data
        safe_user_data = {
            'id': user_id,
            'email': user_data.get('email'),
            'first_name': user_data.get('first_name'),
            'last_name': user_data.get('last_name'),
            'username': user_data.get('username'),
            'profilePicUrl': user_data.get('profilePicUrl')
        }
        
        return jsonify({"user": safe_user_data})
    
    except Exception as e:
        print(f"Error retrieving user: {str(e)}")
        return jsonify({"error": "Server error"}), 500

@app.route('/users/<username>')
def user_profile(username):
    # In a real application, this would fetch the user's profile data from a database
    # based on the username parameter
    
    # Mock data for demonstration
    user_data = {
        'username': username,
        'full_name': 'Jane Smith',
        'first_name': 'Jane',
        'bio': 'High school junior interested in biology and chemistry. Planning to study medicine in college!',
        'education': 'Jefferson High School, Class of 2026',
        'is_friend': True,
        'is_self': False,
        'request_sent': False,
        'class_count': 6,
        'friend_count': 42,
        'connection_count': 156,
        'classes_visibility': 'friends',
        'web_visibility': 'friends',
        'friends_visibility': 'friends',
        'motivations_visibility': 'friends',
        'total_nodes': 89,
        'total_connections': 156,
        'key_insights': 12,
        
        'achievements': [
            {'name': 'Science Fair Gold Medal', 'icon': 'fas fa-medal'},
            {'name': 'Biology Olympiad Semifinalist', 'icon': 'fas fa-trophy'},
            {'name': 'Perfect Attendance', 'icon': 'fas fa-calendar-check'}
        ],
        
        'interests': ['Molecular Biology', 'Organic Chemistry', 'Medical Research', 'Piano', 'Volleyball'],
        
        'motivations': [
            {
                'title': 'Medical School Acceptance',
                'description': 'Get into a top 10 medical school to pursue a career in pediatric medicine.',
                'deadline': 'Fall 2027',
                'tags': ['Career', 'Academic', 'Long-term']
            },
            {
                'title': 'Complete Research Project',
                'description': 'Finish my research project on antibiotic resistance in bacteria.',
                'deadline': 'Spring 2025',
                'tags': ['Academic', 'Science', 'Short-term']
            }
        ],
        
        'recent_activities': [
            {
                'text': 'Added 5 new nodes to AP Biology web',
                'time': '2 days ago',
                'icon': 'fas fa-brain'
            },
            {
                'text': 'Connected "Cellular Respiration" to "Photosynthesis"',
                'time': '3 days ago',
                'icon': 'fas fa-link'
            },
            {
                'text': 'Completed Chemistry quiz with score 95%',
                'time': '1 week ago',
                'icon': 'fas fa-flask'
            }
        ],
        
        'classes': [
            {
                'id': '1',
                'name': 'AP Biology',
                'teacher': 'Mrs. Johnson',
                'period': 'Period 1',
                'nodes': 32,
                'connections': 48
            },
            {
                'id': '2',
                'name': 'AP Chemistry',
                'teacher': 'Mr. Roberts',
                'period': 'Period 3',
                'nodes': 28,
                'connections': 45
            },
            {
                'id': '3',
                'name': 'AP English Literature',
                'teacher': 'Ms. Garcia',
                'period': 'Period 4',
                'nodes': 15,
                'connections': 22
            },
            {
                'id': '4',
                'name': 'AP Calculus BC',
                'teacher': 'Dr. Williams',
                'period': 'Period 5',
                'nodes': 14,
                'connections': 41
            }
        ],
        
        'friends': [
            {
                'name': 'Alex Thompson',
                'username': 'alexthompson',
                'is_mutual': True
            },
            {
                'name': 'Emily Wilson',
                'username': 'emilyw',
                'is_mutual': True
            },
            {
                'name': 'Michael Chen',
                'username': 'michaelc',
                'is_mutual': False
            },
            {
                'name': 'Sophia Rodriguez',
                'username': 'sophiar',
                'is_mutual': True
            },
            {
                'name': 'David Kim',
                'username': 'davidk',
                'is_mutual': False
            },
            {
                'name': 'Olivia Parker',
                'username': 'oliviap',
                'is_mutual': True
            }
        ]
    }
    
    return render_template('user_profile.html', **user_data)

@app.route('/schedule')
def schedule():
    # In a real application, this would pull data from a database
    # Mock data for schedule demonstration
    today_tasks = [
        {
            'id': 1,
            'time': '08:00 AM - 09:30 AM',
            'title': 'AP Calculus',
            'category': 'class',
            'location': 'Room 203',
            'priority': 'high'
        },
        {
            'id': 2,
            'time': '09:45 AM - 11:15 AM',
            'title': 'Physics Lab',
            'category': 'lab',
            'location': 'Science Building, Lab 4',
            'priority': 'high'
        },
        {
            'id': 3,
            'time': '11:30 AM - 12:30 PM',
            'title': 'Lunch Break',
            'category': 'break',
            'location': 'Cafeteria',
            'priority': 'medium'
        },
        {
            'id': 4,
            'time': '12:45 PM - 02:15 PM',
            'title': 'English Literature',
            'category': 'class',
            'location': 'Room 105',
            'priority': 'medium'
        },
        {
            'id': 5,
            'time': '02:30 PM - 03:30 PM',
            'title': 'Study Session - Chemistry',
            'category': 'study',
            'location': 'Library',
            'priority': 'high'
        },
        {
            'id': 6,
            'time': '04:00 PM - 05:30 PM',
            'title': 'Robotics Club',
            'category': 'extracurricular',
            'location': 'Tech Lab',
            'priority': 'medium'
        }
    ]
    
    upcoming_events = [
        {
            'id': 101,
            'date': 'April 18, 2025',
            'time': '03:30 PM - 05:00 PM',
            'title': 'Biology Study Group',
            'category': 'study_group',
            'location': 'Science Building, Room 302',
            'rsvp_count': 12,
            'host': 'Jane Smith'
        },
        {
            'id': 102,
            'date': 'April 19, 2025',
            'time': '01:00 PM - 02:30 PM',
            'title': 'Math Competition Prep',
            'category': 'study_session',
            'location': 'Math Department, Room 201',
            'rsvp_count': 8,
            'host': 'Prof. Johnson'
        },
        {
            'id': 103,
            'date': 'April 20, 2025',
            'time': '11:00 AM - 12:30 PM',
            'title': 'SciGames: History Trivia Challenge',
            'category': 'scigame',
            'location': 'Virtual Meeting Room',
            'rsvp_count': 24,
            'host': 'History Department'
        },
        {
            'id': 104,
            'date': 'April 22, 2025',
            'time': '04:00 PM - 05:00 PM',
            'title': 'Chemistry Tutoring Session',
            'category': 'tutoring',
            'location': 'Chemistry Lab',
            'rsvp_count': 5,
            'host': 'David Wilson (TA)'
        }
    ]
    
    return render_template('schedule.html', today_tasks=today_tasks, upcoming_events=upcoming_events)

@app.route('/envision/<motivator_id>')
def envision(motivator_id):
    # In a real application, you would fetch motivator data from a database
    # For now, we'll use mock data based on the motivator_id
    
    # This is a simple dictionary to simulate different motivator data
    motivator_samples = {
        "1": {
            'title': 'Medical School Acceptance',
            'description': 'Becoming a doctor to help others and make a difference in healthcare',
            'deadline': 'Fall 2025',
            'tags': ['Academic', 'Career', 'Healthcare']
        },
        "2": {
            'title': 'Math Competition Winner',
            'description': 'Winning the regional mathematics olympiad',
            'deadline': 'Spring 2025',
            'tags': ['Academic', 'Competition', 'Mathematics']
        },
        "3": {
            'title': 'Computer Science Internship',
            'description': 'Securing an internship at a top tech company',
            'deadline': 'Summer 2025',
            'tags': ['Career', 'Technology', 'Professional Development']
        }
    }
    
    # Default data for any motivator
    default_data = {
        'title': 'New Goal',
        'description': 'Your path to success',
        'deadline': 'Ongoing',
        'tags': ['Personal Growth']
    }
    
    # Get motivator data if it exists in our samples, otherwise use default
    motivator_data = motivator_samples.get(motivator_id, default_data)
    
    return render_template('envision.html', motivator_id=motivator_id, **motivator_data)

@app.route('/class/<class_id>')
def class_page(class_id):
    # In a real application, you would fetch class data from a database
    # For now, we'll use mock data based on the class_id which could be a node ID or name
    
    # This is a simple dictionary to simulate different class data based on ID
    class_data_samples = {
        "1": {
            'class_name': 'AP Biology',
            'class_description': 'Advanced Placement Biology - Mrs. Johnson, Period 3'
        },
        "2": {
            'class_name': 'AP Chemistry',
            'class_description': 'Advanced Placement Chemistry - Mr. Stevens, Period 5'
        },
        "3": {
            'class_name': 'World History',
            'class_description': 'World History - Ms. Garcia, Period 2'
        }
    }
    
    # Default data for any class
    default_data = {
        'class_name': class_id,
        'class_description': f'Class Information for {class_id}'
    }
    
    # Get class data if it exists in our samples, otherwise use a default
    class_data = class_data_samples.get(class_id, default_data)
    
    # Redirect to the new class dashboard page with the class data
    return redirect(f'/class_dashboard/{class_id}')

@app.route('/class_dashboard/<class_id>')
def class_dashboard(class_id):
    """Render the class dashboard with data from the database."""
    auth_check = require_login()
    if auth_check: return auth_check
    if not is_firebase_available():
        # If Firebase is not available, use mock data
        class_data_samples = {
            "1": {
                'class_name': 'AP Biology',
                'class_description': 'Advanced Placement Biology - Mrs. Johnson, Period 3'
            },
            "2": {
                'class_name': 'AP Chemistry',
                'class_description': 'Advanced Placement Chemistry - Mr. Stevens, Period 5'
            },
            "3": {
                'class_name': 'World History',
                'class_description': 'World History - Ms. Garcia, Period 2'
            }
        }
        
        # Default data for any class
        default_data = {
            'class_name': class_id,
            'class_description': f'Class Information for {class_id}'
        }
        
        # Get class data if it exists in our samples, otherwise use a default
        class_data = class_data_samples.get(class_id, default_data)
        
        return render_template('class_dashboard.html', **class_data)
    
    try:
        # Try to fetch class data from Firestore
        if class_id.isdigit():
            # If class_id is a number, treat it as a sample class ID
            # For compatibility with existing routes
            sample_class_ref = db.collection('Classes').document('sample-ap-biology')
        else:
            # Otherwise, use the class_id as the document ID
            sample_class_ref = db.collection('Classes').document(class_id)
        
        class_doc = sample_class_ref.get()
        
        if class_doc.exists:
            class_data = class_doc.to_dict()
            
            # Format data for template
            template_data = {
                'class_name': class_data.get('name', 'Class'),
                'class_description': class_data.get('description', 'No description available'),
                'class_id': class_id,
                'class_data': class_data  # Pass the full class data object for JavaScript
            }
            
            return render_template('class_dashboard.html', **template_data)
        else:
            # If class not found in database, use default data
            return render_template('class_dashboard.html', 
                                  class_name='Class Not Found',
                                  class_description='The requested class could not be found.',
                                  class_id=class_id)
    
    except Exception as e:
        print(f"Error fetching class data: {str(e)}")
        return render_template('class_dashboard.html',
                              class_name='Error',
                              class_description=f'An error occurred: {str(e)}',
                              class_id=class_id)

@app.route('/collab')
def collab():
    auth_check = require_login()
    if auth_check: return auth_check
    return render_template('collab.html')

@app.route('/dashboard')
def dashboard():
    auth_check = require_login()
    if auth_check: return auth_check
    return render_template('dashboard.html')

@app.route('/collab/<project_id>')
def project_collab(project_id):
    # In a real application, you would fetch project data from a database
    # For now, we'll use mock data based on the project_id
    
    # This is a simple dictionary to simulate different project data
    project_samples = {
        "1": {
            'title': 'Research Paper on Climate Change',
            'description': 'Collaborative research project on the effects of climate change on local ecosystems',
            'due_date': '2024-06-15',
            'status': 'in-progress',
            'progress': 45
        },
        "2": {
            'title': 'Science Fair Project',
            'description': 'Group project for the annual science fair competition',
            'due_date': '2024-05-30',
            'status': 'planning',
            'progress': 20
        },
        "3": {
            'title': 'History Documentary',
            'description': 'Creating a documentary on local historical events',
            'due_date': '2024-07-10',
            'status': 'in-progress',
            'progress': 35
        }
    }
    
    # Default data for any project
    default_data = {
        'title': 'New Project',
        'description': 'Collaborative project',
        'due_date': '2024-06-30',
        'status': 'planning',
        'progress': 0
    }
    
    # Get project data if it exists in our samples, otherwise use default
    project_data = project_samples.get(project_id, default_data)
    
    return render_template('collab.html', project_id=project_id, **project_data)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    # This will display the signup form initially and process form submission
    return render_template('signup.html')

@app.route('/api/send-verification-code', methods=['POST'])
def send_verification_code():
    """Send verification code to email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        print(f"Received verification code request for email: {email}")
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Generate 6-digit verification code
        verification_code = str(random.randint(100000, 999999))
        
        print(f"Generated verification code: {verification_code}")
        
        # Store code with timestamp (expires in 10 minutes)
        verification_codes[email] = {
            'code': verification_code,
            'timestamp': datetime.datetime.now(),
            'expires_at': datetime.datetime.now() + datetime.timedelta(minutes=10)
        }
        
        print(f"Stored verification code for {email}")
        
        # Send email
        print(f"Attempting to send email to {email}")
        if send_verification_email(email, verification_code):
            print(f"Email sent successfully to {email}")
            return jsonify({"message": "Verification code sent successfully"}), 200
        else:
            print(f"Failed to send email to {email}")
            return jsonify({"error": "Failed to send verification email"}), 500
            
    except Exception as e:
        print(f"Error in send_verification_code: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/verify-code', methods=['POST'])
def verify_code():
    """Verify the email verification code"""
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return jsonify({"error": "Email and code are required"}), 400
        
        # Check if code exists for this email
        if email not in verification_codes:
            return jsonify({"error": "No verification code found for this email"}), 400
        
        stored_data = verification_codes[email]
        
        # Check if code has expired
        if datetime.datetime.now() > stored_data['expires_at']:
            del verification_codes[email]  # Clean up expired code
            return jsonify({"error": "Verification code has expired"}), 400
        
        # Check if code matches
        if stored_data['code'] != code:
            return jsonify({"error": "Invalid verification code"}), 400
        
        # Code is valid, remove it from storage
        del verification_codes[email]
        
        return jsonify({"message": "Email verified successfully"}), 200
        
    except Exception as e:
        print(f"Error in verify_code: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/signup-complete', methods=['POST'])
def signup_complete():
    """Complete the signup process after email verification"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Create user data
        user_data = {
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'email': data['email'],
            'username': data.get('username', ''),
            'password': data['password'],  # In production, hash this password
            'email_verified': True,
            'createdAt': datetime.datetime.now(),
            'updatedAt': datetime.datetime.now(),
            'userType': 'student',
            'grade': data.get('grade', ''),
            'profilePicUrl': '',
            'bio': '',
            'friends': [],  # Initialize empty friends list
            'friendRequests': {  # Initialize empty friend requests structure
                'incoming': [],
                'outgoing': []
            },
            'classes': [],  # Initialize empty classes list
            'settings': {
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
        }
        
        # Save user to database
        if is_firebase_available():
            doc_ref = db.collection('Members').document()
            doc_ref.set(user_data)
            user_id = doc_ref.id
        else:
            # Fallback when Firebase is not available
            user_id = str(uuid.uuid4())
        
        # Store user ID in session
        session['user_id'] = user_id
        session['user_email'] = data['email']
        session['user_name'] = f"{data['first_name']} {data['last_name']}"
        
        return jsonify({
            "message": "Account created successfully",
            "user_id": user_id,
            "redirect_url": "/success"
        }), 200
        
    except Exception as e:
        print(f"Error in signup_complete: {e}")
        return jsonify({"error": "Failed to create account"}), 500

@app.route('/success')
def success():
    """Success page after signup completion"""
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('signup'))
    
    return render_template('success.html', 
                         user_name=session.get('user_name', 'User'),
                         user_email=session.get('user_email', ''))

@app.route('/onboarding', methods=['GET', 'POST'])
def onboarding():
    return render_template('onboarding.html')

@app.route('/verify-email/<token>')
def verify_email(token):
    # In a real app, this would verify the token and mark the email as verified
    # For now, we'll just redirect to the first onboarding step
    return render_template('email_verified.html')

# NHS Pages
@app.route('/nhs')
def nhs_home():
    return render_template('nhs/index.html')

@app.route('/nhs/admin')
def nhs_admin():
    return render_template('nhs/admin.html')

@app.route('/nhs/members')
def nhs_members():
    return render_template('nhs/members.html')

@app.route('/nhs/students')
def nhs_students():
    return render_template('nhs/students.html')

@app.route('/nhs/teachers')
def nhs_teachers():
    return render_template('nhs/teachers.html')

@app.route('/nhs/credits', methods=['GET', 'POST'])
def nhs_credits():
    # In a real application, this would handle credit submission and approval
    return render_template('nhs/credits.html')

@app.route('/nhs/tutoring', methods=['GET', 'POST'])
def nhs_tutoring():
    # In a real application, this would handle tutoring session registration
    return render_template('nhs/tutoring.html')

@app.route('/mindweb/<test_id>')
def mindweb(test_id):
    # In a real application, you would fetch test data from a database
    # For now, we'll use mock data based on the test_id
    
    # This is a simple dictionary to simulate different test data
    test_samples = {
        "1": {
            'title': 'AP Calculus Midterm',
            'subject': 'Mathematics',
            'topics': ['Limits', 'Derivatives', 'Integrals', 'Applications'],
            'study_goal': 'Master calculus concepts for the AP exam'
        },
        "2": {
            'title': 'Biology Final',
            'subject': 'Biology',
            'topics': ['Cell Structure', 'Genetics', 'Evolution', 'Ecology'],
            'study_goal': 'Understand key biological processes and their relationships'
        },
        "3": {
            'title': 'History Midterm',
            'subject': 'History',
            'topics': ['Ancient Civilizations', 'Middle Ages', 'Renaissance', 'Modern Era'],
            'study_goal': 'Connect historical events and understand their significance'
        }
    }
    
    # Default data for any test
    default_data = {
        'title': 'Test Study Guide',
        'subject': 'General',
        'topics': ['Topic 1', 'Topic 2', 'Topic 3'],
        'study_goal': 'Understand key concepts and their relationships'
    }
    
    # Get test data if it exists in our samples, otherwise use default
    test_data = test_samples.get(test_id, default_data)
    
    return render_template('mindweb.html', test_id=test_id, **test_data)

@app.route('/about')
def about():
    """About Us page with mission statement and team information"""
    return render_template('about.html')

@app.route('/motivation')
def motivation_stream():
    return render_template('motivation_stream.html')

# NHS API Endpoints for Database Storage

@app.route('/api/nhs/credits/submit', methods=['POST'])
def submit_nhs_credit():
    """Submit NHS service credit for review"""
    auth_check = require_login()
    if auth_check: 
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        # Validate required fields
        required_fields = ['service_type', 'activity_title', 'date', 'hours', 'description', 'supervisor', 'supervisor_email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field.replace('_', ' ').title()} is required"}), 400
        
        # Create credit submission document
        credit_data = {
            'id': str(uuid.uuid4()),
            'student_id': user_id,
            'service_type': data['service_type'],
            'activity_title': data['activity_title'],
            'date': data['date'],
            'hours': float(data['hours']),
            'location': data.get('location', ''),
            'description': data['description'],
            'supervisor': data['supervisor'],
            'supervisor_email': data['supervisor_email'],
            'status': 'pending',
            'submitted_at': datetime.datetime.now(),
            'reviewed_at': None,
            'reviewed_by': None,
            'reviewer_comments': '',
            'created_at': datetime.datetime.now(),
            'updated_at': datetime.datetime.now()
        }
        
        # Save to database
        if is_firebase_available():
            db.collection('NHS_Credits').document(credit_data['id']).set(credit_data)
        
        # Update student's NHS statistics
        if is_firebase_available():
            student_ref = db.collection('Members').document(user_id)
            student_doc = student_ref.get()
            
            if student_doc.exists:
                student_data = student_doc.to_dict()
                nhs_stats = student_data.get('nhs_stats', {
                    'total_credits': 0,
                    'pending_credits': 0,
                    'approved_credits': 0,
                    'rejected_credits': 0,
                    'credits_by_type': {}
                })
                
                # Update pending credits
                nhs_stats['pending_credits'] += credit_data['hours']
                
                # Update credits by type
                service_type = credit_data['service_type']
                if service_type not in nhs_stats['credits_by_type']:
                    nhs_stats['credits_by_type'][service_type] = {'pending': 0, 'approved': 0}
                nhs_stats['credits_by_type'][service_type]['pending'] += credit_data['hours']
                
                # Update student document
                student_ref.update({
                    'nhs_stats': nhs_stats,
                    'updated_at': datetime.datetime.now()
                })
        
        return jsonify({
            "success": True,
            "message": "Credit submission successful",
            "credit_id": credit_data['id']
        }), 200
        
    except Exception as e:
        print(f"Error submitting NHS credit: {str(e)}")
        return jsonify({"error": "Failed to submit credit"}), 500

@app.route('/api/nhs/credits/review', methods=['POST'])
def review_nhs_credit():
    """Review and approve/reject NHS credit submission (teachers only)"""
    auth_check = require_login()
    if auth_check:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        # Check if user is a teacher/admin
        if is_firebase_available():
            user_ref = db.collection('Members').document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return jsonify({"error": "User not found"}), 404
            
            user_data = user_doc.to_dict()
            if user_data.get('userType') not in ['teacher', 'admin']:
                return jsonify({"error": "Insufficient permissions"}), 403
        
        # Validate required fields
        required_fields = ['credit_id', 'action', 'comments']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400
        
        credit_id = data['credit_id']
        action = data['action']  # 'approve' or 'reject'
        comments = data['comments']
        
        if action not in ['approve', 'reject']:
            return jsonify({"error": "Invalid action"}), 400
        
        # Update credit document
        if is_firebase_available():
            credit_ref = db.collection('NHS_Credits').document(credit_id)
            credit_doc = credit_ref.get()
            
            if not credit_doc.exists:
                return jsonify({"error": "Credit submission not found"}), 404
            
            credit_data = credit_doc.to_dict()
            
            # Update credit status
            update_data = {
                'status': 'approved' if action == 'approve' else 'rejected',
                'reviewed_at': datetime.datetime.now(),
                'reviewed_by': user_id,
                'reviewer_comments': comments,
                'updated_at': datetime.datetime.now()
            }
            
            credit_ref.update(update_data)
            
            # Update student's NHS statistics
            student_id = credit_data['student_id']
            hours = credit_data['hours']
            service_type = credit_data['service_type']
            
            student_ref = db.collection('Members').document(student_id)
            student_doc = student_ref.get()
            
            if student_doc.exists:
                student_data = student_doc.to_dict()
                nhs_stats = student_data.get('nhs_stats', {
                    'total_credits': 0,
                    'pending_credits': 0,
                    'approved_credits': 0,
                    'rejected_credits': 0,
                    'credits_by_type': {}
                })
                
                # Remove from pending
                nhs_stats['pending_credits'] = max(0, nhs_stats['pending_credits'] - hours)
                
                # Add to appropriate category
                if action == 'approve':
                    nhs_stats['approved_credits'] += hours
                    nhs_stats['total_credits'] += hours
                else:
                    nhs_stats['rejected_credits'] += hours
                
                # Update credits by type
                if service_type in nhs_stats['credits_by_type']:
                    nhs_stats['credits_by_type'][service_type]['pending'] = max(0, 
                        nhs_stats['credits_by_type'][service_type]['pending'] - hours)
                    
                    if action == 'approve':
                        nhs_stats['credits_by_type'][service_type]['approved'] += hours
                
                # Update student document
                student_ref.update({
                    'nhs_stats': nhs_stats,
                    'updated_at': datetime.datetime.now()
                })
        
        return jsonify({
            "success": True,
            "message": f"Credit {action}d successfully"
        }), 200
        
    except Exception as e:
        print(f"Error reviewing NHS credit: {str(e)}")
        return jsonify({"error": "Failed to review credit"}), 500

@app.route('/api/nhs/credits/list', methods=['GET'])
def list_nhs_credits():
    """Get NHS credits for a user or all credits for teachers"""
    auth_check = require_login()
    if auth_check:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        user_id = session.get('user_id')
        
        # Get query parameters
        student_id = request.args.get('student_id')
        status = request.args.get('status')  # pending, approved, rejected
        limit = int(request.args.get('limit', 50))
        
        if not is_firebase_available():
            return jsonify({"credits": []}), 200
        
        # Check user permissions
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        user_type = user_data.get('userType', 'student')
        
        # Build query
        query = db.collection('NHS_Credits')
        
        # If student, only show their credits
        if user_type == 'student':
            query = query.where('student_id', '==', user_id)
        # If teacher/admin requesting specific student
        elif student_id:
            query = query.where('student_id', '==', student_id)
        
        # Filter by status if specified
        if status:
            query = query.where('status', '==', status)
        
        # Order by submission date (newest first) and limit
        query = query.order_by('submitted_at', direction='DESCENDING').limit(limit)
        
        # Execute query
        credits = []
        for doc in query.stream():
            credit_data = doc.to_dict()
            credit_data['id'] = doc.id
            
            # Get student name for teacher view
            if user_type in ['teacher', 'admin'] and credit_data.get('student_id'):
                student_ref = db.collection('Members').document(credit_data['student_id'])
                student_doc = student_ref.get()
                if student_doc.exists:
                    student_data = student_doc.to_dict()
                    credit_data['student_name'] = f"{student_data.get('first_name', '')} {student_data.get('last_name', '')}"
                    credit_data['student_email'] = student_data.get('email', '')
            
            credits.append(credit_data)
        
        return jsonify({
            "success": True,
            "credits": credits
        }), 200
        
    except Exception as e:
        print(f"Error listing NHS credits: {str(e)}")
        return jsonify({"error": "Failed to fetch credits"}), 500

@app.route('/api/nhs/events/create', methods=['POST'])
def create_nhs_event():
    """Create NHS event (teachers/admins only)"""
    auth_check = require_login()
    if auth_check:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        # Check if user is a teacher/admin
        if is_firebase_available():
            user_ref = db.collection('Members').document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return jsonify({"error": "User not found"}), 404
            
            user_data = user_doc.to_dict()
            if user_data.get('userType') not in ['teacher', 'admin']:
                return jsonify({"error": "Insufficient permissions"}), 403
        
        # Validate required fields
        required_fields = ['title', 'description', 'date', 'time', 'location', 'event_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field.replace('_', ' ').title()} is required"}), 400
        
        # Create event document
        event_data = {
            'id': str(uuid.uuid4()),
            'title': data['title'],
            'description': data['description'],
            'date': data['date'],
            'time': data['time'],
            'location': data['location'],
            'event_type': data['event_type'],  # community_service, fundraising, meeting, etc.
            'max_participants': data.get('max_participants'),
            'credit_hours': data.get('credit_hours', 0),
            'created_by': user_id,
            'created_at': datetime.datetime.now(),
            'updated_at': datetime.datetime.now(),
            'status': 'active',
            'participants': [],
            'waitlist': []
        }
        
        # Save to database
        if is_firebase_available():
            db.collection('NHS_Events').document(event_data['id']).set(event_data)
        
        return jsonify({
            "success": True,
            "message": "Event created successfully",
            "event_id": event_data['id']
        }), 200
        
    except Exception as e:
        print(f"Error creating NHS event: {str(e)}")
        return jsonify({"error": "Failed to create event"}), 500

@app.route('/api/nhs/events/signup', methods=['POST'])
def signup_nhs_event():
    """Sign up for NHS event"""
    auth_check = require_login()
    if auth_check:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        event_id = data.get('event_id')
        
        if not event_id:
            return jsonify({"error": "Event ID is required"}), 400
        
        if not is_firebase_available():
            return jsonify({"error": "Database unavailable"}), 500
        
        # Get event document
        event_ref = db.collection('NHS_Events').document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({"error": "Event not found"}), 404
        
        event_data = event_doc.to_dict()
        participants = event_data.get('participants', [])
        waitlist = event_data.get('waitlist', [])
        max_participants = event_data.get('max_participants')
        
        # Check if already signed up
        if user_id in participants or user_id in waitlist:
            return jsonify({"error": "Already signed up for this event"}), 400
        
        # Add to participants or waitlist
        if max_participants and len(participants) >= max_participants:
            waitlist.append({
                'user_id': user_id,
                'signed_up_at': datetime.datetime.now()
            })
            message = "Added to waitlist"
        else:
            participants.append({
                'user_id': user_id,
                'signed_up_at': datetime.datetime.now(),
                'status': 'registered'
            })
            message = "Successfully signed up"
        
        # Update event document
        event_ref.update({
            'participants': participants,
            'waitlist': waitlist,
            'updated_at': datetime.datetime.now()
        })
        
        return jsonify({
            "success": True,
            "message": message
        }), 200
        
    except Exception as e:
        print(f"Error signing up for NHS event: {str(e)}")
        return jsonify({"error": "Failed to sign up for event"}), 500

@app.route('/api/nhs/members/stats', methods=['GET'])
def get_nhs_member_stats():
    """Get NHS member statistics"""
    auth_check = require_login()
    if auth_check:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        user_id = session.get('user_id')
        
        if not is_firebase_available():
            # Return mock data if database unavailable
            return jsonify({
                "success": True,
                "stats": {
                    "total_credits": 18.5,
                    "pending_credits": 3.0,
                    "approved_credits": 18.5,
                    "rejected_credits": 2.0,
                    "credits_by_type": {
                        "community": {"approved": 8.5, "pending": 1.0},
                        "tutoring": {"approved": 6.0, "pending": 2.0},
                        "leadership": {"approved": 4.0, "pending": 0.0}
                    },
                    "rank": 12,
                    "goal": 25
                }
            }), 200
        
        # Get user's NHS statistics
        user_ref = db.collection('Members').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        nhs_stats = user_data.get('nhs_stats', {
            'total_credits': 0,
            'pending_credits': 0,
            'approved_credits': 0,
            'rejected_credits': 0,
            'credits_by_type': {}
        })
        
        return jsonify({
            "success": True,
            "stats": nhs_stats
        }), 200
        
    except Exception as e:
        print(f"Error getting NHS member stats: {str(e)}")
        return jsonify({"error": "Failed to fetch stats"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=8080)