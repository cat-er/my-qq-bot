import "dotenv/config";

import { useAccessToken, getWsUrlAsync } from "./utils.js";
import { createWebSocket } from "./websocket.js";

const { getTokenAsync } = useAccessToken();

const init = async () => {
  await getTokenAsync();
  await getWsUrlAsync();
  createWebSocket(process.env.WS_URL);
};
init();
