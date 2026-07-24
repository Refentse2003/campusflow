import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskAdded: () => void
}

export function AddTaskDialog({ open, onOpenChange, onTaskAdded }: AddTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [enableNotifications, setEnableNotifications] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    
    const dueDate = formData.get('dueDate') as string
    const priority = formData.get('priority') as string
    const subject = formData.get('subject') as string
    const notificationType = enableNotifications ? (formData.get('notificationType') as string) : null

    try {
      const { data: taskData, error } = await supabase
        .from('tasks')
        .insert({
          title,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          priority,
          subject,
          notification_type: notificationType,
          user_id: user?.id,
          completed: false,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Task added successfully",
      })

      // Send confirmation email and schedule notification if enabled
      if (enableNotifications && notificationType && taskData) {
        try {
          // Send confirmation email
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: user?.email!,
              subject: 'Task Created - Notification Scheduled',
              html: `
                <h1>Task Created Successfully</h1>
                <p>Your task "${title}" has been created and a notification has been scheduled.</p>
                <p><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleString() : 'Not set'}</p>
                <p><strong>Priority:</strong> ${priority}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Notification:</strong> ${notificationType.replace(/(\d+)/, '$1 ').replace(/([a-z])([A-Z])/g, '$1 $2')}</p>
              `,
              type: 'task'
            }
          })

          // Schedule the notification
          await supabase.functions.invoke('schedule-task-notifications', {
            body: {
              task_id: taskData.id,
              user_email: user?.email!,
              task_title: title,
              due_date: dueDate,
              notification_type: notificationType,
              subject: subject,
              priority: priority
            }
          })
        } catch (emailError) {
          console.error('Failed to send notification:', emailError)
          // Don't fail the task creation if email fails
        }
      }

      onTaskAdded()
      onOpenChange(false)
      
      // Reset form
      ;(e.target as HTMLFormElement).reset()
      setEnableNotifications(false)
    } catch (error) {
      console.error('Error adding task:', error)
      toast({
        title: "Error",
        description: "Failed to add task",
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
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter task title"
              required
            />
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="datetime-local"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="e.g., Mathematics, Biology, etc."
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
                <Select name="notificationType" defaultValue="1day">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1hour">1 hour before</SelectItem>
                    <SelectItem value="1day">1 day before</SelectItem>
                    <SelectItem value="2days">2 days before</SelectItem>
                    <SelectItem value="1week">1 week before</SelectItem>
                    <SelectItem value="custom">Custom schedule</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You'll automatically receive a reminder 1 day before the due date regardless of your selected schedule.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}