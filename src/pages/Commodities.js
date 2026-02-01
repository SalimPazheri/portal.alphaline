import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Commodities() {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const initialForm = { id: null, name: '', description: '', packing_type: 'Palletized' }
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

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>📦 Commodities</h2>
        <input type="text" placeholder="🔍 Search..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => { setForm(initialForm); setIsEditing(false); setShowModal(true) }} className="btn btn-primary">+ Add New</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Description</th><th>Packing</th><th>Action</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><b>{item.name}</b></td>
                <td>{item.description}</td>
                <td><span className="status-badge" style={{background:'#e0f2fe', color:'#0369a1'}}>{item.packing_type}</span></td>
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
          <div className="modal-content">
            <div className="modal-header"><h3>{isEditing ? 'Edit' : 'Add'} Commodity</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div style={{gridColumn:'span 2'}}><span className="form-label">Name *</span><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Packing</span>
                    <select value={form.packing_type} onChange={e => setForm({...form, packing_type: e.target.value})} className="form-input">
                        <option>Palletized</option><option>Units</option><option>Crates</option><option>Pieces</option><option>Box</option><option>Loose / Bulk</option>
                    </select>
                </div>
                <div style={{gridColumn:'span 2'}}><span className="form-label">Description</span><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="form-input" /></div>
              </div>
              <button className="btn btn-primary" style={{marginTop:'20px', width:'100%'}}>Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}