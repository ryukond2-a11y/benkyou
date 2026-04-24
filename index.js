import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";


// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyAwdE7AqopqCSFu5fyTO9sj6iYlC_MtecI",
    databaseURL: "https://benkyou-9a95b-default-rtdb.firebaseio.com/",
    projectId: "benkyou-9a95b",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 診断テストの問題（文科省準拠：中1〜中2連立まで）
const diagnosticQuestions = [
    { id: "step1", unit: "正負の数", text: "(-8) + (+5) は？", ans: "-3", level: 1 },
    { id: "step2", unit: "文字の式", text: "3x - 5x は？", ans: "-2x", level: 2 },
    { id: "step3", unit: "一次方程式", text: "2x + 6 = 10 の x は？", ans: "2", level: 3 },
    { id: "step4", unit: "連立方程式(基)", text: "x + y = 5, x - y = 1 のとき x は？", ans: "3", level: 4 }
];

let currentStep = 0;
let userScore = 0;

// 回答ボタンが押された時の処理
window.handleAnswer = async () => {
    const input = document.getElementById('answer-input');
    const userAns = input.value.trim();
    const q = diagnosticQuestions[currentStep];
    const isCorrect = (userAns === q.ans);

    if (isCorrect) userScore = q.level;

    // AI解説（仮：本来はここでAI APIを叩く）
    const aiComment = isCorrect ? 
        `正解！${q.unit}の基本がしっかりできています。` : 
        `${q.unit}でミス。${q.id === "step3" ? "移項の時の符号" : "計算"}を見直しましょう。`;

    // そのままDBに保存
    const username = "Ryushun"; // 固定または入力から取得
    await set(ref(db, `logs/${username}/${q.id}`), {
        answer: userAns,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
    });

    // フィードバックパネル表示
    showFeedback(isCorrect, aiComment);
};

function showFeedback(isCorrect, comment) {
    const panel = document.getElementById('feedback-panel');
    document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
    document.getElementById('ai-comment').innerText = comment;
    panel.classList.add('show');
}

window.nextQuestion = () => {
    currentStep++;
    document.getElementById('feedback-panel').classList.remove('show');
    document.getElementById('answer-input').value = "";

    if (currentStep < diagnosticQuestions.length) {
        document.getElementById('q-text').innerText = diagnosticQuestions[currentStep].text;
        document.getElementById('q-title').innerText = diagnosticQuestions[currentStep].unit;
    } else {
        finishDiagnostic();
    }
};

function finishDiagnostic() {
    document.getElementById('test-section').classList.add('hidden');
    const practice = document.getElementById('practice-section');
    practice.classList.remove('hidden');
    
    // おすすめレベルの表示
    const banner = document.getElementById('recommendation-banner');
    banner.innerHTML = `<h3>診断結果：Lv.${userScore} がおすすめ！</h3>`;
    
    // DBに最終レベルを保存
    set(ref(db, `users/Ryushun/level`), userScore);
}
