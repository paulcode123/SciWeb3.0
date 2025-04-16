document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskList = document.getElementById('sortable-tasks');
    const addTaskBtn = document.getElementById('add-task');
    const addBreakBtn = document.getElementById('add-break');
    const taskModal = document.getElementById('task-modal');
    const eventModal = document.getElementById('event-modal');
    const createEventBtn = document.getElementById('create-event');
    const taskForm = document.getElementById('task-form');
    const eventForm = document.getElementById('event-form');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-btn');
    const rsvpBtns = document.querySelectorAll('.rsvp-btn');
    const themeToggle = document.querySelector('.theme-toggle');
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    const currentDateEl = document.getElementById('current-date');
    
    // Focus Tools Elements
    const startTimerBtn = document.getElementById('start-timer');
    const pauseTimerBtn = document.getElementById('pause-timer');
    const resetTimerBtn = document.getElementById('reset-timer');
    const timerMinutes = document.getElementById('timer-minutes');
    const timerSeconds = document.getElementById('timer-seconds');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const activateFocusBtn = document.getElementById('activate-focus-mode');
    const focusModeOverlay = document.getElementById('focus-mode-overlay');
    const exitFocusModeBtn = document.getElementById('exit-focus-mode');
    
    // Initialize current date
    const today = new Date();
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    currentDateEl.textContent = today.toLocaleDateString('en-US', dateOptions);
    
    // Initialize sortable for task reordering
    if (taskList) {
        new Sortable(taskList, {
            handle: '.task-drag-handle',
            animation: 150,
            ghostClass: 'task-ghost',
            onEnd: function() {
                // In a real application, you would save the new order to a database
                console.log('Task order changed');
            }
        });
    }
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        
        // Save preference to localStorage
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
    
    // Load theme preference from localStorage
    function loadThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            const icon = themeToggle.querySelector('i');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    loadThemePreference();
    
    // Date navigation
    let currentDate = new Date();
    
    prevDayBtn.addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDisplayedDate();
    });
    
    nextDayBtn.addEventListener('click', function() {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDisplayedDate();
    });
    
    function updateDisplayedDate() {
        const isToday = currentDate.toDateString() === new Date().toDateString();
        let dateText = currentDate.toLocaleDateString('en-US', dateOptions);
        
        if (isToday) {
            dateText = 'Today, ' + dateText;
        }
        
        currentDateEl.textContent = dateText;
        
        // In a real application, you would fetch tasks for the selected date
        // For now, we'll simulate this by just updating the date display
    }
    
    // Modal functionality
    function openModal(modal) {
        modal.classList.add('show');
    }
    
    function closeModal(modal) {
        modal.classList.remove('show');
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Add task functionality
    addTaskBtn.addEventListener('click', function() {
        modalTitle.textContent = 'Add New Task';
        taskForm.reset();
        openModal(taskModal);
    });
    
    // Add break functionality
    addBreakBtn.addEventListener('click', function() {
        modalTitle.textContent = 'Add Break';
        taskForm.reset();
        
        // Pre-fill the form with break defaults
        document.getElementById('task-title').value = 'Break';
        document.getElementById('task-category').value = 'break';
        
        openModal(taskModal);
    });
    
    // Edit task functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-task')) {
            const taskItem = e.target.closest('.task-item');
            const taskId = taskItem.dataset.id;
            const taskTitle = taskItem.querySelector('h3').textContent;
            const taskLocation = taskItem.querySelector('p').textContent.replace('📍 ', '');
            const taskCategory = taskItem.dataset.category;
            const taskPriority = taskItem.dataset.priority;
            
            // Get time from task time element (format: "HH:MM AM - HH:MM PM")
            const timeText = taskItem.querySelector('.task-time').textContent;
            const [startTime, endTime] = timeText.split(' - ');
            
            // Convert to 24-hour format for input value
            function convertTo24Hour(time12h) {
                const [time, modifier] = time12h.split(' ');
                let [hours, minutes] = time.split(':');
                
                if (hours === '12') {
                    hours = '00';
                }
                
                if (modifier === 'PM') {
                    hours = parseInt(hours, 10) + 12;
                }
                
                return `${hours}:${minutes}`;
            }
            
            modalTitle.textContent = 'Edit Task';
            document.getElementById('task-id').value = taskId;
            document.getElementById('task-title').value = taskTitle;
            document.getElementById('task-location').value = taskLocation;
            document.getElementById('task-category').value = taskCategory;
            document.getElementById('task-priority').value = taskPriority;
            document.getElementById('task-start-time').value = convertTo24Hour(startTime);
            document.getElementById('task-end-time').value = convertTo24Hour(endTime);
            
            openModal(taskModal);
        }
    });
    
    // Delete task functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-task')) {
            const taskItem = e.target.closest('.task-item');
            const taskId = taskItem.dataset.id;
            
            // In a real application, you would send a request to delete this task
            // For now, we'll just remove it from the DOM
            if (confirm('Are you sure you want to delete this task?')) {
                taskItem.remove();
            }
        }
    });
    
    // Handle task form submission
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value;
        const startTime = document.getElementById('task-start-time').value;
        const endTime = document.getElementById('task-end-time').value;
        const location = document.getElementById('task-location').value;
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;
        
        // Convert to 12-hour format for display
        function convertTo12Hour(time24h) {
            const [hours, minutes] = time24h.split(':');
            const hour = parseInt(hours, 10);
            
            return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
        }
        
        const timeDisplay = `${convertTo12Hour(startTime)} - ${convertTo12Hour(endTime)}`;
        
        if (taskId) {
            // Edit existing task
            const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
            taskItem.querySelector('h3').textContent = title;
            taskItem.querySelector('p').textContent = `📍 ${location}`;
            taskItem.querySelector('.task-time').textContent = timeDisplay;
            taskItem.querySelector('.task-category').textContent = category;
            taskItem.querySelector('.task-category').className = `task-category ${category}`;
            taskItem.dataset.category = category;
            taskItem.dataset.priority = priority;
        } else {
            // Create new task
            const newId = new Date().getTime(); // Simple unique ID for demonstration
            
            const taskHTML = `
                <div class="task-item" data-id="${newId}" data-category="${category}" data-priority="${priority}">
                    <div class="task-drag-handle"><i class="fas fa-grip-lines"></i></div>
                    <div class="task-time">${timeDisplay}</div>
                    <div class="task-content">
                        <h3>${title}</h3>
                        <p><i class="fas fa-map-marker-alt"></i> ${location}</p>
                        <div class="task-category ${category}">${category}</div>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn edit-task" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="task-btn delete-task" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            
            taskList.insertAdjacentHTML('beforeend', taskHTML);
        }
        
        // Close the modal
        closeModal(taskModal);
    });
    
    // Create event functionality
    createEventBtn.addEventListener('click', function() {
        eventForm.reset();
        openModal(eventModal);
    });
    
    // Handle event form submission
    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('event-title').value;
        const category = document.getElementById('event-category').value;
        const date = document.getElementById('event-date').value;
        const startTime = document.getElementById('event-start-time').value;
        const endTime = document.getElementById('event-end-time').value;
        const location = document.getElementById('event-location').value;
        
        // In a real application, you would save this to a database
        // For now, we'll just show a confirmation and close the modal
        alert(`Event "${title}" created successfully!`);
        closeModal(eventModal);
    });
    
    // RSVP functionality
    rsvpBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const eventId = this.dataset.eventId;
            const currentText = this.textContent;
            
            // Toggle RSVP status
            if (currentText === 'RSVP') {
                this.textContent = 'CANCEL';
                this.classList.add('rsvp-confirmed');
                
                // In a real application, you would save this to a database
                alert(`You have RSVP'd to this event!`);
            } else {
                this.textContent = 'RSVP';
                this.classList.remove('rsvp-confirmed');
                
                // In a real application, you would save this to a database
                alert(`You have cancelled your RSVP.`);
            }
        });
    });
    
    // Pomodoro Timer functionality
    let timerInterval;
    let timerRunning = false;
    let timerPaused = false;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerMinutes.textContent = minutes.toString().padStart(2, '0');
        timerSeconds.textContent = seconds.toString().padStart(2, '0');
    }
    
    startTimerBtn.addEventListener('click', function() {
        if (!timerRunning) {
            timerRunning = true;
            timerPaused = false;
            
            startTimerBtn.disabled = true;
            pauseTimerBtn.disabled = false;
            
            timerInterval = setInterval(function() {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    timerRunning = false;
                    startTimerBtn.disabled = false;
                    pauseTimerBtn.disabled = true;
                    
                    // Play sound and show notification in a real application
                    alert('Timer completed!');
                }
            }, 1000);
        }
    });
    
    pauseTimerBtn.addEventListener('click', function() {
        if (timerRunning && !timerPaused) {
            clearInterval(timerInterval);
            timerPaused = true;
            pauseTimerBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else if (timerRunning && timerPaused) {
            timerPaused = false;
            pauseTimerBtn.innerHTML = '<i class="fas fa-pause"></i>';
            
            timerInterval = setInterval(function() {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    timerRunning = false;
                    timerPaused = false;
                    startTimerBtn.disabled = false;
                    pauseTimerBtn.disabled = true;
                    pauseTimerBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    
                    // Play sound and show notification in a real application
                    alert('Timer completed!');
                }
            }, 1000);
        }
    });
    
    resetTimerBtn.addEventListener('click', function() {
        clearInterval(timerInterval);
        timerRunning = false;
        timerPaused = false;
        
        // Get the active timer duration from the active mode button
        const activeMode = document.querySelector('.mode-btn.active');
        timeLeft = parseInt(activeMode.dataset.time) * 60;
        
        updateTimerDisplay();
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
        pauseTimerBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
    
    // Timer mode switching
    modeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            modeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            timeLeft = parseInt(this.dataset.time) * 60;
            updateTimerDisplay();
            
            // Reset timer state
            clearInterval(timerInterval);
            timerRunning = false;
            timerPaused = false;
            startTimerBtn.disabled = false;
            pauseTimerBtn.disabled = true;
            pauseTimerBtn.innerHTML = '<i class="fas fa-pause"></i>';
        });
    });
    
    // Focus Mode
    activateFocusBtn.addEventListener('click', function() {
        // Get the current active task (in a real application, this would be more sophisticated)
        // For now, we'll just use the first task with the "study" category
        const studyTask = document.querySelector('.task-item[data-category="study"]');
        
        if (studyTask) {
            const taskName = studyTask.querySelector('h3').textContent;
            const taskTime = studyTask.querySelector('.task-time').textContent;
            
            document.getElementById('focus-task-name').textContent = taskName;
            document.getElementById('focus-task-time').textContent = taskTime;
        }
        
        // Enable Focus Mode
        focusModeOverlay.classList.remove('hidden');
        
        // In a real application, you would implement white noise, notification blocking, etc.
    });
    
    exitFocusModeBtn.addEventListener('click', function() {
        focusModeOverlay.classList.add('hidden');
        
        // In a real application, you would restore normal mode settings
    });
    
    // Initialize the first-time user experience
    function checkFirstTimeUser() {
        const isFirstTime = localStorage.getItem('scheduleTourComplete') !== 'true';
        
        if (isFirstTime) {
            // In a real application, you would show a tour or tutorial
            // For now, we'll just mark it as completed
            localStorage.setItem('scheduleTourComplete', 'true');
        }
    }
    checkFirstTimeUser();
}); 