import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Package, Users, Settings, 
  LogOut, Briefcase, UserCheck, BookOpen, ShieldAlert,
  Anchor, Activity, ShieldCheck, ChevronRight, ChevronDown, Search 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import CompanyLogo from '../assets/ALPHA_1.png';

// iconMap remains exactly as you had it
const iconMap = {
  LayoutDashboard, Truck, Package, Users, Settings, 
  Briefcase, UserCheck, BookOpen, Anchor, Activity, ShieldCheck, ChevronRight, Search
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const [dynamicMenu, setDynamicMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        // Robust check: don't clear menu if role is still loading
        if (!user || !user.role) return;
        
        const { data } = await supabase
          .from('sys_permissions')
          .select(`sys_modules!inner(*)`)
          .eq('role_name', user.role)
          .eq('can_view', true);
        
        if (data) {
          const sorted = data.map(d => d.sys_modules).sort((a,b) => a.sort_order - b.sort_order);
          setDynamicMenu(sorted);
        }
      } catch (err) {
        console.error("Menu fetch error:", err);
      } finally { setLoading(false); }
    };
    fetchMenu();
  }, [user?.role]); // Added optional chaining for safety

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const getLinkStyle = (isActive, isHeader = false) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 25px',
    cursor: 'pointer',
    background: isActive ? '#334155' : 'transparent',
    color: isHeader ? '#f8fafc' : (isActive ? '#3b82f6' : '#94a3b8'),
    fontSize: '14px',
    borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
    fontWeight: isHeader ? 'bold' : 'normal',
    transition: '0.2s'
  });

  return (
    <div style={{ width: '260px', height: '100vh', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0 }}>
      
      {/* BRANDING SECTION */}
      <div style={{ padding: '20px 25px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src={CompanyLogo} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#3b82f6', letterSpacing: '0.5px', lineHeight: '1' }}>Move+</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {user?.role === 'Super Admin' ? 'Global Ops' : 'Branch Ops'}
          </div>
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <nav style={{ flex: 1, paddingTop: '10px', overflowY: 'auto' }}>
        
        {/* --- ADDED: EXCLUSIVE TOOLS FOR SUPER ADMIN --- */}
        {user?.role === 'Super Admin' && (
          <>
            {/* User Management Link */}
            <div 
              onClick={() => navigate('/user-management')}
              style={getLinkStyle(location.pathname === '/user-management')}
            >
              <UserCheck size={18} />
              <span style={{ flex: 1 }}>User Management</span>
            </div>

            {/* Super Admin Settings (Super Control Panel) Link */}
            <div 
              onClick={() => navigate('/super-settings')}
              style={getLinkStyle(location.pathname === '/super-settings')}
            >
              <Settings size={18} />
              <span style={{ flex: 1 }}>Super Control Panel</span>
            </div>
            
            <div style={{ height: '1px', background: '#334155', margin: '10px 25px' }} />
          </>
        )}

        {loading ? (
          <div style={{ padding: '20px', color: '#64748b', fontSize: '12px' }}>Loading...</div>
        ) : (
          dynamicMenu.map((item, index) => {
            const isSub = item.module_name.startsWith('  -');
            const isHeader = item.route_path === null;
            const Icon = iconMap[item.icon_name] || ShieldAlert;
            const isActive = location.pathname === item.route_path;

            if (isSub) {
              let parentHeader = "";
              for (let i = index; i >= 0; i--) {
                if (dynamicMenu[i].route_path === null) {
                  parentHeader = dynamicMenu[i].module_name;
                  break;
                }
              }
              if (!expandedSections[parentHeader]) return null;
            }

            return (
              <div 
                key={item.id}
                onClick={() => {
                  if (isHeader) toggleSection(item.module_name);
                  else navigate(item.route_path);
                }}
                style={{
                  ...getLinkStyle(isActive, isHeader),
                  padding: isSub ? '8px 25px 8px 50px' : '12px 25px',
                  fontSize: isSub ? '13px' : '14px',
                  marginTop: isHeader ? '10px' : '0px',
                }}
              >
                {!isSub && <Icon size={18} />}
                {isSub && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                <span style={{ flex: 1 }}>{item.module_name.trim()}</span>
                {isHeader && (expandedSections[item.module_name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              </div>
            );
          })
        )}
      </nav>

      {/* FOOTER */}
      <div style={{ padding: '20px', background: '#0f172a', borderTop: '1px solid #334155' }}>
        <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '10px', fontWeight: 'bold' }}>
          {user?.full_name || 'Salim Pazheri'}
        </div>
        <button 
          onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} 
          style={{ width: '100%', padding: '10px', background: '#ef444415', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}