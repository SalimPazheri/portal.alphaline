import React from 'react';
import { MailCheck, Clock } from 'lucide-react';

export default function VerificationSuccess() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconCircle}>
          <MailCheck size={48} color="#10b981" />
        </div>
        <h1 style={{ color: '#1e293b', marginBottom: '10px' }}>Email Verified!</h1>
        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6' }}>
          Thank you. Your email verification is now complete. 
        </p>
        <div style={infoBox}>
          <Clock size={20} color="#1e3a8a" />
          <span style={{ fontWeight: 'bold' }}>Next Step: Admin Approval</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '20px' }}>
          Your request has been sent to <strong>Salim Pazheri</strong>. 
          You will be granted access to the portal once your branch assignment is completed.
        </p>
        <button 
          onClick={() => window.location.href = 'https://www.portal.alphaemirates.com'}
          style={buttonStyle}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

// Styles
const containerStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' };
const cardStyle = { background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '450px' };
const iconCircle = { background: '#ecfdf5', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' };
const infoBox = { background: '#eff6ff', padding: '15px', borderRadius: '8px', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px' };
const buttonStyle = { marginTop: '30px', padding: '12px 24px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };