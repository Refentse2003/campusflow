import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Star, Clock, Calendar, User, BookOpen } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { BookSessionDialog } from '@/components/tutors/BookSessionDialog'
import { useAuth } from '@/hooks/useAuth'
import { EditBookingDialog } from '@/components/tutors/EditBookingDialog'
import { Footer } from '@/components/layout/Footer'

interface Tutor {
  id: string
  name: string
  expertise: string
  bio: string
  rating: number
  availability: string
  created_at: string
}

export default function Tutors() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchTutors()
    if (user) {
      fetchBookings()
    }
  }, [user])

  const fetchTutors = async () => {
    try {
      const { data, error } = await supabase
        .from('tutors')
        .select('*')
        .order('rating', { ascending: false })

      if (error) throw error
      setTutors(data || [])
    } catch (error) {
      console.error('Error fetching tutors:', error)
      toast({
        title: "Error",
        description: "Failed to load tutors",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          tutors!inner(name, expertise)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const handleEditBooking = (booking: any) => {
    setSelectedBooking(booking)
    setShowEditDialog(true)
  }

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      })

      fetchBookings()
    } catch (error) {
      console.error('Error deleting booking:', error)
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      })
    }
  }

  const handleMarkComplete = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: "Success", 
        description: "Session marked as complete",
      })

      fetchBookings()
    } catch (error) {
      console.error('Error marking session complete:', error)
      toast({
        title: "Error",
        description: "Failed to mark session as complete",
        variant: "destructive",
      })
    }
  }

  const handleBookSession = (tutor: Tutor) => {
    setSelectedTutor(tutor)
    setShowBookingDialog(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case 'available':
        return 'bg-success text-success-foreground'
      case 'busy':
        return 'bg-warning text-warning-foreground'
      case 'unavailable':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating 
            ? 'text-warning fill-warning' 
            : 'text-muted-foreground'
        }`}
      />
    ))
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tutors</h1>
          <p className="text-muted-foreground mt-2">
            Connect with experienced tutors for personalized learning
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Tutors</p>
                  <p className="text-2xl font-bold">{tutors.filter(t => t.availability === 'Available').length}</p>
                </div>
                <User className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tutors</p>
                  <p className="text-2xl font-bold">{tutors.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">
                    {tutors.length > 0 
                      ? (tutors.reduce((acc, t) => acc + (t.rating || 0), 0) / tutors.length).toFixed(1)
                      : '0.0'
                    }
                  </p>
                </div>
                <Star className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tutors Grid */}
        {tutors.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tutors available</h3>
              <p className="text-muted-foreground">
                Check back later for available tutors
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.map((tutor) => (
              <Card key={tutor.id} className="shadow-card hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="flex flex-col items-center space-y-3">
                    <Avatar className="w-20 h-20 border-4 border-primary/20">
                      <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                        {getInitials(tutor.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{tutor.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{tutor.expertise}</p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {renderStars(tutor.rating || 5)}
                      <span className="text-sm text-muted-foreground ml-2">
                        {tutor.rating || 5.0}/5
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {tutor.bio && (
                    <p className="text-sm text-muted-foreground text-center line-clamp-3">
                      {tutor.bio}
                    </p>
                  )}
                  
                  <div className="flex flex-col items-center space-y-3">
                    <Badge className={getAvailabilityColor(tutor.availability)}>
                      <Clock className="h-3 w-3 mr-1" />
                      {tutor.availability}
                    </Badge>
                    
                    <Button
                      onClick={() => handleBookSession(tutor)}
                      disabled={tutor.availability !== 'Available'}
                      className="w-full shadow-glow"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Session
                    </Button>
                  </div>
                  
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      Member since {new Date(tutor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Book Session Dialog */}
        {selectedTutor && (
          <BookSessionDialog
            open={showBookingDialog}
            onOpenChange={setShowBookingDialog}
            tutor={selectedTutor}
            onSessionBooked={() => {
              toast({
                title: "Session Booked!",
                description: `Your session with ${selectedTutor.name} has been booked successfully.`,
              })
              fetchBookings()
              setShowBookingDialog(false)
            }}
          />
        )}

        {/* Booked Sessions */}
        {bookings.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Your Booked Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{booking.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          With {booking.tutors?.name || 'Unknown Tutor'} - {booking.tutors?.expertise || ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.session_date).toLocaleDateString()} at {booking.session_time}
                        </p>
                        <Badge className="mt-2">{booking.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditBooking(booking)}
                          disabled={booking.status === 'completed'}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteBooking(booking.id)}
                        >
                          Delete
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleMarkComplete(booking.id)}
                          disabled={booking.status === 'completed'}
                        >
                          {booking.status === 'completed' ? 'Completed' : 'Mark Complete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Booking Dialog */}
        {selectedBooking && (
          <EditBookingDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            booking={selectedBooking}
            onBookingUpdated={() => {
              fetchBookings()
              setShowEditDialog(false)
            }}
          />
        )}
      </div>
      <Footer />
    </div>
  )
}