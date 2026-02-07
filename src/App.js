import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'; // <--- Essential for Sidebar/Layout styling

// Context for Popups
import { SystemMessageProvider } from './context/SystemMessageContext';

// Components
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Trucks from './pages/Trucks';
import Equipment from './pages/Equipment';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Users from './pages/Users';
import LogisticsParties from './pages/LogisticsParties';
import Drivers from './pages/Drivers';
import Commodities from './pages/Commodities'
import Agents from './pages/Agents';

function App() {
  return (
    // 1. Wrap the entire app in the Provider so 'showAlert' works everywhere
    <SystemMessageProvider>
      <Router>
        <div className="app-layout">
          
          {/* 2. Sidebar fixed on the left */}
          <Sidebar />
          
          {/* 3. Main Content Area */}
          <div className="content">
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Modules */}
              <Route path="/trucks" element={<Trucks />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/drivers" element={<Drivers />}/>
              {/* Logistics Directory Route */}
              <Route path="/logistics-parties" element={<LogisticsParties />} />
              {/* Admin */}
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/commodities" element={<Commodities />} />
              <Route path="/Agents" element={<Agents />} />
              {/* Fallback for unknown URLs */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </div>
          
        </div>
      </Router>
    </SystemMessageProvider>
  );
}

export default App;