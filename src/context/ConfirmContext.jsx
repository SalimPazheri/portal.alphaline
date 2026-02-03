import React, { createContext, useContext, useState, useEffect } from 'react';

// FIX: Go up (..), into components, then find the file
import SystemConfirmModel from '../components/SystemConfirmModel.jsx'; 

// Check: If supabaseClient is in a 'lib' folder, keep this.
// If you get an error, change it to: import { supabase } from '../supabaseClient';
import { supabase } from '../supabaseClient'; 

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    message: '', 
    title: 'System', 
    onConfirm: null 
  });

  useEffect(() => {
    const fetchAppName = async () => {
      // Safety check: if supabase isn't loaded yet
      if (!supabase) return;

      const { data } = await supabase
        .from('global_settings')
        .select('setting_value')
        .eq('setting_key', 'app_name')
        .single();
      
      if (data) {
        setModalConfig(prev => ({ ...prev, title: data.setting_value }));
      }
    };
    fetchAppName();
  }, []);

  const confirm = (message, onConfirmAction) => {
    setModalConfig(prev => ({
      ...prev,
      isOpen: true,
      message,
      onConfirm: () => {
        if (onConfirmAction) onConfirmAction();
        close();
      }
    }));
  };

  const close = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      
      <SystemConfirmModel
        isOpen={modalConfig.isOpen}
        onClose={close}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </ConfirmContext.Provider>
  );
};