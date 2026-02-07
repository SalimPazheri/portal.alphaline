import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

// 🔑 REPLACE WITH YOUR KEY
const GOOGLE_API_KEY = 'AIzaSyAZUXRQEb1TYiAm4t3IrHS25QGug6oXi1I'; 

const currencyMap = {
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  'Qatar': 'QAR',
  'Oman': 'OMR',
  'Bahrain': 'BHD',
  'Kuwait': 'KWD',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  'India': 'INR'
}
export default function Customers() {
  const [items, setItems] = useState([])
  const [countries, setCountries] = useState([])
  const [cities, setCities] = useState([])
  const [designations, setDesignations] = useState([])
  const [categories, setCategories] = useState([]) 
  const [searchTerm, setSearchTerm] = useState('') 
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)

  // Google Maps Refs
  const googleSearchRef = useRef(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)

  // --- INITIAL FORM STATE ---
  const initialForm = {
    id: null,
    name: '',
    category: '', 
    
    // Address Parts
    po_box: '', street: '', city: '', country: 'United Arab Emirates',
    
    // VIP / Authorized Signatory
    contact_person: '', designation: 'General Manager', 
    office_phone: '', office_email: '', website: '',

    // Financials
    credit_limit: 5000, 
    currency: 'AED', 
    trn_number: '', 
    introduced_by: '', // <--- RENAMED FIELD
    status: 'Active',
    
    // Sales Team
    contacts: [] 
  }
  const [form, setForm] = useState(initialForm)

  // --- CURRENCY MAP (Option B) ---
 

  // --- 1. LOAD DATA ---
  useEffect(() => {
    // Google Maps Script Loader
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`
      script.async = true
      script.onload = () => setIsGoogleLoaded(true)
      document.body.appendChild(script)
    } else { setIsGoogleLoaded(true) }
    
    fetchItems(); fetchCountries(); fetchDesignations(); fetchCategories() 
  }, [])

  // --- 2. GOOGLE AUTOCOMPLETE ---
  useEffect(() => {
    if (isGoogleLoaded && showModal && activeTab === 'profile' && googleSearchRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(googleSearchRef.current, {
        types: ['establishment'], fields: ['name', 'formatted_phone_number', 'website', 'address_components']
      })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.name) return
        
        let city = '', country = '', street = ''
        place.address_components?.forEach(c => {
          if(c.types.includes('locality')) city = c.long_name
          if(c.types.includes('country')) country = c.long_name
          if(c.types.includes('route')) street = c.long_name
        })

        setForm(prev => ({
          ...prev, name: place.name, street: street, city: city, country: country,
          office_phone: place.formatted_phone_number || '', website: place.website || '',
          contact_person: 'Manager'
        }))
        alert("✅ Data fetched! Please fill Authorized Signatory.")
      })
    }
  }, [isGoogleLoaded, showModal, activeTab])

  // --- DATA FETCHING ---
  const fetchItems = async (search = '') => {
    try {
      let query = supabase.from('master_customers').select('*, customer_contacts(*)').eq('is_deleted', false).order('created_at', { ascending: false })
      if (search) query = query.ilike('name', `%${search}%`)
      const { data } = await query
      setItems(data || [])
    } catch (error) { console.error(error) }
  }
  
  const fetchCountries = async () => { const { data } = await supabase.from('master_countries').select('name').order('name'); if(data) setCountries(data) }
  const fetchCities = async (country) => { const { data } = await supabase.from('master_cities').select('name').eq('country_name', country).order('name'); setCities(data || []) }
  const fetchDesignations = async () => { const { data } = await supabase.from('master_designations').select('title').order('title'); setDesignations(data || []) }
  const fetchCategories = async () => { const { data } = await supabase.from('master_categories').select('title').order('title'); setCategories(data || []) }

  // --- SMART CURRENCY & CITY LOGIC ---
  useEffect(() => { 
      if(form.country) {
          fetchCities(form.country)
          // Auto-set Currency
          const currency = currencyMap[form.country] || 'USD' // Default fallback
          setForm(prev => ({ ...prev, currency: currency }))
      }
  }, [form.country])

  // --- SMART ADDERS ---
  const handleAddCity = async () => {
      const val = prompt("New City Name:"); if(!val) return
      await supabase.from('master_cities').insert([{ country_name: form.country, name: val }])
      fetchCities(form.country); setForm(p => ({...p, city: val}))
  }
  const handleAddDesignation = async () => {
      const val = prompt("New Designation:"); if(!val) return
      await supabase.from('master_designations').insert([{ title: val }])
      fetchDesignations(); setForm(p => ({...p, designation: val}))
  }
  const handleAddCategory = async () => {
      const val = prompt("New Category Name:"); if(!val) return
      const { error } = await supabase.from('master_categories').insert([{ title: val }])
      if(error) alert(error.message)
      else { await fetchCategories(); setForm(p => ({...p, category: val})) }
  }

  // --- TEAM MANAGEMENT ---
  const addTeamMember = () => setForm(p => ({ ...p, contacts: [...p.contacts, { contact_person: '', designation: '', mobile: '', email: '' }] }))
  const removeTeamMember = (idx) => { const c = [...form.contacts]; c.splice(idx, 1); setForm(p => ({ ...p, contacts: c })) }
  const updateTeamMember = (idx, field, val) => { const c = [...form.contacts]; c[idx][field] = val; setForm(p => ({ ...p, contacts: c })) }

  // --- SAVE LOGIC (FIXED: KEEPS PO BOX) ---
  const handleSave = async () => {
    const payload = { ...form }
    
    // Validation
    if(payload.name.length < 3) return alert("❌ Name too short!")
    if(!payload.category) return alert("❌ Please select a Category.")
    if(!payload.city) return alert("❌ Please select a City.")
    
    // Address Composition (For Proposals)
    payload.address = `
${payload.contact_person} (${payload.designation})
${payload.po_box || ''} ${payload.street || ''}
${payload.city}, ${payload.country}
Ph: ${payload.office_phone}
    `.trim()

    // Clean Payload
    delete payload.id; delete payload.contacts; delete payload.customer_contacts
    
    // Note: We KEEP po_box and street so they are saved!

    // 1. Save Master
    let { data, error } = isEditing 
        ? await supabase.from('master_customers').update(payload).eq('id', form.id).select()
        : await supabase.from('master_customers').insert([payload]).select()
    
    if(error) return alert("Error: " + error.message)
    const customerId = data[0].id

    // 2. Save Team
    if(form.contacts.length > 0) {
        await supabase.from('customer_contacts').delete().eq('customer_id', customerId)
        const teamPayload = form.contacts.map(c => ({
            customer_id: customerId, ...c
        })).filter(c => c.contact_person)
        await supabase.from('customer_contacts').insert(teamPayload)
    }

    setShowModal(false); fetchItems(searchTerm)
  }

  // --- DELETE LOGIC ---
  const handleDelete = async (id) => {
      if(window.confirm("Delete Customer?")) {
          await supabase.from('master_customers').update({ is_deleted: true }).eq('id', id)
          fetchItems(searchTerm)
      }
  }

  // Helpers
  const openAdd = () => { setForm(initialForm); setIsEditing(false); setActiveTab('profile'); setShowModal(true) }
  const openEdit = (item) => { 
      setForm({ ...item, contacts: item.customer_contacts || [] }); 
      setIsEditing(true); setActiveTab('profile'); setShowModal(true) 
  }
  
  const tabStyle = (name) => ({ padding:'12px 20px', cursor:'pointer', borderBottom: activeTab===name?'3px solid #2563eb':'3px solid transparent', color: activeTab===name?'#2563eb':'#64748b', fontWeight:'bold' })

  return (
    <div className="page-container" style={{fontSize:'13px'}}>
      <div className="header-row">
        <h2>👥 Master Customers</h2>
        <div style={{display:'flex', gap:'10px'}}>
            <input placeholder="🔍 Search..." onChange={e => {setSearchTerm(e.target.value); fetchItems(e.target.value)}} className="search-bar" />
            <button onClick={openAdd} className="btn btn-primary">+ New Customer</button>
        </div>
      </div>

      {/* SMART GRID */}
      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>Customer / Category</th><th>Auth. Signatory</th><th>Sales & Procurement</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                    <strong>{item.name}</strong><br/>
                    <span style={{fontSize:'10px', background:'#e0f2fe', color:'#0369a1', padding:'2px 6px', borderRadius:'4px'}}>
                        {item.category || 'Uncategorized'}
                    </span>
                    <span style={{fontSize:'11px', color:'#64748b', marginLeft:'5px'}}>{item.city}</span>
                </td>
                <td>
                    {item.contact_person}<br/>
                    <small style={{color:'#64748b'}}>{item.designation}</small>
                </td>
                <td>
                    {/* SMART DISPLAY LOGIC */}
                    {item.customer_contacts && item.customer_contacts.length > 0 ? (
                        <div>
                            <span style={{fontWeight:'600'}}>{item.customer_contacts[0].contact_person}</span>
                            <br/>
                            <small style={{color:'#64748b'}}>{item.customer_contacts[0].designation}</small>
                            {item.customer_contacts.length > 1 && (
                                <span style={{marginLeft:'5px', fontSize:'10px', background:'#f1f5f9', padding:'1px 4px', borderRadius:'4px'}}>
                                    +{item.customer_contacts.length - 1} more
                                </span>
                            )}
                        </div>
                    ) : (
                        <span style={{color:'#94a3b8', fontStyle:'italic'}}>(Same as Primary)</span>
                    )}
                </td>
                <td><span className={`status-badge ${item.status==='Active'?'green':'red'}`}>{item.status}</span></td>
                <td>
                    <span onClick={()=>openEdit(item)} className="icon-action">📝</span>
                    <span onClick={()=>handleDelete(item.id)} className="icon-action" style={{color:'red', marginLeft:'10px'}}>🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'900px', height:'auto'}}>
            <div className="modal-header"><h3>{isEditing?'Edit Customer':'New Customer'}</h3><button onClick={()=>setShowModal(false)} className="btn-close">✖</button></div>
            
            <div style={{display:'flex', borderBottom:'1px solid #eee', background:'#f8fafc'}}>
                <div onClick={()=>setActiveTab('profile')} style={tabStyle('profile')}>1. Profile & Signatory</div>
                <div onClick={()=>setActiveTab('team')} style={tabStyle('team')}>2. Sales & Procurement</div>
                <div onClick={()=>setActiveTab('finance')} style={tabStyle('finance')}>3. Financials</div>
                <div onClick={()=>isEditing && setActiveTab('docs')} style={tabStyle('docs')}>4. Documents</div>
            </div>

            <div className="modal-body">
              {/* TAB 1: SMART PROFILE */}
              {activeTab === 'profile' && (
                <div className="form-grid">
                   <div style={{gridColumn:'span 2', background:'#eff6ff', padding:'10px', borderRadius:'8px', marginBottom:'10px'}}>
                       <span style={{fontWeight:'bold', color:'#1e40af'}}>🚀 Auto-Fill from Google:</span>
                       <input ref={googleSearchRef} className="form-input" placeholder="Type Company Name..." style={{marginTop:'5px', border:'2px solid #3b82f6'}} />
                   </div>

                   <div><span className="form-label">Customer Name *</span><input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="form-input" /></div>
                   
                   <div>
                       <span className="form-label">Business Category *</span>
                       <div style={{display:'flex', gap:'5px'}}>
                           <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="form-input">
                               <option value="">-- Select Category --</option>
                               {categories.map(c=><option key={c.id} value={c.title}>{c.title}</option>)}
                           </select>
                           <button onClick={handleAddCategory} className="btn btn-success">+</button>
                       </div>
                   </div>
                   
                   <div><span className="form-label">Website</span><input value={form.website} onChange={e=>setForm({...form, website:e.target.value})} className="form-input" /></div>

                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb'}}>✒️ Authorized Signatory</h4>
                   <div><span className="form-label">Full Name</span><input value={form.contact_person} onChange={e=>setForm({...form, contact_person:e.target.value})} className="form-input" placeholder="Owner/GM Name" /></div>
                   <div>
                       <span className="form-label">Designation</span>
                       <div style={{display:'flex', gap:'5px'}}>
                           <select value={form.designation} onChange={e=>setForm({...form, designation:e.target.value})} className="form-input">
                               {designations.map(d=><option key={d.id} value={d.title}>{d.title}</option>)}
                           </select>
                           <button onClick={handleAddDesignation} className="btn btn-success">+</button>
                       </div>
                   </div>
                   
                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb'}}>📍 Address</h4>
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
                   <div><span className="form-label">Country</span><select value={form.country} onChange={e=>setForm({...form, country:e.target.value})} className="form-input">{countries.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                   <div><span className="form-label">PO Box</span><input value={form.po_box} onChange={e=>setForm({...form, po_box:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Street</span><input value={form.street} onChange={e=>setForm({...form, street:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Office Phone</span><input value={form.office_phone} onChange={e=>setForm({...form, office_phone:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Office Email</span><input value={form.office_email} onChange={e=>setForm({...form, office_email:e.target.value})} className="form-input" /></div>
                </div>
              )}

              {/* TAB 2: SALES TEAM */}
              {activeTab === 'team' && (
                <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <h4>🎯 Sales & Procurement Contacts</h4>
                        <button onClick={addTeamMember} className="btn btn-success">+ Add Contact</button>
                    </div>
                    {form.contacts.map((row, idx) => (
                        <div key={idx} style={{display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 0.2fr', gap:'5px', marginBottom:'5px'}}>
                            <input placeholder="Name" value={row.contact_person} onChange={e=>updateTeamMember(idx, 'contact_person', e.target.value)} className="form-input" />
                            <input placeholder="Role" value={row.designation} onChange={e=>updateTeamMember(idx, 'designation', e.target.value)} className="form-input" />
                            <input placeholder="Mobile" value={row.mobile} onChange={e=>updateTeamMember(idx, 'mobile', e.target.value)} className="form-input" />
                            <input placeholder="Email" value={row.email} onChange={e=>updateTeamMember(idx, 'email', e.target.value)} className="form-input" />
                            <button onClick={()=>removeTeamMember(idx)} style={{border:'none', background:'none', color:'red', cursor:'pointer'}}>✖</button>
                        </div>
                    ))}
                    {form.contacts.length===0 && <div style={{textAlign:'center', color:'#ccc'}}>No contacts added. (Will use Primary for proposals)</div>}
                </div>
              )}

              {/* TAB 3: FINANCIALS */}
              {activeTab === 'finance' && (
                <div className="form-grid">
                    <div><span className="form-label">Credit Limit (AED)</span><input type="number" value={form.credit_limit} onChange={e=>setForm({...form, credit_limit:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">TRN Number</span><input value={form.trn_number} onChange={e=>setForm({...form, trn_number:e.target.value})} className="form-input" /></div>
                    
                    {/* RENAMED FIELD */}
                    <div><span className="form-label">Introduced By</span><input value={form.introduced_by} onChange={e=>setForm({...form, introduced_by:e.target.value})} className="form-input" /></div>
                    
                    <div><span className="form-label">Currency</span><input disabled value={form.currency} className="form-input" style={{background:'#eee'}} /></div>
                </div>
              )}

              {/* TAB 4: DOCUMENTS */}
              {activeTab === 'docs' && <DocumentManager relatedType="Customer" relatedId={form.id} />}
            </div>

            <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary">💾 Save All Changes</button></div>
          </div>
        </div>
      )}
    </div>
  )
}