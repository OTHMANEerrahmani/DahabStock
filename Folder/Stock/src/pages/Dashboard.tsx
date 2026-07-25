import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Package, AlertCircle, Scissors, TrendingDown, Trash2 } from 'lucide-react';

interface DashboardStats {
  total_materiaux: number;
  stock_faible: number;
  total_chutes: number;
  consommations_aujourdhui: number;
  pertes_aujourdhui: number;
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
      
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span>Nombre de Matériaux</span>
            <div className="icon-wrapper"><Package className="icon-blue" size={24} /></div>
          </div>
          <div className="stat-card-value">{stats?.total_materiaux || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Stock Faible</span>
            <div className="icon-wrapper"><AlertCircle className="icon-red" size={24} /></div>
          </div>
          <div className="stat-card-value">{stats?.stock_faible || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Nombre de Chutes</span>
            <div className="icon-wrapper"><Scissors className="icon-yellow" size={24} /></div>
          </div>
          <div className="stat-card-value">{stats?.total_chutes || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Consommations (Auj.)</span>
            <div className="icon-wrapper"><TrendingDown className="icon-green" size={24} /></div>
          </div>
          <div className="stat-card-value">{stats?.consommations_aujourdhui || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Pertes (Auj.)</span>
            <div className="icon-wrapper"><Trash2 className="icon-purple" size={24} /></div>
          </div>
          <div className="stat-card-value">{stats?.pertes_aujourdhui || 0}</div>
        </div>
      </div>
    </div>
  );
}
