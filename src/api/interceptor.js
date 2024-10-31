import axios from "axios";
import { useAccessToken } from "../utils.js";

const instance = axios.create({
  timeout: 30000,
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const { getAccessToken } = useAccessToken();
    console.log("请求token:", getAccessToken());

    config.headers["Authorization"] = `QQBot ${getAccessToken()}`;
    return config;
  },
  (error) => {
    return Promise.reject(new Error(error));
  }
);

instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    return res;
  },
  (error) => {
    console.log("error", error);

    return Promise.reject(error);
  }
);

export default instance;