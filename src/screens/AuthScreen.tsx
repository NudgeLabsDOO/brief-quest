import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Mode = 'signin' | 'signup' | 'magic';

export function AuthScreen() {
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, signInWithMagicLink, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'magic') {
        await signInWithMagicLink(email);
        setMagicSent(true);
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password);
        navigate('/');
      } else {
        await signInWithEmail(email, password);
        navigate('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-bold text-indigo-900">Check your email</h2>
          <p className="text-sm text-gray-600">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
          <button
            onClick={() => { setMagicSent(false); setMode('signin'); }}
            className="text-indigo-600 text-sm underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-900">Brief Quest</h1>
        <p className="text-indigo-600 text-sm mt-1">Can you fix the brief?</p>
      </div>

      <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-8 max-w-sm w-full space-y-6">
        {/* Mode tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1 text-sm">
          {(['signin', 'signup', 'magic'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'signin' ? 'Sign in' : m === 'signup' ? 'Sign up' : '✨ Magic'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@agency.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {mode !== 'magic' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send magic link →'}
          </button>
        </form>
      </div>
    </div>
  );
}
