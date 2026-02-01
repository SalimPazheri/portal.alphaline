import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Drivers from './pages/Drivers'

// Import Global Styles
import './index.css'

// Import Layout Components
import Sidebar from './components/Sidebar'

// Import All Application Pages
import Customers from './pages/Customers'
import Users from './pages/Users'
import LogisticsParties from './pages/LogisticsParties'
import Trucks from './pages/Trucks'
import Commodities from './pages/Commodities'
import Equipment from './pages/Equipment'
import Agents from './pages/Agents'

// --- DASHBOARD COMPONENT (Placeholder) ---
// We will build a real "Analytics Dashboard" here later.
const Dashboard = () => (
  <div className="page-container">
    <h2 style={{margin:0}}>📊 Executive Dashboard</h2>
    <p style={{color:'#64748b', fontSize:'14px'}}>Welcome to your ERP System.</p>
    
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px', marginTop:'20px'}}>
      <div style={cardStyle}>
        <h3 style={cardLabel}>Total Customers</h3>
        <p style={cardValue}>1,240</p>
      </div>
      <div style={cardStyle}>
        <h3 style={cardLabel}>Active Trucks</h3>
        <p style={cardValue}>18</p>
      </div>
      <div style={cardStyle}>
        <h3 style={cardLabel}>Pending Invoices</h3>
        <p style={cardValue}>AED 45k</p>
      </div>
      <div style={cardStyle}>
        <h3 style={cardLabel}>Open Jobs</h3>
        <p style={cardValue}>12</p>
      </div>
    </div>
  </div>
)

// Simple Styles for the Dashboard Cards
const cardStyle = {
  background:'white', padding:'20px', borderRadius:'10px', border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
}
const cardLabel = { margin:0, color:'#64748b', fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.5px' }
const cardValue = { fontSize:'28px', fontWeight:'bold', margin:'10px 0 0 0', color:'#0f172a' }


// --- MAIN APP COMPONENT ---
function App() {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        
        {/* 1. LEFT SIDEBAR (Fixed Navigation) */}
        <Sidebar />

        {/* 2. RIGHT CONTENT AREA (Dynamic Pages) */}
        <div style={{ 
          marginLeft: '260px', // Matches Sidebar Width
          width: 'calc(100% - 260px)', 
          minHeight: '100vh',
          background: '#f1f5f9' // Light Grey ERP Background
        }}>
          
          <Routes>
            {/* Dashboard (Home) */}
            <Route path="/" element={<Dashboard />} />
            
            {/* Master Data Modules */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/users" element={<Users />} />
            <Route path="/logistics-parties" element={<LogisticsParties />} />
            <Route path="/commodities" element={<Commodities />} />

            {/* Fleet & Assets Modules */}
            <Route path="/trucks" element={<Trucks />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/drivers" element={<Drivers />} />
          </Routes>

        </div>
      </div>
    </Router>
  )
}

export default App