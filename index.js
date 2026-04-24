import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 自分のフォルダにあるHTMLやJSをそのままブラウザに送る設定
app.use(express.static(__dirname));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`サーバー起動中: http://localhost:${port}`);
});
