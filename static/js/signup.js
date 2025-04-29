// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const signupForm = document.getElementById('signup-form');
    const accountSection = document.getElementById('account-section');
    const verificationSection = document.getElementById('verification-section');
    const accountStep = document.getElementById('account-step');
    const verificationStep = document.getElementById('verification-step');
    const progressLine = document.querySelector('.progress-line');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const verifyBtn = document.getElementById('verify-btn');
    const resendCodeBtn = document.getElementById('resend-code');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const codeInputs = document.querySelectorAll('.code-input');
    const verificationCodeInput = document.getElementById('verification-code');
    
    // Setup event listeners
    if (nextBtn) {
        nextBtn.addEventListener('click', goToVerification);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', goToAccount);
    }
    
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }
    
    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', resendVerificationCode);
    }
    
    // Setup code inputs
    codeInputs.forEach(input => {
        input.addEventListener('keyup', handleCodeInput);
        input.addEventListener('keydown', handleBackspace);
        input.addEventListener('paste', handlePaste);
    });
    
    // Initialize particles animation
    initParticles();
    
    // Form step navigation functions
    function goToVerification(e) {
        e.preventDefault();
        
        // Simple validation
        if (!validateAccountSection()) {
            return;
        }
        
        // Hide account section, show verification section
        accountSection.classList.remove('active');
        verificationSection.classList.add('active');
        
        // Update progress indicators
        accountStep.classList.add('active');
        verificationStep.classList.add('active');
        progressLine.classList.add('active');
        
        // Send verification code (simulated)
        sendVerificationCode(emailInput.value);
        
        // Focus first code input
        if (codeInputs.length > 0) {
            codeInputs[0].focus();
        }
    }
    
    function goToAccount(e) {
        e.preventDefault();
        
        // Hide verification section, show account section
        verificationSection.classList.remove('active');
        accountSection.classList.add('active');
        
        // Update progress indicators
        verificationStep.classList.remove('active');
        progressLine.classList.remove('active');
    }
    
    // Validation function
    function validateAccountSection() {
        let isValid = true;
        
        // Reset previous error states
        const inputs = accountSection.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.classList.remove('error');
            const errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        });
        
        // Validate required fields
        inputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                showError(input, 'This field is required');
                isValid = false;
            }
        });
        
        // Validate email format
        if (emailInput.value.trim() && !validateEmail(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate password strength
        if (passwordInput.value.trim() && passwordInput.value.length < 8) {
            showError(passwordInput, 'Password must be at least 8 characters long');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Helper functions
    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
    
    function showError(input, message) {
        input.classList.add('error');
        
        // Only add error message if it doesn't exist yet
        if (!input.parentElement.querySelector('.error-message')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            
            if (input.parentElement.classList.contains('password-input')) {
                input.parentElement.parentElement.appendChild(errorDiv);
            } else {
                input.parentElement.appendChild(errorDiv);
            }
        }
    }
    
    // Toggle password visibility
    function togglePasswordVisibility() {
        const icon = togglePasswordBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    
    // Verification code input handling
    function handleCodeInput(e) {
        const input = e.target;
        const index = parseInt(input.dataset.index);
        
        // Automatically move to next input if value is entered
        if (input.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
        
        // Combine all values into hidden input
        combineCodeValues();
        
        // Check if all inputs are filled to enable submit button
        checkCodeCompletion();
    }
    
    function handleBackspace(e) {
        // Handle backspace key
        if (e.key === 'Backspace') {
            const input = e.target;
            const index = parseInt(input.dataset.index);
            
            // If current input is empty and not the first one, focus previous input
            if (input.value.length === 0 && index > 0) {
                e.preventDefault();
                codeInputs[index - 1].focus();
            }
        }
    }
    
    function handlePaste(e) {
        e.preventDefault();
        
        // Get pasted content
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedData = clipboardData.getData('Text').trim();
        
        // Only proceed if it looks like a verification code
        if (/^\d+$/.test(pastedData) && pastedData.length <= codeInputs.length) {
            // Distribute characters to inputs
            for (let i = 0; i < pastedData.length; i++) {
                if (i < codeInputs.length) {
                    codeInputs[i].value = pastedData[i];
                }
            }
            
            // Focus the input after the last filled one
            if (pastedData.length < codeInputs.length) {
                codeInputs[pastedData.length].focus();
            }
            
            // Combine all values into hidden input
            combineCodeValues();
            
            // Check if all inputs are filled
            checkCodeCompletion();
        }
    }
    
    function combineCodeValues() {
        let combinedCode = '';
        codeInputs.forEach(input => {
            combinedCode += input.value;
        });
        verificationCodeInput.value = combinedCode;
    }
    
    function checkCodeCompletion() {
        let allFilled = true;
        codeInputs.forEach(input => {
            if (!input.value) {
                allFilled = false;
            }
        });
        
        // Enable or disable verify button based on completion
        if (verifyBtn) {
            verifyBtn.disabled = !allFilled;
            if (allFilled) {
                verifyBtn.classList.add('active');
            } else {
                verifyBtn.classList.remove('active');
            }
        }
    }
    
    // API interactions (simulated)
    function sendVerificationCode(email) {
        // In a real app, this would make an API call to send a verification code
        console.log(`Verification code sent to ${email}`);
        
        // Add visual feedback
        const message = document.createElement('div');
        message.className = 'success-toast';
        message.textContent = `Verification code sent to ${email}`;
        document.body.appendChild(message);
        
        // Remove message after delay
        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => {
                message.remove();
            }, 500);
        }, 3000);
    }
    
    function resendVerificationCode(e) {
        e.preventDefault();
        
        // Disable button temporarily to prevent spam
        resendCodeBtn.disabled = true;
        resendCodeBtn.textContent = 'Sending...';
        
        // Simulate API call delay
        setTimeout(() => {
            sendVerificationCode(emailInput.value);
            
            // Reset button
            resendCodeBtn.disabled = false;
            resendCodeBtn.textContent = 'Resend';
        }, 1500);
    }
    
    // Particle animation
    function initParticles() {
        const container = document.querySelector('.particles-container');
        
        // Create particles
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Set random properties
            const size = Math.random() * 4 + 1;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const opacity = Math.random() * 0.5 + 0.2;
            const speed = Math.random() * 100 + 20;
            const delay = Math.random() * 5;
            
            // Apply styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.opacity = opacity;
            particle.style.background = `rgba(255, 26, 117, ${opacity})`;
            particle.style.animation = `float ${speed}s ease-in-out infinite alternate`;
            particle.style.animationDelay = `-${delay}s`;
            
            container.appendChild(particle);
        }
    }
    
    // Add form submission event
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Verifying...';
            
            // Get form data
            const userData = {
                first_name: firstNameInput.value,
                last_name: lastNameInput.value,
                email: emailInput.value,
                username: document.getElementById('username').value || '',
                grade: document.getElementById('grade').value,
                password: passwordInput.value, // Note: In production, password should be hashed on the server
                verification_code: verificationCodeInput.value,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Send data to server to create user
            fetch('/api/Members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.id) {
                    // Success - store user ID and redirect to onboarding
                    localStorage.setItem('userId', data.id);
                    window.location.href = '/onboarding/usertype';
                } else {
                    // Handle error
                    alert('Error creating account: ' + (data.error || 'Unknown error'));
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = 'Verify & Continue';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error creating account. Please try again.');
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = 'Verify & Continue';
            });
        });
    }
}); 