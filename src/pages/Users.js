import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SystemUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  // Form State
  const [formData, setFormData] = useState({
    role: 'Staff',
    status: 'Active',
    allowed_countries: []
  })

  // Master Data
  const allCountries = ['Bahrain', 'UAE', 'KSA', 'Oman', 'Qatar', 'Kuwait', 'India']
  const roles = ['Super Admin', 'Country Admin', 'Branch Manager', 'Staff', 'Accounts']

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching users:', error)
    else setUsers(data || [])
    setLoading(false)
  }

  // --- HANDLERS ---
  
  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      role: user.role || 'Staff',
      status: user.status || 'Active',
      allowed_countries: user.allowed_countries || []
    })
    setShowModal(true)
  }

  const handleCountryToggle = (country) => {
    const currentList = formData.allowed_countries
    if (currentList.includes(country)) {
      // Remove it
      setFormData({ ...formData, allowed_countries: currentList.filter(c => c !== country) })
    } else {
      // Add it
      setFormData({ ...formData, allowed_countries: [...currentList, country] })
    }
  }

  const handleSave = async () => {
    if (!editingUser) return

    const { error } = await supabase
      .from('profiles')
      .update({
        role: formData.role,
        status: formData.status,
        allowed_countries: formData.allowed_countries
      })
      .eq('id', editingUser.id)

    if (error) {
      alert("Error updating user: " + error.message)
    } else {
      // Log this action (Audit Trail)
      await supabase.from('activity_logs').insert([{
        action_type: 'UPDATE',
        module: 'System Users',
        description: `Updated permissions for ${editingUser.email}`,
        country_context: 'System' // Admin action
      }])
      
      setShowModal(false)
      fetchUsers()
    }
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <div>
           <h2 style={{margin:0}}>👥 User Management</h2>
           <p style={{margin:'5px 0 0', fontSize:'12px', color:'#64748b'}}>
             Manage access rights, roles, and country permissions.
           </p>
        </div>
        <button onClick={() => alert("To add a new user, ask them to Sign Up on the Login page. Once registered, they will appear here for approval.")} className="btn btn-primary">
          + Invite User
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>User / Email</th>
              <th>Role</th>
              <th>Allowed Countries</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>⏳ Loading Profiles...</td></tr>}
            
            {!loading && users.length === 0 && (
                <tr><td colSpan="5" style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>No users found. (Did you sign up yet?)</td></tr>
            )}

            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{fontWeight:'bold', color:'#0f172a'}}>{user.display_name || 'Unknown'}</div>
                  <div style={{fontSize:'11px', color:'#64748b'}}>{user.email}</div>
                </td>
                <td>
                  <span className="status-badge" style={{
                    background: user.role === 'Super Admin' ? '#fee2e2' : '#e0f2fe',
                    color: user.role === 'Super Admin' ? '#b91c1c' : '#0369a1'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.allowed_countries && user.allowed_countries.length > 0 ? (
                    <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                      {user.allowed_countries.map(c => (
                        <span key={c} style={{fontSize:'10px', background:'#f1f5f9', border:'1px solid #e2e8f0', padding:'2px 6px', borderRadius:'4px'}}>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{color:'#ef4444', fontSize:'11px'}}>⚠️ No Access</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${user.status === 'Active' ? 'green' : 'red'}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleEdit(user)} className="btn btn-secondary" style={{fontSize:'12px', padding:'5px 10px'}}>
                    ⚙️ Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PERMISSION MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'500px'}}>
            <div className="modal-header">
              <h3>Manage Access: {editingUser?.display_name}</h3>
              <button onClick={() => setShowModal(false)} className="btn-close">✖</button>
            </div>

            <div className="modal-body">
              <div className="form-grid" style={{gridTemplateColumns:'1fr', gap:'15px'}}>
                
                {/* ROLE SELECTOR */}
                <div>
                  <span className="form-label">System Role</span>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="form-input"
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <p style={{fontSize:'11px', color:'#64748b', marginTop:'5px'}}>
                    * Super Admins can access everything regardless of country selection.
                  </p>
                </div>

                {/* COUNTRY CHECKBOXES */}
                <div>
                  <span className="form-label">Allowed Countries (Access Control)</span>
                  <div style={{
                    display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', 
                    marginTop:'5px', padding:'10px', background:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0'
                  }}>
                    {allCountries.map(country => (
                      <label key={country} style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', cursor:'pointer'}}>
                        <input 
                          type="checkbox" 
                          checked={formData.allowed_countries.includes(country)} 
                          onChange={() => handleCountryToggle(country)}
                          style={{accentColor:'#2563eb'}}
                        />
                        {country}
                      </label>
                    ))}
                  </div>
                </div>

                {/* STATUS TOGGLE */}
                <div>
                  <span className="form-label">Account Status</span>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="form-input"
                  >
                    <option value="Active">Active (Can Login)</option>
                    <option value="Suspended">Suspended (Blocked)</option>
                  </select>
                </div>

              </div>
            </div>

            <div className="modal-footer" style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px'}}>
               <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
               <button onClick={handleSave} className="btn btn-primary">💾 Save Permissions</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}