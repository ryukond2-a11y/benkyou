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
let selectedLv = 1; // 追加：演習レベル保持用

// --- 中1数学 15レベル定義（hintを追加） ---
const levelMaster = [
    { lv: 1, unit: "正負の数", title: "正負の数（加減）", hint: "同じ符号なら足してその符号、違うなら引いて絶対値が大きい方の符号！" },
    { lv: 2, unit: "正負の数", title: "正負の数（乗除）", hint: "マイナスが奇数個なら「−」、偶数個なら「＋」になるよ。" },
    { lv: 3, unit: "正負の数", title: "累乗・四則混合", hint: "累乗 → カッコ内 → 乗除 → 加減の順で計算！" },
    { lv: 4, unit: "文字の式", title: "文字式の表し方", hint: "×や÷を省く、数は前、アルファベット順などのルールを確認！" },
    { lv: 5, unit: "文字の式", title: "式の計算（加減）", hint: "同じ文字がついた項（同類項）どうしをまとめよう！" },
    { lv: 6, unit: "一次方程式", title: "等式の性質", hint: "両辺に同じ数を足したり引いたりしてもバランスは崩れないよ！" },
    { lv: 7, unit: "一次方程式", title: "一次方程式の解法", hint: "xがついた項を左辺に、数字を右辺に集めよう！" },
    { lv: 8, unit: "一次方程式", title: "方程式（移行）", hint: "＝を飛び越えるときは、符号をプラスからマイナス（逆）に変えよう！" },
    { lv: 9, unit: "一次方程式", title: "方程式（複雑）", hint: "カッコや小数は、まず展開や10倍・100倍をして整数に直そう！" },
    { lv: 10, unit: "比例・反比例", title: "比例の式", hint: "y = ax。aを求めるには y ÷ x を計算しよう！" },
    { lv: 11, unit: "比例・反比例", title: "反比例の式", hint: "y = a/x。aを求めるには x × y を計算しよう！" },
    { lv: 12, unit: "平面図形", title: "おうぎ形の計算", hint: "（弧の長さ）＝（円周 2πr）×（中心角/360）だよ！" },
    { lv: 13, unit: "空間図形", title: "柱体の体積", hint: "（体積）＝（底面積）×（高さ）で計算しよう！" },
    { lv: 14, unit: "空間図形", title: "球の計算", hint: "表面積 S = 4πr^2。心配(4π)ある(r^2)と覚えよう！" },
    { lv: 15, unit: "データの活用", title: "平均・中央値", hint: "合計÷個数が平均、小さい順に並べた真ん中の値が中央値！" }
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
    { lv: 13, unit: "空間図形", text: "底面積10, 高さ6 de 三角柱の体積は？", ans: "60" },
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
                showMenu();
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

// --- AI問題生成ロジック（修正：レベル名反映） ---
function generateAIQuestion(lv) {
    const config = levelMaster.find(l => l.lv === lv) || levelMaster[0];
    let text = "";
    let ans = "";
    const r = (max, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min;
    const nz = (max, min = 1) => Math.random() > 0.5 ? r(max, min) : -r(max, min);

    switch(lv) {
        case 1:
            const a1 = nz(15), b1 = nz(15);
            text = `(${a1}) + (${b1}) は？`;
            ans = (a1 + b1).toString();
            break;
        case 2:
            const a2 = nz(9), b2 = nz(9);
            text = `(${a2}) × (${b2}) は？`;
            ans = (a2 * b2).toString();
            break;
        case 7:
            const x7 = nz(10), a7 = r(9, 2);
            text = `${a7}x = ${a7 * x7} の x は？`;
            ans = x7.toString();
            break;
        case 13:
            const b13 = r(20, 5), h13 = r(15, 5);
            text = `底面積 ${b13}、高さ ${h13} の三角柱の体積は？`;
            ans = (b13 * h13).toString();
            break;
        default:
            // 修正：固定テキストではなくレベルのタイトルを出す
            text = `${config.title}の演習問題`;
            ans = "1";
    }
    return { unit: config.unit, text: text, ans: ans, lv: lv, hint: config.hint };
}

// --- 修正：演習前の設定フロー ---
window.setCount = (num) => {
    totalQuestions = (currentMode === "diagnostic") ? 15 : num;
    currentStep = 0;

    // 演習モードならここで問題を生成
    if (currentMode === "practice") {
        practiceQuestions = [];
        for (let i = 0; i < totalQuestions; i++) {
            practiceQuestions.push(generateAIQuestion(selectedLv));
        }
    }

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
    document.getElementById('feedback-panel').classList.remove('show'); // パネル隠す
}

// --- 修正：AI解説と診断時フロー ---
window.handleAnswer = async () => {
    const inputField = document.getElementById('answer-input');
    const ans = inputField.value.trim();
    const q = (currentMode === "diagnostic") ? diagnosticQuestions[currentStep] : practiceQuestions[currentStep];
    const isCorrect = (ans === q.ans);
    const currentLv = q.lv || 0;

    await set(ref(db, `logs/${currentUser}/${Date.now()}`), { ans, isCorrect, lv: currentLv });

    // 解説パネルの表示
    document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
    
    // AI解説の構築
    const config = levelMaster.find(l => l.lv === currentLv);
    document.getElementById('ai-comment').innerHTML = isCorrect ? 
        "正解です！この調子でいきましょう。" : 
        `正解は <b>${q.ans}</b> です。<br><br>【AI解説】<br>${config ? config.hint : "公式を確認してみよう！"}`;
    
    document.getElementById('feedback-panel').classList.add('show');
    document.getElementById('feedback-panel').dataset.isCorrect = isCorrect; // 判定保持
};

async function finishDiagnostic() {
    await set(ref(db, `users/${currentUser}/hasTakenTest`), true);
    await set(ref(db, `users/${currentUser}/level`), userScore);
    showMenu();
}

// --- 修正：解説後に次へ行くか終了するか ---
window.nextQuestion = () => {
    const isCorrect = document.getElementById('feedback-panel').dataset.isCorrect === "true";
    document.getElementById('feedback-panel').classList.remove('show');

    if (currentMode === "diagnostic") {
        if (isCorrect) {
            userScore = diagnosticQuestions[currentStep].lv;
            currentStep++;
            if (currentStep < 15) {
                loadQuestion();
            } else {
                finishDiagnostic();
            }
        } else {
            // 不正解なら解説を閉じたタイミングでやめる
            finishDiagnostic();
        }
    } else {
        currentStep++;
        if (currentStep < totalQuestions) {
            loadQuestion();
        } else {
            showMenu();
        }
    }
};

function showMenu() {
    showSection('menu-section');
    document.getElementById('recommendation-banner').innerHTML = `<h3>現在の到達レベル: Lv.${userScore}</h3>`;
}

// --- 修正：演習開始ボタン ---
window.startUnit = (lv) => {
    selectedLv = lv; // レベルを覚えさせる
    currentMode = "practice";
    showSection('settings-section'); // まず問題数選択へ飛ばす
};
