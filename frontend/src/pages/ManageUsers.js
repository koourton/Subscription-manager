import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/users');
      console.log("Users fetched:", response.data);
      setUsers(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching users:", err);
      let errorMsg = 'Failed to fetch users. ';
      
      if (err.response) {
        if (err.response.status === 403) {
          errorMsg += 'You do not have admin privileges.';
        } else {
          errorMsg += err.response.data?.message || err.message;
        }
        
        if (err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Creating user:", newUser);
      await api.post('/register', newUser);
      console.log("User created successfully");
      
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'user'
      });
      
      fetchUsers();
      setError('');
    } catch (err) {
      console.error("Error creating user:", err);
      let errorMsg = 'Failed to create user. ';
      
      if (err.response && err.response.data) {
        errorMsg += err.response.data.message || err.message;
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Deleting user:", userId);
      await api.delete(`/users/${userId}`);
      console.log("User deleted successfully");
      
      fetchUsers();
      setError('');
    } catch (err) {
      console.error("Error deleting user:", err);
      let errorMsg = 'Failed to delete user. ';
      
      if (err.response && err.response.data) {
        errorMsg += err.response.data.message || err.message;
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log(`Changing user ${userId} role from ${currentRole} to ${newRole}`);
      await api.patch(`/users/${userId}`, { role: newRole });
      console.log("User role updated successfully");
      
      fetchUsers();
      setError('');
    } catch (err) {
      console.error("Error updating user role:", err);
      let errorMsg = 'Failed to update user role. ';
      
      if (err.response && err.response.data) {
        errorMsg += err.response.data.message || err.message;
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
    }
  };

  if (loading && users.length === 0) return <div className="loading">Loading users...</div>;

  return (
    <div className="manage-users-container">
      <h2>Manage Users</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          {error.includes('privileges') && (
            <button 
              className="submit-btn" 
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login');
              }}
              style={{marginTop: '10px', maxWidth: '200px'}}
            >
              Log out and try again
            </button>
          )}
        </div>
      )}
      
      <div className="card user-form-container">
        <h3>Create New User</h3>
        <form onSubmit={handleCreateUser} className="user-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={newUser.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={newUser.role} onChange={handleInputChange}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="submit-btn">Create User</button>
        </form>
      </div>
      
      <div className="card users-table-container">
        <h3>All Users</h3>
        {users.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={user.role === 'admin' ? 'role-admin' : 'role-user'}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleToggleRole(user.id, user.role)}
                        className="role-toggle-btn"
                      >
                        {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="delete-btn"
                        disabled={user.username === 'admin'} 
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No users found.</p>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
