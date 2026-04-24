import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAwdE7AqopqCSFu5fyTO9sj6iYlC_MtecI",
    databaseURL: "https://benkyou-9a95b-default-rtdb.firebaseio.com/",
    projectId: "benkyou-9a95b",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentUser = "";
let currentStep = 0;
let userScore = 0;
let totalQuestions = 5;
let currentMode = "diagnostic"; 
let practiceQuestions = [];
let selectedLv = 1;

const levelMaster = [
    { lv: 1, unit: "正負の数", title: "正負の数（加減）", hint: "符号が同じなら足してその符号、違うなら引いて絶対値が大きい方の符号！" },
    { lv: 2, unit: "正負の数", title: "正負の数（乗除）", hint: "マイナスが奇数個なら答えはマイナス、偶数個ならプラス！" },
    { lv: 3, unit: "正負の数", title: "累乗・四則混合", hint: "累乗 → カッコ内 → 乗除 → 加減の順で計算！" },
    { lv: 4, unit: "文字の式", title: "文字式の表し方", hint: "×や÷を省くルール（数字が前、アルファベット順）を確認！" },
    { lv: 5, unit: "文字の式", title: "式の計算（加減）", hint: "同じ文字がついた項（同類項）どうしをまとめよう！" },
    { lv: 6, unit: "一次方程式", title: "等式の性質", hint: "天秤と同じ。両辺に同じ数を足したり引いたりしてもバランスは崩れないよ！" },
    { lv: 7, unit: "一次方程式", title: "一次方程式の解法", hint: "xがついた項を左辺に、数字を右辺に集めよう！" },
    { lv: 8, unit: "一次方程式", title: "方程式（移行）", hint: "＝をまたぐときは、符号をプラスからマイナス（逆）に変えよう！" },
    { lv: 9, unit: "一次方程式", title: "方程式（複雑）", hint: "カッコや小数は、まず分配法則や倍数をして整数に直そう！" },
    { lv: 10, unit: "比例・反比例", title: "比例の式", hint: "y = ax の形。aを求めるには y ÷ x を計算しよう！" },
    { lv: 11, unit: "比例・反比例", title: "反比例の式", hint: "y = a/x の形。aを求めるには x × y を計算しよう！" },
    { lv: 12, unit: "平面図形", title: "おうぎ形の計算", hint: "弧の長さ ＝ 直径 × π × (中心角/360) だよ！" },
    { lv: 13, unit: "空間図形", title: "柱体の体積", hint: "体積 ＝ 底面積 × 高さ。底面がどんな形かまず確認！" },
    { lv: 14, unit: "空間図形", title: "球の計算", hint: "表面積 S = 4πr^2。半径を2乗して4πをかけるんだ！" },
    { lv: 15, unit: "データの活用", title: "平均・中央値", hint: "全部足して個数で割るのが平均、順番に並べて真ん中が中央値！" }
];

// 診断用も「固定の配列」を廃止し、この関数から生成するように統一します
function generateAIQuestion(lv) {
    const config = levelMaster.find(l => l.lv === lv);
    let text = "", ans = "";
    const r = (max, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min;
    const nz = (max, min = 1) => Math.random() > 0.5 ? r(max, min) : -r(max, min);

    // --- ロジックによる数値生成 ---
    if (lv === 1) {
        const a = nz(15), b = nz(15);
        text = `(${a}) + (${b}) は？`;
        ans = (a + b).toString();
    } else if (lv === 2) {
        const a = nz(9), b = nz(9);
        text = `(${a}) × (${b}) は？`;
        ans = (a * b).toString();
    } else if (lv === 7 || lv === 8) {
        const x = nz(10), a = r(9, 2), b = nz(10);
        const c = a * x + b;
        text = `${a}x + (${b}) = ${c} の x は？`;
        ans = x.toString();
    } else if (lv === 13) {
        const base = r(20, 5), height = r(15, 2);
        text = `底面積が ${base}、高さが ${height} の柱体の体積は？`;
        ans = (base * height).toString();
    } else {
        // 未実装レベルの仮生成（固定にならないよう計算を入れる）
        const a = r(10), b = r(10);
        text = `【${config.title}】 ${a} + ${b} は？`;
        ans = (a + b).toString();
    }
    
    // 重要：lvを含めて返すことでFirebase保存時のエラーを防ぐ
    return { unit: config.unit, text: text, ans: ans, lv: lv, hint: config.hint };
}

// 診断フロー開始
function startDiagnosticFlow() {
    currentMode = "diagnostic";
    totalQuestions = 15;
    currentStep = 0;
    practiceQuestions = [];
    // 診断テスト用にLv.1〜15を1問ずつ生成
    for (let i = 1; i <= 15; i++) {
        practiceQuestions.push(generateAIQuestion(i));
    }
    showSection('test-section');
    document.getElementById('total-step-display').innerText = totalQuestions;
    loadQuestion();
}

window.startUnit = (lv) => {
    selectedLv = lv;
    currentMode = "practice";
    showSection('settings-section'); 
};

window.setCount = (num) => {
    totalQuestions = num;
    currentStep = 0;
    practiceQuestions = [];
    for (let i = 0; i < totalQuestions; i++) {
        practiceQuestions.push(generateAIQuestion(selectedLv));
    }
    showSection('test-section');
    document.getElementById('total-step-display').innerText = totalQuestions;
    loadQuestion();
};

function loadQuestion() {
    const q = practiceQuestions[currentStep]; // モードに関わらずこちらを参照
    if(!q) return showMenu();
    document.getElementById('q-unit').innerText = q.unit;
    document.getElementById('q-text').innerText = q.text;
    document.getElementById('current-step').innerText = currentStep + 1;
    document.getElementById('answer-input').value = "";
    document.getElementById('feedback-panel').classList.remove('show');
}

window.handleAnswer = async () => {
    const ans = document.getElementById('answer-input').value.trim();
    const q = practiceQuestions[currentStep];
    const isCorrect = (ans === q.ans);

    // Firebaseへログ保存（q.lvが確実に存在するように修正済み）
    await set(ref(db, `logs/${currentUser}/${Date.now()}`), { 
        ans: ans, 
        isCorrect: isCorrect, 
        lv: q.lv 
    });

    document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
    document.getElementById('ai-comment').innerHTML = isCorrect ? 
        "その通り！正解です。" : 
        `正解は <b>${q.ans}</b> でした。<br><br>【AI解説】<br>${q.hint}`;
    
    document.getElementById('feedback-panel').classList.add('show');
    document.getElementById('feedback-panel').dataset.correct = isCorrect;
};

window.nextQuestion = () => {
    const isCorrect = document.getElementById('feedback-panel').dataset.correct === "true";
    
    if (currentMode === "diagnostic") {
        if (isCorrect) {
            userScore = practiceQuestions[currentStep].lv;
            currentStep++;
            (currentStep < 15) ? loadQuestion() : finishDiagnostic();
        } else {
            // 不正解なら解説を読ませたあと、診断終了
            finishDiagnostic();
        }
    } else {
        currentStep++;
        (currentStep < totalQuestions) ? loadQuestion() : showMenu();
    }
};

// 以降、showSection, processAuth, finishDiagnostic, showMenu は元のロジックを維持
function showSection(sectionId) {
    ['auth-choice', 'auth-form', 'settings-section', 'test-section', 'menu-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(sectionId);
    if(target) target.classList.remove('hidden');
}

window.processAuth = async () => {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if(!user || !pass) return alert("入力してください");
    const userRef = ref(db, 'users/' + user);
    const snap = await get(userRef);
    if (snap.exists() && snap.val().password === pass) {
        currentUser = user;
        userScore = snap.val().level || 0;
        snap.val().hasTakenTest ? showMenu() : startDiagnosticFlow();
    } else {
        alert("ユーザー名かパスワードが違います");
    }
};

async function finishDiagnostic() {
    await set(ref(db, `users/${currentUser}/hasTakenTest`), true);
    await set(ref(db, `users/${currentUser}/level`), userScore);
    showMenu();
}

function showMenu() {
    showSection('menu-section');
    document.getElementById('recommendation-banner').innerHTML = `<h3>現在の到達レベル: Lv.${userScore}</h3>`;
}
