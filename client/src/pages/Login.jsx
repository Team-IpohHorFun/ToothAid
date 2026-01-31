import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { API_BASE_URL, getApiPath } from '../config';

const Login = ({ setToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiPath = getApiPath('/auth/login');
      const fullUrl = `${API_BASE_URL}${apiPath}`;
      console.log('Login request URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login error response:', response.status, errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}. URL: ${fullUrl}`);
      }

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server error: ${response.status} ${response.statusText}. Expected JSON but got: ${contentType}`);
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setToken(data.token);
      navigate('/');
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Cannot connect to server. Make sure the backend is accessible.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    setUsername('demo');
    setPassword('demo');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const apiPath = getApiPath('/auth/register');
      const fullUrl = `${API_BASE_URL}${apiPath}`;
      console.log('Register request URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Register error response:', response.status, errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}. URL: ${fullUrl}`);
      }

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server error: ${response.status} ${response.statusText}. Expected JSON but got: ${contentType}`);
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setToken(data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tooth icon SVG
  const ToothIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9.5 2 7 3 6 5C5 7 5 9 5.5 11C6 13 6.5 15 7 17C7.5 19 8 21 9 22C9.5 22.5 10.5 22.5 11 21C11.5 19.5 12 18 12 18C12 18 12.5 19.5 13 21C13.5 22.5 14.5 22.5 15 22C16 21 16.5 19 17 17C17.5 15 18 13 18.5 11C19 9 19 7 18 5C17 3 14.5 2 12 2Z" />
    </svg>
  );

  return (
    <div className="login-container">
      <div className="login-content">
        {/* Brand Section */}
        <div className="login-brand">
          <div className="login-icon">
            <ToothIcon />
          </div>
          <h1>ToothAid</h1>
          <p className="subtitle">Dental Data & Impact Monitoring</p>
        </div>

        {/* Form Section */}
        <div className="login-form">
          <form onSubmit={isRegistering ? handleRegister : handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {isRegistering && (
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}

            {isRegistering ? (
              <>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                    setConfirmPassword('');
                  }}
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                
                <div className="login-divider">
                  <span>or</span>
                </div>
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDemo}
                >
                  Use Demo Account
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    setIsRegistering(true);
                    setError('');
                  }}
                >
                  Create New Account
                </button>
              </>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default Login;
