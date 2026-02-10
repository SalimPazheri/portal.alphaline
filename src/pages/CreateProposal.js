import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, useParams } from 'react-router-dom' 
import { FileText, Trash2, ArrowRight, ArrowLeft, Save, ShieldAlert, UserPlus, Plus } from 'lucide-react'

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
    status: 'Proposed'
  })

  // Initialize with 10 Empty Rows (Updated with detention_amount)
  const [sourcingItems, setSourcingItems] = useState(
    Array(10).fill({ equipment_type: '', agent_id: '', quoted_rate: '', detention: '', detention_amount: '', notes: '' })
  )
  const [lineItems, setLineItems] = useState([])
  const [terms, setTerms] = useState([])

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    fetchDropdowns()
    if (isEditMode) fetchProposalData(id) 
  }, [id])

  const fetchDropdowns = async () => {
    const { data: cust } = await supabase.from('master_customers').select('id, name').eq('is_deleted', false).order('name')
    if (cust) setCustomers(cust)
    const { data: agt } = await supabase.from('master_agents').select('id, name').order('name')
    if (agt) setAgents(agt)
    const { data: equip } = await supabase.from('fleet_equipment').select('id, name').order('name')
    if (equip) setEquipmentTypes(equip)
  }

  // --- LOAD EXISTING DATA ---
  const fetchProposalData = async (proposalId) => {
      setLoading(true)
      const { data, error } = await supabase.from('proposals').select('*').eq('id', proposalId).single()
      if (error) {
          alert("Error loading proposal")
          navigate('/proposals')
          return
      }

      const { data: sourcing } = await supabase.from('proposal_sourcing').select('*').eq('proposal_id', proposalId)
      const { data: items } = await supabase.from('proposal_items').select('*').eq('proposal_id', proposalId)
      const { data: t } = await supabase.from('proposal_terms').select('*').eq('proposal_id', proposalId).order('sort_order')

      setHeader(data)
      
      if (sourcing && sourcing.length > 0) {
          const filled = [...sourcing]
          const extra = Math.max(0, 10 - filled.length)
          const padded = [...filled, ...Array(extra).fill({ equipment_type: '', agent_id: '', quoted_rate: '', detention: '', detention_amount: '', notes: '' })]
          setSourcingItems(padded)
      }

      if (items) setLineItems(items)
      if (t) setTerms(t)
      if (data.customer_id) fetchContacts(data.customer_id)
      
      setLoading(false)
  }

  // --- CONTACTS LOGIC ---
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
      
      const { data, error } = await supabase
        .from('customer_contacts')
        .insert([{ customer_id: header.customer_id, contact_person: name, designation: 'Sales POC' }])
        .select().single()
      
      if (error) alert(error.message)
      else {
          await fetchContacts(header.customer_id)
          setHeader(prev => ({ ...prev, attention_id: data.id }))
      }
  }

  // --- SAVE LOGIC ---
  const handleSave = async () => {
    if (!header.customer_id) return alert("Please select a Customer.")
    if (!header.subject) return alert("Please enter a Subject.")
    
    const validSourcing = sourcingItems.filter(item => item.agent_id || item.quoted_rate || item.equipment_type)
    
    if (validSourcing.length < 2) {
       setActiveTab('sourcing')
       return alert("⚠️ POLICY WARNING: You must add at least 2 Agent Rates (Rows) in the Costing tab.")
    }

    setLoading(true)
    try {
      const user = await supabase.auth.getUser()
      const userId = user.data.user?.id
      let pid = header.id

      if (isEditMode) {
          const { error } = await supabase.from('proposals').update({...header}).eq('id', pid)
          if (error) throw error
          
          await supabase.from('proposal_sourcing').delete().eq('proposal_id', pid)
          await supabase.from('proposal_items').delete().eq('proposal_id', pid)
          await supabase.from('proposal_terms').delete().eq('proposal_id', pid)
      } else {
          const { data, error } = await supabase.from('proposals').insert([{ ...header, created_by: userId }]).select().single()
          if (error) throw error
          pid = data.id
      }

      await Promise.all([
        supabase.from('proposal_sourcing').insert(validSourcing.map(i => ({...i, proposal_id: pid, created_by: userId}))),
        supabase.from('proposal_items').insert(lineItems.map(i => ({...i, proposal_id: pid}))),
        supabase.from('proposal_terms').insert(terms.map((t, i) => ({term_text: t.term_text, sort_order: i+1, proposal_id: pid})))
      ])

      alert("✅ Saved Successfully!")
      navigate('/proposals') 

    } catch (error) {
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const importStandardTerms = async () => {
    const { data } = await supabase.from('master_special_terms').select('term_text').eq('is_default', true).order('sort_order')
    if (data) setTerms(data.map(t => ({ term_text: t.term_text })))
  }

  // --- STYLES ---
  const commonInputStyle = { width: '100%', height: '38px', padding: '0 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#334155' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }
  const tabBtnStyle = (isActive) => ({ padding: '10px 20px', cursor: 'pointer', border: 'none', background: isActive ? 'white' : 'transparent', borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent', fontWeight: isActive ? 'bold' : '500', color: isActive ? '#2563eb' : '#64748b', fontSize: '13px' })
  const gridInputStyle = { width: '100%', border: 'none', background: 'transparent', height: '100%', padding: '8px', outline: 'none', fontSize: '13px', color: '#334155' }

  return (
    <div className="page-container" style={{ maxWidth: '1250px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
           <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#0f172a' }}>
             <FileText size={20} color="#2563eb" /> {isEditMode ? 'Edit Proposal' : 'New Proposal'}
           </h3>
           <span style={{ fontSize: '12px', color: '#64748b' }}>Ref: <strong style={{color:'#2563eb'}}>{header.proposal_ref}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/proposals')} className="btn btn-secondary" style={{padding:'6px 15px', fontSize:'13px'}}>Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ padding: '6px 20px', fontSize:'13px' }}>
               {loading ? 'Saving...' : <><Save size={14} style={{marginRight:'5px'}}/> Save</>}
            </button>
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
         
         {/* TAB 1: PROJECT INFO */}
         {activeTab === 'project' && (
             <div className="fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={labelStyle}>Customer *</label>
                        <select style={commonInputStyle} value={header.customer_id} onChange={handleCustomerChange}>
                            <option value="">-- Select --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Attention To</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <select style={commonInputStyle} value={header.attention_id} onChange={e => setHeader({...header, attention_id: e.target.value})}>
                                <option value="">-- Select --</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.contact_person}</option>)}
                            </select>
                            <button onClick={handleAddContact} style={{ height: '38px', width: '38px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '5px', color: '#0ea5e9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={16} /></button>
                        </div>
                    </div>
                    <div><label style={labelStyle}>Date</label><input type="date" style={commonInputStyle} value={header.proposal_date} onChange={e => setHeader({...header, proposal_date: e.target.value})} /></div>
                    <div><label style={labelStyle}>Valid Until</label><input type="date" style={commonInputStyle} value={header.valid_until} onChange={e => setHeader({...header, valid_until: e.target.value})} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={labelStyle}>Section *</label>
                        <select style={commonInputStyle} value={header.section} onChange={e => setHeader({...header, section: e.target.value})}>
                            <option value="">-- Select Section --</option>
                            <option>Road Freight</option>
                            <option>Sea Freight</option>
                            <option>Air Freight</option>
                            <option>Logistics / Warehousing</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Category *</label>
                        <select style={commonInputStyle} value={header.category} onChange={e => setHeader({...header, category: e.target.value})}>
                            <option value="">-- Select Category --</option>
                            <option>Import</option>
                            <option>Export</option>
                            <option>Roundtrip</option>
                            <option>Domestic</option>
                            <option>Storage</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div><label style={labelStyle}>Subject / Title *</label><input style={commonInputStyle} placeholder="e.g. Haulage of PVC Pipes" value={header.subject} onChange={e => setHeader({...header, subject: e.target.value})} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px' }}>
                    <div><label style={labelStyle}>Scope of Work</label><textarea style={{ ...commonInputStyle, height: '80px', resize: 'none', paddingTop: '8px' }} value={header.scope_of_work} onChange={e => setHeader({...header, scope_of_work: e.target.value})} /></div>
                    <div><label style={labelStyle}>Signatory</label><select style={commonInputStyle} value={header.signatory_name} onChange={e => setHeader({...header, signatory_name: e.target.value})}><option>Mr. Nazeer Hameed</option><option>Mr. Manager</option></select></div>
                </div>
                
                <div style={{ marginTop: '25px', textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('sourcing')}>Next: Costing <ArrowRight size={14} /></button>
                </div>
             </div>
         )}

         {/* TAB 2: COSTING (UPDATED COLUMNS) */}
         {activeTab === 'sourcing' && (
             <div className="fade-in">
                 <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', marginBottom: '15px', display:'flex', gap:'10px', alignItems:'center' }}>
                    <ShieldAlert color="#b45309" size={20} />
                    <div style={{ fontSize: '12px', color: '#b45309' }}><strong>Internal Costing Sheet:</strong> Map equipment to vendors. Empty rows are ignored.</div>
                 </div>

                 <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>#</th>
                                <th style={{ padding: '10px', width: '20%' }}>Agent / Vendor</th>
                                <th style={{ padding: '10px', width: '20%' }}>Equipment</th>
                                <th style={{ padding: '10px', width: '10%', textAlign: 'right' }}>Cost</th>
                                <th style={{ padding: '10px', width: '15%' }}>Detention Terms</th>
                                <th style={{ padding: '10px', width: '12%', textAlign: 'right' }}>Detention Amt.</th>
                                <th style={{ padding: '10px' }}>Remarks</th>
                                <th style={{ padding: '10px', width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sourcingItems.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>{index + 1}</td>
                                    
                                    <td style={{ padding: 0, borderRight: '1px solid #f1f5f9' }}>
                                        <select style={{ ...gridInputStyle, cursor: 'pointer' }} value={item.agent_id || ''} onChange={e => { const n=[...sourcingItems]; n[index].agent_id=e.target.value; setSourcingItems(n) }}>
                                            <option value="">-- Select Agent --</option>
                                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </td>

                                    <td style={{ padding: 0, borderRight: '1px solid #f1f5f9' }}>
                                        <select style={{ ...gridInputStyle, cursor: 'pointer' }} value={item.equipment_type || ''} onChange={e => { const n=[...sourcingItems]; n[index].equipment_type=e.target.value; setSourcingItems(n) }}>
                                            <option value="">-- Select Equip --</option>
                                            {equipmentTypes.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
                                        </select>
                                    </td>

                                    <td style={{ padding: 0, borderRight: '1px solid #f1f5f9' }}>
                                        <input type="number" placeholder="0.00" style={{ ...gridInputStyle, textAlign: 'right' }} value={item.quoted_rate || ''} onChange={e => { const n=[...sourcingItems]; n[index].quoted_rate=e.target.value; setSourcingItems(n) }} />
                                    </td>

                                    <td style={{ padding: 0, borderRight: '1px solid #f1f5f9' }}>
                                        <input placeholder="e.g. 5 Days Free" style={gridInputStyle} value={item.detention || ''} onChange={e => { const n=[...sourcingItems]; n[index].detention=e.target.value; setSourcingItems(n) }} />
                                    </td>

                                    {/* NEW COLUMN: Detention Amount */}
                                    <td style={{ padding: 0, borderRight: '1px solid #f1f5f9' }}>
                                        <input type="number" placeholder="0.00" style={{ ...gridInputStyle, textAlign: 'right' }} value={item.detention_amount || ''} onChange={e => { const n=[...sourcingItems]; n[index].detention_amount=e.target.value; setSourcingItems(n) }} />
                                    </td>

                                    <td style={{ padding: 0 }}>
                                        <input placeholder="Notes..." style={gridInputStyle} value={item.notes || ''} onChange={e => { const n=[...sourcingItems]; n[index].notes=e.target.value; setSourcingItems(n) }} />
                                    </td>

                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => { const n=[...sourcingItems]; n.splice(index,1); setSourcingItems(n) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', opacity: 0.6 }}><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <button onClick={() => setSourcingItems([...sourcingItems, { equipment_type: '', agent_id: '', quoted_rate: '', detention: '', detention_amount: '', notes: '' }])} className="btn btn-secondary" style={{ marginTop: '10px', fontSize:'12px', display:'flex', alignItems:'center', gap:'5px' }}>
                    <Plus size={14} /> Add More Rows
                </button>
                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('project')}><ArrowLeft size={14}/> Back</button>
                    <button className="btn btn-primary" onClick={() => setActiveTab('commercials')}>Next <ArrowRight size={14}/></button>
                </div>
             </div>
         )}

         {/* TAB 3: COMMERCIALS */}
         {activeTab === 'commercials' && (
             <div className="fade-in">
                 <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '12px' }}>
                    <thead><tr style={{ textAlign: 'left', color: '#64748b' }}><th>DESC</th><th>POL</th><th>POD</th><th>EQUIP</th><th>QTY</th><th>RATE</th><th>TOTAL</th><th></th></tr></thead>
                    <tbody>
                       {lineItems.map((item, index) => (
                          <tr key={index}>
                             <td style={{padding:'0 5px'}}><input style={commonInputStyle} value={item.description} onChange={e => { const n=[...lineItems]; n[index].description=e.target.value; setLineItems(n) }} /></td>
                             <td style={{padding:'0 5px'}}><input style={commonInputStyle} value={item.pol} onChange={e => { const n=[...lineItems]; n[index].pol=e.target.value; setLineItems(n) }} /></td>
                             <td style={{padding:'0 5px'}}><input style={commonInputStyle} value={item.pod} onChange={e => { const n=[...lineItems]; n[index].pod=e.target.value; setLineItems(n) }} /></td>
                             <td style={{padding:'0 5px'}}><input style={commonInputStyle} value={item.equipment_type} onChange={e => { const n=[...lineItems]; n[index].equipment_type=e.target.value; setLineItems(n) }} /></td>
                             <td style={{padding:'0 5px'}}><input type="number" style={commonInputStyle} value={item.quantity} onChange={e => { const n=[...lineItems]; n[index].quantity=Number(e.target.value); setLineItems(n) }} /></td>
                             <td style={{padding:'0 5px'}}><input type="number" style={commonInputStyle} value={item.rate} onChange={e => { const n=[...lineItems]; n[index].rate=Number(e.target.value); setLineItems(n) }} /></td>
                             <td style={{ fontWeight: 'bold' }}>{(item.quantity * item.rate).toLocaleString()}</td>
                             <td style={{ textAlign:'center' }}><Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => { const n=[...lineItems]; n.splice(index,1); setLineItems(n) }} /></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 <button onClick={() => setLineItems([...lineItems, { description: 'Road Freight', pol: '', pod: '', equipment_type: '', quantity: 1, rate: 0 }])} className="btn btn-secondary" style={{ fontSize:'12px', marginTop:'10px' }}>+ Add Line</button>
                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('sourcing')}><ArrowLeft size={14}/> Back</button>
                    <button className="btn btn-primary" onClick={() => setActiveTab('terms')}>Next <ArrowRight size={14}/></button>
                </div>
             </div>
         )}

         {/* TAB 4: TERMS */}
         {activeTab === 'terms' && (
             <div className="fade-in">
                 <button onClick={importStandardTerms} className="btn btn-secondary" style={{ fontSize:'12px', color:'#2563eb', marginBottom:'15px' }}>⬇️ Import Standard Terms</button>
                 {terms.map((term, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ paddingTop: '10px' }}>{index+1}.</div>
                        <textarea style={{ ...commonInputStyle, height: '40px' }} value={term.term_text} onChange={e => { const n=[...terms]; n[index].term_text=e.target.value; setTerms(n) }} />
                        <Trash2 size={16} color="#94a3b8" style={{ cursor: 'pointer', marginTop:'10px' }} onClick={() => { const n=[...terms]; n.splice(index,1); setTerms(n) }} />
                    </div>
                 ))}
                 <button onClick={() => setTerms([...terms, { term_text: '' }])} style={{ fontSize: '12px', border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Clause</button>
                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('commercials')}><ArrowLeft size={14}/> Back</button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ background: '#10b981' }}>✅ Finish & Save</button>
                </div>
             </div>
         )}
      </div>
    </div>
  )
}