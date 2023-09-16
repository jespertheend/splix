import { PersistentWebSocket } from "../../shared/PersistentWebSocket.js";

const url = new URL(location.href);
url.pathname = "/servermanager/";
url.protocol = "ws:";
const socket = new PersistentWebSocket(url.href);
