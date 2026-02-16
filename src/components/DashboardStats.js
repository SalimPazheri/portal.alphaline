// File: src/components/DashboardStats.js
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function DashboardStats() {
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    approved: 0,
    rejected: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // Fetch all proposals to count statuses
    const { data } = await supabase.from('proposals').select('status')
    if (data) {
      setStats({
        total: data.length,
        draft: data.filter(p => p.status === 'Draft').length,
        approved: data.filter(p => p.status === 'Approved').length,
        rejected: data.filter(p => p.status === 'Rejected').length
      })
    }
  }

  // A reusable sub-component for the boxes
  const StatBox = ({ label, count, icon: Icon, color, bg }) => (
    <div style={{ flex: 1, minWidth: '200px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '5px' }}>{count}</div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{label}</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
      <StatBox label="Total Proposals" count={stats.total} icon={FileText} color="#3b82f6" bg="#eff6ff" />
      <StatBox label="Drafts Pending" count={stats.draft} icon={Clock} color="#f59e0b" bg="#fffbeb" />
      <StatBox label="Approved" count={stats.approved} icon={CheckCircle} color="#10b981" bg="#dcfce7" />
      <StatBox label="Rejected" count={stats.rejected} icon={XCircle} color="#ef4444" bg="#fee2e2" />
    </div>
  )
}