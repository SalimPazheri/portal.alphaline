
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

export default function Trucks() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // State for Issues Popup
  const [showIssuesFor, setShowIssuesFor] = useState(null) 

  const initialForm = {
    id: null, truck_type: 'Own Asset', make: '', model: '', reg_no: '',
    registered_country: '', reg_issue_date: '', reg_expiry_date: '',
    insurance_policy_no: '', insurance_issue_date: '', insurance_expiry_date: '',
    no_axles: '', payload_capacity: '', owner_name: '', owner_mobile: ''
  }
  const [form, setForm] = useState(initialForm)
  const truckMakes = ["Mercedes-Benz", "Volvo", "Scania", "MAN", "Renault", "DAF", "Iveco", "Hino", "Isuzu", "Mitsubishi Fuso", "Tata", "Sinotruk", "Other"]

  // --- FIX: Wrap fetchItems in useCallback ---
  const fetchItems = useCallback(async (search = '') => {
    try {
      let query = supabase.from('fleet_trucks').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
      
      // Safe search check
      if (search && typeof search === 'string') {
          query = query.ilike('reg_no', `%${search}%`)
      }

      const { data: trucks, error } = await query
      if (error) throw error

      if (trucks && trucks.length > 0) {
        const truckIds = trucks.map(t => t.id)
        const { data: docs } = await supabase
          .from('fleet_documents')
          .select('related_id, doc_type')
          .eq('related_type', 'Truck')
          .in('related_id', truckIds)

        trucks.forEach(truck => {
            const myDocs = docs.filter(d => d.related_id === truck.id)
            truck.issues = []   // RED (Critical)
            truck.warnings = [] // YELLOW (Near Expiry)

            // 1. EXISTENCE CHECKS (Mandatory Documents)
            const hasRegDoc = myDocs.some(d => d.doc_type.includes('Registration') || d.doc_type.includes('Mulkiya'))
            if (!hasRegDoc) truck.issues.push("Missing Reg. Card Copy")

            const hasInsDoc = myDocs.some(d => d.doc_type.includes('Insurance'))
            if (!hasInsDoc) truck.issues.push("Missing Insurance Copy")

            // Photo is Mandatory for Trucks
            const hasPhoto = myDocs.some(d => d.doc_type.includes('Vehicle Photo') || d.doc_type.includes('Truck Photo'))
            if (!hasPhoto) truck.issues.push("Missing Truck Photo")

            // 2. DATE LOGIC
            const checkExpiry = (dateStr, name) => {
                if (!dateStr) {
                    truck.issues.push(`${name} Date Not Set`)
                    return
                }
                const today = new Date()
                const expDate = new Date(dateStr)
                const diffTime = expDate - today
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (diffDays < 0) {
                    truck.issues.push(`${name} EXPIRED (${Math.abs(diffDays)} days ago)`)
                } else if (diffDays <= 30) {
                    truck.warnings.push(`${name} Expiring in ${diffDays} days`)
                }
            }

            checkExpiry(truck.reg_expiry_date, "Registration")
            checkExpiry(truck.insurance_expiry_date, "Insurance")
        })
      }
      setItems(trucks || [])
    } catch (e) { console.error(e) }
  }, [])

  // --- FIX: Add fetchItems to dependency array ---
  useEffect(() => { 
      fetchItems()
      fetchCountries() 
  }, [fetchItems])

  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name')
    if (data) setCountries(data)
  }

  // --- TRAFFIC LIGHT COMPLIANCE RENDERER ---
  const renderComplianceBadge = (item) => {
      const hasIssues = item.issues && item.issues.length > 0
      const hasWarnings = item.warnings && item.warnings.length > 0

      if (hasIssues) {
          return (
            <div className="notification-dot red" onClick={() => setShowIssuesFor({ ...item, type: 'red' })} style={{cursor: 'pointer'}}>
                {item.issues.length}
                <div className="tooltip-text">
                    <strong>Critical Issues:</strong>
                    {item.issues.map((iss, i) => <div key={i}>• {iss}</div>)}
                </div>
            </div>
          )
      } else if (hasWarnings) {
          return (
            <div className="notification-dot yellow" onClick={() => setShowIssuesFor({ ...item, type: 'yellow' })} style={{cursor: 'pointer'}}>
                {item.warnings.length}
                <div className="tooltip-text">
                    <strong>Warnings:</strong>
                    {item.warnings.map((iss, i) => <div key={i}>• {iss}</div>)}
                </div>
            </div>
          )
      } else {
          return (
            <div className="notification-dot green">
                ✔
                <div className="tooltip-text">All Documents Valid & Up to Date</div>
            </div>
          )
      }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    delete payload.id
    delete payload.issues 
    delete payload.warnings
    
    const dateFields = ['reg_issue_date', 'reg_expiry_date', 'insurance_issue_date', 'insurance_expiry_date']
    dateFields.forEach(k => {
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
                      {/* --- TRAFFIC LIGHT DOT --- */}
                      {renderComplianceBadge(item)}
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
            
            {/* 1. HEADER */}
            <div className="modal-header">
                <h3>{isEditing ? 'Edit Truck' : 'Add Truck'}</h3>
                <button onClick={() => setShowModal(false)} className="btn-close">✖</button>
            </div>
            
            {/* 2. BODY (Scrollable) */}
            <div className="modal-body">
              <form id="truck-form" onSubmit={handleSave}>
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
                    
                    {/* --- OWNER FIELDS (Only if NOT 'Own Asset') --- */}
                    {form.truck_type !== 'Own Asset' && (
                        <>
                            <div style={{gridColumn:'span 2', background:'#f8fafc', padding:'10px', borderRadius:'6px', border:'1px solid #e2e8f0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                <div style={{gridColumn:'span 2', fontSize:'12px', fontWeight:'bold', color:'#334155'}}>Owner Details</div>
                                <div>
                                    <span className="form-label">Registered Owner Name</span>
                                    <input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="form-input" placeholder="Company or Person Name" />
                                </div>
                                <div>
                                    <span className="form-label">Owner Mobile</span>
                                    <input value={form.owner_mobile} onChange={e => setForm({...form, owner_mobile: e.target.value})} className="form-input" placeholder="+971..." />
                                </div>
                            </div>
                        </>
                    )}
                    {/* --------------------------------------------- */}

                  </div>
              </form>

              {isEditing && form.id && (
                  <>
                    <hr style={{margin:'20px 0', borderTop:'1px solid #eee'}} />
                    <div style={{background:'#fff7ed', padding:'10px', borderRadius:'6px', marginBottom:'10px', fontSize:'13px', border:'1px solid #fdba74'}}>
                     📸 <strong>Requirement:</strong> Please upload the <strong>Mulkiya</strong>, <strong>Insurance Policy</strong>, and a <strong>Vehicle Photo</strong>.
                    </div>
                    <DocumentManager relatedType="Truck" relatedId={form.id} />
                  </>
              )}
            </div>

            {/* 3. FOOTER (Fixed) */}
            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{background:'#e2e8f0', color:'#334155'}}>Close</button>
                <button className="btn btn-primary" form="truck-form">💾 Save Truck</button>
            </div>

          </div>
        </div>
      )}

      {/* COMPLIANCE ISSUES MODAL */}
      {showIssuesFor && (
         <div className="modal-overlay" style={{zIndex: 3000}}>
            <div className="modal-content" style={{width:'400px', height:'auto', minHeight:'200px'}}>
                <div className="modal-header" style={{background: showIssuesFor.type === 'red' ? '#fee2e2' : '#fef3c7'}}>
                    <h3 style={{color: showIssuesFor.type === 'red' ? '#991b1b' : '#92400e'}}>
                        {showIssuesFor.type === 'red' ? '⚠️ Critical Issues' : '⚠️ Warnings'}
                    </h3>
                    <button onClick={() => setShowIssuesFor(null)} className="btn-close">✖</button>
                </div>
                <div style={{padding:'20px'}}>
                    <h4 style={{marginTop:0}}>{showIssuesFor.reg_no}</h4>
                    <ul style={{
                        color: showIssuesFor.type === 'red' ? '#b91c1c' : '#b45309', 
                        lineHeight:'1.8'
                    }}>
                        {showIssuesFor.type === 'red' 
                            ? showIssuesFor.issues.map((iss, i) => <li key={i}>{iss}</li>)
                            : showIssuesFor.warnings.map((iss, i) => <li key={i}>{iss}</li>)
                        }
                    </ul>
                    <button onClick={() => setShowIssuesFor(null)} className="btn btn-secondary" style={{width:'100%', marginTop:'20px'}}>Close</button>
                </div>
            </div>
         </div>
      )}

    </div>
  )
}