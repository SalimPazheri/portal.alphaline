
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Login Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  
  const availableCountries = ['Bahrain', 'UAE', 'KSA', 'Oman', 'Qatar', 'Kuwait', 'India']

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Authenticate
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // 2. Get Profile & Security Context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      if (profileError) throw profileError

      // 3. Security Check
      if (profile.role !== 'Super Admin' && !profile.allowed_countries?.includes(selectedCountry)) {
         throw new Error(`🚫 Access Denied! You are not authorized for ${selectedCountry}.`)
      }

      // 4. Log Activity
      await supabase.from('activity_logs').insert([{
        user_id: data.user.id, user_email: email, action_type: 'LOGIN',
        module: 'Auth', description: `Logged into ${selectedCountry}`, country_context: selectedCountry
      }])

      // 5. Save Session
      localStorage.setItem('active_country', selectedCountry)
      localStorage.setItem('user_role', profile.role)
      localStorage.setItem('user_name', profile.display_name)

      navigate('/') 

    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      
      {/* --- 1. NAVBAR --- */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 50px', maxWidth: '1200px', margin: '0 auto'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '24px' }}>🚢</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b', letterSpacing: '-0.5px' }}>
              ALPHALINE <span style={{color:'#10b981'}}>CARGO</span>
            </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => setShowLoginModal(true)}
              style={{ padding: '10px 25px', background: 'white', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Login
            </button>
            <button 
              onClick={() => alert("Registration is strictly by invitation only.")}
              style={{ padding: '10px 25px', background: '#10b981', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
            >
              Get Started
            </button>
        </div>
      </nav>

      {/* --- 2. HERO SECTION --- */}
      <div style={{ textAlign: 'center', padding: '80px 20px 40px' }}>
        <h1 style={{ fontSize: '56px', fontWeight: '900', color: '#0f172a', marginBottom: '20px', letterSpacing: '-1px' }}>
          Freight Management System
        </h1>
        <p style={{ fontSize: '20px', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Streamline your logistics operations with our comprehensive freight management platform.
        </p>
      </div>

      {/* --- 3. FEATURE GRID (Cards) --- */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px', padding: '40px', maxWidth: '1200px', margin: '0 auto' 
      }}>
        
        <FeatureCard icon="🌐" title="Global Reach" desc="Manage international shipments across multiple countries with ease and efficiency." />
        <FeatureCard icon="📄" title="Smart Proposals" desc="Create detailed freight proposals with automated calculations and professional formatting." />
        <FeatureCard icon="👥" title="Customer Management" desc="Keep track of all your customers and their shipping requirements in one place." />
        <FeatureCard icon="🛡️" title="Secure & Reliable" desc="Enterprise-grade security with role-based access control and data encryption." />
        <FeatureCard icon="📈" title="Real-time Updates" desc="Stay informed with live updates on shipments, proposals, and customer interactions." />
        <FeatureCard icon="🚛" title="Multiple Transport Modes" desc="Support for air, sea, and land freight with specialized tools for each mode." />

      </div>

      <div style={{textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:'12px'}}>
        © 2026 Alphaline Cargo. Made for the Future.
      </div>


      {/* --- 4. LOGIN MODAL (Hidden by default) --- */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', width: '400px', padding: '40px', borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative'
          }}>
            <button 
              onClick={() => setShowLoginModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
            >✖</button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
               <h2 style={{ margin: 0, color: '#0f172a' }}>Welcome Back</h2>
               <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Enter your credentials to access the portal.</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>WORK EMAIL</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="name@company.com" />
              </div>
              
              <div>
                <label style={labelStyle}>PASSWORD</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </div>

              <div>
                <label style={labelStyle}>SELECT BRANCH</label>
                <select required value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{...inputStyle, background:'white'}}>
                  <option value="">-- Choose Location --</option>
                  {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button disabled={loading} style={{
                marginTop: '10px', padding: '14px', borderRadius: '8px', border: 'none',
                background: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer'
              }}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}

// --- SUB COMPONENTS ---

const FeatureCard = ({ icon, title, desc }) => (
  <div style={{
    background: 'white', padding: '30px', borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0',
    transition: 'transform 0.2s', cursor: 'default'
  }}
  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ 
      width: '50px', height: '50px', background: '#d1fae5', color: '#059669', 
      borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '20px' 
    }}>
      {icon}
    </div>
    <h3 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '18px' }}>{title}</h3>
    <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>{desc}</p>
  </div>
)

const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'block' }

// ✅ FIXED: No cutoff here
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }