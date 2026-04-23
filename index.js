const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- 【復活】ログイン・サインアップの窓口 ---
app.post("/api/signup", (req, res) => res.json({ success: true }));
app.post("/api/login", (req, res) => res.json({ success: true }));
app.post("/api/finish-test", (req, res) => res.json({ level: 1 }));

// --- AI問題生成 ---
app.post("/api/question", async (req, res) => {
    try {
        const { unit } = req.body;
        const prompt = `数学教師として、中学数学の「${unit}」の問題を1問作成してください。必ず以下のJSON形式のみで返してください。余計な文章は一切含めないで。{"question": "問題文(LaTeX)", "answer": "答えの数値のみ", "explanation": "解説"}`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json|```/g, "").trim();

        // 強引にJSONだけを抽出してパース
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        const cleanJson = text.substring(start, end);
        res.json(JSON.parse(cleanJson));
    } catch (e) {
        console.error("AI Error:", e);
        res.status(500).json({ error: "AI生成に失敗しました" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
