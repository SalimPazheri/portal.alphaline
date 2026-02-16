import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Loader2, LogIn } from 'lucide-react'
import LoginBg from '../assets/login-bg2.png'; 

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        // 1. Check if this is the first user
        const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
        const isFirstUser = count === 0

        // 2. Sign Up the new user
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { 
            data: { full_name: fullName, mobile: mobile },
            // Ensures the session doesn't automatically swap on the current client
            emailRedirectTo: window.location.origin 
          } 
        })
        if (authError) throw authError

        // 3. Insert Profile
        const { error: profileError } = await supabase.from('user_profiles').insert([{
            id: authData.user.id,
            full_name: fullName,
            mobile: mobile,
            role: isFirstUser ? 'Super Admin' : 'Staff',
            is_active: isFirstUser ? true : false,
            branch_id: null
        }])
        if (profileError) throw profileError

        if (isFirstUser) {
          navigate('/super-settings')
        } else {
          // IMPORTANT: Alert and reset the form. 
          // Do NOT navigate to dashboard here, as the new user is inactive.
          alert("Success! Verification email sent. Please ask the user to verify. You may need to re-login as Admin if the session swapped.");
          setIsSignUp(false);
          setEmail('');
          setPassword('');
        }
      } else {
        // SIGN IN LOGIC
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const { data: profile } = await supabase.from('user_profiles')
          .select('role, is_active')
          .eq('id', data.user.id)
          .single()

        if (!profile?.is_active) {
          await supabase.auth.signOut()
          throw new Error("Account is pending activation. Please contact Salim Pazheri.")
        }

        // Route based on role
        if (profile.role === 'Super Admin') {
          navigate('/dashboard')
        } else {
          navigate('/dashboard')
        }
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', border: 'none', outline: 'none', padding: '12px', fontSize: '14px', color: '#1e293b' }
  const buttonStyle = { marginTop: '10px', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden' }}>
      
      {/* LEFT HALF: Branding */}
      <div style={{ width: '50vw', background: '#1e3a8a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', padding: '40px' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: '900', margin: 0 }}>Move+</h1>
          <h2 style={{ fontSize: '1.2rem', opacity: 0.8 }}>Alpha Line Cargo L.L.C.</h2>
      </div>

      {/* RIGHT HALF: Form Container with Background */}
      <div style={{ 
        width: '50vw', display: 'flex', justifyContent: 'center', alignItems: 'center', 
        backgroundImage: `url(${LoginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' 
      }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.98)', padding: '40px', borderRadius: '16px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
          <h2 style={{ color: '#1e293b', margin: '0 0 20px 0', textAlign: 'center' }}>{isSignUp ? 'Staff Registration' : 'Sign In'}</h2>
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {isSignUp && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <User size={18} color="#94a3b8" />
                  <input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required style={inputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <Phone size={18} color="#94a3b8" />
                  <input type="tel" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} required style={inputStyle} />
                </div>
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <Mail size={18} color="#94a3b8" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <Lock size={18} color="#94a3b8" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>
            
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isSignUp ? <User size={20} /> : <LogIn size={20} />}
                  {isSignUp ? 'Request Access' : 'Login to Portal'}
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
            <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#2563eb', fontWeight: 'bold', cursor: 'pointer' }}>
              {isSignUp ? '← Back to Sign In' : 'New Staff? Register Here'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}