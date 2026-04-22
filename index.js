const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Firebase & Gemini 初期化
try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) { console.error("Firebase Init Error:", e); }

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MATH_LEVELS = { 1: "正負の数", 2: "一次方程式", 3: "方程式の応用", 4: "連立方程式", 5: "連立方程式の応用" };

// --- 【修正】ログインと新規登録を分離・統合したAPI ---
app.post("/api/auth", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userRef = db.collection("users").doc(username);
    const doc = await userRef.get();

    if (doc.exists) {
      // 既存ユーザー：パスワードチェック
      if (doc.data().password === password) {
        return res.json({ message: "login", data: doc.data() });
      } else {
        return res.status(401).json({ error: "パスワードが正しくありません" });
      }
    } else {
      // 新規ユーザー：アカウント作成
      const userData = {
        username, password, level: 1, xp: 0, 
        totalAttempts: 0, correctAnswers: 0, hasTakenTest: false 
      };
      await userRef.set(userData);
      return res.json({ message: "signup", data: userData });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: XP加算
app.post("/api/add-xp", async (req, res) => {
  try {
    const { username } = req.body;
    const userRef = db.collection("users").doc(username);
    const user = await userRef.get();
    let { xp, level } = user.data();
    xp += 20;
    if (xp >= 100) { xp = 0; if (level < 5) level++; }
    await userRef.update({ xp, level });
    res.json({ xp, level, unit: MATH_LEVELS[level] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: 結果記録
app.post("/api/record-result", async (req, res) => {
  try {
    const { username, isCorrect } = req.body;
    await db.collection("users").doc(username).update({
      totalAttempts: admin.firestore.FieldValue.increment(1),
      correctAnswers: isCorrect ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0)
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: ランキング
app.get("/api/rankings", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      const attempts = d.totalAttempts || 0;
      users.push({
        username: d.username,
        totalAttempts: attempts,
        accuracy: attempts > 0 ? ((d.correctAnswers / attempts) * 100).toFixed(1) : 0
      });
    });
    res.json({
      attemptRank: [...users].sort((a,b) => b.totalAttempts - a.totalAttempts).slice(0, 5),
      accuracyRank: [...users].sort((a,b) => b.accuracy - a.accuracy).slice(0, 5)
    });
  } catch (e) { res.status(500).send(e.message); }
});

// API: 診断テスト終了（★hasTakenTestをtrueに更新）
app.post("/api/finish-test", async (req, res) => {
  try {
    const { username, score } = req.body;
    let level = score >= 5 ? 5 : score >= 3 ? 3 : 1;
    await db.collection("users").doc(username).update({ level, hasTakenTest: true });
    res.json({ level });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: AI問題生成（★エラー時に詳細を返すよう修正）
app.post("/api/question", async (req, res) => {
  try {
    const { username } = req.body;
    const user = await db.collection("users").doc(username).get();
    if (!user.exists) return res.status(404).json({ error: "ユーザー不在" });
    
    const unit = MATH_LEVELS[user.data().level];
    const prompt = `数学教師として、${unit}の問題を1問作成。
    【重要】
    1. LaTeX形式（$で囲む）。
    2. バックスラッシュは必ず2重（\\\\）にする。
    3. 返答は純粋なJSONのみ。
    {"question": "問題文", "answer": "数値のみ", "explanation": "解説"}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    res.json(JSON.parse(responseText));
  } catch (e) { 
    console.error("Gemini Error:", e);
    res.status(500).json({ error: "AI生成に失敗しました。APIキーを確認してください。" }); 
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
