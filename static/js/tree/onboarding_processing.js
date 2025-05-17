/**
 * onboarding_processing.js
 * Processes user onboarding responses and displays personalized cards
 * on the loading screen before redirecting to the tree page.
 */

// Global storage for onboarding answers including Jupiter credentials
let onboardingAnswersGlobal = [];

// Fetch and store current user ID for later tree initialization
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const resp = await fetch('/api/auth/user');
        if (resp.ok) {
            const data = await resp.json();
            if (data.user && data.user.id) {
                localStorage.setItem('userId', data.user.id);
                console.log('Fetched userId:', data.user.id);
            } else {
                console.error('Authenticated user data missing');
            }
        } else {
            console.error('Failed to get current user:', resp.status);
        }
    } catch (err) {
        console.error('Error fetching current user:', err);
    }
});

// Process user answers and generate personalized cards
async function processUserResponses(answers) {
    // Store answers globally for later use (e.g., Jupiter credentials)
    onboardingAnswersGlobal = answers;
    
    // Immediately fetch user's Jupiter classes
    const creds = answers[6] || {};
    if (creds.fullname && creds.jupiterPassword) {
        fetch('/ai/fetch_jupiter_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ osis: creds.fullname, password: creds.jupiterPassword })
        })
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .then(data => {
            console.log('Fetched classes:', data.classes);
            localStorage.setItem('classes', JSON.stringify(data.classes));
        })
        .catch(err => console.error('Error fetching Jupiter classes:', err));
    }
    
    // The answers array contains responses for each question
    // [0]: (empty - welcome screen)
    // [1]: Academic success definition
    // [2]: Motivation
    // [3]: Challenges
    // [4]: Learning style
    // [5]: Accountability
    // [6]: Jupiter credentials
    
    try {
        // First, try to get AI-generated personalized cards based on responses
        const aiCards = await getAIPersonalizedCards(answers);
        if (aiCards && aiCards.length > 0) {
            displayProcessingCards(aiCards);
            return;
        }
    } catch (error) {
        console.error("Error getting AI cards:", error);
        // Fall back to generated cards if API call fails
    }
    
    // Fallback: Generate cards locally if API call fails
    const fallbackCards = generateFallbackCards(answers);
    displayProcessingCards(fallbackCards);
}

// Call API to get AI-generated personalized cards
async function getAIPersonalizedCards(answers) {
    try {
        // Show a thinking animation while waiting for API response
        showThinkingAnimation();
        
        // Make API call to analyze onboarding responses
        const response = await fetch('/ai/analyze_onboarding', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ responses: answers }),
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        return data.cards || [];
    } catch (error) {
        console.error('Error calling onboarding analysis API:', error);
        throw error;
    } finally {
        // Hide thinking animation
        hideThinkingAnimation();
    }
}

// Show a thinking animation while API call is in progress
function showThinkingAnimation() {
    const container = document.querySelector('.finale-container');
    if (!container) return;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-animation';
    thinkingDiv.style.cssText = `
        margin-top: 2rem;
        text-align: center;
    `;
    
    thinkingDiv.innerHTML = `
        <div style="display: inline-flex; align-items: center; gap: 10px;">
            <p style="color: rgba(255,255,255,0.9); font-family: 'Poppins', sans-serif; margin: 0;">
                Analyzing your responses
            </p>
            <div style="display: flex; gap: 5px;">
                <div class="thinking-dot" style="
                    width: 8px; 
                    height: 8px; 
                    background: #6366f1; 
                    border-radius: 50%;
                    animation: thinking-pulse 1.4s infinite ease-in-out;
                    animation-delay: 0s;
                "></div>
                <div class="thinking-dot" style="
                    width: 8px; 
                    height: 8px; 
                    background: #6366f1; 
                    border-radius: 50%;
                    animation: thinking-pulse 1.4s infinite ease-in-out;
                    animation-delay: 0.2s;
                "></div>
                <div class="thinking-dot" style="
                    width: 8px; 
                    height: 8px; 
                    background: #6366f1; 
                    border-radius: 50%;
                    animation: thinking-pulse 1.4s infinite ease-in-out;
                    animation-delay: 0.4s;
                "></div>
            </div>
        </div>
    `;
    
    // Add the animation keyframes
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes thinking-pulse {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
            40% { transform: scale(1.1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    container.appendChild(thinkingDiv);
}

// Hide thinking animation
function hideThinkingAnimation() {
    const thinkingAnimation = document.querySelector('.thinking-animation');
    if (thinkingAnimation) {
        thinkingAnimation.remove();
    }
}

// Generate fallback cards if API call fails
function generateFallbackCards(answers) {
    // Extract relevant information from answers
    const academicSuccess = answers[1] || "";
    const motivation = answers[2] || "";
    const challenges = answers[3] || "";
    const learningStyle = answers[4] || "";
    const accountability = answers[5] || "";
    
    // Create base cards that will be shown to all users
    const baseCards = [
        {
            title: "Building Your Web",
            content: "We're mapping your academic journey into a visual ecosystem. Your knowledge, goals, and ideas will come to life in an interactive web.",
            icon: "🕸️"
        },
        {
            title: "AI-Powered Insights",
            content: "SciWeb's AI counselor is analyzing your responses to provide personalized guidance and support throughout your journey.",
            icon: "🧠"
        },
        {
            title: "Connecting the Dots",
            content: "Your challenges, motivations, and learning style will be integrated into your personal knowledge web.",
            icon: "🔗"
        }
    ];
    
    // Generate personalized cards based on user responses
    const personalizedCards = [];
    
    // Academic success card
    if (academicSuccess.length > 10) {
        personalizedCards.push({
            title: "Your Vision of Success",
            content: `"${truncateText(academicSuccess, 100)}" - We'll help you visualize and achieve this definition of success through structured mapping and AI guidance.`,
            icon: "🏆"
        });
    }
    
    // Motivation card
    if (motivation.length > 10) {
        personalizedCards.push({
            title: "Your Driving Force",
            content: `We've identified your key motivators and will use them to fuel your progress. SciWeb will help you stay connected to what drives you.`,
            icon: "⭐"
        });
    }
    
    // Challenges card
    if (challenges.length > 10) {
        personalizedCards.push({
            title: "Overcoming Obstacles",
            content: `We've noted the challenges you've faced. Your web will include strategies and support to help you overcome similar obstacles.`,
            icon: "🏔️"
        });
    }
    
    // Learning style card
    if (learningStyle.length > 10) {
        personalizedCards.push({
            title: "Your Learning Style",
            content: `SciWeb will adapt to your unique learning preferences, making knowledge acquisition more efficient and enjoyable.`,
            icon: "📚"
        });
    }
    
    // Accountability card
    if (accountability.length > 10) {
        personalizedCards.push({
            title: "Staying on Track",
            content: `Your AI counselor will provide the accountability you need, helping you stay focused on your goals.`,
            icon: "🏃‍♂️"
        });
    }
    
    // Combine base cards with personalized cards
    let allCards = [...baseCards];
    
    // If we have personalized cards, mix them in
    if (personalizedCards.length > 0) {
        // Alternate between base and personalized cards for better variety
        allCards = [];
        const maxLength = Math.max(baseCards.length, personalizedCards.length);
        
        for (let i = 0; i < maxLength; i++) {
            if (i < baseCards.length) allCards.push(baseCards[i]);
            if (i < personalizedCards.length) allCards.push(personalizedCards[i]);
        }
    }
    
    return allCards;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
}

// Display cards on the loading screen with animations
function displayProcessingCards(cards) {
    const container = document.querySelector('.finale-container');
    if (!container) return;
    
    // Clear existing loader
    const loader = container.querySelector('.loader');
    if (loader) loader.remove();
    
    // Create cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'processing-cards';
    cardsContainer.style.cssText = `
        width: 100%;
        max-width: 500px;
        margin-top: 2rem;
        overflow: hidden;
        position: relative;
        min-height: 200px;
    `;
    container.appendChild(cardsContainer);
    
    // Keep track of the current card
    let currentCardIndex = 0;
    let cardsShown = 0;
    const totalToShow = Math.min(8, cards.length * 2); // Show each card at least once, but cap at 8 total views
    
    // Function to show a card
    function showCard(index) {
        // Clear previous card
        cardsContainer.innerHTML = '';
        
        // Create and append new card
        const card = document.createElement('div');
        card.className = 'processing-card';
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            border-radius: 1rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.5s ease, transform 0.5s ease;
            text-align: left;
            display: flex;
            align-items: center;
        `;
        
        const cardData = cards[index];
        
        // Card icon
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            font-size: 2.5rem;
            margin-right: 1rem;
            background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
        `;
        iconContainer.textContent = cardData.icon;
        card.appendChild(iconContainer);
        
        // Card content
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `flex: 1;`;
        
        const title = document.createElement('h3');
        title.textContent = cardData.title;
        title.style.cssText = `
            margin: 0 0 0.5rem 0;
            color: #fff;
            font-size: 1.2rem;
            font-weight: 600;
        `;
        
        const content = document.createElement('p');
        content.textContent = cardData.content;
        content.style.cssText = `
            margin: 0;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.95rem;
            line-height: 1.4;
        `;
        
        contentContainer.appendChild(title);
        contentContainer.appendChild(content);
        card.appendChild(contentContainer);
        
        cardsContainer.appendChild(card);
        
        // Animate the card in
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
        
        // Add particles for visual interest
        addBackgroundParticles(card);
        
        // Increment counters
        cardsShown++;
        currentCardIndex = (currentCardIndex + 1) % cards.length;
        
        // Check if we've shown enough cards
        if (cardsShown >= totalToShow) {
            // Show the proceed button after the last card has been visible for a while
            setTimeout(() => {
                showProceedButton(container);
            }, 3000);
        } else {
            // Queue next card
            setTimeout(() => {
                // Animate the card out
                card.style.opacity = '0';
                card.style.transform = 'translateY(-30px)';
                
                // Show next card after current card fades out
                setTimeout(() => showCard(currentCardIndex), 500);
            }, 4000); // Show each card for 4 seconds
        }
    }
    
    // Start showing cards
    showCard(currentCardIndex);
}

// Show the proceed button that allows users to continue to the My Web page
function showProceedButton(container) {
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'proceed-button-container';
    buttonContainer.style.cssText = `
        margin-top: 2rem;
        text-align: center;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    `;
    
    // Create the button with a pulse effect
    const proceedButton = document.createElement('button');
    proceedButton.className = 'proceed-button';
    proceedButton.textContent = 'Enter My Web';
    proceedButton.style.cssText = `
        background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
        color: white;
        border: none;
        padding: 0.9rem 2rem;
        font-size: 1.1rem;
        font-weight: 600;
        border-radius: 1.5rem;
        cursor: pointer;
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1);
        font-family: 'Poppins', sans-serif;
        position: relative;
        overflow: hidden;
        animation: button-pulse 2s infinite;
    `;
    
    // Add a message below the button
    const message = document.createElement('p');
    message.textContent = 'Your personalized knowledge web is ready';
    message.style.cssText = `
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.95rem;
        margin-top: 1rem;
        font-family: 'Poppins', sans-serif;
    `;
    
    // Add the animation keyframes
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes button-pulse {
            0% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1); }
            50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.5), 0 0 70px rgba(99, 102, 241, 0.2); }
            100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1); }
        }
        
        @keyframes ripple {
            to {
                transform: scale(3);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add button click event
    proceedButton.addEventListener('click', async function(e) {
        // Ripple effect on click
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = proceedButton.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size/2}px`;
        ripple.style.top = `${e.clientY - rect.top - size/2}px`;
        
        proceedButton.appendChild(ripple);
        
        // Disable the button to prevent multiple clicks
        proceedButton.disabled = true;
        proceedButton.style.opacity = '0.7';
        proceedButton.textContent = 'Loading...';
        
        // Fetch classes from Jupiter API before redirecting
        let classes = [];
        try {
            const creds = onboardingAnswersGlobal[6] || {};
            const resp = await fetch('/ai/fetch_jupiter_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ osis: creds.fullname, password: creds.jupiterPassword })
            });
            if (resp.ok) {
                const data = await resp.json();
                console.log('Fetched classes:', data.classes);
                classes = data.classes;
                localStorage.setItem('classes', JSON.stringify(classes));
            } else {
                console.error('Failed to fetch classes:', resp.status, await resp.text());
            }
        } catch (err) {
            console.error('Error fetching Jupiter classes:', err);
        }
        
        // Initialize the user's tree in the database
        try {
            const initResp = await fetch('/ai/initialize_tree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: localStorage.getItem('userId'),
                    responses: onboardingAnswersGlobal,
                    classes: classes
                })
            });
            if (initResp.ok) {
                const initData = await initResp.json();
                console.log('Initialized tree:', initData);
                localStorage.setItem('treeId', initData.id);
            } else {
                console.error('Failed to initialize tree:', initResp.status, await initResp.text());
            }
        } catch (err) {
            console.error('Error initializing tree:', err);
        }
        
        // Redirect after a short delay to allow background tasks to complete
        setTimeout(() => {
            window.location.href = '/tree';
        }, 500);
        
        // Clean up ripple effect
        setTimeout(() => {
            ripple.remove();
        }, 700);
    });
    
    // Append elements
    buttonContainer.appendChild(proceedButton);
    buttonContainer.appendChild(message);
    container.appendChild(buttonContainer);
    
    // Animate in
    setTimeout(() => {
        buttonContainer.style.opacity = '1';
        buttonContainer.style.transform = 'translateY(0)';
        
        // Add hover effect after animation
        proceedButton.addEventListener('mouseenter', () => {
            proceedButton.style.transform = 'translateY(-3px)';
            proceedButton.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.5), 0 0 80px rgba(99, 102, 241, 0.2)';
        });
        
        proceedButton.addEventListener('mouseleave', () => {
            proceedButton.style.transform = 'translateY(0)';
            proceedButton.style.boxShadow = '';
        });
    }, 100);
    
    // Show some final particles around the button for visual interest
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            addButtonParticle(proceedButton);
        }, i * 300);
    }
}

// Add particle effect around the proceed button
function addButtonParticle(button) {
    const rect = button.getBoundingClientRect();
    const particle = document.createElement('div');
    
    // Randomize particle appearance
    const size = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    
    // Position relative to button
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    
    particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: #6366f1;
        border-radius: 50%;
        pointer-events: none;
        z-index: -1;
        opacity: 0.8;
        box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        left: ${rect.width/2 + x}px;
        top: ${rect.height/2 + y}px;
        transform: scale(0);
    `;
    
    button.appendChild(particle);
    
    // Animate the particle
    setTimeout(() => {
        particle.style.transition = `all 1.5s cubic-bezier(.23,1,.32,1)`;
        particle.style.transform = `scale(1)`;
        
        // Move particle outward slightly
        const newX = x * 1.2;
        const newY = y * 1.2;
        particle.style.left = `${rect.width/2 + newX}px`;
        particle.style.top = `${rect.height/2 + newY}px`;
        
        // Fade out
        setTimeout(() => {
            particle.style.opacity = '0';
        }, 800);
    }, 10);
    
    // Remove particle after animation completes
    setTimeout(() => {
        particle.remove();
    }, 2000);
}

// Add particle effects to cards
function addBackgroundParticles(card) {
    const particlesCount = 6;
    
    for (let i = 0; i < particlesCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 6px;
            height: 6px;
            background: rgba(99, 102, 241, 0.6);
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
            pointer-events: none;
            z-index: -1;
        `;
        
        // Random position around the card
        const size = 4 + Math.random() * 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        
        switch(side) {
            case 0: // top
                particle.style.top = '-10px';
                particle.style.left = `${Math.random() * 100}%`;
                break;
            case 1: // right
                particle.style.right = '-10px';
                particle.style.top = `${Math.random() * 100}%`;
                break;
            case 2: // bottom
                particle.style.bottom = '-10px';
                particle.style.left = `${Math.random() * 100}%`;
                break;
            case 3: // left
                particle.style.left = '-10px';
                particle.style.top = `${Math.random() * 100}%`;
                break;
        }
        
        card.appendChild(particle);
        
        // Animate the particle
        setTimeout(() => {
            particle.style.transition = `all ${1.5 + Math.random()}s ease-out`;
            
            switch(side) {
                case 0: // top to bottom
                    particle.style.top = 'calc(100% + 10px)';
                    break;
                case 1: // right to left
                    particle.style.right = 'calc(100% + 10px)';
                    break;
                case 2: // bottom to top
                    particle.style.bottom = 'calc(100% + 10px)';
                    break;
                case 3: // left to right
                    particle.style.left = 'calc(100% + 10px)';
                    break;
            }
            
            particle.style.opacity = '0';
        }, 100);
        
        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, 2000);
    }
}

// Export functions for use in main script
window.processUserResponses = processUserResponses;
window.generatePersonalizedCards = generateFallbackCards;
window.displayProcessingCards = displayProcessingCards; 