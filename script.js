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
    { lv: 1, unit: "正負の数", title: "加減", hint: "同じ符号なら足してその符号、違うなら引いて絶対値が大きい方の符号！<br>例：$(-3) + (-5) = -8$, $(+3) + (-5) = -2$" },
    { lv: 2, unit: "正負の数", title: "乗除", hint: "マイナスが奇数個なら$-$、偶数個なら$+$になるよ。<br>例：$(-2) \times (-3) = +6$, $(-2) \times (+3) = -6$" },
    { lv: 3, unit: "正負の数", title: "累乗", hint: "累乗 → カッコ → 乗除 → 加減の順！<br>例：$(-3)^2 = (-3) \times (-3) = 9$<br>$-3^2 = -(3 \times 3) = -9$" },
    { lv: 4, unit: "文字の式", title: "表し方", hint: "$\times$ や $\div$ を省く、数は前、アルファベット順！<br>例：$a \times b \times 3 = 3ab$, $x \div 5 = \\frac{x}{5}$" },
    { lv: 5, unit: "文字の式", title: "計算", hint: "同じ文字の項（同類項）どうしをまとめよう！<br>例：$5x + 3y - 2x = 3x + 3y$" },
    { lv: 6, unit: "一次方程式", title: "性質", hint: "両辺に同じ計算をしても等号 $=$ は成り立つよ！<br>$x - 5 = 10 \rightarrow x - 5 \mathbf{+ 5} = 10 \mathbf{+ 5}$" },
    { lv: 7, unit: "一次方程式", title: "解法", hint: "$x$ を左に、数字を右に集めて $x = \text{数字}$ の形にしよう。" },
    { lv: 8, unit: "一次方程式", title: "移行", hint: "$=$ をまたぐ時は符号を逆にする！<br>$x \mathbf{+ 3} = 10 \rightarrow x = 10 \mathbf{- 3}$" },
    { lv: 9, unit: "一次方程式", title: "複雑", hint: "カッコは分配法則で外し、小数は10倍、分数は最小公倍数をかけて整数に直そう！" },
    { lv: 10, unit: "比例", title: "式", hint: "$y = ax$。比例定数 $a$ は $y \div x$ で求められるよ。" },
    { lv: 11, unit: "反比例", title: "式", hint: "$y = \\frac{a}{x}$。比例定数 $a$ は $x \times y$ で求められるよ。" },
    { lv: 12, unit: "平面図形", title: "おうぎ形", hint: "弧の長さ $L = 2\pi r \times \frac{\text{中心角}}{360}$<br>面積 $S = \pi r^2 \times \frac{\text{中心角}}{360}$" },
    { lv: 13, unit: "空間図形", title: "体積", hint: "柱体：底面積 $\times$ 高さ<br>錐体：底面積 $\times$ 高さ $\times \frac{1}{3}$" },
    { lv: 14, unit: "空間図形", title: "球", hint: "表面積 $S = 4\pi r^2$ (心配あるある)<br>体積 $V = \frac{4}{3}\pi r^3$ (身の上に心配参上)" },
    { lv: 15, unit: "データの活用", title: "平均・中央値", hint: "平均＝合計 $\div$ 個数<br>中央値＝小さい順に並べた真ん中の値" },
    { lv: 16, unit: "中1修了", title: "修了テスト", hint: "20問中18問正解で合格！", isExam: true }
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
// 回答の全角・半角や空白を整える関数
// 回答の全角・半角や空白、似た記号を整える関数
// 回答の全角・半角や空白、似た記号を整える関数
function normalize(str) {
    if (!str) return "";
    return str.toString()
        // 1. 先にあらゆる「横棒」記号を半角マイナスに統一する
        // (長音、全角マイナス、数学記号のマイナス、ダッシュなどを網羅)
        .replace(/[ー—－‐−]/g, "-") 
        // 2. その他の数字や記号を全角から半角へ
        .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) 
        // 3. 空白を消す
        .replace(/\s+/g, "")      
        // 4. 小文字に統一
        .toLowerCase();           
}


window.openDashboard = () => {
    const dashboard = document.getElementById('guide-dashboard');
    if (dashboard) {
        dashboard.style.display = "block";
        history.pushState({ page: "guide" }, ""); // 戻るボタン対策
        window.switchTab('j1'); // 最初は中1を表示
    }
};
window.switchTab = (tab) => {
    const container = document.getElementById('guide-content');
    if (!container) return;

    // 中1数学 (j1) の解説一覧を生成
    if (tab === 'j1') {
        let html = `
            <div style="padding: 10px;">
                <h3 style="border-bottom: 2px solid #2196f3; padding-bottom: 5px;">中1数学 解説・公式一覧</h3>
                <p style="font-size: 0.9em; color: #666;">各レベルのポイントを復習しよう！</p>
        `;

        levelMaster.forEach(item => {
            // 修了テスト（Lv.16）は解説不要なのでスキップ
            if (item.lv === 16) return;

            html += `
                <div class="explanation-card" style="
                    background: white; 
                    border: 1px solid #ddd; 
                    border-radius: 10px; 
                    padding: 12px; 
                    margin-bottom: 15px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    border-left: 5px solid #2196f3;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: bold; color: #1976d2;">Lv.${item.lv} ${item.unit}</span>
                        <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">${item.title}</span>
                    </div>
                    <div class="hint-text" style="font-size: 0.95em; line-height: 1.5; color: #333;">
                        ${item.hint}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // 数式 (LaTeX) を反映させる
        if (window.renderMathInElement) {
            renderMathInElement(container, {
                delimiters: [
                    {left: '$', right: '$', display: false},
                    {left: '$$', right: '$$', display: true}
                ],
                throwOnError: false
            });
        }
    } else {
        container.innerHTML = "<p style='padding: 20px;'>中2・中3の内容は準備中です。</p>";
    }
};
// レベルメニューを動的に生成する関数
function renderLevelMenu() {
    const container = document.querySelector('.unit-list-container');
    if (!container) return;
    container.innerHTML = "";

    // 解説ボタン（ダッシュボード行き）をメニュー最上部に追加
    const guideBtn = document.createElement('button');
    guideBtn.innerHTML = "📖 解説（解き方）一覧を表示";
    guideBtn.style = "width: 100%; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 15px; font-size: 16px;";
    guideBtn.onclick = () => openDashboard();
    container.appendChild(guideBtn);

    // 各レベルのリストを表示
    levelMaster.forEach(item => {
        const row = document.createElement('div');
        row.style = "display: flex; gap: 8px; margin-bottom: 12px; align-items: stretch;";
        
        row.innerHTML = `
            <div class="unit-card" onclick="startUnit(${item.lv})" style="flex: 1; margin-bottom: 0; display: flex; align-items: center; padding: 10px; cursor: pointer;">
                Lv.${item.lv} ${item.title}
            </div>
            <button onclick="openDashboardWithLv(${item.lv})" 
                style="width: 70px; background: #2196f3; color: white; border: none; border-radius: 12px; font-size: 12px; cursor: pointer; font-weight: bold; line-height: 1.2; padding: 5px;">
                解き方<br>表示
            </button>
        `;
        container.appendChild(row);
    });
}
// ダッシュボードを開く
window.openDashboard = () => {
    document.getElementById('guide-dashboard').style.display = "block";
    renderLevelTiles('j1'); // タイル（Lv.1, Lv.2...）を表示
};

// ダッシュボードを閉じる
window.closeDashboard = () => {
    document.getElementById('guide-dashboard').style.display = "none";
};

// レベルタイルの生成
function renderLevelTiles(grade) {
    const grid = document.getElementById('level-button-grid');
    grid.innerHTML = "";
    if(grade !== 'j1') {
        document.getElementById('guide-display-area').innerHTML = "中2・中3は準備中です。";
        return;
    }
    
    levelMaster.forEach(item => {
        if(item.lv === 16) return;
        const tile = document.createElement('div');
        tile.className = "level-tile";
        tile.innerText = `Lv.${item.lv}`;
        tile.onclick = () => showGuide(item.lv);
        grid.appendChild(tile);
    });
}

// 実際の解説文を表示する
function showGuide(lv) {
    const item = levelMaster.find(l => l.lv === lv);
    const displayArea = document.getElementById('guide-display-area');
    if (!item) return;

    displayArea.innerHTML = `
        <div style="background: white; padding: 15px; border-radius: 10px; border-left: 5px solid #4a90e2;">
            <h3 style="margin: 0 0 10px 0;">Lv.${item.lv} ${item.title}</h3>
            <div style="font-size: 15px;">${item.hint}</div>
        </div>
    `;

    // 数式を変換（KaTeX）
    if (window.renderMathInElement) {
        renderMathInElement(displayArea, {
            delimiters: [{left: '$', right: '$', display: false}],
            throwOnError: false
        });
    }
}
// 特定のレベルを指定してダッシュボードを開く関数
window.openDashboardWithLv = (lv) => {
    openDashboard(); // ダッシュボードを表示
    showGuide(lv);   // そのレベルの解説を表示
};
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
// 1. アプリ起動時に足跡を残す (ログイン完了後の処理に入れてもOK)
window.addEventListener('load', () => {
    history.pushState({ page: "main" }, "");
});

// 2. ブラウザの「戻る」を監視
window.onpopstate = function(event) {
    const dashboard = document.getElementById('guide-dashboard');
    if (dashboard.style.display === "block") {
        // ダッシュボードが開いていたら、閉じるだけ（履歴はもう戻っている）
        dashboard.style.display = "none";
    } else {
        // もしメイン画面で戻るを押されたら、警告（またはログイン画面へ）
        if(confirm("ログイン画面に戻りますか？")) {
            location.reload(); 
        } else {
            history.pushState({ page: "main" }, ""); // 履歴を戻さないように再セット
        }
    }
};

// 3. ダッシュボードを開く
function openDashboard() {
    document.getElementById('guide-dashboard').style.display = "block";
    history.pushState({ page: "guide" }, ""); // 履歴を1つ追加
    switchTab('j1'); // 最初は中1を表示
}
// nextQuestion関数の中で、currentStepが最後まで行った時の判定
async function finishExam(score) {
    const passScore = 18; // 20問中18問で合格
    if (score >= passScore) {
        alert(`【合格！】20問中${score}問正解！\nおめでとう！君は中1数学マスターだ！🎓`);
        
        // Firebaseに合格記録を保存
        await set(ref(db, `users/${currentUser}/isJ1Done`), true);
        await set(ref(db, `users/${currentUser}/level`), 16); // レベルを16(修了)に
    } else {
        alert(`【不合格】正解数: ${score}/20\n惜しい！あと${passScore - score}問で合格だったよ。復習してまた挑戦しよう！`);
    }
    showMenu();
}
function closeDashboard() {
    document.getElementById('guide-dashboard').style.display = "none";
    // 戻るボタンが押された時と同様の挙動にするため、手動でhistory.back()しても良いが、
    // ここでは表示を消すだけに留める
}
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
async function updateMyStreak(userName) {
    // 1. logsの中からそのユーザーの記録を取得 (例: logs/0407)
    // ※ログイン時に使ったパスワード(0407など)がlogsのキーになっている前提です
    const password = "0407"; // ここは実際にはログイン中のユーザーのパスワード変数を入れてください
    const logRef = firebase.database().ref('logs/' + password);
    
    const snapshot = await logRef.once('value');
    const logsObj = snapshot.val() || {};
    const logTimestamps = Object.keys(logsObj);

    // 2. 今回の正解ログも追加（現在時刻）
    const nowTs = Date.now();
    logTimestamps.push(nowTs);
    
    // 3. 連続日数を計算（前の回答の calculateStreakFromLogs を使います）
    const newStreak = calculateStreakFromLogs(logTimestamps);

    // 4. 反映（パスワードをキーに logs を更新し、名前をキーに users 側を更新）
    const updates = {};
    // logs 側を更新
    updates['logs/' + password + '/' + nowTs] = true;
    
    // users 側（名前がキーになっている場所）を更新
    // userName には "根田" や "その" が入るようにしてください
    updates['users/' + userName + '/streak'] = newStreak;
    updates['users/' + userName + '/lastUpdate'] = nowTs;

    return firebase.database().ref().update(updates);
}
// 過去のタイムスタンプ（文字列の配列を想定）から連続日数を計算する関数
// logsにあるミリ秒のリストから連続日数を計算する
function calculateStreakFromLogs(logTimestamps) {
    if (!logTimestamps || logTimestamps.length === 0) return 0;

    // ミリ秒を「yyyy-mm-dd」形式の文字列に変換して、重複を除去
    const dateStrings = logTimestamps.map(ts => {
        const d = new Date(Number(ts));
        return d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
    });

    // 新しい順（降順）に並べ替え
    const uniqueDates = [...new Set(dateStrings)].sort().reverse();

    const now = new Date();
    const today = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + (yesterday.getMonth() + 1).toString().padStart(2, '0') + '-' + yesterday.getDate().toString().padStart(2, '0');

    // 最新のログが今日でも昨日でもなければストリーク終了
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterdayStr) {
        return 1; // 今回解いた分だけ
    }

    let streak = 0;
    let checkDate = new Date(uniqueDates[0]);

    for (let i = 0; i < uniqueDates.length; i++) {
        const dStr = checkDate.getFullYear() + '-' + (checkDate.getMonth() + 1).toString().padStart(2, '0') + '-' + checkDate.getDate().toString().padStart(2, '0');
        if (uniqueDates[i] === dStr) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1); // 1日戻す
        } else {
            break;
        }
    }
    return streak;
}
// 正解した時のDB更新処理
async function handleCorrectAnswerUpdate(userId) {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');

    if (doc.exists) {
        const data = doc.data();
        let history = data.solveHistory || []; // タイムスタンプの配列

        // 1. 今回のタイムスタンプを追加
        if (!history.includes(todayStr)) {
            history.push(todayStr);
        }

        // 2. 履歴全体から最新の連続日数を計算
        const newStreak = calculateStreak(history);

        // 3. DBを更新
        await userRef.update({
            solveHistory: history,
            streak: newStreak,
            lastUpdate: todayStr
        });

        console.log(`データ反映完了！現在の記録: ${newStreak}日連続`);
    }
}
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
    　　const b3 = r(10); // 引く数を固定する
           text = `(-${a3})^2 - ${b3} は？`;
           ans = (Math.pow(a3, 2) - b3).toString(); // 同じ b3 を使う
           break;

        case 4: // 文字式の加減
           const a4 = r(10);
           const b4 = r(10);text = `${a4}x - ${b4}x は？`;
    
    // 計算結果が0なら "0"、それ以外なら "数字x" に
           const result = a4 - b4;
           if (result === 0) {
               ans = "0";
           } else if (result === 1) {
               ans = "x";  // 1xとは書かないルールもついでにカバー！
           } else if (result === -1) {
               ans = "-x"; // -1xとは書かない
           } else {
               ans = result + "x";
           }
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
    currentStep = 0;
    userScore = 0; // テスト中の正解数をカウントするためにリセット
    
    if (currentMode === "practice") {
        practiceQuestions = [];
        
        // --- 修了テスト(Lv.16)の場合 ---
        if (selectedLv === 16) {
            totalQuestions = 20; // 修了テストは20問固定
            for (let i = 0; i < totalQuestions; i++) {
                // 1〜15のレベルからランダムに選んで問題を作成
                const randomLv = Math.floor(Math.random() * 15) + 1;
                practiceQuestions.push(generateAIQuestion(randomLv));
            }
        } 
        // --- 通常の演習(Lv.1〜15)の場合 ---
        else {
            totalQuestions = num;
            for (let i = 0; i < totalQuestions; i++) {
                practiceQuestions.push(generateAIQuestion(selectedLv));
            }
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
    const q = (currentMode === "diagnostic") ? diagnosticQuestions[currentStep] : practiceQuestions[currentStep];

    let ans = inputField.value.trim();
    // normalize関数は以前のものをそのまま使ってください
    const isCorrect = (normalize(ans) === normalize(q.ans));
    const currentLv = q.lv || 0;

    const feedbackPanel = document.getElementById('feedback-panel');
    const aiComment = document.getElementById('ai-comment');
    const feedbackResult = document.getElementById('feedback-result');

    // 結果の文字と色をセット
    feedbackResult.innerText = isCorrect ? "○ 正解" : "× 不正解";
    feedbackResult.style.color = isCorrect ? "var(--success)" : "var(--error)"; // CSSの変数を使用

    // 解説文をセット
    const config = levelMaster.find(l => l.lv === currentLv);
    aiComment.innerHTML = isCorrect ? 
        "正解です！その調子！" : 
        `正解は <b>${q.ans}</b> です。<br><br><div class="ai-box">【AI解説】<br>${config ? config.hint : "公式をチェック！"}</div>`;
    
    // --- 【重要】CSSのアニメーションを発動させる ---
    feedbackPanel.classList.add('show');
    feedbackPanel.dataset.isCorrect = isCorrect;

    // --- 【重要】KaTeXで数式を変換する ---
    if (window.renderMathInElement) {
        renderMathInElement(aiComment, {
            delimiters: [
                {left: '$', right: '$', display: false},
                {left: '$$', right: '$$', display: true}
            ],
            throwOnError: false
        });
    }

    // Firebaseへ保存
    await set(ref(db, `logs/${currentUser}/${Date.now()}`), { ans, isCorrect, lv: currentLv });
};
async function finishDiagnostic() {
    await set(ref(db, `users/${currentUser}/hasTakenTest`), true);
    await set(ref(db, `users/${currentUser}/level`), userScore);
    showMenu();
}

// --- 修正：解説後に次へ行くか終了するか ---
window.nextQuestion = () => {
    const isCorrect = document.getElementById('feedback-panel').dataset.isCorrect === "true";
    if (isCorrect) userScore++; 

    document.getElementById('feedback-panel').classList.remove('show');

    if (currentMode === "diagnostic") {
        currentStep++;
        if (currentStep < diagnosticQuestions.length) {
            loadQuestion();
        } else {
            finishDiagnostic(); // 診断終了
        }
    } else { // 練習モード
        currentStep++;
        if (currentStep < totalQuestions) {
            loadQuestion();
        } else {
            if (selectedLv === 16) {
                finishExam(userScore);
            } else {
                alert(`${totalQuestions}問中 ${userScore}問正解でした！`);
                showMenu();
            }
        }
    }
}; // ここでしっかり閉じる
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
window.showRanking = async () => {
    showSection('ranking-section');
    const rankingBody = document.getElementById('ranking-body');
    rankingBody.innerHTML = "<tr><td colspan='3'>読み込み中...</td></tr>";

    const usersSnap = await get(ref(db, 'users'));
    const logsSnap = await get(ref(db, 'logs'));
    const users = usersSnap.val() || {};
    const allLogs = logsSnap.val() || {};
    
    const rankingData = [];

    for (const name in users) {
        // logs[ユーザー名] の中にあるデータの数が「挑戦数」
        let challengeCount = 0;
        if (allLogs[name]) {
            challengeCount = Object.keys(allLogs[name]).length;
        }

        rankingData.push({ 
            name: name, 
            challengeCount: challengeCount, // これを表示に使う
            isJ1Done: users[name].isJ1Done || false 
        });
    }

    // 挑戦数が多い順に並び替え
    rankingData.sort((a, b) => b.challengeCount - a.challengeCount);

    rankingBody.innerHTML = "";
    rankingData.forEach((data, index) => {
        const medal = data.isJ1Done ? "🎓" : "";
        const row = `
            <tr style="border-bottom: 1px solid #eee; height: 40px;">
                <td>${index + 1}位 ${medal}</td>
                <td>${data.name}</td>
                <td><b>${data.challengeCount}</b> 回</td>
            </tr>
        `;
        rankingBody.innerHTML += row;
    });
};
// --- 修正：演習開始ボタン ---
window.startUnit = (lv) => {
    selectedLv = lv; // レベルを覚えさせる
    currentMode = "practice";
    showSection('settings-section'); // まず問題数選択へ飛ばす
};
