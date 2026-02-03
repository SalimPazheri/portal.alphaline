import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 1. STYLES
import './index.css'; 

// 2. CONTEXT
import { ConfirmProvider } from './context/ConfirmContext';

// 3. COMPONENTS
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// 4. PAGES
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Customers from './pages/Customers';
import Trucks from './pages/Trucks';
import Drivers from './pages/Drivers';
import Equipment from './pages/Equipment';
import Agents from './pages/Agents';
import Commodities from './pages/Commodities';
import LogisticsParties from './pages/LogisticsParties';
import Settings from './pages/Settings';

function App() {
  return (
    <ConfirmProvider>
      <Router>
        <div className="flex h-screen bg-gray-100 overflow-hidden">
          
          {/* SIDEBAR (Fixed Left) */}
          <Sidebar />

          {/* MAIN CONTENT AREA */}
          {/* Added 'ml-64' to push content to the right of the sidebar */}
          <div className="flex-1 flex flex-col min-w-0" style={{ marginLeft: '260px' }}>
            
            {/* TOP BAR */}
            <TopBar />

            {/* SCROLLABLE PAGE CONTENT */}
            <main className="flex-1 overflow-y-auto p-6">
              <Routes>
                
                {/* DEFAULT REDIRECT */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* LOGIN */}
                <Route path="/login" element={<Login />} />

                {/* APP MODULES */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/trucks" element={<Trucks />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/equipment" element={<Equipment />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/commodities" element={<Commodities />} />
                <Route path="/logistics-parties" element={<LogisticsParties />} />
                <Route path="/settings" element={<Settings />} />

              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ConfirmProvider>
  );
}

export default App;