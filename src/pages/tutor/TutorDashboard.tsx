import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, CheckCircle, Clock, XCircle, Users } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useNavigate } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'

interface Booking {
  id: string
  subject: string
  session_date: string
  session_time: string
  status: string
  user_id: string
  profiles: {
    full_name: string
    email: string
  }
  attendance?: {
    id: string
    status: 'present' | 'absent'
  } | null
}

export default function TutorDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    total: 0,
  })
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
      fetchBookings()
    }
  }, [user, isTutor, roleLoading, navigate])

  const fetchBookings = async () => {
    try {
      // First get the tutor's record to find their tutor_id
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!tutorData) {
        console.error('No tutor record found for this user')
        setBookings([])
        setLoading(false)
        return
      }

      // Fetch bookings for this specific tutor
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('tutor_id', tutorData.id)
        .order('session_date', { ascending: true })

      if (bookingsError) throw bookingsError

      // Fetch profiles for the students who booked
      const userIds = bookingsData?.map(b => b.user_id) || []
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds)

      // Fetch attendance records for these bookings
      const bookingIds = bookingsData?.map(b => b.id) || []
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, booking_id, status')
        .in('booking_id', bookingIds)

      // Merge the data
      const enrichedBookings = bookingsData?.map(booking => {
        const attendanceRecord = attendanceData?.find(a => a.booking_id === booking.id)
        return {
          ...booking,
          profiles: profilesData?.find(p => p.user_id === booking.user_id) || {
            full_name: 'Unknown',
            email: ''
          },
          attendance: attendanceRecord ? {
            id: attendanceRecord.id,
            status: attendanceRecord.status as 'present' | 'absent'
          } : null
        }
      }) || []

      setBookings(enrichedBookings)

      const pending = enrichedBookings?.filter(b => b.status === 'pending').length || 0
      const confirmed = enrichedBookings?.filter(b => b.status === 'confirmed').length || 0
      const completed = enrichedBookings?.filter(b => b.status === 'completed').length || 0

      setStats({
        pending,
        confirmed,
        completed,
        total: enrichedBookings?.length || 0,
      })
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceUpdate = async (booking: Booking, attendanceStatus: 'present' | 'absent') => {
    try {
      // Get tutor id
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!tutorData) throw new Error('Tutor not found')

      if (booking.attendance) {
        // Update existing attendance
        const { error } = await supabase
          .from('attendance')
          .update({ status: attendanceStatus })
          .eq('id', booking.attendance.id)

        if (error) throw error
      } else {
        // Create new attendance record
        const { error } = await supabase
          .from('attendance')
          .insert({
            booking_id: booking.id,
            student_id: booking.user_id,
            tutor_id: tutorData.id,
            status: attendanceStatus
          })

        if (error) throw error
      }

      toast({
        title: "Success",
        description: `Marked as ${attendanceStatus}`,
      })

      fetchBookings()
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-warning-foreground'
      case 'confirmed':
        return 'bg-success text-success-foreground'
      case 'completed':
        return 'bg-muted text-muted-foreground'
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-muted text-muted-foreground'
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
          <h1 className="text-3xl font-bold text-foreground">Tutor Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your tutorial sessions and bookings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Tutorial Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p className="text-muted-foreground">
                  Your tutorial bookings will appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{booking.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{booking.subject}</TableCell>
                      <TableCell>
                        <div>
                          <p>{new Date(booking.session_date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">{booking.session_time}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {booking.attendance ? (
                            <Badge className={booking.attendance.status === 'present' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                              {booking.attendance.status === 'present' ? 'Present' : 'Absent'}
                            </Badge>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAttendanceUpdate(booking, 'present')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAttendanceUpdate(booking, 'absent')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Absent
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
