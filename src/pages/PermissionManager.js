import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Save } from 'lucide-react';

export default function PermissionManager() {
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState('Staff');

  useEffect(() => {
    fetchData();
  }, [selectedRole]);

  const fetchData = async () => {
    const { data: mods } = await supabase.from('sys_modules').select('*').order('sort_order');
    const { data: perms } = await supabase.from('sys_permissions').select('*').eq('role_name', selectedRole);
    setModules(mods);
    setPermissions(perms || []);
  };

  const togglePermission = async (moduleId, field, currentValue) => {
    const existing = permissions.find(p => p.module_id === moduleId);
    
    const updateData = {
      role_name: selectedRole,
      module_id: moduleId,
      [field]: !currentValue
    };

    const { error } = await supabase
      .from('sys_permissions')
      .upsert(existing ? { ...existing, ...updateData } : updateData);

    if (!error) fetchData();
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>🛡️ Role Permissions Manager</h2>
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={selectStyle}>
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Staff">Staff</option>
        </select>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={thStyle}>Module Name</th>
            <th style={thStyle}>View</th>
            <th style={thStyle}>Add</th>
            <th style={thStyle}>Edit</th>
            <th style={thStyle}>Delete</th>
            <th style={thStyle}>Print</th>
          </tr>
        </thead>
        <tbody>
          {modules.map(mod => {
            const p = permissions.find(perm => perm.module_id === mod.id) || {};
            return (
              <tr key={mod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}><strong>{mod.module_name}</strong></td>
                {['can_view', 'can_add', 'can_edit', 'can_delete', 'can_print'].map(action => (
                  <td key={action} style={tdStyle}>
                    <input 
                      type="checkbox" 
                      checked={p[action] || false} 
                      onChange={() => togglePermission(mod.id, action, p[action])}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thStyle = { padding: '15px', textAlign: 'left', fontSize: '14px', color: '#64748b' };
const tdStyle = { padding: '15px', fontSize: '14px' };
const selectStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' };