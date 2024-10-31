import axios from "axios";

const appId = process.env.QQ_BOT_APP_ID;

const token = process.env.QQ_BOT_TOKEN;

const instance = axios.create({
  timeout: 30000,
  withCredentials: true,
  headers: {
    Authorization: `Bot ${appId}.${token}`,
  },
});

instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(new Error(error));
  }
);

instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    console.log(res);
  },
  (error) => {
    console.log("error", error);

    return Promise.reject(error);
  }
);

export default instance;
