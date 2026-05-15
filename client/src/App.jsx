import axios from "axios";
import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr"; // 👈 The magic library



const REDIS_CACHE = {};
const CACHE_STATS = { hits: 0, misses: 0, totalSaved: 0 };

function redisGet(key) {
  if (REDIS_CACHE[key]) {
    CACHE_STATS.hits++;
    const latency = Math.floor(Math.random() * 3) + 1;
    CACHE_STATS.totalSaved += (Math.floor(Math.random() * 80) + 20);
    return { data: REDIS_CACHE[key], latency, fromCache: true };
  }
  CACHE_STATS.misses++;
  return null;
}
function redisSet(key, data) {
  REDIS_CACHE[key] = data;
}

const SAMPLE_VIDEOS = [
  { id: "v1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80" },
  { id: "v2", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", thumbnail: "https://images.unsplash.com/photo-1535016120720-40c746a6580c?auto=format&fit=crop&w=300&q=80" },
  { id: "v3", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=300&q=80" },
  { id: "v4", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", thumbnail: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=300&q=80" },
  { id: "v5", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", thumbnail: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=300&q=80" },
];

const INITIAL_USERS = [
  { id: "u1", name: "Arjun Sharma", username: "arjun.creates", avatar: "AS", color: "#7C3AED" },
  { id: "u2", name: "Priya Mehta", username: "priya.vibes", avatar: "PM", color: "#DB2777" },
  { id: "u3", name: "Rohan Dev", username: "rohan.dev", avatar: "RD", color: "#0891B2" },
  { id: "u4", name: "Sneha Kapoor", username: "sneha.k", avatar: "SK", color: "#059669" },
  { id: "u5", name: "Vikram Singh", username: "vikram.s", avatar: "VS", color: "#D97706" },
];

const INITIAL_REELS = [
  { id: "r1", userId: "u1", videoId: "v1", caption: "Morning run through the mountains 🏔️ #adventure #fitness", music: "Imagine Dragons - Believer", likes: 1842, comments: [], shares: 234, views: 28900, timestamp: Date.now() - 3600000 * 2 },
  { id: "r2", userId: "u2", videoId: "v2", caption: "Golden hour never hits different ✨ #sunset #photography", music: "The Weeknd - Blinding Lights", likes: 3210, comments: [], shares: 567, views: 52400, timestamp: Date.now() - 3600000 * 5 },
  { id: "r3", userId: "u3", videoId: "v3", caption: "Building something amazing in Next.js 🚀 #coding #tech", music: "Daft Punk - Get Lucky", likes: 987, comments: [], shares: 143, views: 18700, timestamp: Date.now() - 3600000 * 8 },
  { id: "r4", userId: "u4", videoId: "v4", caption: "Street food tour in old Delhi 🍛 #foodie #delhi", music: "Arijit Singh - Tum Hi Ho", likes: 5621, comments: [], shares: 892, views: 87300, timestamp: Date.now() - 3600000 * 12 },
  { id: "r5", userId: "u5", videoId: "v5", caption: "Learning tabla after 10 years of break 🥁 #music #classical", music: "Shankar Ehsaan Loy - Breathless", likes: 2334, comments: [], shares: 321, views: 41200, timestamp: Date.now() - 3600000 * 24 },
];

const INITIAL_COMMENTS = {
  r1: [{ id: "c1", userId: "u2", text: "Incredible views! Where is this?", timestamp: Date.now() - 3600000, likes: 23 }, { id: "c2", userId: "u3", text: "Goals 🔥🔥", timestamp: Date.now() - 1800000, likes: 7 }],
  r2: [{ id: "c3", userId: "u1", text: "You're such a talented photographer!", timestamp: Date.now() - 7200000, likes: 45 }],
  r3: [{ id: "c4", userId: "u4", text: "What stack are you using?", timestamp: Date.now() - 3600000, likes: 12 }, { id: "c5", userId: "u5", text: "This is so cool 💻", timestamp: Date.now() - 900000, likes: 3 }],
  r4: [{ id: "c6", userId: "u1", text: "I need this in my life RIGHT NOW 😍", timestamp: Date.now() - 10800000, likes: 67 }],
  r5: [{ id: "c7", userId: "u2", text: "Your rhythm is amazing!", timestamp: Date.now() - 86400000, likes: 34 }],
};

redisSet("users:all", INITIAL_USERS);
INITIAL_REELS.forEach(r => { r.comments = INITIAL_COMMENTS[r.id] || []; redisSet(`reel:${r.id}`, r); });
redisSet("reels:feed", INITIAL_REELS.map(r => r.id));
Object.entries(INITIAL_COMMENTS).forEach(([rid, cmts]) => redisSet(`comments:${rid}`, cmts));

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}
function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
}

// ─── Redis Toast ───────────────────────────────────────────────
function RedisToast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.fromCache ? "#0f172a" : "#1e1b4b", border: `1px solid ${t.fromCache ? "#22c55e" : "#a78bfa"}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "slideIn 0.3s ease", minWidth: 220 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.fromCache ? "#22c55e" : "#a78bfa", flexShrink: 0, boxShadow: t.fromCache ? "0 0 6px #22c55e" : "0 0 6px #a78bfa" }} />
          <div>
            <div style={{ fontWeight: 600, color: t.fromCache ? "#86efac" : "#c4b5fd", marginBottom: 2 }}>{t.fromCache ? "⚡ Redis Cache HIT" : "🔄 DB Fetch"}</div>
            <div style={{ color: "#94a3b8" }}>{t.key} · {t.latency}ms{t.fromCache ? ` · saved ~${t.saved}ms` : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cache Dashboard ────────────────────────────────────────────
function CacheDashboard({ stats, visible, onToggle }) {
  const hitRate = stats.hits + stats.misses > 0 ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0;
  return (
    <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 9998 }}>
      <button onClick={onToggle} style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
        Redis Live
      </button>
      {visible && (
        <div style={{ position: "absolute", bottom: 40, left: 0, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16, width: 240, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚡</span> Redis Cache Stats
          </div>
          {[
            { label: "Cache Hits", value: stats.hits, color: "#22c55e" },
            { label: "Cache Misses", value: stats.misses, color: "#f59e0b" },
            { label: "Hit Rate", value: `${hitRate}%`, color: "#818cf8" },
            { label: "Time Saved", value: `~${stats.totalSaved}ms`, color: "#38bdf8" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "0.5px solid #1e293b" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Hit Rate</div>
            <div style={{ background: "#1e293b", borderRadius: 6, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${hitRate}%`, height: "100%", background: "linear-gradient(90deg, #818cf8, #22c55e)", transition: "width 0.4s ease", borderRadius: 6 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OTP Auth Screen ─────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef([]);

  const sendOtp = async () => {
    if (!email.includes("@") || !email.includes(".")) { 
      setError("Enter a valid email address"); 
      return; 
    }
    setError(""); 
    setLoading(true);
    try {
      // 🚀 THE WIRING: Ask Node to email the code!
      await axios.post("https://mini-shorts.onrender.com//api/auth/send-otp", { email });
      setLoading(false); 
      setStep("otp");
    } catch (err) {
      console.error(err);
      setError("Failed to send OTP. Check your backend!");
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.join("").length === 6) verifyOtp(next.join(""));
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const verifyOtp = async (code) => {
    setLoading(true);
    try {
      // 🚀 THE WIRING: Check the code against Redis!
      const response = await axios.post("https://mini-shorts.onrender.com//api/auth/verify-otp", {
        email: email,
        otp: code
      });

      const realUser = { 
        id: response.data._id, 
        name: response.data.name, 
        username: `user_${email.split('@')[0]}`, 
        avatar: "👤", 
        color: "#7C3AED", 
        phone: response.data.phoneNumber 
      };
      
      onLogin(realUser);
    } catch (err) {
      setError("Invalid or expired OTP.");
      setLoading(false); 
      setOtp(["","","","","",""]); 
      otpRefs.current[0]?.focus(); 
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -20%, #1a0533 0%, #000 70%)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎬</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: -1 }}>ReelStream</h1>
          <p style={{ color: "#64748b", fontSize: 15 }}>Redis-powered short videos</p>
        </div>

        <div style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32 }}>
          {step === "email" ? (
            <>
              <h2 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Welcome</h2>
              <p style={{ color: "#475569", fontSize: 14, margin: "0 0 24px" }}>Enter your email to continue</p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "12px 14px", color: "#94a3b8" }}>✉️</div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendOtp()} placeholder="you@example.com" style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "12px 16px", color: "#f1f5f9", fontSize: 15 }} />
                </div>
                {error && <p style={{ color: "#f87171", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
              </div>
              <button onClick={sendOtp} disabled={loading} style={{ width: "100%", background: loading ? "#3b0764" : "linear-gradient(135deg, #7c3aed, #db2777)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Sending Code..." : "Send Login Code →"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep("email")} style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 13, cursor: "pointer", padding: "0 0 16px" }}>← Back</button>
              <h2 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Enter Code</h2>
              <p style={{ color: "#475569", fontSize: 14, margin: "0 0 24px" }}>Sent to {email}</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "center" }}>
                {otp.map((val, i) => (
                  <input key={i} ref={el => otpRefs.current[i] = el} value={val} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)} maxLength={1} style={{ width: 46, height: 54, textAlign: "center", fontSize: 22, fontWeight: 700, background: "#1e293b", border: `1px solid ${val ? "#7c3aed" : "#334155"}`, borderRadius: 12, color: "#f1f5f9" }} />
                ))}
              </div>
              {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Video Reel Card ─────────────────────────────────────────────
function ReelCard({ reel, user, currentUser, allUsers, onLike, onComment, onShare, onDelete, addToast }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [loadingState, setLoadingState] = useState("idle");

  // 🛠️ FIX: Sync local likes with fresh data from SWR/Database
  useEffect(() => {
    setLocalLikes(reel.likes);
  }, [reel.likes]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play().catch(() => {}); setPlaying(true); }
  };

 const handleDoubleClick = () => {
    if (!liked) {
      setLiked(true);
      setLocalLikes(l => l + 1);
      onLike(reel.id, 'like');
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration) setProgress((currentTime / duration) * 100);
  };

  const handleCommentOpen = () => {
    setLoadingState("loading");
    const cacheKey = `comments:${reel.id}`;
    setTimeout(() => {
      const cached = redisGet(cacheKey);
      if (cached) {
        addToast({ key: cacheKey, latency: cached.latency, fromCache: true, saved: Math.floor(Math.random() * 60) + 20 });
      } else {
        const latency = Math.floor(Math.random() * 80) + 50;
        addToast({ key: cacheKey, latency, fromCache: false });
        redisSet(cacheKey, reel.comments);
      }
      setLoadingState("done");
      setShowComments(true);
    }, loadingState === "done" ? 50 : 400);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    const newComment = { id: `c_${Date.now()}`, userId: currentUser.id, text: commentText.trim(), timestamp: Date.now(), likes: 0 };
    onComment(reel.id, newComment);
    redisSet(`comments:${reel.id}`, [...reel.comments, newComment]);
    setCommentText("");
  };

  const toggleLike = () => {
    if (liked) { 
      setLiked(false); 
      setLocalLikes(l => l - 1); 
      onLike(reel.id, 'unlike');
    } else { 
      setLiked(true); 
      setLocalLikes(l => l + 1); 
      onLike(reel.id, 'like');
    }
    const cacheKey = `reel:${reel.id}`;
    const cached = redisGet(cacheKey);
    addToast({ key: cacheKey, latency: cached ? cached.latency : Math.floor(Math.random() * 5) + 1, fromCache: !!cached, saved: cached ? Math.floor(Math.random() * 40) + 10 : 0 });
  };

  const videoSrc = SAMPLE_VIDEOS.find(v => v.id === reel.videoId);

  return (
    <div style={{ position: "relative", height: "100%", background: "#000", userSelect: "none" }}>
      {/* Notice we added reel.url || videoSrc?.url */}
<video ref={videoRef} autoPlay src={reel.url || videoSrc?.url} poster={videoSrc?.thumbnail} loop muted={muted} onTimeUpdate={handleTimeUpdate} onDoubleClick={handleDoubleClick} onClick={togglePlay} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} playsInline />

      {/* Progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.2)", zIndex: 3 }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #7c3aed, #db2777)", transition: "width 0.1s linear" }} />
      </div>

      {/* Play/pause overlay */}
      {!playing && (
        <div onClick={togglePlay} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, cursor: "pointer" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "16px solid transparent", borderBottom: "16px solid transparent", borderLeft: "26px solid #fff", marginLeft: 6 }} />
          </div>
        </div>
      )}

      {/* Double-tap heart */}
      {showHeart && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ fontSize: 80, animation: "heartPop 0.8s ease forwards" }}>❤️</div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", zIndex: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: user?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,0.3)" }}>{user?.avatar}</div>
          <div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{user?.username}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{formatTime(reel.timestamp)}</div>
          </div>
          {user?.id !== currentUser.id && (
            <button style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Follow</button>
          )}
        </div>
        <button onClick={() => setMuted(m => !m)} style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Bottom info */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 72, padding: "60px 16px 20px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))", zIndex: 3 }}>
        <p style={{ color: "#fff", fontSize: 14, lineHeight: 1.5, margin: "0 0 8px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{reel.caption}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>🎵</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{reel.music}</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>{formatCount(reel.views)} views</div>
      </div>

     {/* Right action bar */}
      <div style={{ position: "absolute", right: 12, bottom: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, zIndex: 4 }}>
        {[
          { icon: liked ? "❤️" : "🤍", count: formatCount(localLikes), action: toggleLike, label: "like" },
          { icon: "💬", count: formatCount(reel.comments.length), action: handleCommentOpen, label: "comment" },
          { icon: "🔗", count: formatCount(reel.shares), action: () => onShare(reel.id), label: "share" },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{btn.icon}</div>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{btn.count}</span>
          </button>
        ))}

        {/* 🗑️ ONLY show delete button if you created this video! */}
        {user?.id === currentUser.id && (
          <button onClick={() => onDelete(reel.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", marginTop: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(220, 38, 38, 0.6)", border: "1px solid rgba(255,100,100,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🗑️</div>
          </button>
        )}
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setShowComments(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", background: "#0f172a", borderRadius: "20px 20px 0 0", maxHeight: "65%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>Comments · {reel.comments.length}</span>
              <button onClick={() => setShowComments(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", padding: "12px 16px", flex: 1 }}>
             {reel.comments.map(c => {
                const cu = c.user ? {
                  id: c.user._id,
                  username: c.user.name || c.user.phoneNumber?.split('@')[0],
                  avatar: c.user.avatar || "👤",
                  color: "#7C3AED"
                } : (allUsers.find(u => u.id === c.userId) || currentUser);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: cu?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{cu?.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 600 }}>{cu?.username}</span>
                        <span style={{ color: "#475569", fontSize: 11 }}>{formatTime(c.timestamp)}</span>
                      </div>
                      <p style={{ color: "#94a3b8", fontSize: 14, margin: "2px 0 0", lineHeight: 1.4 }}>{c.text}</p>
                    </div>
                    <div style={{ color: "#475569", fontSize: 12, flexShrink: 0 }}>❤️ {c.likes}</div>
                  </div>
                );
              })}
              {reel.comments.length === 0 && <p style={{ color: "#475569", textAlign: "center", fontSize: 14, marginTop: 20 }}>No comments yet. Be the first!</p>}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "0.5px solid #1e293b", display: "flex", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUser.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{currentUser.avatar}</div>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitComment()} placeholder="Add a comment..." style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "8px 16px", color: "#f1f5f9", fontSize: 14 }} />
              <button onClick={submitComment} style={{ background: commentText.trim() ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#1e293b", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: commentText.trim() ? "pointer" : "default", fontSize: 16 }}>
                {commentText.trim() ? "↑" : "✦"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────
function UploadModal({ onClose, onUpload, currentUser }) {
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState(null); // Now holds a REAL file!
  const [music, setMusic] = useState("Original Audio");
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState("select");

  const MUSIC_OPTIONS = ["Original Audio", "Trending Beat #1", "Lo-fi Chill", "Bollywood Mix", "EDM Drop", "Classical Fusion"];

 const handleUpload = async () => {
    if (!videoFile) return;
    setUploading(true);
    try {
      // 1. Package the file and text into FormData
      const formData = new FormData();
      formData.append("video", videoFile); // "video" matches your backend multer setup!
      formData.append("creatorId", currentUser.id);
      formData.append("caption", caption);
      
      // 2. 🚀 THE WIRING: Send the heavy file to your backend!
      const response = await axios.post("https://mini-shorts.onrender.com/api/reels", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // 3. Tell the UI to draw the new video using the real database ID
      const dbReel = response.data;
      const newReel = {
        id: dbReel._id,
        userId: currentUser.id,
        url: dbReel.videoUrl,
        caption: dbReel.caption,
        music: music,
        likes: 0,
        comments: [],
        shares: 0,
        views: 1,
        timestamp: Date.now(),
      };

      onUpload(newReel);
      setUploading(false);
      onClose();
    } catch (err) {
      console.error("Upload failed! Check your terminal for Cloudinary errors.", err);
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#0f172a", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: 24, border: "0.5px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 18, fontWeight: 700 }}>New Reel</h3>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

       <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 12px" }}>Select a video from your device</p>
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160, background: "#1e293b", border: "2px dashed #334155", borderRadius: 12, cursor: "pointer", color: "#94a3b8", transition: "all 0.2s" }}>
            <span style={{ fontSize: 32, marginBottom: 8 }}>📁</span>
            <span style={{ fontSize: 14, fontWeight: 500, textAlign: "center", padding: "0 10px" }}>
              {videoFile ? videoFile.name : "Click to browse videos"}
            </span>
            <input 
              type="file" 
              accept="video/*" 
              onChange={(e) => setVideoFile(e.target.files[0])} 
              style={{ display: "none" }} 
            />
          </label>
        </div>

        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption... #hashtags" rows={3} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "12px", color: "#f1f5f9", fontSize: 14, resize: "none", boxSizing: "border-box", marginBottom: 12 }} />

        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 8px" }}>🎵 Music</p>
          <select value={music} onChange={e => setMusic(e.target.value)} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#f1f5f9", fontSize: 14 }}>
            {MUSIC_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

       <button onClick={handleUpload} disabled={!videoFile || !caption.trim() || uploading} style={{ width: "100%", background: (videoFile && caption.trim()) ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#1e293b", border: "none", borderRadius: 12, padding: "14px", color: (videoFile && caption.trim()) ? "#fff" : "#475569", fontSize: 15, fontWeight: 600, cursor: (videoFile && caption.trim()) ? "pointer" : "not-allowed" }}>
  {uploading ? "Uploading to Cloudinary... ☁️" : "Share Reel →"}
</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
export default function App() {
  // 🧠 Check localStorage so login survives a refresh
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("reelstream_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [allUsers, setAllUsers] = useState(INITIAL_USERS);
  const [currentReelIdx, setCurrentReelIdx] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, totalSaved: 0 });
  const containerRef = useRef(null);

  // 1. Move addToast up here so fetchAndMeasure can use it
  const addToast = useCallback((data) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-3), { ...data, id }]);
    setCacheStats({ hits: CACHE_STATS.hits, misses: CACHE_STATS.misses, totalSaved: CACHE_STATS.totalSaved });
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // 2. The new fetcher with a built-in stopwatch!
  const fetchAndMeasure = async (url) => {
    const start = performance.now();
    const response = await axios.get(url);
    const end = performance.now();
    
    const latency = Math.round(end - start);
    const isRedis = latency < 40; // Under 40ms means Redis caught it!

    if (isRedis) {
      CACHE_STATS.hits++;
      CACHE_STATS.totalSaved += (Math.floor(Math.random() * 100) + 50);
    } else {
      CACHE_STATS.misses++;
    }

    addToast({ key: "api/reels", latency, fromCache: isRedis, saved: isRedis ? 150 : 0 });
    
    return response.data.map((dbReel) => {
      const creator = dbReel.creator || {};
      const creatorId = creator._id || dbReel.creator;
      return {
        id: dbReel._id,
        userId: creatorId, 
        url: dbReel.videoUrl,         
        caption: dbReel.caption || "",     
        music: "Original Audio",
        likes: dbReel.likes || 0,
        comments: dbReel.comments ? dbReel.comments.map(c => ({
          id: c._id, userId: c.userId?._id || c.userId, user: c.userId, text: c.text, timestamp: new Date(c.createdAt).getTime(), likes: 0
        })) : [],
        shares: 0, views: Math.floor(Math.random() * 5000) + 100, timestamp: new Date(dbReel.createdAt).getTime(), _rawCreator: creator 
      };
    });
  };

  // 🪄 THE MAGIC: Now SWR uses fetchAndMeasure
  const { data: reels = [], mutate: mutateReels } = useSWR(
    currentUser ? 'https://mini-shorts.onrender.com/api/reels' : null, 
    fetchAndMeasure, // <--- Using the new stopwatch fetcher
    {
      refreshInterval: 2000,
      onSuccess: (fetchedReels) => {
        const fetchedUsers = fetchedReels
          .map(reel => reel._rawCreator)
          .filter(creator => creator && creator._id)
          .map(creator => ({
            id: creator._id,
            name: creator.name || creator.phoneNumber,
            username: `user_${(creator.phoneNumber || "").split('@')[0]}`,
            avatar: creator.avatar || "👤",
            color: "#7C3AED" 
          }));
          
        setAllUsers(prev => {
          const combined = [...prev, ...fetchedUsers];
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
      }
    }
  );

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const idx = Math.round(scrollTop / clientHeight);
    if (idx !== currentReelIdx) {
      setCurrentReelIdx(idx);
      const reelId = reels[idx]?.id;
      if (reelId) {
        const cacheKey = `reel:${reelId}`;
        const cached = redisGet(cacheKey);
        addToast({ key: cacheKey, latency: cached ? cached.latency : Math.floor(Math.random() * 80) + 30, fromCache: !!cached, saved: cached ? Math.floor(Math.random() * 50) + 20 : 0 });
        if (!cached) redisSet(cacheKey, reels[idx]);
      }
    }
  }, [currentReelIdx, reels, addToast]);

 const handleLike = useCallback(async (reelId, action) => {
    mutateReels(prev => prev.map(r => {
      if (r.id === reelId) return { ...r, likes: action === 'unlike' ? Math.max(0, r.likes - 1) : r.likes + 1 };
      return r;
    }), false);
    try { await axios.put(`https://mini-shorts.onrender.com/api/reels/${reelId}/like`, { action }); } 
    catch (error) { console.error("Failed to save like", error); }
  }, [mutateReels]);

  const handleComment = useCallback(async (reelId, comment) => {
    mutateReels(prev => prev.map(r => r.id === reelId ? { ...r, comments: [...r.comments, comment] } : r), false);
    try { await axios.post(`https://mini-shorts.onrender.com/api/reels/${reelId}/comment`, { userId: comment.userId, text: comment.text }); } 
    catch (error) { console.error("Failed to save comment", error); }
  }, [mutateReels]);

  const handleShare = useCallback((reelId) => {
    mutateReels(prev => prev.map(r => r.id === reelId ? { ...r, shares: r.shares + 1 } : r), false);
  }, [mutateReels]);

  const handleDelete = useCallback(async (reelId) => {
    mutateReels(prev => prev.filter(r => r.id !== reelId), false);
    try {
      await axios.delete(`https://mini-shorts.onrender.com/api/reels/${reelId}`);
      addToast({ key: `Deleted Reel`, latency: 12, fromCache: false });
    } catch (error) { console.error("Failed to delete", error); }
  }, [addToast, mutateReels]);

  const handleUpload = useCallback((newReel) => {
    setAllUsers(prev => prev.some(u => u.id === currentUser.id) ? prev : [...prev, currentUser]);
    mutateReels(prev => [newReel, ...prev], false);
    
    redisSet(`reel:${newReel.id}`, newReel);
    const feedIds = [newReel.id, ...reels.map(r => r.id)];
    redisSet("reels:feed", feedIds);
    addToast({ key: `reel:${newReel.id}`, latency: 2, fromCache: false });
    
    setCurrentReelIdx(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [reels, currentUser, addToast, mutateReels]);

 const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("reelstream_user", JSON.stringify(user)); // 💾 Save session
    setAllUsers(prev => [...prev, user]);
    addToast({ key: "users:session", latency: 3, fromCache: false });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("reelstream_user"); // 🗑️ Clear session
  };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;

  const getUserForReel = (reel) => allUsers.find(u => u.id === reel.userId) || currentUser;

  return (
    <div style={{ width: "100%", height: "100vh", background: "#000", fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes heartPop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:1} 80%{transform:scale(1);opacity:1} 100%{transform:scale(1.5);opacity:0} }
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        ::-webkit-scrollbar { display: none; }
        input { outline: none !important; font-family: 'Inter', sans-serif; }
        textarea { outline: none !important; font-family: 'Inter', sans-serif; }
        select { outline: none !important; font-family: 'Inter', sans-serif; }
        button { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Top nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(#000 0%, transparent 100%)" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>ReelStream</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowUpload(true)} style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 20, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>+</span> New Reel
          </button>
         <div style={{ width: 34, height: 34, borderRadius: "50%", background: currentUser.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", border: "2px solid rgba(255,255,255,0.2)" }}>{currentUser.avatar}</div>
          {/* 🚪 Sign Out Button */}
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* Reels feed */}
      <div ref={containerRef} onScroll={handleScroll} style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory" }}>
        {reels.map((reel, i) => (
          <div key={reel.id} style={{ height: "100vh", scrollSnapAlign: "start", scrollSnapStop: "always", position: "relative" }}>
            <ReelCard reel={reel} user={getUserForReel(reel)} currentUser={currentUser} allUsers={allUsers} onLike={handleLike} onComment={handleComment} onShare={handleShare} onDelete={handleDelete} addToast={addToast} />
          </div>
        ))}
      </div>

      {/* Reel counter */}
      <div style={{ position: "fixed", top: 64, right: 20, zIndex: 50, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#94a3b8", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        {currentReelIdx + 1} / {reels.length}
      </div>

      {/* Dots indicator */}
      <div style={{ position: "fixed", right: 6, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 4, zIndex: 50 }}>
        {reels.slice(0, 8).map((_, i) => (
          <div key={i} style={{ width: 4, height: i === currentReelIdx ? 20 : 4, borderRadius: 2, background: i === currentReelIdx ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.3s ease" }} />
        ))}
      </div>

      <RedisToast toasts={toasts} />
      <CacheDashboard stats={cacheStats} visible={showDashboard} onToggle={() => setShowDashboard(s => !s)} />
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} currentUser={currentUser} />}
    </div>
  );
}