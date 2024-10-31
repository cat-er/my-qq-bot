import WebSocket from "ws";
import { useAccessToken } from "./utils.js";
import { sendGroupMsg } from "./api/api.js";

const { getAccessToken } = useAccessToken();

let ws;

// 心跳周期
let heartbeatInterval = 0;

// 周期心跳计时器
let heartbeatIntervalTimer = null;

// 客户端消息s
let seq;

// 恢复链接时的session_id参数
let sessionId;

export const createWebSocket = (url) => {
  // 创建一个 WebSocket 服务器
  ws = new WebSocket(url);

  // 连接成功后
  ws.on("open", () => {
    console.log("已连接到 WebSocket 服务器:");
  });

  // 接收消息
  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    console.log(`收到消息: ${message}`);

    if (!msg) return;

    if (msg.op && msg.op === 10) {
      heartbeatInterval = msg.d.heartbeat_interval;
      login();
    }

    if (msg.s) {
      seq = msg.s;
    }

    // 如果是首次接入 立即发送心跳
    if (msg.t && msg.t == "READY") {
      sessionId = msg.d.session_id;
      ws.send(
        JSON.stringify({
          op: 1,
          d: null,
        })
      );
    } else {
      // 不是首次接入 周期发送心跳
      if (heartbeatIntervalTimer !== null) {
        clearInterval(heartbeatIntervalTimer); // 如果已经存在定时器，先清除它
      }
      heartbeatIntervalTimer = setInterval(() => {
        ws.send(
          JSON.stringify({
            op: 1,
            d: seq,
          })
        );

        console.log(
          "周期心跳",
          JSON.stringify({
            op: 1,
            d: seq,
          })
        );
      }, heartbeatInterval);
    }

    if (msg.t && msg.t === "GROUP_AT_MESSAGE_CREATE") {
      userMsgHandler(msg);
    }
  });
};

const login = () => {
  const data = {
    op: 2,
    d: {
      token: `QQBot ${getAccessToken()}`,
      intents: 0 | (1 << 25),
      shard: [0, 1],
      properties: {},
    },
  };
  console.log("ws登录:", data);
  ws.send(JSON.stringify(data));
};

const userMsgHandler = async (msg) => {
  const { group_openid, content, id } = msg.d;
  console.log("收到用户消息：", content);
  const data = { content: `已收到消息喵: ${content}`, msg_type: 0, msg_id: id };
  await sendGroupMsg(group_openid, data);
};
