import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function DashboardStats() {
  const [stats, setStats] = useState({
    total: 0,
    statusData: [],
    categoryData: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch only status and category to save bandwidth
      const { data, error } = await supabase
        .from('proposals')
        .select('status, category')
      
      if (error) throw error

      // 1. Calculate Status Counts (Pending vs Confirmed)
      const statusCounts = { 'Proposed': 0, 'Approved': 0, 'Rejected': 0, 'Draft': 0 }
      data.forEach(p => {
         const s = p.status || 'Draft'
         statusCounts[s] = (statusCounts[s] || 0) + 1
      })
      
      const statusData = [
          { name: 'Pending', value: statusCounts['Proposed'] || 0, color: '#f59e0b' }, // Amber
          { name: 'Confirmed', value: statusCounts['Approved'] || 0, color: '#10b981' }, // Emerald
          { name: 'Rejected', value: statusCounts['Rejected'] || 0, color: '#ef4444' }   // Red
      ]

      // 2. Calculate Category Counts (Import vs Export)
      const catCounts = {}
      data.forEach(p => {
          const c = p.category || 'Uncategorized'
          catCounts[c] = (catCounts[c] || 0) + 1
      })

      const categoryData = Object.keys(catCounts).map((key, index) => ({
          name: key,
          value: catCounts[key],
          fill: COLORS[index % COLORS.length]
      }))

      setStats({
          total: data.length,
          statusData,
          categoryData
      })
    } catch (error) {
        console.error("Error loading stats:", error)
    } finally {
        setLoading(false)
    }
  }

  if (loading) return <div style={{padding:'20px', textAlign:'center', color:'#64748b'}}>Loading Analytics...</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* CARD 1: NUMBERS OVERVIEW */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border:'1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#64748b', fontSize:'14px', textTransform:'uppercase' }}>Proposal Pipeline</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop:'30px' }}>
                <div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb' }}>{stats.total}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight:'bold', textTransform:'uppercase' }}>Total</div>
                </div>
                <div style={{borderLeft:'1px solid #e2e8f0', paddingLeft:'20px'}}>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>{stats.statusData.find(x=>x.name==='Confirmed')?.value || 0}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight:'bold', textTransform:'uppercase' }}>Won</div>
                </div>
                <div style={{borderLeft:'1px solid #e2e8f0', paddingLeft:'20px'}}>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b' }}>{stats.statusData.find(x=>x.name==='Pending')?.value || 0}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight:'bold', textTransform:'uppercase' }}>Pending</div>
                </div>
            </div>
        </div>

        {/* CARD 2: STATUS PIE */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border:'1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize:'14px', textTransform:'uppercase' }}>Win / Loss Ratio</h4>
            <div style={{ height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* CARD 3: CATEGORY BAR */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border:'1px solid #e2e8f0', gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize:'14px', textTransform:'uppercase' }}>Business Volume by Category</h4>
            <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                            {stats.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  )
}