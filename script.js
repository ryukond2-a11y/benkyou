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
    { lv: 1, unit: "正負の数", title: "正負の数（加減）", hint: "同じ符号なら足してその符号、違うなら引いて絶対値が大きい方の符号！", pdf: "pdfs/lv1.pdf" },
    { lv: 2, unit: "正負の数", title: "正負の数（乗除）", hint: "マイナスが奇数個なら「−」、偶数個なら「＋」になるよ。", pdf: "pdfs/lv2.pdf" },
    { lv: 3, unit: "正負の数", title: "累乗・四則混合", hint: "累乗 → カッコ内 → 乗除 → 加減の順で計算！", pdf: "pdfs/lv3.pdf" },
    { lv: 4, unit: "文字の式", title: "文字式の表し方", hint: "×や÷を省く、数は前、アルファベット順などのルールを確認！", pdf: "pdfs/lv4.pdf" },
    { lv: 5, unit: "文字の式", title: "式の計算（加減）", hint: "同じ文字がついた項（同類項）どうしをまとめよう！", pdf: "pdfs/lv5.pdf" },
    { lv: 6, unit: "一次方程式", title: "等式の性質", hint: "両辺に同じ数を足したり引いたりしてもバランスは崩れないよ！", pdf: "pdfs/lv6.pdf" },
    { lv: 7, unit: "一次方程式", title: "一次方程式の解法", hint: "xがついた項を左辺に、数字を右辺に集めよう！", pdf: "pdfs/lv7.pdf" },
    { lv: 8, unit: "一次方程式", title: "方程式（移行）", hint: "＝を飛び越えるときは、符号をプラスからマイナス（逆）に変えよう！", pdf: "pdfs/lv8.pdf" },
    { lv: 9, unit: "一次方程式", title: "方程式（複雑）", hint: "カッコや小数は、まず展開や10倍・100倍をして整数に直そう！", pdf: "pdfs/lv9.pdf" },
    { lv: 10, unit: "比例・反比例", title: "比例の式", hint: "y = ax。aを求めるには y ÷ x を計算しよう！", pdf: "pdfs/lv10.pdf" },
    { lv: 11, unit: "比例・反比例", title: "反比例の式", hint: "y = a/x。aを求めるには x × y を計算しよう！", pdf: "pdfs/lv11.pdf" },
    { lv: 12, unit: "平面図形", title: "おうぎ形の計算", hint: "（弧の長さ）＝（円周 2πr）×（中心角/360）だよ！", pdf: "pdfs/lv12.pdf" },
    { lv: 13, unit: "空間図形", title: "柱体の体積", hint: "（体積）＝（底面積）×（高さ）で計算しよう！", pdf: "pdfs/lv13.pdf" },
    { lv: 14, unit: "空間図形", title: "球の計算", hint: "表面積 S = 4πr^2。心配(4π)ある(r^2)と覚えよう！", pdf: "pdfs/lv14.pdf" },
    { lv: 15, unit: "データの活用", title: "平均・中央値", hint: "合計÷個数が平均、小さい順に並べた真ん中の値が中央値！", pdf: "pdfs/lv15.pdf" }
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
// レベルメニューを動的に生成する関数
function renderLevelMenu() {
    const container = document.querySelector('.unit-list-container');
    if (!container) return;
    container.innerHTML = "";

    levelMaster.forEach(item => {
        const row = document.createElement('div');
        row.style = "display: flex; gap: 8px; margin-bottom: 12px; align-items: stretch;";
        
        row.innerHTML = `
            <div class="unit-card" onclick="startUnit(${item.lv})" style="flex: 1; margin-bottom: 0; display: flex; align-items: center; padding: 10px; cursor: pointer;">
                Lv.${item.lv} ${item.title}
            </div>
            <button onclick="window.open('${item.pdf}', '_blank')" 
                style="width: 70px; background: #607d8b; color: white; border: none; border-radius: 12px; font-size: 12px; cursor: pointer; font-weight: bold; line-height: 1.2; padding: 5px;">
                解き方<br>PDF
            </button>
        `;
        container.appendChild(row);
    });
}
// --- セクション切り替えヘルパー ---
function showSection(sectionId) {
    // ranking-section を追加
    const sections = ['auth-choice', 'auth-form', 'settings-section', 'test-section', 'menu-section', 'ranking-section'];
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
        case 1: // 正負の数（加減）
            const a1 = nz(15), b1 = nz(15);
            text = `(${a1}) + (${b1}) は？`;
            ans = (a1 + b1).toString();
            break;
        case 2: // 正負の数（乗除）
            const a2 = nz(9), b2 = nz(9);
            text = `(${a2}) × (${b2}) は？`;
            ans = (a2 * b2).toString();
            break;
        case 3: // 累乗・四則混合
            const a3 = r(5, 2);
            text = `(-${a3})^2 - ${r(10)} は？`;
            ans = (Math.pow(a3, 2) - (r(10))).toString();
            break;
        case 4: // 文字式の表し方
            const a4 = r(10, 2);
            text = `x × (-${a4}) を文字式のルールで書くと？`;
            ans = `-${a4}x`;
            break;
        case 5: // 式の計算（加減）
            const a5 = r(10, 2), b5 = r(10, 2);
            text = `${a5}x - ${b5}x は？`;
            ans = (a5 - b5) + "x";
            break;
        case 6: // 等式の性質
            const a6 = r(20, 5);
            text = `x + ${a6} = 100 の両辺から${a6}を引くと、x = ？`;
            ans = (100 - a6).toString();
            break;
        case 7: // 一次方程式の解法
            const x7 = nz(10), a7 = r(9, 2);
            text = `${a7}x = ${a7 * x7} の x は？`;
            ans = x7.toString();
            break;
        case 8: // 方程式（移行）
            const x8 = r(10), a8 = r(10);
            text = `x - ${a8} = ${x8} の -${a8}を移行した式は、x = ${x8} + ？`;
            ans = a8.toString();
            break;
        case 9: // 方程式（複雑）
            const x9 = r(5), a9 = r(4, 2);
            text = `${a9}(x + 1) = ${a9 * (x9 + 1)} の x は？`;
            ans = x9.toString();
            break;
        case 10: // 比例の式
            const a10 = r(8, 2);
            text = `yはxに比例し、比例定数が${a10}のとき、yをxの式で表すと？`;
            ans = `y=${a10}x`;
            break;
        case 11: // 反比例の式
            const a11 = r(24, 6);
            text = `yはxに反比例し、x=1のときy=${a11}。比例定数aは？`;
            ans = a11.toString();
            break;
        case 12: // おうぎ形の計算
            const r12 = r(10, 2);
            text = `半径${r12}cm、中心角180度のおうぎ形の弧の長さは？(πを用いる)`;
            ans = `${r12}π`;
            break;
        case 13: // 柱体の体積
            const b13 = r(20, 5), h13 = r(15, 5);
            text = `底面積 ${b13}、高さ ${h13} の柱体の体積は？`;
            ans = (b13 * h13).toString();
            break;
        case 14: // 球の計算
            const r14 = r(5, 1);
            text = `半径${r14}cmの球の表面積は？(4πr^2を用いる、πを付けて回答)`;
            ans = (4 * r14 * r14) + "π";
            break;
        case 15: // 平均・中央値
            const n1 = r(10);
            const n2 = r(10);
            // 合計が3の倍数になるように3つ目を調整
            const sum2 = n1 + n2;
            const n3 = (3 - (sum2 % 3)) % 3 + (r(3) * 3); 
            
            text = `${n1}, ${n2}, ${n3} の3つのデータの平均値は？`;
            ans = ((n1 + n2 + n3) / 3).toString();
            break;
        default:
            text = "問題データがありません";
            ans = "0";
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

window.handleAnswer = async () => {
    const inputField = document.getElementById('answer-input');
    
    // 1. まず現在の問題「q」を特定する（順番を上に持ってきた）
    const q = (currentMode === "diagnostic") ? diagnosticQuestions[currentStep] : practiceQuestions[currentStep];

    // 2. 入力値のクレンジング
    let ans = inputField.value.trim();
    
    const normalize = (str) => {
        if (!str) return "";
        return str.toString()
                  .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                  .replace(/ー|−|－/g, '-')
                  .replace(/\s+/g, '');
    };

    const cleanAns = normalize(ans);
    const cleanCorrectAns = normalize(q.ans);
    
    const isCorrect = (cleanAns === cleanCorrectAns);
    const currentLv = q.lv || 0;

    // Firebaseにログを保存（ここで lv が undefined にならないよう currentLv を使う）
    await set(ref(db, `logs/${currentUser}/${Date.now()}`), { ans, isCorrect, lv: currentLv });

    // 解説パネルの表示
    document.getElementById('feedback-result').innerText = isCorrect ? "○ 正解" : "× 不正解";
    
    const config = levelMaster.find(l => l.lv === currentLv);
    document.getElementById('ai-comment').innerHTML = isCorrect ? 
        "正解です！この調子でいきましょう。" : 
        `正解は <b>${q.ans}</b> です。<br><br>【AI解説】<br>${config ? config.hint : "公式を確認してみよう！"}`;
    
    document.getElementById('feedback-panel').classList.add('show');
    document.getElementById('feedback-panel').dataset.isCorrect = isCorrect;
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

// 【修正前】 function showMenu() { ... }
// 【修正後】 以下の形に書き換え

window.showMenu = () => {
    showSection('menu-section');
    
    // 到達レベルの表示更新
    const banner = document.getElementById('recommendation-banner');
    if (banner) {
        banner.innerHTML = `<h3>現在の到達レベル: Lv.${userScore}</h3>`;
    }

    // PDFボタン付きのレベル一覧を再生成（最新の状態を反映）
    if (typeof renderLevelMenu === 'function') {
        renderLevelMenu();
    }
};
// --- 連続学習ランキング機能 ---

// ランキングを画面に表示するパーツ（追加）
function renderRankingUI(list) {
    const container = document.getElementById('ranking-display');
    if (!container) return;
    
    container.innerHTML = "<h3>🔥 連続学習ランキング</h3>";
    
    list.forEach((user, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}位`;
        container.innerHTML += `
            <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <span>${medal} <strong>${user.name}</strong></span>
                <span style="color: #ff5722; font-weight: bold;">${user.streak}日連続 🔥</span>
            </div>
        `;
    });
}

// 過去のタイムスタンプを全て解析してランキングを作る（修正版）
window.showStreakRanking = async () => {
    showSection('ranking-section'); // ランキング画面を表示
    const container = document.getElementById('ranking-display');
    if (container) container.innerHTML = "集計中...";

    const dbRef = ref(db, 'users');
    const snapshot = await get(dbRef);
    const allData = snapshot.val();

    if (!allData) return;

    const rankingList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const userName in allData) {
        const userRecords = allData[userName];
        
        // キーから数値（タイムスタンプ）だけを抜き出す
        const timestamps = Object.keys(userRecords)
            .filter(key => !isNaN(key))
            .map(Number)
            .sort((a, b) => a - b);

        if (timestamps.length === 0) continue;

        let streak = 0;
        let lastDateChecked = null;

        for (let i = timestamps.length - 1; i >= 0; i--) {
            const currentDate = new Date(timestamps[i]);
            currentDate.setHours(0, 0, 0, 0);

            if (lastDateChecked === null) {
                const diffToToday = (today - currentDate) / (1000 * 60 * 60 * 24);
                if (diffToToday <= 1) {
                    streak = 1;
                    lastDateChecked = currentDate;
                } else {
                    streak = 0;
                    break;
                }
            } else {
                const diff = (lastDateChecked - currentDate) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    streak++;
                    lastDateChecked = currentDate;
                } else if (diff > 1) {
                    break;
                }
            }
        }
        rankingList.push({ name: userName, streak: streak });
    }

    rankingList.sort((a, b) => b.streak - a.streak);
    renderRankingUI(rankingList);
};

// --- メニュー画面の表示（ランキングボタンを追加） ---
window.showMenu = () => {
    showSection('menu-section');
    
    const banner = document.getElementById('recommendation-banner');
    if (banner) {
        banner.innerHTML = `
            <h3>現在の到達レベル: Lv.${userScore}</h3>
            <button onclick="showStreakRanking()" style="background: #ff5722; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; margin-top: 10px;">
                🔥 連続学習ランキングを見る
            </button>
        `;
    }

    if (typeof renderLevelMenu === 'function') {
        renderLevelMenu();
    }
};

// --- 演習開始ボタン ---
window.startUnit = (lv) => {
    selectedLv = lv; 
    currentMode = "practice";
    showSection('settings-section'); 
};
