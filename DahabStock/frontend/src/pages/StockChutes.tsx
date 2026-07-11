import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Scissors } from 'lucide-react';

interface ChuteInfo {
  chute_id: number;
  date_creation: string;
  reference: string;
  designation: string;
  longueur_restante: number;
  statut: string;
}

export default function StockChutes() {
  const [chutes, setChutes] = useState<ChuteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res: string = await invoke('get_stock_chutes');
        const parsed = JSON.parse(res);
        if (parsed.status === 'success') {
          setChutes(parsed.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div><h2 className="page-title">Stock Chutes</h2><div className="loader"></div></div>;

  const filteredChutes = chutes.filter(c => 
    c.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.statut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto'}}>
      
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem'}}>
        <div className="icon-wrapper red" style={{margin: 0}}>
          <Scissors size={28} />
        </div>
        <div>
          <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)'}}>Stock des Chutes</h2>
          <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Visualisation des restes de barres d'aluminium</span>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <div style={{display: 'flex', gap: '1rem'}}>
            <span className="badge" style={{backgroundColor: 'var(--success-light)', color: 'var(--success-color)'}}>
              {chutes.filter(c => c.statut === 'Disponible').length} Disponibles
            </span>
            <span className="badge" style={{backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)'}}>
              {chutes.filter(c => c.statut === 'Consommee').length} Consommées
            </span>
          </div>

          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
            <input 
              type="text" 
              placeholder="Rechercher une référence ou un statut..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{paddingLeft: '2.5rem'}}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Désignation</th>
              <th>L. Restante</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filteredChutes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Aucune chute trouvée.
                </td>
              </tr>
            ) : (
              filteredChutes.map((c) => (
                <tr key={c.chute_id}>
                  <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{c.date_creation.substring(2)}</td>
                  <td style={{fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)'}}>{c.reference}</td>
                  <td>{c.designation}</td>
                  <td style={{fontWeight: 700}}>
                    <span style={{color: c.longueur_restante > 2 ? 'var(--success-color)' : 'var(--text-primary)'}}>
                      {c.longueur_restante} m
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: c.statut === 'Disponible' ? 'var(--success-light)' : 'var(--input-bg)',
                      color: c.statut === 'Disponible' ? 'var(--success-color)' : 'var(--text-tertiary)',
                      border: c.statut === 'Disponible' ? 'none' : '1px solid var(--border-color)'
                    }}>
                      {c.statut}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
