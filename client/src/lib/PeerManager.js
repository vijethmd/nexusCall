/**
 * PeerManager
 *
 * Manages a map of RTCPeerConnections — one per remote participant.
 * Uses a full-mesh topology (each peer connects directly to every other peer).
 * All signaling is relayed through Socket.IO.
 *
 * STUN server: stun:stun.l.google.com:19302
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

class PeerManager {
  constructor({ socket, localStream, onRemoteStream, onRemoteStreamRemoved }) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStream = onRemoteStream;         // (socketId, stream) => void
    this.onRemoteStreamRemoved = onRemoteStreamRemoved; // (socketId) => void
    this.peers = new Map(); // socketId -> RTCPeerConnection
  }

  // ── Create a new peer connection to a remote socket ──────────
  async createPeer(remoteSocketId, isInitiator) {
    if (this.peers.has(remoteSocketId)) {
      this.peers.get(remoteSocketId).close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(remoteSocketId, pc);

    // Add all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Forward ICE candidates to the remote peer via socket
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit("signal:ice-candidate", {
          to: remoteSocketId,
          candidate,
        });
      }
    };

    // When we receive remote media tracks
    pc.ontrack = ({ streams }) => {
      if (streams?.[0]) {
        this.onRemoteStream(remoteSocketId, streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] ${remoteSocketId} → ${state}`);
      if (state === "failed" || state === "disconnected" || state === "closed") {
        this.removePeer(remoteSocketId);
      }
    };

    // The initiator creates and sends the offer
    if (isInitiator) {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      this.socket.emit("signal:offer", { to: remoteSocketId, offer });
    }

    return pc;
  }

  // ── Handle incoming offer from a remote peer ─────────────────
  async handleOffer(remoteSocketId, offer) {
    const pc = await this.createPeer(remoteSocketId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit("signal:answer", { to: remoteSocketId, answer });
  }

  // ── Handle incoming answer ────────────────────────────────────
  async handleAnswer(remoteSocketId, answer) {
    const pc = this.peers.get(remoteSocketId);
    if (!pc) return;
    if (pc.signalingState === "have-local-offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // ── Handle incoming ICE candidate ─────────────────────────────
  async handleIceCandidate(remoteSocketId, candidate) {
    const pc = this.peers.get(remoteSocketId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Safe to ignore — can happen if connection closes mid-negotiation
    }
  }

  // ── Replace all local tracks (e.g. after toggling video) ──────
  replaceTrack(newTrack) {
    for (const pc of this.peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === newTrack.kind);
      if (sender) sender.replaceTrack(newTrack);
    }
  }

  // ── Add a screen share track to all peers ─────────────────────
  addScreenShareTrack(track, stream) {
    for (const [, pc] of this.peers) {
      pc.addTrack(track, stream);
    }
  }

  // ── Remove screen share track from all peers ──────────────────
  removeScreenShareTrack(track) {
    for (const pc of this.peers.values()) {
      const sender = pc.getSenders().find((s) => s.track === track);
      if (sender) pc.removeTrack(sender);
    }
  }

  // ── Tear down one peer connection ─────────────────────────────
  removePeer(remoteSocketId) {
    const pc = this.peers.get(remoteSocketId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      this.peers.delete(remoteSocketId);
      this.onRemoteStreamRemoved(remoteSocketId);
    }
  }

  // ── Tear down all connections ─────────────────────────────────
  destroy() {
    for (const socketId of this.peers.keys()) {
      this.removePeer(socketId);
    }
  }

  // ── Update the local stream (e.g. after device change) ────────
  setLocalStream(stream) {
    this.localStream = stream;
  }
}

export default PeerManager;
