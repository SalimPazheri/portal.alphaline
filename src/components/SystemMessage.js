import React from 'react'

/**
 * A reusable Custom Alert / Confirm Dialog
 * Replaces window.alert and window.confirm
 */
export default function SystemMessage({ title, message, type, onClose, onConfirm }) {
  if (!message) return null;

  return (
    <div className="modal-overlay" style={{zIndex: 9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="modal-content" style={{
          width: '400px', 
          textAlign: 'center', 
          padding: '25px', 
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        
        {/* Header with App Name */}
        <h3 style={{marginTop:0, color: '#2563eb', marginBottom:'10px'}}>
            {title || 'System Notification'}
        </h3>
        
        <hr style={{border:'0', borderTop:'1px solid #eee', margin:'10px 0 20px 0'}}/>

        {/* The Message */}
        <p style={{fontSize:'16px', color:'#333', lineHeight:'1.5', marginBottom:'25px'}}>
            {message}
        </p>

        {/* Buttons */}
        <div style={{display:'flex', justifyContent:'center', gap:'10px'}}>
            {type === 'confirm' ? (
                <>
                    <button onClick={onClose} className="btn btn-secondary" style={{minWidth:'100px'}}>Cancel</button>
                    <button onClick={onConfirm} className="btn btn-primary" style={{minWidth:'100px'}}>Confirm</button>
                </>
            ) : (
                <button onClick={onClose} className="btn btn-primary" style={{width:'100%'}}>OK</button>
            )}
        </div>

      </div>
    </div>
  )
}