# SciWeb 3.0

A state-of-the-art academic platform that makes academic excellence universally accessible.

## Features

- **Tree Structure**: Organize your academic journey with different node types
- **Schedule Planning**: Manage your daily tasks and assignments
- **AI Counselors**: Get personalized guidance and support
- **Study Tools**: Concept mapping, derivation, and practice
- **Dark/Light Mode**: Beautiful UI in both light and dark modes

## Realtime Voice Processing

The platform now features real-time voice processing using OpenAI's Realtime API with WebRTC. This allows for immediate concept map updates as you speak, creating a truly interactive experience.

### How It Works

1. When you click the voice recording button, the system establishes a WebRTC connection directly to OpenAI's servers
2. Your voice is streamed in real-time to GPT-4o mini, which processes what you're saying
3. The model dynamically updates your concept map, adding new nodes and connections as you speak
4. You can see your map evolve in real-time based on your spoken ideas

### Implementation Details

- Uses WebRTC for direct browser-to-AI communication
- Securely handles API tokens through a backend exchange
- Optimizes rendering to prevent UI lag during updates
- Supports adding, updating, and removing nodes/edges based on spoken context

### Requirements

- Modern browser with WebRTC support
- Microphone access
- Internet connection

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the application:
   ```
   python app.py
   ```
4. Visit `http://localhost:5000` in your browser

## Technologies Used

- Flask (Python web framework)
- HTML5, CSS3, JavaScript
- Modern UI with animations and responsive design

## Contributing

We welcome contributions! Please see our contributing guidelines for more information. 