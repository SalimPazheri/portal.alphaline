import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Commodities() {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // ✅ Added 'category' to state
  const initialForm = { id: null, category: 'General Cargo', name: '', description: '', packing_type: 'Palletized' }
  const [form, setForm] = useState(initialForm)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async (search = '') => {
    let query = supabase.from('master_commodities').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    if (search) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    setItems(data || [])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }; delete payload.id 

    if (isEditing) await supabase.from('master_commodities').update(payload).eq('id', form.id)
    else await supabase.from('master_commodities').insert([payload])
    
    fetchItems(searchTerm); setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete commodity?')) {
      await supabase.from('master_commodities').update({ is_deleted: true }).eq('id', id)
      fetchItems(searchTerm)
    }
  }

  // Helper to open modal cleanly
  const openModal = (item = null) => {
      if(item) { setForm(item); setIsEditing(true); }
      else { setForm(initialForm); setIsEditing(false); }
      setShowModal(true);
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>📦 Commodities</h2>
        <input type="text" placeholder="🔍 Search..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => openModal()} className="btn btn-primary">+ Add New</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>Category</th><th>Name</th><th>Packing</th><th>Action</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><span style={{fontSize:'11px', color:'#64748b'}}>{item.category || 'General'}</span></td>
                <td><b>{item.name}</b><br/><small style={{color:'#94a3b8'}}>{item.description}</small></td>
                <td><span className="status-badge" style={{background:'#e0f2fe', color:'#0369a1'}}>{item.packing_type}</span></td>
                <td>
                   <span onClick={() => openModal(item)} className="icon-action">📝</span>
                   <span onClick={() => handleDelete(item.id)} className="icon-action" style={{color:'red'}}>🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'500px', maxWidth:'95%'}}>
            <div className="modal-header"><h3>{isEditing ? 'Edit' : 'Add'} Commodity</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            
            <div className="modal-body">
                {/* CENTERED FORM GRID */}
                <div className="form-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '15px',
                      maxWidth: '450px',
                      margin: '0 auto' 
                }}>
                    
                    {/* 1. NEW CATEGORY DROPDOWN */}
                    <div style={{gridColumn:'span 2'}}>
                        <span className="form-label">Category</span>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="form-input">
                            <option>General Cargo</option>
                            <option>Industrial</option>
                            <option>FMCG</option>
                            <option>Pharma</option>
                            <option>Chemical / DG</option>
                            <option>Perishables</option>
                            <option>Automotive</option>
                        </select>
                    </div>

                    <div style={{gridColumn:'span 2'}}>
                        <span className="form-label">Commodity Name *</span>
                        <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" />
                    </div>
                    
                    <div style={{gridColumn:'span 2'}}>
                        <span className="form-label">Default Packing</span>
                        <select value={form.packing_type} onChange={e => setForm({...form, packing_type: e.target.value})} className="form-input">
                            <option>Palletized</option>
                            <option>Units</option>
                            <option>Crates</option>
                            <option>Pieces</option>
                            <option>Box</option>
                            <option>Loose / Bulk</option>
                        </select>
                    </div>
                    
                    <div style={{gridColumn:'span 2'}}>
                        <span className="form-label">Description</span>
                        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="form-input" rows="2" />
                    </div>
                </div>
            </div>

            {/* 2. FIXED BUTTONS: Normal size, Right Aligned */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop:'20px' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '8px 20px' }}>Cancel</button>
                <button onClick={handleSave} className="btn btn-primary" style={{ padding: '8px 20px' }}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}