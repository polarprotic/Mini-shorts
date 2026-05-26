import axios from "axios";
import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";

// Show keycard on every request
axios.interceptors.request.use((config) => {
  const saved = localStorage.getItem("reelstream_user");
  if (saved) {
    const user = JSON.parse(saved);
    if (user.token) {
      config.headers.Authorization = user.token;
      
    }
  }
  return config;
});

// Listen for the bouncer kicking you out
axios.interceptors.response.use(res => res, error => {
  if (error.response && error.response.status === 403) {
    alert("You were logged out because someone logged into this account on another device.");
    localStorage.removeItem("reelstream_user");
    window.location.reload();
  }
  return Promise.reject(error);
});

const SAMPLE_VIDEOS = [
  { id: "v1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80" },
  { id: "v2", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", thumbnail: "https://images.unsplash.com/photo-1535016120720-40c746a6580c?auto=format&fit=crop&w=300&q=80" },
  { id: "v3", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=300&q=80" },
  { id: "v4", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", thumbnail: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=300&q=80" },
  { id: "v5", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", thumbnail: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=300&q=80" },
];

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
}

// ─── OTP Auth Screen ─────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const otpRefs = useRef([]);

  const sendOtp = async () => {
    if (!email.includes("@") || !email.includes(".")) {
      setError("Enter a valid email address"); return;
    }
    setError(""); setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/send-otp", { email });
      setLoading(false); setStep("otp");
    } catch (err) {
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
      const response = await axios.post("http://localhost:5000/api/auth/verify-otp", { email, otp: code });
      const realUser = {
        id: response.data._id,
        name: response.data.name,
        username: response.data.username || `user_${email.split('@')[0]}`, // 👈 Uses DB username with a fallback
        avatar: response.data.avatar || "👤",
        color: "#7C3AED",
        phone: response.data.phoneNumber,
        token: response.data.token // Save the keycard to React state
      };
      onLogin(realUser);
    } catch (err) {
      setError("Invalid or expired OTP.");
      setLoading(false); setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#020617", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      {/* Ambient background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 100% 80% at 20% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 80% 100%, rgba(219,39,119,0.12) 0%, transparent 60%)"
      }} />
      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
            borderRadius: 18, fontSize: 28, marginBottom: 20,
            boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(219,39,119,0.2)"
          }}>🎬</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900,
            color: "#fff", margin: "0 0 8px", letterSpacing: "-1.5px", lineHeight: 1
          }}>ReelStream</h1>
          <p style={{
            color: "#475569", fontSize: 14, letterSpacing: "0.06em",
            textTransform: "uppercase", fontWeight: 500
          }}>Redis-powered · Short Video</p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(15,23,42,0.6)", backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24,
          padding: 36, boxShadow: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
        }}>
          {step === "email" ? (
            <>
              <h2 style={{
                color: "#f8fafc", fontSize: 24, fontWeight: 700,
                margin: "0 0 6px", fontFamily: "'Playfair Display', serif"
              }}>Welcome back</h2>
              <p style={{ color: "#475569", fontSize: 14, margin: "0 0 28px", lineHeight: 1.6 }}>
                Enter your email to receive a secure login code
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  display: "block", marginBottom: 8
                }}>Email Address</label>
                <div style={{
                  display: "flex", gap: 0, background: "#0f172a",
                  border: `1px solid ${focused ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 14, overflow: "hidden",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.12)" : "none"
                }}>
                  <div style={{
                    padding: "14px 16px", borderRight: "1px solid rgba(255,255,255,0.06)",
                    color: "#475569", fontSize: 16, display: "flex", alignItems: "center"
                  }}>✉️</div>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendOtp()}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="you@example.com"
                    style={{
                      flex: 1, background: "transparent", border: "none", padding: "14px 18px",
                      color: "#f1f5f9", fontSize: 15, fontFamily: "'Outfit', sans-serif"
                    }}
                  />
                </div>
                {error && (
                  <p style={{
                    color: "#f87171", fontSize: 13, margin: "10px 0 0",
                    display: "flex", alignItems: "center", gap: 6
                  }}><span>⚠</span> {error}</p>
                )}
              </div>

              <button onClick={sendOtp} disabled={loading} style={{
                width: "100%", border: "none", borderRadius: 14, padding: "15px",
                background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #db2777 100%)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Outfit', sans-serif",
                letterSpacing: "0.02em", position: "relative", overflow: "hidden",
                transition: "transform 0.15s, box-shadow 0.15s",
                boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.35)"
              }}>
                {loading ? <span style={{ opacity: 0.7 }}>Sending secure code…</span> : "Continue →"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep("email")} style={{
                background: "none", border: "none", color: "#7c3aed", fontSize: 13, cursor: "pointer",
                padding: "0 0 20px", display: "flex", alignItems: "center",
                gap: 6, fontFamily: "'Outfit', sans-serif", fontWeight: 500
              }}>← Back</button>

              <h2 style={{
                color: "#f8fafc", fontSize: 24, fontWeight: 700,
                margin: "0 0 6px", fontFamily: "'Playfair Display', serif"
              }}>Enter code</h2>
              <p style={{ color: "#475569", fontSize: 14, margin: "0 0 28px" }}>
                Sent to <span style={{ color: "#94a3b8", fontWeight: 500 }}>{email}</span>
              </p>

              <div style={{ display: "flex", gap: 10, marginBottom: 24, justifyContent: "center" }}>
                {otp.map((val, i) => (
                  <input
                    key={i} ref={el => otpRefs.current[i] = el}
                    value={val} onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    maxLength={1}
                    style={{
                      width: 48, height: 58, textAlign: "center", fontSize: 24, fontWeight: 700,
                      background: val ? "rgba(124,58,237,0.1)" : "#0f172a",
                      border: `1.5px solid ${val ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 14, color: "#f1f5f9", fontFamily: "'DM Mono', monospace",
                      transition: "all 0.15s", boxShadow: val ? "0 0 12px rgba(124,58,237,0.2)" : "none"
                    }}
                  />
                ))}
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", marginBottom: 12 }}>{error}</p>}
              {loading && <div style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>Verifying…</div>}
            </>
          )}
        </div>
        <p style={{
          textAlign: "center", color: "#1e293b", fontSize: 12,
          marginTop: 24, letterSpacing: "0.04em"
        }}>Secured with Redis · End-to-end encrypted</p>
      </div>
    </div>
  );
}

// ─── Action Button Component ─────────────────────────────────────
function ActionButton({ icon, count, onClick, active, color, label }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 300); onClick(); }}
      title={label}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        background: "none", border: "none", cursor: "pointer",
        transform: pressed ? "scale(0.88)" : "scale(1)",
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: active ? `${color || "rgba(124,58,237,0.3)"}44` : "rgba(0,0,0,0.45)",
        backdropFilter: "blur(12px)",
        border: active ? `1.5px solid ${color || "rgba(124,58,237,0.6)"}88` : "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, boxShadow: active ? `0 0 16px ${color || "rgba(124,58,237,0.4)"}44` : "none",
        transition: "all 0.25s ease"
      }}>
        {icon}
      </div>
      {count !== undefined && (
        <span style={{
          color: "#fff", fontSize: 11.5, fontWeight: 600,
          textShadow: "0 1px 4px rgba(0,0,0,0.9)", fontFamily: "'DM Mono', monospace",
          letterSpacing: "-0.02em"
        }}>{count}</span>
      )}
    </button>
  );
}

// ─── Video Reel Card ─────────────────────────────────────────────
function ReelCard({ reel, user, currentUser, allUsers, onLike, onComment, onShare, onDelete, onAvatarClick }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);

  useEffect(() => { setLocalLikes(reel.likes); }, [reel.likes]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const handleDoubleClick = () => {
    if (!liked) {
      setLiked(true); setLocalLikes(l => l + 1);
      onLike(reel.id, 'like');
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 900);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration) setProgress((currentTime / duration) * 100);
  };

  const handleCommentOpen = () => {
    setShowComments(true);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c_${Date.now()}`, userId: currentUser.id,
      text: commentText.trim(), timestamp: Date.now(), likes: 0
    };
    onComment(reel.id, newComment);
    setCommentText("");
  };

  const toggleLike = () => {
    if (liked) { setLiked(false); setLocalLikes(l => l - 1); onLike(reel.id, 'unlike'); }
    else { setLiked(true); setLocalLikes(l => l + 1); onLike(reel.id, 'like'); }
  };

  const videoSrc = SAMPLE_VIDEOS.find(v => v.id === reel.videoId);

  return (
    <div style={{ position: "relative", height: "100%", background: "#000", userSelect: "none" }}>
      <video
        ref={videoRef} autoPlay
        src={reel.url || videoSrc?.url} poster={videoSrc?.thumbnail}
        loop muted={muted} onTimeUpdate={handleTimeUpdate}
        onDoubleClick={handleDoubleClick} onClick={togglePlay}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        playsInline
      />

      {/* Progress bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2.5,
        background: "rgba(255,255,255,0.1)", zIndex: 3
      }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: "linear-gradient(90deg, #7c3aed, #db2777)",
          transition: "width 0.1s linear", boxShadow: "0 0 6px rgba(219,39,119,0.6)"
        }} />
      </div>

      {/* Cinematic vignette */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
        pointerEvents: "none"
      }} />

      {/* Play/pause overlay */}
      {!playing && (
        <div onClick={togglePlay} style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2, cursor: "pointer"
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)", border: "1.5px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }}>
            <div style={{ borderTop: "17px solid transparent", borderBottom: "17px solid transparent", borderLeft: "28px solid #fff", marginLeft: 6 }} />
          </div>
        </div>
      )}

      {/* Double-tap heart */}
      {showHeart && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ fontSize: 88, animation: "heartPop 0.9s ease forwards", filter: "drop-shadow(0 0 20px rgba(239,68,68,0.6))" }}>❤️</div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, padding: "56px 16px 24px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
        zIndex: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start"
      }}>
       <div 
          onClick={() => onAvatarClick(user.id)} 
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `linear-gradient(135deg, ${user?.color}, ${user?.color}99)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff",
            border: "2px solid rgba(255,255,255,0.3)", boxShadow: `0 0 16px ${user?.color}44`
          }}>{user?.avatar}</div>
          <div>
            <div style={{
              color: "#fff", fontSize: 14, fontWeight: 700,
              textShadow: "0 1px 6px rgba(0,0,0,0.8)", letterSpacing: "-0.01em"
            }}>{user?.username}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 }}>
              {formatTime(reel.timestamp)}
            </div>
          </div>
          {user?.id !== currentUser.id && (
            <button style={{
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 24,
              padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              letterSpacing: "0.01em", transition: "all 0.2s"
            }}>Follow</button>
          )}
        </div>

        <button
          onClick={() => setMuted(m => !m)}
          style={{
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16,
            transition: "all 0.2s"
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

     {/* Bottom info — left side */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 80, padding: "80px 20px 90px",
        background: "linear-gradient(transparent, rgba(0,0,0,0.85) 60%)", zIndex: 3
      }}>
        <p style={{
          color: "#fff", fontSize: 14, lineHeight: 1.6, margin: "0 0 10px",
          textShadow: "0 1px 6px rgba(0,0,0,0.7)", fontWeight: 400
        }}>{reel.caption}</p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, padding: "5px 12px"
        }}>
          <span style={{ fontSize: 13 }}>🎵</span>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 500 }}>{reel.music}</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 10, fontFamily: "'DM Mono', monospace" }}>
          {formatCount(reel.views)} views
        </div>
      </div>

      {/* Right action bar */}
      <div style={{
        position: "absolute", right: 14, bottom: 130, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 18, zIndex: 4
      }}>
        <ActionButton icon={liked ? "❤️" : "🤍"} count={formatCount(localLikes)} onClick={toggleLike} active={liked} color="#ef4444" label="Like" />
        <ActionButton icon="💬" count={formatCount(reel.comments.length)} onClick={handleCommentOpen} label="Comment" />
        <ActionButton icon="↗" count={formatCount(reel.shares)} onClick={() => onShare(reel.id)} label="Share" />

        {user?.id === currentUser.id && (
          <button
            onClick={() => onDelete(reel.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, background: "none", border: "none", cursor: "pointer", marginTop: 8
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "rgba(220,38,38,0.25)",
              backdropFilter: "blur(12px)", border: "1px solid rgba(239,68,68,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
              transition: "all 0.2s"
            }}>🗑️</div>
          </button>
        )}
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setShowComments(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "relative", background: "rgba(8,15,35,0.97)", backdropFilter: "blur(32px)",
            borderRadius: "24px 24px 0 0", maxHeight: "68%", display: "flex", flexDirection: "column",
            border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none", boxShadow: "0 -24px 64px rgba(0,0,0,0.6)"
          }}>
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "12px auto 0" }} />

            <div style={{ padding: "16px 20px 14px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>Comments</span>
                <span style={{ marginLeft: 8, color: "#475569", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{reel.comments.length}</span>
              </div>
              <button onClick={() => setShowComments(false)} style={{
                background: "rgba(255,255,255,0.06)", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20,
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1
              }}>×</button>
            </div>

            <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
              {reel.comments.map(c => {
                const cu = c.user ? {
                  id: c.user._id,
                  username: c.user.name || c.user.phoneNumber?.split('@')[0],
                  avatar: c.user.avatar || "👤",
                  color: "#7C3AED"
                } : (allUsers.find(u => u.id === c.userId) || currentUser);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${cu?.color || "#7C3AED"}, ${cu?.color || "#7C3AED"}88)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
                      border: "1.5px solid rgba(255,255,255,0.1)"
                    }}>{cu?.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{cu?.username}</span>
                        <span style={{ color: "#334155", fontSize: 11 }}>{formatTime(c.timestamp)}</span>
                      </div>
                      <p style={{ color: "#94a3b8", fontSize: 14, margin: "3px 0 0", lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                    <div style={{ color: "#334155", fontSize: 11, flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 3 }}>
                      ❤️ <span style={{ fontFamily: "'DM Mono', monospace" }}>{c.likes}</span>
                    </div>
                  </div>
                );
              })}
              {reel.comments.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <p style={{ color: "#334155", fontSize: 14 }}>No comments yet. Be first!</p>
                </div>
              )}
            </div>

            <div style={{ padding: "12px 16px", borderTop: "0.5px solid rgba(255,255,255,0.06)", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: `linear-gradient(135deg, ${currentUser.color}, ${currentUser.color}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
                border: "1.5px solid rgba(255,255,255,0.15)"
              }}>{currentUser.avatar}</div>
              <div style={{
                flex: 1, background: commentFocused ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${commentFocused ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 24, padding: "0 16px", display: "flex", alignItems: "center",
                transition: "all 0.2s", boxShadow: commentFocused ? "0 0 0 3px rgba(124,58,237,0.08)" : "none"
              }}>
                <input
                  value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitComment()}
                  onFocus={() => setCommentFocused(true)} onBlur={() => setCommentFocused(false)}
                  placeholder="Add a comment…"
                  style={{
                    flex: 1, background: "transparent", border: "none", padding: "10px 0",
                    color: "#f1f5f9", fontSize: 14, fontFamily: "'Outfit', sans-serif"
                  }}
                />
              </div>
              <button
                onClick={submitComment} disabled={!commentText.trim()}
                style={{
                  background: commentText.trim() ? "linear-gradient(135deg, #7c3aed, #db2777)" : "rgba(255,255,255,0.06)",
                  border: "none", borderRadius: "50%", width: 38, height: 38, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: commentText.trim() ? "pointer" : "default", fontSize: 16, transition: "all 0.2s",
                  boxShadow: commentText.trim() ? "0 4px 12px rgba(124,58,237,0.4)" : "none"
                }}
              >↑</button>
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
  const [videoFile, setVideoFile] = useState(null);
  const [music, setMusic] = useState("Original Audio");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const MUSIC_OPTIONS = ["Original Audio", "Trending Beat #1", "Lo-fi Chill", "Bollywood Mix", "EDM Drop", "Classical Fusion"];

  const handleUpload = async () => {
    if (!videoFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("creatorId", currentUser.id);
      formData.append("caption", caption);
      const response = await axios.post("http://localhost:5000/api/reels", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const dbReel = response.data;
      const newReel = {
        id: dbReel._id, userId: currentUser.id, url: dbReel.videoUrl,
        caption: dbReel.caption, music, likes: 0, comments: [], shares: 0,
        views: 1, timestamp: Date.now(),
      };
      onUpload(newReel); setUploading(false); onClose();
    } catch (err) {
      console.error("Upload failed:", err);
      setUploading(false);
    }
  };

  const canSubmit = videoFile && caption.trim() && !uploading;

 return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
      zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center"
    }}>
      <div style={{
        background: "rgba(8,15,35,0.98)", backdropFilter: "blur(32px)", borderRadius: "24px 24px 0 0",
        width: "100%", maxWidth: 500, padding: "28px 28px 36px", border: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "none", boxShadow: "0 -32px 80px rgba(0,0,0,0.7)"
      }}>
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "0 auto 24px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{
            color: "#f8fafc", margin: 0, fontSize: 20, fontWeight: 700,
            fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em"
          }}>New Reel</h3>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8", borderRadius: "50%", width: 36, height: 36, cursor: "pointer",
            fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1
          }}>×</button>
        </div>

        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("video/")) setVideoFile(f); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160,
            background: dragOver ? "rgba(124,58,237,0.1)" : videoFile ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
            border: `2px dashed ${dragOver ? "rgba(124,58,237,0.6)" : videoFile ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 18, cursor: "pointer", marginBottom: 20, transition: "all 0.2s",
            boxShadow: dragOver ? "inset 0 0 24px rgba(124,58,237,0.1)" : "none"
          }}
        >
          <span style={{ fontSize: 32, marginBottom: 10 }}>{videoFile ? "✅" : "🎥"}</span>
          <span style={{
            fontSize: 14, fontWeight: 600, color: videoFile ? "#4ade80" : "#64748b",
            textAlign: "center", padding: "0 16px"
          }}>{videoFile ? videoFile.name : "Drop video here or click to browse"}</span>
          {!videoFile && <span style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>MP4, MOV, WebM</span>}
          <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} style={{ display: "none" }} />
        </label>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em",
            display: "block", marginBottom: 8
          }}>Caption</label>
          <textarea
            value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Write something captivating… #hashtags" rows={3}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "12px 16px", color: "#f1f5f9", fontSize: 14, resize: "none", boxSizing: "border-box",
              fontFamily: "'Outfit', sans-serif", lineHeight: 1.6
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em",
            display: "block", marginBottom: 8
          }}>🎵 Music</label>
          <select
            value={music} onChange={e => setMusic(e.target.value)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "11px 14px", color: "#f1f5f9", fontSize: 14, fontFamily: "'Outfit', sans-serif"
            }}
          >
            {MUSIC_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button
          onClick={handleUpload} disabled={!canSubmit}
          style={{
            width: "100%",
            background: canSubmit ? "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #db2777 100%)" : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 16, padding: "16px", color: canSubmit ? "#fff" : "#334155",
            fontSize: 15, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "'Outfit', sans-serif", letterSpacing: "0.02em", transition: "all 0.2s",
            boxShadow: canSubmit ? "0 8px 24px rgba(124,58,237,0.4)" : "none"
          }}
        >
          {uploading ? "Uploading to Cloudinary ☁️" : "Share Reel →"}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ──────────────────────────────────────────
function EditProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await axios.put("http://localhost:5000/api/users/profile", { name, username, bio });
      onSave(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "rgba(8,15,35,0.98)", backdropFilter: "blur(32px)", borderRadius: 24,
        width: "100%", maxWidth: 400, padding: 32, border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)"
      }}>
        <h3 style={{ color: "#f8fafc", margin: "0 0 24px", fontSize: 20, fontFamily: "'Playfair Display', serif" }}>Edit Profile</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'Outfit', sans-serif" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="no spaces allowed" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'Outfit', sans-serif" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", resize: "none", fontFamily: "'Outfit', sans-serif" }} />
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #db2777)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Screen ──────────────────────────────────────────────
function ProfileScreen({ userId, currentUser, onBack, onUpdateUser }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // 👈 New state for the modal

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${userId}`);
        setProfileData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load profile", err);
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const toggleFollow = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/users/${userId}/follow`, {
        currentUserId: currentUser.id
      });
      
      // Update the UI immediately without reloading
      setProfileData(prev => {
        const newFollowers = res.data.isFollowing 
          ? [...prev.profile.followers, { _id: currentUser.id }] 
          : prev.profile.followers.filter(f => f._id !== currentUser.id);
        
        return { ...prev, profile: { ...prev.profile, followers: newFollowers } };
      });
    } catch (err) {
      console.error("Failed to follow", err);
    }
  };

  if (loading) return <div style={{ color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Loading profile...</div>;
  if (!profileData || !profileData.profile) return <div style={{ color: "#fff", padding: 40 }}>User not found</div>;

  const { profile, reels } = profileData;
  const isMe = currentUser.id === profile._id;
  const isFollowing = profile.followers.some(f => f._id === currentUser.id);

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
     {/* Header */}
      <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16, background: "rgba(0,0,0,0.5)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#f8fafc", fontSize: 24, cursor: "pointer" }}>←</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{profile.name}</h2>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
            @{profile.username || `user_${(profile.phoneNumber || "").split('@')[0]}`}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, boxShadow: "0 0 24px rgba(124,58,237,0.4)"
          }}>{profile.avatar || "👤"}</div>
          
          <div style={{ display: "flex", gap: 24, flex: 1, justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{reels.length}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Reels</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.followers.length}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Followers</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.following.length}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Following</div>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: 14, color: "#cbd5e1" }}>{profile.bio}</p>

       {!isMe ? (
          <button onClick={toggleFollow} style={{
            width: "100%", marginTop: 16, padding: "10px", borderRadius: 8, border: "none",
            background: isFollowing ? "rgba(255,255,255,0.1)" : "#7c3aed",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>
            {isFollowing ? "Following" : "Follow"}
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} style={{
            width: "100%", marginTop: 16, padding: "10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.2s"
          }}>
            Edit Profile
          </button>
        )}
      </div>

      {isEditing && (
        <EditProfileModal 
          user={profile} 
          onClose={() => setIsEditing(false)} 
          onSave={(updatedUser) => {
            // Instantly update the UI with new details
            setProfileData(prev => ({ ...prev, profile: { ...prev.profile, ...updatedUser } }));
            setIsEditing(false);
            if (onUpdateUser) onUpdateUser(updatedUser); // Update main app state
          }} 
        />
      )}

      {/* Video Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, paddingBottom: 120 }}>
        {reels.map(reel => (
          <div key={reel._id} style={{ aspectRatio: "9/16", background: "#1e293b", position: "relative" }}>
             <video src={reel.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
             <div style={{ position: "absolute", bottom: 4, left: 4, color: "#fff", fontSize: 11, background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4 }}>
                ▶ {reel.views || 0}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Search Screen ────────────────────────────────────────────────
function SearchScreen({ currentUser, onSelectProfile, onBack }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search?q=${val}`);
      setResults(res.data);
    } catch (err) { console.error("Search failed", err); }
    setLoading(false);
  };

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.5)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#f8fafc", fontSize: 24, cursor: "pointer" }}>←</button>
        <input autoFocus value={query} onChange={handleSearch} placeholder="Search by name or @username..." style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "10px 16px", color: "#fff", fontSize: 15, fontFamily: "'Outfit', sans-serif" }} />
      </div>
      
      <div style={{ padding: "10px 20px", paddingBottom: 120 }}>
        {loading && <div style={{ color: "#64748b", marginTop: 10, textAlign: "center", fontSize: 14 }}>Searching...</div>}
        {!loading && results.length === 0 && query.trim() !== "" && <div style={{ color: "#64748b", marginTop: 10, textAlign: "center", fontSize: 14 }}>No users found for "{query}"</div>}
        
        {results.map(user => (
          <div key={user._id} onClick={() => onSelectProfile(user._id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{user.avatar || "👤"}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc" }}>{user.name}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>@{user.username || "user"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chat & Inbox Screens ─────────────────────────────────────────
function InboxScreen({ currentUser, onSelectChat, onBack }) {
  const { data: friends, error } = useSWR(
    `http://localhost:5000/api/chat/inbox/list?currentUserId=${currentUser.id}`,
    url => axios.get(url, { headers: { useremail: currentUser.phone } }).then(res => res.data)
  );

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16, background: "rgba(0,0,0,0.5)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#f8fafc", fontSize: 24, cursor: "pointer" }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Messages</h2>
      </div>
      
    <div style={{ padding: "10px 20px", paddingBottom: 120 }}>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>People you follow</p>
        {!friends && !error && <div style={{ color: "#64748b" }}>Loading friends...</div>}
        {friends?.length === 0 && <div style={{ color: "#64748b" }}>Follow someone to start chatting!</div>}
        
        {friends?.map(friend => (
          <div key={friend._id} onClick={() => onSelectChat({ id: friend._id, name: friend.name, username: friend.username, avatar: friend.avatar })} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{friend.avatar || "👤"}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc" }}>{friend.name}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>@{friend.username}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatRoomScreen({ currentUser, targetUser, onBack }) {
  const [text, setText] = useState("");
  const endOfMessagesRef = useRef(null);

  // ⚡ THE SWR REAL-TIME HACK! (Polls every 1 second)
  const { data: messages = [], mutate } = useSWR(
    `http://localhost:5000/api/chat/${targetUser.id}?currentUserId=${currentUser.id}`,
    url => axios.get(url, { headers: { useremail: currentUser.phone } }).then(res => res.data),
    { refreshInterval: 1000 }
  );

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const tempMsg = { _id: Date.now(), sender: currentUser.id, receiver: targetUser.id, text, createdAt: new Date().toISOString() };
    mutate([...messages, tempMsg], false); // Optimistic UI update
    setText("");
    try {
      await axios.post("http://localhost:5000/api/chat/send", { senderId: currentUser.id, receiverId: targetUser.id, text });
      mutate(); // Trigger background sync
    } catch (err) { console.error("Failed to send", err); }
  };

  return (
    <div style={{ background: "#020617", height: "100vh", display: "flex", flexDirection: "column", color: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "rgba(8,15,35,0.9)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#f8fafc", fontSize: 24, cursor: "pointer", paddingRight: 8 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{targetUser.avatar || "👤"}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{targetUser.name}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>@{targetUser.username}</div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map(msg => {
          const isMe = msg.sender === currentUser.id;
          return (
            <div key={msg._id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px", background: isMe ? "linear-gradient(135deg, #7c3aed, #db2777)" : "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, lineHeight: 1.5, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: "16px 20px", background: "rgba(8,15,35,0.9)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 12, flexShrink: 0, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Message..." style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "12px 20px", color: "#fff", fontSize: 15, fontFamily: "'Outfit', sans-serif" }} />
        <button onClick={handleSend} disabled={!text.trim()} style={{ background: text.trim() ? "#7c3aed" : "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: text.trim() ? "pointer" : "default", fontSize: 18, color: "#fff", transition: "0.2s" }}>↑</button>
      </div>
    </div>
  );
}
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("reelstream_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Initialize to empty array since backend is handling real users
  const [allUsers, setAllUsers] = useState([]);
  const [currentReelIdx, setCurrentReelIdx] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  
 // Navigation State
  const [currentView, setCurrentView] = useState("feed"); // 'feed', 'profile', 'inbox', 'chat'
  const [viewProfileId, setViewProfileId] = useState(null);
  const [chatTarget, setChatTarget] = useState(null); // Who are we talking to?
  const containerRef = useRef(null);
  const fetchAndMeasure = async (url) => {
    const response = await axios.get(url);
    return response.data.map((dbReel) => {
      const creator = dbReel.creator || {};
      const creatorId = creator._id || dbReel.creator;
      return {
        id: dbReel._id, userId: creatorId, url: dbReel.videoUrl,
        caption: dbReel.caption || "", music: "Original Audio",
        likes: dbReel.likes || 0,
        comments: dbReel.comments ? dbReel.comments.map(c => ({
          id: c._id, userId: c.userId?._id || c.userId, user: c.userId,
          text: c.text, timestamp: new Date(c.createdAt).getTime(), likes: 0
        })) : [],
        shares: 0, views: Math.floor(Math.random() * 5000) + 100,
        timestamp: new Date(dbReel.createdAt).getTime(),
        _rawCreator: creator
      };
    });
  };

  const { data: reels = [], mutate: mutateReels } = useSWR(
    currentUser ? 'http://localhost:5000/api/reels' : null,
    fetchAndMeasure,
    {
      refreshInterval: 2000,
     onSuccess: (fetchedReels) => {
        const fetchedUsers = fetchedReels
          .map(reel => reel._rawCreator)
          .filter(creator => creator && creator._id)
          .map(creator => ({
            id: creator._id,
            name: creator.name || creator.phoneNumber,
            username: creator.username || `user_${(creator.phoneNumber || "").split('@')[0]}`, // 👈 Uses DB username
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
    }
  }, [currentReelIdx]);

  const handleLike = useCallback(async (reelId, action) => {
    mutateReels(prev => prev.map(r => {
      if (r.id === reelId) return { ...r, likes: action === 'unlike' ? Math.max(0, r.likes - 1) : r.likes + 1 };
      return r;
    }), false);
    try { await axios.put(`http://localhost:5000/api/reels/${reelId}/like`, { action }); }
    catch (error) { console.error("Failed to save like", error); }
  }, [mutateReels]);

  const handleComment = useCallback(async (reelId, comment) => {
    mutateReels(prev => prev.map(r => r.id === reelId ? { ...r, comments: [...r.comments, comment] } : r), false);
    try { await axios.post(`http://localhost:5000/api/reels/${reelId}/comment`, { userId: comment.userId, text: comment.text }); }
    catch (error) { console.error("Failed to save comment", error); }
  }, [mutateReels]);

  const handleShare = useCallback((reelId) => {
    mutateReels(prev => prev.map(r => r.id === reelId ? { ...r, shares: r.shares + 1 } : r), false);
  }, [mutateReels]);

  const handleDelete = useCallback(async (reelId) => {
    mutateReels(prev => prev.filter(r => r.id !== reelId), false);
    try {
      await axios.delete(`http://localhost:5000/api/reels/${reelId}`);
    } catch (error) { console.error("Failed to delete", error); }
  }, [mutateReels]);

  const handleUpload = useCallback((newReel) => {
    setAllUsers(prev => prev.some(u => u.id === currentUser.id) ? prev : [...prev, currentUser]);
    mutateReels(prev => [newReel, ...prev], false);
    setCurrentReelIdx(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [currentUser, mutateReels]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("reelstream_user", JSON.stringify(user));
    setAllUsers(prev => [...prev, user]);
  };

const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("reelstream_user");
  };

  // 👈 NEW: Sync profile changes to the rest of the app
  const handleUpdateUser = (updatedData) => {
    const newUser = { ...currentUser, name: updatedData.name, username: updatedData.username };
    setCurrentUser(newUser);
    localStorage.setItem("reelstream_user", JSON.stringify(newUser));
    setAllUsers(prev => prev.map(u => u.id === newUser.id ? { ...u, ...updatedData } : u));
  };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;

  const getUserForReel = (reel) => allUsers.find(u => u.id === reel.userId) || currentUser;

 return (
    <div style={{ width: "100%", height: "100vh", background: "#000", fontFamily: "'Outfit', sans-serif", position: "relative", overflow: "hidden" }}>
     {/* Dynamic Screen Routing */}
      {currentView === "search" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "#000", overflowY: "auto" }}>
          <SearchScreen currentUser={currentUser} onBack={() => setCurrentView("feed")} onSelectProfile={(userId) => { setViewProfileId(userId); setCurrentView("profile"); }} />
        </div>
      )}

      {currentView === "profile" && viewProfileId && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "#000", overflowY: "auto" }}>
          <ProfileScreen userId={viewProfileId} currentUser={currentUser} onBack={() => setCurrentView("feed")} onUpdateUser={handleUpdateUser} />
        </div>
      )}
      
      {currentView === "inbox" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "#000", overflowY: "auto" }}>
          <InboxScreen currentUser={currentUser} onBack={() => setCurrentView("feed")} onSelectChat={(user) => { setChatTarget(user); setCurrentView("chat"); }} />
        </div>
      )}

    {currentView === "chat" && chatTarget && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "#000", overflowY: "hidden" }}>
          <ChatRoomScreen currentUser={currentUser} targetUser={chatTarget} onBack={() => setCurrentView("inbox")} />
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes heartPop {
          0%  { transform: scale(0) rotate(-15deg); opacity: 1; }
          50% { transform: scale(1.4) rotate(5deg);  opacity: 1; }
          80% { transform: scale(1.1) rotate(0deg);  opacity: 1; }
          100%{ transform: scale(1.6) rotate(0deg);  opacity: 0; }
        }
        ::-webkit-scrollbar { display: none; }
        * { -webkit-font-smoothing: antialiased; }
        input, textarea, select, button { outline: none !important; font-family: 'Outfit', sans-serif; }
        input::placeholder, textarea::placeholder { color: #334155; }
      `}</style>

   {/* Minimal Top Header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(rgba(0,0,0,0.8) 0%, transparent 100%)", pointerEvents: "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 22, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>🎬</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>ReelStream</span>
        </div>
        <button onClick={handleLogout} style={{ pointerEvents: "auto", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sign out</button>
      </div>

    {/* Professional Mobile Bottom Navigation Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 150,
        background: "rgba(8, 15, 35, 0.95)", backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 24px max(12px, env(safe-area-inset-bottom))",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)"
      }}>
        <button onClick={() => setCurrentView("feed")} style={{ background: "none", border: "none", color: currentView === "feed" ? "#fff" : "#64748b", fontSize: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "0.2s" }}>
          🏠<span style={{ fontSize: 10, fontWeight: 600 }}>Home</span>
        </button>

        <button onClick={() => setCurrentView("search")} style={{ background: "none", border: "none", color: currentView === "search" ? "#fff" : "#64748b", fontSize: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "0.2s" }}>
          🔍<span style={{ fontSize: 10, fontWeight: 600 }}>Search</span>
        </button>

        <button onClick={() => setShowUpload(true)} style={{
          background: "linear-gradient(135deg, #7c3aed, #db2777)", border: "none",
          width: 52, height: 52, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, color: "#fff", cursor: "pointer", boxShadow: "0 8px 24px rgba(124,58,237,0.4)", transform: "translateY(-12px)"
        }}>➕</button>

        <button onClick={() => setCurrentView("inbox")} style={{ background: "none", border: "none", color: currentView === "inbox" ? "#fff" : "#64748b", fontSize: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "0.2s" }}>
          💬<span style={{ fontSize: 10, fontWeight: 600 }}>Inbox</span>
        </button>

        <button onClick={() => { setViewProfileId(currentUser.id); setCurrentView("profile"); }} style={{ background: "none", border: "none", color: currentView === "profile" && viewProfileId === currentUser.id ? "#fff" : "#64748b", fontSize: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "0.2s" }}>
          👤<span style={{ fontSize: 10, fontWeight: 600 }}>Profile</span>
        </button>
      </div>

      {/* Reels feed */}
      <div
        ref={containerRef} onScroll={handleScroll}
        style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory" }}
      >
        {reels.map((reel) => (
          <div key={reel.id} style={{
            height: "100vh", scrollSnapAlign: "start",
            scrollSnapStop: "always", position: "relative"
          }}>
            <ReelCard
              reel={reel}
              user={getUserForReel(reel)}
              currentUser={currentUser}
              allUsers={allUsers}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onDelete={handleDelete}
              onAvatarClick={(userId) => {
                setViewProfileId(userId);
                setCurrentView("profile");
              }}
            />
          </div>
        ))}

        {reels.length === 0 && (
          <div style={{
            height: "100vh", display: "flex",
            alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 16, color: "#334155"
          }}>
            <div style={{ fontSize: 48 }}>🎬</div>
            <p style={{ fontSize: 16, fontWeight: 500 }}>Loading reels…</p>
          </div>
        )}
      </div>

      {/* Reel counter pill */}
      <div style={{
        position: "fixed", top: 68, right: 20, zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
        borderRadius: 24, padding: "5px 14px",
        fontSize: 12, color: "#64748b",
        border: "0.5px solid rgba(255,255,255,0.07)",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.04em"
      }}>
        {currentReelIdx + 1} <span style={{ color: "#1e293b" }}>of</span> {reels.length}
      </div>

      {/* Dots indicator */}
      <div style={{
        position: "fixed", right: 7, top: "50%",
        transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 5, zIndex: 50
      }}>
        {reels.slice(0, 8).map((_, i) => (
          <div key={i} style={{
            width: 3,
            height: i === currentReelIdx ? 22 : 3,
            borderRadius: 2,
            background: i === currentReelIdx
              ? "#fff"
              : "rgba(255,255,255,0.2)",
            transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: i === currentReelIdx ? "0 0 6px rgba(255,255,255,0.6)" : "none"
          }} />
        ))}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} currentUser={currentUser} />}
    </div>
  );
}