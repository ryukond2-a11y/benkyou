const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post("/api/question", async (req, res) => {
    try {
        const { unit } = req.body;
        // プロンプトをより厳格に
        const prompt = `数学教師として、中学数学の「${unit}」の問題を1問作成してください。
必ず以下のJSON形式のみで返し、前後の説明文は一切含めないでください。
{"question": "問題文(LaTeX形式)", "answer": "数値のみ", "explanation": "解説"}
数学記号は必ず $ で囲んでください。`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // 不要なマークダウン記号を削除
        text = text.replace(/```json|```/g, "").trim();

        // ★JSONのパースに失敗した時のための強力な修復処理
        try {
            const parsed = JSON.parse(text);
            res.json(parsed);
        } catch (parseError) {
            console.log("JSON修復を試みます:", text);
            // 文字列の中から最初の { と最後の } を探して抽出
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}') + 1;
            if (start !== -1 && end !== 0) {
                const cleaned = text.substring(start, end);
                res.json(JSON.parse(cleaned));
            } else {
                throw new Error("JSON抽出不可");
            }
        }
    } catch (e) {
        console.error("Server Error:", e);
        // エラー時はダミー問題を返してアプリを止めない
        res.json({
            question: "エラーが発生しましたが、再試行してください。 $(1+1=)$",
            answer: "2",
            explanation: "通信エラーによる一時的な問題です。"
        });
    }
});

// 他のログイン・サインアップ・テスト終了などのエンドポイントもここに追加
// ...（省略せずに既存のコードを維持してください）

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
