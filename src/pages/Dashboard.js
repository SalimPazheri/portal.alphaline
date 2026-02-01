import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/')
      else setSession(session)
    })
  }, [navigate])

  if (!session) return null

  return (
    <div>
      <TopBar userEmail={session.user.email} />
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>Welcome, User</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
          <div onClick={() => navigate('/customers')} style={cardStyle}>
            <h3>👥 Customers</h3>
            <p>Manage list</p>
          </div>
          <div onClick={() => alert('Coming Soon')} style={cardStyle}>
            <h3>📄 Proposals</h3>
            <p>Create quotes</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const cardStyle = { padding: '30px', border: '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', width: '200px' }  