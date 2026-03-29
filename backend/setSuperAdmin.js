import 'dotenv/config';
import supabase from './src/lib/supabase.js';

async function setSuperAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error('❌ Please provide the email address of the user to upgrade.');
    console.log('Usage: node setSuperAdmin.js <email>');
    process.exit(1);
  }

  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    // Supabase JS doesn't have a direct "getUserByEmail" that guarantees a return for service role in older versions, 
    // but listUsers can fetch. Alternatively, we fetch all users and filter.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`✅ Found user ${user.id}. Upgrading role to 'super_admin'...`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'super_admin' }
    });

    if (updateError) throw updateError;

    console.log(`🎉 Success! ${email} is now a super admin.`);
    console.log(`Please log out and log back in on the frontend to refresh permissions.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error upgrading user:', err.message);
    process.exit(1);
  }
}

setSuperAdmin();
