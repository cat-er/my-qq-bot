import request from "./request.js";
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
