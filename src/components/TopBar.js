import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Changed function name to TopBar
export default function TopBar({ userEmail }) {
  const navigate = useNavigate()
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', borderBottom: '1px solid #ddd', background: 'white' }}>
      <div style={{ fontWeight: 'bold' }}>🚛 Alpha Line Cargo</div>
      <div>
        <span style={{ marginRight: '15px' }}>{userEmail}</span>
        <button onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  )
}