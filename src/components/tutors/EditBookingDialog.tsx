import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface Booking {
  id: string
  tutor_id: string
  session_date: string
  session_time: string
  subject: string
  status: string
  notification_type?: string
}

interface EditBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking | null
  onBookingUpdated: () => void
}

export function EditBookingDialog({ open, onOpenChange, booking, onBookingUpdated }: EditBookingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [enableNotifications, setEnableNotifications] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (booking) {
      setEnableNotifications(!!booking.notification_type)
    }
  }, [booking])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!booking) return
    
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const sessionDate = formData.get('sessionDate') as string
    const sessionTime = formData.get('sessionTime') as string
    const subject = formData.get('subject') as string
    const notificationType = enableNotifications ? (formData.get('notificationType') as string) : null

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          session_date: sessionDate,
          session_time: sessionTime,
          subject,
          notification_type: notificationType,
        })
        .eq('id', booking.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Booking updated successfully",
      })

      onBookingUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating booking:', error)
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!booking) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        
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
                  defaultValue={booking.session_date}
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
                  defaultValue={booking.session_time}
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
              defaultValue={booking.subject}
              required
            />
          </div>

          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableNotifications"
                checked={enableNotifications}
                onCheckedChange={(checked) => setEnableNotifications(checked as boolean)}
              />
              <Label htmlFor="enableNotifications" className="text-sm font-medium">
                Enable email & in-app notifications
              </Label>
            </div>

            {enableNotifications && (
              <div className="space-y-2">
                <Label htmlFor="notificationType">Notification Schedule</Label>
                <Select name="notificationType" defaultValue={booking.notification_type || "1day"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1hour">1 hour before</SelectItem>
                    <SelectItem value="2hours">2 hours before</SelectItem>
                    <SelectItem value="1day">1 day before</SelectItem>
                    <SelectItem value="2days">2 days before</SelectItem>
                    <SelectItem value="1week">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
              {loading ? 'Updating...' : 'Update Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}