import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Container, 
  Users, 
  Settings, 
  Box, 
  Briefcase, 
  Map, 
  UserCircle 
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  // Helper to check if link is active
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="sidebar">
      {/* Logo Section */}
      <div className="logo-container">
        <h2 style={{display:'flex', alignItems:'center', gap:'10px'}}>
           <Container size={28} color="#2563eb" strokeWidth={2.5} /> 
           Move+
        </h2>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        <Link to="/" className={`nav-item ${isActive('/')}`}>
           <LayoutDashboard className="nav-icon" /> Dashboard
        </Link>
        
        <Link to="/trucks" className={`nav-item ${isActive('/trucks')}`}>
           <Truck className="nav-icon" /> Trucks
        </Link>
        
        <Link to="/equipment" className={`nav-item ${isActive('/equipment')}`}>
           <Container className="nav-icon" /> Equipment
        </Link>
        
        <Link to="/drivers" className={`nav-item ${isActive('/drivers')}`}>
           <UserCircle className="nav-icon" /> Drivers
        </Link>
        
        <Link to="/customers" className={`nav-item ${isActive('/customers')}`}>
           <Briefcase className="nav-icon" /> Customers
        </Link>

        <Link to="/agents" className={`nav-item ${isActive('/agents')}`}>
           <Users className="nav-icon" /> Agents
        </Link>

        <Link to="/commodities" className={`nav-item ${isActive('/commodities')}`}>
           <Box className="nav-icon" /> Commodities
        </Link>
        
        <Link to="/logistics-parties" className={`nav-item ${isActive('/logistics-parties')}`}>
           <Map className="nav-icon" /> Directory
        </Link>

        {/* Divider */}
        <div className="nav-divider">Admin</div>

        <Link to="/users" className={`nav-item ${isActive('/users')}`}>
           <Users className="nav-icon" /> System Users
        </Link>
        
        <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
           <Settings className="nav-icon" /> Settings
        </Link>
      </nav>
    </div>
  );
}