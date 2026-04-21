const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. 初期設定 (Firebase & Gemini) ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY"); // ここにAPIキーを入力
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- 2. カリキュラム定義 ---
const MATH_LEVELS = {
  1: "正負の数の加減（混合計算）",
  2: "一次方程式（移項と分配法則）",
  3: "方程式の応用（分数・カッコを含む）",
  4: "連立方程式（加減法：基本）",
  5: "連立方程式（代入法・応用）"
};

// --- 3. アカウント管理機能 ---
// 新規登録 (アカウント作成)
async function signup(username, password) {
  const userRef = db.collection("users").doc(username);
  const doc = await userRef.get();
  
  if (doc.exists) {
    console.log("エラー: そのユーザー名は既に使用されています。");
    return;
  }

  await userRef.set({
    username: username,
    password: password, // 本番ではbcrypt等でハッシュ化推奨
    hasTakenTest: false, // 初回テスト済みフラグ
    level: 1,            // デフォルトレベル
    xp: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log(`【${username}】所員のアカウントを新規作成しました。`);
}

// ログイン & 状態チェック
async function login(username, password) {
  const userRef = db.collection("users").doc(username);
  const doc = await userRef.get();

  if (!doc.exists || doc.data().password !== password) {
    console.log("エラー: ログインに失敗しました。");
    return null;
  }

  const userData = doc.data();
  console.log(`ログイン成功！現在のレベル: ${userData.level}`);
  
  // 初回テストが必要か判定
  if (!userData.hasTakenTest) {
    console.log("初回実力テストを開始してください。");
  }
  return userData;
}

// --- 4. 診断テスト完了 & レベル確定 ---
async function finishPlacementTest(username, score) {
  let startLevel = 1;
  
  // 所長の設計した判定ロジック
  if (score === 5) startLevel = 5;
  else if (score >= 4) startLevel = 4;
  else if (score >= 2) startLevel = 2;

  await db.collection("users").doc(username).update({
    hasTakenTest: true,
    level: startLevel,
    xp: 100 // テスト完了ボーナス
  });
  
  console.log(`診断完了！【${username}】はレベル ${startLevel} からスタートします。`);
}

// --- 5. AI問題生成ロジック (スモールステップ) ---
async function getNextQuestion(username) {
  const userRef = db.collection("users").doc(username);
  const doc = await userRef.get();
  const currentLevel = doc.data().level;
  const unitName = MATH_LEVELS[currentLevel];

  const prompt = `あなたは数学教師です。レベル${currentLevel}「${unitName}」の問題を1問作成してください。
  必ず以下のJSON形式のみで返答してください。
  {
    "question": "問題文",
    "answer": "正解",
    "hint": "ヒント（考え方の第一歩）",
    "explanation": "ステップバイステップの解説"
  }`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
}

// --- 6. レベルアップ処理 ---
async function levelUp(username) {
  await db.collection("users").doc(username).update({
    level: admin.firestore.FieldValue.increment(1)
  });
  console.log("レベルアップ！次のステップへ進みます。");
}
