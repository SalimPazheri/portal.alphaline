
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Agents() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [cities, setCities] = useState([])
  const [searchTerm, setSearchTerm] = useState('') 
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // --- INITIAL FORM ---
  const initialForm = {
    id: null,
    name: '',
    type: 'Transporter', // Default to Transporter since that's your main use case
    
    // Address
    po_box: '', street: '', city: '', country: '',
    
    // Primary Contact
    contact_person: '', designation: '', phone: '', email: '', website: '',
    
    status: 'Active'
  }
  const [form, setForm] = useState(initialForm)

  // --- LOAD DATA ---
  useEffect(() => {
    fetchItems(); fetchCountries();
  }, [])

  // --- DATA FETCHING ---
  const fetchItems = async (search = '') => {
    try {
      let query = supabase.from('master_agents').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
      if (search) query = query.ilike('name', `%${search}%`)
      const { data } = await query
      setItems(data || [])
    } catch (error) { console.error(error) }
  }
  
  const fetchCountries = async () => { const { data } = await supabase.from('master_countries').select('name').order('name'); if(data) setCountries(data) }
  const fetchCities = async (country) => { const { data } = await supabase.from('master_cities').select('name').eq('country_name', country).order('name'); setCities(data || []) }
  
  // Auto-fetch cities when country changes
  useEffect(() => { if(form.country) fetchCities(form.country) }, [form.country])

  // --- ADDERS ---
  const handleAddCity = async () => {
      const val = prompt("New City Name:"); if(!val) return
      await supabase.from('master_cities').insert([{ country_name: form.country, name: val }])
      fetchCities(form.country); setForm(p => ({...p, city: val}))
  }

  // --- SAVE ---
  const handleSave = async () => {
    const payload = { ...form }
    
    if(payload.name.length < 2) return alert("❌ Name too short!")
    if(!payload.country) return alert("❌ Please select Country.")

    // Compose Address for printing
    payload.address = `
${payload.contact_person}
${payload.po_box || ''} ${payload.street || ''}
${payload.city}, ${payload.country}
Ph: ${payload.phone}
    `.trim()

    delete payload.id; 

    let { error } = isEditing 
        ? await supabase.from('master_agents').update(payload).eq('id', form.id)
        : await supabase.from('master_agents').insert([payload])
    
    if(error) return alert("Error: " + error.message)

    setShowModal(false); fetchItems(searchTerm)
  }

  // --- DELETE ---
  const handleDelete = async (id) => {
      if(window.confirm("Delete Agent?")) {
          await supabase.from('master_agents').update({ is_deleted: true }).eq('id', id)
          fetchItems(searchTerm)
      }
  }

  // Helpers
  const openAdd = () => { setForm(initialForm); setIsEditing(false); setShowModal(true) }
  const openEdit = (item) => { setForm(item); setIsEditing(true); setShowModal(true) }

  return (
    <div className="page-container" style={{fontSize:'13px'}}>
      <div className="header-row">
        <h2>🚚 Agents & Transporters</h2>
        <div style={{display:'flex', gap:'10px'}}>
            <input placeholder="🔍 Search..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
            <button onClick={openAdd} className="btn btn-primary">+ New Agent</button>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>Agent / Transporter</th><th>Contact Person</th><th>Phone / Email</th><th>City</th><th>Action</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                    <strong>{item.name}</strong><br/>
                    <span style={{fontSize:'10px', background:'#f0f9ff', color:'#0284c7', padding:'2px 6px', borderRadius:'4px'}}>{item.type}</span>
                </td>
                <td>{item.contact_person}<br/><small style={{color:'#666'}}>{item.designation}</small></td>
                <td>{item.phone}<br/><small>{item.email}</small></td>
                <td>{item.city}, {item.country}</td>
                <td>
                    <span onClick={()=>openEdit(item)} className="icon-action">📝</span>
                    <span onClick={()=>handleDelete(item.id)} className="icon-action" style={{color:'red', marginLeft:'10px'}}>🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'800px', height:'auto'}}>
            <div className="modal-header"><h3>{isEditing?'Edit Agent':'New Agent'}</h3><button onClick={()=>setShowModal(false)} className="btn-close">✖</button></div>
            
            <div className="modal-body">
                {/* SINGLE VIEW FORM */}
                <div className="form-grid" style={{
                    display:'grid', 
                    gridTemplateColumns:'1fr 1fr', 
                    gap:'15px', 
                    maxWidth:'750px', 
                    margin:'0 auto' // Centered
                }}>
                   
                   <div style={{gridColumn:'span 2'}}>
                       <span className="form-label">Company Name *</span>
                       <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="form-input" placeholder="e.g. Al Futtaim Logistics" />
                   </div>

                   <div>
                       <span className="form-label">Type</span>
                       <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="form-input">
                           <option value="Transporter">Transporter (Trucking)</option>
                           <option value="Airline">Airline</option>
                           <option value="Shipping Line">Shipping Line</option>
                           <option value="Customs Broker">Customs Broker</option>
                           <option value="Overseas Agent">Overseas Agent</option>
                       </select>
                   </div>
                   <div><span className="form-label">Website</span><input value={form.website} onChange={e=>setForm({...form, website:e.target.value})} className="form-input" /></div>

                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>👤 Contact Person</h4>

                   <div><span className="form-label">Name</span><input value={form.contact_person} onChange={e=>setForm({...form, contact_person:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Designation</span><input value={form.designation} onChange={e=>setForm({...form, designation:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Phone / Mobile</span><input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Email</span><input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="form-input" /></div>

                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>📍 Location</h4>

                   <div><span className="form-label">Country *</span>
                       <select value={form.country} onChange={e=>setForm({...form, country:e.target.value})} className="form-input">
                           <option value="">-- Select Country --</option>
                           {countries.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                   </div>
                   <div>
                       <span className="form-label">City</span>
                       <div style={{display:'flex', gap:'5px'}}>
                           <select value={form.city} onChange={e=>setForm({...form, city:e.target.value})} className="form-input">
                               <option value="">-- Select --</option>
                               {cities.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                           </select>
                           <button onClick={handleAddCity} className="btn btn-success">+</button>
                       </div>
                   </div>
                   
                   <div><span className="form-label">PO Box</span><input value={form.po_box} onChange={e=>setForm({...form, po_box:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Street Address</span><input value={form.street} onChange={e=>setForm({...form, street:e.target.value})} className="form-input" /></div>
                </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button onClick={handleSave} className="btn btn-primary" style={{ padding: '10px 20px' }}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}