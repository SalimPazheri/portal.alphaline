import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSystemMessage } from '../context/SystemMessageContext'

export default function Users() {
  const { showAlert } = useSystemMessage()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Query the 'profiles' table
      const { data, error } = await supabase.from('profiles').select('*')
      
      // FIX 1: Use the 'error' variable so the warning goes away
      if (error) {
        console.error("Error fetching users:", error)
        showAlert(error.message)
      } else if (data) {
        setUsers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // FIX 2: Use the 'loading' variable to show a message
  if (loading) {
      return <div className="page-container">Loading User List...</div>
  }

  return (
    <div className="page-container">
      <div className="header-row">
        <h2 style={{margin:0}}>👥 User Management</h2>
        <button className="btn btn-primary" onClick={() => showAlert("Invite feature coming soon!")}>
            + Invite User
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email / Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
                <tr>
                    <td colSpan="4" style={{textAlign:'center', padding:'30px', color:'#999'}}>
                        No profiles found. (Table is empty)
                    </td>
                </tr>
            ) : (
                users.map(user => (
                    <tr key={user.id}>
                        <td>{user.email}</td>
                        <td><span className="status-badge" style={{background:'#e0f2fe', color:'#0284c7'}}>{user.role || 'User'}</span></td>
                        <td><span className="notification-dot green">Active</span></td>
                        <td>
                            <span className="icon-action">✏️</span>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}