// src/pages/Login.jsx
// Handles both Login and Signup + Google OAuth
// Drop this file into your frontend/src/pages/ folder.

import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

export default function Login({ onLogin }) {
  const [mode, setMode]       = useState("login")   // "login" | "signup"
  const [name, setName]       = useState("")
  const [email, setEmail]     = useState("")
  const [password, setPass]   = useState("")
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  // ── Email / password submit ──────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup"
      const payload  = mode === "login"
        ? { email, password }
        : { name, email, password }

      const { data } = await axios.post(API + endpoint, payload)
      localStorage.setItem("token",      data.access_token)
      localStorage.setItem("user_name",  data.user_name)
      localStorage.setItem("user_email", data.user_email)
      onLogin(data)
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth ─────────────────────────────────────────
  async function handleGoogle() {
    setError("")
    try {
      const { data } = await axios.get(API + "/auth/google/url")
      window.location.href = data.url   // redirect to Google consent screen
    } catch {
      setError("Google login not configured yet. Use email/password for now.")
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoMark}></div>
          <span style={styles.logoText}>Day<b style={{color:"#a0a3ff"}}>nex</b><span style={{color:"#5a5a78",fontWeight:400,fontSize:13}}>.ai</span></span>
        </div>
        <p style={styles.tagline}>Your AI productivity assistant</p>

        {/* Tab toggle */}
        <div style={styles.tabs}>
          <button style={mode==="login"  ? styles.tabOn : styles.tabOff} onClick={()=>{setMode("login");setError("")}}>Log in</button>
          <button style={mode==="signup" ? styles.tabOn : styles.tabOff} onClick={()=>{setMode("signup");setError("")}}>Sign up</button>
        </div>

        {/* Google button */}
        <button style={styles.googleBtn} onClick={handleGoogle}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={styles.divider}><span style={styles.dividerText}>or continue with email</span></div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:10}}>
          {mode === "signup" && (
            <input
              style={styles.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e=>setName(e.target.value)}
              required
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e=>setPass(e.target.value)}
            required
            minLength={6}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span style={styles.switchLink} onClick={()=>{setMode(mode==="login"?"signup":"login");setError("")}}>
            {mode === "login" ? "Sign up" : "Log in"}
          </span>
        </p>

      </div>
    </div>
  )
}

// ── Tiny Google SVG icon ─────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{marginRight:8,flexShrink:0}}>
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.7 39.7 16.4 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  page: {
    minHeight:"100vh", background:"#0d0d14",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:"'Outfit',sans-serif", padding:16,
  },
  card: {
    background:"#161622", border:"1px solid #2e2e44",
    borderRadius:18, padding:"32px 28px", width:"100%", maxWidth:400,
  },
  logo: {
    display:"flex", alignItems:"center", gap:10, marginBottom:6, justifyContent:"center",
  },
  logoMark: {
    width:36, height:36, borderRadius:10, background:"#5b5fef",
    position:"relative", flexShrink:0,
    boxShadow:"0 0 0 3px rgba(91,95,239,.2)",
  },
  logoText: {
    fontSize:22, fontWeight:700, letterSpacing:"-.4px", color:"#e4e4f0",
  },
  tagline: {
    textAlign:"center", fontSize:13, color:"#5a5a78", marginBottom:22,
  },
  tabs: {
    display:"flex", background:"#1e1e2e", borderRadius:10,
    padding:4, marginBottom:18, gap:4,
  },
  tabOn: {
    flex:1, padding:"7px 0", borderRadius:7, border:"none",
    background:"#26263a", color:"#e4e4f0", fontWeight:600,
    fontSize:13.5, cursor:"pointer", fontFamily:"'Outfit',sans-serif",
  },
  tabOff: {
    flex:1, padding:"7px 0", borderRadius:7, border:"none",
    background:"transparent", color:"#5a5a78", fontWeight:500,
    fontSize:13.5, cursor:"pointer", fontFamily:"'Outfit',sans-serif",
  },
  googleBtn: {
    width:"100%", padding:"10px 0", borderRadius:10,
    border:"1px solid #3a3a52", background:"#1e1e2e",
    color:"#c8c8e0", fontSize:13.5, fontWeight:500,
    cursor:"pointer", display:"flex", alignItems:"center",
    justifyContent:"center", fontFamily:"'Outfit',sans-serif",
    transition:"background .15s", marginBottom:16,
  },
  divider: {
    display:"flex", alignItems:"center", gap:10, marginBottom:16,
  },
  dividerText: {
    fontSize:12, color:"#3a3a52", whiteSpace:"nowrap",
    padding:"0 8px", background:"#161622",
    margin:"0 auto", position:"relative",
  },
  input: {
    width:"100%", background:"#1e1e2e", border:"1px solid #2e2e44",
    borderRadius:9, padding:"10px 13px", color:"#e4e4f0",
    fontFamily:"'Outfit',sans-serif", fontSize:13.5, outline:"none",
  },
  error: {
    background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
    borderRadius:8, padding:"9px 12px", fontSize:12.5, color:"#f87171",
  },
  submitBtn: {
    width:"100%", padding:"11px 0", borderRadius:10, border:"none",
    background:"#5b5fef", color:"white", fontSize:14, fontWeight:600,
    cursor:"pointer", fontFamily:"'Outfit',sans-serif", marginTop:2,
  },
  switchText: {
    textAlign:"center", fontSize:13, color:"#5a5a78", marginTop:16,
  },
  switchLink: {
    color:"#a0a3ff", cursor:"pointer", fontWeight:600,
  },
}
