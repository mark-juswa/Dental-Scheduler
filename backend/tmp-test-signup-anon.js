import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get Anon key from frontend .env using fs and dotenv
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
const frontendEnv = dotenv.parse(fs.readFileSync(path.resolve('../frontend/.env')));

const supabaseAnon = createClient(frontendEnv.VITE_SUPABASE_URL, frontendEnv.VITE_SUPABASE_ANON_KEY);

async function testSignup() {
  const { data, error } = await supabaseAnon.auth.signUp({
    email: 'test_auto_confirm_anon@example.com',
    password: 'password123',
    options: {
      data: { full_name: 'Test Auto', role: 'user' }
    }
  });

  console.log("Error:", error?.message);
  console.log("Session returned?", !!data.session);
  console.log("User id:", data.user?.id);
  console.log("User email confirmed at?", data.user?.email_confirmed_at);
}

testSignup();
