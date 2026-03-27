// src/pages/GoogleCallback.jsx
// Google redirects the user to  /auth/callback?code=...
// This page grabs the code, sends it to our backend, then logs the user in.
// Add this route in App.jsx:  <Route path="/auth/callback" element={<GoogleCallback onLogin={handleLogin}/>} />

import { useEffect, useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

export default function GoogleCallback({ onLogin }) {
  const [status, setStatus] = useState("Signing you in with Google…")

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")
    if (!code) { setStatus("No auth code found. Please try again."); return }

    axios.post(API + "/auth/google/callback", { code })
      .then(({ data }) => {
        localStorage.setItem("token",      data.access_token)
        localStorage.setItem("user_name",  data.user_name)
        localStorage.setItem("user_email", data.user_email)
        onLogin(data)
      })
      .catch(() => setStatus("Google sign-in failed. Please try again."))
  }, [])

  return (
    <div style={{
      minHeight:"100vh", background:"#0d0d14", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Outfit',sans-serif", color:"#9898b8", fontSize:15,
    }}>
      {status}
    </div>
  )
}
