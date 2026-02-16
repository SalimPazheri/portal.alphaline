import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useUser } from '../context/UserContext'
import { Save, Image as ImageIcon, MessageSquare, Globe, Loader2 } from 'lucide-react'

export default function Settings() {
  const user = useUser() // Accesses your ALPHALINE CARGO branch info
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [branchData, setBranchData] = useState({
    name: '',
    vat_percent: 0,
    currency_code: '',
    seasonal_message: '',
    show_seasonal_message: false,
    header_image_url: '',
    footer_image_url: ''
  })

  useEffect(() => {
    if (!user.loading) {
      fetchSettings()
    }
  }, [user.loading, user.branch_id])

  const fetchSettings = async () => {
    try {
      if (!user.branch_id) return

      const { data, error } = await supabase
        .from('branch_document_settings')
        .select(`
          seasonal_message, 
          show_seasonal_message, 
          header_image_url, 
          footer_image_url,
          branch:branch_id ( name, vat_percent, currency_code )
        `)
        .eq('branch_id', user.branch_id)
        .maybeSingle() // Prevents "Loading..." hang if row is missing

      if (data) {
        setBranchData({
          name: data.branch?.name || '',
          vat_percent: data.branch?.vat_percent || 0,
          currency_code: data.branch?.currency_code || '',
          seasonal_message: data.seasonal_message || '',
          show_seasonal_message: data.show_seasonal_message || false,
          header_image_url: data.header_image_url || '',
          footer_image_url: data.footer_image_url || ''
        })
      }
    } catch (err) {
      console.error("Error loading settings:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('branch_document_settings')
        .upsert({
          branch_id: user.branch_id,
          seasonal_message: branchData.seasonal_message,
          show_seasonal_message: branchData.show_seasonal_message,
          header_image_url: branchData.header_image_url,
          footer_image_url: branchData.footer_image_url
        })

      if (error) throw error
      alert("Settings saved successfully!")
    } catch (err) {
      alert("Save failed: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', gap: '10px', padding: '40px', color: '#64748b' }}>
      <Loader2 className="animate-spin" /> Initializing Branch Settings...
    </div>
  )

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Branch Settings</h2>
          <p style={{ color: '#64748b', margin: '5px 0 0' }}>Manage branding for {branchData.name}</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={btnStyle}>
          {saving ? 'Saving...' : 'Save Settings'} <Save size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        
        {/* READ ONLY INFO */}
        <div style={cardStyle}>
          <h3 style={cardTitle}><Globe size={18} /> Official Info</h3>
          <div style={infoRow}><span>Branch Name:</span> <strong>{branchData.name}</strong></div>
          <div style={infoRow}><span>VAT Rate:</span> <strong>{branchData.vat_percent}%</strong></div>
          <div style={infoRow}><span>Currency:</span> <strong>{branchData.currency_code}</strong></div>
          <p style={{fontSize: '11px', color: '#94a3b8', marginTop: '15px'}}>Contact Super Admin to change official branch details.</p>
        </div>

        {/* SEASONAL MESSAGE */}
        <div style={cardStyle}>
          <h3 style={cardTitle}><MessageSquare size={18} /> Seasonal Greeting</h3>
          <textarea 
            placeholder="e.g. Ramadan Kareem or Holiday Hours..."
            value={branchData.seasonal_message}
            onChange={e => setBranchData({...branchData, seasonal_message: e.target.value})}
            style={textareaStyle}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', cursor: 'pointer', fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={branchData.show_seasonal_message}
              onChange={e => setBranchData({...branchData, show_seasonal_message: e.target.checked})}
            /> 
            Display message on generated PDF documents
          </label>
        </div>

        {/* BRANDING */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <h3 style={cardTitle}><ImageIcon size={18} /> Document Letterhead & Footer (URLs)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Header Image URL</label>
              <input 
                value={branchData.header_image_url}
                onChange={e => setBranchData({...branchData, header_image_url: e.target.value})}
                placeholder="https://..."
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Footer Image URL</label>
              <input 
                value={branchData.footer_image_url}
                onChange={e => setBranchData({...branchData, footer_image_url: e.target.value})}
                placeholder="https://..."
                style={inputStyle} 
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// Styles
const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
const cardTitle = { fontSize: '16px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }
const infoRow = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f1f5f9', fontSize: '14px' }
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }
const textareaStyle = { width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', resize: 'none' }
const btnStyle = { background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }