import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import SystemMessage from '../components/SystemMessage'

const SystemMessageContext = createContext()

export function useSystemMessage() {
  return useContext(SystemMessageContext)
}

export function SystemMessageProvider({ children }) {
  const [msgState, setMsgState] = useState({ 
    isOpen: false, 
    message: '', 
    type: 'alert', 
    onConfirm: null 
  })
  
  const [appName, setAppName] = useState('Move+') // Default

  // 1. Fetch App Name GLOBALLY when app starts
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('system_settings').select('app_name').eq('id', 1).single()
      if (data && data.app_name) setAppName(data.app_name)
    }
    fetchSettings()
  }, [])

  // 2. Helper functions exposed to all pages
  const showAlert = (message) => {
    setMsgState({ isOpen: true, message, type: 'alert', onConfirm: null })
  }

  const showConfirm = (message, actionCallback) => {
    setMsgState({ 
      isOpen: true, 
      message, 
      type: 'confirm', 
      onConfirm: async () => {
          await actionCallback() // Run the delete/save action
          setMsgState({ ...msgState, isOpen: false }) // Close after
      }
    })
  }

  const closeMessage = () => {
    setMsgState({ ...msgState, isOpen: false })
  }

  return (
    <SystemMessageContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* THE ONE GLOBAL POPUP COMPONENT */}
      {msgState.isOpen && (
        <SystemMessage 
          title={appName}
          message={msgState.message}
          type={msgState.type}
          onClose={closeMessage}
          onConfirm={msgState.onConfirm}
        />
      )}
    </SystemMessageContext.Provider>
  )
}