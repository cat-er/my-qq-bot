import express from "express";
import bodyParser from "body-parser";
import simpleGit from "simple-git";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process"; // 引入 exec 来执行 shell 命令

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const git = simpleGit();

// Git 仓库路径
const repoPath = "/root/workspace/my-qq-bot";

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

      // 代码更新后，重启 PM2 管理的应用
      exec("pm2 restart my-qq-bot", (error, stdout, stderr) => {
        if (error) {
          console.error(`重启失败: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      });

      res.status(200).send("代码更新成功，服务已重启！");
    } catch (error) {
      console.error("Git 拉取失败:", error);
      res.status(500).send("Git 拉取失败");
    }
  } else {
    res.status(200).send("不是推送到 main 分支，忽略此次请求");
  }
});

console.log("测试");

// 启动服务器
const port = 8888;
app.listen(port, () => {
  console.log(`Webhook 服务器正在监听 ${port} 端口...`);
});

export default app;
