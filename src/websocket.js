import WebSocket from "ws";
import { useAccessToken, aiOrder } from "./utils.js";
import {
  sendGroupMsg,
  sendGroupFilesMsg,
  getRandomImg,
  getAiText,
  getMeme,
  getDailyNews,
  getDeepseekAi,
} from "./api/api.js";

const { getAccessToken } = useAccessToken();


let ws;
let wsUrl;
let heartbeatInterval = 0; // 心跳周期
let heartbeatIntervalTimer = null; // 周期心跳计时器
let seq; // 客户端消息序号
let sessionId; // 恢复链接时的session_id参数
let isBreak = false; // 是否断线

// 公共心跳发送逻辑
const sendHeartbeat = (seqVal = null) => {
  ws.send(
    JSON.stringify({
      op: 1,
      d: seqVal,
    })
  );
  console.log("周期心跳", JSON.stringify({ op: 1, d: seqVal }));
};

// 公共发送群消息逻辑
const sendGroupMsgWrapper = async (group_openid, data) => {
  try {
    await sendGroupMsg(group_openid, data);
  } catch (error) {
    console.error("发送群消息失败:", error);
  }
};

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

    // 处理握手/重连
    if (msg.op === 10) {
      if (!isBreak) {
        heartbeatInterval = msg.d.heartbeat_interval;
        login();
      } else {
        reconnection();
        isBreak = false;
      }
    }

    if (msg.s) seq = msg.s;

    // 首次接入 立即发送心跳
    if (msg.t === "READY") {
      sessionId = msg.d.session_id;
      sendHeartbeat();
    } else {
      // 周期发送心跳
      if (heartbeatIntervalTimer !== null) clearInterval(heartbeatIntervalTimer);
      heartbeatIntervalTimer = setInterval(() => sendHeartbeat(seq), heartbeatInterval);
    }

    // 断线处理
    if (msg.op === 7 || msg.op === 9) breakHandle();

    // 处理群聊 @ 机器人消息
    if (msg.t === "GROUP_AT_MESSAGE_CREATE") userMsgHandler(msg);
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
  const { content } = msg.d;
  const formatContent = content.trim();
  const commandMap = {
    "/随机图片": sendRandomImageOrder,
    "/随机meme": sendRandomMeme,
    "/日报": sendDailyNews,
  };
  if (commandMap[formatContent]) {
    commandMap[formatContent](msg);
  } else {
    sendXunFeiAi(msg);
    // sendDeepSeekAi(msg);
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
  await sendGroupMsgWrapper(group_openid, data);
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
  await sendGroupMsgWrapper(group_openid, _data);
};


// 随机图片指令处理
const sendRandomImageOrder = async (msg) => {
  try {
    const defaultImgUrl = "https://img.picui.cn/free/2024/11/01/6723b759a5c0b.jpg";
    const imgData = await getRandomImg();
    const imgUrl = imgData?.imgurl || defaultImgUrl;
    await sendGroupImage(msg, imgUrl, "发送图片喵");
  } catch (error) {
    console.error("获取随机图片失败:", error);
    await sendErrorMsg(msg, "获取随机图片失败了喵~");
  }
};

// 发送错误消息到群
const sendErrorMsg = async (msg, errorMsg = "发生错误了喵~") => {
  const { group_openid, id } = msg.d;
  const data = {
    content: errorMsg,
    msg_type: 0,
    msg_id: id,
  };
  await sendGroupMsgWrapper(group_openid, data);
};

// 公共图片发送逻辑
const sendGroupImage = async (msg, url, content = "图片来了喵") => {
  const { group_openid, id } = msg.d;
  try {
    const data = {
      file_type: 1,
      url,
      srv_send_msg: false,
    };
    const res = await sendGroupFilesMsg(group_openid, data);
    const { file_info } = res;
    const _data = {
      content,
      msg_type: 7,
      media: { file_info },
      msg_id: id,
    };
    await sendGroupMsgWrapper(group_openid, _data);
  } catch (error) {
    console.error("发送图片失败:", error);
    await sendErrorMsg(msg, "图片发送失败了喵~");
  }
};


// 讯飞AI指令处理
const sendXunFeiAi = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const formatContent = content.trim();
  const aiMsgData = {
    model: "4.0Ultra",
    messages: [
      { role: "system", content: aiOrder },
      { role: "user", content: formatContent },
    ],
    stream: false,
  };
  try {
    const aiRes = await getAiText(aiMsgData);
    if (aiRes.message !== "Success") {
      throw new Error("AI响应异常");
    }
    const _data = {
      content: aiRes.choices[0].message.content,
      msg_type: 0,
      msg_id: id,
    };
    await sendGroupMsgWrapper(group_openid, _data);
  } catch (error) {
    console.error("AI处理失败:", error);
    await sendErrorMsg(msg, "AI思考太久了喵~");
  }
};


// deepseek ai指令处理
const sendDeepSeekAi = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const formatContent = content.trim();
  try {
    let aiResText = "";
    const aiRes = await getDeepseekAi(formatContent);
    console.log("ai响应：", aiRes);
    console.log("ai返回内容：", aiRes.choices[0].message);
    aiResText = aiRes.choices[0].message.content;
    const _data = {
      content: aiResText,
      msg_type: 0,
      msg_id: id,
    };
    await sendGroupMsgWrapper(group_openid, _data);
  } catch (error) {
    console.error(error);
  }
};


// 随机meme图
const sendRandomMeme = async (msg) => {
  try {
    const memeData = await getMeme();
    if (!memeData?.data?.[0]?.url) {
      throw new Error("获取meme图片失败");
    }
    await sendGroupImage(msg, memeData.data[0].url, "meme来了喵");
  } catch (error) {
    console.error("获取meme失败:", error);
    await sendErrorMsg(msg, "获取meme失败了喵~");
  }
};


// 每日早报
const sendDailyNews = async (msg) => {
  try {
    const news = getDailyNews();
    if (!news) {
      throw new Error("获取日报失败");
    }
    await sendGroupImage(msg, news, "日报来了喵");
  } catch (error) {
    console.error("获取日报失败:", error);
    await sendErrorMsg(msg, "获取日报失败了喵~");
  }
};
