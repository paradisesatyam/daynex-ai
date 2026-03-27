import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    const name  = localStorage.getItem('user_name')
    return token ? { token, name } : null
  })

  function handleLogin(data) {
    setUser(data)
  }

  function handleLogout() {
    localStorage.clear()
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/*"
          element={user
            ? <Dashboard user={user} onLogout={handleLogout} />
            : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App