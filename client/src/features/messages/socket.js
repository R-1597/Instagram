
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

let socket;

export function connectSocket() {
  const token = sessionStorage.getItem("accessToken");

  if (!token) {
    throw new Error("You must be logged in to connect to messaging.");
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.connect();

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
    