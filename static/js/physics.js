// Physics Page JavaScript with AI Integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('Physics Lab page loaded');
    initializePhysicsLab();
});

// Global variables
let aiChatHistory = [];
let currentProblemSolution = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

function initializePhysicsLab() {
    // Initialize AI Assistant
    initializeAIAssistant();
    
    // Initialize Problem Solver
    initializeProblemSolver();
    
    // Initialize Knowledge Web
    initializeKnowledgeWeb();
    
    // Initialize simulation interactions
    initializeSimulations();
    
    // Add physics navigation link if not present
    addPhysicsNavLink();
}

// AI Assistant Functions
function initializeAIAssistant() {
    const toggleBtn = document.getElementById('toggle-ai');
    const aiContent = document.getElementById('ai-content');
    const aiInput = document.getElementById('ai-input');
    const aiSubmit = document.getElementById('ai-submit');
    const quickBtns = document.querySelectorAll('.quick-btn');

    // Toggle AI panel
    toggleBtn.addEventListener('click', function() {
        const isCollapsed = aiContent.classList.contains('collapsed');
        
        if (isCollapsed) {
            aiContent.classList.remove('collapsed');
            toggleBtn.classList.remove('collapsed');
        } else {
            aiContent.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
        }
    });

    // Handle AI input
    aiSubmit.addEventListener('click', function() {
        const question = aiInput.value.trim();
        if (question) {
            sendAIQuestion(question);
            aiInput.value = '';
        }
    });

    aiInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            aiSubmit.click();
        }
    });

    // Handle quick action buttons
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const concept = this.dataset.concept;
            sendAIQuestion(`Explain ${concept} with a visual example`);
        });
    });

    // Handle AI explain buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('ai-explain-btn') || e.target.closest('.ai-explain-btn')) {
            const btn = e.target.classList.contains('ai-explain-btn') ? e.target : e.target.closest('.ai-explain-btn');
            const topic = btn.dataset.topic;
            explainPhysicsConcept(topic);
        }
    });
}

async function sendAIQuestion(question) {
    const aiChat = document.getElementById('ai-chat');
    
    // Add user message
    addAIMessage(question, 'user');
    
    // Show typing indicator
    const typingIndicator = addAIMessage('AI is thinking...', 'ai', true);
    
    try {
        // Call AI API
        const response = await fetch('/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: question,
                context: 'physics_learning',
                history: aiChatHistory.slice(-5) // Send last 5 messages for context
            })
        });
        
        const result = await response.json();
        
        // Remove typing indicator
        typingIndicator.remove();
        
        if (result.success) {
            addAIMessage(result.response, 'ai');
            
            // Add visual aids if available
            if (result.visual_aids) {
                addVisualAids(result.visual_aids);
            }
            
            // Store in chat history
            aiChatHistory.push(
                { role: 'user', content: question },
                { role: 'assistant', content: result.response }
            );
        } else {
            addAIMessage('Sorry, I encountered an error. Please try again.', 'ai');
        }
    } catch (error) {
        console.error('AI Error:', error);
        typingIndicator.remove();
        addAIMessage('Network error. Please check your connection and try again.', 'ai');
    }
}

function addAIMessage(content, sender, isTemporary = false) {
    const aiChat = document.getElementById('ai-chat');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${sender}-message`;
    if (isTemporary) messageDiv.classList.add('temporary');
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = content;
    
    messageDiv.appendChild(messageContent);
    aiChat.appendChild(messageDiv);
    
    // Scroll to bottom
    aiChat.scrollTop = aiChat.scrollHeight;
    
    return messageDiv;
}

async function explainPhysicsConcept(concept) {
    const explanations = {
        "newton's laws": {
            title: "Newton's Laws of Motion",
            content: `
                <h4>Newton's Three Laws Explained:</h4>
                <div class="law-explanation">
                    <h5>First Law (Law of Inertia):</h5>
                    <p>Objects at rest stay at rest, objects in motion stay in motion, unless acted upon by a net external force.</p>
                    <div class="example">
                        <strong>Example:</strong> A hockey puck sliding on ice continues moving until friction stops it.
                    </div>
                </div>
                
                <div class="law-explanation">
                    <h5>Second Law (F = ma):</h5>
                    <p>The acceleration of an object is directly proportional to the net force and inversely proportional to its mass.</p>
                    <div class="example">
                        <strong>Example:</strong> Pushing a shopping cart - more force = more acceleration, heavier cart = less acceleration.
                    </div>
                </div>
                
                <div class="law-explanation">
                    <h5>Third Law (Action-Reaction):</h5>
                    <p>For every action, there is an equal and opposite reaction.</p>
                    <div class="example">
                        <strong>Example:</strong> When you push against a wall, the wall pushes back with equal force.
                    </div>
                </div>
                
                <div class="interactive-tip">
                    <i class="fas fa-lightbulb"></i>
                    <strong>Try the simulation above!</strong> Experiment with different forces and observe how the laws apply.
                </div>
            `,
            connections: ["Force", "Acceleration", "Mass", "Momentum"]
        },
        
        "energy conservation": {
            title: "Conservation of Energy",
            content: `
                <h4>Energy Cannot Be Created or Destroyed:</h4>
                <div class="energy-explanation">
                    <p>Energy can only be transformed from one form to another. The total energy in a closed system remains constant.</p>
                    
                    <h5>Types of Mechanical Energy:</h5>
                    <ul>
                        <li><strong>Kinetic Energy (KE):</strong> Energy of motion = ½mv²</li>
                        <li><strong>Potential Energy (PE):</strong> Stored energy = mgh (gravitational)</li>
                    </ul>
                    
                    <h5>Energy Transformations:</h5>
                    <div class="transformation-example">
                        <strong>Roller Coaster Example:</strong>
                        <br>Top of hill: High PE, Low KE
                        <br>Bottom of hill: Low PE, High KE
                        <br>Total Energy (PE + KE) = Constant
                    </div>
                </div>
                
                <div class="interactive-tip">
                    <i class="fas fa-play-circle"></i>
                    <strong>Use the skate park simulation!</strong> Watch energy transform as the skater moves.
                </div>
            `,
            connections: ["Kinetic Energy", "Potential Energy", "Work", "Power"]
        },
        
        "wave interference": {
            title: "Wave Interference",
            content: `
                <h4>When Waves Meet:</h4>
                <div class="wave-explanation">
                    <h5>Constructive Interference:</h5>
                    <p>When wave peaks align, they add together creating a larger amplitude.</p>
                    
                    <h5>Destructive Interference:</h5>
                    <p>When a peak meets a trough, they cancel out, reducing amplitude.</p>
                    
                    <h5>Wave Properties:</h5>
                    <ul>
                        <li><strong>Amplitude:</strong> Height of the wave (energy/intensity)</li>
                        <li><strong>Wavelength (λ):</strong> Distance between peaks</li>
                        <li><strong>Frequency (f):</strong> Waves per second</li>
                        <li><strong>Speed (v):</strong> v = fλ</li>
                    </ul>
                    
                    <div class="real-world-example">
                        <strong>Real World:</strong> Noise-canceling headphones use destructive interference to cancel unwanted sounds!
                    </div>
                </div>
            `,
            connections: ["Sound Waves", "Light Waves", "Frequency", "Amplitude"]
        },
        
        "electric fields": {
            title: "Electric Fields and Forces",
            content: `
                <h4>Understanding Electric Fields:</h4>
                <div class="electric-explanation">
                    <h5>What is an Electric Field?</h5>
                    <p>A region around a charged object where other charges experience a force.</p>
                    
                    <h5>Key Equations:</h5>
                    <ul>
                        <li><strong>Coulomb's Law:</strong> F = k(q₁q₂)/r²</li>
                        <li><strong>Electric Field:</strong> E = F/q = kQ/r²</li>
                        <li><strong>Electric Potential:</strong> V = kQ/r</li>
                    </ul>
                    
                    <h5>Field Lines:</h5>
                    <div class="field-info">
                        <p>• Point away from positive charges</p>
                        <p>• Point toward negative charges</p>
                        <p>• Closer lines = stronger field</p>
                        <p>• Lines never cross</p>
                    </div>
                    
                    <div class="practical-example">
                        <strong>Everyday Example:</strong> Static electricity when you rub a balloon on your hair creates an electric field!
                    </div>
                </div>
            `,
            connections: ["Charge", "Force", "Potential", "Current"]
        },
        
        "circuits": {
            title: "Electric Circuits",
            content: `
                <h4>How Electric Circuits Work:</h4>
                <div class="circuit-explanation">
                    <h5>Circuit Basics:</h5>
                    <ul>
                        <li><strong>Voltage (V):</strong> Electric potential difference (Volts)</li>
                        <li><strong>Current (I):</strong> Flow of charge (Amperes)</li>
                        <li><strong>Resistance (R):</strong> Opposition to current (Ohms)</li>
                    </ul>
                    
                    <h5>Ohm's Law: V = IR</h5>
                    <p>This fundamental relationship shows how voltage, current, and resistance are related.</p>
                    
                    <h5>Kirchhoff's Laws:</h5>
                    <div class="kirchhoff-laws">
                        <p><strong>Current Law:</strong> Current in = Current out (charge conservation)</p>
                        <p><strong>Voltage Law:</strong> Sum of voltages around a loop = 0 (energy conservation)</p>
                    </div>
                    
                    <div class="circuit-analogy">
                        <strong>Water Analogy:</strong>
                        <br>Voltage = Water pressure
                        <br>Current = Water flow rate
                        <br>Resistance = Pipe narrowness
                    </div>
                </div>
            `,
            connections: ["Voltage", "Current", "Resistance", "Power"]
        },
        
        "photoelectric effect": {
            title: "The Photoelectric Effect",
            content: `
                <h4>Einstein's Nobel Prize Discovery:</h4>
                <div class="photoelectric-explanation">
                    <h5>What Happens:</h5>
                    <p>When light hits a metal surface, electrons can be ejected. But there's a twist!</p>
                    
                    <h5>Classical vs Quantum:</h5>
                    <div class="comparison">
                        <p><strong>Classical Prediction:</strong> Brighter light should always eject electrons</p>
                        <p><strong>Reality:</strong> Only light above a certain frequency works, regardless of brightness!</p>
                    </div>
                    
                    <h5>Einstein's Explanation:</h5>
                    <p>Light comes in packets called photons: E = hf</p>
                    <p>Each photon must have enough energy to overcome the work function (W = hf₀)</p>
                    
                    <h5>Energy Conservation:</h5>
                    <div class="equation-breakdown">
                        <p>hf = W + KE<sub>max</sub></p>
                        <p>Photon energy = Work function + Kinetic energy of electron</p>
                    </div>
                    
                    <div class="modern-application">
                        <strong>Modern Use:</strong> Solar panels, photomultiplier tubes, and image sensors all use this effect!
                    </div>
                </div>
            `,
            connections: ["Quantum Mechanics", "Photons", "Energy", "Electrons"]
        }
    };

    const explanation = explanations[concept];
    if (explanation) {
        addAIMessage(`
            <div class="concept-explanation-detailed">
                <h3>${explanation.title}</h3>
                ${explanation.content}
                <div class="related-concepts">
                    <strong>Related Concepts:</strong>
                    ${explanation.connections.map(c => `<span class="concept-tag">${c}</span>`).join('')}
                </div>
            </div>
        `, 'ai');
    } else {
        sendAIQuestion(`Explain ${concept} in detail with examples`);
    }
}

// Problem Solver Functions
function initializeProblemSolver() {
    const inputOptions = document.querySelectorAll('.input-option');
    const problemInputs = document.querySelectorAll('.problem-input');
    const solveBtn = document.getElementById('solve-problem');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('problem-image');
    const voiceBtn = document.getElementById('voice-record');

    // Handle input type switching
    inputOptions.forEach(option => {
        option.addEventListener('click', function() {
            const type = this.dataset.type;
            switchInputType(type);
        });
    });

    // Handle text problem solving
    if (solveBtn) {
        solveBtn.addEventListener('click', function() {
            const problemText = document.getElementById('problem-text').value.trim();
            if (problemText) {
                solvePhysicsProblem(problemText, 'text');
            }
        });
    }

    // Handle file upload
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--physics-primary)';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'var(--physics-border)';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--physics-border)';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleImageUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                handleImageUpload(e.target.files[0]);
            }
        });
    }

    // Handle voice input
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceRecording);
    }
}

function switchInputType(type) {
    // Update active option
    document.querySelectorAll('.input-option').forEach(opt => opt.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // Show corresponding input
    document.querySelectorAll('.problem-input').forEach(input => input.classList.remove('active'));
    document.querySelector(`.${type}-input`).classList.add('active');
}

async function solvePhysicsProblem(problem, type) {
    showLoading(true);
    
    // Mock AI solution for demo
    setTimeout(() => {
        const mockSolution = {
            analysis: "This is a kinematics problem involving free fall motion.",
            given: [
                "Mass (m) = 2 kg",
                "Initial height (h) = 10 m",
                "Initial velocity (v₀) = 0 m/s",
                "Acceleration due to gravity (g) = 9.8 m/s²"
            ],
            steps: [
                {
                    description: "Identify the appropriate kinematic equation",
                    equation: "v² = v₀² + 2gh",
                    calculation: "Since we need final velocity and have height"
                },
                {
                    description: "Substitute the known values",
                    equation: "v² = 0² + 2(9.8)(10)",
                    calculation: "v² = 0 + 196 = 196"
                },
                {
                    description: "Solve for the final velocity",
                    equation: "v = √196 = 14 m/s",
                    calculation: "Taking the square root of both sides"
                }
            ],
            answer: "The velocity just before hitting the ground is 14 m/s",
            explanation: "The object converts all its potential energy at height h into kinetic energy just before impact. This demonstrates conservation of energy: PE = KE, or mgh = ½mv².",
            related_concepts: ["Free Fall", "Kinematics", "Energy Conservation", "Gravity"]
        };
        
        showLoading(false);
        displaySolution(mockSolution);
        currentProblemSolution = mockSolution;
    }, 2000);
}

function displaySolution(solution) {
    const solutionArea = document.getElementById('solution-area');
    const solutionContent = document.getElementById('solution-content');
    
    solutionContent.innerHTML = `
        <div class="solution-steps">
            <h4>Problem Analysis:</h4>
            <div class="analysis">${solution.analysis || 'Analyzing the given problem...'}</div>
            
            <h4>Given Information:</h4>
            <ul class="given-info">
                ${(solution.given || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
            
            <h4>Solution Steps:</h4>
            <div class="steps">
                ${(solution.steps || []).map((step, index) => `
                    <div class="step">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-content">
                            <div class="step-description">${step.description}</div>
                            ${step.equation ? `<div class="step-equation">${step.equation}</div>` : ''}
                            ${step.calculation ? `<div class="step-calculation">${step.calculation}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <h4>Final Answer:</h4>
            <div class="final-answer">${solution.answer || 'Answer will appear here...'}</div>
            
            ${solution.explanation ? `
                <h4>Explanation:</h4>
                <div class="explanation">${solution.explanation}</div>
            ` : ''}
            
            ${solution.related_concepts ? `
                <h4>Related Physics Concepts:</h4>
                <div class="related-concepts">
                    ${solution.related_concepts.map(concept => `<span class="concept-tag">${concept}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    solutionArea.style.display = 'block';
    solutionArea.scrollIntoView({ behavior: 'smooth' });
}

function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadArea = document.getElementById('upload-area');
        uploadArea.innerHTML = `
            <img src="${e.target.result}" style="max-width: 100%; max-height: 200px; margin-bottom: 1rem;">
            <p>Image uploaded successfully!</p>
        `;
        
        const solveImageBtn = document.getElementById('solve-image-problem');
        solveImageBtn.style.display = 'block';
        
        solveImageBtn.onclick = () => solvePhysicsProblem(e.target.result, 'image');
    };
    reader.readAsDataURL(file);
}

function toggleVoiceRecording() {
    const voiceBtn = document.getElementById('voice-record');
    const voiceStatus = document.getElementById('voice-status');

    if (!isRecording) {
        startVoiceRecording(voiceBtn, voiceStatus);
    } else {
        stopVoiceRecording(voiceBtn, voiceStatus);
    }
}

function startVoiceRecording(btn, status) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    processVoiceInput(audioBlob);
                };
                
                mediaRecorder.start();
                isRecording = true;
                
                btn.classList.add('recording');
                btn.innerHTML = '<i class="fas fa-stop"></i><span>Stop Recording</span>';
                status.textContent = 'Recording... Click to stop';
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                status.textContent = 'Microphone access denied';
            });
    } else {
        status.textContent = 'Voice recording not supported in this browser';
    }
}

function stopVoiceRecording(btn, status) {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        isRecording = false;
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-microphone"></i><span>Click to Record</span>';
        status.textContent = 'Processing audio...';
    }
}

async function processVoiceInput(audioBlob) {
    const voiceStatus = document.getElementById('voice-status');
    
    // Mock transcription for demo
    setTimeout(() => {
        const mockTranscription = "A 2 kilogram object is dropped from a height of 10 meters. What is its velocity just before hitting the ground?";
        voiceStatus.textContent = `Transcribed: "${mockTranscription}"`;
        solvePhysicsProblem(mockTranscription, 'voice');
    }, 1000);
}

// Knowledge Web Functions
function initializeKnowledgeWeb() {
    const addToWebBtn = document.getElementById('add-to-web');
    const webBtns = document.querySelectorAll('.web-btn');
    const exploreButtons = document.querySelectorAll('.explore-connection');

    if (addToWebBtn) {
        addToWebBtn.addEventListener('click', function() {
            if (currentProblemSolution) {
                addSolutionToKnowledgeWeb(currentProblemSolution);
            }
        });
    }

    webBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.id.replace('-', ' ').replace('_', ' ');
            handleWebAction(action);
        });
    });

    exploreButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.connection-card');
            const concepts = card.querySelectorAll('.concept-node span');
            const concept1 = concepts[0].textContent;
            const concept2 = concepts[1].textContent;
            exploreConceptConnection(concept1, concept2);
        });
    });
}

function addSolutionToKnowledgeWeb(solution) {
    showNotification('Solution added to your knowledge web!', 'success');
    
    // Simulate adding to knowledge web
    if (solution.related_concepts) {
        const connectionsArea = document.getElementById('concept-connections');
        const newConnection = document.createElement('div');
        newConnection.className = 'connection-card new-connection';
        newConnection.innerHTML = `
            <div class="concept-node">
                <i class="fas fa-calculator"></i>
                <span>Problem Solution</span>
            </div>
            <div class="connection-arrow">
                <i class="fas fa-arrow-right"></i>
            </div>
            <div class="concept-node">
                <i class="fas fa-lightbulb"></i>
                <span>${solution.related_concepts[0]}</span>
            </div>
            <button class="explore-connection">
                <i class="fas fa-expand-arrows-alt"></i>
                Explore
            </button>
        `;
        
        connectionsArea.appendChild(newConnection);
        newConnection.scrollIntoView({ behavior: 'smooth' });
        
        // Add click handler for new connection
        newConnection.querySelector('.explore-connection').addEventListener('click', function() {
            exploreConceptConnection('Problem Solution', solution.related_concepts[0]);
        });
    }
}

function handleWebAction(action) {
    switch(action) {
        case 'create mindmap':
            window.open('/mindweb/physics-concepts', '_blank');
            break;
        case 'view connections':
            showNotification('Opening physics knowledge web...', 'info');
            // Redirect to full knowledge web view
            break;
        case 'generate quiz':
            generatePhysicsQuiz();
            break;
    }
}

function exploreConceptConnection(concept1, concept2) {
    sendAIQuestion(`How are ${concept1} and ${concept2} connected in physics? Show me the relationship with examples.`);
}

async function generatePhysicsQuiz() {
    showLoading(true);
    
    // Mock quiz generation for demo
    setTimeout(() => {
        const mockQuiz = {
            questions: [
                {
                    question: "According to Newton's first law, an object at rest will:",
                    options: [
                        "Remain at rest unless acted upon by a force",
                        "Begin moving on its own",
                        "Accelerate constantly",
                        "Change direction randomly"
                    ],
                    correct: 0
                },
                {
                    question: "What is the formula for kinetic energy?",
                    options: [
                        "KE = mv",
                        "KE = ½mv²",
                        "KE = mgh",
                        "KE = ma"
                    ],
                    correct: 1
                },
                {
                    question: "Wave interference occurs when:",
                    options: [
                        "Waves travel in the same direction",
                        "Two or more waves overlap",
                        "A wave hits a barrier",
                        "The frequency changes"
                    ],
                    correct: 1
                }
            ]
        };
        
        showLoading(false);
        displayQuiz(mockQuiz);
    }, 1500);
}

function displayQuiz(quiz) {
    const quizModal = document.createElement('div');
    quizModal.className = 'quiz-modal';
    quizModal.innerHTML = `
        <div class="quiz-content">
            <div class="quiz-header">
                <h2>Physics Practice Quiz</h2>
                <button class="close-quiz">&times;</button>
            </div>
            <div class="quiz-questions">
                ${quiz.questions.map((q, index) => `
                    <div class="quiz-question">
                        <h4>Question ${index + 1}:</h4>
                        <p>${q.question}</p>
                        <div class="quiz-options">
                            ${q.options.map((option, i) => `
                                <label>
                                    <input type="radio" name="q${index}" value="${i}">
                                    ${option}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="submit-quiz">Submit Quiz</button>
        </div>
    `;
    
    document.body.appendChild(quizModal);
    
    // Handle quiz interactions
    quizModal.querySelector('.close-quiz').addEventListener('click', () => {
        quizModal.remove();
    });
    
    quizModal.querySelector('.submit-quiz').addEventListener('click', () => {
        gradeQuiz(quiz, quizModal);
    });
}

function gradeQuiz(quiz, modal) {
    const answers = [];
    
    quiz.questions.forEach((_, index) => {
        const selected = modal.querySelector(`input[name="q${index}"]:checked`);
        answers.push(selected ? parseInt(selected.value) : -1);
    });
    
    let score = 0;
    quiz.questions.forEach((q, index) => {
        if (answers[index] === q.correct) {
            score++;
        }
    });
    
    const percentage = Math.round((score / quiz.questions.length) * 100);
    
    showNotification(`Quiz completed! Score: ${score}/${quiz.questions.length} (${percentage}%)`, 
                    percentage >= 70 ? 'success' : 'warning');
    
    modal.remove();
}

// Simulation Functions
function initializeSimulations() {
    // Add event listeners for simulation interactions
    document.querySelectorAll('.simulation-container iframe').forEach(iframe => {
        iframe.addEventListener('load', function() {
            console.log('Simulation loaded:', this.src);
        });
    });
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `physics-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        box-shadow: var(--physics-shadow-lg);
    `;
    
    // Set background color based on type
    const colors = {
        success: 'var(--physics-success)',
        error: 'var(--physics-danger)',
        warning: 'var(--physics-warning)',
        info: 'var(--physics-primary)'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Allow manual dismiss on click
    notification.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

function addPhysicsNavLink() {
    // Add physics link to navigation if not already present
    const nav = document.querySelector('.nav-links');
    if (nav && !document.querySelector('a[href="/physics"]')) {
        const physicsLink = document.createElement('a');
        physicsLink.href = '/physics';
        physicsLink.innerHTML = '<i class="fas fa-atom"></i> Physics Lab';
        physicsLink.className = 'nav-link';
        
        // Insert before the last nav item (usually profile)
        const navItems = nav.children;
        if (navItems.length > 0) {
            nav.insertBefore(physicsLink, navItems[navItems.length - 1]);
        } else {
            nav.appendChild(physicsLink);
        }
    }
}

// Add custom CSS for quiz modal and other components
const additionalStyles = `
.quiz-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.quiz-content {
    background: var(--physics-card-bg);
    border-radius: 12px;
    padding: 2rem;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: var(--physics-text);
}

.quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--physics-border);
    padding-bottom: 1rem;
}

.close-quiz {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--physics-text-light);
}

.quiz-question {
    margin-bottom: 2rem;
}

.quiz-question h4 {
    color: var(--physics-primary);
    margin-bottom: 0.5rem;
}

.quiz-options {
    margin-top: 1rem;
}

.quiz-options label {
    display: block;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.3s ease;
}

.quiz-options label:hover {
    background: var(--physics-bg);
}

.submit-quiz {
    background: var(--physics-primary);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    width: 100%;
}

.law-explanation, .energy-explanation, .wave-explanation, 
.electric-explanation, .circuit-explanation, .photoelectric-explanation {
    margin-bottom: 1.5rem;
}

.example, .transformation-example, .real-world-example, 
.practical-example, .circuit-analogy, .modern-application {
    background: var(--physics-bg);
    padding: 1rem;
    border-radius: 6px;
    border-left: 4px solid var(--physics-accent);
    margin-top: 1rem;
}

.interactive-tip {
    background: linear-gradient(135deg, var(--physics-success) 0%, #059669 100%);
    color: white;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.concept-tag {
    background: var(--physics-primary);
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    margin-right: 0.5rem;
    display: inline-block;
    margin-bottom: 0.5rem;
}

.step {
    display: flex;
    margin-bottom: 1.5rem;
    align-items: flex-start;
    gap: 1rem;
}

.step-number {
    background: var(--physics-primary);
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
}

.step-content {
    flex: 1;
}

.step-equation {
    background: var(--physics-bg);
    padding: 0.5rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    margin: 0.5rem 0;
    font-weight: bold;
}

.final-answer {
    background: var(--physics-success);
    color: white;
    padding: 1rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
}

.new-connection {
    animation: slideInUp 0.5s ease;
    border: 2px solid var(--physics-success);
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.user-message .message-content {
    background: var(--physics-primary);
    color: white;
    margin-left: 2rem;
}

.ai-message .message-content {
    background: var(--physics-bg);
    border-left: 4px solid var(--physics-primary);
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet); 