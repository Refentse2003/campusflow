import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Clock, Quote, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { AIChat } from '@/components/ai/AIChat'
import { Footer } from '@/components/layout/Footer'

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  totalBookings: number
}

const motivationalQuotes = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Learning never exhausts the mind. - Leonardo da Vinci",
]

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalBookings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dailyQuote] = useState(() => {
    const today = new Date().getDate()
    return motivationalQuotes[today % motivationalQuotes.length]
  })
  const { user } = useAuth()
  const { isTutor, loading: roleLoading } = useRole()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Redirect tutors to their dashboard
  useEffect(() => {
    if (!roleLoading && isTutor) {
      navigate('/tutor/dashboard', { replace: true })
    }
  }, [isTutor, roleLoading, navigate])

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      const [tasksResponse, bookingsResponse] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user?.id)
      ])

      if (tasksResponse.error) throw tasksResponse.error
      if (bookingsResponse.error) throw bookingsResponse.error

      const tasks = tasksResponse.data || []
      const now = new Date()
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(task => task.completed).length
      const pendingTasks = tasks.filter(task => !task.completed).length
      const overdueTasks = tasks.filter(task => 
        !task.completed && 
        task.due_date && 
        new Date(task.due_date) < now
      ).length
      const totalBookings = bookingsResponse.data.length

      setStats({
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalBookings,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.user_metadata?.full_name || 'Student'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your academic progress
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {completionRate}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                Tasks finished
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">
                Tasks remaining
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdueTasks}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>  
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tutorial Bookings</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                Sessions booked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Motivational Quote */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Quote className="h-5 w-5 text-primary" />
                Daily Inspiration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="text-lg italic text-muted-foreground leading-relaxed">
                "{dailyQuote}"
              </blockquote>
              <div className="mt-4 p-4 bg-gradient-primary rounded-lg">
                <p className="text-primary-foreground font-medium">
                  💡 Pro Tip: Break down large tasks into smaller, manageable chunks to improve productivity!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Chat Widget */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AIChat />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => window.location.href = '/tasks'}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Add New Task
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/study-materials'}>
                <Clock className="h-4 w-4 mr-2" />
                Browse Materials
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/tutors'}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Book Tutor Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}