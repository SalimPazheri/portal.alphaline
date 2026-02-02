import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

export default function Equipment() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showIssuesFor, setShowIssuesFor] = useState(null)

  // Equipment Types
  const equipTypes = ["Flatbed 40ft", "Flatbed 20ft", "Lowbed", "Skeleton", "Box Trailer", "Reefer", "Curtain Side", "Tanker", "Tipper", "Other"]

  const initialForm = {
    id: null, 
    asset_type: 'Own Asset',
    equipment_type: 'Flatbed 40ft', 
    make: '', model: '', 
    reg_no: '', 
    registered_country: '', 
    reg_expiry_date: '',
    insurance_policy_no: '', 
    insurance_expiry_date: '',
    no_axles: '', payload_capacity: '', 
    owner_name: '', 
    status: 'Active'
  }
  const [form, setForm] = useState(initialForm)

  // --- FIX: Wrap fetchItems in useCallback to stabilize it ---
  const fetchItems = useCallback(async (search = '') => {
    try {
      // Assuming table is 'fleet_equipment'
      let query = supabase.from('fleet_equipment').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
      
      // Check if search argument is a string (safe check)
      if (search && typeof search === 'string') {
          query = query.ilike('equipment_type', `%${search}%`)
      }
      
      const { data: equipment, error } = await query
      if (error) throw error

      if (equipment && equipment.length > 0) {
        const ids = equipment.map(e => e.id)
        const { data: docs } = await supabase
          .from('fleet_documents')
          .select('related_id, doc_type')
          .eq('related_type', 'Equipment')
          .in('related_id', ids)

        equipment.forEach(item => {
            const myDocs = docs.filter(d => d.related_id === item.id)
            item.issues = []
            item.warnings = []

            // 1. REGISTRATION LOGIC (Conditional)
            if (item.reg_no) {
                const hasRegDoc = myDocs.some(d => d.doc_type.includes('Registration') || d.doc_type.includes('Mulkiya'))
                if (!hasRegDoc) item.issues.push("Missing Reg. Card (Mulkiya)")
                
                checkExpiry(item.reg_expiry_date, "Registration", item)
            }

            // 2. INSURANCE LOGIC
            const hasInsDoc = myDocs.some(d => d.doc_type.includes('Insurance'))
            if (!hasInsDoc) item.issues.push("Missing Insurance Copy")
            checkExpiry(item.insurance_expiry_date, "Insurance", item)
        })
      }
      setItems(equipment || [])
    } catch (e) { console.error(e) }
  }, []) // Empty dependency array means this function never changes

  // Helper function for dates (moved outside to be clean, or keep inside)
  const checkExpiry = (dateStr, name, item) => {
    if (!dateStr) return 
    const today = new Date()
    const expDate = new Date(dateStr)
    const diffTime = expDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        item.issues.push(`${name} EXPIRED (${Math.abs(diffDays)} days ago)`)
    } else if (diffDays <= 30) {
        item.warnings.push(`${name} Expiring in ${diffDays} days`)
    }
  }

  // --- FIX: Add fetchItems to dependency array ---
  useEffect(() => { 
      fetchItems()
      fetchCountries() 
  }, [fetchItems])

  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name')
    if (data) setCountries(data)
  }

  const renderComplianceBadge = (item) => {
      const hasIssues = item.issues && item.issues.length > 0
      const hasWarnings = item.warnings && item.warnings.length > 0

      if (hasIssues) {
          return (
            <div className="notification-dot red" onClick={() => setShowIssuesFor({ ...item, type: 'red' })} style={{cursor: 'pointer'}}>
                {item.issues.length}
                <div className="tooltip-text">
                    <strong>Critical Issues:</strong>{item.issues.map((iss, i) => <div key={i}>• {iss}</div>)}
                </div>
            </div>
          )
      } else if (hasWarnings) {
          return (
            <div className="notification-dot yellow" onClick={() => setShowIssuesFor({ ...item, type: 'yellow' })} style={{cursor: 'pointer'}}>
                {item.warnings.length}
                <div className="tooltip-text">
                    <strong>Warnings:</strong>{item.warnings.map((iss, i) => <div key={i}>• {iss}</div>)}
                </div>
            </div>
          )
      } else {
          return <div className="notification-dot green">✔<div className="tooltip-text">All Documents Valid</div></div>
      }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    delete payload.id; delete payload.issues; delete payload.warnings
    
    // Clean Empty Dates
    const dateFields = ['reg_expiry_date', 'insurance_expiry_date']
    dateFields.forEach(k => { if (!payload[k]) payload[k] = null })

    const result = isEditing 
      ? await supabase.from('fleet_equipment').update(payload).eq('id', form.id)
      : await supabase.from('fleet_equipment').insert([payload])

    if (result.error) alert(result.error.message)
    else { fetchItems(searchTerm); setShowModal(false) }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete Equipment?')) {
      await supabase.from('fleet_equipment').update({ is_deleted: true }).eq('id', id)
      fetchItems(searchTerm)
    }
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>⚓ Fleet: Equipment</h2>
        <input type="text" placeholder="🔍 Search Type..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => {setForm(initialForm); setIsEditing(false); setShowModal(true)}} className="btn btn-primary">+ Add Equipment</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID / Registration</th>
              <th>Type / Make</th>
              <th>Insurance</th>
              <th>Specs</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{fontWeight:'bold', display:'flex', alignItems:'center'}}>
                      {item.reg_no || <span style={{color:'#94a3b8', fontStyle:'italic'}}>No Reg</span>}
                      {renderComplianceBadge(item)}
                  </div>
                  <small style={{color:'#64748b'}}>📍 {item.registered_country || '-'}</small>
                </td>
                <td>
                    <span className="status-badge" style={{background:'#e2e8f0', color:'#333'}}>{item.equipment_type}</span>
                    <div style={{fontSize:'12px', marginTop:'4px'}}>{item.make} {item.model}</div>
                </td>
                <td style={{fontSize:'12px'}}>
                    Pol: {item.insurance_policy_no || '-'}<br/>
                    <span style={{color: new Date(item.insurance_expiry_date) < new Date() ? 'red' : 'green'}}>
                        {item.insurance_expiry_date || ''}
                    </span>
                </td>
                <td style={{fontSize:'12px'}}>
                    ⚖️ Cap: {item.payload_capacity} Tons<br/>
                    🔩 Axles: {item.no_axles}
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
          <div className="modal-content" style={{width:'700px'}}>
            
            <div className="modal-header">
                <h3>{isEditing ? 'Edit Equipment' : 'Add Equipment'}</h3>
                <button onClick={() => setShowModal(false)} className="btn-close">✖</button>
            </div>
            
            <div className="modal-body">
              <form id="equip-form" onSubmit={handleSave}>
                  <div className="form-grid">
                    <div><span className="form-label">Asset Type</span><select value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})} className="form-input"><option>Own Asset</option><option>Leased</option></select></div>
                    <div><span className="form-label">Equip Type</span><select value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} className="form-input">{equipTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                    
                    {/* OPTIONAL REG NO */}
                    <div><span className="form-label">Reg No (Optional)</span><input value={form.reg_no} onChange={e => setForm({...form, reg_no: e.target.value})} className="form-input" placeholder="Leave empty if none" /></div>
                    
                    <div><span className="form-label">Country</span><select value={form.registered_country} onChange={e => setForm({...form, registered_country: e.target.value})} className="form-input"><option value="">-- Select --</option>{countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    
                    <div><span className="form-label">Make</span><input value={form.make} onChange={e => setForm({...form, make: e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">Model</span><input value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="form-input" /></div>
                    
                    <div><span className="form-label">No. Axles</span><input type="number" value={form.no_axles} onChange={e => setForm({...form, no_axles: e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">Payload (Tons)</span><input type="number" value={form.payload_capacity} onChange={e => setForm({...form, payload_capacity: e.target.value})} className="form-input" /></div>

                    {/* DATES */}
                    <div><span className="form-label">Reg Expiry</span><input type="date" value={form.reg_expiry_date||''} onChange={e => setForm({...form, reg_expiry_date: e.target.value})} className="form-input" /></div>
                    
                    <div><span className="form-label">Ins. Policy</span><input value={form.insurance_policy_no} onChange={e => setForm({...form, insurance_policy_no: e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">Ins. Expiry</span><input type="date" value={form.insurance_expiry_date||''} onChange={e => setForm({...form, insurance_expiry_date: e.target.value})} className="form-input" /></div>
                    
                    {form.asset_type === 'Leased' && <div style={{gridColumn:'span 2'}}><span className="form-label">Lessor / Owner Name</span><input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="form-input" /></div>}
                  </div>
              </form>

              {isEditing && form.id && (
                  <>
                    <hr style={{margin:'20px 0', borderTop:'1px solid #eee'}} />
                    <div style={{background:'#fff7ed', padding:'10px', borderRadius:'6px', marginBottom:'10px', fontSize:'13px', border:'1px solid #fdba74'}}>
                     📸 <strong>Requirement:</strong> Upload Insurance Policy. (Reg Card is required only if Reg No is entered).
                    </div>
                    <DocumentManager relatedType="Equipment" relatedId={form.id} />
                  </>
              )}
            </div>

            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{background:'#e2e8f0', color:'#334155'}}>Close</button>
                <button className="btn btn-primary" form="equip-form">💾 Save Equipment</button>
            </div>

          </div>
        </div>
      )}

      {/* ISSUES POPUP */}
      {showIssuesFor && (
         <div className="modal-overlay" style={{zIndex: 3000}}>
            <div className="modal-content" style={{width:'400px', height:'auto', minHeight:'200px'}}>
                <div className="modal-header" style={{background: showIssuesFor.type === 'red' ? '#fee2e2' : '#fef3c7'}}>
                    <h3 style={{color: showIssuesFor.type === 'red' ? '#991b1b' : '#92400e'}}>{showIssuesFor.type === 'red' ? '⚠️ Issues' : '⚠️ Warnings'}</h3>
                    <button onClick={() => setShowIssuesFor(null)} className="btn-close">✖</button>
                </div>
                <div style={{padding:'20px'}}>
                    <h4 style={{marginTop:0}}>{showIssuesFor.equipment_type} ({showIssuesFor.reg_no || 'No Reg'})</h4>
                    <ul style={{color: showIssuesFor.type === 'red' ? '#b91c1c' : '#b45309'}}>
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