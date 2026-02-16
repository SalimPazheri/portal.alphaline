import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, useParams } from 'react-router-dom' 
import { FileText, Trash2, ArrowRight, ArrowLeft, Save, ShieldAlert, UserPlus, Plus, X } from 'lucide-react'

export default function CreateProposal() {
  const navigate = useNavigate()
  const { id } = useParams() 
  const isEditMode = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('project')
  
  // --- DATA LISTS ---
  const [customers, setCustomers] = useState([])
  const [contacts, setContacts] = useState([]) 
  const [agents, setAgents] = useState([])
  const [equipmentTypes, setEquipmentTypes] = useState([]) 
  const [cities, setCities] = useState([])
  const [services, setServices] = useState([]) 

  // --- MODAL STATE ---
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') 
  const [newItemName, setNewItemName] = useState('')
  const [pendingRowIndex, setPendingRowIndex] = useState(null) 
  const [pendingField, setPendingField] = useState(null) 

  // --- FORM HEADER ---
  const [header, setHeader] = useState({
    customer_id: '',
    attention_id: '',
    section: '', 
    category: '', 
    proposal_ref: `ALPHAQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposal_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subject: '',
    scope_of_work: '',
    signatory_name: 'Mr. Nazeer Hameed',
    status: 'Proposed',
    include_std_terms_pdf: false 
  })

  // --- ROW CREATORS ---
  const createEmptySourcingRow = () => ({ 
    equipment_type: '', agent_id: '', quoted_rate: '', detention: '', detention_amount: '', notes: '' 
  })

  const createEmptyLineItem = () => ({
    description: '', equipment_type: '', pol: '', pod: '', uom: '', quantity: 1, rate: 0
  })

  const [sourcingItems, setSourcingItems] = useState([createEmptySourcingRow(), createEmptySourcingRow()])
  const [lineItems, setLineItems] = useState([createEmptyLineItem(), createEmptyLineItem()])
  const [termsList, setTermsList] = useState([])

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchDropdowns()
    if (isEditMode) fetchProposalData(id) 
    else fetchDefaultTerms() 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchDropdowns = async () => {
    const { data: cust } = await supabase.from('master_customers').select('id, name').eq('is_deleted', false).order('name')
    if (cust) setCustomers(cust)
    const { data: agt } = await supabase.from('master_agents').select('id, name').order('name')
    if (agt) setAgents(agt)
    const { data: equip } = await supabase.from('fleet_equipment').select('id, equipment_type').order('equipment_type')
    if (equip) setEquipmentTypes(equip)
    const { data: cityList } = await supabase.from('master_cities').select('id, name').order('name')
    if (cityList) setCities(cityList)
    const { data: serv } = await supabase.from('master_services').select('id, name').order('name')
    if (serv) setServices(serv)
  }

  const fetchDefaultTerms = async () => {
      const { data } = await supabase.from('master_proposal_terms').select('*').order('sort_order')
      if (data) {
          const mapped = data.map(t => ({ text: t.term_text, checked: t.is_default, is_custom: false }))
          setTermsList(mapped)
      }
  }

  // --- LOAD EXISTING DATA ---
  const fetchProposalData = async (proposalId) => {
      setLoading(true)
      const { data } = await supabase.from('proposals').select('*').eq('id', proposalId).single()
      if (!data) { navigate('/proposals'); return; }
      
      // Handle Missing Dates in old records
      if(!data.proposal_date) data.proposal_date = new Date().toISOString().split('T')[0]
      if(!data.valid_until) data.valid_until = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      setHeader(data)

      const { data: sourcing } = await supabase.from('proposal_sourcing').select('*').eq('proposal_id', proposalId)
      if (sourcing && sourcing.length > 0) setSourcingItems(sourcing)

      const { data: items } = await supabase.from('proposal_items').select('*').eq('proposal_id', proposalId)
      if (items && items.length > 0) setLineItems(items)

      const { data: savedTerms } = await supabase.from('proposal_terms').select('term_text').eq('proposal_id', proposalId).order('sort_order')
      const { data: masterTerms } = await supabase.from('master_proposal_terms').select('*').order('sort_order')
      
      if (masterTerms) {
          const savedTexts = new Set(savedTerms?.map(t => t.term_text) || [])
          const mergedList = masterTerms.map(m => ({ text: m.term_text, checked: savedTexts.has(m.term_text), is_custom: false }))
          const masterTexts = new Set(masterTerms.map(m => m.term_text))
          if (savedTerms) {
              savedTerms.forEach(s => {
                  if (!masterTexts.has(s.term_text)) mergedList.push({ text: s.term_text, checked: true, is_custom: true })
              })
          }
          setTermsList(mergedList)
      }

      if (data.customer_id) fetchContacts(data.customer_id)
      setLoading(false)
  }

  const fetchContacts = async (custId) => {
      const { data } = await supabase.from('customer_contacts').select('*').eq('customer_id', custId)
      setContacts(data || [])
      if (!isEditMode) {
          const primary = data?.find(c => c.is_primary)
          if (primary) setHeader(prev => ({ ...prev, attention_id: primary.id }))
      }
  }

  const handleCustomerChange = (e) => {
      const newId = e.target.value
      setHeader({ ...header, customer_id: newId, attention_id: '' })
      if (newId) fetchContacts(newId)
      else setContacts([])
  }

  const handleAddContact = async () => {
      if (!header.customer_id) return alert("Select a customer first.")
      const name = prompt("Enter Contact Person Name:")
      if (!name) return
      
      const { data, error } = await supabase.from('customer_contacts').insert([{ customer_id: header.customer_id, contact_person: name, designation: 'Sales POC' }]).select().single()
      if (error) alert(error.message)
      else {
          await fetchContacts(header.customer_id)
          setHeader(prev => ({ ...prev, attention_id: data.id }))
      }
  }

  // --- SHORTCUTS ---
  const handleShortcut = (e, type, index, field) => {
      if (e.key === 'F2') {
          e.preventDefault()
          setModalType(type)
          setPendingRowIndex(index)
          setPendingField(field)
          setNewItemName('')
          setShowModal(true)
      }
  }

  const saveNewItem = async () => {
      if (!newItemName) return
      let table = ''
      let column = 'name'
      if (modalType === 'service') table = 'master_services'
      if (modalType === 'city') table = 'master_cities'
      if (modalType === 'equipment') { table = 'fleet_equipment'; column = 'equipment_type' }

      setLoading(true)
      const { data, error } = await supabase.from(table).insert([{ [column]: newItemName }]).select().single()
      setLoading(false)

      if (error) alert("Error adding item: " + error.message)
      else {
          await fetchDropdowns()
          if (pendingRowIndex !== null && pendingField) {
             if (activeTab === 'sourcing') {
                 const n = [...sourcingItems]
                 n[pendingRowIndex][pendingField] = modalType === 'equipment' ? data.equipment_type : data.name
                 setSourcingItems(n)
             } else if (activeTab === 'commercials') {
                 const n = [...lineItems]
                 n[pendingRowIndex][pendingField] = modalType === 'equipment' ? data.equipment_type : data.name
                 setLineItems(n)
             }
          }
          setShowModal(false)
      }
  }

  // --- SAVE LOGIC (FIXED) ---
  const handleSave = async () => {
    if (!header.customer_id) return alert("Please select a Customer.")
    
    // Clean Empty Rows
    const validSourcing = sourcingItems.filter(item => item.agent_id || item.quoted_rate || item.equipment_type)
    const validLines = lineItems.filter(item => item.description || item.rate > 0)
    const activeTerms = termsList.filter(t => t.checked && t.text.trim() !== '').map((t, index) => ({ term_text: t.text, sort_order: index + 1 }))

    setLoading(true)
    try {
      const user = await supabase.auth.getUser()
      const userId = user.data.user?.id
      let pid = header.id

      // ✅ SANITIZATION: Convert "" to null for UUID fields
      const proposalPayload = {
          ...header,
          created_by: userId,
          attention_id: header.attention_id || null, // FIX IS HERE
          customer_id: header.customer_id || null
      }

      if (isEditMode) {
          const { error } = await supabase.from('proposals').update(proposalPayload).eq('id', pid)
          if (error) throw error
          // Clear children to re-insert
          await supabase.from('proposal_sourcing').delete().eq('proposal_id', pid)
          await supabase.from('proposal_items').delete().eq('proposal_id', pid)
          await supabase.from('proposal_terms').delete().eq('proposal_id', pid)
      } else {
          const { data, error } = await supabase.from('proposals').insert([proposalPayload]).select().single()
          if (error) throw error
          pid = data.id
      }

      // Insert Children (Sanitize Agent ID too)
      await Promise.all([
        supabase.from('proposal_sourcing').insert(validSourcing.map(i => ({
            ...i, 
            proposal_id: pid, 
            created_by: userId,
            agent_id: i.agent_id || null // FIX IS HERE
        }))),
        supabase.from('proposal_items').insert(validLines.map(i => ({...i, proposal_id: pid}))),
        supabase.from('proposal_terms').insert(activeTerms.map(t => ({...t, proposal_id: pid})))
      ])

      alert("✅ Saved Successfully!")
      navigate('/proposals') 
    } catch (error) {
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const calculateRowAmount = (qty, rate) => (parseFloat(qty)||0) * (parseFloat(rate)||0)
  const calculateGrandTotal = () => lineItems.reduce((sum, item) => sum + calculateRowAmount(item.quantity, item.rate), 0)

  // --- STYLES ---
  const commonInputStyle = { width: '100%', height: '38px', padding: '0 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#334155' }
  const gridInputStyle = { width: '100%', minWidth: '0', border: 'none', background: 'transparent', height: '100%', padding: '8px', outline: 'none', fontSize: '13px', color: '#334155', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }
  const tabBtnStyle = (isActive) => ({ padding: '10px 20px', cursor: 'pointer', border: 'none', background: isActive ? 'white' : 'transparent', borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent', fontWeight: isActive ? 'bold' : '500', color: isActive ? '#2563eb' : '#64748b', fontSize: '13px' })

  // --- MODAL ---
  const AddModal = () => (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0 }}>Add New {modalType === 'service' ? 'Service' : modalType === 'city' ? 'Destination' : 'Equipment'}</h4>
                  <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
              </div>
              <input autoFocus style={commonInputStyle} value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewItem()} />
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={saveNewItem} className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save & Select'}</button>
              </div>
          </div>
      </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: '1250px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {showModal && <AddModal />}
      <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; }`}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
           <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#0f172a' }}>
             <FileText size={20} color="#2563eb" /> {isEditMode ? 'Edit Proposal' : 'New Proposal'}
           </h3>
           <span style={{ fontSize: '12px', color: '#64748b' }}>Ref: <strong style={{color:'#2563eb'}}>{header.proposal_ref}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/proposals')} className="btn btn-secondary" style={{padding:'6px 15px', fontSize:'13px', display:'flex', alignItems:'center', gap:'5px'}}><ArrowLeft size={14}/> Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ padding: '6px 20px', fontSize:'13px', display:'flex', alignItems:'center', gap:'5px' }}><Save size={14} /> {loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <button style={tabBtnStyle(activeTab === 'project')} onClick={() => setActiveTab('project')}>1. Project Info</button>
          <button style={tabBtnStyle(activeTab === 'sourcing')} onClick={() => setActiveTab('sourcing')}>2. Costing (Internal)</button>
          <button style={tabBtnStyle(activeTab === 'commercials')} onClick={() => setActiveTab('commercials')}>3. Commercials</button>
          <button style={tabBtnStyle(activeTab === 'terms')} onClick={() => setActiveTab('terms')}>4. Terms</button>
      </div>

      <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minHeight: '400px', border: '1px solid #e2e8f0' }}>
         
         {/* TAB 1: PROJECT */}
         {activeTab === 'project' && (
             <div className="fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div><label style={labelStyle}>Customer</label><select style={commonInputStyle} value={header.customer_id} onChange={handleCustomerChange}>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div><label style={labelStyle}>Attention To</label><div style={{display:'flex', gap:'5px'}}><select style={commonInputStyle} value={header.attention_id} onChange={e => setHeader({...header, attention_id: e.target.value})}>{contacts.map(c => <option key={c.id} value={c.id}>{c.contact_person}</option>)}</select><button onClick={handleAddContact} style={{ height: '38px', width: '38px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '5px', color: '#0ea5e9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={16} /></button></div></div>
                    <div><label style={labelStyle}>Date</label><input type="date" style={commonInputStyle} value={header.proposal_date} onChange={e => setHeader({...header, proposal_date: e.target.value})} /></div>
                    <div><label style={labelStyle}>Valid Until</label><input type="date" style={commonInputStyle} value={header.valid_until} onChange={e => setHeader({...header, valid_until: e.target.value})} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px', marginBottom: '15px' }}>
                    <div><label style={labelStyle}>Section</label><select style={commonInputStyle} value={header.section} onChange={e => setHeader({...header, section: e.target.value})}><option>Road Freight</option><option>Sea Freight</option><option>Air Freight</option></select></div>
                    <div><label style={labelStyle}>Category</label><select style={commonInputStyle} value={header.category} onChange={e => setHeader({...header, category: e.target.value})}><option>Import</option><option>Export</option><option>Domestic</option></select></div>
                    <div><label style={labelStyle}>Subject</label><input style={commonInputStyle} value={header.subject} onChange={e => setHeader({...header, subject: e.target.value})} /></div>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('sourcing')}>Next <ArrowRight size={14} /></button>
             </div>
         )}

         {/* TAB 2: COSTING */}
         {activeTab === 'sourcing' && (
             <div className="fade-in">
                 <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', color: '#b45309', display:'flex', alignItems:'center', gap:'8px' }}>
                    <ShieldAlert size={16} /> <span><strong>Tip:</strong> Press <strong>F2</strong> on Equipment to add new types instantly.</span>
                 </div>
                 <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', color: '#1e3a8a', textAlign: 'left', fontWeight: '600' }}>
                                <th style={{ padding: '10px', width: '40px' }}>#</th>
                                <th style={{ padding: '10px', width: '20%' }}>Agent</th>
                                <th style={{ padding: '10px', width: '20%' }}>Equipment</th>
                                <th style={{ padding: '10px', width: '10%', textAlign: 'right' }}>Cost</th>
                                <th style={{ padding: '10px' }}>Remarks</th>
                                <th style={{ padding: '10px', width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sourcingItems.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={{ padding: 0 }}><select style={gridInputStyle} value={item.agent_id} onChange={e => { const n=[...sourcingItems]; n[index].agent_id=e.target.value; setSourcingItems(n) }}>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></td>
                                    <td style={{ padding: 0 }}><select style={gridInputStyle} value={item.equipment_type} onChange={e => { const n=[...sourcingItems]; n[index].equipment_type=e.target.value; setSourcingItems(n) }} onKeyDown={(e) => handleShortcut(e, 'equipment', index, 'equipment_type')}><option value="">-- Select or F2 --</option>{equipmentTypes.map(eq => <option key={eq.id} value={eq.equipment_type}>{eq.equipment_type}</option>)}</select></td>
                                    <td style={{ padding: 0 }}><input type="number" style={{...gridInputStyle, textAlign:'right'}} value={item.quoted_rate} onChange={e => { const n=[...sourcingItems]; n[index].quoted_rate=e.target.value; setSourcingItems(n) }}/></td>
                                    <td style={{ padding: 0 }}><input style={gridInputStyle} value={item.notes} onChange={e => { const n=[...sourcingItems]; n[index].notes=e.target.value; setSourcingItems(n) }} onKeyDown={e => {if(e.key==='Enter' && index===sourcingItems.length-1) setSourcingItems([...sourcingItems, createEmptySourcingRow()])}} /></td>
                                    <td style={{ textAlign: 'center' }}><button onClick={() => { const n=[...sourcingItems]; n.splice(index,1); setSourcingItems(n) }} style={{ border: 'none', background: 'transparent', color: '#ef4444' }}><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <button onClick={() => setSourcingItems([...sourcingItems, createEmptySourcingRow()])} className="btn btn-secondary" style={{ marginTop: '10px', fontSize:'12px', display:'flex', gap:'5px' }}><Plus size={14} /> Add Row</button>
                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}><button className="btn btn-secondary" style={{display:'flex', alignItems:'center', gap:'5px'}} onClick={() => setActiveTab('project')}><ArrowLeft size={14}/> Back</button><button className="btn btn-primary" style={{display:'flex', alignItems:'center', gap:'5px'}} onClick={() => setActiveTab('commercials')}>Next <ArrowRight size={14}/></button></div>
             </div>
         )}

         {/* TAB 3: COMMERCIALS */}
         {activeTab === 'commercials' && (
             <div className="fade-in">
                 <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', color: '#b45309', display:'flex', alignItems:'center', gap:'8px' }}>
                    <ShieldAlert size={16} /> <span><strong>Tip:</strong> Press <strong>F2</strong> on Service, Equipment, POL, or POD to add new items instantly.</span>
                 </div>
                 <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', color: '#1e3a8a', textAlign: 'left', fontWeight: '600' }}>
                                <th style={{ padding: '10px', width: '40px' }}>#</th>
                                <th style={{ padding: '10px', width: '20%' }}>Service Description</th>
                                <th style={{ padding: '10px', width: '15%' }}>Equipment</th>
                                <th style={{ padding: '10px', width: '10%' }}>POL</th>
                                <th style={{ padding: '10px', width: '10%' }}>POD</th>
                                <th style={{ padding: '10px', width: '12%' }}>UOM</th>
                                <th style={{ padding: '10px', width: '7%', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '10px', width: '10%', textAlign: 'right' }}>Rate</th>
                                <th style={{ padding: '10px', width: '10%', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '10px', width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{index + 1}</td>
                                    <td style={{ padding: 0 }}><select style={gridInputStyle} value={item.description} onChange={e => { const n=[...lineItems]; n[index].description=e.target.value; setLineItems(n) }} onKeyDown={(e) => handleShortcut(e, 'service', index, 'description')}><option value="">-- Select or F2 --</option>{services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></td>
                                    <td style={{ padding: 0 }}><select style={gridInputStyle} value={item.equipment_type} onChange={e => { const n=[...lineItems]; n[index].equipment_type=e.target.value; setLineItems(n) }} onKeyDown={(e) => handleShortcut(e, 'equipment', index, 'equipment_type')}><option value="">-- Select --</option>{equipmentTypes.map(eq => <option key={eq.id} value={eq.equipment_type}>{eq.equipment_type}</option>)}</select></td>
                                    <td style={{ padding: 0 }}><select style={gridInputStyle} value={item.pol} onChange={e => { const n=[...lineItems]; n[index].pol=e.target.value; setLineItems(n) }} onKeyDown={(e) => handleShortcut(e, 'city', index, 'pol')}><option value=""></option>{cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></td>
                                    <td style={{ padding: 0 }}><select style={gridInputStyle} value={item.pod} onChange={e => { const n=[...lineItems]; n[index].pod=e.target.value; setLineItems(n) }} onKeyDown={(e) => handleShortcut(e, 'city', index, 'pod')}><option value=""></option>{cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></td>
                                    <td style={{ padding: 0 }}><input style={gridInputStyle} value={item.uom || ''} onChange={e => { const n=[...lineItems]; n[index].uom=e.target.value; setLineItems(n) }} /></td>
                                    <td style={{ padding: 0 }}><input type="number" style={{ ...gridInputStyle, textAlign: 'center' }} value={item.quantity} onChange={e => { const n=[...lineItems]; n[index].quantity=e.target.value; setLineItems(n) }} /></td>
                                    <td style={{ padding: 0 }}><input type="number" style={{ ...gridInputStyle, textAlign: 'right' }} value={item.rate} onChange={e => { const n=[...lineItems]; n[index].rate=e.target.value; setLineItems(n) }} onKeyDown={e => {if(e.key==='Enter' && index===lineItems.length-1) setLineItems([...lineItems, createEmptyLineItem()])}} /></td>
                                    <td style={{ padding: '0 10px', textAlign: 'right', fontWeight: 'bold' }}>{calculateRowAmount(item.quantity, item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ textAlign: 'center' }}><button onClick={() => { const n=[...lineItems]; n.splice(index,1); setLineItems(n) }} style={{ border: 'none', background: 'transparent', color: '#ef4444' }}><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button onClick={() => setLineItems([...lineItems, createEmptyLineItem()])} className="btn btn-secondary" style={{ fontSize:'12px', display:'flex', gap:'5px' }}><Plus size={14} /> Add Line</button>
                    <div style={{ background: '#f8fafc', padding: '8px 15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight:'10px' }}>TOTAL AMT</span><span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })} <small>AED</small></span></div>
                 </div>
                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}><button className="btn btn-secondary" style={{display:'flex', alignItems:'center', gap:'5px'}} onClick={() => setActiveTab('sourcing')}><ArrowLeft size={14}/> Back</button><button className="btn btn-primary" style={{display:'flex', alignItems:'center', gap:'5px'}} onClick={() => setActiveTab('terms')}>Next <ArrowRight size={14}/></button></div>
             </div>
         )}
         
         {/* TAB 4: TERMS */}
         {activeTab === 'terms' && (
             <div className="fade-in">
                 <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '600', color: '#334155', cursor:'pointer' }}>
                         <input type="checkbox" style={{ width:'16px', height:'16px' }} checked={header.include_std_terms_pdf || false} onChange={e => setHeader({...header, include_std_terms_pdf: e.target.checked})} />
                         Attach Standard Terms of Business (PDF)
                     </label>
                     <div style={{ marginLeft: '26px', fontSize: '12px', color: '#64748b', marginTop:'4px' }}>Check this for new customers to include the full legal PDF in the email.</div>
                 </div>
                 <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', color: '#1e3a8a', textAlign: 'left', fontWeight: '600' }}>
                                <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>✓</th>
                                <th style={{ padding: '10px' }}>Term / Clause Description</th>
                                <th style={{ padding: '10px', width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {termsList.map((term, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', background: term.checked ? '#f0f9ff' : 'white' }}>
                                    <td style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}><input type="checkbox" checked={term.checked} onChange={e => { const n = [...termsList]; n[index].checked = e.target.checked; setTermsList(n) }} /></td>
                                    <td style={{ padding: 0 }}><input style={{ ...gridInputStyle, fontWeight: term.checked ? '600' : 'normal', color: term.checked ? '#0f172a' : '#64748b' }} value={term.text} onChange={e => { const n = [...termsList]; n[index].text = e.target.value; setTermsList(n) }} /></td>
                                    <td style={{ textAlign: 'center' }}>{term.is_custom && (<button onClick={() => { const n = [...termsList]; n.splice(index, 1); setTermsList(n) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <button onClick={() => setTermsList([...termsList, { text: '', checked: true, is_custom: true }])} style={{ fontSize: '12px', marginTop: '15px', border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px' }}><Plus size={14} /> Add Custom Clause</button>
                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}><button className="btn btn-secondary" style={{display:'flex', alignItems:'center', gap:'5px'}} onClick={() => setActiveTab('commercials')}><ArrowLeft size={14}/> Back</button><button className="btn btn-primary" style={{display:'flex', alignItems:'center', gap:'5px'}} onClick={handleSave}><Save size={14}/> Finish & Save</button></div>
             </div>
         )}
      </div>
    </div>
  )
}