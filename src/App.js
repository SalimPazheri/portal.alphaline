import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SuperAdminSettings from './pages/SuperAdminSettings';
import Equipments from './pages/Equipments';
import UserManagement from './pages/UserManagement'; // Import the new page
import Login from './pages/Login';
import { useUser } from './context/UserContext';
import VerificationSuccess from './pages/VerificationSuccess';

function App() {
  const user = useUser();

  // 1. General Protection: Checks if user has a role
  const ProtectedRoute = ({ children }) => {
    return user.role ? children : <Navigate to="/" />;
  };

  // 2. Admin Protection: Only allows Super Admin (Salim Pazheri)
  const AdminRoute = ({ children }) => {
    return user.role === 'Super Admin' ? children : <Navigate to="/dashboard" />;
  };

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <main style={{ 
                flex: 1, 
                marginLeft: '260px', 
                minHeight: '100vh',
                background: '#f8fafc' 
              }}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/super-settings" element={<SuperAdminSettings />} />
                  <Route path="/equipments" element={<Equipments />} />
            
<Route path="/verified" element={<VerificationSuccess />} />    
                  {/* 3. EXCLUSIVE ACCESS: Only Super Admin can see this */}
                  <Route 
                    path="/user-management" 
                    element={
                      <AdminRoute>
                        <UserManagement />
                      </AdminRoute>
                    } 
                  />
                  
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;