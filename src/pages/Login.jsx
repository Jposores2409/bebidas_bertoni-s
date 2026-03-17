import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError('Credenciales incorrectas. Verificá tu email y contraseña.')
    setLoading(false)
  }

  return (
    <div className="login-wrapper">
      <div className="login-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.jpg" alt="Bertoni & Bebidas" className="login-logo-img" />
          <p className="login-subtitle">Sistema de gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label className="field-label">Email</label>
            <div className="field-input-wrap">
              <Mail size={16} className="field-icon" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="field-input"
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Contraseña</label>
            <div className="field-input-wrap">
              <Lock size={16} className="field-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input"
                required
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Ingresar'}
          </button>
        </form>

        <p className="login-footer">
          Acceso restringido · Solo usuarios autorizados
        </p>
      </div>

      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .login-bg { position: absolute; inset: 0; pointer-events: none; }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          animation: float 8s ease-in-out infinite;
        }
        .blob-1 { width: 500px; height: 500px; background: #1a5fa8; top: -150px; left: -150px; animation-delay: 0s; }
        .blob-2 { width: 400px; height: 400px; background: #1e4d8c; bottom: -100px; right: -100px; animation-delay: 3s; }
        .blob-3 { width: 300px; height: 300px; background: #2563a8; top: 40%; left: 50%; animation-delay: 5s; }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          margin: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 48px 40px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(24px);
        }
        @keyframes slideUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .login-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 36px;
          gap: 12px;
        }
        .login-logo-img {
          width: 100px;
          height: 100px;
          border-radius: 18px;
          object-fit: cover;
          box-shadow: 0 8px 28px rgba(26,95,168,0.45);
          border: 2px solid rgba(255,255,255,0.12);
        }
        .login-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 2px 0 0;
          text-align: center;
        }
        .login-form { display: flex; flex-direction: column; gap: 20px; }
        .field-group { display: flex; flex-direction: column; gap: 7px; }
        .field-label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); }
        .field-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon {
          position: absolute;
          left: 14px;
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }
        .field-input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .field-input:focus {
          border-color: #1a5fa8;
          background: rgba(26,95,168,0.1);
          box-shadow: 0 0 0 3px rgba(26,95,168,0.15);
        }
        .pass-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .pass-toggle:hover { color: rgba(255,255,255,0.7); }
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          color: #f87171;
          font-size: 13px;
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #1a5fa8, #1e4d8c);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 8px 24px rgba(26,95,168,0.35);
          margin-top: 4px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(26,95,168,0.5);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-footer {
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,0.2);
          margin-top: 24px;
          margin-bottom: 0;
        }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
      `}</style>
    </div>
  )
}