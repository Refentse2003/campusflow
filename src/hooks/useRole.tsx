import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export type AppRole = 'student' | 'tutor' | 'admin'

export const useRole = () => {
  const { user } = useAuth()
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRoles([])
      setLoading(false)
      return
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)

        if (error) throw error

        setRoles(data?.map(r => r.role as AppRole) || [])
      } catch (error) {
        console.error('Error fetching roles:', error)
        setRoles([])
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [user])

  const hasRole = (role: AppRole) => roles.includes(role)
  const isTutor = hasRole('tutor')
  const isStudent = hasRole('student') || (!hasRole('tutor') && !hasRole('admin'))
  const isAdmin = hasRole('admin')

  return {
    roles,
    loading,
    hasRole,
    isTutor,
    isStudent,
    isAdmin,
  }
}
