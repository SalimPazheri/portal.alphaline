import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Users() {
  const [users, setUsers] = useState([])
  const [countries, setCountries] = useState([]) // Store Master Countries
  const [currentUserRole, setCurrentUserRole] = useState('') 
  const [searchTerm, setSearchTerm] = useState('')

  // --- MODAL STATE ---
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const initialFormState = {
    full_name: '', 
    user_email: '', 
    mobile: '', 
    role: 'Staff', 
    department: 'Sales', 
    status: 'Active',
    assigned_country: '' // New Field
  }
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    checkCurrentUser()
    fetchUsers()
    fetchCountries() // Fetch the list for the dropdown
  }, [])

  // 1. Check who is logged in
  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_email', user.email)
        .maybeSingle()
      
      if (data && data.role) {
        setCurrentUserRole(data.role.trim())
      }
    }
  }

  // 2. Load Users
  const fetchUsers = async (query = '') => {
    let supabaseQuery = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (query.length > 0) {
      supabaseQuery = supabaseQuery.or(`full_name.ilike.%${query}%,user_email.ilike.%${query}%`)
    }

    const { data, error } = await supabaseQuery
    if (error) console.error(error)
    else setUsers(data || [])
  }

  // 3. Load Countries for Dropdown
  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name', { ascending: true })
    if (data) setCountries(data)
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    fetchUsers(e.target.value)
  }

  // --- HANDLERS ---
  const openNewModal = () => {
    setIsEditing(false)
    setFormData(initialFormState)
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setIsEditing(true)
    setEditingId(user.id)
    setFormData({
      ...user,
      assigned_country: user.assigned_country || '' // Handle nulls safely
    })
    setShowModal(true)
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.user_email.includes('@')) return alert("Invalid Email")
    if (!formData.assigned_country) return alert("Please assign a country (or select 'All').")

    if (isEditing) {
      const { error } = await supabase.from('user_profiles').update(formData).eq('id', editingId)
      if (error) alert(error.message)
    } else {
      // Check duplicate
      const { data: existing } = await supabase.from('user_profiles').select('id').eq('user_email', formData.user_email).maybeSingle()
      if (existing) return alert("User with this email already exists.")

      const { error } = await supabase.from('user_profiles').insert([formData])
      if (error) alert(error.message)
    }
    fetchUsers(searchTerm)
    setShowModal(false)
  }

  const getRoleColor = (role) => {
    if (role === 'Super Admin') return '#7c3aed' 
    if (role === 'Manager') return '#007bff'
    return '#6c757d'
  }

  // --- SECURITY CHECK ---
  if (currentUserRole !== 'Super Admin') {
    return (
      <div className="page-container" style={{textAlign:'center', marginTop:'50px'}}>
        <h2 style={{color:'#dc3545'}}>⛔ Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <small style={{color:'#666'}}>Required Role: Super Admin<br/>Your Role: {currentUserRole || 'None'}</small>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0, fontSize:'20px'}}>🔐 User Management</h2>
        <input type="text" placeholder="🔍 Search Name or Email..." value={searchTerm} onChange={handleSearch} className="search-bar" />
        <button onClick={openNewModal} className="btn btn-primary">+ Add User</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:'25%'}}>Name & Email</th>
              <th>Role & Department</th>
              <th>Assigned Country</th>
              <th>Status</th>
              <th style={{textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.status === 'Suspended' ? 0.5 : 1 }}>
                <td>
                  <div style={{fontWeight:'bold', color:'#334155'}}>{u.full_name}</div>
                  <div style={{fontSize:'11px', color:'#007bff'}}>{u.user_email}</div>
                </td>
                <td>
                  <span className="status-badge" style={{ backgroundColor: getRoleColor(u.role), marginRight:'5px' }}>{u.role}</span>
                  <span style={{fontSize:'12px', color:'#555'}}>{u.department}</span>
                </td>
                <td>
                  {u.assigned_country === 'All' 
                    ? <span style={{fontWeight:'bold', color:'#0f172a'}}>🌍 All Countries (HQ)</span>
                    : u.assigned_country
                  }
                </td>
                <td>
                  <span className="status-badge" style={{ backgroundColor: u.status === 'Active' ? '#28a745' : '#dc3545' }}>
                    {u.status}
                  </span>
                </td>
                <td style={{textAlign:'center'}}>
                   <span onClick={() => openEditModal(u)} className="icon-action" title="Edit Rights">📝 Modify</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'500px'}}>
            <div className="modal-header">
              <h3>{isEditing ? 'Modify User Rights' : 'Add New User'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-close">✖</button>
            </div>
            <form onSubmit={handleSubmit}>
              
              <div className="form-grid">
                <div style={{gridColumn:'span 2'}}>
                    <span className="form-label">Full Name</span>
                    <input name="full_name" value={formData.full_name} onChange={handleChange} className="form-input" required />
                </div>
                <div style={{gridColumn:'span 2'}}>
                    <span className="form-label">Login Email (Must match Supabase Login)</span>
                    <input name="user_email" value={formData.user_email} onChange={handleChange} className="form-input" required disabled={isEditing} />
                </div>
                <div>
                    <span className="form-label">Mobile</span>
                    <input name="mobile" value={formData.mobile} onChange={handleChange} className="form-input" />
                </div>
                <div>
                    <span className="form-label">Account Status</span>
                    <select name="status" value={formData.status} onChange={handleChange} className="form-input">
                        <option>Active</option>
                        <option>Suspended</option>
                    </select>
                </div>
              </div>

              <div className="admin-panel">
                <h4 style={{marginTop:0, marginBottom:'10px', color:'#007bff'}}>Access Control & Tenancy</h4>
                
                <div className="form-grid">
                    <div>
                        <span className="form-label">Role (Level)</span>
                        <select name="role" value={formData.role} onChange={handleChange} className="form-input">
                            <option>Super Admin</option>
                            <option>Manager</option>
                            <option>Staff</option>
                        </select>
                    </div>
                    <div>
                        <span className="form-label">Department</span>
                        <select name="department" value={formData.department} onChange={handleChange} className="form-input">
                            <option>Management</option>
                            <option>Sales</option>
                            <option>Pricing</option>
                            <option>Operations</option>
                            <option>Accounts</option>
                            <option>HR</option>
                            <option>IT</option>
                        </select>
                    </div>

                    {/* NEW: COUNTRY ASSIGNMENT */}
                    <div style={{gridColumn: 'span 2'}}>
                      <span className="form-label" style={{color:'#d97706'}}>📍 Assigned Country (Data Access)</span>
                      <select name="assigned_country" value={formData.assigned_country} onChange={handleChange} className="form-input" required>
                        <option value="">-- Select Country Access --</option>
                        <option value="All">🌍 All Countries (Head Office / Super Admin)</option>
                        <optgroup label="Specific Country Access">
                          {countries.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </optgroup>
                      </select>
                      <small style={{fontSize:'10px', color:'#666'}}>
                        User will ONLY see customers and records from this country.
                      </small>
                    </div>
                </div>

                <div style={{marginTop:'15px', padding:'10px', background:'#e0f2fe', borderRadius:'5px', fontSize:'12px', color:'#0284c7'}}>
                  <strong>ℹ️ How to onboard this user:</strong><br/>
                  1. Save this profile to assign rights & country.<br/>
                  2. Ask user to <strong>Sign Up</strong> using this exact email.<br/>
                  3. System will auto-link them to these permissions.
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button type="submit" className="btn btn-primary">Save User Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}