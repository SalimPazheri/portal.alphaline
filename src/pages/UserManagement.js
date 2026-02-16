import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle, UserCog, Smartphone, MailCheck } from 'lucide-react';

export default function UserManagement() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Branches for assignment
      const { data: branchData } = await supabase.from('master_branches').select('id, branch_name');
      setBranches(branchData || []);

      // 2. Fetch profiles and check their verification status in auth.users
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          auth_user:id ( email_confirmed_at )
        `)
        .eq('is_active', false);

      if (error) throw error;

      // 3. FILTER: Only show users who HAVE confirmed their email
      const verifiedOnly = profiles.filter(p => 
        p.auth_user && p.auth_user.email_confirmed_at !== null
      );

      setPendingUsers(verifiedOnly);
    } catch (err) {
      console.error("Error loading management data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, branchId) => {
    if (!branchId) return alert("Please assign a branch first");

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: true, branch_id: branchId })
      .eq('id', userId);

    if (error) alert(error.message);
    else {
      alert("Staff Member Activated Successfully!");
      fetchInitialData(); 
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
        <UserCog size={32} color="#1e3a8a" />
        <h2 style={{ margin: 0, color: '#1e293b' }}>Staff Approval Queue</h2>
      </div>

      {loading ? <p>Checking verified requests...</p> : (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={thStyle}>Full Name</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Branch Assignment</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                No new verified staff waiting for approval.
              </td></tr>
            ) : (
              pendingUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{user.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MailCheck size={12} /> Email Verified
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <Smartphone size={14} color="#94a3b8" /> {user.mobile_number || user.mobile}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <BranchSelector branches={branches} onSelect={(id) => user.selectedBranch = id} />
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleApprove(user.id, user.selectedBranch)} style={approveBtnStyle}>
                      Approve & Activate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Sub-component for branch selection
const BranchSelector = ({ branches, onSelect }) => (
  <select onChange={(e) => onSelect(e.target.value)} style={selectStyle}>
    <option value="">Select Branch...</option>
    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
  </select>
);

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const thStyle = { padding: '15px 20px', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' };
const tdStyle = { padding: '15px 20px' };
const selectStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '200px' };
const approveBtnStyle = { padding: '8px 16px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };