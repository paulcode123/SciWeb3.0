// Motivation Stream JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Reference to DOM elements
    const createPostBtn = document.getElementById('create-post-btn');
    const createPostArea = document.getElementById('create-post-area');
    const cancelPostBtn = document.getElementById('cancel-post');
    const filterLinks = document.querySelectorAll('.dropdown-content a');
    const posts = document.querySelectorAll('.motivation-post');
    const likeButtons = document.querySelectorAll('.like-btn');
    const commentButtons = document.querySelectorAll('.comment-btn');
    const saveButtons = document.querySelectorAll('.save-btn');
    const refreshQuoteBtn = document.querySelector('.refresh-quote');

    // Show/hide post creation area
    if (createPostBtn && createPostArea) {
        createPostBtn.addEventListener('click', function() {
            createPostArea.style.display = 'block';
            window.scrollTo({
                top: createPostArea.offsetTop - 100,
                behavior: 'smooth'
            });
        });
    }

    // Cancel post creation
    if (cancelPostBtn && createPostArea) {
        cancelPostBtn.addEventListener('click', function() {
            createPostArea.style.display = 'none';
        });
    }

    // Filter posts functionality
    if (filterLinks.length > 0) {
        filterLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Update active status
                filterLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                // Filter posts
                if (filter === 'all') {
                    posts.forEach(post => post.style.display = 'block');
                } else {
                    posts.forEach(post => {
                        if (post.getAttribute('data-category') === filter) {
                            post.style.display = 'block';
                        } else {
                            post.style.display = 'none';
                        }
                    });
                }
            });
        });
    }

    // Like button functionality
    if (likeButtons.length > 0) {
        likeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const likeIcon = this.querySelector('i');
                const likeCount = this.querySelector('span');
                
                if (likeIcon.classList.contains('far')) {
                    // Like
                    likeIcon.classList.remove('far');
                    likeIcon.classList.add('fas');
                    likeCount.textContent = parseInt(likeCount.textContent) + 1;
                    this.style.color = '#e53935';
                    likeIcon.style.color = '#e53935';
                } else {
                    // Unlike
                    likeIcon.classList.remove('fas');
                    likeIcon.classList.add('far');
                    likeCount.textContent = parseInt(likeCount.textContent) - 1;
                    this.style.color = '';
                    likeIcon.style.color = '';
                }
            });
        });
    }

    // Comment button functionality
    if (commentButtons.length > 0) {
        commentButtons.forEach(button => {
            button.addEventListener('click', function() {
                const commentsSection = this.closest('.motivation-post').querySelector('.post-comments');
                const commentInput = commentsSection.querySelector('input');
                
                if (commentsSection.style.display === 'none') {
                    commentsSection.style.display = 'block';
                    commentInput.focus();
                } else {
                    commentInput.focus();
                }
                
                // Scroll to comments
                commentsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });
    }

    // Save button functionality
    if (saveButtons.length > 0) {
        saveButtons.forEach(button => {
            button.addEventListener('click', function() {
                const saveIcon = this.querySelector('i');
                
                if (saveIcon.classList.contains('far')) {
                    // Save
                    saveIcon.classList.remove('far');
                    saveIcon.classList.add('fas');
                    this.style.color = '#2575fc';
                    saveIcon.style.color = '#2575fc';
                    showToast('Post saved to your collection');
                } else {
                    // Unsave
                    saveIcon.classList.remove('fas');
                    saveIcon.classList.add('far');
                    this.style.color = '';
                    saveIcon.style.color = '';
                    showToast('Post removed from your collection');
                }
            });
        });
    }

    // Comment like buttons
    const commentLikeButtons = document.querySelectorAll('.comment-action-btn i.far.fa-heart');
    if (commentLikeButtons.length > 0) {
        commentLikeButtons.forEach(button => {
            button.parentElement.addEventListener('click', function() {
                const likeIcon = this.querySelector('i');
                const likeCount = this.querySelector('span');
                
                if (likeIcon.classList.contains('far')) {
                    likeIcon.classList.remove('far');
                    likeIcon.classList.add('fas');
                    likeCount.textContent = parseInt(likeCount.textContent) + 1;
                    likeIcon.style.color = '#e53935';
                } else {
                    likeIcon.classList.remove('fas');
                    likeIcon.classList.add('far');
                    likeCount.textContent = parseInt(likeCount.textContent) - 1;
                    likeIcon.style.color = '';
                }
            });
        });
    }

    // Reply buttons
    const replyButtons = document.querySelectorAll('.reply-btn');
    if (replyButtons.length > 0) {
        replyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const comment = this.closest('.comment');
                const username = comment.querySelector('h4').textContent.split(' ')[0];
                const form = comment.closest('.post-comments').querySelector('.add-comment-form input');
                
                form.value = `@${username} `;
                form.focus();
            });
        });
    }

    // Submit comment forms
    const commentForms = document.querySelectorAll('.add-comment-form');
    if (commentForms.length > 0) {
        commentForms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const input = this.querySelector('input');
                const commentText = input.value.trim();
                
                if (commentText) {
                    // In a real application, this would send data to the server
                    // For now, we'll just simulate adding a comment to the UI
                    addNewComment(this, commentText);
                    input.value = '';
                }
            });
        });
    }

    // Function to add a new comment to the UI
    function addNewComment(form, text) {
        const commentsContainer = form.closest('.post-comments');
        const newComment = document.createElement('div');
        newComment.className = 'comment';
        
        newComment.innerHTML = `
            <img src="${form.querySelector('img').src}" alt="Your Avatar" class="comment-avatar">
            <div class="comment-content">
                <h4>You <span class="comment-time">Just now</span></h4>
                <p>${text}</p>
                <div class="comment-actions">
                    <button class="comment-action-btn"><i class="far fa-heart"></i> <span>0</span></button>
                    <button class="comment-action-btn reply-btn">Reply</button>
                </div>
            </div>
        `;
        
        // Insert before the form
        commentsContainer.insertBefore(newComment, form);
        
        // Update comment count
        const commentCountEl = commentsContainer.closest('.motivation-post').querySelector('.comment-btn span');
        const currentCount = parseInt(commentCountEl.textContent);
        commentCountEl.textContent = currentCount + 1;
        
        // Show toast notification
        showToast('Comment posted successfully!');
    }

    // Create and show toast notifications
    function showToast(message) {
        // Check if a toast container already exists
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Show the toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove the toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Quote generator functionality
    if (refreshQuoteBtn) {
        const quotes = [
            {
                text: "The only way to do great work is to love what you do.",
                author: "Steve Jobs"
            },
            {
                text: "Believe you can and you're halfway there.",
                author: "Theodore Roosevelt"
            },
            {
                text: "It does not matter how slowly you go as long as you do not stop.",
                author: "Confucius"
            },
            {
                text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
                author: "Winston Churchill"
            },
            {
                text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
                author: "Zig Ziglar"
            },
            {
                text: "The future belongs to those who believe in the beauty of their dreams.",
                author: "Eleanor Roosevelt"
            },
            {
                text: "You are never too old to set another goal or to dream a new dream.",
                author: "C.S. Lewis"
            }
        ];
        
        refreshQuoteBtn.addEventListener('click', function() {
            const quoteContainer = document.querySelector('.daily-quote');
            const randomIndex = Math.floor(Math.random() * quotes.length);
            const quote = quotes[randomIndex];
            
            quoteContainer.innerHTML = `
                ${quote.text}
                <span class="quote-author">— ${quote.author}</span>
            `;
        });
    }

    // Add CSS for toast notifications
    const style = document.createElement('style');
    style.textContent = `
        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        }
        
        .toast {
            background-color: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-top: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            opacity: 0;
            transition: transform 0.3s, opacity 0.3s;
            font-weight: 500;
        }
        
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    // Load more button functionality
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            // In a real application, this would fetch more posts from the server
            // For demo purposes, we'll just show a loading state and a message
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            setTimeout(() => {
                this.innerHTML = 'Load More <i class="fas fa-sync"></i>';
                showToast('No more posts to load');
            }, 1500);
        });
    }
}); 