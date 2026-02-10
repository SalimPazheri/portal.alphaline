
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function DocumentManager({ relatedType, relatedId }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // New Document State
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => {
    if (relatedId) fetchDocuments()
  }, [relatedId])

  // 1. DYNAMIC DROPDOWN OPTIONS 🛠️
  // This checks if we are on the Driver page or Truck page
  const getDocOptions = () => {
    if (relatedType === 'Driver') {
        return ['Passport', 'Driving License', 'Residence ID', 'Photo', 'Others']
    }
    // Default options (for Trucks, Trailers, etc.)
    return ['Registration (Mulkiya)', 'Insurance Policy', 'Permit', 'Road Worthiness', 'Others']
  }

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('fleet_documents')
      .select('*')
      .eq('related_type', relatedType)
      .eq('related_id', relatedId)
      .order('created_at', { ascending: false })
    
    if (data) setDocuments(data)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !docType) return alert('Please select a file and document type')

    setUploading(true)
    try {
      // 1. Upload File to Storage Bucket
      const fileExt = file.name.split('.').pop()
      const fileName = `${relatedType}/${relatedId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('fleet_documents') // Make sure this Bucket exists in Supabase
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fleet_documents')
        .getPublicUrl(fileName)

      // 3. Save Record to Database
      const { error: dbError } = await supabase
        .from('fleet_documents')
        .insert([{
          related_type: relatedType,
          related_id: relatedId,
          doc_type: docType,
          expiry_date: expiryDate || null,
          file_url: publicUrl,
          file_name: file.name
        }])

      if (dbError) throw dbError

      // 4. Reset & Refresh
      setShowModal(false)
      setFile(null)
      setDocType('')
      setExpiryDate('')
      fetchDocuments()

    } catch (error) {
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, url) => {
      if(!window.confirm("Delete this document?")) return

      // 1. Delete from DB
      await supabase.from('fleet_documents').delete().eq('id', id)
      
      // 2. Refresh List (We don't strictly need to delete from Storage, but good practice)
      fetchDocuments()
  }

  return (
    <div style={{ marginTop: '10px' }}>
      
      {/* HEADER & ADD BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: '#475569' }}>📎 Attached Documents</h4>
        <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '5px 10px', fontSize: '11px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
            + Upload Document
        </button>
      </div>

      {/* DOCUMENT LIST */}
      <div style={{ display: 'grid', gap: '8px' }}>
          {documents.length === 0 && <div style={{fontSize:'12px', color:'#94a3b8', fontStyle:'italic'}}>No documents uploaded yet.</div>}
          
          {documents.map(doc => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '18px' }}>
                          {doc.doc_type.includes('Passport') ? '🛂' : doc.doc_type.includes('License') ? '🆔' : '📄'}
                      </div>
                      <div>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                              <a href={doc.file_url} target="_blank" rel="noreferrer" style={{color:'inherit', textDecoration:'none'}}>{doc.doc_type}</a>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                              Expires: {doc.expiry_date || 'N/A'}
                          </div>
                      </div>
                  </div>
                  <button onClick={() => handleDelete(doc.id, doc.file_url)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
              </div>
          ))}
      </div>

      {/* UPLOAD MODAL */}
      {showModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '350px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Upload New Document</h3>
                
                <form onSubmit={handleUpload}>
                    {/* TYPE DROPDOWN (Dynamic!) */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Document Type</label>
                        <select 
                            required 
                            value={docType} 
                            onChange={e => setDocType(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        >
                            <option value="">-- Select Type --</option>
                            {getDocOptions().map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* EXPIRY DATE */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Expiry Date (Optional)</label>
                        <input 
                            type="date" 
                            value={expiryDate} 
                            onChange={e => setExpiryDate(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>

                    {/* FILE SELECT */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Select File</label>
                        <input 
                            type="file" 
                            required
                            onChange={e => setFile(e.target.files[0])}
                            style={{ marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 15px', border: 'none', background: '#e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={uploading} style={{ padding: '8px 15px', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  )
}