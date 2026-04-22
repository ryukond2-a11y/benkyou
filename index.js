const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) { console.error("Firebase Init Error:", e); }

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MATH_LEVELS = { 1: "正負の数", 2: "一次方程式", 3: "方程式の応用", 4: "連立方程式", 5: "連立方程式の応用" };

// 認証API（ログイン・新規登録共通）
app.post("/api/auth", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userRef = db.collection("users").doc(username);
    const doc = await userRef.get();

    if (doc.exists) {
      if (doc.data().password === password) {
        return res.json({ message: "login", data: doc.data() });
      } else {
        return res.status(401).json({ error: "パスワードが違います" });
      }
    } else {
      const newData = { username, password, level: 1, xp: 0, totalAttempts: 0, correctAnswers: 0, hasTakenTest: false };
      await userRef.set(newData);
      return res.json({ message: "signup", data: newData });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI問題生成
app.post("/api/question", async (req, res) => {
  try {
    const { username } = req.body;
    const user = await db.collection("users").doc(username).get();
    const unit = MATH_LEVELS[user.data().level || 1];
    const prompt = `数学教師として、${unit}の問題を1問作成してください。
    1. 数式は $ で囲む LaTeX 形式。
    2. バックスラッシュは2重（\\\\）にすること。
    3. 返答は以下のJSON形式のみ。
    {"question": "問題文", "answer": "数値のみ", "explanation": "解説"}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    res.json(JSON.parse(responseText));
  } catch (e) { res.status(500).json({ error: "AI生成失敗" }); }
});

// 診断テスト終了
app.post("/api/finish-test", async (req, res) => {
  const { username, score } = req.body;
  let level = score >= 5 ? 5 : score >= 3 ? 3 : 1;
  await db.collection("users").doc(username).update({ level, hasTakenTest: true });
  res.json({ level });
});

app.listen(port, "0.0.0.0", () => { console.log(`Server running on port ${port}`); });
