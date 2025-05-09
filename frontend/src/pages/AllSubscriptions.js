import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AllSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Fetching all subscriptions...");
      const response = await api.get('/subscriptions/all');
      console.log("Subscriptions fetched:", response.data);
      setSubscriptions(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      let errorMsg = "Failed to fetch subscriptions";
      
      if (err.response) {
        errorMsg += ": " + (err.response.data?.message || err.message);
        
        if (err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } else {
        errorMsg += ": " + err.message;
      }
      
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await api.delete(`/subscriptions/${id}`);
      
      setSubscriptions(subscriptions.map(sub => 
        sub.id === id ? { ...sub, is_active: false } : sub
      ));
      
    } catch (err) {
      console.error("Error canceling subscription:", err);
      setError('Failed to cancel subscription. Please try again later.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await api.delete(`/subscriptions/${id}`);
      
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
      
    } catch (err) {
      console.error("Error deleting subscription:", err);
      setError('Failed to delete subscription. Please try again later.');
    }
  };

  if (loading) return <div className="loading">Loading subscriptions...</div>;
  
  return (
    <div className="all-subscriptions">
      <h2>All Subscriptions</h2>
      
      {error ? (
        <div className="error-message">
          <p>{error}</p>
          <p>Please make sure you have admin privileges and are properly logged in.</p>
          <button 
            className="submit-btn" 
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }}
            style={{marginTop: '20px', maxWidth: '200px'}}
          >
            Log out and try again
          </button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="no-data">
          <p>No subscriptions found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Plan</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td>{subscription.id}</td>
                  <td>{subscription.username}</td>
                  <td>{subscription.plan_name}</td>
                  <td>{new Date(subscription.start_date).toLocaleDateString()}</td>
                  <td>{new Date(subscription.end_date).toLocaleDateString()}</td>
                  <td>
                    <span className={subscription.is_active ? 'status-active' : 'status-inactive'}>
                      {subscription.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {subscription.is_active ? (
                      <button 
                        onClick={() => handleCancel(subscription.id)} 
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDelete(subscription.id)} 
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllSubscriptions;
