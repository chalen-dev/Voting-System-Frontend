// File: src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/routes/ProtectedRoute';
import GuestRoute from './components/routes/GuestRoute';

// Components
import LoadingScreen from './components/ui/LoadingScreen'; // 1. Import new component

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import PollList from './pages/polls/PollList.tsx';
import PollOptionsManager from './pages/polls/PollOptionsManager.tsx';
import Ballot from './pages/ballot/Ballot';

export default function App() {
    const { isAuthenticated, loading } = useAuth();

    // 2. Simple, clean conditional return
    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <Routes>
                <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

                <Route element={<GuestRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/polls" element={<PollList />} />
                        <Route path="/polls/:pollId/manage" element={<PollOptionsManager />} />
                        <Route path="/ballot/:id" element={<Ballot />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}