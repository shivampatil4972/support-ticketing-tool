import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import DashboardLayout from "../layouts/DashboardLayout";

import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import DashboardPage from "../pages/DashboardPage";
import AssignedTicketsPage from "../pages/AssignedTicketsPage";
import UnassignedTicketsPage from "../pages/UnassignedTicketsPage";
import TicketFormPage from "../pages/TicketFormPage";
import TicketDetailsPage from "../pages/TicketDetailsPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import AdminClientsPage from "../pages/AdminClientsPage";
import AdminPerformancePage from "../pages/AdminPerformancePage";
import TicketsPage from "../pages/TicketsPage";
import ProfilePage from "../pages/ProfilePage";

import Loader from "../components/Loader";

// ==========================================
// Protected Route
// ==========================================

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ==========================================
// Home Redirect
// ==========================================

const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "agent") {
    return <Navigate to="/tickets/assigned" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// ==========================================
// App Routes
// ==========================================

const AppRoutes = () => {
  return (
    <Routes>
      {/* ==========================================
          Public Routes
          ========================================== */}

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* ==========================================
          Protected Routes
          ========================================== */}

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Home */}
        <Route index element={<HomeRedirect />} />

        {/* ==========================================
            Dashboard
            ========================================== */}

        <Route path="dashboard" element={<DashboardPage />} />

        {/* ==========================================
            Full Ticket List
            Client / Admin
            ========================================== */}

        <Route
          path="tickets"
          element={
            <ProtectedRoute allowedRoles={["client", "admin"]}>
              <TicketsPage />
            </ProtectedRoute>
          }
        />

        {/* ==========================================
            Agent Routes
            ========================================== */}

        <Route
          path="tickets/assigned"
          element={
            <ProtectedRoute allowedRoles={["agent"]}>
              <AssignedTicketsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="tickets/unassigned"
          element={
            <ProtectedRoute allowedRoles={["agent"]}>
              <UnassignedTicketsPage />
            </ProtectedRoute>
          }
        />

        {/* ==========================================
            Client Routes
            ========================================== */}

        <Route
          path="tickets/new"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <TicketFormPage />
            </ProtectedRoute>
          }
        />

        {/* ==========================================
            Ticket Details
            Client / Agent / Admin
            ========================================== */}

        <Route
          path="tickets/:id"
          element={
            <ProtectedRoute allowedRoles={["client", "agent", "admin"]}>
              <TicketDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* ==========================================
            Admin Routes
            ========================================== */}

        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/performance"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPerformancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/clients"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminClientsPage />
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="profile"
          element={
            <ProtectedRoute allowedRoles={["client", "agent", "admin"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ==========================================
          Unknown Route
          ========================================== */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;