import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import Privacy from './pages/public/Privacy';
import ResetPassword from './pages/public/ResetPassword';
import Account from './pages/app/Account';
import PublicTracking from './pages/public/PublicTracking';
import NotFound from './pages/public/NotFound';
import Onboarding from './pages/app/Onboarding';
import AppLayout from './pages/app/AppLayout';
import Dashboard from './pages/app/Dashboard';
import Agenda from './pages/app/Agenda';
import AppointmentDetail from './pages/app/AppointmentDetail';
import Surveys from './pages/app/Surveys';
import Settings from './pages/app/Settings';
import { RequireAdmin, RequireMember } from './pages/app/guards';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/privacidad" element={<Privacy />} />
      <Route path="/restablecer" element={<ResetPassword />} />
      <Route path="/s/:token" element={<PublicTracking />} />
      <Route path="/bienvenida" element={<Onboarding />} />
      <Route path="/app" element={<RequireMember><AppLayout /></RequireMember>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="servicios/:id" element={<AppointmentDetail />} />
        <Route path="encuestas" element={<RequireAdmin><Surveys /></RequireAdmin>} />
        <Route path="cuenta" element={<Account />} />
        <Route path="configuracion" element={<RequireAdmin><Settings /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
