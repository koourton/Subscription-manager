import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const ManagePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    features: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/plans/all');
      console.log("Plans fetched:", response.data);
      setPlans(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching plans:", err);
      let errorMsg = 'Failed to fetch plans. ';
      
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

  const handleInputChange = (e, isForEditPlan = false) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? parseFloat(value) : value;
    
    if (isForEditPlan && editingPlan) {
      setEditingPlan({
        ...editingPlan,
        [name]: processedValue
      });
    } else {
      setNewPlan({
        ...newPlan,
        [name]: processedValue
      });
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Creating plan:", {
        ...newPlan,
        price: parseFloat(newPlan.price),
        duration_days: parseInt(newPlan.duration_days, 10)
      });
      
      await api.post('/plans', {
        ...newPlan,
        price: parseFloat(newPlan.price),
        duration_days: parseInt(newPlan.duration_days, 10)
      });
      
      console.log("Plan created successfully");
      
      setNewPlan({
        name: '',
        description: '',
        price: '',
        duration_days: '',
        features: ''
      });
      fetchPlans();
      setError('');
    } catch (err) {
      console.error("Error creating plan:", err);
      
      if (err.response && err.response.status === 409) {
        setError('A plan with this name already exists. Please choose a different name.');
      } else {
        setError('Failed to create plan. ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log("Updating plan:", {
        ...editingPlan,
        price: parseFloat(editingPlan.price),
        duration_days: parseInt(editingPlan.duration_days, 10)
      });
      
      await api.put(`/plans/${editingPlan.id}`, {
        ...editingPlan,
        price: parseFloat(editingPlan.price),
        duration_days: parseInt(editingPlan.duration_days, 10)
      });
      
      console.log("Plan updated successfully");
      setEditingPlan(null);
      fetchPlans();
      setError('');
    } catch (err) {
      console.error("Error updating plan:", err);
      
      if (err.response && err.response.status === 409) {
        setError('A plan with this name already exists. Please choose a different name.');
      } else {
        setError('Failed to update plan. ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This will affect all users subscribed to this plan.')) {
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
      
      console.log("Deleting plan:", planId);
      await api.delete(`/plans/${planId}`);
      console.log("Plan deleted successfully");
      
      fetchPlans();
      setError('');
    } catch (err) {
      console.error("Error deleting plan:", err);
      setError('Failed to delete plan. ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleActive = async (planId, isCurrentlyActive) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You need to log in first');
        navigate('/login');
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log(`Toggling plan ${planId} active status from ${isCurrentlyActive} to ${!isCurrentlyActive}`);
      await api.patch(`/plans/${planId}`, { is_active: !isCurrentlyActive });
      console.log("Plan status updated successfully");
      
      fetchPlans();
      setError('');
    } catch (err) {
      console.error("Error updating plan status:", err);
      setError('Failed to update plan status. ' + (err.response?.data?.message || err.message));
    }
  };

  const startEditing = (plan) => {
    setEditingPlan({...plan});
    setError(''); 
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setError('');
  };

  if (loading && plans.length === 0) return <div className="loading">Loading plans...</div>;

  return (
    <div className="manage-plans-container">
      <h2>Manage Subscription Plans</h2>
      
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
      
      {!editingPlan ? (
        <div className="card plan-form-container">
          <h3>Create New Plan</h3>
          <form onSubmit={handleCreatePlan} className="plan-form">
            <div className="form-group">
              <label>Plan Name</label>
              <input
                type="text"
                name="name"
                value={newPlan.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={newPlan.description}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={newPlan.price}
                onChange={handleInputChange}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input
                type="number"
                name="duration_days"
                value={newPlan.duration_days}
                onChange={handleInputChange}
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Features (comma separated)</label>
              <textarea
                name="features"
                value={newPlan.features}
                onChange={handleInputChange}
                placeholder="Feature 1, Feature 2, Feature 3"
                rows="3"
              />
            </div>
            <button type="submit" className="submit-btn">Create Plan</button>
          </form>
        </div>
      ) : (
        <div className="card plan-form-container">
          <h3>Edit Plan</h3>
          <form onSubmit={handleUpdatePlan} className="plan-form">
            <div className="form-group">
              <label>Plan Name</label>
              <input
                type="text"
                name="name"
                value={editingPlan.name}
                onChange={(e) => handleInputChange(e, true)}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={editingPlan.description}
                onChange={(e) => handleInputChange(e, true)}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={editingPlan.price}
                onChange={(e) => handleInputChange(e, true)}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input
                type="number"
                name="duration_days"
                value={editingPlan.duration_days}
                onChange={(e) => handleInputChange(e, true)}
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Features (comma separated)</label>
              <textarea
                name="features"
                value={editingPlan.features}
                onChange={(e) => handleInputChange(e, true)}
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Update Plan</button>
              <button type="button" className="btn btn-secondary" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="plans-table-container card">
        <h3>All Plans</h3>
        {plans.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className={!plan.is_active ? 'inactive-plan' : ''}>
                    <td>{plan.id}</td>
                    <td>{plan.name}</td>
                    <td>${plan.price.toFixed(2)}</td>
                    <td>{plan.duration_days} days</td>
                    <td>
                      <span className={plan.is_active ? 'status-active' : 'status-inactive'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button onClick={() => startEditing(plan)} className="edit-btn">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleActive(plan.id, plan.is_active)}
                        className={plan.is_active ? 'deactivate-btn' : 'activate-btn'}
                      >
                        {plan.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDeletePlan(plan.id)} className="delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No plans found.</p>
        )}
      </div>
    </div>
  );
};

export default ManagePlans;
