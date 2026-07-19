import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useNavigate } from 'react-router-dom'
import "../styles/Login.css";

const STORAGE_KEY = "emailRecordado";

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [recordarme, setRecordarme] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const emailGuardado = localStorage.getItem(STORAGE_KEY)
    if (emailGuardado) {
      setEmail(emailGuardado)
      setRecordarme(true)
    }
  }, [])

  const ingresar = useCallback(
    async (event) => {
      event.preventDefault()
      setMensaje('')

      if (!email || !password) {
        setMensaje('Completa correo y contraseña')
        return
      }

      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      setLoading(false)

      if (error) {
        setMensaje('Usuario o contraseña incorrectos')
        return
      }

      if (recordarme) {
        localStorage.setItem(STORAGE_KEY, email)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }

      navigate('/Interface')
    },
    [email, password, recordarme, navigate]
  )

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-login" />
        <h1>Dental Smile</h1>
        <p className="subtitulo-login">
          Sistema Integral de Gestión Odontológica
        </p>
       <div className="linea-login" />

        <form className="login-form" onSubmit={ingresar}>
          <div className="input-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="login-opciones">
            <label className="recordarme">
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
              Recordarme
            </label>

            <a
              href="#!"
              className="forgot-password"
              onClick={(e) => e.preventDefault()}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {mensaje && <p>{mensaje}</p>}
      </div>
    </div>
  )
}

export default Login