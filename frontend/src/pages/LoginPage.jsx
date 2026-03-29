import { useState } from 'react';
import { supabase } from '../services/supabaseClient.js';
import { showToast } from '../ui/toastService.js';

export default function LoginPage() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [regForm, setRegForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function doLogin(e) {
    e.preventDefault();
    if (!email || !pass) { showToast('Enter email and password', 'warning'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) showToast(error.message, 'error');
  }

  async function doRegister(e) {
    e.preventDefault();
    const { firstName, lastName, email: re, password } = regForm;
    if (!firstName || !lastName || !re || !password) { showToast('Fill all fields', 'warning'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: re, password,
      options: { 
        data: { full_name: `${firstName} ${lastName}`, role: 'user' },
        emailRedirectTo: window.location.origin
      },
    });
    setLoading(false);
    if (error) showToast(error.message, 'error');
    else { showToast('Account created! Check your email to confirm.', 'success'); setScreen('login'); }
  }

  return (
    <div className="auth-screen">
      {screen === 'login' ? (
        <div className="auth-grid">
          <div className="auth-hero">
            <h1>Effortless<br /><span>Scheduling.</span><br />Care-Focused.</h1>
            <img src="./1.jpg" alt="" />
          </div>
          <div>
            <div className="auth-card">
              <h2>Welcome Back 👋</h2>
              <p>Sign in to make your scheduling easier</p>
              <form onSubmit={doLogin}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input className="form-input" type="email" placeholder="admin@toothcare.ph" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
                </div>
                <div className="form-row"><span></span><a className="link">Forgot password?</a></div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  <i className="fa fa-sign-in-alt"></i> {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-m)' }}>
                No account? <a className="link" onClick={() => setScreen('register')}>Create one</a>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-grid">
          <div>
            <div className="auth-card">
              <h2>Create Account</h2>
              <p>Set up your clinic management system</p>
              <form onSubmit={doRegister}>
                <div className="input-grid-2">
                  <div className="form-group"><label>First Name</label><input className="form-input" type="text" placeholder="Juan" value={regForm.firstName} onChange={e => setRegForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                  <div className="form-group"><label>Last Name</label><input className="form-input" type="text" placeholder="Dela Cruz" value={regForm.lastName} onChange={e => setRegForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label>Email</label><input className="form-input" type="email" placeholder="you@clinic.ph" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="form-group"><label>Password</label><input className="form-input" type="password" placeholder="••••••••" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} /></div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  <i className="fa fa-user-plus"></i> {loading ? 'Creating…' : 'Create Account'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-m)' }}>
                Already have an account? <a className="link" onClick={() => setScreen('login')}>Sign in</a>
              </p>
            </div>
          </div>
          <div className="auth-hero">
            <h1>Organize Your<br />Care. <span>Grow Faster.</span></h1>
            <img src="./2.jpg" alt="" />
          </div>
        </div>
      )}
    </div>
  );
}