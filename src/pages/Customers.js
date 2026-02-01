import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  
  // --- MASTER LISTS ---
  const [designations, setDesignations] = useState([])
  const [countries, setCountries] = useState([])
  const [cities, setCities] = useState([]) 
  
  const [userRole, setUserRole] = useState('sales') 
  const [searchTerm, setSearchTerm] = useState('')
  
  // --- MODAL STATE ---
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [editingCompanyId, setEditingCompanyId] = useState(null)
  
  // 1. LOGIC FIX: Default Credit Limit set to 5000
  const initialFormState = () => ({
    company_name: '', address: '', city: '', country: '', office_phone: '', website: '', 
    status: 'Active', credit_limit: '5000', 
    contact_person: '', designation: '', email: '', mobile: '',
    primary_contact_id: null 
  })
  
  const [companyForm, setCompanyForm] = useState(initialFormState())

  // --- CONTACT MODAL STATE ---
  const [showContactModal, setShowContactModal] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [editingContactId, setEditingContactId] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [contactForm, setContactForm] = useState({ contact_person: '', designation: '', email: '', mobile: '' })

  useEffect(() => {
    checkUserRole()
    fetchCustomers()
    fetchMasters()
  }, [])

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('user_roles').select('role').eq('user_email', user.email).single()
      setUserRole(data ? data.role : 'admin') 
    }
  }

  const fetchMasters = async () => {
    const { data: desData } = await supabase.from('master_designations').select('*').order('name', { ascending: true })
    if (desData) setDesignations(desData)
    
    const { data: countryData } = await supabase.from('master_countries').select('*').order('name', { ascending: true })
    if (countryData) setCountries(countryData)
  }

  const fetchCitiesForCountry = async (countryName) => {
    if (!countryName) {
      setCities([])
      return
    }
    const countryObj = countries.find(c => c.name === countryName)
    if (countryObj) {
      const { data } = await supabase.from('master_cities').select('*').eq('country_id', countryObj.id).order('name', { ascending: true })
      setCities(data || [])
    } else {
      setCities([])
    }
  }

  // --- VALIDATION HELPERS ---
  const isValidEmail = (email) => {
    if (!email) return true 
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
    return re.test(email.trim())
  }

  const isValidWebsite = (url) => {
    if (!url) return true
    const re = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/
    return re.test(url.trim())
  }

  // --- AUTO SAVE ---
  const checkAndSaveDesignation = async (name) => {
    if (!name) return
    const exists = designations.some(d => d.name.toLowerCase() === name.toLowerCase())
    if (!exists) {
      await supabase.from('master_designations').insert([{ name: name }]).select()
      const { data } = await supabase.from('master_designations').select('*').order('name', { ascending: true })
      if (data) setDesignations(data)
    }
  }

  const checkAndSaveCity = async (cityName, countryName) => {
    if (!cityName || !countryName) return
    const countryObj = countries.find(c => c.name === countryName)
    if (!countryObj) return
    const exists = cities.some(c => c.name.toLowerCase() === cityName.toLowerCase())
    if (!exists) {
      await supabase.from('master_cities').insert([{ name: cityName, country_id: countryObj.id }])
    }
  }

  const fetchCustomers = async (query = '') => {
    let supabaseQuery = supabase
      .from('customers')
      .select('*, company_contacts(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (query.length > 0) {
      supabaseQuery = supabaseQuery.or(`company_name.ilike.%${query}%,city.ilike.%${query}%,office_phone.ilike.%${query}%`)
    } else {
      supabaseQuery = supabaseQuery.limit(10)
    }

    const { data, error } = await supabaseQuery
    if (error) console.error(error)
    else setCustomers(data)
  }

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    fetchCustomers(value)
  }

  // --- 2. LOGIC FIX: ORPHAN RECORD CHECK ---
  const checkDependencies = async (customerId) => {
    // FUTURE MODULES: Check these tables before deleting
    
    // Example: Check Invoices (Uncomment when Invoices table exists)
    /*
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true }) // head:true means don't fetch data, just count
      .eq('customer_id', customerId)
    
    if (invoiceCount > 0) return 'Invoices'
    */

    // Example: Check Proposals
    /*
    const { count: proposalCount } = await supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      
    if (proposalCount > 0) return 'Proposals'
    */

    return null // No dependencies found, safe to delete
  }

  const handleDelete = async (id, name) => {
    // 1. Confirm Intent
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return

    // 2. Check for Redundancy / Dependencies
    const dependency = await checkDependencies(id)
    
    if (dependency) {
      // 3. Block Deletion if found
      alert(`⛔ COMPLIANCE ALERT\n\nCannot delete "${name}".\n\nThis customer has related records in: ${dependency}.\nPlease delete those records first or archive this customer instead.`)
      return
    }

    // 4. Safe to Delete (Soft Delete)
    const { error } = await supabase.from('customers').update({ is_deleted: true }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else fetchCustomers(searchTerm)
  }


  // --- HANDLERS: COMPANY ---
  const openNewCompanyModal = () => {
    setIsEditingCompany(false)
    setCompanyForm(initialFormState())
    setCities([]) 
    setShowCompanyModal(true)
  }

  const openModifyCompanyModal = (customer) => {
    setIsEditingCompany(true)
    setEditingCompanyId(customer.id)
    
    const primaryContact = customer.company_contacts?.find(c => c.is_primary) || customer.company_contacts?.[0] || {}

    setCompanyForm({ 
      ...initialFormState(), 
      ...customer, 
      credit_limit: customer.credit_limit || 0,
      contact_person: primaryContact.contact_person || '',
      designation: primaryContact.designation || '',
      email: primaryContact.email || '',
      mobile: primaryContact.mobile || '',
      primary_contact_id: primaryContact.id || null
    })
    
    fetchCitiesForCountry(customer.country)
    setShowCompanyModal(true)
  }

  const handleCompanyChange = (e) => {
    const { name, value } = e.target
    setCompanyForm({ ...companyForm, [name]: value })
    if (name === 'country') {
      setCompanyForm(prev => ({ ...prev, country: value, city: '' })) 
      fetchCitiesForCountry(value)
    }
  }

  const handleCompanySubmit = async (e) => {
    e.preventDefault()

    const cleanEmail = companyForm.email ? companyForm.email.trim() : ''
    const cleanWebsite = companyForm.website ? companyForm.website.trim() : ''

    if (cleanEmail && !isValidEmail(cleanEmail)) {
      alert("⚠️ Invalid Email format.\nExample: user@domain.com")
      return
    }
    if (cleanWebsite && !isValidWebsite(cleanWebsite)) {
      alert("⚠️ Invalid Website format.\nExample: example.com or www.example.com\n(No spaces allowed)")
      return
    }

    const { company_name, address, city, country, office_phone, status, credit_limit } = companyForm
    const companyData = { 
      company_name, 
      address, 
      city, 
      country, 
      office_phone, 
      website: cleanWebsite 
    }
    
    await checkAndSaveDesignation(companyForm.designation)
    await checkAndSaveCity(city, country)

    if (userRole === 'admin' || userRole === 'manager') {
      companyData.status = status
      companyData.credit_limit = credit_limit
    }

    if (isEditingCompany) {
      const { error } = await supabase.from('customers').update(companyData).eq('id', editingCompanyId)
      if (error) { alert(error.message); return; }

      if (companyForm.primary_contact_id) {
        await supabase.from('company_contacts').update({
          contact_person: companyForm.contact_person,
          designation: companyForm.designation,
          email: cleanEmail, // Save clean email
          mobile: companyForm.mobile
        }).eq('id', companyForm.primary_contact_id)
      } else {
        await supabase.from('company_contacts').insert([{
          company_id: editingCompanyId,
          contact_person: companyForm.contact_person,
          designation: companyForm.designation,
          email: cleanEmail,
          mobile: companyForm.mobile,
          is_primary: true
        }])
      }

    } else {
      // Force Active status for new
      companyData.status = 'Active' 
      const { data, error } = await supabase.from('customers').insert([companyData]).select()
      if (error) return alert(error.message)
      
      await supabase.from('company_contacts').insert([{
          company_id: data[0].id,
          contact_person: companyForm.contact_person,
          designation: companyForm.designation,
          email: cleanEmail,
          mobile: companyForm.mobile,
          is_primary: true
      }])
    }
    fetchCustomers(searchTerm)
    setShowCompanyModal(false)
  }

  // --- HANDLERS: CONTACT ---
  const openContactModal = (company, person = null) => {
    setSelectedCompany(company)
    if (person) {
      setIsEditingContact(true)
      setEditingContactId(person.id)
      setContactForm(person)
    } else {
      setIsEditingContact(false)
      setContactForm({ contact_person: '', designation: '', email: '', mobile: '' })
    }
    setShowContactModal(true)
  }

  const handleContactSubmit = async (e) => {
    e.preventDefault()

    const cleanEmail = contactForm.email ? contactForm.email.trim() : ''

    if (cleanEmail && !isValidEmail(cleanEmail)) {
      alert("⚠️ Invalid Email Address format.")
      return
    }

    await checkAndSaveDesignation(contactForm.designation)

    const payload = { ...contactForm, email: cleanEmail, company_id: selectedCompany.id }
    if (!isEditingContact) payload.is_primary = false

    let error
    if (isEditingContact) {
      const { error: err } = await supabase.from('company_contacts').update(payload).eq('id', editingContactId)
      error = err
    } else {
      const { error: err } = await supabase.from('company_contacts').insert([payload])
      error = err
    }

    if (error) alert(error.message)
    else {
      fetchCustomers(searchTerm)
      setShowContactModal(false)
    }
  }

  const getStatusColor = (status) => {
    if (status === 'Active') return '#28a745'
    if (status === 'Suspended') return '#ffc107'
    if (status === 'Blacklisted') return '#dc3545'
    return '#6c757d'
  }

  return (
    <div className="page-container">
      <datalist id="designation-list">
        {designations.map(d => <option key={d.id} value={d.name} />)}
      </datalist>
      <datalist id="city-list">
        {cities.map(c => <option key={c.id} value={c.name} />)}
      </datalist>

      <div className="header-row">
        <h2 style={{margin:0, fontSize:'20px'}}>👥 Customer Directory</h2>
        <input type="text" placeholder="🔍 Search Company, City or Phone..." value={searchTerm} onChange={handleSearch} className="search-bar" />
        <button onClick={openNewCompanyModal} className="btn btn-primary">+ Add New</button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:'30%'}}>Company Name</th>
              <th>Details</th>
              <th>Contact Person</th>
              <th>City/Country</th>
              <th style={{textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ background: c.status === 'Blacklisted' ? '#fff0f0' : 'inherit' }}>
                <td>
                  <div style={{fontWeight:'bold', color:'#007bff'}}>{c.company_name}</div>
                  <div style={{display:'flex', gap:'5px', marginTop:'4px'}}>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(c.status) }}>{c.status}</span>
                    {Number(c.credit_limit) > 0 && <span style={{fontSize:'10px', color:'#666', border:'1px solid #ccc', padding:'0 4px', borderRadius:'3px'}}>AED {c.credit_limit}</span>}
                  </div>
                </td>
                <td>
                  <div>📞 {c.office_phone}</div>
                  <div style={{fontSize:'11px', color:'#666'}}>{c.website}</div>
                </td>
                <td>
                  {c.company_contacts?.map((p) => (
                    <div key={p.id} className="person-row" style={{alignItems:'flex-start'}}>
                      <div>
                        <strong>{p.contact_person}</strong> <small>({p.designation})</small><br/>
                        <small style={{color:'#555'}}>📱 {p.mobile}</small><br/>
                        <small style={{color:'#007bff', fontWeight:'500'}}>✉️ {p.email}</small>
                      </div>
                      <span className="icon-action" onClick={() => openContactModal(c, p)} title="Edit">✎</span>
                    </div>
                  ))}
                </td>
                <td>{c.city}, {c.country}</td>
                <td style={{textAlign:'center'}}>
                   <span onClick={() => openModifyCompanyModal(c)} className="icon-action" title="Modify Company">📝</span>
                   <span onClick={() => openContactModal(c)} className="icon-action" title="Add Contact Person">➕</span>
                   <span onClick={() => handleDelete(c.id, c.company_name)} className="icon-action" title="Delete" style={{color:'#dc3545', marginLeft:'10px'}}>🗑️</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- COMPANY MODAL --- */}
      {showCompanyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditingCompany ? 'Modify Company' : 'Add New Company'}</h3>
              <button onClick={() => setShowCompanyModal(false)} className="btn-close">✖</button>
            </div>
            <form onSubmit={handleCompanySubmit}>
              <div className="admin-panel">
                <div className="form-grid">
                  <div>
                    <span className="form-label">Status</span>
                    <select name="status" value={companyForm.status || 'Active'} onChange={handleCompanyChange} disabled={!isEditingCompany || (userRole !== 'admin' && userRole !== 'manager')} className="form-input">
                      <option>Active</option><option>Suspended</option><option>Blacklisted</option>
                    </select>
                  </div>
                  <div>
                    <span className="form-label">Credit Limit (AED)</span>
                    <input type="number" name="credit_limit" value={companyForm.credit_limit} onChange={handleCompanyChange} disabled={userRole !== 'admin' && userRole !== 'manager'} className="form-input" />
                  </div>
                </div>
              </div>

              <h4 className="form-section-title">🏢 Company Info</h4>
              <div className="form-grid">
                <div><span className="form-label">Company Name *</span><input name="company_name" value={companyForm.company_name || ''} onChange={handleCompanyChange} className="form-input" required /></div>
                <div><span className="form-label">Office Phone</span><input name="office_phone" value={companyForm.office_phone || ''} onChange={handleCompanyChange} className="form-input" /></div>
                
                <div>
                  <span className="form-label">Country</span>
                  <select name="country" value={companyForm.country} onChange={handleCompanyChange} className="form-input">
                    <option value="">-- Select --</option>
                    {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <span className="form-label">City</span>
                  <input name="city" list="city-list" value={companyForm.city} onChange={handleCompanyChange} className="form-input" placeholder={companyForm.country ? "Select or type new..." : "Select Country first"} disabled={!companyForm.country} />
                </div>

                <div style={{gridColumn:'span 2'}}><span className="form-label">Address</span><input name="address" value={companyForm.address || ''} onChange={handleCompanyChange} className="form-input" /></div>
                <div><span className="form-label">Website</span><input name="website" value={companyForm.website || ''} onChange={handleCompanyChange} className="form-input" placeholder="e.g. example.com" /></div>
              </div>

              <h4 className="form-section-title">👤 Primary Contact</h4>
              <div className="form-grid">
                <div><span className="form-label">Contact Name *</span><input name="contact_person" value={companyForm.contact_person} onChange={handleCompanyChange} className="form-input" required /></div>
                <div>
                    <span className="form-label">Designation</span>
                    <input name="designation" list="designation-list" value={companyForm.designation} onChange={handleCompanyChange} className="form-input" placeholder="Select or type..." />
                </div>
                <div><span className="form-label">Mobile</span><input name="mobile" value={companyForm.mobile} onChange={handleCompanyChange} className="form-input" /></div>
                <div><span className="form-label">Email</span><input name="email" value={companyForm.email} onChange={handleCompanyChange} className="form-input" placeholder="name@domain.com" /></div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONTACT MODAL --- */}
      {showContactModal && selectedCompany && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width:'400px'}}>
            <div className="modal-header">
              <h3>{isEditingContact ? 'Edit Person' : 'Add Contact'}</h3>
              <button onClick={() => setShowContactModal(false)} className="btn-close">✖</button>
            </div>
            <p style={{marginBottom:'15px', fontSize:'12px', color:'#666'}}>For: <strong>{selectedCompany.company_name}</strong></p>
            <form onSubmit={handleContactSubmit}>
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <div><span className="form-label">Name *</span><input name="contact_person" value={contactForm.contact_person || ''} onChange={(e) => setContactForm({...contactForm, contact_person: e.target.value})} className="form-input" required /></div>
                <div>
                    <span className="form-label">Designation</span>
                    <input name="designation" list="designation-list" value={contactForm.designation || ''} onChange={(e) => setContactForm({...contactForm, designation: e.target.value})} className="form-input" placeholder="Select or type..." />
                </div>
                <div><span className="form-label">Mobile</span><input name="mobile" value={contactForm.mobile || ''} onChange={(e) => setContactForm({...contactForm, mobile: e.target.value})} className="form-input" /></div>
                <div><span className="form-label">Email</span><input name="email" value={contactForm.email || ''} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} className="form-input" placeholder="name@domain.com" /></div>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                 <button type="submit" className="btn btn-success">Save Person</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}