// Practice Modules JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startPracticeBtn = document.getElementById('start-practice');
    const noPracticeMessage = document.querySelector('.no-practice-message');
    const practiceContent = document.querySelector('.practice-content');
    const submitAnswerBtn = document.getElementById('submit-answer');
    const getHintBtn = document.getElementById('get-hint');
    const nextQuestionBtn = document.getElementById('next-question');
    const mapToWebBtn = document.getElementById('map-to-web');
    const closeFeedbackBtn = document.getElementById('close-feedback');
    const feedbackContainer = document.getElementById('feedback-container');
    const currentQuestionSpan = document.getElementById('current-question');
    const totalQuestionsSpan = document.getElementById('total-questions');
    const timerElement = document.getElementById('timer');
    
    // MCQ Elements
    const mcqContainer = document.getElementById('mcq-container');
    const mcqOptions = document.querySelector('.mcq-options');
    
    // SAQ Elements
    const saqContainer = document.getElementById('saq-container');
    const saqAnswer = document.getElementById('saq-answer');
    
    // Logical Steps Elements
    const logicalStepsContainer = document.getElementById('logical-steps-container');
    const stepsList = document.getElementById('steps-list');
    const stepInput = document.getElementById('step-input');
    const addStepBtn = document.getElementById('add-step');
    
    // Voice Recording Elements
    const voiceContainer = document.getElementById('voice-container');
    const startRecordingBtn = document.getElementById('start-recording');
    const stopRecordingBtn = document.getElementById('stop-recording');
    const recordingStatus = document.getElementById('recording-status');
    const recordingPlayback = document.getElementById('recording-playback');
    const recordingAudio = document.getElementById('recording-audio');
    
    // Practice mode selection
    const practiceModesRadio = document.querySelectorAll('input[name="practice-mode"]');
    
    // Time limit options
    const timeLimitRadios = document.querySelectorAll('input[name="time-limit"]');
    const timeMinutesInput = document.getElementById('time-minutes');
    
    // State
    let currentQuestionIndex = 0;
    let totalQuestions = 5; // Default
    let selectedAnswers = [];
    let timer = null;
    let seconds = 0;
    let mediaRecorder = null;
    let audioChunks = [];
    let logicalSteps = [];
    let practiceMode = 'freeform'; // Default
    
    // Sample Questions (In a real app, these would come from an API)
    const sampleQuestions = [
        {
            id: 1,
            text: "If 2x + 3 = 7, what is the value of x?",
            type: "mcq",
            options: ["1", "2", "3", "4"],
            correctAnswer: "2",
            explanation: "To solve for x, subtract 3 from both sides to get 2x = 4, then divide both sides by 2 to get x = 2."
        },
        {
            id: 2,
            text: "Simplify the expression: 3(2x - 4) + 5",
            type: "saq",
            correctAnswer: "6x - 7",
            explanation: "First, distribute the 3: 3(2x - 4) = 6x - 12. Then add 5: 6x - 12 + 5 = 6x - 7."
        },
        {
            id: 3,
            text: "Prove that the sum of two even numbers is always even.",
            type: "logical",
            steps: [
                "Let a and b be two even numbers.",
                "By definition, an even number can be written as 2k for some integer k.",
                "So a = 2m and b = 2n for some integers m and n.",
                "The sum is a + b = 2m + 2n = 2(m + n).",
                "Since m + n is an integer, 2(m + n) is even by definition.",
                "Therefore, the sum of two even numbers is always even."
            ]
        },
        {
            id: 4,
            text: "Describe the relationship between derivatives and integrals. How are they related through the Fundamental Theorem of Calculus?",
            type: "voice",
            keywords: ["fundamental theorem", "antiderivative", "inverse operations", "definite integral"]
        },
        {
            id: 5,
            text: "Find the domain of the function f(x) = √(x^2 - 4)",
            type: "mcq",
            options: ["x ≤ -2 or x ≥ 2", "x ≤ 2 or x ≥ 2", "-2 ≤ x ≤ 2", "All real numbers"],
            correctAnswer: "x ≤ -2 or x ≥ 2",
            explanation: "For a square root to be defined in the real number system, the expression inside must be non-negative. So x^2 - 4 ≥ 0, which means x^2 ≥ 4, so x ≤ -2 or x ≥ 2."
        }
    ];
    
    // Initialize practice modes
    practiceModesRadio.forEach(radio => {
        radio.addEventListener('change', function() {
            practiceMode = this.value;
        });
    });
    
    // Initialize time limit options
    timeLimitRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.id === 'time-custom') {
                timeMinutesInput.disabled = false;
            } else {
                timeMinutesInput.disabled = true;
            }
        });
    });
    
    // Start Practice Button
    startPracticeBtn.addEventListener('click', function() {
        // Get configuration values
        totalQuestions = parseInt(document.getElementById('questions-count').value);
        totalQuestionsSpan.textContent = totalQuestions;
        
        // Check if time limit is set
        const hasTimeLimit = document.getElementById('time-custom').checked;
        if (hasTimeLimit) {
            const minutes = parseInt(timeMinutesInput.value);
            seconds = minutes * 60;
            timerElement.style.display = 'block';
            startTimer();
        }
        
        // Hide configuration, show practice area
        noPracticeMessage.style.display = 'none';
        practiceContent.style.display = 'flex';
        
        // Load first question
        loadQuestion(0);
    });
    
    // Submit Answer Button
    submitAnswerBtn.addEventListener('click', function() {
        let userAnswer = '';
        let isCorrect = false;
        
        const currentQuestion = sampleQuestions[currentQuestionIndex];
        
        // Get answer based on question type
        switch (currentQuestion.type) {
            case 'mcq':
                const selectedOption = document.querySelector('.mcq-option.selected');
                if (selectedOption) {
                    userAnswer = selectedOption.textContent;
                    isCorrect = userAnswer === currentQuestion.correctAnswer;
                }
                break;
            case 'saq':
                userAnswer = saqAnswer.value.trim();
                // Simple check - in a real app, would use more sophisticated matching
                isCorrect = userAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
                break;
            case 'logical':
                // For logical steps, we're checking if all required steps are included
                // In a real app, this would be more sophisticated
                isCorrect = logicalSteps.length >= 4; 
                break;
            case 'voice':
                // For voice, we'd need transcription and analysis
                // Here we just simulate it
                isCorrect = true;
                break;
        }
        
        // Save answer
        selectedAnswers[currentQuestionIndex] = {
            userAnswer,
            isCorrect
        };
        
        // Show feedback unless in test mode
        if (practiceMode !== 'test') {
            showFeedback(isCorrect, currentQuestion.explanation);
        } else if (currentQuestionIndex === totalQuestions - 1) {
            // If last question in test mode, show overall results
            showTestResults();
        } else {
            // Move to next question in test mode
            loadQuestion(currentQuestionIndex + 1);
        }
    });
    
    // Get Hint Button
    getHintBtn.addEventListener('click', function() {
        // Only show hints if AI hint option is enabled
        if (document.getElementById('ai-hint').checked) {
            const hintText = getHintForQuestion(sampleQuestions[currentQuestionIndex]);
            showHint(hintText);
        }
    });
    
    // Next Question Button
    nextQuestionBtn.addEventListener('click', function() {
        if (currentQuestionIndex < totalQuestions - 1) {
            loadQuestion(currentQuestionIndex + 1);
        } else {
            // End of practice session
            endPracticeSession();
        }
        closeFeedback();
    });
    
    // Close Feedback Button
    closeFeedbackBtn.addEventListener('click', closeFeedback);
    
    // Map to Web Button
    mapToWebBtn.addEventListener('click', function() {
        // This would integrate with the mindweb feature
        alert('This would map the concept to your knowledge web!');
    });
    
    // Step Input for Logical Steps mode
    if (addStepBtn && stepInput) {
        addStepBtn.addEventListener('click', addLogicalStep);
        
        // Allow pressing Enter to add step
        stepInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addLogicalStep();
            }
        });
    }
    
    // Voice recording functionality
    if (startRecordingBtn && stopRecordingBtn) {
        startRecordingBtn.addEventListener('click', startRecording);
        stopRecordingBtn.addEventListener('click', stopRecording);
    }
    
    // Functions
    
    // Load a question
    function loadQuestion(index) {
        currentQuestionIndex = index;
        currentQuestionSpan.textContent = index + 1;
        document.getElementById('question-number').textContent = index + 1;
        
        const question = sampleQuestions[index];
        
        // Reset previous question's UI
        mcqContainer.style.display = 'none';
        saqContainer.style.display = 'none';
        logicalStepsContainer.style.display = 'none';
        voiceContainer.style.display = 'none';
        
        // Update question text
        document.getElementById('question-text').textContent = question.text;
        
        // Set up based on question type
        switch (question.type) {
            case 'mcq':
                setupMCQ(question);
                break;
            case 'saq':
                setupSAQ();
                break;
            case 'logical':
                setupLogicalSteps();
                break;
            case 'voice':
                setupVoiceRecording();
                break;
        }
        
        // Optional: Handle different practice modes
        handlePracticeModeForQuestion();
    }
    
    // Set up multiple choice question
    function setupMCQ(question) {
        mcqContainer.style.display = 'block';
        mcqOptions.innerHTML = '';
        
        question.options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'mcq-option';
            optionElement.textContent = option;
            optionElement.addEventListener('click', function() {
                // Remove selected class from all options
                document.querySelectorAll('.mcq-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                // Add selected class to clicked option
                this.classList.add('selected');
            });
            mcqOptions.appendChild(optionElement);
        });
    }
    
    // Set up short answer question
    function setupSAQ() {
        saqContainer.style.display = 'block';
        saqAnswer.value = '';
    }
    
    // Set up logical steps input
    function setupLogicalSteps() {
        logicalStepsContainer.style.display = 'block';
        stepsList.innerHTML = '';
        logicalSteps = [];
        stepInput.value = '';
        
        // Add explanation text above the step input if not in logical steps mode
        if (practiceMode !== 'logical') {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'logical-steps-explanation';
            explanationDiv.innerHTML = 'Enter your logical steps to solve the problem. <span class="note">Note: Verification will be done when you submit your answer.</span>';
            
            // Clear any existing explanation
            const existingExplanation = stepsList.parentNode.querySelector('.logical-steps-explanation');
            if (existingExplanation) {
                existingExplanation.remove();
            }
            
            // Insert before the steps list
            stepsList.parentNode.insertBefore(explanationDiv, stepsList);
        } else {
            // Remove any existing explanation if in logical steps mode
            const existingExplanation = stepsList.parentNode.querySelector('.logical-steps-explanation');
            if (existingExplanation) {
                existingExplanation.remove();
            }
        }
    }
    
    // Set up voice recording
    function setupVoiceRecording() {
        voiceContainer.style.display = 'block';
        stopRecordingBtn.style.display = 'none';
        startRecordingBtn.style.display = 'block';
        recordingStatus.textContent = '';
        recordingPlayback.style.display = 'none';
    }
    
    // Handle practice mode specifics for current question
    function handlePracticeModeForQuestion() {
        const currentQuestion = sampleQuestions[currentQuestionIndex];
        
        switch (practiceMode) {
            case 'logical':
                // For logical mode, ensure the logical steps container is shown
                if (currentQuestion.type !== 'logical') {
                    // Convert other question types to logical steps format
                    logicalStepsContainer.style.display = 'block';
                    
                    // Re-setup logical steps with the logical mode
                    setupLogicalSteps();
                }
                break;
            case 'record':
                // For record mode, ensure voice recording is available
                if (currentQuestion.type !== 'voice') {
                    voiceContainer.style.display = 'block';
                }
                break;
            default:
                // For other modes, follow the question type
                if (currentQuestion.type === 'logical') {
                    // Re-setup logical steps without verification
                    setupLogicalSteps();
                }
        }
    }
    
    // Add a logical step
    function addLogicalStep() {
        const stepText = stepInput.value.trim();
        if (stepText) {
            logicalSteps.push(stepText);
            
            const stepItem = document.createElement('div');
            stepItem.className = 'step-item';
            
            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';
            stepNumber.textContent = logicalSteps.length + '.';
            
            const stepContent = document.createElement('div');
            stepContent.className = 'step-content';
            stepContent.textContent = stepText;
            
            const stepStatus = document.createElement('div');
            stepStatus.className = 'step-status';
            
            // Only verify and provide feedback immediately if in logical steps mode
            if (practiceMode === 'logical') {
                // Verify step validity (in a real app, this would call an API)
                const isValid = verifyStep(stepText, logicalSteps.length - 1);
                if (isValid) {
                    stepStatus.classList.add('valid');
                    stepStatus.innerHTML = '<i class="fas fa-check"></i>';
                } else {
                    stepStatus.classList.add('invalid');
                    stepStatus.innerHTML = '<i class="fas fa-times"></i>';
                }
            }
            
            stepItem.appendChild(stepNumber);
            stepItem.appendChild(stepContent);
            stepItem.appendChild(stepStatus);
            
            stepsList.appendChild(stepItem);
            stepInput.value = '';
        }
    }
    
    // Verify if a logical step is valid
    function verifyStep(step, stepIndex) {
        // In a real app, this would call an API to verify the logical validity
        // Here we're just simulating with a simple check
        const currentQuestion = sampleQuestions[currentQuestionIndex];
        
        if (currentQuestion.type === 'logical' && currentQuestion.steps) {
            // Check if the step matches or is similar to the expected step
            const expectedStep = currentQuestion.steps[stepIndex] || '';
            return step.length > 10; // Simple check for demo purposes
        }
        
        return true; // Default to valid for demo
    }
    
    // Start voice recording
    function startRecording() {
        // Reset UI
        audioChunks = [];
        recordingPlayback.style.display = 'none';
        startRecordingBtn.style.display = 'none';
        stopRecordingBtn.style.display = 'block';
        recordingStatus.textContent = 'Recording...';
        
        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    recordingAudio.src = audioUrl;
                    recordingPlayback.style.display = 'block';
                    startRecordingBtn.style.display = 'block';
                    stopRecordingBtn.style.display = 'none';
                    recordingStatus.textContent = 'Recording complete. You can review or re-record.';
                };
                
                mediaRecorder.start();
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                recordingStatus.textContent = 'Error: Could not access microphone.';
                startRecordingBtn.style.display = 'block';
                stopRecordingBtn.style.display = 'none';
            });
    }
    
    // Stop voice recording
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    // Show feedback for an answer
    function showFeedback(isCorrect, explanation) {
        feedbackContainer.style.display = 'block';
        
        const feedbackContent = document.getElementById('feedback-content');
        feedbackContent.innerHTML = '';
        
        const resultDiv = document.createElement('div');
        resultDiv.className = isCorrect ? 'feedback-result correct' : 'feedback-result incorrect';
        resultDiv.textContent = isCorrect ? 'Correct!' : 'Incorrect';
        
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'feedback-explanation';
        explanationDiv.textContent = explanation || 'No explanation available.';
        
        feedbackContent.appendChild(resultDiv);
        feedbackContent.appendChild(explanationDiv);
    }
    
    // Show hint for a question
    function showHint(hintText) {
        alert(hintText);
    }
    
    // Get hint for a question
    function getHintForQuestion(question) {
        // In a real app, this would come from an API
        switch (question.type) {
            case 'mcq':
                return "Try to solve the equation step by step.";
            case 'saq':
                return "Remember to distribute the coefficient and combine like terms.";
            case 'logical':
                return "Start by defining what makes a number even.";
            case 'voice':
                return "Consider how differentiation and integration relate to each other.";
            default:
                return "Think carefully about the problem.";
        }
    }
    
    // Close feedback panel
    function closeFeedback() {
        feedbackContainer.style.display = 'none';
    }
    
    // Show overall test results
    function showTestResults() {
        feedbackContainer.style.display = 'block';
        document.getElementById('feedback-title').textContent = 'Test Results';
        
        const feedbackContent = document.getElementById('feedback-content');
        feedbackContent.innerHTML = '';
        
        const correctCount = selectedAnswers.filter(answer => answer.isCorrect).length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        
        const resultSummary = document.createElement('div');
        resultSummary.className = 'feedback-result ' + (percentage > 60 ? 'correct' : 'incorrect');
        resultSummary.textContent = `You got ${correctCount} out of ${totalQuestions} correct (${percentage}%)`;
        
        feedbackContent.appendChild(resultSummary);
        
        // Add detailed results for each question
        const detailedResults = document.createElement('div');
        detailedResults.className = 'detailed-results';
        
        selectedAnswers.forEach((answer, index) => {
            const questionResult = document.createElement('div');
            questionResult.className = 'question-result';
            
            const questionNumber = document.createElement('div');
            questionNumber.className = 'question-number';
            questionNumber.textContent = `Question ${index + 1}: `;
            
            const resultText = document.createElement('span');
            resultText.className = answer.isCorrect ? 'correct' : 'incorrect';
            resultText.textContent = answer.isCorrect ? 'Correct' : 'Incorrect';
            
            questionNumber.appendChild(resultText);
            questionResult.appendChild(questionNumber);
            
            detailedResults.appendChild(questionResult);
        });
        
        feedbackContent.appendChild(detailedResults);
    }
    
    // End practice session
    function endPracticeSession() {
        // Stop timer if running
        if (timer) {
            clearInterval(timer);
        }
        
        // Show completion message
        noPracticeMessage.style.display = 'flex';
        practiceContent.style.display = 'none';
        
        // Update message for completion
        const illustration = document.querySelector('.practice-illustration');
        const heading = document.querySelector('.no-practice-message h2');
        const paragraph = document.querySelector('.no-practice-message p');
        
        heading.textContent = 'Practice Complete!';
        paragraph.textContent = 'You have completed this practice session. Configure a new session to continue practicing.';
        
        // Reset state
        currentQuestionIndex = 0;
        selectedAnswers = [];
    }
    
    // Start timer for timed practice
    function startTimer() {
        updateTimerDisplay();
        
        timer = setInterval(function() {
            seconds--;
            
            if (seconds <= 0) {
                clearInterval(timer);
                alert('Time is up!');
                showTestResults();
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }
    
    // Update timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerElement.textContent = `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
}); 