import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Package, AlertCircle, Scissors, TrendingDown, Trash2, Wallet, Layers, Component } from 'lucide-react';

interface DashboardStats {
  total_materiaux: number;
  stock_faible: number;
  total_chutes: number;
  consommations_aujourdhui: number;
  pertes_aujourdhui: number;
  valeur_accessoires: number;
  valeur_barres: number;
}

interface PythonResponse {
  status: string;
  data?: DashboardStats;
  error?: string;
  traceback?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response: string = await invoke('get_dashboard_stats');
        const parsed: PythonResponse = JSON.parse(response);

        if (parsed.status === 'success' && parsed.data) {
          setStats(parsed.data);
        } else {
          setError(parsed.error || 'Unknown error from Python sidecar');
          console.error(parsed.traceback);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="page-title">Dashboard</h2>
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="page-title">Dashboard</h2>
        <div style={{ color: 'var(--danger-color)', padding: '1rem', border: '1px solid var(--danger-color)', borderRadius: '8px' }}>
          Error loading dashboard data: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      
      {/* Premium ERP Financial Cards */}
      <div className="financial-grid">
        <div className="stat-card-finance theme-blue">
          <div className="stat-card-finance-header">
            <span>Valeur Accessoires</span>
            <div className="icon-finance"><Component size={28} strokeWidth={2.5} /></div>
          </div>
          <div className="stat-card-finance-value">
            {stats?.valeur_accessoires != null 
              ? <>{new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stats.valeur_accessoires)} <span className="currency-label">MAD</span></>
              : <>0,00 <span className="currency-label">MAD</span></>}
          </div>
        </div>

        <div className="stat-card-finance theme-yellow">
          <div className="stat-card-finance-header">
            <span>Valeur Barres Aluminium</span>
            <div className="icon-finance"><Layers size={28} strokeWidth={2.5} /></div>
          </div>
          <div className="stat-card-finance-value">
            {stats?.valeur_barres != null 
              ? <>{new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stats.valeur_barres)} <span className="currency-label">MAD</span></>
              : <>0,00 <span className="currency-label">MAD</span></>}
          </div>
        </div>

        <div className="stat-card-finance theme-green">
          <div className="stat-card-finance-header">
            <span>Valeur Totale du Stock</span>
            <div className="icon-finance"><Wallet size={28} strokeWidth={2.5} /></div>
          </div>
          <div className="stat-card-finance-value">
            {stats?.valeur_accessoires != null && stats?.valeur_barres != null
              ? <>{new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stats.valeur_accessoires + stats.valeur_barres)} <span className="currency-label">MAD</span></>
              : <>0,00 <span className="currency-label">MAD</span></>}
          </div>
        </div>
      </div>

      {/* Standard Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card-finance">
          <div className="stat-card-finance-header">
            <span>Nombre total de références</span>
            <div className="icon-wrapper blue"><Package size={24} /></div>
          </div>
          <div className="stat-card-finance-value">{stats?.total_materiaux || 0}</div>
        </div>

        <div className="stat-card-finance">
          <div className="stat-card-finance-header">
            <span>Stock Faible</span>
            <div className="icon-wrapper red"><AlertCircle size={24} /></div>
          </div>
          <div className="stat-card-finance-value">
            {stats?.stock_faible || 0}
            <span className="stat-card-subtitle">articles à réapprovisionner</span>
          </div>
          <div style={{ marginTop: 'auto', textAlign: 'right' }}>
            <Link to="/catalogue" className="btn-voir">Voir</Link>
          </div>
        </div>

        <div className="stat-card-finance">
          <div className="stat-card-finance-header">
            <span>Stock des chutes</span>
            <div className="icon-wrapper yellow"><Scissors size={24} /></div>
          </div>
          <div className="stat-card-finance-value">
            {stats?.total_chutes || 0}
            <span className="stat-card-subtitle">chutes disponibles</span>
          </div>
        </div>

        <div className="stat-card-finance">
          <div className="stat-card-finance-header">
            <span>Consommations aujourd'hui</span>
            <div className="icon-wrapper blue"><TrendingDown size={24} /></div>
          </div>
          <div className="stat-card-finance-value">{stats?.consommations_aujourdhui || 0}</div>
        </div>

        <div className="stat-card-finance">
          <div className="stat-card-finance-header">
            <span>Pertes aujourd'hui</span>
            <div className="icon-wrapper red"><Trash2 size={24} /></div>
          </div>
          <div className="stat-card-finance-value">{stats?.pertes_aujourdhui || 0}</div>
        </div>
      </div>
    </div>
  );
}
