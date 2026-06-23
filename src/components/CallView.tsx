import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Video as VideoIcon, Mic, MicOff, VideoOff, Volume2, VolumeX, RefreshCw, SwitchCamera, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { startRingtone, stopRingtone } from "@/lib/ringtone";

type Mode = "audio" | "video";
type Role = "caller" | "callee";

const ICE = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function CallView({
  chatId,
  me,
  peerName,
  mode,
  role,
  offerSdp,
  callEventId,
  onClose,
}: {
  chatId: string;
  me: string;
  peerName: string;
  mode: Mode;
  role: Role;
  offerSdp?: RTCSessionDescriptionInit | null;
  callEventId?: string;
  onClose: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"connecting" | "ringing" | "in-call" | "ended">(
    role === "caller" ? "ringing" : "connecting",
  );
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const startedAtRef = useRef<number>(0);
  const answeredRef = useRef<boolean>(false);
  const pendingRemoteIceRef = useRef<RTCIceCandidateInit[]>([]);
  const localIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callEventIdsRef = useRef<string[]>(callEventId ? [callEventId] : []);
  const seenRemoteIceRef = useRef<Set<string>>(new Set());
  const seenAnswerRef = useRef("");
  const persistedLocalIceRef = useRef<Set<string>>(new Set());
  const retryMediaRef = useRef<(() => Promise<void>) | null>(null);
  const switchCamRef = useRef<(() => Promise<void>) | null>(null);

  function persistLocalIce(candidate: RTCIceCandidateInit) {
    const ids = callEventIdsRef.current;
    if (!ids.length) return;
    const key = `${candidate.candidate || ""}|${candidate.sdpMid || ""}|${candidate.sdpMLineIndex ?? ""}`;
    if (persistedLocalIceRef.current.has(key)) return;
    persistedLocalIceRef.current.add(key);
    const side = role === "caller" ? "caller" : "recipient";
    for (const eventId of ids) {
      void (supabase as any).rpc("append_call_ice", {
        _event_id: eventId,
        _candidate: candidate,
        _side: side,
      });
    }
  }

  useEffect(() => {
    let ended = false;
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;

    // SHARED signaling channel per chat — name is distinct from the
    // notification channels opened in _authenticated.tsx to avoid the
    // "channel reused by name" trap (which silently drops .on() handlers
    // added after subscribe()). Public broadcast (no auth dance) for speed.
    const channel = supabase.channel(`call-signal-${chatId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    channelRef.current = channel;

    const remoteStream = new MediaStream();
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;

    let mediaReady = false;
    let queuedOffer: RTCSessionDescriptionInit | null = null;
    let answeredOffer = false;
    let lastAnswer: RTCSessionDescriptionInit | null = null;
    let pollTimer: number | null = null;

    const iceKey = (candidate: RTCIceCandidateInit) =>
      `${candidate.candidate || ""}|${candidate.sdpMid || ""}|${candidate.sdpMLineIndex ?? ""}`;

    const flushRemoteIce = async () => {
      if (!pc.remoteDescription) return;
      const queued = pendingRemoteIceRef.current.splice(0);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.warn("[call] queued ice add failed", e);
        }
      }
    };

    const addRemoteIce = async (candidate: RTCIceCandidateInit | null | undefined) => {
      if (!candidate) return;
      if (!pc.remoteDescription) {
        pendingRemoteIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn("[call] ice add failed", e);
      }
    };

    const addRemoteIceOnce = async (candidate: RTCIceCandidateInit | null | undefined) => {
      if (!candidate) return;
      const key = iceKey(candidate);
      if (seenRemoteIceRef.current.has(key)) return;
      seenRemoteIceRef.current.add(key);
      await addRemoteIce(candidate);
    };

    const waitForIceGathering = (timeoutMs = 3500) =>
      new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
          return;
        }
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          pc.removeEventListener("icegatheringstatechange", onStateChange);
          window.clearTimeout(timer);
          resolve();
        };
        const onStateChange = () => {
          if (pc.iceGatheringState === "complete") finish();
        };
        const timer = window.setTimeout(finish, timeoutMs);
        pc.addEventListener("icegatheringstatechange", onStateChange);
      });

    const applyAnswer = async (sdp: RTCSessionDescriptionInit | null | undefined) => {
      if (role !== "caller" || !sdp) return;
      const key = `${sdp.type}:${sdp.sdp || ""}`;
      if (seenAnswerRef.current === key) return;
      if (!pc.remoteDescription && pc.signalingState !== "have-local-offer") return;
      seenAnswerRef.current = key;
      answeredRef.current = true;
      try {
        if (!pc.remoteDescription) await pc.setRemoteDescription(sdp);
        await flushRemoteIce();
      } catch (e) {
        seenAnswerRef.current = "";
        console.warn("[call] setRemoteDescription failed", e);
        return;
      }
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      stopRingtone();
      setStatus("connecting");
    };

    const handleCallEventRow = async (row: any) => {
      if (!row || row.chat_id !== chatId) return;
      if (role === "callee" && callEventId && row.id !== callEventId) return;
      if (role === "caller" && row.caller_id !== me) return;

      if (role === "caller" && row.answer) await applyAnswer(row.answer);

      const remoteIce = role === "caller" ? row.recipient_ice : row.caller_ice;
      if (Array.isArray(remoteIce)) {
        for (const candidate of remoteIce) await addRemoteIceOnce(candidate);
      }
    };

    const pollCallEvents = async () => {
      const ids = callEventIdsRef.current;
      if (!ids.length) return;
      try {
        const { data } = await (supabase as any)
          .from("call_events")
          .select("id,chat_id,caller_id,recipient_id,status,answer,caller_ice,recipient_ice")
          .in("id", ids);
        for (const row of data ?? []) await handleCallEventRow(row);
      } catch (e) {
        console.warn("[call] poll failed", e);
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(() => void pollCallEvents(), 1200);
      void pollCallEvents();
    };

    const sendOfferSnapshot = () => {
      const offer = pc.localDescription;
      if (!offer || offer.type !== "offer") return;
      channel.send({
        type: "broadcast",
        event: "offer",
        payload: { from: me, mode, sdp: { type: offer.type, sdp: offer.sdp } },
      });
      for (const candidate of localIceRef.current) {
        channel.send({ type: "broadcast", event: "ice", payload: { from: me, candidate } });
      }
    };

    const handleOffer = async (sdp: RTCSessionDescriptionInit) => {
      if (role !== "callee") return;
      if (answeredOffer) {
        if (lastAnswer) {
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { from: me, sdp: lastAnswer },
          });
        }
        return;
      }
      if (!mediaReady) {
        queuedOffer = sdp;
        return;
      }
      try {
        if (pc.signalingState !== "stable") return;
        answeredOffer = true;
        await pc.setRemoteDescription(sdp);
        await flushRemoteIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGathering();
        const localAnswer = pc.localDescription ?? answer;
        lastAnswer = { type: localAnswer.type, sdp: localAnswer.sdp };
        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { from: me, sdp: lastAnswer },
        });
        answeredRef.current = true;
        setStatus("connecting");
        if (callEventId) {
          void (supabase as any)
            .from("call_events")
            .update({ status: "accepted", answer: lastAnswer })
            .eq("id", callEventId);
          for (const candidate of localIceRef.current) persistLocalIce(candidate);
        }
      } catch (e) {
        answeredOffer = false;
        console.warn("[call] offer handle failed", e);
      }
    };

    // Register all broadcast listeners BEFORE subscribe() — required by Supabase realtime
    channel
      .on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        // Callee can also receive offer via this channel as a fallback.
        if (payload.from === me || role !== "callee") return;
        await handleOffer(payload.sdp);
      })
      .on("broadcast", { event: "ice" }, async ({ payload }: any) => {
        if (payload.from === me) return;
        await addRemoteIceOnce(payload.candidate);
      })
      .on("broadcast", { event: "answer" }, async ({ payload }: any) => {
        if (payload.from === me || role !== "caller") return;
        await applyAnswer(payload.sdp);
      })
      .on("broadcast", { event: "ready" }, ({ payload }: any) => {
        if (payload.from === me || role !== "caller") return;
        sendOfferSnapshot();
      })
      .on("broadcast", { event: "hangup" }, ({ payload }: any) => {
        if (payload.from === me) return;
        hangup(false);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_events",
          filter: role === "caller" ? `caller_id=eq.${me}` : `recipient_id=eq.${me}`,
        },
        async ({ new: row }: any) => {
          await handleCallEventRow(row);
        },
      );

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const candidate = e.candidate.toJSON();
        localIceRef.current.push(candidate);
        channel.send({ type: "broadcast", event: "ice", payload: { from: me, candidate } });
        persistLocalIce(candidate);
      }
    };
    pc.onicegatheringstatechange = () => {
      if (role === "caller" && pc.iceGatheringState === "complete") sendOfferSnapshot();
    };
    pc.ontrack = (e) => {
      // Add tracks defensively — same track can fire ontrack multiple times
      // and addTrack() throws on duplicates, which would freeze the remote view.
      const incoming = e.streams[0]?.getTracks() ?? [e.track];
      for (const t of incoming) {
        if (!t) continue;
        if (!remoteStream.getTracks().some((x) => x.id === t.id)) {
          try {
            remoteStream.addTrack(t);
          } catch (err) {
            console.warn("[call] remote addTrack failed", err);
          }
        }
      }
      if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
        remoteRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        remoteAudioRef.current.play().catch(() => {});
      }
      // Some WebViews / iOS Safari need an explicit play() after srcObject is set.
      remoteRef.current?.play?.().catch(() => {});
      answeredRef.current = true;
      setStatus("in-call");
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      stopRingtone();
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        answeredRef.current = true;
        setStatus("in-call");
        if (!startedAtRef.current) startedAtRef.current = Date.now();
        stopRingtone();
      } else if (st === "failed" || st === "closed") {
        if (!ended) hangup(false);
      }
    };
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === "connected" || st === "completed") {
        answeredRef.current = true;
        setStatus("in-call");
        if (!startedAtRef.current) startedAtRef.current = Date.now();
        stopRingtone();
      } else if (st === "failed" || st === "closed") {
        if (!ended) hangup(false);
      }
    };

    if (role === "caller") startRingtone("outgoing");

    // Acquire media. If it fails (denied permission, iframe sandbox, no device),
    // fall back to a receive-only participant so the call still connects and the
    // user can hear/see the other side instead of seeing a hard error.
    // Add transceivers with NO track but direction sendrecv so the SDP
    // negotiates a bidirectional m-line. Later we can replaceTrack() on
    // these senders without needing a full renegotiation.
    const addPlaceholderTransceivers = () => {
      try {
        if (!pc.getTransceivers().some((t) => t.receiver.track?.kind === "audio")) {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        }
        if (mode === "video" && !pc.getTransceivers().some((t) => t.receiver.track?.kind === "video")) {
          pc.addTransceiver("video", { direction: "sendrecv" });
        }
      } catch (e) {
        console.warn("[call] placeholder transceivers failed", e);
      }
      mediaReady = true;
    };

    const acquireMedia = async (videoFacing: "user" | "environment" = facing) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: mode === "video" ? { facingMode: videoFacing } : false,
      });
      localStreamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      // Reuse existing sendrecv transceivers if present (fallback path), else addTrack.
      for (const track of stream.getTracks()) {
        const tx = pc
          .getTransceivers()
          .find((t) => t.sender.track == null && t.receiver.track?.kind === track.kind);
        if (tx) {
          try {
            await tx.sender.replaceTrack(track);
            tx.direction = "sendrecv";
          } catch {
            pc.addTrack(track, stream);
          }
        } else {
          pc.addTrack(track, stream);
        }
      }
      mediaReady = true;
      setMediaError(null);
    };

    retryMediaRef.current = async () => {
      try {
        setMediaError(null);
        await acquireMedia();
        // If we already negotiated, force a renegotiation so the other side
        // actually receives our newly-added audio/video (replaceTrack alone
        // doesn't change m-line direction once SDP is set in stone).
        if (role === "caller" && pc.signalingState === "stable") {
          try {
            const offer = await pc.createOffer({ iceRestart: false });
            await pc.setLocalDescription(offer);
            sendOfferSnapshot();
          } catch (e) {
            console.warn("[call] renegotiate after retry failed", e);
          }
        }
        toast.success("Microfone ativado");
      } catch (e: any) {
        const name = e?.name || "";
        const msg =
          name === "NotAllowedError" || name === "SecurityError"
            ? "Permissão negada. Você continua na chamada como ouvinte — toque no cadeado da barra de endereço para liberar microfone/câmera."
            : name === "NotFoundError"
              ? "Nenhum microfone/câmera encontrado. Você continua na chamada como ouvinte."
              : e?.message || "Falha ao acessar mídia.";
        setMediaError(msg);
      }
    };

    switchCamRef.current = async () => {
      if (mode !== "video") return;
      const next = facing === "user" ? "environment" : "user";
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: next },
        });
        const newTrack = newStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && newTrack) await sender.replaceTrack(newTrack);
        const old = localStreamRef.current;
        if (old) {
          old.getVideoTracks().forEach((t) => {
            old.removeTrack(t);
            t.stop();
          });
          old.addTrack(newTrack);
          if (localRef.current) localRef.current.srcObject = old;
        }
        setFacing(next);
      } catch (e) {
        console.warn("[call] switch cam failed", e);
        toast.error("Não foi possível trocar a câmera");
      }
    };

    (async () => {
      try {
        const subscribePromise = new Promise<void>((resolve, reject) => {
          channel.subscribe((s) => {
            if (s === "SUBSCRIBED") resolve();
            else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED")
              reject(new Error(s));
          });
        });

        try {
          await acquireMedia();
        } catch (e: any) {
          const name = e?.name || "";
          const msg =
            name === "NotAllowedError" || name === "SecurityError"
              ? "Permissão de microfone/câmera negada — você está na chamada como ouvinte. Toque em \"Ativar microfone\" depois de liberar nas configurações do navegador."
              : name === "NotFoundError"
                ? "Nenhum microfone/câmera detectado — você está na chamada como ouvinte."
                : (e?.message || "Falha ao acessar mídia.") + " Você continua na chamada como ouvinte.";
          setMediaError(msg);
          console.error("[call] media error — proceeding recvonly", e);
          addPlaceholderTransceivers();
        }
        if (ended) return;

        await subscribePromise;
        if (ended) return;
        startPolling();

        if (role === "caller") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceGathering();
          sendOfferSnapshot();
          setTimeout(sendOfferSnapshot, 700);
          setTimeout(sendOfferSnapshot, 1800);
          const localOffer = pc.localDescription ?? offer;
          void createCallEvents({ type: localOffer.type, sdp: localOffer.sdp });
        } else {
          if (callEventId) {
            const { data: row } = await (supabase as any)
              .from("call_events")
              .select("id,chat_id,caller_id,recipient_id,status,answer,caller_ice,recipient_ice")
              .eq("id", callEventId)
              .maybeSingle();
            if (row) await handleCallEventRow(row);
          }
          channel.send({ type: "broadcast", event: "ready", payload: { from: me } });
          if (offerSdp || queuedOffer) await handleOffer(queuedOffer ?? offerSdp!);
        }
      } catch (e: any) {
        console.error("[call] setup error", e);
        setMediaError(e?.message || "Erro ao iniciar chamada");
      }
    })();

    return () => {
      ended = true;
      stopRingtone();
      try {
        pc.close();
      } catch {}
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (pollTimer) window.clearInterval(pollTimer);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "in-call") return;
    const i = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      500,
    );
    return () => window.clearInterval(i);
  }, [status]);

  // Prevent accidental page refresh/close while in an active call —
  // WebRTC peer connections cannot survive a full page reload, so we
  // warn the user before they lose the call.
  useEffect(() => {
    if (status === "ended") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Você está em uma chamada. Sair vai encerrar a ligação.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  const loggedRef = useRef(false);
  async function logCall(outcome: "missed" | "completed") {
    if (role !== "caller" || loggedRef.current) return;
    loggedRef.current = true;
    const duration_ms = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    const payload = { mode, outcome, duration_ms };
    try {
      await supabase.from("chat_messages").insert({
        chat_id: chatId,
        sender_id: me,
        content: JSON.stringify(payload),
        message_type: "call",
        duration_ms,
      });
    } catch {}
  }

  async function createCallEvents(offer: RTCSessionDescriptionInit) {
    try {
      const { data: members, error: memErr } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId);
      if (memErr) {
        console.error("[call] members fetch failed", memErr);
        toast.error("Não foi possível buscar participantes");
        return;
      }
      const others = (members ?? [])
        .map((m: any) => m.user_id as string)
        .filter((uid) => uid && uid !== me);
      if (!others.length) {
        toast.error("Nenhum outro participante neste chat");
        return;
      }

      const rows = others.map((uid) => ({
        chat_id: chatId,
        caller_id: me,
        recipient_id: uid,
        mode,
        offer,
      }));
      const { data: inserted, error: insErr } = await (supabase as any)
        .from("call_events")
        .insert(rows)
        .select("id,recipient_id");
      if (insErr) {
        console.error("[call] event insert failed", insErr);
        toast.error("Não foi possível notificar o destinatário");
        return;
      }

      callEventIdsRef.current = Array.from(
        new Set([
          ...callEventIdsRef.current,
          ...((inserted ?? []) as Array<{ id: string }>).map((row) => row.id),
        ]),
      );
      for (const candidate of localIceRef.current) persistLocalIce(candidate);

      // Fire a direct broadcast on a per-recipient public ringer channel so the
      // callee gets the incoming-call prompt instantly without depending on
      // realtime postgres_changes RLS for call_events.
      let peerName = "";
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,username")
          .eq("id", me)
          .maybeSingle();
        peerName = (prof as any)?.full_name || (prof as any)?.username || "";
      } catch {}

      for (const row of (inserted ?? []) as Array<{ id: string; recipient_id: string }>) {
        try {
          const notif = supabase.channel(`ringer-${row.recipient_id}`);
          await new Promise<void>((resolve) => {
            const t = setTimeout(() => resolve(), 1200);
            notif.subscribe((s) => {
              if (s === "SUBSCRIBED") {
                clearTimeout(t);
                resolve();
              }
            });
          });
          await notif.send({
            type: "broadcast",
            event: "ring",
            payload: { eventId: row.id, chatId, from: me, mode, offer, peerName },
          });
          setTimeout(() => {
            try {
              supabase.removeChannel(notif);
            } catch {}
          }, 1000);
        } catch (e) {
          console.warn("[call] ring broadcast failed", e);
        }
      }
      console.log("[call] ringing", others.length, "recipient(s)");
    } catch (e: any) {
      console.error("[call] createCallEvents error", e);
      toast.error("Erro ao iniciar chamada");
    }
  }

  function hangup(notify = true) {
    if (notify) {
      channelRef.current?.send({ type: "broadcast", event: "hangup", payload: { from: me } });
      // Also notify the global per-chat channel listened to by _authenticated.tsx
      try {
        const notifyCh = supabase.channel(`call-notify-${chatId}`, {
          config: { broadcast: { self: false } },
        });
        notifyCh.subscribe((s) => {
          if (s === "SUBSCRIBED") {
            notifyCh.send({ type: "broadcast", event: "hangup", payload: { from: me } });
            setTimeout(() => {
              try {
                supabase.removeChannel(notifyCh);
              } catch {}
            }, 500);
          }
        });
      } catch {}
    }
    if (callEventId)
      void (supabase as any).from("call_events").update({ status: "ended" }).eq("id", callEventId);
    try {
      pcRef.current?.close();
    } catch {}
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus("ended");
    void logCall(answeredRef.current ? "completed" : "missed");
    onClose();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }
  function toggleCam() {
    const next = !camOff;
    setCamOff(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  }

  const toggleSpeaker = useCallback(async () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    const el = remoteAudioRef.current as any;
    if (el && typeof el.setSinkId === "function") {
      try {
        // Best-effort: switch to the default device; on mobile WebViews this is a no-op.
        await el.setSinkId(next ? "default" : "");
      } catch (e) {
        console.warn("[call] setSinkId failed", e);
      }
    }
    if (remoteAudioRef.current) remoteAudioRef.current.volume = next ? 1 : 0.35;
  }, [speakerOn]);

  const mm = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-2.5 shadow-xl active:scale-95 transition"
        aria-label="Voltar para a chamada"
      >
        {mode === "video" ? <VideoIcon className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
        <span className="text-sm font-semibold">
          {status === "in-call" ? `${mm}:${ss}` : status === "ringing" ? "Chamando…" : "Conectando…"}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      {/* Always-rendered hidden remote audio sink (used in both audio and video modes) */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="absolute inset-0">
        {mode === "video" ? (
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-b from-zinc-800 to-black">
            <div className="text-center space-y-3">
              <div className="h-32 w-32 mx-auto rounded-full bg-gradient-brand grid place-items-center text-5xl font-semibold">
                {(peerName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="text-xl font-semibold">{peerName}</div>
              <div className="text-sm text-white/70">
                {status === "ringing" && "Chamando…"}
                {status === "connecting" && "Conectando…"}
                {status === "in-call" && `${mm}:${ss}`}
              </div>
            </div>
          </div>
        )}
        {mode === "video" && (
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
            className="absolute top-4 right-4 w-28 h-40 object-cover rounded-xl border border-white/20 shadow-lg bg-black"
          />
        )}
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="h-9 w-9 rounded-full bg-black/40 grid place-items-center"
          aria-label="Minimizar"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
        {mode === "video" && (
          <div className="px-3 py-1.5 rounded-full bg-black/40 text-sm">
            {status === "ringing"
              ? "Chamando…"
              : status === "connecting"
                ? "Conectando…"
                : `${mm}:${ss}`}
          </div>
        )}
      </div>

      {mediaError && (
        <div className="absolute inset-x-4 top-16 z-20 rounded-2xl bg-amber-500/95 text-black p-4 shadow-xl space-y-3">
          <div className="font-semibold text-sm">Modo ouvinte</div>
          <div className="text-xs opacity-90 leading-relaxed">{mediaError}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => retryMediaRef.current?.()}
              className="flex-1 h-9 rounded-full bg-black/15 hover:bg-black/25 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Ativar microfone
            </button>
            <button
              type="button"
              onClick={() => setMediaError(null)}
              className="flex-1 h-9 rounded-full bg-black/30 text-white text-sm font-semibold"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      <div
        className="mt-auto pb-10 pt-6 flex items-center justify-center gap-3 relative z-10 flex-wrap px-4"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={toggleMute}
          className={`h-14 w-14 rounded-full grid place-items-center ${muted ? "bg-white text-black" : "bg-white/15"}`}
          aria-label="Mudo"
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <button
          onClick={toggleSpeaker}
          className={`h-14 w-14 rounded-full grid place-items-center ${speakerOn ? "bg-white/15" : "bg-white text-black"}`}
          aria-label="Alto-falante"
        >
          {speakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </button>
        <button
          onClick={() => hangup(true)}
          className="h-16 w-16 rounded-full bg-destructive grid place-items-center"
          aria-label="Desligar"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
        {mode === "video" ? (
          <>
            <button
              onClick={toggleCam}
              className={`h-14 w-14 rounded-full grid place-items-center ${camOff ? "bg-white text-black" : "bg-white/15"}`}
              aria-label="Câmera"
            >
              {camOff ? <VideoOff className="h-6 w-6" /> : <VideoIcon className="h-6 w-6" />}
            </button>
            <button
              onClick={() => switchCamRef.current?.()}
              className="h-14 w-14 rounded-full grid place-items-center bg-white/15"
              aria-label="Trocar câmera"
            >
              <SwitchCamera className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function IncomingCallPrompt({
  peerName,
  mode,
  onAccept,
  onReject,
}: {
  peerName: string;
  mode: Mode;
  onAccept: () => void;
  onReject: () => void;
}) {
  useEffect(() => {
    startRingtone("incoming");
    return () => stopRingtone();
  }, []);
  return (
    <div className="fixed inset-x-3 top-3 z-50 rounded-2xl bg-card border shadow-xl p-3 flex items-center gap-3 animate-in slide-in-from-top">
      <div className="h-11 w-11 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold">
        {(peerName || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{peerName}</div>
        <div className="text-xs text-muted-foreground">
          {mode === "video" ? "Chamada de vídeo…" : "Chamada de voz…"}
        </div>
      </div>
      <button
        onClick={onReject}
        className="h-10 w-10 rounded-full bg-destructive text-white grid place-items-center"
        aria-label="Rejeitar"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
      <button
        onClick={onAccept}
        className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center"
        aria-label="Atender"
      >
        {mode === "video" ? <VideoIcon className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
      </button>
    </div>
  );
}
