import { Link, useLocation } from 'react-router-dom'

// --- STYLES ---
const sidebarStyle = {
  width: '260px',
  height: '100vh',
  background: '#0f172a', // Dark Navy
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  boxSizing: 'border-box',
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 1000
}

const brandStyle = {
  marginBottom: '30px',
  paddingBottom: '20px',
  borderBottom: '1px solid #1e293b'
}

const sectionLabelStyle = {
  color: '#64748b',
  fontWeight: 'bold',
  fontSize: '11px',
  marginTop: '25px', // More space before sections
  marginBottom: '10px',
  paddingLeft: '10px',
  letterSpacing: '1px'
}

const linkStyle = {
  textDecoration: 'none',
  color: '#cbd5e1', // Light grey
  padding: '8px 15px',
  borderRadius: '6px',
  fontSize: '14px',
  display: 'block',
  marginBottom: '4px',
  transition: 'background 0.2s',
  cursor: 'pointer'
}

const activeLinkStyle = {
  ...linkStyle,
  background: '#3b82f6', // Bright Blue
  color: 'white',
  fontWeight: '600'
}

const linkStyleDisabled = {
  ...linkStyle,
  color: '#475569',
  cursor: 'not-allowed'
}

const footerStyle = {
  marginTop: 'auto',
  paddingTop: '20px',
  borderTop: '1px solid #1e293b'
}

// --- COMPONENT ---
export default function Sidebar() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <div style={sidebarStyle}>
      <div style={brandStyle}>
        <h2 style={{margin:0, fontSize:'20px'}}>📦 OFFICE PORTAL</h2>
        <small style={{color:'#94a3b8', fontSize:'10px', letterSpacing:'1px'}}>V 1.0</small>
      </div>

      <nav style={{display:'flex', flexDirection:'column', overflowY:'auto'}}>
        
        {/* DASHBOARD */}
        <Link to="/" style={isActive('/') ? activeLinkStyle : linkStyle}>
          📊 Dashboard
        </Link>

        {/* SECTION: GENERAL MASTERS */}
        <div style={sectionLabelStyle}>GENERAL MASTERS</div>
        
        <Link to="/customers" style={isActive('/customers') ? activeLinkStyle : linkStyle}>
          👥 Customer Directory
        </Link>
        <Link to="/users" style={isActive('/users') ? activeLinkStyle : linkStyle}>
          🔐 User Management
        </Link>
        <Link to="/commodities" style={isActive('/commodities') ? activeLinkStyle : linkStyle}>
          📦 Commodities
        </Link>

        {/* SECTION: LOGISTICS */}
        <div style={sectionLabelStyle}>LOGISTICS</div>
        
        <Link to="/logistics-parties" style={isActive('/logistics-parties') ? activeLinkStyle : linkStyle}>
          🚢 Logistics Directory
        </Link>

        {/* SECTION: FLEET & ASSETS */}
        <div style={sectionLabelStyle}>FLEET & ASSETS</div>

        <Link to="/trucks" style={isActive('/trucks') ? activeLinkStyle : linkStyle}>
          🚛 Trucks
        </Link>
        <Link to="/equipment" style={isActive('/equipment') ? activeLinkStyle : linkStyle}>
          🚜 Equipment
        </Link>
        <Link to="/agents" style={isActive('/agents') ? activeLinkStyle : linkStyle}>
          👤 Agents / Drivers
        </Link>
        
        <Link to="/drivers" style={isActive('/drivers') ? activeLinkStyle : linkStyle}>
        
  🧢 Drivers
  
</Link>
<Link to="/settings" className="nav-item">
  ⚙️ Settings
</Link>
        {/* SECTION: COMMERCIAL (Coming Soon) */}
        <div style={sectionLabelStyle}>COMMERCIAL</div>
        
        <div style={linkStyleDisabled}>📄 Proposals (Soon)</div>
        <div style={linkStyleDisabled}>💰 Invoices (Soon)</div>

      </nav>

      <div style={footerStyle}>
        <div style={{fontWeight:'bold'}}>Logged In User</div>
        <div style={{fontSize:'11px', color:'#94a3b8'}}>System Admin</div>
      </div>
    </div>
  )
}