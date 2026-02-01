import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Equipment() {
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Specific fields for Equipment/Trailers
  const initialForm = {
    id: null, 
    equipment_type: 'Own Asset', // or Leased
    category: '40ft Flat Bed', 
    reg_no: '',
    no_axles: '', 
    payload_capacity: '', 
    length: '', 
    width: '',
    status: 'Active'
  }
  const [form, setForm] = useState(initialForm)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async (search = '') => {
    let query = supabase.from('fleet_equipment').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    if (search) query = query.ilike('reg_no', `%${search}%`)
    const { data } = await query
    setItems(data || [])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    delete payload.id // Standard safety: remove ID so database generates it

    if (isEditing) {
      await supabase.from('fleet_equipment').update(payload).eq('id', form.id)
    } else {
      await supabase.from('fleet_equipment').insert([payload])
    }
    fetchItems(searchTerm)
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      await supabase.from('fleet_equipment').update({ is_deleted: true }).eq('id', id)
      fetchItems(searchTerm)
    }
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>🚜 Fleet: Equipment & Trailers</h2>
        <input type="text" placeholder="🔍 Search Reg No..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => { setForm(initialForm); setIsEditing(false); setShowModal(true) }} className="btn btn-primary">+ Add Equipment</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Category</th>
              <th>Dimensions</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={{fontWeight:'bold'}}>{item.reg_no}</td>
                <td>
                    <div style={{fontWeight:'bold', color:'#0f172a'}}>{item.category}</div>
                    <small style={{color:'#64748b'}}>{item.equipment_type}</small>
                </td>
                <td style={{fontSize:'12px'}}>
                    📏 {item.length || '-'} x {item.width || '-'}<br/>
                    ⚖️ {item.payload_capacity} Tons
                </td>
                <td>
                    <span className="status-badge" style={{background: item.status === 'Active' ? '#dcfce7' : '#fee2e2', color: item.status === 'Active' ? '#166534' : '#991b1b'}}>
                        {item.status}
                    </span>
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
          <div className="modal-content" style={{width:'600px'}}>
            <div className="modal-header"><h3>{isEditing ? 'Edit Equipment' : 'Add Equipment'}</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                
                <div><span className="form-label">Reg No. *</span><input required value={form.reg_no} onChange={e => setForm({...form, reg_no: e.target.value})} className="form-input" /></div>
                
                <div><span className="form-label">Ownership</span>
                    <select value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} className="form-input">
                        <option>Own Asset</option><option>Leased</option><option>Driver Owned</option>
                    </select>
                </div>

                <div style={{gridColumn:'span 2'}}><span className="form-label">Category *</span>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="form-input">
                        <option>40ft Flat Bed</option>
                        <option>20ft Flat Bed</option>
                        <option>13.6m Reefer</option>
                        <option>13.6m Curtain Side</option>
                        <option>Low Bed</option>
                        <option>Hydraulic Low Bed</option>
                        <option>Box Trailer</option>
                    </select>
                </div>

                <div><span className="form-label">Length (m)</span><input value={form.length} onChange={e => setForm({...form, length: e.target.value})} className="form-input" placeholder="e.g. 13.6m" /></div>
                <div><span className="form-label">Width (m)</span><input value={form.width} onChange={e => setForm({...form, width: e.target.value})} className="form-input" placeholder="e.g. 2.5m" /></div>

                <div><span className="form-label">No. Axles</span><input value={form.no_axles} onChange={e => setForm({...form, no_axles: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Payload (Tons)</span><input value={form.payload_capacity} onChange={e => setForm({...form, payload_capacity: e.target.value})} className="form-input" /></div>
                
                <div><span className="form-label">Status</span>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="form-input">
                        <option>Active</option><option>Maintenance</option><option>Sold</option>
                    </select>
                </div>

              </div>
              <button className="btn btn-primary" style={{marginTop:'20px', width:'100%'}}>Save Equipment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}