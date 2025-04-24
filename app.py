from flask import Flask, render_template, redirect, request
from ai_routes import ai_bp

app = Flask(__name__)
# Register the AI Blueprint
app.register_blueprint(ai_bp, url_prefix='/ai')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/tree')
def tree():
    return render_template('tree.html')

@app.route('/counselor')
def counselor():
    return render_template('counselor.html')

@app.route('/pmods')
def pmods():
    return render_template('pmods.html')

@app.route('/profile')
def profile():
    # In a real application, this would verify user authentication
    # and fetch the user's profile data from a database
    return render_template('profile.html')

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
    
    return render_template('class.html', **class_data)

@app.route('/collab')
def collab():
    return render_template('collab.html')

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

@app.route('/onboarding/<step>', methods=['GET', 'POST'])
def onboarding(step):
    # Step can be one of: 'usertype', 'services', 'schedule', 'classes', 'motivations', 'counselors'
    step_templates = {
        'usertype': 'onboarding/usertype.html',
        'services': 'onboarding/services.html',
        'jupiter': 'onboarding/jupiter.html',
        'classes': 'onboarding/classes.html',
        'grade_analysis': 'onboarding/grade_analysis.html',
        'schedule': 'onboarding/schedule.html',
        'motivations': 'onboarding/motivations.html',
        'counselors': 'onboarding/counselors.html',
        'complete': 'onboarding/complete.html'
    }
    
    # Define the next step in the onboarding flow
    next_steps = {
        'usertype': 'services',
        'services': 'jupiter',
        'jupiter': 'classes',
        'classes': 'grade_analysis',
        'grade_analysis': 'counselors',
        'counselors': 'motivations',
        'motivations': 'complete'
    }
    
    if step not in step_templates:
        return redirect('/onboarding/usertype')
    
    # Handle form submissions for each step
    if request.method == 'POST':
        # Process form data here if needed
        # For now, just redirect to the next step
        if step in next_steps:
            return redirect(f'/onboarding/{next_steps[step]}')
        elif step == 'complete':
            return redirect('/tree')  # After completion, go to Tree/MyWeb
    
    # For GET requests, just render the template
    return render_template(step_templates[step])

@app.route('/verify-email/<token>')
def verify_email(token):
    # In a real app, this would verify the token and mark the email as verified
    # For now, we'll just redirect to the first onboarding step
    return render_template('email_verified.html')

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

if __name__ == '__main__':
    app.run(debug=True) 