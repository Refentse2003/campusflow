import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const tutors = [
      {
        email: 'refentse@campusflow.com',
        password: 'Tutor123!',
        full_name: 'Refentse Atlegang Mokoena'
      },
      {
        email: 'wanda@campusflow.com',
        password: 'Tutor123!',
        full_name: 'Wanda Giqo'
      },
      {
        email: 'silindokuhle@campusflow.com',
        password: 'Tutor123!',
        full_name: 'Silindokuhle Ngqokoma'
      }
    ]

    const results = []

    for (const tutor of tutors) {
      // Try to create user, but if they already exist, get their ID
      let userId: string | null = null
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: tutor.email,
        password: tutor.password,
        email_confirm: true,
        user_metadata: {
          full_name: tutor.full_name
        }
      })

      if (userError) {
        // If user already exists, update their password and get their ID
        if (userError.message.includes('already been registered')) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existingUsers.users.find(u => u.email === tutor.email)
          if (existingUser) {
            userId = existingUser.id
            // Reset password and confirm email for existing user
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: tutor.password,
              email_confirm: true,
              user_metadata: {
                full_name: tutor.full_name
              }
            })
          } else {
            results.push({ email: tutor.email, error: 'User exists but could not be found' })
            continue
          }
        } else {
          results.push({ email: tutor.email, error: userError.message })
          continue
        }
      } else {
        userId = userData.user.id
      }

      if (!userId) {
        results.push({ email: tutor.email, error: 'Could not determine user ID' })
        continue
      }

      // Assign tutor role (ignore if already exists)
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'tutor'
        })

      // Continue even if role already exists
      const roleAssigned = !roleError || roleError.message.includes('duplicate')

      // Create tutor entry in tutors table
      const { error: tutorError } = await supabaseAdmin
        .from('tutors')
        .insert({
          user_id: userId,
          name: tutor.full_name,
          expertise: 'ICT Specialist',
          availability: 'Available',
          rating: 5.0
        })

      if (tutorError && !tutorError.message.includes('duplicate')) {
        results.push({ 
          email: tutor.email, 
          user_created: true,
          role_assigned: roleAssigned,
          tutor_error: tutorError.message 
        })
        continue
      }

      results.push({ 
        email: tutor.email, 
        success: true,
        temporary_password: tutor.password,
        was_existing: userError?.message.includes('already been registered')
      })
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
