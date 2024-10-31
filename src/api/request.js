import interceptor from "./interceptor.js";

export default {
  get(url, config) {
    return interceptor.get(url, config);
  },

  post(url, data, config) {
    return interceptor.post(url, data, config);
  },

  put(url, data, config) {
    return interceptor.put(url, data, config);
  },

  delete(url, config) {
    return interceptor.delete(url, config);
  },
};
