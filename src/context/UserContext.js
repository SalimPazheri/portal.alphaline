import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    id: null,
    full_name: '',
    role: '',
    branch_id: null,
    branch_name: '',
    country: '',
    currency: '',
    loading: true
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      try {
        // ✅ Simplified query to stop the 500 Error
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            full_name, 
            role, 
            branch_id,
            branch:branch_id ( 
              name, 
              currency_code 
            )
          `)
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle to prevent crashing if profile is missing

        if (error) throw error;

        if (data) {
          setUser({
            id: session.user.id,
            full_name: data.full_name || 'Staff',
            role: data.role || 'Staff',
            branch_id: data.branch_id,
            branch_name: data.branch?.name || 'Unknown Branch',
            country: '', // Temporary blank until we fix the Countries table
            currency: data.branch?.currency_code || 'BHD',
            loading: false
          });
        } else {
          setUser(prev => ({ ...prev, loading: false })); 
        }
      } catch (err) {
        console.error("Profile Fetch Error:", err.message);
        setUser(prev => ({ ...prev, loading: false }));
      }
    } else {
      setUser(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}
const { data } = await supabase
  .from('global_settings')
  .select('setting_value')
  .eq('setting_key', 'default_currency')
  .single();

const currency = data?.setting_value || 'AED';
export const useUser = () => useContext(UserContext)