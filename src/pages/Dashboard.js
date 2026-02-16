import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import CompanyLogo from '../assets/ALPHA_1.png';
import { 
  FileText, Clock, CheckCircle, XCircle, 
  Truck, Users, Activity, Timer 
} from 'lucide-react';

export default function Dashboard() {
  const user = useUser();
  const [stats, setStats] = useState({
    proposals: { total: 0, drafts: 0, approved: 0, rejected: 0 },
    fleet: { trucks: 0, drivers: 0, active: 0 }
  });
  const [sessionTime, setSessionTime] = useState(0);

  // 1. Session Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const fetchLiveStats = async () => {
    // Fetch live data from your Supabase tables
    const { data: propData } = await supabase.from('proposals').select('status');
    const { data: fleetData } = await supabase.from('master_equipments').select('status');
    const { data: drivers } = await supabase.from('user_profiles').select('id').eq('role', 'Driver');

    if (propData) {
      setStats(prev => ({
        ...prev,
        proposals: {
          total: propData.length,
          drafts: propData.filter(p => p.status === 'Draft').length,
          approved: propData.filter(p => p.status === 'Approved').length,
          rejected: propData.filter(p => p.status === 'Rejected').length,
        }
      }));
    }
    if (fleetData) {
      setStats(prev => ({
        ...prev,
        fleet: {
          trucks: fleetData.length,
          drivers: drivers?.length || 0,
          active: fleetData.filter(f => f.status === 'Available').length
        }
      }));
    }
  };

  return (
    <div style={{ padding: '0 0 40px 0', minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* 2. TOP HEADER BAR - Zero Spacing Extreme Left Alignment */}
      <div style={{ 
        background: '#f0fdf4', 
        padding: '0 30px 0 0', 
        height: '60px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '2px solid #bbf7d0', 
        position: 'sticky', 
        top: 0, 
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Logo at extreme left with 80px size */}
          <img 
            src={CompanyLogo} 
            alt="Alpha Line Logo" 
            style={{ 
              width: '80px', 
              height: '80px', 
              objectFit: 'contain',
              marginTop: '5px' 
            }} 
          />

          {/* Title placed immediately next to logo with no margin */}
          <div style={{ marginLeft: '0px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#166534', lineHeight: '1.2' }}>
              Alpha Line Cargo L.L.C.
            </div>
            <div style={{ fontSize: '11px', color: '#15803d' }}>
              Moving Excellence Since 2026
            </div>
          </div>
        </div>

        {/* User Info & Timer on the Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#15803d', textTransform: 'uppercase' }}>Logged in as</div>
            <div style={{ fontWeight: 'bold', color: '#166534' }}>{user.full_name || 'Salim Pazheri'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', padding: '6px 12px', borderRadius: '8px', marginRight: '20px' }}>
            <Timer size={16} color="#16a34a" />
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#166534' }}>{formatTime(sessionTime)}</span>
          </div>
        </div>
      </div>

      {/* DASHBOARD CONTENT BADGES */}
      <div style={{ padding: '30px' }}>
        <h3 style={sectionTitleStyle}>Sales / Marketing (Proposals)</h3>
        <div style={badgeContainerStyle}>
          <StatCard icon={FileText} label="Total" value={stats.proposals.total} color="#3b82f6" />
          <StatCard icon={Clock} label="Draft" value={stats.proposals.drafts} color="#f59e0b" />
          <StatCard icon={CheckCircle} label="Approved" value={stats.proposals.approved} color="#10b981" />
          <StatCard icon={XCircle} label="Rejected" value={stats.proposals.rejected} color="#ef4444" />
        </div>

        <h3 style={sectionTitleStyle}>Operations & Fleet Overview</h3>
        <div style={badgeContainerStyle}>
          <StatCard icon={Truck} label="Total Trucks" value={stats.fleet.trucks} color="#6366f1" />
          <StatCard icon={Users} label="Total Drivers" value={stats.fleet.drivers} color="#06b6d4" />
          <StatCard icon={Activity} label="Active Fleet" value={stats.fleet.active} color="#8b5cf6" />
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: 'white', padding: '20px', borderRadius: '12px', flex: 1, minWidth: '200px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px',
    borderTop: `4px solid ${color}`
  }}>
    <div style={{ background: `${color}10`, padding: '10px', borderRadius: '10px' }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  </div>
);

const sectionTitleStyle = { fontSize: '14px', fontWeight: '800', color: '#475569', marginBottom: '20px', marginTop: '30px', textTransform: 'uppercase' };
const badgeContainerStyle = { display: 'flex', gap: '20px', flexWrap: 'wrap' };