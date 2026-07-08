import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Scissors, AlertTriangle, FileText } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <aside className="sidebar">
          <h1>DahabStock</h1>
          <nav>
            <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink to="/stock" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Package size={20} /> Entrée Stock
            </NavLink>
            <NavLink to="/consommation" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Scissors size={20} /> Consommation
            </NavLink>
            <NavLink to="/pertes" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <AlertTriangle size={20} /> Pertes
            </NavLink>
            <NavLink to="/rapports" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={20} /> Rapports
            </NavLink>
          </nav>
        </aside>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock" element={<div className="page-title">Entrée Stock</div>} />
            <Route path="/consommation" element={<div className="page-title">Consommation</div>} />
            <Route path="/pertes" element={<div className="page-title">Pertes</div>} />
            <Route path="/rapports" element={<div className="page-title">Rapports</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
