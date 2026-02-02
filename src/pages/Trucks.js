import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

export default function Trucks() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const initialForm = {
    id: null, truck_type: 'Own Asset', make: '', model: '', reg_no: '',
    registered_country: '', reg_issue_date: '', reg_expiry_date: '',
    insurance_policy_no: '', insurance_issue_date: '', insurance_expiry_date: '',
    no_axles: '', payload_capacity: '', owner_name: '', owner_mobile: ''
  }
  const [form, setForm] = useState(initialForm)
  const truckMakes = ["Mercedes-Benz", "Volvo", "Scania", "MAN", "Renault", "DAF", "Iveco", "Hino", "Isuzu", "Mitsubishi Fuso", "Tata", "Sinotruk", "Other"]

  useEffect(() => { fetchItems(); fetchCountries() }, [])

  const fetchItems = async (search = '') => {
    try {
      // 1. Fetch Trucks
      let query = supabase.from('fleet_trucks').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
      if (search) query = query.ilike('reg_no', `%${search}%`)
      const { data: trucks, error } = await query
      if (error) throw error

      // 2. Fetch Documents to check what is uploaded
      if (trucks.length > 0) {
        const truckIds = trucks.map(t => t.id)
        const { data: docs } = await supabase
          .from('fleet_documents')
          .select('related_id, doc_type')
          .eq('related_type', 'Truck')
          .in('related_id', truckIds)

        // 3. Run Compliance Logic
        trucks.forEach(truck => {
            const myDocs = docs.filter(d => d.related_id === truck.id)
            truck.issues = []

            // --- A. DOCUMENT EXISTENCE CHECKS ---
            // Check for Mulkiya / Registration
            const hasRegDoc = myDocs.some(d => d.doc_type.includes('Registration') || d.doc_type.includes('Mulkiya'))
            if (!hasRegDoc) truck.issues.push("Missing Reg. Card Copy")

            // Check for Insurance
            const hasInsDoc = myDocs.some(d => d.doc_type.includes('Insurance'))
            if (!hasInsDoc) truck.issues.push("Missing Insurance Copy")

            // --- B. EXPIRY DATE CHECKS ---
            const today = new Date()
            
            // Reg Expiry
            if (!truck.reg_expiry_date) {
                truck.issues.push("Reg. Date Not Set") 
            } else if (new Date(truck.reg_expiry_date) < today) {
                truck.issues.push("Reg. Card EXPIRED")
            }

            // Insurance Expiry
            if (!truck.insurance_expiry_date) {
                 truck.issues.push("Ins. Date Not Set")
            } else if (new Date(truck.insurance_expiry_date) < today) {
                truck.issues.push("Insurance EXPIRED")
            }
        })
      }
      setItems(trucks || [])
    } catch (e) { console.error(e) }
  }

  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name')
    if (data) setCountries(data)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    delete payload.id; delete payload.issues
    
    // Clean Empty Dates
    ['reg_issue_date', 'reg_expiry_date', 'insurance_issue_date', 'insurance_expiry_date'].forEach(k => {
        if (!payload[k]) payload[k] = null
    })

    const result = isEditing 
      ? await supabase.from('fleet_trucks').update(payload).eq('id', form.id)
      : await supabase.from('fleet_trucks').insert([payload])

    if (result.error) alert(result.error.message)
    else { fetchItems(searchTerm); setShowModal(false) }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete truck?')) {
      await supabase.from('fleet_trucks').update({ is_deleted: true }).eq('id', id)
      fetchItems(searchTerm)
    }
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>🚛 Fleet: Trucks</h2>
        <input type="text" placeholder="🔍 Search Reg No..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => {setForm(initialForm); setIsEditing(false); setShowModal(true)}} className="btn btn-primary">+ Add Truck</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Make / Model</th>
              <th>Insurance Info</th>
              <th>Owner / Capacity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{fontWeight:'bold', display:'flex', alignItems:'center'}}>
                      {item.reg_no}
                      {/* --- RED DOT LOGIC --- */}
                      {item.issues && item.issues.length > 0 && (
                        <div className="notification-dot">
                            {item.issues.length}
                            <div className="tooltip-text">
                                {item.issues.map((iss, i) => <div key={i} style={{marginBottom:'4px'}}>• {iss}</div>)}
                            </div>
                        </div>
                      )}
                  </div>
                  <small style={{color:'#64748b'}}>📍 {item.registered_country || 'Unknown'}</small>
                </td>
                <td>
                    <span className="status-badge" style={{background:'#e2e8f0', color:'#333'}}>{item.truck_type}</span><br/>
                    {item.make} - {item.model}
                </td>
                <td style={{fontSize:'12px'}}>
                    Pol: {item.insurance_policy_no}<br/>
                    <span style={{color: new Date(item.insurance_expiry_date) < new Date() ? 'red' : 'green'}}>
                        Exp: {item.insurance_expiry_date || 'N/A'}
                    </span>
                </td>
                <td style={{fontSize:'12px'}}>
                    {item.truck_type !== 'Own Asset' && <span>👤 {item.owner_name}<br/></span>}
                    ⚖️ {item.payload_capacity} Tons
                </td>
                <td>
                   <span onClick={() => {setForm(item); setIsEditing(true); setShowModal(true)}} className="icon-action">📝</span>
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
            <div className="modal-header"><h3>{isEditing ? 'Edit Truck' : 'Add Truck'}</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div><span className="form-label">Type</span><select value={form.truck_type} onChange={e => setForm({...form, truck_type: e.target.value})} className="form-input"><option>Own Asset</option><option>Leased</option><option>Driver Owned</option></select></div>
                <div><span className="form-label">Country</span><select value={form.registered_country} onChange={e => setForm({...form, registered_country: e.target.value})} className="form-input"><option value="">-- Select --</option>{countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><span className="form-label">Reg No. *</span><input required value={form.reg_no} onChange={e => setForm({...form, reg_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Make</span><select value={form.make} onChange={e => setForm({...form, make: e.target.value})} className="form-input"><option value="">-- Select --</option>{truckMakes.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><span className="form-label">Model</span><input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Reg Expiry</span><input type="date" value={form.reg_expiry_date||''} onChange={e => setForm({...form, reg_expiry_date: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Ins. Policy</span><input value={form.insurance_policy_no} onChange={e => setForm({...form, insurance_policy_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Ins. Expiry</span><input type="date" value={form.insurance_expiry_date||''} onChange={e => setForm({...form, insurance_expiry_date: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Payload (Tons)</span><input value={form.payload_capacity} onChange={e => setForm({...form, payload_capacity: e.target.value})} className="form-input" /></div>
                {form.truck_type !== 'Own Asset' && <div style={{gridColumn:'span 2'}}><span className="form-label">Owner Name</span><input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="form-input" /></div>}
              </div>
              <button className="btn btn-primary" style={{marginTop:'20px', width:'100%'}}>Save Truck</button>
            </form>
            {isEditing && form.id && <><hr style={{margin:'20px 0', borderTop:'1px solid #eee'}} /><DocumentManager relatedType="Truck" relatedId={form.id} /></>}
          </div>
        </div>
      )}
    </div>
  )
}