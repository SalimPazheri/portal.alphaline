
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

export default function Drivers() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const initialForm = {
    id: null, full_name: '', father_name: '', nationality: '', 
    passport_no: '', passport_expiry: '', license_no: '', license_expiry: '', 
    visa_issue_date: '', visa_expiry_date: '',
    mobile_origin: '', mobile_transit: '', mobile_destination: '', whatsapp_number: '',
    status: 'Active'
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

  // --- NEW FUNCTION: ADD COUNTRY ON THE FLY ---
  const handleAddCountry = async () => {
    const newCountry = window.prompt("Enter the new Country Name:")
    if (!newCountry) return 

    const { data, error } = await supabase
        .from('master_countries')
        .insert([{ name: newCountry }])
        .select()

    if (error) {
        alert("Error: " + error.message)
    } else {
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
            driver.issues = []
            
            // Checks
            if (!myDocs.some(d => d.doc_type.includes('Passport'))) driver.issues.push("Missing Passport Copy")
            if (!myDocs.some(d => d.doc_type.includes('Visa'))) driver.issues.push("Missing Visa Copy")
            if (!myDocs.some(d => d.doc_type.includes('License'))) driver.issues.push("Missing License Copy")
            if (!myDocs.some(d => d.doc_type.includes('ID'))) driver.issues.push("Missing ID Card Copy")

            // Expiry
            const today = new Date()
            if (driver.visa_expiry_date && new Date(driver.visa_expiry_date) < today) driver.issues.push("Visa EXPIRED")
            if (driver.license_expiry && new Date(driver.license_expiry) < today) driver.issues.push("License EXPIRED")
            if (driver.passport_expiry && new Date(driver.passport_expiry) < today) driver.issues.push("Passport EXPIRED")
        })
      }
      setItems(drivers || [])
    } catch (error) { console.error(error) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    delete payload.id; delete payload.issues

    // Fix comma operator warning
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

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>🧢 Fleet Drivers</h2>
        <input type="text" placeholder="🔍 Search Driver..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
        <button onClick={() => {setForm(initialForm); setIsEditing(false); setShowModal(true)}} className="btn btn-primary">+ Add Driver</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>License / Passport</th>
              <th>Visa Expiry</th>
              <th>Contact</th>
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
                    {item.issues && item.issues.length > 0 && (
                        <div className="notification-dot">
                            {item.issues.length}
                            <div className="tooltip-text">
                                {item.issues.map((iss, i) => <div key={i} style={{marginBottom:'4px'}}>• {iss}</div>)}
                            </div>
                        </div>
                    )}
                  </div>
                  <small style={{color:'#64748b'}}>S/O {item.father_name || '-'}</small>
                </td>
                <td style={{fontSize:'12px'}}>
                    🆔 Lic: {item.license_no}<br/>🛂 Pass: {item.passport_no}
                </td>
                <td>
                    <span style={{color: new Date(item.visa_expiry_date) < new Date() ? 'red' : 'green', fontWeight:'500'}}>
                       {item.visa_expiry_date || '-'}
                    </span>
                </td>
                <td style={{fontSize:'11px'}}>
                    <div>📞 {item.mobile_origin}</div>
                    {item.whatsapp_number && <div style={{color:'#16a34a'}}>💬 {item.whatsapp_number}</div>}
                </td>
                <td><span className="status-badge" style={{background: item.status==='Active'?'#dcfce7':'#fee2e2'}}>{item.status}</span></td>
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
            <div className="modal-header"><h3>{isEditing ? 'Edit Driver' : 'Add New Driver'}</h3><button onClick={() => setShowModal(false)} className="btn-close">✖</button></div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <h4 style={{gridColumn:'span 2', margin:'0 0 10px 0', color:'#007bff'}}>👤 Personal Details</h4>
                
                {/* 1. FULL NAME */}
                <div><span className="form-label">Full Name *</span><input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="form-input" /></div>
                
                {/* 2. FATHER NAME (Restored) */}
                <div><span className="form-label">Father Name</span><input value={form.father_name} onChange={e => setForm({...form, father_name: e.target.value})} className="form-input" /></div>

                {/* 3. NATIONALITY + ADD BUTTON */}
                <div>
                   <span className="form-label">Nationality</span>
                   <div style={{display:'flex', gap:'5px'}}>
                       <select value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} className="form-input">
                          <option value="">-- Select Country --</option>
                          {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                       <button type="button" onClick={handleAddCountry} className="btn btn-success" style={{padding:'0 10px', fontSize:'16px'}} title="Add Missing Country">+</button>
                   </div>
                </div>

                <div><span className="form-label">Status</span><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="form-input"><option>Active</option><option>On Leave</option><option>Terminated</option></select></div>
                
                <h4 style={{gridColumn:'span 2', margin:'15px 0 10px 0', color:'#007bff'}}>📄 Documents & Visa</h4>
                <div><span className="form-label">Passport No</span><input value={form.passport_no} onChange={e => setForm({...form, passport_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Passport Expiry</span><input type="date" value={form.passport_expiry||''} onChange={e => setForm({...form, passport_expiry: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Driving License</span><input value={form.license_no} onChange={e => setForm({...form, license_no: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">License Expiry</span><input type="date" value={form.license_expiry||''} onChange={e => setForm({...form, license_expiry: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Visa Issue</span><input type="date" value={form.visa_issue_date||''} onChange={e => setForm({...form, visa_issue_date: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Visa Expiry</span><input type="date" value={form.visa_expiry_date||''} onChange={e => setForm({...form, visa_expiry_date: e.target.value})} className="form-input" /></div>

                <h4 style={{gridColumn:'span 2', margin:'15px 0 10px 0', color:'#007bff'}}>📱 Contact</h4>
                <div><span className="form-label">Mobile (Origin)</span><input value={form.mobile_origin} onChange={e => setForm({...form, mobile_origin: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">WhatsApp</span><input value={form.whatsapp_number} onChange={e => setForm({...form, whatsapp_number: e.target.value})} className="form-input" /></div>
              </div>
              <button className="btn btn-primary" style={{marginTop:'20px', width:'100%'}}>Save Driver</button>
            </form>
            {isEditing && form.id && <><hr style={{margin:'20px 0', borderTop:'1px solid #eee'}} /><DocumentManager relatedType="Driver" relatedId={form.id} /></>}
          </div>
        </div>
      )}
    </div>
  )
}