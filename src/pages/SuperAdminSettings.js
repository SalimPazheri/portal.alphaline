import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Image as ImageIcon, MapPin } from 'lucide-react';

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [settings, setSettings] = useState({ 
    company_name: 'Alpha Line Cargo L.L.C.', 
    financial_year_start: '', 
    financial_year_end: '', 
    company_heading: '' 
  });
  const [branch, setBranch] = useState({ 
    name: '', 
    country_id: '', 
    currency_code: 'AED', 
    address: '' 
  });

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase.from('master_countries').select('id, name, currency_code').order('name');
      if (data) setCountries(data);
    };
    fetchCountries();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('global_settings').upsert({ id: 1, ...settings });
    if (error) alert(error.message); else alert("Global Settings Saved!");
    setLoading(false);
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!branch.name || !branch.country_id) return alert("Please fill in Branch Name and Country.");
    setLoading(true);
    const { error } = await supabase.from('master_branches').insert([{ 
      name: branch.name, 
      country_id: branch.country_id, 
      currency_code: branch.currency_code, 
      address_details: branch.address 
    }]);
    if (error) alert(error.message); else { 
        alert("Branch Created Successfully!"); 
        setBranch({ name: '', country_id: '', currency_code: 'AED', address: '' }); 
    }
    setLoading(false);
  };

  const sectionStyle = { background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '24px' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '8px', fontSize: '14px' };
  const labelStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Shield size={32} color="#2563eb" />
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>Master Control Panel</h1>
      </div>

      {/* Global Branding & Finance */}
      <div style={sectionStyle}>
        <h3 style={labelStyle}><ImageIcon size={20} /> Company Branding & Financials</h3>
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input 
            placeholder="Company Heading (e.g., Alpha Line Cargo)" 
            style={inputStyle} 
            value={settings.company_heading} 
            onChange={e => setSettings({...settings, company_heading: e.target.value})} 
          />
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>Financial Year Start</label>
              <input type="date" style={inputStyle} value={settings.financial_year_start} onChange={e => setSettings({...settings, financial_year_start: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}>Financial Year End</label>
              <input type="date" style={inputStyle} value={settings.financial_year_end} onChange={e => setSettings({...settings, financial_year_end: e.target.value})} />
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
            Save Global Configuration
          </button>
        </form>
      </div>

      {/* New Branch Creation */}
      <div style={sectionStyle}>
        <h3 style={labelStyle}><MapPin size={20} /> Add New Operational Branch</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            placeholder="Branch Name (e.g., Bahrain Office)" 
            style={inputStyle} 
            value={branch.name} 
            onChange={e => setBranch({...branch, name: e.target.value})} 
          />
          <div style={{ display: 'flex', gap: '16px' }}>
            <select 
              style={{ ...inputStyle, flex: 2 }} 
              value={branch.country_id} 
              onChange={e => {
                const selected = countries.find(c => c.id === e.target.value);
                setBranch({...branch, country_id: e.target.value, currency_code: selected?.currency_code || 'AED'});
              }}
            >
              <option value="">-- Select Country --</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Currency" style={{ ...inputStyle, flex: 1, background: '#f8fafc' }} value={branch.currency_code} readOnly />
          </div>
          <button 
            onClick={handleAddBranch} 
            disabled={loading} 
            style={{ background: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            Create Branch
          </button>
        </div>
      </div>
    </div>
  );
}