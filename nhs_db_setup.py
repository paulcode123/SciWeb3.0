#!/usr/bin/env python3
"""
NHS Database Setup
Complete database schema and sample data for NHS system
"""

import datetime
import uuid
from db_init import db, is_firebase_available

def init_nhs_database():
    """Initialize complete NHS database structure with sample data"""
    if not is_firebase_available():
        print("Firebase not available. NHS database not initialized.")
        return False
    
    try:
        print("Initializing NHS database...")
        
        # 1. Create NHS Settings
        nhs_settings = {
            'id': 'nhs_main_settings',
            'school_name': 'Jefferson High School',
            'advisor_name': 'Ms. Sarah Johnson',
            'advisor_email': 'sjohnson@jefferson.edu',
            'advisor_room': 'Room 205',
            'gpa_requirement': 3.5,
            'service_hours_required': 25,
            'meeting_schedule': 'Third Thursday of each month, 3:30 PM',
            'application_deadline': '2025-03-15',
            'induction_date': '2025-05-05',
            'updated_at': datetime.datetime.now()
        }
        db.collection('NHS_Settings').document('main').set(nhs_settings)
        
        # 2. Create NHS Members
        nhs_members = [
            {
                'id': 'nhs_member_001',
                'student_id': 'student1',
                'first_name': 'Emma',
                'last_name': 'Thompson',
                'email': 'ethompson@jefferson.edu',
                'gpa': 3.8,
                'induction_date': datetime.datetime(2024, 5, 15),
                'status': 'active',
                'position': 'President',
                'service_hours_completed': 32,
                'service_hours_required': 25,
                'meetings_attended': 8,
                'total_meetings': 9,
                'graduation_year': 2026,
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            },
            {
                'id': 'nhs_member_002',
                'student_id': 'student2',
                'first_name': 'James',
                'last_name': 'Wilson',
                'email': 'jwilson@jefferson.edu',
                'gpa': 3.7,
                'induction_date': datetime.datetime(2024, 5, 15),
                'status': 'active',
                'position': 'Vice President',
                'service_hours_completed': 28,
                'service_hours_required': 25,
                'meetings_attended': 9,
                'total_meetings': 9,
                'graduation_year': 2026,
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            },
            {
                'id': 'nhs_member_003',
                'student_id': 'student3',
                'first_name': 'Sophia',
                'last_name': 'Lee',
                'email': 'slee@jefferson.edu',
                'gpa': 3.9,
                'induction_date': datetime.datetime(2024, 5, 15),
                'status': 'active',
                'position': 'Secretary',
                'service_hours_completed': 26,
                'service_hours_required': 25,
                'meetings_attended': 7,
                'total_meetings': 9,
                'graduation_year': 2026,
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
        ]
        
        for member in nhs_members:
            db.collection('NHS_Members').document(member['id']).set(member)
        
        # 3. Create NHS Service Records
        service_records = [
            {
                'id': 'service_001',
                'member_id': 'nhs_member_001',
                'student_name': 'Emma Thompson',
                'activity_title': 'City Food Bank Volunteer',
                'service_type': 'community_service',
                'date': '2025-04-20',
                'hours': 4.0,
                'location': 'Downtown Food Bank',
                'description': 'Helped sort and distribute food to families in need. Assisted with inventory management.',
                'supervisor_name': 'Maria Rodriguez',
                'supervisor_email': 'mrodriguez@cityfoodbank.org',
                'supervisor_phone': '555-0123',
                'status': 'approved',
                'submitted_at': datetime.datetime.now() - datetime.timedelta(days=5),
                'approved_at': datetime.datetime.now() - datetime.timedelta(days=2),
                'approved_by': 'advisor_001',
                'verification_code': str(uuid.uuid4())[:8].upper()
            },
            {
                'id': 'service_002',
                'member_id': 'nhs_member_001',
                'student_name': 'Emma Thompson',
                'activity_title': 'Math Tutoring Session',
                'service_type': 'school_service',
                'date': '2025-04-15',
                'hours': 2.0,
                'location': 'School Library',
                'description': 'Tutored sophomore students in Algebra II. Helped with homework and test preparation.',
                'supervisor_name': 'Mr. David Kim',
                'supervisor_email': 'dkim@jefferson.edu',
                'supervisor_phone': '555-0124',
                'status': 'approved',
                'submitted_at': datetime.datetime.now() - datetime.timedelta(days=10),
                'approved_at': datetime.datetime.now() - datetime.timedelta(days=7),
                'approved_by': 'advisor_001',
                'verification_code': str(uuid.uuid4())[:8].upper()
            },
            {
                'id': 'service_003',
                'member_id': 'nhs_member_002',
                'student_name': 'James Wilson',
                'activity_title': 'Community Garden Project',
                'service_type': 'community_service',
                'date': '2025-04-10',
                'hours': 3.5,
                'location': 'Jefferson Community Garden',
                'description': 'Planted vegetables and maintained garden beds. Educated visitors about sustainable gardening.',
                'supervisor_name': 'Lisa Chen',
                'supervisor_email': 'lchen@communitygarden.org',
                'supervisor_phone': '555-0125',
                'status': 'pending',
                'submitted_at': datetime.datetime.now() - datetime.timedelta(days=3),
                'approved_at': None,
                'approved_by': None,
                'verification_code': str(uuid.uuid4())[:8].upper()
            }
        ]
        
        for record in service_records:
            db.collection('NHS_Service_Records').document(record['id']).set(record)
        
        # 4. Create NHS Events
        nhs_events = [
            {
                'id': 'event_001',
                'title': 'NHS Induction Ceremony',
                'description': 'Welcome new NHS members and celebrate their achievements in scholarship, service, leadership, and character.',
                'date': '2025-05-05',
                'time': '7:00 PM - 9:00 PM',
                'location': 'School Auditorium',
                'event_type': 'ceremony',
                'max_participants': 100,
                'service_hours_available': 0,
                'organizer': 'NHS Advisor',
                'requirements': 'Formal attire required',
                'status': 'upcoming',
                'created_at': datetime.datetime.now(),
                'participants': []
            },
            {
                'id': 'event_002',
                'title': 'Community Clean-Up Day',
                'description': 'Join NHS members for a community service project cleaning up local parks and public spaces.',
                'date': '2025-04-25',
                'time': '9:00 AM - 12:00 PM',
                'location': 'Central Park',
                'event_type': 'service',
                'max_participants': 30,
                'service_hours_available': 3,
                'organizer': 'NHS Service Committee',
                'requirements': 'Work clothes, closed-toe shoes, water bottle',
                'status': 'upcoming',
                'created_at': datetime.datetime.now(),
                'participants': ['nhs_member_001', 'nhs_member_002']
            },
            {
                'id': 'event_003',
                'title': 'Blood Drive Support',
                'description': 'Assist the American Red Cross with registration and support during the school blood drive.',
                'date': '2025-05-10',
                'time': '10:00 AM - 3:00 PM',
                'location': 'School Gymnasium',
                'event_type': 'service',
                'max_participants': 15,
                'service_hours_available': 5,
                'organizer': 'NHS Health Committee',
                'requirements': 'Training session required (April 30)',
                'status': 'upcoming',
                'created_at': datetime.datetime.now(),
                'participants': []
            }
        ]
        
        for event in nhs_events:
            db.collection('NHS_Events').document(event['id']).set(event)
        
        # 5. Create NHS Applications
        nhs_applications = [
            {
                'id': 'app_001',
                'student_id': 'student4',
                'first_name': 'Michael',
                'last_name': 'Brown',
                'email': 'mbrown@jefferson.edu',
                'gpa': 3.6,
                'graduation_year': 2026,
                'personal_statement': 'I am passionate about serving my community and believe that NHS will provide me with opportunities to make a meaningful impact...',
                'service_activities': [
                    'Volunteer at local animal shelter (20 hours)',
                    'Tutored middle school students (15 hours)',
                    'Participated in school fundraisers'
                ],
                'leadership_positions': [
                    'Student Council Representative',
                    'Science Club Vice President'
                ],
                'teacher_recommendations': [
                    {'teacher': 'Ms. Garcia', 'subject': 'English', 'submitted': True},
                    {'teacher': 'Mr. Thompson', 'subject': 'Biology', 'submitted': True}
                ],
                'status': 'under_review',
                'submitted_at': datetime.datetime.now() - datetime.timedelta(days=15),
                'reviewed_by': None,
                'decision_date': None,
                'notes': 'Strong academic record and community involvement'
            }
        ]
        
        for application in nhs_applications:
            db.collection('NHS_Applications').document(application['id']).set(application)
        
        # 6. Create NHS Tutoring Sessions
        tutoring_sessions = [
            {
                'id': 'tutor_001',
                'tutor_id': 'nhs_member_001',
                'tutor_name': 'Emma Thompson',
                'student_name': 'Alex Johnson',
                'student_email': 'ajohnson@jefferson.edu',
                'subject': 'Mathematics',
                'specific_topic': 'Algebra II - Quadratic Functions',
                'date': '2025-04-22',
                'time': '3:30 PM - 4:30 PM',
                'location': 'Library Study Room 2',
                'status': 'scheduled',
                'session_type': 'one_on_one',
                'notes': 'Student needs help with graphing quadratic functions',
                'created_at': datetime.datetime.now()
            },
            {
                'id': 'tutor_002',
                'tutor_id': 'nhs_member_002',
                'tutor_name': 'James Wilson',
                'student_name': 'Sarah Davis',
                'student_email': 'sdavis@jefferson.edu',
                'subject': 'Biology',
                'specific_topic': 'Cell Structure and Function',
                'date': '2025-04-24',
                'time': '2:45 PM - 3:45 PM',
                'location': 'Science Lab 1',
                'status': 'scheduled',
                'session_type': 'one_on_one',
                'notes': 'Preparing for upcoming test on cellular organelles',
                'created_at': datetime.datetime.now()
            }
        ]
        
        for session in tutoring_sessions:
            db.collection('NHS_Tutoring').document(session['id']).set(session)
        
        print("✅ NHS database initialized successfully!")
        print(f"✅ Created {len(nhs_members)} NHS members")
        print(f"✅ Created {len(service_records)} service records")
        print(f"✅ Created {len(nhs_events)} events")
        print(f"✅ Created {len(nhs_applications)} applications")
        print(f"✅ Created {len(tutoring_sessions)} tutoring sessions")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing NHS database: {str(e)}")
        return False

if __name__ == "__main__":
    init_nhs_database() 