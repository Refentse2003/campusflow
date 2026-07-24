import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useNavigate } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'

interface TutorStats {
  tutor_name: string
  total_sessions: number
  completed_sessions: number
  total_students: number
  attendance_rate: number
}

interface StudentActivity {
  student_name: string
  total_bookings: number
  attended: number
  tasks_completed: number
  attendance_rate: number
}

export default function Reports() {
  const [tutorStats, setTutorStats] = useState<TutorStats[]>([])
  const [studentActivity, setStudentActivity] = useState<StudentActivity[]>([])
  const [overallStats, setOverallStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalStudents: 0,
    avgAttendance: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const { isTutor, loading: roleLoading } = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (!roleLoading && !isTutor) {
      navigate('/dashboard')
      return
    }

    if (user && isTutor) {
      fetchReports()
    }
  }, [user, isTutor, roleLoading, navigate])

  const fetchReports = async () => {
    try {
      // Fetch all bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')

      if (bookingsError) throw bookingsError

      // Fetch tutors
      const { data: tutorsData } = await supabase
        .from('tutors')
        .select('id, name')

      // Fetch profiles
      const userIds = bookings?.map(b => b.user_id) || []
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)

      // Enrich bookings with tutor and profile data
      const enrichedBookings = bookings?.map(booking => ({
        ...booking,
        tutors: tutorsData?.find(t => t.id === booking.tutor_id),
        profiles: profilesData?.find(p => p.user_id === booking.user_id)
      }))

      // Fetch attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')

      if (attendanceError) throw attendanceError

      // Fetch tasks completion
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('user_id, completed')

      if (tasksError) throw tasksError

      // Calculate tutor statistics
      const tutorMap = new Map<string, TutorStats>()
      enrichedBookings?.forEach(booking => {
        const tutorName = booking.tutors?.name || 'Unknown'
        if (!tutorMap.has(tutorName)) {
          tutorMap.set(tutorName, {
            tutor_name: tutorName,
            total_sessions: 0,
            completed_sessions: 0,
            total_students: new Set<string>().size,
            attendance_rate: 0,
          })
        }
        const stats = tutorMap.get(tutorName)!
        stats.total_sessions++
        if (booking.status === 'completed') {
          stats.completed_sessions++
        }
      })

      // Calculate attendance rates
      const presentCount = attendance?.filter(a => a.status === 'present').length || 0
      const totalAttendance = attendance?.length || 1

      tutorMap.forEach(stats => {
        stats.attendance_rate = Math.round((presentCount / totalAttendance) * 100)
      })

      setTutorStats(Array.from(tutorMap.values()))

      // Calculate student activity
      const studentMap = new Map<string, StudentActivity>()
      enrichedBookings?.forEach(booking => {
        const studentId = booking.user_id
        const studentName = booking.profiles?.full_name || 'Unknown'
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_name: studentName,
            total_bookings: 0,
            attended: 0,
            tasks_completed: 0,
            attendance_rate: 0,
          })
        }
        
        const activity = studentMap.get(studentId)!
        activity.total_bookings++
        
        const studentAttendance = attendance?.filter(
          a => a.student_id === studentId && a.status === 'present'
        ).length || 0
        activity.attended = studentAttendance
        activity.attendance_rate = activity.total_bookings > 0 
          ? Math.round((studentAttendance / activity.total_bookings) * 100)
          : 0

        const completedTasks = tasks?.filter(
          t => t.user_id === studentId && t.completed
        ).length || 0
        activity.tasks_completed = completedTasks
      })

      setStudentActivity(Array.from(studentMap.values()))

      // Calculate overall stats
      const totalSessions = enrichedBookings?.length || 0
      const completed = enrichedBookings?.filter(b => b.status === 'completed').length || 0
      const uniqueStudents = new Set(enrichedBookings?.map(b => b.user_id)).size
      const avgAttendance = Math.round((presentCount / totalAttendance) * 100)

      setOverallStats({
        totalSessions,
        completedSessions: completed,
        totalStudents: uniqueStudents,
        avgAttendance,
      })
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (roleLoading || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Overview of tutorial sessions and student activity
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{overallStats.totalSessions}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{overallStats.completedSessions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-2xl font-bold">{overallStats.avgAttendance}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tutor Statistics */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Tutor Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor Name</TableHead>
                  <TableHead>Total Sessions</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutorStats.map((stat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{stat.tutor_name}</TableCell>
                    <TableCell>{stat.total_sessions}</TableCell>
                    <TableCell>{stat.completed_sessions}</TableCell>
                    <TableCell>{stat.attendance_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Student Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Tasks Completed</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentActivity.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{activity.student_name}</TableCell>
                    <TableCell>{activity.total_bookings}</TableCell>
                    <TableCell>{activity.attended}</TableCell>
                    <TableCell>{activity.tasks_completed}</TableCell>
                    <TableCell>{activity.attendance_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
