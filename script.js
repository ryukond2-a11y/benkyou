import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAwdE7AqopqCSFu5fyTO9sj6iYlC_MtecI",
    databaseURL: "https://benkyou-9a95b-default-rtdb.firebaseio.com/",
    projectId: "benkyou-9a95b",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let authMode = 'login'; // 'login' or 'signup'
let currentUser = "";
let currentStep = 0;
let userScore = 0;

const questions = [
    { unit: "正負の数", text: "(-8) + (+5) は？", ans: "-3", level: 1 },
    { unit: "文字の式", text: "3x - 5x は？", ans: "-2x", level: 2 },
    { unit: "一次方程式", text: "2x + 6 = 10 の x は？", ans: "2", level: 3 },
    { unit: "連立方程式", text: "x + y = 5, x - y = 1 のとき x は？", ans: "3", level: 4 }
];

// --- 画面遷移ロジック ---
window.showAuthForm = (mode) => {
    authMode = mode;
    document.getElementById('auth-choice').classList.add('hidden');
    document.getElementById('auth-form').classList.remove('hidden');
    document.getElementById('form-title').innerText = mode === 'login' ? 'ログイン' : '新規登録';
};

window.backToChoice = () => {
    document.getElementById('auth-form').classList.add('hidden');
    document.getElementById('auth-choice').classList.remove('hidden');
};

// --- 認証処理 ---
window.processAuth = async () => {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if(!user || !pass) return alert("入力してください");

    const userRef = ref(db, 'users/' + user);
    const snap = await get(userRef);

    if (authMode === 'login') {
        if (snap.exists() && snap.val().password === pass) {
            currentUser = user;
            startDiagnostic();
        } else {
            alert("ユーザー名かパスワードが違います");
        }
    } else {
        if (snap.exists()) return alert("既に存在するユーザー名です");
        await set(userRef, { password: pass, level: 0 });
        currentUser = user;
        startDiagnostic();
    }
};

function startDiagnostic() {
    document.getElementById('auth-form').classList.add('hidden');
    document.getElementById('test-section').classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    const q = questions[currentStep];
    document.getElementById('q-unit').innerText = q.unit;
    document.getElementById('q-text').innerText = q.text;
    document.getElementById('current-step').innerText = currentStep + 1;
}

window.handleAnswer = async () => {
    const ans = document.getElementById('answer-input').value.trim();
    const q = questions[currentStep];
    const isCorrect = (ans === q.ans);
    if(isCorrect) userScore = q.level;

    await set(ref(db, `logs/${currentUser}/${currentStep}`), { ans, isCorrect });

    document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
    document.getElementById('ai-comment').innerText = isCorrect ? "その調子！" : `正解は ${q.ans} でした。`;
    document.getElementById('feedback-panel').classList.add('show');
};

window.nextQuestion = () => {
    document.getElementById('feedback-panel').classList.remove('show');
    document.getElementById('answer-input').value = "";
    currentStep++;
    if (currentStep < questions.length) {
        loadQuestion();
    } else {
        showMenu();
    }
};

function showMenu() {
    document.getElementById('test-section').classList.add('hidden');
    document.getElementById('menu-section').classList.remove('hidden');
    document.getElementById('recommendation-banner').innerHTML = `<h3>診断結果: Lv.${userScore}</h3>`;
}
