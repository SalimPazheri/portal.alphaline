import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Agents() {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Specific fields for People (Drivers/Agents)
  const initialForm = {
    id: null, 
    name: '', 
    nationality: '', 
    emirates_id: '', 
    mobile: '', 
    whatsapp: '', 
    email: ''
  }
  const [form, setForm] = useState(initialForm)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async (search = '') => {
    let query = supabase.from('master_agents').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    if (search) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    setItems(data || [])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    delete payload.id 

    if (isEditing) {
      await supabase.from('master_agents').update(payload).eq('id', form.id)
    } else {
      await supabase.from('master_agents').insert([payload])
    }
    fetchItems(searchTerm)
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this person?')) {
      await supabase.from('master_agents').update({ is_deleted: true }).eq('id', id)
      fetchItems(searchTerm)
    }
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>👤 Agents & Drivers</h2>
        <input type="text" placeholder="🔍 Search Name..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => { setForm(initialForm); setIsEditing(false); setShowModal(true) }} className="btn btn-primary">+ Add New</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name / Nationality</th>
              <th>Emirates ID</th>
              <th>Contact Info</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{fontWeight:'bold', color:'#0f172a'}}>{item.name}</div>
                  <small style={{color:'#64748b'}}>{item.nationality}</small>
                </td>
                <td style={{fontFamily:'monospace', color:'#334155'}}>{item.emirates_id}</td>
                <td>
                    {item.mobile && <div>📞 {item.mobile}</div>}
                    {item.whatsapp && <div style={{fontSize:'11px', color:'#16a34a'}}>💬 {item.whatsapp}</div>}
                    {item.email && <div style={{fontSize:'11px', color:'#007bff'}}>✉️ {item.email}</div>}
                </td>
                <td>
                   <span onClick={() => { setForm(item); setIsEditing(true); setShowModal(true) }} className="icon-action">📝</span>
                   <span onClick={() => handleDelete(item.id)} className="icon-action" style={{color:'red'}}>🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'500px'}}>
            <div className="modal-header"><h3>{isEditing ? 'Edit Person' : 'Add Person'}</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                
                <div style={{gridColumn:'span 2'}}><span className="form-label">Full Name *</span><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" /></div>
                
                <div><span className="form-label">Nationality</span><input value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Emirates ID / National ID</span><input value={form.emirates_id} onChange={e => setForm({...form, emirates_id: e.target.value})} className="form-input" placeholder="XXX-XXXX-XXXXXXX-X" /></div>

                <div><span className="form-label">Mobile</span><input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">WhatsApp</span><input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="form-input" /></div>
                
                <div style={{gridColumn:'span 2'}}><span className="form-label">Email</span><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="form-input" /></div>

              </div>
              <button className="btn btn-primary" style={{marginTop:'20px', width:'100%'}}>Save Person</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}