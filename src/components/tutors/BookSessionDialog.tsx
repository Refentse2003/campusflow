import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Star, Calendar, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'

interface Tutor {
  id: string
  name: string
  expertise: string
  rating: number
}

interface BookSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tutor: Tutor
  onSessionBooked: () => void
}

export function BookSessionDialog({ open, onOpenChange, tutor, onSessionBooked }: BookSessionDialogProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const sessionDate = formData.get('sessionDate') as string
    const sessionTime = formData.get('sessionTime') as string
    const subject = formData.get('subject') as string

      // Remove debug logs after fixing
      // console.log('Booking session with tutor ID:', tutor.id)
      // console.log('User ID:', user?.id)

    try {
      // Book the session
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert({
          tutor_id: tutor.id,
          user_id: user?.id,
          session_date: sessionDate,
          session_time: sessionTime,
          subject,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: user?.id,
        title: 'Session Booked',
        message: `Your tutoring session with ${tutor.name} for ${subject} has been scheduled for ${new Date(sessionDate).toLocaleDateString()} at ${sessionTime}.`,
        type: 'tutor',
        read: false,
      })

      // Send confirmation email immediately
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: user?.email!,
          subject: 'Tutorial Session Booked Successfully - CampusFlow',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Tutorial Session Confirmed!</h1>
                </div>
                <div class="content">
                  <p>Dear Student,</p>
                  <p>Your tutorial session has been successfully booked. Here are the details:</p>
                  
                  <div class="details">
                    <h3>Session Details</h3>
                    <p><strong>Tutor:</strong> ${tutor.name}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Date:</strong> ${new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><strong>Time:</strong> ${sessionTime}</p>
                    <p><strong>Tutor's Expertise:</strong> ${tutor.expertise}</p>
                    <p><strong>Rating:</strong> ${tutor.rating || 5}/5 stars</p>
                  </div>
                  
                  <p>Please be ready 5 minutes before your scheduled session time. If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
                  
                  <p>We look forward to your learning session!</p>
                </div>
                <div class="footer">
                  <p>Best regards,<br>The CampusFlow Team</p>
                </div>
              </div>
            </body>
            </html>
          `,
          type: 'booking'
        }
      })

      toast({
        title: "Success",
        description: emailError 
          ? "Session booked successfully! (Email confirmation pending)"
          : "Session booked successfully! Confirmation email sent.",
      })

      onSessionBooked()
      onOpenChange(false)
      
      // Reset form
      ;(e.target as HTMLFormElement).reset()
    } catch (error) {
      console.error('Error booking session:', error)
      toast({
        title: "Error",
        description: "Failed to book session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Session</DialogTitle>
        </DialogHeader>
        
        {/* Tutor Info */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
              {getInitials(tutor.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{tutor.name}</h3>
            <p className="text-sm text-muted-foreground">{tutor.expertise}</p>
            <div className="flex items-center gap-1 mt-1">
              {renderStars(tutor.rating || 5)}
              <span className="text-sm text-muted-foreground ml-1">
                {tutor.rating || 5.0}/5
              </span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionDate">Session Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sessionDate"
                  name="sessionDate"
                  type="date"
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTime">Session Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sessionTime"
                  name="sessionTime"
                  type="time"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="e.g., Mathematics, Biology, etc."
              required
            />
          </div>


          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Booking...' : 'Book Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}