import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

export default function Drivers() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [showIssuesFor, setShowIssuesFor] = useState(null) 

  const initialForm = {
    id: null, 
    full_name: '', father_name: '', nationality: '', residency_country: '',
    passport_no: '', passport_expiry: '', 
    license_no: '', license_expiry: '', 
    visa_issue_date: '', visa_expiry_date: '',
    status: 'Active',
    contact_numbers: [] 
  }
  const [form, setForm] = useState(initialForm)

  useEffect(() => { 
      fetchItems()
      fetchCountries() 
  }, [])

  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name')
    if (data) setCountries(data)
  }

  const handleAddCountry = async () => {
    const newCountry = window.prompt("Enter the new Country Name:")
    if (!newCountry) return 
    const { error } = await supabase.from('master_countries').insert([{ name: newCountry }]).select()
    if (error) alert("Error: " + error.message)
    else {
        await fetchCountries()
        setForm(prev => ({ ...prev, nationality: newCountry }))
    }
  }

  const fetchItems = async (search = '') => {
    try {
      let query = supabase.from('fleet_drivers').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
      if (search) query = query.ilike('full_name', `%${search}%`)
      const { data: drivers, error } = await query
      if (error) throw error

      if (drivers.length > 0) {
        const driverIds = drivers.map(d => d.id)
        const { data: docs } = await supabase
          .from('fleet_documents')
          .select('related_id, doc_type')
          .eq('related_type', 'Driver')
          .in('related_id', driverIds)

        drivers.forEach(driver => {
            const myDocs = docs.filter(d => d.related_id === driver.id)
            driver.issues = []   // RED (Critical)
            driver.warnings = [] // YELLOW (Near Expiry)
            
            // 1. MISSING DOCS (Critical Red)
            if (!myDocs.some(d => d.doc_type.includes('Passport'))) driver.issues.push("Missing Passport Copy")
            if (!myDocs.some(d => d.doc_type.includes('Visa'))) driver.issues.push("Missing Visa Copy")
            if (!myDocs.some(d => d.doc_type.includes('License'))) driver.issues.push("Missing License Copy")
            if (!myDocs.some(d => d.doc_type.includes('Photo'))) driver.issues.push("Missing Driver Photo")

            // 2. DATE CHECKS (Red vs Yellow)
            const checkExpiry = (dateStr, name) => {
                if (!dateStr) return // Ignore if empty
                const today = new Date()
                const expDate = new Date(dateStr)
                const diffTime = expDate - today
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (diffDays < 0) {
                    driver.issues.push(`${name} EXPIRED (${Math.abs(diffDays)} days ago)`)
                } else if (diffDays <= 30) {
                    driver.warnings.push(`${name} Expiring in ${diffDays} days`)
                }
            }

            checkExpiry(driver.visa_expiry_date, "Visa")
            checkExpiry(driver.license_expiry, "License")
            checkExpiry(driver.passport_expiry, "Passport")
        })
      }
      setItems(drivers || [])
    } catch (error) { console.error(error) }
  }

  // --- RENDER BADGE HELPER ---
  const renderComplianceBadge = (item) => {
      const hasIssues = item.issues && item.issues.length > 0
      const hasWarnings = item.warnings && item.warnings.length > 0

      // 🔴 RED STATE (Critical)
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
      } 
      // 🟡 YELLOW STATE (Warning < 30 Days)
      else if (hasWarnings) {
          return (
            <div className="notification-dot yellow" onClick={() => setShowIssuesFor({ ...item, type: 'yellow' })} style={{cursor: 'pointer'}}>
                {item.warnings.length}
                <div className="tooltip-text">
                    <strong>Warnings:</strong>
                    {item.warnings.map((iss, i) => <div key={i}>• {iss}</div>)}
                </div>
            </div>
          )
      }
      // 🟢 GREEN STATE (Perfect)
      else {
          return (
            <div className="notification-dot green">
                ✔
                <div className="tooltip-text">All Documents Valid & Up to Date</div>
            </div>
          )
      }
  }
  // ---------------------------

  const addContactRow = () => {
    setForm(prev => ({
        ...prev,
        contact_numbers: [...(prev.contact_numbers || []), { country: '', code: '', number: '', type: 'Mobile' }]
    }))
  }

  const removeContactRow = (index) => {
    const newContacts = [...form.contact_numbers]
    newContacts.splice(index, 1)
    setForm({ ...form, contact_numbers: newContacts })
  }

  const updateContactRow = (index, field, value) => {
    const newContacts = [...form.contact_numbers]
    newContacts[index][field] = value
    if (field === 'country') {
        const selectedC = countries.find(c => c.name === value)
        if (selectedC && selectedC.phone_code) {
            newContacts[index]['code'] = selectedC.phone_code
        }
    }
    setForm({ ...form, contact_numbers: newContacts })
  }

  const handleSave = async (e) => {
    if(e) e.preventDefault() 
    const payload = { ...form }
    delete payload.id; delete payload.issues; delete payload.warnings

    const dateFields = ['passport_expiry', 'license_expiry', 'visa_issue_date', 'visa_expiry_date']
    dateFields.forEach(k => { if(!payload[k]) payload[k]=null })

    const result = isEditing 
      ? await supabase.from('fleet_drivers').update(payload).eq('id', form.id)
      : await supabase.from('fleet_drivers').insert([payload])
    
    if (result.error) alert(result.error.message)
    else { fetchItems(searchTerm); setShowModal(false) }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this driver?')) {
      await supabase.from('fleet_drivers').update({ is_deleted: true }).eq('id', id)
      fetchItems(searchTerm)
    }
  }

  const openEdit = (item) => {
      const safeItem = { ...item, contact_numbers: Array.isArray(item.contact_numbers) ? item.contact_numbers : [] }
      setForm(safeItem)
      setIsEditing(true)
      setShowModal(true)
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>🧢 Fleet Drivers</h2>
        <input type="text" placeholder="🔍 Search Driver..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => {setForm({...initialForm, contact_numbers: []}); setIsEditing(false); setShowModal(true)}} className="btn btn-primary">+ Add Driver</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>License / Passport</th>
              <th>Visa Expiry</th>
              <th>Contacts</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{fontWeight:'bold', color:'#0f172a', display:'flex', alignItems:'center'}}>
                    {item.full_name}
                    
                    {/* --- TRAFFIC LIGHT DOT --- */}
                    {renderComplianceBadge(item)}
                    
                  </div>
                  <small style={{color:'#64748b'}}>RES: {item.residency_country || 'Unknown'}</small>
                </td>
                <td style={{fontSize:'12px'}}>
                    🆔 {item.license_no}<br/>🛂 {item.passport_no}
                </td>
                <td>
                    <span style={{color: new Date(item.visa_expiry_date) < new Date() ? 'red' : 'green', fontWeight:'500'}}>
                       {item.visa_expiry_date || '-'}
                    </span>
                </td>
                <td style={{fontSize:'11px'}}>
                   {item.contact_numbers && item.contact_numbers.slice(0, 2).map((c, i) => (
                       <div key={i}>{c.code} {c.number} ({c.country})</div>
                   ))}
                   {item.contact_numbers && item.contact_numbers.length > 2 && <small>+{item.contact_numbers.length - 2} more</small>}
                </td>
                <td>
                    <span className="status-badge" style={{
                        background: item.status==='Active'?'#dcfce7': item.status==='Blacklisted'?'#000':'#fee2e2',
                        color: item.status==='Blacklisted'?'#fff':'#333'
                    }}>
                        {item.status}
                    </span>
                </td>
                <td>
                   <span onClick={() => openEdit(item)} className="icon-action">📝</span>
                   <span onClick={() => handleDelete(item.id)} className="icon-action" style={{color:'red'}}>🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'800px'}}>
            <div className="modal-header"><h3>{isEditing ? 'Edit Driver' : 'Add New Driver'}</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            
            <div className="modal-body">
              <div className="form-grid">
                
                <h4 style={{gridColumn:'span 2', margin:'0 0 10px 0', color:'#007bff'}}>👤 Personal Details</h4>
                <div><span className="form-label">Full Name *</span><input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Father Name</span><input value={form.father_name} onChange={e => setForm({...form, father_name: e.target.value})} className="form-input" /></div>

                <div>
                   <span className="form-label">Nationality</span>
                   <div style={{display:'flex', gap:'5px'}}>
                       <select value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} className="form-input">
                          <option value="">-- Select --</option>
                          {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                       <button type="button" onClick={handleAddCountry} className="btn btn-success" style={{padding:'0 10px'}}>+</button>
                   </div>
                </div>

                <div>
                   <span className="form-label">Residency Country</span>
                   <select value={form.residency_country} onChange={e => setForm({...form, residency_country: e.target.value})} className="form-input">
                      <option value="">-- Select --</option>
                      {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                </div>

                <div>
                    <span className="form-label">Status</span>
                    <select 
                        value={form.status} 
                        onChange={e => setForm({...form, status: e.target.value})} 
                        className="form-input"
                        disabled={!isEditing}
                        style={{backgroundColor: !isEditing ? '#f1f5f9' : 'white'}}
                    >
                        <option>Active</option>
                        <option>On Leave</option>
                        <option>Terminated</option>
                        <option value="Blacklisted">Blacklisted</option>
                    </select>
                </div>

                <h4 style={{gridColumn:'span 2', margin:'15px 0 5px 0', color:'#007bff', display:'flex', justifyContent:'space-between'}}>
                    <span>📱 Contact Numbers</span>
                    <button type="button" onClick={addContactRow} className="btn btn-success" style={{fontSize:'11px'}}>+ Add Number</button>
                </h4>
                
                <div style={{gridColumn:'span 2', display:'grid', gridTemplateColumns:'1.5fr 0.8fr 2fr 0.5fr', gap:'5px', background:'#f8fafc', padding:'5px', fontSize:'11px', fontWeight:'bold'}}>
                    <div>Country</div><div>Code</div><div>Number</div><div></div>
                </div>

                <div style={{gridColumn:'span 2'}}>
                    {form.contact_numbers && form.contact_numbers.map((row, index) => (
                        <div key={index} style={{display:'grid', gridTemplateColumns:'1.5fr 0.8fr 2fr 0.5fr', gap:'5px', marginBottom:'5px'}}>
                            <select value={row.country} onChange={e => updateContactRow(index, 'country', e.target.value)} className="form-input" style={{fontSize:'12px'}}>
                                <option value="">Select</option>{countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <input value={row.code} onChange={e => updateContactRow(index, 'code', e.target.value)} className="form-input" style={{fontSize:'12px', background:'#f1f5f9'}} />
                            <input value={row.number} type="number" onChange={e => updateContactRow(index, 'number', e.target.value)} className="form-input" style={{fontSize:'12px'}} />
                            <button type="button" onClick={() => removeContactRow(index)} style={{background:'none', border:'none', color:'red', cursor:'pointer'}}>✖</button>
                        </div>
                    ))}
                </div>

                <h4 style={{gridColumn:'span 2', margin:'15px 0 10px 0', color:'#007bff'}}>📄 Documents & Visa</h4>
                <div><span className="form-label">Passport No</span><input value={form.passport_no} onChange={e => setForm({...form, passport_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Passport Expiry</span><input type="date" value={form.passport_expiry||''} onChange={e => setForm({...form, passport_expiry: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">License No</span><input value={form.license_no} onChange={e => setForm({...form, license_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">License Expiry</span><input type="date" value={form.license_expiry||''} onChange={e => setForm({...form, license_expiry: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Visa Issue</span><input type="date" value={form.visa_issue_date||''} onChange={e => setForm({...form, visa_issue_date: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Visa Expiry</span><input type="date" value={form.visa_expiry_date||''} onChange={e => setForm({...form, visa_expiry_date: e.target.value})} className="form-input" /></div>

              </div>

              {isEditing && form.id && (
                <>
                  <hr style={{margin:'20px 0', borderTop:'1px solid #eee'}} />
                  <div style={{background:'#fff7ed', padding:'10px', borderRadius:'6px', marginBottom:'10px', fontSize:'13px', border:'1px solid #fdba74'}}>
                     📸 <strong>Requirement:</strong> Upload a "Passport Size Photo" below.
                  </div>
                  <DocumentManager relatedType="Driver" relatedId={form.id} />
                </>
              )}
            </div>

            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{background:'#e2e8f0', color:'#334155'}}>Close</button>
                <button className="btn btn-primary" onClick={handleSave}>💾 Save Driver</button>
            </div>

          </div>
        </div>
      )}

      {/* COMPLIANCE ISSUES MODAL (Red/Yellow Specific) */}
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
                    <h4 style={{marginTop:0}}>{showIssuesFor.full_name}</h4>
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