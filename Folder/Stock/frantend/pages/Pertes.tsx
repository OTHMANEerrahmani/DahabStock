import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertTriangle, CheckCircle, AlertCircle, X, Search } from 'lucide-react';

interface Materiau {
  materiau_id: number;
  reference: string;
  designation: string;
  type_article: string;
}

interface Chute {
  chute_id: number;
  materiau_id: number;
  reference: string;
  designation: string;
  longueur: number;
}

interface HistoriquePerte {
  perte_id: number;
  date_declaration: string;
  reference: string;
  designation: string;
  source_stock: string;
  raison: string;
  quantite_perdue: number;
}

export default function Pertes() {
  const [materiaux, setMateriaux] = useState<Materiau[]>([]);
  const [chutes, setChutes] = useState<Chute[]>([]);
  const [historique, setHistorique] = useState<HistoriquePerte[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [typePerte, setTypePerte] = useState<'Standard' | 'Barre' | 'Chute'>('Standard');
  const [materiauRef, setMateriauRef] = useState<string>(''); // For Standard/Barre
  const [selectedChuteId, setSelectedChuteId] = useState<string>(''); // For Chute
  const [valeur, setValeur] = useState<number>(1);
  const [raison, setRaison] = useState<string>('');
  
  const motifs = ["Défaut fournisseur", "Erreur de coupe", "Cassé", "Autre"];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const resM: string = await invoke('get_materiaux');
      const parsedM = JSON.parse(resM);
      if (parsedM.status === 'success') setMateriaux(parsedM.data);

      const resC: string = await invoke('get_stock_chutes');
      const parsedC = JSON.parse(resC);
      if (parsedC.status === 'success') setChutes(parsedC.data);

      const resH: string = await invoke('get_historique_pertes');
      const parsedH = JSON.parse(resH);
      if (parsedH.status === 'success') setHistorique(parsedH.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const selectedMateriau = materiaux.find(m => m.reference.toLowerCase() === materiauRef.toLowerCase());
  const isFormValid = () => {
    if (!raison.trim()) return false;
    if (typePerte === 'Chute') {
      return selectedChuteId !== '';
    } else {
      return selectedMateriau !== undefined && valeur > 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setSubmitting(true);
    setStatus(null);

    try {
      let payload: any = {
        type_perte: typePerte,
        raison: raison,
      };

      if (typePerte === 'Chute') {
        payload.chute_id = parseInt(selectedChuteId);
        // Find the length of the chute for the payload
        const chute = chutes.find(c => c.chute_id === payload.chute_id);
        payload.quantite_ou_longueur = chute ? chute.longueur : 0;
      } else {
        payload.materiau_id = selectedMateriau?.materiau_id;
        payload.quantite_ou_longueur = valeur;
      }

      const response: string = await invoke('submit_perte', { payload: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        setMateriauRef('');
        setSelectedChuteId('');
        setValeur(1);
        setRaison('');
        setTimeout(() => {
          setIsModalOpen(false);
          setStatus(null);
          fetchData();
        }, 1500);
      } else {
        setStatus({ type: 'error', msg: parsed.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div><h2 className="page-title">Pertes et Rebuts</h2><div className="loader"></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto'}}>
      
      <div style={{display: 'flex', justifyContent: 'flex-start', marginBottom: '2.5rem'}}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass-panel" 
          style={{padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', margin: 0, minWidth: '350px'}}
        >
          <div className="icon-wrapper red">
            <AlertTriangle size={28} />
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--danger-color)'}}>Déclarer une Perte</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Casse, défaut ou rebut</span>
          </div>
        </button>
      </div>

      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: 800, margin: 0}}>Historique des Pertes</h2>
          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
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
              <th>Source</th>
              <th>Motif</th>
              <th>Quantité/Longueur</th>
            </tr>
          </thead>
          <tbody>
            {historique.length === 0 ? (
              <tr>
                <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Aucune perte trouvée.
                </td>
              </tr>
            ) : (
              historique.map((h) => (
                <tr key={h.perte_id}>
                  <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{h.date_declaration.substring(2)}</td>
                  <td style={{fontFamily: 'monospace', fontWeight: 600}}>{h.reference}</td>
                  <td>{h.designation}</td>
                  <td>
                    <span className="badge" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)'}}>
                      {h.source_stock === 'StockChutes' ? 'Chute' : 'Stock Principal'}
                    </span>
                  </td>
                  <td>{h.raison}</td>
                  <td style={{fontWeight: 700, color: 'var(--danger-color)'}}>
                    -{h.quantite_perdue} {h.source_stock === 'StockChutes' ? 'm' : 'Unité(s)'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', margin: '2rem', padding: '3rem'}}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: '0.2s'}}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={24} />
            </button>
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 2rem 0', letterSpacing: '-0.5px'}}>Déclarer une Perte</h2>
            
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

            <form onSubmit={handleSubmit}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem'}}>
                <div>
                  <label>Type d'article perdu</label>
                  <select value={typePerte} onChange={e => setTypePerte(e.target.value as any)}>
                    <option value="Standard">Accessoire / Profilé Standard</option>
                    <option value="Barre">Barre Aluminium Entière</option>
                    <option value="Chute">Chute Déjà Entamée</option>
                  </select>
                </div>

                {typePerte === 'Chute' ? (
                  <div>
                    <label>Sélectionner la Chute</label>
                    <select value={selectedChuteId} onChange={e => setSelectedChuteId(e.target.value)}>
                      <option value="">-- Choisir une chute --</option>
                      {chutes.map(c => (
                        <option key={c.chute_id} value={c.chute_id}>
                          {c.reference} - {c.designation} ({c.longueur} m)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label>Article à déclarer (Référence)</label>
                    <input 
                      type="text"
                      list="materiaux-list-perte"
                      value={materiauRef}
                      onChange={e => setMateriauRef(e.target.value)}
                      placeholder="Code de l'article (ex: KC-400)"
                      style={{borderColor: (materiauRef !== '' && !selectedMateriau) ? 'var(--danger-color)' : ''}}
                    />
                    <datalist id="materiaux-list-perte">
                      {materiaux.filter(m => typePerte === 'Barre' ? m.type_article === 'Barre Aluminium' : true).map(m => (
                        <option key={m.materiau_id} value={m.reference}>{m.designation}</option>
                      ))}
                    </datalist>
                    {materiauRef !== '' && !selectedMateriau && (
                      <div style={{marginTop: '0.5rem', color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <AlertCircle size={14} /> Article inconnu.
                      </div>
                    )}
                  </div>
                )}

                {typePerte !== 'Chute' && (
                  <div>
                    <label>Quantité Perdue {typePerte === 'Barre' && '(Nombre de barres)'}</label>
                    <input 
                      type="number" min="1" step="1"
                      value={valeur}
                      onChange={e => setValeur(Number(e.target.value))}
                    />
                  </div>
                )}
                
                <div>
                  <label>Raison / Motif</label>
                  <input 
                    type="text"
                    list="motifs-list"
                    value={raison} 
                    onChange={e => setRaison(e.target.value)} 
                    placeholder="Sélectionnez ou tapez un motif..."
                    required
                  />
                  <datalist id="motifs-list">
                    {motifs.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={submitting || !isFormValid()} style={{backgroundColor: 'var(--danger-color)'}}>
                  {submitting ? 'Enregistrement...' : "Déclarer Perte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
