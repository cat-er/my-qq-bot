import WebSocket from "ws";
import { useAccessToken } from "./utils.js";
import {
  sendGroupMsg,
  sendGroupFilesMsg,
  getRandomImg,
  getAiText,
} from "./api/api.js";

const { getAccessToken } = useAccessToken();

let ws;

let wsUrl;

// 心跳周期
let heartbeatInterval = 0;

// 周期心跳计时器
let heartbeatIntervalTimer = null;

// 客户端消息s
let seq;

// 恢复链接时的session_id参数
let sessionId;

//是否断线
let isBreak = false;

export const createWebSocket = (url) => {
  // 创建一个 WebSocket 服务器
  ws = new WebSocket(url);
  wsUrl = url;

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

    const breakHandle = () => {
      console.log("与服务器的连接已关闭");
      isBreak = true;
      //断线时去掉本次侦听的message事件的侦听器
      ws.removeListener("message", () => {
        console.log(
          "客户端恢复连接或者客户端发送鉴权参数有错,去掉本次侦听的message事件的侦听器"
        );
      });
      if (heartbeatIntervalTimer !== null) {
        clearInterval(heartbeatIntervalTimer); // 如果已经存在定时器，先清除它
      }
      createWebSocket(wsUrl);
    };

    if (msg.op == 7 || msg.op == 9) {
      breakHandle();
    }

    //群聊@机器人时触发
    if (msg.t && msg.t === "GROUP_AT_MESSAGE_CREATE") {
      userMsgHandler(msg);
    }

    ws.on("close", () => {
      breakHandle();
    });

    ws.on("error", (err) => {
      console.error("连接发生错误:", err);
    });
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

  // 去除消息中的空格
  const formatContent = content.trim();
  // 处理指令
  // if (formatContent === "/随机图片") {
  //   sendRandomImageOrder(msg);
  // } else if (formatContent.includes("/ai")) {
  //   sendXunFeiAi(msg);
  // } else {
  //   sendUndefinedOrder(msg);
  // }
  if (formatContent === "/随机图片") {
    sendRandomImageOrder(msg);
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

// 指令相关
//随机图片
const sendRandomImageOrder = async (msg) => {
  try {
    // 获取随机图片链接
    let imgUrl = "https://img.picui.cn/free/2024/11/01/6723b759a5c0b.jpg"; //默认
    let imgData = await getRandomImg();
    if (imgData && imgData.imgurl) {
      imgUrl = imgData.imgurl;
    }

    // 传给qq获取file_info
    const { group_openid, id } = msg.d;
    const data = {
      file_type: 1,
      url: imgUrl,
      srv_send_msg: false,
    };
    const res = await sendGroupFilesMsg(group_openid, data);
    const { file_info } = res;

    // 发送图片
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

// 讯飞AI
const sendXunFeiAi = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const formatContent = content.trim();

  const aiMsgData = {
    model: "4.0Ultra",
    messages: [
      {
        role: "system",
        content: "你是一个猫娘，你说的每一句话结尾都要带上喵字",
      },
      {
        role: "user",
        content: formatContent,
      },
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

    // 返回ai结果
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

// 处理未定义的指令
const sendUndefinedOrder = async (msg) => {
  const { group_openid, content, id } = msg.d;
  const data = {
    content: `未定义的指令喵: ${content}`,
    msg_type: 0,
    msg_id: id,
  };
  await sendGroupMsg(group_openid, data);
};
