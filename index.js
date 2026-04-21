const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public")); // HTMLファイルを読み込む設定

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

// --- API: サインアップ & 診断テスト完了 ---
app.post("/api/signup", async (req, res) => {
  const { username } = req.body;
  const userRef = db.collection("users").doc(username);
  await userRef.set({ username, level: 1, hasTakenTest: false, xp: 0 });
  res.json({ message: "研究員登録完了" });
});

app.post("/api/finish-test", async (req, res) => {
  const { username, score } = req.body;
  let startLevel = score >= 5 ? 5 : score >= 3 ? 4 : score >= 1 ? 2 : 1;
  await db.collection("users").doc(username).update({ hasTakenTest: true, level: startLevel });
  res.json({ level: startLevel });
});

// --- API: AI問題生成 ---
app.get("/api/question/:username", async (req, res) => {
  const user = await db.collection("users").doc(req.params.username).get();
  const userData = user.data();
  const unit = MATH_LEVELS[userData.level];

  const prompt = `あなたは数学教師です。レベル${userData.level}の「${unit}」の問題を1問作り、JSON形式で返してください。
  {"question": "問題文", "answer": "答えのみ", "explanation": "解説"}`;

  const result = await model.generateContent(prompt);
  res.json(JSON.parse(result.response.text().replace(/```json|```/g, "")));
});

app.listen(port, () => console.log(`稼働中: port ${port}`));
