import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import DocumentManager from '../components/DocumentManager'
import { Plus, Search, Edit2, Trash2, X, Save, User, MapPin, Briefcase, DollarSign } from 'lucide-react'

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

  const googleSearchRef = useRef(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)

  const initialForm = {
    id: null,
    name: '',
    category_id: '', 
    po_box: '', street: '', city: '', country: 'Bahrain', address: '',
    default_contact_name: '',       
    default_designation_id: '', 
    default_mobile: '',             
    default_email: '',              
    website: '',
    credit_limit: 5000, 
    currency: 'BHD', 
    payment_terms: '30 Days',
    vat_number: '', 
    cr_number: '', 
    introduced_by: '', 
    status: 'Active',
    contacts: [] 
  }
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`
      script.async = true
      script.onload = () => setIsGoogleLoaded(true)
      document.body.appendChild(script)
    } else { setIsGoogleLoaded(true) }
    
    fetchItems()
    fetchCountries() 
    fetchDesignations() 
    fetchCategories()
    determineDefaultCurrency() 
  }, [])

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
          default_contact_name: 'Mr.'
        }))
      })
    }
  }, [isGoogleLoaded, showModal, activeTab])

  // --- DATA FETCHING ---
  const fetchItems = async (search = '') => {
    try {
      // ✅ FIXED: Changed 'designation(name)' to 'designation(title)' to match DB
      let query = supabase.from('master_customers')
        .select(`
            *, 
            customer_contacts(*),
            designation:default_designation_id(title), 
            category_details:category_id(title)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (error) { console.error(error) }
  }
  
  const determineDefaultCurrency = async () => {
    const userSessionCurrency = localStorage.getItem('user_currency')
    if (userSessionCurrency) {
        setForm(prev => ({ ...prev, currency: userSessionCurrency }))
        return
    }
    const { data } = await supabase.from('global_settings').select('setting_value').eq('setting_key', 'default_currency').single()
    if (data) setForm(prev => ({ ...prev, currency: data.setting_value }))
  }

  // Master Lists
  // ✅ FIXED: We need the ID of the country now, not just the name
  const fetchCountries = async () => { 
    const { data } = await supabase
        .from('master_countries')
        .select('id, name')
        .order('name'); 
    
    if(data && data.length > 0) {
        setCountries(data);
        
        // ✨ THE FIX: Check if our current default 'Bahrain' is actually in the list
        // If not, automatically switch to the first country found (e.g., UAE)
        const currentIsValid = data.some(c => c.name === form.country);
        if (!currentIsValid) {
             setForm(prev => ({ ...prev, country: data[0].name }));
        }
    }
  }
  
  const fetchCities = async (countryName) => { 
     // We have to find the country ID based on the name selected in the dropdown
     const countryObj = countries.find(c => c.name === countryName);
     if(!countryObj) return;

     // ✅ FIXED: Use country_id (UUID) to find cities
     const { data } = await supabase.from('master_cities')
       .select('name')
       .eq('country_id', countryObj.id) 
       .order('name'); 
     setCities(data || []) 
  }
  
  const fetchDesignations = async () => { const { data } = await supabase.from('master_designations').select('*').order('title'); setDesignations(data || []) }
  const fetchCategories = async () => { const { data } = await supabase.from('master_categories').select('*').order('title'); setCategories(data || []) }

  useEffect(() => { 
      if(form.country && countries.length > 0) {
          fetchCities(form.country)
          if(!form.currency) {
             const currency = currencyMap[form.country] || 'USD'
             setForm(prev => ({ ...prev, currency: currency }))
          }
      }
  }, [form.country, countries]) // Added countries dependency

  // --- SMART ADDERS ---
  const handleAddCity = async () => {
    const val = prompt("New City Name:"); 
    if(!val) return

    // 1. LOOKUP: Find the full object (ID + Name) from your list
    const selectedCountryObj = countries.find(c => c.name === form.country);

    // 2. SAFETY CHECK: Did we find it?
    if (!selectedCountryObj) {
        alert(`Error: Could not find ID for country '${form.country}'. Please select a country again.`);
        return;
    }

    // 3. INSERT: Use the found ID (selectedCountryObj.id)
    const { error } = await supabase
        .from('master_cities')
        .insert([{ 
            country_id: selectedCountryObj.id, // ✅ This sends the UUID
            name: val 
        }]);
    
    if(error) {
        alert("Error adding city: " + error.message);
    } else {
        // Refresh the city list
        fetchCities(form.country); 
        setForm(p => ({...p, city: val}));
    }
}
  
  const handleAddDesignation = async () => {
      const val = prompt("New Designation:"); if(!val) return
      const { data, error } = await supabase.from('master_designations').insert([{ title: val }]).select().single()
      if(error) alert(error.message)
      else { 
          await fetchDesignations(); 
          setForm(p => ({...p, default_designation_id: data.id})) 
      }
  }
  
  const handleAddCategory = async () => {
      const val = prompt("New Category Name:"); if(!val) return
      const { data, error } = await supabase.from('master_categories').insert([{ title: val }]).select().single()
      if(error) alert(error.message)
      else { 
          await fetchCategories(); 
          setForm(p => ({...p, category_id: data.id})) 
      }
  }

  // --- TEAM MANAGEMENT ---
  const addTeamMember = () => setForm(p => ({ ...p, contacts: [...p.contacts, { contact_person: '', designation: '', mobile: '', email: '' }] }))
  const removeTeamMember = (idx) => { const c = [...form.contacts]; c.splice(idx, 1); setForm(p => ({ ...p, contacts: c })) }
  const updateTeamMember = (idx, field, val) => { const c = [...form.contacts]; c[idx][field] = val; setForm(p => ({ ...p, contacts: c })) }

  // --- 💾 SAVE LOGIC ---
  const handleSave = async () => {
    const payload = { ...form }
    
    if(payload.name.length < 3) return alert("❌ Name too short!")
    if(!payload.category_id) return alert("❌ Please select a Category.")
    if(!payload.default_contact_name) return alert("❌ Primary Contact Name is required.")

    payload.address = `
${payload.po_box ? 'PO Box: ' + payload.po_box : ''} 
${payload.street || ''}
${payload.city || ''}, ${payload.country || ''}
    `.trim()

    // 3. Clean Payload
    const masterPayload = {
        name: payload.name,
        // ✅ FIXED: Convert empty string '' to null, or Postgres crashes on UUID
        category_id: payload.category_id || null, 
        
        city: payload.city,
        country: payload.country,
        address: payload.address, 
        po_box: payload.po_box,
        street: payload.street,
        
        default_contact_name: payload.default_contact_name,
        // ✅ FIXED: Convert empty string '' to null
        default_designation_id: payload.default_designation_id || null, 
        
        default_mobile: payload.default_mobile,
        default_email: payload.default_email,

        website: payload.website,
        credit_limit: payload.credit_limit,
        currency: payload.currency,
        vat_number: payload.vat_number, 
        cr_number: payload.cr_number,
        introduced_by: payload.introduced_by,
        status: payload.status,
        payment_terms: payload.payment_terms
    }

    let { data, error } = isEditing 
        ? await supabase.from('master_customers').update(masterPayload).eq('id', form.id).select()
        : await supabase.from('master_customers').insert([masterPayload]).select()
    
    if(error) return alert("Error: " + error.message)
    const customerId = data[0].id

    // 5. HANDLE CONTACTS
    await supabase.from('customer_contacts').delete().eq('customer_id', customerId)

    const allContacts = []

    allContacts.push({
        customer_id: customerId,
        contact_person: payload.default_contact_name,
        designation: 'Primary', 
        mobile: payload.default_mobile,
        email: payload.default_email,
        is_primary: true
    })

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

    if(allContacts.length > 0) {
        await supabase.from('customer_contacts').insert(allContacts)
    }

    setShowModal(false); fetchItems(searchTerm)
  }

  const handleDelete = async (id) => {
      if(window.confirm("Delete Customer?")) {
          await supabase.from('master_customers').update({ is_deleted: true }).eq('id', id)
          fetchItems(searchTerm)
      }
  }

  const openAdd = () => { setForm(initialForm); setIsEditing(false); setActiveTab('profile'); setShowModal(true) }
  
  const openEdit = (item) => { 
      const secondaryContacts = item.customer_contacts ? item.customer_contacts.filter(c => !c.is_primary) : []

      setForm({ 
          ...item, 
          // ✅ Ensure UUIDs are strings, not nulls, for the form inputs
          category_id: item.category_id || '',
          default_designation_id: item.default_designation_id || '',
          
          default_contact_name: item.default_contact_name,
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

      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>Customer / Category</th><th>Primary Contact</th><th>Additional Team</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                    <strong>{item.name}</strong><br/>
                    {/* ✅ FIXED: Use 'title' which we fetched in join */}
                    <span style={{fontSize:'10px', background:'#e0f2fe', color:'#0369a1', padding:'2px 6px', borderRadius:'4px'}}>
                        {item.category_details?.title || 'Uncategorized'}
                    </span>
                    <span style={{fontSize:'11px', color:'#64748b', marginLeft:'5px'}}>{item.city}</span>
                </td>
                <td>
                    {item.default_contact_name}<br/>
                    {/* ✅ FIXED: Use 'title' from designation join */}
                    <small style={{color:'#64748b'}}>{item.designation?.title || '-'}</small>
                </td>
                <td>
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
                           <select value={form.category_id} onChange={e=>setForm({...form, category_id:e.target.value})} className="form-input">
                               <option value="">-- Select Category --</option>
                               {/* ✅ FIXED: Use 'title' for display */}
                               {categories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
                           </select>
                           <button onClick={handleAddCategory} className="btn btn-success">+</button>
                       </div>
                   </div>
                   
                   <div><span className="form-label">Website</span><input value={form.website} onChange={e=>setForm({...form, website:e.target.value})} className="form-input" /></div>

                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb'}}>✒️ Primary Contact (Authorized Signatory)</h4>
                   
                   <div><span className="form-label">Full Name *</span><input value={form.default_contact_name} onChange={e=>setForm({...form, default_contact_name:e.target.value})} className="form-input" placeholder="e.g. John Doe" /></div>
                   
                   <div>
                       <span className="form-label">Designation</span>
                       <div style={{display:'flex', gap:'5px'}}>
                           <select value={form.default_designation_id} onChange={e=>setForm({...form, default_designation_id:e.target.value})} className="form-input">
                               <option value="">-- Select --</option>
                               {/* ✅ FIXED: Use 'title' for display */}
                               {designations.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
                           </select>
                           <button onClick={handleAddDesignation} className="btn btn-success">+</button>
                       </div>
                   </div>
                   
                   <div><span className="form-label">Direct Mobile</span><input value={form.default_mobile} onChange={e=>setForm({...form, default_mobile:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Direct Email</span><input value={form.default_email} onChange={e=>setForm({...form, default_email:e.target.value})} className="form-input" /></div>

                   <h4 style={{gridColumn:'span 2', margin:'10px 0 0', color:'#2563eb'}}>📍 Location Address</h4>
                   <div>
                       <span className="form-label">City *</span>
                       <div style={{display:'flex', gap:'5px'}}>
                           <select value={form.city} onChange={e=>setForm({...form, city:e.target.value})} className="form-input">
                               <option value="">-- Select --</option>
                               {cities.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                           </select>
                           <button onClick={handleAddCity} className="btn btn-success">+</button>
                       </div>
                   </div>
                   <div><span className="form-label">Country</span><select value={form.country} onChange={e=>setForm({...form, country:e.target.value})} className="form-input">{countries.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                   <div><span className="form-label">PO Box</span><input value={form.po_box} onChange={e=>setForm({...form, po_box:e.target.value})} className="form-input" /></div>
                   <div><span className="form-label">Street / Area</span><input value={form.street} onChange={e=>setForm({...form, street:e.target.value})} className="form-input" /></div>
                </div>
              )}

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

              {activeTab === 'finance' && (
                <div className="form-grid">
                    <div><span className="form-label">Credit Limit (AED)</span><input type="number" value={form.credit_limit} onChange={e=>setForm({...form, credit_limit:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">Payment Terms</span><input value={form.payment_terms} onChange={e=>setForm({...form, payment_terms:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">VAT / TRN Number</span><input value={form.vat_number} onChange={e=>setForm({...form, vat_number:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">CR Number</span><input value={form.cr_number} onChange={e=>setForm({...form, cr_number:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">Introduced By</span><input value={form.introduced_by} onChange={e=>setForm({...form, introduced_by:e.target.value})} className="form-input" /></div>
                    <div><span className="form-label">Currency</span><input disabled value={form.currency} className="form-input" style={{background:'#eee'}} /></div>
                </div>
              )}

              {activeTab === 'docs' && <DocumentManager relatedType="Customer" relatedId={form.id} />}
            </div>

            <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary">💾 Save All Changes</button></div>
          </div>
        </div>
      )}
    </div>
  )
}