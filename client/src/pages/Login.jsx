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
        // If not OK, try to get error message
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
        // If not OK, try to get error message
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

      // Auto-login after registration
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

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>ToothAid</h1>
        <p className="subtitle">Dental Clinic Management</p>
        
        <form onSubmit={isRegistering ? handleRegister : handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                required
              />
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {isRegistering ? (
            <>
              <button 
                type="button" 
                className="btn btn-primary btn-block"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
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
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={handleDemo}
              >
                Use Demo Credentials
              </button>
              <button
                type="button"
                className="btn btn-success btn-block"
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
  );
};

export default Login;
