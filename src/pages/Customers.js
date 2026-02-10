import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'

// 🔑 REPLACE WITH YOUR KEY
const GOOGLE_API_KEY = 'AIzaSyAZUXRQEb1TYiAm4t3IrHS25QGug6oXi1I'; 

const currencyMap = {
  'United Arab Emirates': 'AED', 'Saudi Arabia': 'SAR', 'Qatar': 'QAR',
  'Oman': 'OMR', 'Bahrain': 'BHD', 'Kuwait': 'KWD',
  'United States': 'USD', 'United Kingdom': 'GBP', 'India': 'INR'
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
    
    // Address Parts (Pure Location now)
    po_box: '', street: '', city: '', country: 'United Arab Emirates',
    
    // Primary Contact (The "Default" one)
    default_contact_name: '',       // Mapped to DB: default_contact_name
    default_designation: 'General Manager', // Mapped to DB: default_designation
    default_mobile: '',             // Mapped to DB: default_mobile
    default_email: '',              // Mapped to DB: default_email
    
    website: '',

    // Financials
    credit_limit: 5000, 
    currency: 'AED', 
    trn_number: '', 
    introduced_by: '', 
    status: 'Active',
    
    // Additional Sales Team
    contacts: [] 
  }
  const [form, setForm] = useState(initialForm)

  // --- 1. LOAD DATA ---
  useEffect(() => {
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
          default_mobile: place.formatted_phone_number || '', website: place.website || '',
          default_contact_name: 'Manager'
        }))
      })
    }
  }, [isGoogleLoaded, showModal, activeTab])

  // --- DATA FETCHING ---
  const fetchItems = async (search = '') => {
    try {
      // We fetch everything, including the sub-table contacts
      let query = supabase.from('master_customers')
        .select('*, customer_contacts(*)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (error) { console.error(error) }
  }
  
  const fetchCountries = async () => { const { data } = await supabase.from('master_countries').select('name').order('name'); if(data) setCountries(data) }
  const fetchCities = async (country) => { const { data } = await supabase.from('master_cities').select('name').eq('country_name', country).order('name'); setCities(data || []) }
  const fetchDesignations = async () => { const { data } = await supabase.from('master_designations').select('title').order('title'); setDesignations(data || []) }
  const fetchCategories = async () => { const { data } = await supabase.from('master_categories').select('title').order('title'); setCategories(data || []) }

  useEffect(() => { 
      if(form.country) {
          fetchCities(form.country)
          const currency = currencyMap[form.country] || 'USD'
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
      fetchDesignations(); setForm(p => ({...p, default_designation: val}))
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

  // --- 💾 SAVE LOGIC (THE FIX) ---
  const handleSave = async () => {
    const payload = { ...form }
    
    // 1. Validation
    if(payload.name.length < 3) return alert("❌ Name too short!")
    if(!payload.category) return alert("❌ Please select a Category.")
    if(!payload.city) return alert("❌ Please select a City.")
    if(!payload.default_contact_name) return alert("❌ Primary Contact Name is required.")

    // 2. Fix Address: PURE Location only (No names here!)
    // This solves your issue of "Primary contact saved in address field"
    payload.address = `
${payload.po_box ? 'PO Box: ' + payload.po_box : ''} 
${payload.street || ''}
${payload.city}, ${payload.country}
    `.trim()

    // 3. Clean Payload for Master Table
    const masterPayload = {
        name: payload.name,
        category: payload.category,
        city: payload.city,
        country: payload.country,
        address: payload.address, // Clean address
        po_box: payload.po_box,
        street: payload.street,
        
        // Save Default Contact Columns Explicitly
        default_contact_name: payload.default_contact_name,
        default_designation: payload.default_designation,
        default_mobile: payload.default_mobile,
        default_email: payload.default_email,

        website: payload.website,
        credit_limit: payload.credit_limit,
        currency: payload.currency,
        trn_number: payload.trn_number,
        introduced_by: payload.introduced_by,
        status: payload.status
    }

    // 4. Insert/Update Master Customer
    let { data, error } = isEditing 
        ? await supabase.from('master_customers').update(masterPayload).eq('id', form.id).select()
        : await supabase.from('master_customers').insert([masterPayload]).select()
    
    if(error) return alert("Error: " + error.message)
    const customerId = data[0].id

    // 5. HANDLE CONTACTS (THE COPY LOGIC)
    // We delete all old contacts for this customer to ensure a clean slate
    await supabase.from('customer_contacts').delete().eq('customer_id', customerId)

    const allContacts = []

    // A. Add the PRIMARY Contact (Copied from Master)
    allContacts.push({
        customer_id: customerId,
        contact_person: payload.default_contact_name,
        designation: payload.default_designation,
        mobile: payload.default_mobile,
        email: payload.default_email,
        is_primary: true // Mark as Primary
    })

    // B. Add the Additional Sales Team
    if (form.contacts && form.contacts.length > 0) {
        form.contacts.forEach(c => {
            if (c.contact_person) {
                allContacts.push({
                    customer_id: customerId,
                    contact_person: c.contact_person,
                    designation: c.designation,
                    mobile: c.mobile,
                    email: c.email,
                    is_primary: false
                })
            }
        })
    }

    // C. Save All to Table 2
    if(allContacts.length > 0) {
        const { error: teamError } = await supabase.from('customer_contacts').insert(allContacts)
        if (teamError) console.error("Team Save Error:", teamError)
    }

    setShowModal(false); fetchItems(searchTerm)
  }

  const handleDelete = async (id) => {
      if(window.confirm("Delete Customer?")) {
          await supabase.from('master_customers').update({ is_deleted: true }).eq('id', id)
          fetchItems(searchTerm)
      }
  }

  // --- OPEN/EDIT HANDLERS ---
  const openAdd = () => { setForm(initialForm); setIsEditing(false); setActiveTab('profile'); setShowModal(true) }
  
  const openEdit = (item) => { 
      // Filter out the primary contact from the 'additional contacts' list so it doesn't duplicate in the UI
      const secondaryContacts = item.customer_contacts 
        ? item.customer_contacts.filter(c => !c.is_primary) 
        : []

      setForm({ 
          ...item, 
          // Load default contact into main fields
          default_contact_name: item.default_contact_name,
          default_designation: item.default_designation,
          default_mobile: item.default_mobile,
          default_email: item.default_email,
          
          contacts: secondaryContacts 
      }); 
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
          <thead><tr><th>Customer / Category</th><th>Primary Contact</th><th>Additional Team</th><th>Status</th><th>Action</th></tr></thead>
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
                    {/* Display from Master Columns */}
                    {item.default_contact_name}<br/>
                    <small style={{color:'#64748b'}}>{item.default_designation}</small>
                </td>
                <td>
                    {/* Display Count of Additional Contacts */}
                    {item.customer_contacts && item.customer_contacts.filter(c => !c.is_primary).length > 0 ? (
                        <span style={{fontSize:'11px', background:'#f1f5f9', padding:'4px 8px', borderRadius:'4px'}}>
                            {item.customer_contacts.filter(c => !c.is_primary).length} Additional Reps
                        </span>
                    ) : (
                        <span style={{color:'#94a3b8', fontStyle:'italic'}}>-</span>
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
                <div onClick={()=>setActiveTab('profile')} style={tabStyle('profile')}>1. Profile & Primary Contact</div>
                <div onClick={()=>setActiveTab('team')} style={tabStyle('team')}>2. Additional Sales Team</div>
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

                   {/* --- PRIMARY CONTACT SECTION --- */}
                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb'}}>✒️ Primary Contact (Authorized Signatory)</h4>
                   
                   <div><span className="form-label">Full Name *</span><input value={form.default_contact_name} onChange={e=>setForm({...form, default_contact_name:e.target.value})} className="form-input" placeholder="e.g. John Doe" /></div>
                   
                   <div>
                       <span className="form-label">Designation</span>
                       <div style={{display:'flex', gap:'5px'}}>
                           <select value={form.default_designation} onChange={e=>setForm({...form, default_designation:e.target.value})} className="form-input">
                               {designations.map(d=><option key={d.id} value={d.title}>{d.title}</option>)}
                           </select>
                           <button onClick={handleAddDesignation} className="btn btn-success">+</button>
                       </div>
                   </div>
                   
                   <div><span className="form-label">Direct Mobile</span><input value={form.default_mobile} onChange={e=>setForm({...form, default_mobile:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Direct Email</span><input value={form.default_email} onChange={e=>setForm({...form, default_email:e.target.value})} className="form-input" /></div>

                   {/* --- ADDRESS SECTION --- */}
                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb'}}>📍 Location Address</h4>
                   <div>
                       <span className="form-label">City *</span>
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
                   <div><span className="form-label">Street / Area</span><input value={form.street} onChange={e=>setForm({...form, street:e.target.value})} className="form-input" /></div>
                </div>
              )}

              {/* TAB 2: SALES TEAM (ADDITIONAL) */}
              {activeTab === 'team' && (
                <div>
                    <div style={{background:'#fffbeb', border:'1px solid #fcd34d', padding:'10px', marginBottom:'15px', borderRadius:'6px', color:'#92400e'}}>
                        ℹ️ <strong>Note:</strong> The Primary Contact (from Tab 1) is automatically added to the contact list. Use this section for <em>additional</em> staff only.
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <h4>🎯 Additional Sales & Procurement Contacts</h4>
                        <button onClick={addTeamMember} className="btn btn-success">+ Add Team Member</button>
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
                    {form.contacts.length===0 && <div style={{textAlign:'center', color:'#ccc', padding:'20px'}}>No additional team members added.</div>}
                </div>
              )}

              {/* TAB 3: FINANCIALS */}
              {activeTab === 'finance' && (
                <div className="form-grid">
                    <div><span className="form-label">Credit Limit (AED)</span><input type="number" value={form.credit_limit} onChange={e=>setForm({...form, credit_limit:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">TRN Number</span><input value={form.trn_number} onChange={e=>setForm({...form, trn_number:e.target.value})} className="form-input" /></div>
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