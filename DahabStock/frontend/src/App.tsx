import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Scissors, AlertTriangle, FileText, Database } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import EntreeStock from './pages/EntreeStock';
import Catalogue from './pages/Catalogue';
import Consommation from './pages/Consommation';
import StockChutes from './pages/StockChutes';
import Pertes from './pages/Pertes';
import SuiviProjet from './pages/SuiviProjet';
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
            <NavLink to="/catalogue" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Database size={20} /> Catalogue des Pièces
            </NavLink>
            <NavLink to="/stock" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Package size={20} /> Entrée Stock
            </NavLink>
            <NavLink to="/consommation" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Scissors size={20} /> Consommation
            </NavLink>
            <NavLink to="/chutes" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Scissors size={20} style={{transform: 'rotate(90deg)'}}/> Stock Chutes
            </NavLink>
            <NavLink to="/pertes" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <AlertTriangle size={20} /> Pertes
            </NavLink>
            <NavLink to="/suivi-projet" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={20} /> Suivi Projet
            </NavLink>
            <NavLink to="/rapports" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <Database size={20} /> Rapports
            </NavLink>
          </nav>
        </aside>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/stock" element={<EntreeStock />} />
            <Route path="/consommation" element={<Consommation />} />
            <Route path="/chutes" element={<StockChutes />} />
            <Route path="/pertes" element={<Pertes />} />
            <Route path="/suivi-projet" element={<SuiviProjet />} />
            <Route path="/rapports" element={<div className="page-title">Rapports</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
