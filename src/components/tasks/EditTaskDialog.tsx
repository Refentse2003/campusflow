import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface Task {
  id: string
  title: string
  due_date: string
  priority: string
  subject: string
  notification_type: string
}

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onTaskUpdated: () => void
}

export function EditTaskDialog({ open, onOpenChange, task, onTaskUpdated }: EditTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [enableNotifications, setEnableNotifications] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (task) {
      setEnableNotifications(!!task.notification_type)
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!task) return
    
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const dueDate = formData.get('dueDate') as string
    const priority = formData.get('priority') as string
    const subject = formData.get('subject') as string
    const notificationType = enableNotifications ? (formData.get('notificationType') as string) : null

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          priority,
          subject,
          notification_type: notificationType,
        })
        .eq('id', task.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Task updated successfully",
      })

      onTaskUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={task.title}
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
                defaultValue={task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue={task.priority}>
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
              defaultValue={task.subject}
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
                <Select name="notificationType" defaultValue={task.notification_type || '1day'}>
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

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}