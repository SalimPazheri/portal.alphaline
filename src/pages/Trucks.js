import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Trucks() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([]) // Store Master Countries
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const initialForm = {
    id: null, 
    truck_type: 'Own Asset', 
    make: '', 
    model: '', 
    reg_no: '',
    registered_country: '', 
    reg_issue_date: '', 
    reg_expiry_date: '',
    insurance_policy_no: '', 
    insurance_issue_date: '', 
    insurance_expiry_date: '',
    no_axles: '', 
    payload_capacity: '',
    owner_name: '', 
    owner_mobile: '', 
    owner_email: ''
  }
  const [form, setForm] = useState(initialForm)

  // Standard Truck Manufacturers List
  const truckMakes = [
    "Mercedes-Benz", "Volvo", "Scania", "MAN", "Renault", "DAF", "Iveco", // European
    "Hino", "Isuzu", "Mitsubishi Fuso", "Nissan / UD", // Japanese
    "Tata", "Ashok Leyland", // Indian
    "Sinotruk", "Shacman", "FAW", // Chinese
    "Kenworth", "Peterbilt", "Freightliner", "Mack", // American
    "Other"
  ]

  useEffect(() => { 
    fetchItems()
    fetchCountries() 
  }, [])

  const fetchItems = async (search = '') => {
    try {
      let query = supabase.from('fleet_trucks').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
      if (search) query = query.ilike('reg_no', `%${search}%`)
      
      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error fetching trucks:", error.message)
    }
  }

  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name', { ascending: true })
    if (data) setCountries(data)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    // 1. Prepare Payload (Copy form data)
    const payload = { ...form }
    delete payload.id // Remove ID so DB generates it automatically

    // 2. CRITICAL FIX: Clean up Empty Dates
    // If a date field is "", the database will reject it. We must convert it to null.
    if (!payload.reg_issue_date) payload.reg_issue_date = null
    if (!payload.reg_expiry_date) payload.reg_expiry_date = null
    if (!payload.insurance_issue_date) payload.insurance_issue_date = null
    if (!payload.insurance_expiry_date) payload.insurance_expiry_date = null

    let result
    if (isEditing) {
      result = await supabase.from('fleet_trucks').update(payload).eq('id', form.id)
    } else {
      result = await supabase.from('fleet_trucks').insert([payload])
    }

    const { error } = result

    // 3. Error Handling
    if (error) {
      console.error("Save Failed:", error)
      alert("🛑 Save Failed: " + error.message) 
    } else {
      fetchItems(searchTerm)
      setShowModal(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this truck?')) {
      const { error } = await supabase.from('fleet_trucks').update({ is_deleted: true }).eq('id', id)
      if (error) alert("Error deleting: " + error.message)
      else fetchItems(searchTerm)
    }
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>🚛 Fleet: Trucks</h2>
        <input type="text" placeholder="🔍 Search Reg No..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => { setForm(initialForm); setIsEditing(false); setShowModal(true) }} className="btn btn-primary">+ Add Truck</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Type / Make</th>
              <th>Insurance Info</th>
              <th>Owner / Capacity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{fontWeight:'bold'}}>{item.reg_no}</div>
                  <small style={{color:'#64748b'}}>📍 {item.registered_country || 'Unknown'}</small>
                </td>
                <td>
                    <span className="status-badge" style={{background:'#e2e8f0', color:'#333'}}>{item.truck_type}</span><br/>
                    {item.make} - {item.model}
                </td>
                <td style={{fontSize:'12px'}}>
                    Pol: {item.insurance_policy_no}<br/>
                    <span style={{color: new Date(item.insurance_expiry_date) < new Date() ? 'red' : 'green'}}>
                        Exp: {item.insurance_expiry_date}
                    </span>
                </td>
                <td style={{fontSize:'12px'}}>
                    {item.truck_type !== 'Own Asset' && <span>👤 {item.owner_name}<br/></span>}
                    ⚖️ {item.payload_capacity} Tons
                </td>
                <td>
                   <span onClick={() => { setForm(item); setIsEditing(true); setShowModal(true) }} className="icon-action">📝</span>
                   <span onClick={() => handleDelete(item.id)} className="icon-action" style={{color:'red'}}>🗑️</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'20px', color:'#999'}}>No trucks found. Add one to get started.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'600px'}}>
            <div className="modal-header"><h3>{isEditing ? 'Edit Truck' : 'Add Truck'}</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div><span className="form-label">Truck Type</span>
                    <select value={form.truck_type} onChange={e => setForm({...form, truck_type: e.target.value})} className="form-input">
                        <option>Own Asset</option><option>Leased</option><option>Driver Owned</option>
                    </select>
                </div>
                
                {/* REGISTERED COUNTRY */}
                <div>
                   <span className="form-label">Registered Country</span>
                   <select value={form.registered_country} onChange={e => setForm({...form, registered_country: e.target.value})} className="form-input">
                      <option value="">-- Select --</option>
                      {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                </div>

                <div><span className="form-label">Reg No. *</span><input required value={form.reg_no} onChange={e => setForm({...form, reg_no: e.target.value})} className="form-input" /></div>
                
                {/* MAKE AS DROPDOWN */}
                <div>
                    <span className="form-label">Make</span>
                    <select value={form.make} onChange={e => setForm({...form, make: e.target.value})} className="form-input">
                        <option value="">-- Select Make --</option>
                        {truckMakes.map(make => (
                            <option key={make} value={make}>{make}</option>
                        ))}
                    </select>
                </div>

                <div><span className="form-label">Model</span><input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="form-input" placeholder="e.g. Actros 2040" /></div>

                <div><span className="form-label">Reg Issue</span><input type="date" value={form.reg_issue_date || ''} onChange={e => setForm({...form, reg_issue_date: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Reg Expiry</span><input type="date" value={form.reg_expiry_date || ''} onChange={e => setForm({...form, reg_expiry_date: e.target.value})} className="form-input" /></div>

                <div><span className="form-label">Ins. Policy No</span><input value={form.insurance_policy_no} onChange={e => setForm({...form, insurance_policy_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Ins. Expiry</span><input type="date" value={form.insurance_expiry_date || ''} onChange={e => setForm({...form, insurance_expiry_date: e.target.value})} className="form-input" /></div>
                
                <div><span className="form-label">Axles</span><input value={form.no_axles} onChange={e => setForm({...form, no_axles: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Payload (Tons)</span><input value={form.payload_capacity} onChange={e => setForm({...form, payload_capacity: e.target.value})} className="form-input" /></div>
                
                {form.truck_type !== 'Own Asset' && (
                    <div style={{gridColumn:'span 2', background:'#f8fafc', padding:'10px', borderRadius:'5px'}}>
                        <strong>Owner Details</strong>
                        <div className="form-grid" style={{marginTop:'5px'}}>
                           <input placeholder="Owner Name" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="form-input" />
                           <input placeholder="Owner Mobile" value={form.owner_mobile} onChange={e => setForm({...form, owner_mobile: e.target.value})} className="form-input" />
                        </div>
                    </div>
                )}
              </div>
              <button className="btn btn-primary" style={{marginTop:'20px', width:'100%'}}>Save Truck</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}