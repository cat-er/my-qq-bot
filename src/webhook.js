import express from "express";
import bodyParser from "body-parser";
import simpleGit from "simple-git";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const git = simpleGit();

// Git 仓库路径
// https://github.com/cat-er/my-qq-bot.git
const repoPath = "https://github.com/cat-er/my-qq-bot.git"; // 替换为你的仓库路径

// 监听 GitHub 的 Webhook 请求
app.use(bodyParser.json());

app.post("/webhookGitPull", async (req, res) => {
  // 校验 GitHub Webhook 请求的密钥
  const signature = req.headers["x-hub-signature-256"];
  const payload = JSON.stringify(req.body);

  console.log("/webhookGitPull触发:", req.body);

  // 你可以根据 GitHub 文档生成签名校验（可选）
  // const isValid = validateSignature(signature, payload);
  // if (!isValid) return res.status(403).send('Forbidden');

  // 如果是推送到 main 分支
  if (req.body.ref === "refs/heads/main") {
    try {
      console.log("代码有更新，开始pull...");

      // 在指定的 Git 仓库路径下执行 git pull
      await git.cwd(repoPath);
      await git.pull();

      console.log("代码更新成功！");
      res.status(200).send("代码更新成功！");
    } catch (error) {
      console.error("Git 拉取失败:", error);
      res.status(500).send("Git 拉取失败");
    }
  } else {
    res.status(200).send("不是推送到 main 分支，忽略此次请求");
  }
});

// 启动服务器
const port = 3000;
app.listen(port, () => {
  console.log(`Webhook 服务器正在监听 ${port} 端口...`);
});

export default app;