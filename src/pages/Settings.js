
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // This state holds our global config
  // We include app_name, file settings, and regional defaults
  const [config, setConfig] = useState({
    app_name: 'Move+', 
    max_file_size_mb: 5,
    allowed_file_types: '',
    default_country: '',
    default_currency: '',
    vat_percentage: 0
  })

  // Mock Admin Check (Set to 'false' to test the restricted view)
  const isAdmin = true 

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      // We always fetch ID=1 because it's a singleton table (one row only)
      let { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single()
      
      // Ignore error if row doesn't exist yet (it will be created on save)
      if (error && error.code !== 'PGRST116') {
        alert("Error fetching settings: " + error.message)
      }
      
      if (data) {
        setConfig(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    // UPSERT: Updates existing row ID=1, or inserts if missing
    const { error } = await supabase
      .from('system_settings')
      .upsert({ ...config, id: 1 }) 

    if (error) alert("Failed to save: " + error.message)
    else alert("✅ System Settings Updated!")
    
    setSaving(false)
  }

  if (!isAdmin) {
    return <div style={{padding:'50px', color:'red', textAlign:'center'}}>⛔ Access Denied: Admins Only.</div>
  }

  if (loading) return <div style={{padding:'40px', textAlign:'center', color:'#666'}}>Loading System Config...</div>

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>⚙️ System Settings</h2>
      </div>

      <div className="table-card" style={{maxWidth:'600px', margin:'20px auto', padding:'30px'}}>
        <form onSubmit={handleSave}>
            
            {/* SECTION 1: APPLICATION IDENTITY (New) */}
            <h4 style={{marginTop:0, color:'#2563eb', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}>
                🆔 Application Identity
            </h4>
            
            <div className="form-group" style={{marginBottom:'20px'}}>
                <label className="form-label">Application Name (Header)</label>
                <input 
                    type="text" 
                    className="form-input"
                    value={config.app_name || ''}
                    onChange={e => setConfig({...config, app_name: e.target.value})}
                    placeholder="e.g. Move+"
                    style={{fontWeight:'bold', color:'#333'}}
                />
                <small style={{color:'#64748b', display:'block', marginTop:'5px'}}>
                    This name appears on all system popups and alerts.
                </small>
            </div>

            {/* SECTION 2: FILE UPLOAD CONTROLS */}
            <h4 style={{marginTop:'30px', color:'#2563eb', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}>
                📂 File Upload Restrictions
            </h4>
            
            <div className="form-group" style={{marginBottom:'15px'}}>
                <label className="form-label">Max File Size (MB)</label>
                <input 
                    type="number" 
                    className="form-input"
                    value={config.max_file_size_mb || 5}
                    onChange={e => setConfig({...config, max_file_size_mb: e.target.value})}
                />
                <small style={{color:'#64748b'}}>Files larger than this will be rejected.</small>
            </div>

            <div className="form-group" style={{marginBottom:'15px'}}>
                <label className="form-label">Allowed File Types</label>
                <textarea 
                    className="form-input"
                    rows="3"
                    value={config.allowed_file_types || ''}
                    onChange={e => setConfig({...config, allowed_file_types: e.target.value})}
                    placeholder="image/jpeg, image/png, application/pdf"
                />
                <small style={{color:'#64748b'}}>Comma separated MIME types.</small>
            </div>


            {/* SECTION 3: REGIONAL DEFAULTS */}
            <h4 style={{marginTop:'30px', color:'#2563eb', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}>
                🌍 Regional & Financial Defaults
            </h4>

            <div className="form-group" style={{marginBottom:'15px'}}>
                <label className="form-label">Default Country</label>
                <input 
                    type="text" 
                    className="form-input"
                    value={config.default_country || ''}
                    onChange={e => setConfig({...config, default_country: e.target.value})}
                    placeholder="e.g. Bahrain"
                />
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div className="form-group">
                    <label className="form-label">Default Currency</label>
                    <input 
                        type="text" 
                        className="form-input"
                        value={config.default_currency || ''}
                        onChange={e => setConfig({...config, default_currency: e.target.value})}
                        placeholder="e.g. BHD"
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label">VAT %</label>
                    <input 
                        type="number" 
                        className="form-input"
                        value={config.vat_percentage || 0}
                        onChange={e => setConfig({...config, vat_percentage: e.target.value})}
                    />
                </div>
            </div>

            <hr style={{margin:'30px 0', borderTop:'1px solid #eee'}} />

            <button 
                type="submit" 
                className="btn btn-primary" 
                style={{width:'100%', padding:'12px', fontSize:'16px'}}
                disabled={saving}
            >
                {saving ? 'Saving...' : '💾 Update System Settings'}
            </button>

        </form>
      </div>
    </div>
  )
}