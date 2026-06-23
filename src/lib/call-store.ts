// Lightweight global store for incoming-call ringing across the app.
// Lets any page (or the auth layout) receive call offers even when the
// user is not currently viewing the corresponding chat thread.

export type IncomingCall = {
  eventId?: string;
  chatId: string;
  from: string;
  mode: "audio" | "video";
  offer: RTCSessionDescriptionInit;
  peerName: string;
  receivedAt: number;
};

type Listener = (state: IncomingCall | null) => void;

let current: IncomingCall | null = null;
const listeners = new Set<Listener>();
// Pending offers per chat, consumed by the chat thread when it mounts.
const pendingByChat = new Map<string, IncomingCall>();

export const callStore = {
  get(): IncomingCall | null {
    return current;
  },
  set(c: IncomingCall | null) {
    current = c;
    listeners.forEach((l) => l(current));
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  setPending(chatId: string, c: IncomingCall) {
    pendingByChat.set(chatId, c);
  },
  consumePending(chatId: string): IncomingCall | null {
    const v = pendingByChat.get(chatId) ?? null;
    if (v) pendingByChat.delete(chatId);
    return v;
  },
  clearPending(chatId: string) {
    pendingByChat.delete(chatId);
  },
};
