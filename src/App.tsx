import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { User } from '@supabase/supabase-js'
import Home from './pages/Home'
import Login from './pages/Login'
import PostItem from './pages/PostItem'
import ItemDetail from './pages/ItemDetail'
import Navbar from './components/Navbar'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <main className="pb-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" /> : <Login />} 
            />
            <Route 
              path="/post" 
              element={user ? <PostItem /> : <Navigate to="/login" />} 
            />
            <Route path="/item/:id" element={<ItemDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

