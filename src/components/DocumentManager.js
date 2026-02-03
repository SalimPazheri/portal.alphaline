import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function DocumentManager({ relatedType, relatedId }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  
  // 1. THIS IS THE LIST OF DOCUMENT TYPES YOU ASKED FOR
  const DOC_TYPES = [
      "Equipment Photo", 
      "Registration (Mulkiya)", 
      "Insurance Policy", 
      "Fitness Cert", 
      "Other"
  ]
  const [selectedType, setSelectedType] = useState(DOC_TYPES[0])

  const fetchDocs = useCallback(async () => {
    if (!relatedId) return
    const { data } = await supabase
      .from('fleet_documents')
      .select('*')
      .eq('related_type', relatedType)
      .eq('related_id', relatedId)
      .order('created_at', { ascending: false })
    setDocs(data || [])
  }, [relatedId, relatedType])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleUpload = async (event) => {
    try {
      setUploading(true)
      const file = event.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${relatedType}_${relatedId}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('fleet-docs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fleet-docs')
        .getPublicUrl(filePath)

      // Save to Database with the SELECTED TYPE
      const { error: dbError } = await supabase
        .from('fleet_documents')
        .insert([{
            related_type: relatedType,
            related_id: relatedId,
            doc_type: selectedType, // <--- SAVES 'Equipment Photo' or 'Mulkiya'
            file_url: publicUrl,
            file_name: file.name
        }])

      if (dbError) throw dbError
      
      alert('Document uploaded!')
      fetchDocs()
    } catch (error) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, path) => {
      if(!window.confirm("Delete this document?")) return
      await supabase.from('fleet_documents').delete().eq('id', id)
      fetchDocs()
  }

  return (
    <div>
      {/* UPLOAD SECTION WITH DROPDOWN */}
      <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'15px'}}>
          <select 
            value={selectedType} 
            onChange={e => setSelectedType(e.target.value)}
            style={{padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}
          >
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <input 
            type="file" 
            accept="image/*, .pdf" // ALLOWS IMAGES AND PDF
            onChange={handleUpload} 
            disabled={uploading}
            style={{fontSize:'13px'}}
          />
          {uploading && <span style={{color:'blue'}}>Uploading...</span>}
      </div>

      {/* FILE LIST */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
        {docs.map(doc => (
          <div key={doc.id} style={{border:'1px solid #eee', padding:'8px', borderRadius:'6px', background:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
             <div>
                 <div style={{fontWeight:'bold', fontSize:'12px', color:'#333'}}>{doc.doc_type}</div>
                 <a href={doc.file_url} target="_blank" rel="noreferrer" style={{fontSize:'11px', color:'#2563eb'}}>View File</a>
             </div>
             <button onClick={() => handleDelete(doc.id)} style={{background:'none', border:'none', cursor:'pointer', color:'red'}}>🗑️</button>
          </div>
        ))}
        {docs.length === 0 && <div style={{color:'#999', fontSize:'13px', gridColumn:'span 2', textAlign:'center'}}>No documents uploaded yet.</div>}
      </div>
    </div>
  )
}