import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap, Lock, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Footer } from '@/components/layout/Footer'

export default function ResetPassword() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const checkRecoverySession = async () => {
      // Check if we have a valid recovery session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // We have a valid session from the recovery link
        return
      }

      // If no session, check for tokens in URL
      const hash = window.location.hash
      const searchParamsFromHash = new URLSearchParams(hash.substring(1))
      
      const accessToken = searchParams.get('access_token') || searchParamsFromHash.get('access_token')
      const type = searchParams.get('type') || searchParamsFromHash.get('type')
      
      // Supabase handles recovery links automatically, so if no session and no tokens, it's invalid
      if (!accessToken && !session) {
        toast({
          title: "Invalid Link",
          description: "This password reset link is invalid or has expired.",
          variant: "destructive",
        })
        navigate('/auth')
      }
    }

    checkRecoverySession()
  }, [searchParams, navigate, toast])

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      toast({
        title: "Success!",
        description: "Your password has been reset successfully.",
      })

      // Sign out the user so they can sign in with the new password
      await supabase.auth.signOut()

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth')
      }, 2000)
    } catch (error: any) {
      console.error('Error resetting password:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20 p-4">
          <Card className="w-full max-w-md shadow-card">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-success/20 rounded-full">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4">Password Reset Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Your password has been successfully reset. You will be redirected to the login page shortly.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20 p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-full shadow-glow">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter new password"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Password Requirements:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• At least 6 characters long</li>
                  <li>• Include both letters and numbers</li>
                  <li>• Use a unique password</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}