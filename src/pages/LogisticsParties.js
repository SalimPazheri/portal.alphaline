
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LogisticsParties() {
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('All') 
  const [searchTerm, setSearchTerm] = useState('')

  // --- MODAL STATE ---
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('info') 
  const [isEditing, setIsEditing] = useState(false)
  
  // FORM STATES
  const [mainForm, setMainForm] = useState({
    id: null, name: '', party_type: 'Shipper', 
    main_address: '', city: '', country: '', phone: '', email: '', website: ''
  })
  
  // SUB-LISTS
  const [locations, setLocations] = useState([])
  const [contacts, setContacts] = useState([])

  // SUB-FORMS
  const [locForm, setLocForm] = useState({ location_name: '', address: '', city: '', country: '' })
  const [contForm, setContForm] = useState({ name: '', designation: '', mobile: '', email: '' })

  // MASTER DATA
  const [countries, setCountries] = useState([])

  useEffect(() => {
    fetchParties()
    fetchCountries()
  }, [])

  // --- FETCHING ---
  const fetchParties = async (search = '') => {
    setLoading(true)
    let query = supabase.from('logistics_parties').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    if (search) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    setParties(data || [])
    setLoading(false)
  }

  const fetchCountries = async () => {
    const { data } = await supabase.from('master_countries').select('*').order('name', { ascending: true })
    if (data) setCountries(data)
  }

  const fetchSubData = async (partyId) => {
    const { data: locs } = await supabase.from('party_locations').select('*').eq('party_id', partyId)
    setLocations(locs || [])
    const { data: conts } = await supabase.from('party_contacts').select('*').eq('party_id', partyId)
    setContacts(conts || [])
  }

  // --- HANDLERS: MAIN ---
  const handleOpenModal = (party = null) => {
    if (party) {
      setIsEditing(true)
      setMainForm(party)
      fetchSubData(party.id)
      setActiveTab('info')
    } else {
      setIsEditing(false)
      setMainForm({ id: null, name: '', party_type: 'Shipper', main_address: '', city: '', country: '', phone: '', email: '', website: '' })
      setLocations([])
      setContacts([])
      setActiveTab('info')
    }
    setShowModal(true)
  }

  const saveMainParty = async (e) => {
    e.preventDefault()
    let partyId = mainForm.id
    const payload = { ...mainForm }
    delete payload.id 

    if (isEditing) {
      await supabase.from('logistics_parties').update(payload).eq('id', partyId)
    } else {
      const { data, error } = await supabase.from('logistics_parties').insert([payload]).select()
      if (error) return alert("Error: " + error.message)
      partyId = data[0].id
      setMainForm({ ...mainForm, id: partyId }) 
      setIsEditing(true)
    }
    fetchParties(searchTerm)
    alert("✅ Company Saved! You can now add Locations & Contacts.")
  }

  // --- HANDLERS: SUB-ITEMS ---
  const addLocation = async () => {
    if (!mainForm.id) return alert("Save Company Info first!")
    await supabase.from('party_locations').insert([{ ...locForm, party_id: mainForm.id }])
    setLocForm({ location_name: '', address: '', city: '', country: '' })
    fetchSubData(mainForm.id)
  }
  const deleteLocation = async (id) => {
    await supabase.from('party_locations').delete().eq('id', id)
    fetchSubData(mainForm.id)
  }

  const addContact = async () => {
    if (!mainForm.id) return alert("Save Company Info first!")
    await supabase.from('party_contacts').insert([{ ...contForm, party_id: mainForm.id }])
    setContForm({ name: '', designation: '', mobile: '', email: '' })
    fetchSubData(mainForm.id)
  }
  const deleteContact = async (id) => {
    await supabase.from('party_contacts').delete().eq('id', id)
    fetchSubData(mainForm.id)
  }

  const filteredParties = parties.filter(p => filterType === 'All' ? true : p.party_type === filterType)

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="header-row">
        <div>
           <h2 style={{margin:0, fontSize:'20px'}}>🚢 Logistics Directory</h2>
           <div style={{marginTop:'5px', display:'flex', gap:'10px'}}>
              {['All', 'Shipper', 'Consignee', 'Notify Party'].map(type => (
                 <span key={type} onClick={() => setFilterType(type)}
                    style={{
                       fontSize:'12px', cursor:'pointer', padding:'2px 8px', borderRadius:'4px',
                       background: filterType === type ? '#0f172a' : '#e2e8f0',
                       color: filterType === type ? 'white' : '#64748b'
                    }}
                 >{type}</span>
              ))}
           </div>
        </div>
        <input type="text" placeholder="🔍 Search..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); fetchParties(e.target.value) }} className="search-bar" />
        <button onClick={() => handleOpenModal()} className="btn btn-primary">+ Add New</button>
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table className="data-table">
          <thead><tr><th style={{width:'30%'}}>Company Name</th><th>Type</th><th>Main Location</th><th>Contact Info</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="5" style={{textAlign:'center', padding:'20px', color:'#64748b'}}>⏳ Loading...</td></tr>}
            {!loading && filteredParties.map((p) => (
              <tr key={p.id}>
                <td><div style={{fontWeight:'bold', color:'#0f172a'}}>{p.name}</div></td>
                <td><span className="status-badge" style={{background: p.party_type === 'Shipper' ? '#3b82f6' : p.party_type === 'Consignee' ? '#10b981' : '#f59e0b'}}>{p.party_type}</span></td>
                <td>{p.city}, {p.country}</td>
                <td><div style={{fontSize:'11px'}}>📞 {p.phone}</div><div style={{fontSize:'11px', color:'#007bff'}}>✉️ {p.email}</div></td>
                <td style={{textAlign:'center'}}><span onClick={() => handleOpenModal(p)} className="icon-action">📝 Edit / Details</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MASTER MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'700px', maxWidth:'95%'}}>
            
            <div className="modal-header">
              <h3>{mainForm.id ? `Edit: ${mainForm.name}` : 'New Logistics Partner'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-close">✖</button>
            </div>

            <div style={{display:'flex', borderBottom:'1px solid #e2e8f0', marginBottom:'20px'}}>
               <div onClick={() => setActiveTab('info')} style={{padding:'10px 20px', cursor:'pointer', borderBottom: activeTab === 'info' ? '2px solid #007bff' : 'none', fontWeight: activeTab === 'info' ? 'bold' : 'normal'}}>1. Basic Info</div>
               <div onClick={() => setActiveTab('locations')} style={{padding:'10px 20px', cursor:'pointer', borderBottom: activeTab === 'locations' ? '2px solid #007bff' : 'none', fontWeight: activeTab === 'locations' ? 'bold' : 'normal', color: !mainForm.id ? '#ccc': 'inherit', pointerEvents: !mainForm.id ? 'none' : 'auto'}}>2. 🏭 Warehouses</div>
               <div onClick={() => setActiveTab('contacts')} style={{padding:'10px 20px', cursor:'pointer', borderBottom: activeTab === 'contacts' ? '2px solid #007bff' : 'none', fontWeight: activeTab === 'contacts' ? 'bold' : 'normal', color: !mainForm.id ? '#ccc': 'inherit', pointerEvents: !mainForm.id ? 'none' : 'auto'}}>3. 👥 Contacts</div>
            </div>

            {/* TAB 1: BASIC INFO (✅ CENTERED FIXED) */}
            {activeTab === 'info' && (
              <form onSubmit={saveMainParty}>
                <div className="form-grid" style={{
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '15px', 
                    maxWidth: '550px',  // Prevents wide stretching
                    margin: '0 auto'    // Centers the form
                }}>
                  <div style={{gridColumn:'span 2'}}>
                    <span className="form-label">Company Name *</span>
                    <input value={mainForm.name} onChange={e => setMainForm({...mainForm, name: e.target.value})} className="form-input" required />
                  </div>
                  <div>
                    <span className="form-label">Party Type</span>
                    <select value={mainForm.party_type} onChange={e => setMainForm({...mainForm, party_type: e.target.value})} className="form-input">
                        <option>Shipper</option>
                        <option>Consignee</option>
                        <option>Notify Party</option>
                    </select>
                  </div>
                  <div>
                     <span className="form-label">Country</span>
                     <select value={mainForm.country} onChange={e => setMainForm({...mainForm, country: e.target.value})} className="form-input">
                        <option value="">-- Select --</option>
                        {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                  </div>
                  <div style={{gridColumn:'span 2'}}>
                     <span className="form-label">Main Address (HQ)</span>
                     <input value={mainForm.main_address} onChange={e => setMainForm({...mainForm, main_address: e.target.value})} className="form-input" />
                  </div>
                  <div><span className="form-label">City</span><input value={mainForm.city} onChange={e => setMainForm({...mainForm, city: e.target.value})} className="form-input" /></div>
                  <div><span className="form-label">Phone</span><input value={mainForm.phone} onChange={e => setMainForm({...mainForm, phone: e.target.value})} className="form-input" /></div>
                  <div><span className="form-label">Email</span><input value={mainForm.email} onChange={e => setMainForm({...mainForm, email: e.target.value})} className="form-input" /></div>
                </div>
                <div style={{textAlign:'center', marginTop:'20px'}}>
                    <button type="submit" className="btn btn-primary">{mainForm.id ? 'Update Info' : 'Save & Continue'}</button>
                </div>
              </form>
            )}

            {/* TAB 2: LOCATIONS */}
            {activeTab === 'locations' && (
              <div>
                 <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'20px'}}>
                    <h4 style={{marginTop:0}}>Add New Warehouse / Loading Point</h4>
                    <div className="form-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                       <input placeholder="Location Name (e.g. Jebel Ali WH)" value={locForm.location_name} onChange={e => setLocForm({...locForm, location_name: e.target.value})} className="form-input" />
                       <input placeholder="City" value={locForm.city} onChange={e => setLocForm({...locForm, city: e.target.value})} className="form-input" />
                       <input placeholder="Full Address" value={locForm.address} onChange={e => setLocForm({...locForm, address: e.target.value})} className="form-input" style={{gridColumn:'span 2'}} />
                    </div>
                    <button onClick={addLocation} className="btn btn-success" style={{marginTop:'10px', fontSize:'12px'}}>+ Add Location</button>
                 </div>
                 
                 <table className="data-table" style={{fontSize:'12px'}}>
                    <thead><tr><th>Location</th><th>Address</th><th>Action</th></tr></thead>
                    <tbody>
                       {locations.map(l => (
                          <tr key={l.id}>
                             <td><b>{l.location_name}</b><br/>{l.city}</td>
                             <td>{l.address}</td>
                             <td><span onClick={() => deleteLocation(l.id)} style={{color:'red', cursor:'pointer'}}>🗑️</span></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            )}

            {/* TAB 3: CONTACTS */}
            {activeTab === 'contacts' && (
              <div>
                 <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'20px'}}>
                    <h4 style={{marginTop:0}}>Add Contact Person</h4>
                    <div className="form-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
                       <input placeholder="Name" value={contForm.name} onChange={e => setContForm({...contForm, name: e.target.value})} className="form-input" />
                       <input placeholder="Designation" value={contForm.designation} onChange={e => setContForm({...contForm, designation: e.target.value})} className="form-input" />
                       <input placeholder="Mobile" value={contForm.mobile} onChange={e => setContForm({...contForm, mobile: e.target.value})} className="form-input" />
                       <input placeholder="Email" value={contForm.email} onChange={e => setContForm({...contForm, email: e.target.value})} className="form-input" style={{gridColumn:'span 3'}} />
                    </div>
                    <button onClick={addContact} className="btn btn-success" style={{marginTop:'10px', fontSize:'12px'}}>+ Add Contact</button>
                 </div>

                 <table className="data-table" style={{fontSize:'12px'}}>
                    <thead><tr><th>Name</th><th>Info</th><th>Action</th></tr></thead>
                    <tbody>
                       {contacts.map(c => (
                          <tr key={c.id}>
                             <td><b>{c.name}</b><br/>{c.designation}</td>
                             <td>📞 {c.mobile}<br/>✉️ {c.email}</td>
                             <td><span onClick={() => deleteContact(c.id)} style={{color:'red', cursor:'pointer'}}>🗑️</span></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}