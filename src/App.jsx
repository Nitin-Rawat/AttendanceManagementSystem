import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import AddEmployee from "./components/AddEmployee";
import ScanQR from "./components/ScanQR";
import AttendanceLogs from "./components/AttendanceLogs";
import EmployeeStats from "./components/EmployeeStats";
import EmployeeDetails from "./components/EmployeeDetails";
import LoginPage from "./components/LoginPage";
import authService from "./Appwrite/auth";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Simple Protected Route component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <main
          className={`${user ? "container mx-auto px-4 py-8" : "min-h-screen"}`}
        >
          <Routes>
            {/* Public route - Login */}
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
                )
              }
            />

            {/* All other routes are protected - require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/scan-qr"
              element={
                <ProtectedRoute>
                  <ScanQR />
                </ProtectedRoute>
              }
            />

            <Route
              path="/add-employee"
              element={
                <ProtectedRoute>
                  <AddEmployee />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance-logs"
              element={
                <ProtectedRoute>
                  <AttendanceLogs />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employee-stats"
              element={
                <ProtectedRoute>
                  <EmployeeStats />
                </ProtectedRoute>
              }
            />

            <Route
              path="/employeeDetail"
              element={
                <ProtectedRoute>
                  <EmployeeDetails />
                </ProtectedRoute>
              }
            />

            {/* Redirect unmatched routes */}
            <Route
              path="*"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
