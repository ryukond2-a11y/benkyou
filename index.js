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
// 1. 新規登録：名前とパスワードを保存
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ error: "その名前は使われています" });
  
  users[username] = { password, level: 1 }; // パスワードも一緒に保存
  await saveDB();
  res.json({ message: "OK" });
});

// 2. ログイン：名前とパスワードが一致するか確認
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.json({ message: "OK", level: user.level });
  } else {
    res.status(401).json({ error: "名前かパスワードが違います" });
  }
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
    const prompt = `数学教師として、中学数学の「${unit}」の問題を1問作成。返答は必ず以下のJSON形式のみ。挨拶不要。 {"question": "問題", "answer": "数値", "explanation": "解説"}`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json|```/g, "").trim();

    // ★ここが重要！バックスラッシュが壊れるのを防ぎます
    text = text.replace(/\\/g, "\\\\").replace(/\\\\\\\\/g, "\\\\");

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const cleanJson = text.substring(jsonStart, jsonEnd);

    res.json(JSON.parse(cleanJson));
  } catch (e) {
    console.error("AI生成エラー:", e);
    res.status(500).json({ error: "AI生成失敗" });
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
