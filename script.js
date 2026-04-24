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
let totalQuestions = 15;
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
const diagnosticQuestions = [
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

// --- セクション切り替えヘルパー ---
function showSection(sectionId) {
    const sections = ['auth-choice', 'auth-form', 'settings-section', 'test-section', 'menu-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

window.showAuthForm = (mode) => {
    authMode = mode;
    showSection('auth-form');
    document.getElementById('form-title').innerText = mode === 'login' ? 'ログイン' : '新規登録';
};

window.backToChoice = () => showSection('auth-choice');

window.processAuth = async () => {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if(!user || !pass) return alert("入力してください");

    const userRef = ref(db, 'users/' + user);
    const snap = await get(userRef);

    if (authMode === 'login') {
        if (snap.exists() && snap.val().password === pass) {
            currentUser = user;
            userScore = snap.val().level || 0;
            if (snap.val().hasTakenTest) {
                showMenu(); // ログイン後は即座にメニューへ
            } else {
                currentMode = "diagnostic";
                showSection('settings-section');
            }
        } else {
            alert("ユーザー名かパスワードが違います");
        }
    } else {
        if (snap.exists()) return alert("既に存在するユーザー名です");
        await set(userRef, { password: pass, level: 0, hasTakenTest: false });
        currentUser = user;
        currentMode = "diagnostic";
        showSection('settings-section');
    }
};

// --- AI問題生成ロジック ---
function generateAIQuestion(lv) {
    const config = levelMaster.find(l => l.lv === lv) || levelMaster[0];
    let text = "";
    let ans = "";
    const r = (max, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min;
    const nz = (max, min = 1) => Math.random() > 0.5 ? r(max, min) : -r(max, min);

    switch(lv) {
        case 1: // 正負の数（加減）
            const a1 = nz(15), b1 = nz(15);
            text = `(${a1}) + (${b1}) は？`;
            ans = (a1 + b1).toString();
            break;
        case 2: // 正負의数（乗除）
            const a2 = nz(9), b2 = nz(9);
            text = `(${a2}) × (${b2}) は？`;
            ans = (a2 * b2).toString();
            break;
        case 7: // 一次方程式（基本）
            const x7 = nz(10), a7 = r(9, 2);
            text = `${a7}x = ${a7 * x7} の x は？`;
            ans = x7.toString();
            break;
        case 13: // 柱体の体積
            const b13 = r(20, 5), h13 = r(15, 5);
            text = `底面積 ${b13}、高さ ${h13} の三角柱の体積は？`;
            ans = (b13 * h13).toString();
            break;
        default:
            text = `${config.title}の演習 (Lv.${lv})`;
            ans = "1";
    }
    return { unit: config.unit, text: text, ans: ans, lv: lv };
}

window.setCount = (num) => {
    totalQuestions = (currentMode === "diagnostic") ? 15 : num;
    currentStep = 0;
    showSection('test-section');
    document.getElementById('total-step-display').innerText = totalQuestions;
    loadQuestion();
};

function loadQuestion() {
    const q = (currentMode === "diagnostic") ? diagnosticQuestions[currentStep] : practiceQuestions[currentStep];
    if(!q) return showMenu();
    document.getElementById('q-unit').innerText = q.unit;
    document.getElementById('q-text').innerText = q.text;
    document.getElementById('current-step').innerText = currentStep + 1;
    document.getElementById('answer-input').value = "";
}

window.handleAnswer = async () => {
    const inputField = document.getElementById('answer-input');
    const ans = inputField.value.trim();
    const q = (currentMode === "diagnostic") ? diagnosticQuestions[currentStep] : practiceQuestions[currentStep];
    const isCorrect = (ans === q.ans);
    const currentLv = q.lv || 0;

    await set(ref(db, `logs/${currentUser}/${Date.now()}`), { ans, isCorrect, lv: currentLv });

    if (currentMode === "diagnostic") {
        if (isCorrect) {
            userScore = currentLv;
            currentStep++;
            if (currentStep < 15) {
                loadQuestion();
            } else {
                alert("全問正解です！");
                finishDiagnostic();
            }
        } else {
            alert(`不正解！ Lv.${userScore} で終了です。`);
            finishDiagnostic(); // 診断時は間違えたら即終了
        }
    } else {
        // 演習モードのフィードバック
        document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
        document.getElementById('ai-comment').innerText = isCorrect ? "正解です！" : `正解は ${q.ans} です。`;
        document.getElementById('feedback-panel').classList.add('show');
    }
};

async function finishDiagnostic() {
    await set(ref(db, `users/${currentUser}/hasTakenTest`), true);
    await set(ref(db, `users/${currentUser}/level`), userScore);
    showMenu();
}

window.nextQuestion = () => {
    document.getElementById('feedback-panel').classList.remove('show');
    currentStep++;
    if (currentStep < totalQuestions) {
        loadQuestion();
    } else {
        showMenu();
    }
};

function showMenu() {
    showSection('menu-section');
    document.getElementById('recommendation-banner').innerHTML = `<h3>現在の到達レベル: Lv.${userScore}</h3>`;
}

window.startUnit = (lv) => {
    currentMode = "practice";
    currentStep = 0;
    practiceQuestions = [];
    // 毎回違う問題を生成
    for (let i = 0; i < totalQuestions; i++) {
        practiceQuestions.push(generateAIQuestion(lv));
    }
    showSection('test-section');
    document.getElementById('total-step-display').innerText = totalQuestions;
    loadQuestion();
};
