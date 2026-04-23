const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static("public"));

// 【所長の指定URL】末尾に /users.json をつけることで、ユーザーデータをここに集約します
const DB_URL = "https://benkyou-9a95b-default-rtdb.firebaseio.com/users.json";

let users = {};

// 1. 起動時にDBからデータを取得（以前のSNSと同じ方式）
fetch(DB_URL)
  .then(res => res.json())
  .then(data => {
    users = data || {};
    console.log("Firebase(RTDB) 同期完了！");
  })
  .catch(err => console.error("DB読み込み失敗:", err));

// 2. データを保存する関数
async function saveDB() {
  try {
    await fetch(DB_URL, {
      method: "PUT",
      body: JSON.stringify(users)
    });
  } catch (e) {
    console.error("DB保存エラー:", e);
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/* ===== API エンドポイント ===== */

// サインアップ（ユーザーがいなければ新規作成）
app.post("/api/signup", async (req, res) => {
  const { username } = req.body;
  if (!users[username]) {
    users[username] = { level: 1, totalAttempts: 0, correctAnswers: 0 };
    await saveDB();
  }
  res.json({ message: "OK" });
});

// 診断結果の保存
app.post("/api/finish-test", async (req, res) => {
  const { username, score } = req.body;
  // スコアに応じておすすめレベルを判定
  let level = score >= 5 ? 5 : score >= 3 ? 3 : 1;
  
  if (users[username]) {
    users[username].level = level;
    await saveDB();
  }
  res.json({ level });
});

// AI問題生成
app.post("/api/question", async (req, res) => {
  try {
    const { unit } = req.body;
    const prompt = `数学教師として、中学数学の「${unit}」の問題を1問作成してください。
    【重要】1. 数式は $ で囲む LaTeX。 2. バックスラッシュは2重（\\\\）にする。
    3. 返答は以下のJSON形式のみ： {"question": "問題", "answer": "数値", "explanation": "解説"}`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    res.json(JSON.parse(responseText));
  } catch (e) {
    console.error("AI Error:", e);
    res.status(500).json({ error: "AI生成失敗" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
