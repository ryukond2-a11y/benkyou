import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAwdE7AqopqCSFu5fyTO9sj6iYlC_MtecI",
    databaseURL: "https://benkyou-9a95b-default-rtdb.firebaseio.com/",
    projectId: "benkyou-9a95b",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 変数の管理 ---
let authMode = 'login';
let currentUser = "";
let currentStep = 0;
let userScore = 0;
let totalQuestions = 15; // 診断は15問
let aiAnswer = "";
let currentMode = "diagnostic"; 
let practiceQuestions = [];

// --- 中1数学 15レベル定義 ---
const levelMaster = [
    { lv: 1, unit: "正負の数", title: "正負の数（加減）" },
    { lv: 2, unit: "正負の数", title: "正負の数（乗除）" },
    { lv: 3, unit: "正負の数", title: "累乗・四則混合" },
    { lv: 4, unit: "文字の式", title: "文字式の表し方" },
    { lv: 5, unit: "文字の式", title: "式の計算（加減）" },
    { lv: 6, unit: "一次方程式", title: "等式の性質" },
    { lv: 7, unit: "一次方程式", title: "一次方程式の解法" },
    { lv: 8, unit: "一次方程式", title: "方程式（移行）" },
    { lv: 9, unit: "一次方程式", title: "方程式（複雑）" },
    { lv: 10, unit: "比例・反比例", title: "比例の式" },
    { lv: 11, unit: "比例・反比例", title: "反比例の式" },
    { lv: 12, unit: "平面図形", title: "おうぎ形の計算" },
    { lv: 13, unit: "空間図形", title: "柱体の体積" },
    { lv: 14, unit: "空間図形", title: "球の計算" },
    { lv: 15, unit: "データの活用", title: "平均・中央値" }
];

// --- 診断テスト用 15問 ---
const questions = [
    { lv: 1, unit: "正負の数", text: "(-8) + (+5) は？", ans: "-3" },
    { lv: 2, unit: "正負の数", text: "(-2) × (-7) は？", ans: "14" },
    { lv: 3, unit: "正負の数", text: "(-3)^2 - 5 は？", ans: "4" },
    { lv: 4, unit: "文字の式", text: "3x - 5x は？", ans: "-2x" },
    { lv: 5, unit: "文字の式", text: "x=4のとき、5x-3の値は？", ans: "17" },
    { lv: 6, unit: "一次方程式", text: "x + 7 = 3 の x は？", ans: "-4" },
    { lv: 7, unit: "一次方程式", text: "4x = 12 の x は？", ans: "3" },
    { lv: 8, unit: "一次方程式", text: "2x + 6 = 10 の x は？", ans: "2" },
    { lv: 9, unit: "一次方程式", text: "3x - 8 = x の x は？", ans: "4" },
    { lv: 10, unit: "比例・反比例", text: "yはxに比例しx=2のときy=6。比例定数は？", ans: "3" },
    { lv: 11, unit: "比例・反比例", text: "yはxに反比例しx=3のときy=4。x=6のときyは？", ans: "2" },
    { lv: 12, unit: "平面図形", text: "半径6cm、中心角60度のおうぎ形の弧の長さは？(πを用いて回答)", ans: "2π" },
    { lv: 13, unit: "空間図形", text: "底面積10, 高さ6の三角柱の体積は？", ans: "60" },
    { lv: 14, unit: "空間図形", text: "半径3cmの球の表面積は？(πを用いて回答)", ans: "36π" },
    { lv: 15, unit: "データの活用", text: "3, 7, 11, 19の4つのデータの平均値は？", ans: "10" }
];

// --- 認証・画面遷移 ---
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

window.processAuth = async () => {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if(!user || !pass) return alert("入力してください");

    const userRef = ref(db, 'users/' + user);
    const snap = await get(userRef);

    if (authMode === 'login') {
        if (snap.exists() && snap.val().password === pass) {
            currentUser = user;
            if (snap.val().hasTakenTest) {
                showMenu(); 
            } else {
                currentMode = "diagnostic";
                goToSettings(); 
            }
        } else {
            alert("ユーザー名かパスワードが違います");
        }
    } else {
        if (snap.exists()) return alert("既に存在するユーザー名です");
        await set(userRef, { password: pass, level: 0, hasTakenTest: false });
        currentUser = user;
        currentMode = "diagnostic";
        goToSettings();
    }
};

function goToSettings() {
    document.getElementById('auth-form').classList.add('hidden');
    document.getElementById('settings-section').classList.remove('hidden');
}

// --- AI問題生成 ---
function generateAIQuestion(lv) {
    const config = levelMaster.find(l => l.lv === lv) || levelMaster[0];
    let text = "";
    let ans = "";

    if (lv === 1) {
        const a = Math.floor(Math.random() * 20) - 10;
        const b = Math.floor(Math.random() * 20) - 10;
        text = `(${a}) + (${b}) は？`;
        ans = (a + b).toString();
    } else {
        text = `${config.title}の演習 (Lv.${lv})`;
        ans = "1";
    }
    return { unit: config.unit, text: text, ans: ans, lv: lv }; // level ではなく lv に統一
}

window.setCount = (num) => {
    totalQuestions = (currentMode === "diagnostic") ? 15 : num;
    document.getElementById('settings-section').classList.add('hidden');
    document.getElementById('test-section').classList.remove('hidden');
    document.getElementById('total-step-display').innerText = totalQuestions;
    loadQuestion();
};

function loadQuestion() {
    const q = (currentMode === "diagnostic") ? questions[currentStep] : practiceQuestions[currentStep];
    if(!q) return;
    document.getElementById('q-unit').innerText = q.unit;
    document.getElementById('q-text').innerText = q.text;
    document.getElementById('current-step').innerText = currentStep + 1;
}

window.handleAnswer = async () => {
    const ans = document.getElementById('answer-input').value.trim();
    const q = (currentMode === "diagnostic") ? questions[currentStep] : practiceQuestions[currentStep];
    const isCorrect = (ans === q.ans);
    
    // 【重要】undefinedエラー対策: q.lv または q.level の存在を確認
    const currentLv = q.lv || q.level || 0;
    if(isCorrect) userScore = currentLv;

    // Firebase保存 (lvがundefinedにならないよう修正)
    await set(ref(db, `logs/${currentUser}/${Date.now()}`), { 
        ans: ans, 
        isCorrect: isCorrect, 
        lv: currentLv 
    });

    document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
    document.getElementById('ai-comment').innerText = isCorrect ? "正解です！" : `正解は ${q.ans} です。`;

    const retryArea = document.getElementById('ai-retry-area');
    if (!isCorrect) {
        retryArea.classList.remove('hidden');
        const v1 = Math.floor(Math.random() * 10) + 1;
        const v2 = Math.floor(Math.random() * 10) + 1;
        document.getElementById('ai-q-text').innerText = `類題: ${v1} + ${v2} は？`;
        aiAnswer = (v1 + v2).toString();
    } else {
        retryArea.classList.add('hidden');
    }
    document.getElementById('feedback-panel').classList.add('show');
};

window.checkAIAnswer = () => {
    const userAiAns = document.getElementById('ai-ans-input').value.trim();
    if (userAiAns === aiAnswer) {
        alert("正解！類題クリアです。");
        document.getElementById('ai-retry-area').classList.add('hidden');
    } else {
        alert("違います。もう一度考えてみよう。");
    }
};

window.nextQuestion = () => {
    document.getElementById('feedback-panel').classList.remove('show');
    document.getElementById('answer-input').value = "";
    document.getElementById('ai-ans-input').value = "";
    currentStep++;
    
    const limit = (currentMode === "diagnostic") ? questions.length : totalQuestions;
    if (currentStep < limit) {
        loadQuestion();
    } else {
        showMenu();
    }
};

function showMenu() {
    if (currentMode === "diagnostic") {
        set(ref(db, `users/${currentUser}/hasTakenTest`), true);
        set(ref(db, `users/${currentUser}/level`), userScore);
    }
    document.getElementById('test-section').classList.add('hidden');
    document.getElementById('menu-section').classList.remove('hidden');
    document.getElementById('recommendation-banner').innerHTML = `<h3>現在の到達レベル: Lv.${userScore}</h3>`;
}

window.startUnit = (lv) => {
    currentMode = "practice";
    currentStep = 0;
    practiceQuestions = [];
    for (let i = 0; i < totalQuestions; i++) {
        practiceQuestions.push(generateAIQuestion(lv));
    }
    document.getElementById('menu-section').classList.add('hidden');
    document.getElementById('test-section').classList.remove('hidden');
    loadQuestion();
};
