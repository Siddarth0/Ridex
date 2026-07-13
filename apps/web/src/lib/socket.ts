import { io, type Socket } from "socket.io-client";
import axios from "axios";

// REST goes through the Next.js /api rewrite (first-party cookies), but
// WebSockets can't be proxied by Vercel — the socket connects straight to the
// API origin and authenticates with a short-lived access token in the
// handshake. The token comes from /api/auth/refresh (cookie-authenticated)
// and lives only in memory.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let socket: Socket | null = null;

async function fetchAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post("/api/auth/refresh", null, { withCredentials: true });
    return res.data?.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

/** Connect (or return) the singleton authenticated socket. */
export async function getSocket(): Promise<Socket> {
  if (socket) return socket;

  const token = await fetchAccessToken();
  socket = io(API_ORIGIN, {
    withCredentials: true,
    auth: { token },
    reconnectionDelayMax: 10_000,
  });

  // Access tokens expire in 15 min — refresh before each reconnect attempt
  socket.io.on("reconnect_attempt", () => {
    void fetchAccessToken().then((fresh) => {
      if (socket && fresh) (socket.auth as Record<string, unknown>).token = fresh;
    });
  });
  socket.on("connect_error", (err) => {
    if (/token|auth/i.test(err.message)) {
      void fetchAccessToken().then((fresh) => {
        if (socket && fresh) {
          (socket.auth as Record<string, unknown>).token = fresh;
          socket.connect();
        }
      });
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
