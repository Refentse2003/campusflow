import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { Footer } from '@/components/layout/Footer'

interface AttendanceRecord {
  id?: string
  student_id: string
  status: 'present' | 'absent' | 'pending'
  notes: string
  student_name: string
  student_email: string
}

export default function Attendance() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const { isTutor } = useRole()

  useEffect(() => {
    if (!isTutor) {
      navigate('/dashboard')
      return
    }

    if (bookingId && user) {
      fetchBookingAndAttendance()
    }
  }, [bookingId, user, isTutor, navigate])

  const fetchBookingAndAttendance = async () => {
    try {
      // Get tutor's tutor_id first
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!tutorData) {
        throw new Error('No tutor record found for this user')
      }

      // Fetch booking details that belongs to this tutor
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('tutor_id', tutorData.id)
        .single()

      if (bookingError) throw bookingError

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', bookingData.user_id)
        .single()

      const enrichedBooking = {
        ...bookingData,
        profiles: profileData || { full_name: 'Unknown', email: '' }
      }

      setBooking(enrichedBooking)

      // Fetch or create attendance record
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('booking_id', bookingId)

      if (attendanceError) throw attendanceError

      if (attendanceData && attendanceData.length > 0) {
        // Load existing attendance
        setAttendance(
          attendanceData.map(record => ({
            id: record.id,
            student_id: record.student_id,
            status: record.status as 'present' | 'absent' | 'pending',
            notes: record.notes || '',
            student_name: enrichedBooking.profiles?.full_name || 'Unknown',
            student_email: enrichedBooking.profiles?.email || '',
          }))
        )
      } else {
        // Create initial attendance record
        setAttendance([
          {
            student_id: enrichedBooking.user_id,
            status: 'pending',
            notes: '',
            student_name: enrichedBooking.profiles?.full_name || 'Unknown',
            student_email: enrichedBooking.profiles?.email || '',
          },
        ])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (index: number, status: 'present' | 'absent') => {
    const updated = [...attendance]
    updated[index].status = status
    setAttendance(updated)
  }

  const handleNotesChange = (index: number, notes: string) => {
    const updated = [...attendance]
    updated[index].notes = notes
    setAttendance(updated)
  }

  const handleSaveAttendance = async () => {
    try {
      for (const record of attendance) {
        if (record.id) {
          // Update existing record
          const { error } = await supabase
            .from('attendance')
            .update({
              status: record.status,
              notes: record.notes,
              marked_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          if (error) throw error
        } else {
          // Get tutor's tutor_id for insert
          const { data: tutorData } = await supabase
            .from('tutors')
            .select('id')
            .eq('user_id', user?.id)
            .single()

          if (!tutorData) {
            throw new Error('No tutor record found')
          }

          // Insert new record
          const { error } = await supabase
            .from('attendance')
            .insert({
              booking_id: bookingId,
              student_id: record.student_id,
              tutor_id: tutorData.id,
              status: record.status,
              notes: record.notes,
            })

          if (error) throw error
        }
      }

      // Update booking status to completed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (bookingError) throw bookingError

      toast({
        title: "Success",
        description: "Attendance saved successfully",
      })

      navigate('/tutor/dashboard')
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/tutor/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance Register</h1>
            <p className="text-muted-foreground mt-2">
              Mark attendance for {booking?.subject} - {new Date(booking?.session_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{record.student_name}</TableCell>
                    <TableCell className="text-muted-foreground">{record.student_email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={record.status === 'present' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(index, 'present')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={record.status === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => handleStatusChange(index, 'absent')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Absent
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        placeholder="Add notes..."
                        value={record.notes}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        className="min-h-[60px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-end gap-4">
              <Button variant="outline" onClick={() => navigate('/tutor/dashboard')}>
                Cancel
              </Button>
              <Button onClick={handleSaveAttendance}>
                Save Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
