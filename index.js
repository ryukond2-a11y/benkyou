const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express"); // 追加：Webサーバー用
const app = express();
const port = process.env.PORT || 3000; // Renderが指定するポート番号を使用

app.use(express.json());

// --- Firebase & Gemini 初期化 ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // 環境変数から取得
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- カリキュラム定義 ---
const MATH_LEVELS = {
  1: "正負の数の加減（混合計算）",
  2: "一次方程式（移項と分配法則）",
  3: "方程式の応用（分数・カッコを含む）",
  4: "連立方程式（加減法：基本）",
  5: "連立方程式（代入法・応用）"
};

// --- Webサーバーとしての動作確認用 ---
app.get("/", (req, res) => {
  res.send("根田理化学研究所 AI学習システム稼働中...");
});

// --- 所長設計の機能をAPIとして公開 ---
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const userRef = db.collection("users").doc(username);
  await userRef.set({
    username,
    password,
    hasTakenTest: false,
    level: 1,
    xp: 0
  });
  res.json({ message: "アカウント作成完了" });
});

// サーバーを起動し、アクセスを待ち続ける状態にする
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
