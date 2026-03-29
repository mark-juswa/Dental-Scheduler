import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSignup() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test_auto_confirm@example.com',
    password: 'password123',
    options: {
      data: { full_name: 'Test Auto', role: 'user' }
    }
  });

  console.log("Error:", error?.message);
  console.log("Session returned?", !!data.session);
  console.log("User email confirmed at?", data.user?.email_confirmed_at);
  
  // Cleanup
  if (data.user) {
    await supabase.auth.admin.deleteUser(data.user.id);
  }
}

testSignup();
