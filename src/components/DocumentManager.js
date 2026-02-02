
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function DocumentManager({ relatedType, relatedId }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [newDoc, setNewDoc] = useState({ doc_type: 'Other', notes: '', file: null })

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

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!newDoc.file) return alert("Please select a file first!")
    
    setUploading(true)
    try {
      const fileExt = newDoc.file.name.split('.').pop()
      // Create a clean filename: "Driver-123-Passport-167888.jpg"
      const fileName = `${relatedType}-${relatedId}-${newDoc.doc_type}-${Date.now()}.${fileExt}`.replace(/\s+/g, '-') 
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('fleet-docs')
        .upload(filePath, newDoc.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fleet-docs').getPublicUrl(filePath)

      await supabase.from('fleet_documents').insert([{
        related_type: relatedType,
        related_id: relatedId,
        doc_type: newDoc.doc_type,
        notes: newDoc.notes,
        file_url: publicUrl
      }])

      setNewDoc({ doc_type: 'Other', notes: '', file: null })
      fetchDocs() 

    } catch (error) {
      alert("Upload Failed: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return
    await supabase.from('fleet_documents').delete().eq('id', id)
    fetchDocs()
  }

  return (
    <div style={{marginTop:'20px', padding:'15px', background:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
      <h4 style={{marginTop:0, color:'#334155'}}>📂 Documents & Photos</h4>

      {/* UPLOAD FORM */}
      <div style={{display:'flex', gap:'10px', alignItems:'flex-end', marginBottom:'15px', flexWrap:'wrap'}}>
        <div>
            <span style={{fontSize:'11px', display:'block', marginBottom:'4px'}}>Doc Type</span>
            <select 
              value={newDoc.doc_type} 
              onChange={e => setNewDoc({...newDoc, doc_type: e.target.value})}
              style={{padding:'5px', borderRadius:'4px', border:'1px solid #ccc', fontSize:'13px'}}
            >
                <option>Mulkiya / Registration</option>
                <option>Insurance Policy</option>
                <option>Driving License</option>
                <option>Passport</option>
                <option>Visa</option>
                <option>Residence ID</option> {/* Updated Name */}
                <option>Driver Photo</option> {/* Added Option */}
                <option>Vehicle Photo</option>
                <option>Damage Report</option>
                <option>Other</option>
            </select>
        </div>
        <div>
            <span style={{fontSize:'11px', display:'block', marginBottom:'4px'}}>File (Image/PDF)</span>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={e => setNewDoc({...newDoc, file: e.target.files[0]})}
              style={{fontSize:'12px'}} 
            />
        </div>
        <button 
            onClick={handleUpload} 
            disabled={uploading}
            className="btn btn-primary"
            style={{padding:'6px 12px', height:'32px'}}
        >
            {uploading ? '⏳ Uploading...' : '⬆ Upload'}
        </button>
      </div>

      {/* DOCUMENT GRID */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'10px'}}>
        {docs.map(doc => (
            <div key={doc.id} style={{background:'white', padding:'8px', borderRadius:'6px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    {doc.file_url.toLowerCase().endsWith('.pdf') 
                        ? <div style={{height:'60px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'30px', background:'#f1f5f9', borderRadius:'4px'}}>📄</div>
                        : <img src={doc.file_url} alt="doc" style={{width:'100%', height:'80px', objectFit:'cover', borderRadius:'4px'}} />
                    }
                </a>
                <div style={{fontSize:'11px', fontWeight:'bold', marginTop:'5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{doc.doc_type}</div>
                <div style={{fontSize:'10px', color:'#999'}}>{new Date(doc.created_at).toLocaleDateString()}</div>
                <button onClick={() => handleDelete(doc.id)} style={{marginTop:'5px', background:'none', border:'none', color:'red', cursor:'pointer', fontSize:'10px'}}>🗑 Remove</button>
            </div>
        ))}
        {docs.length === 0 && <div style={{fontSize:'12px', color:'#999', gridColumn:'span 3'}}>No documents uploaded yet.</div>}
      </div>
    </div>
  )
}