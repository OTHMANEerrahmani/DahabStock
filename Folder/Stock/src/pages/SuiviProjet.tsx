import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, ListChecks, CheckCircle, Clock, AlertCircle, X, Eye } from 'lucide-react';

interface ProjetStats {
  id: number;
  code_projet: string;
  statut: string;
  total_pieces: number;
  cout_total: number;
}

interface HistoriqueConsommation {
  id: number;
  date: string;
  reference: string;
  designation: string;
  projet: string;
  quantite_utilisee: number;
  longueur_utilisee: number;
  preneur: string;
  cout_total: number;
}

export default function SuiviProjet() {
  const [projets, setProjets] = useState<ProjetStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedProjet, setSelectedProjet] = useState<ProjetStats | null>(null);
  const [details, setDetails] = useState<HistoriqueConsommation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    fetchProjets();
  }, []);

  async function fetchProjets() {
    try {
      const res: string = await invoke('get_projets_suivi');
      const parsed = JSON.parse(res);
      if (parsed.status === 'success') {
        setProjets(parsed.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatut = async (p: ProjetStats) => {
    const nouveauStatut = p.statut === 'Terminé' ? 'En cours' : 'Terminé';
    try {
      const res: string = await invoke('update_projet_statut', {
        payload: JSON.stringify({ projet_id: p.id, statut: nouveauStatut })
      });
      const parsed = JSON.parse(res);
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: `Le statut du projet ${p.code_projet} a été mis à jour.` });
        fetchProjets();
        if (selectedProjet && selectedProjet.id === p.id) {
            setSelectedProjet({...selectedProjet, statut: nouveauStatut});
        }
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'error', msg: parsed.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) });
    }
  };

  const openDetails = async (p: ProjetStats) => {
    setSelectedProjet(p);
    setLoadingDetails(true);
    try {
      const res: string = await invoke('get_consommations_by_projet', { projetId: p.id });
      const parsed = JSON.parse(res);
      if (parsed.status === 'success') {
        setDetails(parsed.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredProjets = projets.filter(p => p.code_projet.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div><h2 className="page-title">Suivi Projet</h2><div className="loader"></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto'}}>
      
      {status && (
        <div style={{
          padding: '1rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          backgroundColor: status.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
          color: status.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
          fontWeight: 600
        }}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {status.msg}
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0'}}>Suivi des Projets</h2>
          <p style={{color: 'var(--text-secondary)', margin: 0}}>Contrôlez l'état et les coûts de consommation de vos projets</p>
        </div>
        
        <div style={{position: 'relative', width: '350px'}}>
          <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
          <input 
            type="text" 
            placeholder="Rechercher un projet (ex: P-2026-01)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{paddingLeft: '2.5rem', width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)'}}
          />
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'stretch'}}>
        {filteredProjets.map(p => {
          const isTermine = p.statut === 'Terminé';
          return (
            <div key={p.id} className="glass-panel" style={{margin: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box'}}>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem'}}>
                <div>
                  <div style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '0.2rem'}}>
                    Code Client
                  </div>
                  <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 800}}>{p.code_projet}</h3>
                  <span className="badge" style={{
                    backgroundColor: isTermine ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                    color: isTermine ? 'var(--success-color)' : '#d97706',
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                  }}>
                    {isTermine ? <CheckCircle size={14}/> : <Clock size={14}/>}
                    {p.statut}
                  </span>
                </div>
                
                <button 
                  onClick={() => handleToggleStatut(p)}
                  className={`badge ${isTermine ? 'btn-secondary' : 'btn-primary'}`}
                  style={{
                    padding: '0.4rem 0.75rem', cursor: 'pointer', border: 'none', 
                    backgroundColor: isTermine ? 'var(--input-bg)' : 'var(--danger-color)',
                    color: isTermine ? 'var(--text-secondary)' : 'white'
                  }}
                  title={isTermine ? "Rouvrir le projet" : "Marquer comme terminé"}
                >
                  {isTermine ? "Rouvrir" : "Terminer"}
                </button>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1}}>
                <div style={{backgroundColor: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-md)'}}>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem'}}>Pièces</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 700}}>{p.total_pieces}</div>
                </div>
                <div style={{backgroundColor: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-md)'}}>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem'}}>Coût Matière</div>
                  <div style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger-color)'}}>
                    {p.cout_total.toLocaleString('fr-FR', {style: 'currency', currency: 'MAD'})}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => openDetails(p)}
                className="btn-secondary" 
                style={{width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
              >
                <Eye size={18}/> Voir Détails
              </button>

            </div>
          )
        })}
        {filteredProjets.length === 0 && (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)'}}>
            <ListChecks size={48} style={{margin: '0 auto 1rem auto', opacity: 0.5}} />
            <h3 style={{margin: '0 0 0.5rem 0'}}>Aucun projet trouvé</h3>
            <p style={{margin: 0, fontSize: '0.9rem'}}>Essayez de modifier votre recherche.</p>
          </div>
        )}
      </div>

      {/* MODAL DETAILS PROJET */}
      {selectedProjet && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'flex-end', zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '800px', height: '100%', margin: 0, borderRadius: '24px 0 0 24px',
            overflowY: 'auto', position: 'relative', padding: '2rem 3rem'
          }}>
            <button 
              onClick={() => setSelectedProjet(null)}
              style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: '0.2s'}}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={24} />
            </button>
            
            <div style={{marginBottom: '2.5rem'}}>
              <div style={{fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '0.25rem'}}>
                Code Client
              </div>
              <h2 style={{fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0', fontFamily: 'monospace'}}>
                {selectedProjet.code_projet}
              </h2>
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <span className="badge" style={{backgroundColor: 'var(--input-bg)'}}>
                  Coût Total : {selectedProjet.cout_total.toLocaleString('fr-FR', {style: 'currency', currency: 'MAD'})}
                </span>
                <span className="badge" style={{backgroundColor: 'var(--input-bg)'}}>
                  Pièces Consommées : {selectedProjet.total_pieces}
                </span>
              </div>
            </div>

            {loadingDetails ? (
              <div className="loader" style={{margin: '4rem auto'}}></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Référence</th>
                    <th>Désignation</th>
                    <th>Preneur</th>
                    <th>Quantité</th>
                    <th>Coût Total</th>
                  </tr>
                </thead>
                <tbody>
                  {details.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                        Aucune consommation pour ce projet.
                      </td>
                    </tr>
                  ) : (
                    details.map((d) => (
                      <tr key={d.id}>
                        <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{d.date.substring(2)}</td>
                        <td style={{fontFamily: 'monospace', fontWeight: 600}}>{d.reference}</td>
                        <td>{d.designation}</td>
                        <td>{d.preneur}</td>
                        <td style={{fontWeight: 700, color: 'var(--danger-color)'}}>
                          -{d.quantite_utilisee ? `${d.quantite_utilisee} Unité(s)` : `${d.longueur_utilisee} m`}
                        </td>
                        <td style={{fontWeight: 700}}>
                          {d.cout_total.toLocaleString('fr-MA', {style: 'currency', currency: 'MAD'})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
