const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// --- Firebase & Gemini 初期化 ---
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MATH_LEVELS = {
  1: "正負の数の加減（混合計算）",
  2: "一次方程式（移項と分配法則）",
  3: "方程式の応用（分数・カッコを含む）",
  4: "連立方程式（加減法：基本）",
  5: "連立方程式（代入法・応用）"
};

// --- 会員登録 ---
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  const userRef = db.collection("users").doc(username);
  await userRef.set({
    username, password, level: 1, hasTakenTest: false,
    xp: 0, totalAttempts: 0, correctAnswers: 0
  }, { merge: true });
  res.json({ message: "登録完了" });
});

// --- XP加算 & レベルアップ処理（★追加：これがないとフロントでエラーになります） ---
app.post("/api/add-xp", async (req, res) => {
  const { username } = req.body;
  const userRef = db.collection("users").doc(username);
  const user = await userRef.get();
  let { xp, level } = user.data();

  xp += 20; // 1問正解で20XP
  if (xp >= 100) {
    xp = 0;
    if (level < 5) level++; // 最大レベル5まで
  }
  await userRef.update({ xp, level });
  res.json({ xp, level, unit: MATH_LEVELS[level] });
});

// --- 正誤判定の記録 ---
app.post("/api/record-result", async (req, res) => {
  const { username, isCorrect } = req.body;
  const userRef = db.collection("users").doc(username);
  await userRef.update({
    totalAttempts: admin.firestore.FieldValue.increment(1),
    correctAnswers: isCorrect ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0)
  });
  res.json({ success: true });
});

// --- ランキング取得 ---
app.get("/api/rankings", async (req, res) => {
  const snapshot = await db.collection("users").get();
  const users = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const rate = data.totalAttempts > 0 ? (data.correctAnswers / data.totalAttempts) * 100 : 0;
    users.push({
      username: data.username,
      totalAttempts: data.totalAttempts || 0,
      accuracy: parseFloat(rate.toFixed(1))
    });
  });
  const attemptRank = [...users].sort((a, b) => b.totalAttempts - a.totalAttempts).slice(0, 5);
  const accuracyRank = [...users].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  res.json({ attemptRank, accuracyRank });
});

// --- 診断テスト終了 ---
app.post("/api/finish-test", async (req, res) => {
  const { username, score } = req.body;
  let startLevel = score >= 5 ? 5 : score >= 3 ? 4 : score >= 1 ? 2 : 1;
  await db.collection("users").doc(username).update({ hasTakenTest: true, level: startLevel });
  res.json({ level: startLevel });
});

// --- AI問題生成（★修正：POSTメソッドに統一し、プロンプトを強化） ---
app.post("/api/question", async (req, res) => {
  const { username } = req.body;
  const user = await db.collection("users").doc(username).get();
  const userData = user.data();
  
  // 数式が壊れないよう、AIへの指示を「エスケープ」を意識したものに強化
  const prompt = `数学教師として、${MATH_LEVELS[userData.level]}の問題を1問作成してください。
  【重要ルール】
  1. 数式は必ず $マークで囲んだLaTeX形式（例：$\\frac{1}{2}$ や $x^2$）で出力してください。
  2. バックスラッシュは必ず「二重（\\\\）」にして出力してください（例：\\\\times）。
  3. 変数は $x, y$ としてください。
  4. 回答は以下の純粋なJSON形式のみ。余計な解説は不要。
  {"question": "問題文", "answer": "数値のみ", "explanation": "解説"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  res.json(JSON.parse(text));
});

app.listen(port, () => console.log(`稼働中: port ${port}`));
