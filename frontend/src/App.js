import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import './App.css';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Plans from './pages/Plans';
import UserSubscriptions from './pages/UserSubscriptions';
import AllSubscriptions from './pages/AllSubscriptions';
import NotFound from './pages/NotFound';

import ManageUsers from './pages/ManageUsers';
import ManagePlans from './pages/ManagePlans';

// Protected route component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/plans" 
                element={
                  <ProtectedRoute requireAdmin>
                    <ManagePlans />
                  </ProtectedRoute>
                } 
              />
              <Route path="/plans" element={<Plans />} />
              <Route 
                path="/subscriptions" 
                element={
                  <ProtectedRoute>
                    <UserSubscriptions />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/all-subscriptions" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AllSubscriptions />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
