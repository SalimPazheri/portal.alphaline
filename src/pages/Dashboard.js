import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { 
  Truck, Briefcase, UserCheck, Anchor, Package, 
  TrendingUp, Activity, FileText 
} from 'lucide-react'

// ✅ IMPORT THE NEW COMPONENT
import DashboardStats from '../components/DashboardStats'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  
  const [stats, setStats] = useState({
    customers: 0,
    trucks: 0,
    drivers: 0,
    shippers: 0,
    consignees: 0,
    commodities: 0,
    proposals: 0 
  })

  const [customerData, setCustomerData] = useState([]) 
  const [partyData, setPartyData] = useState([])       

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      
      const [
        { count: custCount, data: custData, error: custError },
        { count: truckCount, error: truckError },
        { count: driverCount, error: driverError },
        { data: partyRows, error: partyError },
        { count: commCount, error: commError },
        { count: propCount, error: propError } 
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact' }),
        supabase.from('fleet_trucks').select('*', { count: 'exact', head: true }), 
        supabase.from('fleet_drivers').select('*', { count: 'exact', head: true }), // Fixed: fleet_drivers  
        supabase.from('logistics_parties').select('party_type'),
        supabase.from('master_commodities').select('*', { count: 'exact', head: true }),
        supabase.from('proposals').select('*', { count: 'exact', head: true }) 
      ])

      if (custError) throw new Error(`Customers Error: ${custError.message}`)
      if (truckError) throw new Error(`Trucks Error: ${truckError.message}`)

      // Process Pie & Bar Data...
      const sectorMap = {}
      if (custData) custData.forEach(c => { const sect = c.sector || 'General'; sectorMap[sect] = (sectorMap[sect] || 0) + 1 })
      const pieData = Object.keys(sectorMap).map(key => ({ name: key, value: sectorMap[key] }))

      const partyMap = { 'Shipper': 0, 'Consignee': 0, 'Notify Party': 0 }
      if (partyRows) partyRows.forEach(p => { if (partyMap[p.party_type] !== undefined) partyMap[p.party_type]++ })
      const barData = Object.keys(partyMap).map(key => ({ name: key, count: partyMap[key] }))

      setStats({
        customers: custCount || 0,
        trucks: truckCount || 0,
        drivers: driverCount || 0,
        shippers: partyMap['Shipper'],
        consignees: partyMap['Consignee'],
        commodities: commCount || 0,
        proposals: propCount || 0 
      })
      setCustomerData(pieData)
      setPartyData(barData)

    } catch (error) {
      console.error("Dashboard Error:", error)
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- STAT CARD COMPONENT ---
  const StatCard = ({ title, count, icon: Icon, color, path, subtext }) => (
    <div 
      onClick={() => navigate(path)}
      style={{
        background: 'white', padding: '20px', borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0',
        cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '20px'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        width: '50px', height: '50px', borderRadius: '10px', background: `${color}20`, 
        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={28} />
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>
          {loading ? '...' : count}
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '5px' }}>
          {title}
        </div>
        {subtext && <div style={{fontSize:'10px', color:'#94a3b8', marginTop:'2px'}}>{subtext}</div>}
      </div>
    </div>
  )

  return (
    <div className="page-container" style={{maxWidth:'100%'}}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>
            📊 Mission Control
          </h2>
          <p style={{ margin: '5px 0 0', color: '#64748b' }}>
            Welcome back, {localStorage.getItem('user_name') || 'Admin'}. Here is your {localStorage.getItem('active_country')} overview.
          </p>
        </div>
        <div style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
           🟢 System Online
        </div>
      </div>

      {errorMsg && <div style={{padding:'15px', background:'#fee2e2', color:'#b91c1c', borderRadius:'8px', marginBottom:'20px'}}>⚠️ {errorMsg}</div>}

      {/* ✅ NEW PROPOSAL ANALYTICS SECTION */}
      <DashboardStats />

      {/* STATS GRID */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', marginBottom: '30px' 
      }}>
        
        {/* Active Proposals Card */}
        <StatCard 
          title="Active Proposals" 
          count={stats.proposals} 
          icon={FileText} 
          color="#8b5cf6" 
          path="/proposals" 
          subtext="Quotes & Drafts" 
        />

        <StatCard title="Total Customers" count={stats.customers} icon={Briefcase} color="#3b82f6" path="/customers" subtext="Active Accounts" />
        <StatCard title="Fleet Strength" count={stats.trucks} icon={Truck} color="#10b981" path="/trucks" subtext="Trucks Available" />
        <StatCard title="Drivers" count={stats.drivers} icon={UserCheck} color="#f59e0b" path="/drivers" subtext="Registered Staff" />
        <StatCard title="Global Shippers" count={stats.shippers} icon={Anchor} color="#6366f1" path="/logistics-parties" subtext="Logistics Partners" />
        <StatCard title="Commodities" count={stats.commodities} icon={Package} color="#ec4899" path="/commodities" subtext="Product Types" />
      </div>

      {/* EXISTING CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#0f172a', display:'flex', alignItems:'center', gap:'10px' }}>
            <Activity size={18} /> Customer Sectors
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? <div>Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={customerData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {customerData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#0f172a', display:'flex', alignItems:'center', gap:'10px' }}>
            <TrendingUp size={18} /> Directory Distribution
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? <div>Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partyData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}