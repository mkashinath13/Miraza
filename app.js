import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDDCuXlEIblrRvLFue3r4JxmBNw5uJtPrU",
  authDomain: "letter-186f6.firebaseapp.com",
  projectId: "letter-186f6",
  storageBucket: "letter-186f6.appspot.com",
  messagingSenderId: "935427381258",
  appId: "1:935427381258:web:da740548bfe996e07767f3",
  measurementId: "G-PF6NV2Z5YR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== SETTINGS =====
const MAGIC_WORD = "2121";
const ROOM_ID = "miraza";
const MS_24H = 24*60*60*1000; // 24 hours
const BACKUP_WEBHOOK = "https://script.google.com/macros/s/AKfycbxKuj4r7FXVMElOzKuBJtL1Cp_YiH0CY9EH_dYvmr230QVDWhCD4rqPKGb4rTVB2Fzhfg/exec";
const BACKUP_KEY = "miraza_secret_key";

// ===== DOM =====
const loginContainer = document.getElementById("loginContainer");
const chatContainer = document.getElementById("chatContainer");
const magicWordInput = document.getElementById("magicWord");
const enterBtn = document.getElementById("enterBtn");
const messagesEl = document.getElementById("messages");
const inputMessage = document.getElementById("inputMessage");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

// ===== AUTO DEVICE ID =====
let USER_ID = localStorage.getItem("USER_ID");
if (!USER_ID) {
  USER_ID = "user_" + Math.floor(Math.random() * 1000000);
  localStorage.setItem("USER_ID", USER_ID);
}

// ===== LOGIN =====
enterBtn.onclick = () => {
  const val = magicWordInput.value.trim();
  if (val === MAGIC_WORD) {
    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";
    initChat();
  } else {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(val)}`, "_blank");
  }
};

// ===== CHAT =====
let clearedMessageIds = new Set();

function initChat() {
  const msgsCol = collection(db, "messages", ROOM_ID, "msgs");
  const q = query(msgsCol, orderBy("timestamp"));

  // LISTEN MESSAGES
  onSnapshot(q, snap => {
    messagesEl.innerHTML = "";
    const now = Date.now();

    snap.docs.forEach(async docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;

      // Ignore cleared messages
      if (clearedMessageIds.has(id)) return;

      // Auto-delete messages older than 24 hours
      const ts = data.timestamp ? data.timestamp.toMillis() : now;
      if (now - ts > MS_24H) {
        await deleteDoc(doc(db, "messages", ROOM_ID, "msgs", id));
        return;
      }

      // Render messages
      const msgEl = document.createElement("div");
      msgEl.classList.add("message");
      const senderTag = data.sender === USER_ID ? "You: " : "Other: ";
      msgEl.textContent = senderTag + data.text;
      messagesEl.appendChild(msgEl);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // SEND MESSAGE
  sendBtn.onclick = async () => {
    const text = inputMessage.value.trim();
    if (!text) return;

    await addDoc(msgsCol, {
      sender: USER_ID,
      text,
      timestamp: serverTimestamp()
    });
    inputMessage.value = "";

    // Secret Google Sheet Backup
    const now = new Date();
    const backupLine = `${now.toLocaleString()} - ${USER_ID === USER_ID ? "me" : "other"}: ${text}`;
    fetch(BACKUP_WEBHOOK, {
      method: "POST",
      body: JSON.stringify({ key: BACKUP_KEY, line: backupLine })
    });
  };

  // CLEAR UI
  clearBtn.onclick = () => {
    // Mark all current messages as cleared
    const allMsgDivs = messagesEl.querySelectorAll(".message");
    snap.docs.forEach(docSnap => clearedMessageIds.add(docSnap.id));

    // Clear DOM
    messagesEl.innerHTML = "";
  };
}
