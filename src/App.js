import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // ✅ Auth Client
import './App.css'; 
import CreateProposal from './pages/CreateProposal';

// Context for Popups
import { SystemMessageProvider } from './context/SystemMessageContext';
import Proposals from './pages/CreateProposal'


// Components
import Sidebar from './components/Sidebar';

// Pages - Auth
import Login from './pages/Login'; // ✅ New Login Page

// Pages - Modules
import Dashboard from './pages/Dashboard';
import Trucks from './pages/Trucks';
import Equipment from './pages/Equipment';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Users from './pages/Users'; // ✅ Your System Users Page
import LogisticsParties from './pages/LogisticsParties';
import Drivers from './pages/Drivers';
import Commodities from './pages/Commodities';
import Agents from './pages/Agents';

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Listen for Login/Logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // --- 1. LOADING SCREEN ---
  if (loading) {
    return (
      <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9', color:'#64748b'}}>
        Loading Portal...
      </div>
    )
  }

  return (
    <SystemMessageProvider>
      
      {/* --- 2. IF NOT LOGGED IN -> SHOW LOGIN PAGE --- */}
      {!session ? (
        <Router>
            <Routes>
                <Route path="*" element={<Login />} />
            </Routes>
        </Router>
      ) : (
        
        /* --- 3. IF LOGGED IN -> SHOW FULL APP --- */
        <Router>
          <div className="app-layout">
            
            {/* Sidebar fixed on the left */}
            <Sidebar />
            
            {/* Main Content Area */}
            <div className="content">
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Dashboard key={session.user.id} />} />
                
                {/* Modules */}
                <Route path="/trucks" element={<Trucks />} />
                <Route path="/equipment" element={<Equipment />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/drivers" element={<Drivers />}/>
                <Route path="/logistics-parties" element={<LogisticsParties />} />
                <Route path="/commodities" element={<Commodities />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/createproposal" element={<CreateProposal />} />

                {/* Admin */}
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* Fallback for unknown URLs */}
                <Route path="*" element={<Navigate to="/" />} />
                <Route path="/proposals" element={<Proposals />} />
            <Route path="/create-proposal" element={<CreateProposal />} />
              </Routes>
            </div>
            
          </div>
        </Router>
      )}
    </SystemMessageProvider>
  );
}

export default App;