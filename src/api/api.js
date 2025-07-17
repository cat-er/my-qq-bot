import OpenAI from "openai";
import request from "./request.js";
import { aiOrder } from "../utils.js";

const baseUrl = process.env.APP_BASE_URL;

// 获取token凭证
export const getToken = (data) => {
  return request.post("https://bots.qq.com/app/getAppAccessToken", data);
};

// 获取ws链接 gateway
export const getWsUrl = () => {
  return request.get(`${baseUrl}/gateway`);
};

// 发送消息到群
export const sendGroupMsg = (group_openid, data) => {
  return request.post(`${baseUrl}/v2/groups/${group_openid}/messages`, data);
};

//发送富文本消息到群
export const sendGroupFilesMsg = (group_openid, data) => {
  return request.post(`${baseUrl}/v2/groups/${group_openid}/files`, data);
};

// 获取随机图片
export const getRandomImg = () => {
  return request.get(`https://www.dmoe.cc/random.php?return=json`);
};

// 请求讯飞ai接口
export const getAiText = (data) => {
  return request.post(
    `https://spark-api-open.xf-yun.com/v1/chat/completions`,
    data,
    { reqType: "xunfei" }
  );
};

// 获取随机meme图 单IP一天50条
export const getMeme = () => {
  return request.get(`https://tea.qingnian8.com/api/geng/random?pageSize=1`);
};

// 每日早报
export const getDailyNews = () => {
  return `https://v2.alapi.cn/api/zaobao?token=StsX9KG6uc8AKi9M&format=image`;
};

// deepseek ai
export const getDeepseekAi = async (userContent) => {
  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  return await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: aiOrder,
      },
      { role: "user", content: userContent },
    ],
    model: "deepseek-chat",
  });
};
