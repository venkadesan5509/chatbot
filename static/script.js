document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const fileInfo = document.getElementById('file-info');
    const filenameDisplay = document.getElementById('filename');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // Drag & Drop Handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('drag-over'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                uploadFile(file);
            } else {
                addMessage('bot', '⚠️ Please upload a valid PDF file.');
            }
        }
    }

    function uploadFile(file) {
        // Show loading state in file area
        dropArea.style.opacity = '0.5';
        
        const formData = new FormData();
        formData.append("file", file);

        fetch("/upload", { method: "POST", body: formData })
            .then(res => {
                if (!res.ok) throw new Error('Upload failed');
                return res.json();
            })
            .then(data => {
                // Update UI
                filenameDisplay.textContent = file.name;
                dropArea.classList.add('hidden');
                fileInfo.classList.remove('hidden');
                addMessage('bot', `✅ Document "${file.name}" uploaded successfully! I'm ready to answer your questions.`);
            })
            .catch(err => {
                console.error(err);
                addMessage('bot', '❌ Error uploading document. Please try again.');
                dropArea.style.opacity = '1';
            });
    }

    // Chat Functionality
    function sendMessage() {
        const msg = userInput.value.trim();
        if (!msg) return;

        // Add user message
        addMessage('user', msg);
        userInput.value = '';

        // Show typing indicator
        const loadingId = addLoadingIndicator();

        fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: msg })
        })
        .then(res => res.json())
        .then(data => {
            // Remove loading indicator
            removeMessage(loadingId);
            addMessage('bot', data.answer);
        })
        .catch(err => {
            removeMessage(loadingId);
            addMessage('bot', '⚠️ Sorry, something went wrong. Please try again.');
        });
    }

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    sendBtn.addEventListener('click', sendMessage);

    // Helpers
    function addMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = sender === 'bot' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = `<p>${formatText(text)}</p>`;
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        
        chatBox.appendChild(msgDiv);
        scrollToBottom();
        return msgDiv.id = 'msg-' + Date.now();
    }

    function addLoadingIndicator() {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message bot loading`;
        msgDiv.id = 'loading-' + Date.now();
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        chatBox.appendChild(msgDiv);
        scrollToBottom();
        return msgDiv.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function formatText(text) {
        // Simple formatter for bold text if the AI sends markdown-like syntax
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                   .replace(/\n/g, '<br>');
    }
});
