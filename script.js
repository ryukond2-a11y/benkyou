// ブラウザ用なので URL から直接インポートします
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, push } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyAwdE7AqopqCSFu5fyTO9sj6iYlC_MtecI",
    databaseURL: "https://benkyou-9a95b-default-rtdb.firebaseio.com/",
    projectId: "benkyou-9a95b",
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 診断テストの問題データ
const diagnosticQuestions = [
    { id: "step1", unit: "正負の数", text: "(-8) + (+5) は？", ans: "-3", level: 1 },
    { id: "step2", unit: "文字の式", text: "3x - 5x は？", ans: "-2x", level: 2 },
    { id: "step3", unit: "一次方程式", text: "2x + 6 = 10 の x は？", ans: "2", level: 3 },
    { id: "step4", unit: "連立方程式(基)", text: "x + y = 5, x - y = 1 のとき x は？", ans: "3", level: 4 }
];

let currentStep = 0;
let userScore = 0;

// 1. 回答ボタンが押された時の処理
window.handleAnswer = async () => {
    const input = document.getElementById('answer-input');
    if (!input) return;

    const userAns = input.value.trim();
    const q = diagnosticQuestions[currentStep];
    const isCorrect = (userAns === q.ans);

    if (isCorrect) userScore = q.level;

    // AI解説（将来的にAPI化可能）
    const aiComment = isCorrect ? 
        `正解！${q.unit}の基本がしっかりできています。` : 
        `${q.unit}でミス。${q.id === "step3" ? "移項の時の符号" : "計算"}を見直しましょう。`;

    // データベースに「そのまま」保存
    const username = "Ryushun"; 
    const logRef = ref(db, `logs/${username}/${q.id}`);
    await set(logRef, {
        answer: userAns,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
    });

    showFeedback(isCorrect, aiComment);
};

// 2. フィードバックパネルの表示
function showFeedback(isCorrect, comment) {
    const panel = document.getElementById('feedback-panel');
    const resultText = document.getElementById('feedback-result');
    const commentText = document.getElementById('ai-comment');
    
    if (panel && resultText && commentText) {
        resultText.innerText = isCorrect ? "○ 正解！" : "× 不正解...";
        resultText.style.color = isCorrect ? "#2ecc71" : "#e74c3c";
        commentText.innerText = comment;
        panel.classList.add('show');
    }
}

// 3. 次の問題へ進む処理
window.nextQuestion = () => {
    currentStep++;
    const panel = document.getElementById('feedback-panel');
    if (panel) panel.classList.remove('show');
    
    const input = document.getElementById('answer-input');
    if (input) input.value = "";

    if (currentStep < diagnosticQuestions.length) {
        document.getElementById('q-text').innerText = diagnosticQuestions[currentStep].text;
        document.getElementById('q-title').innerText = diagnosticQuestions[currentStep].unit;
    } else {
        finishDiagnostic();
    }
};

// 4. 診断終了・おすすめ表示
function finishDiagnostic() {
    document.getElementById('test-section').classList.add('hidden');
    const practice = document.getElementById('practice-section');
    if (practice) {
        practice.classList.remove('hidden');
        document.getElementById('recommendation-banner').innerHTML = 
            `<div style="background:#e3f2fd; padding:15px; border-radius:10px;">
                <h3>診断結果：Lv.${userScore} がおすすめ！</h3>
                <p>連立方程式の習得に向けて、ここから始めましょう。</p>
            </div>`;
    }
    
    // 最終レベルを保存
    set(ref(db, `users/Ryushun/level`), userScore);
}
