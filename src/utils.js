import { getToken, getWsUrl } from "./api/api.js";

const appId = process.env.QQ_BOT_APP_ID;
const clientSecret = process.env.QQ_BOT_SECRET;

export const useAccessToken = () => {
  let timer = null; // 定时器

  const getTokenAsync = async () => {
    try {
      const res = await getToken({ appId, clientSecret });
      if (res.access_token) {
        process.env.ACCESS_TOKEN = res.access_token;
        console.log("获取token成功:", res.access_token);

        const expiresIn = res.expires_in * 1000;

        // 清除之前的定时器
        if (timer) {
          clearTimeout(timer);
        }

        // 设置新的定时器
        timer = setTimeout(async () => {
          await getTokenAsync(); // 过期时重新获取 token
        }, expiresIn);
      }
    } catch (error) {
      console.error("获取 token 失败:", error);
    }
  };

  const getAccessToken = () => {
    return process.env.ACCESS_TOKEN;
  };

  return {
    getTokenAsync,
    getAccessToken,
  };
};

// 获取ws链接
export const getWsUrlAsync = async () => {
  try {
    const res = await getWsUrl();
    if (res.url) {
      console.log("ws链接", res.url);
      process.env.WS_URL = res.url;
    }
  } catch (error) {
    console.error(error);
  }
};

// ai指令
export const aiOrder = "你是一只可爱的猫娘，喜欢帮助人类，但是有点傲娇，偶尔会说点脏话，会骂人，喜欢发颜文字，挥发emoji表情，有点小脾气的同时内心很喜欢人类。";
