import WebSocket from "ws";
import { useAccessToken, aiOrder } from "./utils.js";
import {
  sendGroupMsg,
  sendGroupFilesMsg,
  getRandomImg,
  getAiText,
  getMeme,
  getDailyNews,
} from "./api/api.js";

const { getAccessToken } = useAccessToken();

let ws;
let wsUrl;

// 心跳周期
let heartbeatInterval = 0;
// 周期心跳计时器
let heartbeatIntervalTimer = null;

// 客户端消息
let seq;
// 恢复链接时的session_id参数
let sessionId;
// 是否断线
let isBreak = false;

export const createWebSocket = (url) => {
  // 创建 WebSocket 实例
  ws = new WebSocket(url);
  wsUrl = url;

  // 连接成功
  ws.on("open", () => {
    console.log("已连接到 WebSocket 服务器:");
  });

  // 接收消息
  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    console.log(`收到消息: ${message}`);

    if (!msg) return;

    if (msg.op === 10) {
      if (!isBreak) {
        heartbeatInterval = msg.d.heartbeat_interval;
        login();
      } else {
        reconnection();
        isBreak = false;
      }
    }

    if (msg.s) {
      seq = msg.s;
    }

    // 首次接入 立即发送心跳
    if (msg.t === "READY") {
      sessionId = msg.d.session_id;
      ws.send(
        JSON.stringify({
          op: 1,
          d: null,
        })
      );
    } else {
      // 周期发送心跳
      if (heartbeatIntervalTimer !== null) {
        clearInterval(heartbeatIntervalTimer);
      }

      heartbeatIntervalTimer = setInterval(() => {
        ws.send(
          JSON.stringify({
            op: 1,
            d: seq,
          })
        );

        console.log("周期心跳", JSON.stringify({ op: 1, d: seq }));
      }, heartbeatInterval);
    }

    // 断线处理
    if (msg.op === 7 || msg.op === 9) {
      breakHandle();
    }

    // 处理群聊 @ 机器人消息
    if (msg.t === "GROUP_AT_MESSAGE_CREATE") {
      userMsgHandler(msg);
    }
  });

  // 断线处理
  ws.on("close", breakHandle);
  ws.on("error", (err) => {
    console.error("连接发生错误:", err);
  });
};

const breakHandle = () => {
  console.log("与服务器的连接已关闭");
  isBreak = true;
  clearInterval(heartbeatIntervalTimer); // 清除心跳定时器
  ws.removeAllListeners(); // 移除所有监听器
  createWebSocket(wsUrl); // 重连
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

const reconnection = () => {
  const data = {
    op: 6,
    d: {
      token: `QQBot ${getAccessToken()}`,
      session_id: sessionId,
      seq,
    },
  };
  console.log("ws重连:", data);
  ws.send(JSON.stringify(data));
};

const userMsgHandler = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const formatContent = content.trim();

  if (formatContent === "/随机图片") {
    sendRandomImageOrder(msg);
  } else if (formatContent === "/随机meme") {
    sendRandomMeme(msg);
  } else if (formatContent === "/日报") {
    sendDailyNews(msg);
  } else {
    sendXunFeiAi(msg);
  }
};

// 发送文本消息
const sendGroupMsgAsync = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const data = {
    content: `已收到消息喵: ${content}`,
    msg_type: 0,
    msg_id: id,
  };
  await sendGroupMsg(group_openid, data);
};

// 发送媒体消息
const sendGroupFilesMsgAsync = async (msg) => {
  const { group_openid, id } = msg.d;
  const data = {
    file_type: 1,
    url: "https://img.picui.cn/free/2024/11/01/6723b759a5c0b.jpg",
    srv_send_msg: false,
  };
  const res = await sendGroupFilesMsg(group_openid, data);
  const { file_info } = res;

  const _data = {
    content: "发送图片喵",
    msg_type: 7,
    media: { file_info },
    msg_id: id,
  };
  await sendGroupMsg(group_openid, _data);
};

// 随机图片指令处理
const sendRandomImageOrder = async (msg) => {
  try {
    // 获取随机图片链接
    let imgUrl = "https://img.picui.cn/free/2024/11/01/6723b759a5c0b.jpg"; // 默认
    let imgData = await getRandomImg();
    if (imgData && imgData.imgurl) {
      imgUrl = imgData.imgurl;
    }

    const { group_openid, id } = msg.d;
    const data = {
      file_type: 1,
      url: imgUrl,
      srv_send_msg: false,
    };
    const res = await sendGroupFilesMsg(group_openid, data);
    const { file_info } = res;

    const _data = {
      content: "发送图片喵",
      msg_type: 7,
      media: { file_info },
      msg_id: id,
    };
    await sendGroupMsg(group_openid, _data);
  } catch (error) {
    console.error(error);
  }
};

// 讯飞AI指令处理
const sendXunFeiAi = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const formatContent = content.trim();

  const aiMsgData = {
    model: "4.0Ultra",
    messages: [
      {
        role: "system",
        content: aiOrder,
      },
      { role: "user", content: formatContent },
    ],
    stream: false,
  };

  try {
    let aiResText = "";
    const aiRes = await getAiText(aiMsgData);
    if (aiRes.message === "Success") {
      aiResText = aiRes.choices[0].message.content;
    } else {
      aiResText = "AI发生错误喵";
    }

    const _data = {
      content: aiResText,
      msg_type: 0,
      msg_id: id,
    };
    await sendGroupMsg(group_openid, _data);
  } catch (error) {
    console.error(error);
  }
};

// 随机meme图
const sendRandomMeme = async (msg) => {
  try {
    const memeData = await getMeme();
    const memeUrl = memeData.data[0].url;

    const { group_openid, id } = msg.d;
    const data = {
      file_type: 1,
      url: memeUrl,
      srv_send_msg: false,
    };
    const res = await sendGroupFilesMsg(group_openid, data);
    const { file_info } = res;

    const _data = {
      content: "meme来了喵",
      msg_type: 7,
      media: { file_info },
      msg_id: id,
    };
    await sendGroupMsg(group_openid, _data);
  } catch (error) {
    console.error(error);
  }
};

// 每日早报
// getDailyNews
const sendDailyNews = async (msg) => {
  try {
    // const news = await getDailyNews();

    const { group_openid, id } = msg.d;
    const data = {
      file_type: 1,
      url: 'https://api.03c3.cn/api/zb',
      srv_send_msg: false,
    };
    const res = await sendGroupFilesMsg(group_openid, data);
    const { file_info } = res;

    const _data = {
      content: "日报来了喵",
      msg_type: 7,
      media: { file_info },
      msg_id: id,
    };
    await sendGroupMsg(group_openid, _data);
  } catch (error) {
    console.error(error);
  }
};
