import { Routes, Route } from 'react-router-dom';
import ClinicAdmin from './components/Admin/ClinicAdmin.tsx';
import ClinicCustomer from './components/Customer/ClinicCustomer.tsx';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/admin/:clinicSlug" element={<ClinicAdmin />} />
        <Route path="/:clinicSlug" element={<ClinicCustomer />} />
        <Route path="/" element={
          <div className="glass-card animate-fade-in">
            <h1 className="text-gradient">Appointment Management</h1>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              Select a persona to get started.
              (In a real app, you would log in or visit a specific clinic link)
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <a href="/admin/city-health" className="btn-primary" style={{ textDecoration: 'none' }}>Admin Dashboard</a>
              <a href="/city-health" className="btn-primary" style={{ textDecoration: 'none', background: 'var(--glass)' }}>Customer View Demo</a>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
