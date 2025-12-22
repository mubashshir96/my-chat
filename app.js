// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDArQkJaFoPMQeOoHi1LQPB2Umm4LS8oK8",
  authDomain: "to-1-chat-a9582.firebaseapp.com",
  databaseURL: "https://to-1-chat-a9582-default-rtdb.firebaseio.com",
  projectId: "to-1-chat-a9582",
  storageBucket: "to-1-chat-a9582.appspot.com",
  messagingSenderId: "382335872296",
  appId: "1:382335872296:web:7f7d13223f1787118df41d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// DOM Elements
const loginBox = document.getElementById('loginBox');
const chatBox = document.getElementById('chatBox');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const onlineUsersList = document.getElementById('onlineUsersList');
const currentUserEmail = document.getElementById('currentUserEmail');

// Login Function
window.login = async function() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
};

// Logout Function
window.logout = function() {
  if (confirm('Are you sure you want to logout?')) {
    // End call if active
    if (window.isInCall) {
      endCall();
    }
    
    // Update online status
    if (auth.currentUser) {
      db.ref('onlineUsers/' + auth.currentUser.uid).remove();
    }
    
    // Sign out
    auth.signOut();
  }
};

// Send Message
window.sendMessage = function() {
  const message = msgInput.value.trim();
  const user = auth.currentUser;
  
  if (!message || !user) return;
  
  const messageData = {
    text: message,
    uid: user.uid,
    email: user.email,
    timestamp: Date.now(),
    type: 'text'
  };
  
  db.ref('messages').push(messageData)
    .then(() => {
      msgInput.value = '';
      msgInput.focus();
    })
    .catch(error => {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    });
};

// Handle Enter Key
window.handleKeyPress = function(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
};

// Load Messages
function loadMessages() {
  db.ref('messages').limitToLast(50).on('child_added', (snapshot) => {
    const message = snapshot.val();
    const messageElement = createMessageElement(message);
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Create Message Element
function createMessageElement(message) {
  const isCurrentUser = auth.currentUser && message.uid === auth.currentUser.uid;
  
  const div = document.createElement('div');
  div.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
  
  const time = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  div.innerHTML = `
    ${!isCurrentUser ? `<div class="sender">${message.email}</div>` : ''}
    <div class="text">${message.text}</div>
    <div class="time">${time}</div>
  `;
  
  return div;
}

// Online Users Tracking
function trackOnlineUsers() {
  const userRef = db.ref('onlineUsers/' + auth.currentUser.uid);
  
  // Set user as online
  userRef.set({
    email: auth.currentUser.email,
    lastSeen: Date.now()
  });
  
  // Remove user when they go offline
  userRef.onDisconnect().remove();
  
  // Listen for online users
  db.ref('onlineUsers').on('value', (snapshot) => {
    const users = snapshot.val() || {};
    updateOnlineUsersList(users);
  });
}

// Update Online Users List
function updateOnlineUsersList(users) {
  const currentUid = auth.currentUser.uid;
  
  const usersArray = Object.entries(users)
    .filter(([uid]) => uid !== currentUid)
    .map(([uid, data]) => ({
      uid,
      email: data.email,
      lastSeen: data.lastSeen
    }));
  
  onlineUsersList.innerHTML = '';
  
  if (usersArray.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No other users online';
    onlineUsersList.appendChild(li);
    return;
  }
  
  usersArray.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <i class="fas fa-circle"></i>
      ${user.email}
    `;
    onlineUsersList.appendChild(li);
  });
}

// Auth State Listener
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is logged in
    loginBox.style.display = 'none';
    chatBox.style.display = 'block';
    currentUserEmail.textContent = user.email;
    
    // Clear messages
    messagesDiv.innerHTML = '';
    
    // Initialize features
    loadMessages();
    trackOnlineUsers();
    
    // Focus on input
    msgInput.focus();
  } else {
    // User is logged out
    loginBox.style.display = 'block';
    chatBox.style.display = 'none';
    
    // Stop listening to messages
    db.ref('messages').off();
    db.ref('onlineUsers').off();
  }
});

// Auto-login for demo (optional)
window.addEventListener('DOMContentLoaded', () => {
  // Pre-fill demo credentials
  document.getElementById('email').value = 'user1@test.com';
  document.getElementById('password').value = '123456';
});

// Initialize WebRTC Handler
initializeWebRTC();