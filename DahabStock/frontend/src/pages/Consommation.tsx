import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Scissors, CheckCircle, AlertCircle, X, Search, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Projet {
  id: number;
  code_projet: string;
  statut: string;
}

interface Materiau {
  materiau_id: number;
  reference: string;
  designation: string;
  type_article: string;
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
}

export default function Consommation() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [materiaux, setMateriaux] = useState<Materiau[]>([]);
  const [historique, setHistorique] = useState<HistoriqueConsommation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [projetCode, setProjetCode] = useState<string>('');
  const [materiauRef, setMateriauRef] = useState<string>('');
  const [valeur, setValeur] = useState<number>(1);
  const [preneur, setPreneur] = useState<string>('');
  
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const resP: string = await invoke('get_projets');
        const parsedP = JSON.parse(resP);
        if (parsedP.status === 'success') setProjets(parsedP.data);

        const resM: string = await invoke('get_materiaux');
        const parsedM = JSON.parse(resM);
        if (parsedM.status === 'success') setMateriaux(parsedM.data);

        const resH: string = await invoke('get_historique_consommations');
        const parsedH = JSON.parse(resH);
        if (parsedH.status === 'success') setHistorique(parsedH.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedMateriau = materiaux.find(m => m.reference.toLowerCase() === materiauRef.toLowerCase());
  const selectedProjet = projets.find(p => p.code_projet.toLowerCase() === projetCode.toLowerCase());
  const isProjetTermine = selectedProjet?.statut === 'Terminé';
  const isBarre = selectedMateriau?.type_article === 'Barre Aluminium';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projetCode.trim() || !materiauRef.trim() || valeur <= 0 || !preneur.trim()) {
      setStatus({ type: 'error', msg: 'Veuillez remplir correctement tous les champs obligatoires.' });
      return;
    }

    if (!selectedMateriau) {
      setStatus({ type: 'error', msg: `L'article avec le code ${materiauRef} n'existe pas dans le catalogue.` });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let commandName = isBarre ? 'submit_consommation_barre' : 'submit_consommation_standard';
      let payload = {
        code_projet: projetCode,
        materiau_id: selectedMateriau.materiau_id,
        [isBarre ? 'longueur_a_couper' : 'quantite']: valeur,
        preneur: preneur
      };

      const response: string = await invoke(commandName, { payload: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        setMateriauRef('');
        setValeur(1);
        setPreneur('');
        setTimeout(() => {
          setIsModalOpen(false);
          setStatus(null);
          // Refetch history
          invoke('get_historique_consommations').then((resH: any) => {
            const parsedH = JSON.parse(resH);
            if (parsedH.status === 'success') setHistorique(parsedH.data);
          });
          // Refetch projets in case a new one was created
          invoke('get_projets').then((resP: any) => {
             const parsedP = JSON.parse(resP);
             if (parsedP.status === 'success') setProjets(parsedP.data);
          });
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

  if (loading) return <div><h2 className="page-title">Consommation</h2><div className="loader"></div></div>;

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto'}}>
      
      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '2.5rem'}}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass-panel" 
          style={{padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', margin: 0}}
        >
          <div className="icon-wrapper red">
            <Scissors size={28} />
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--danger-color)'}}>Nouvelle Consommation</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Retirer du stock</span>
          </div>
        </button>

        <button 
          className="glass-panel" 
          style={{padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'not-allowed', margin: 0, opacity: 0.6}}
          disabled
        >
          <div className="icon-wrapper" style={{backgroundColor: 'var(--input-bg)'}}>
            <FileText size={28} color="var(--text-tertiary)" />
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-secondary)'}}>Importer une Demande (Excel)</h3>
            <span style={{fontSize: '0.85rem', color: 'var(--text-tertiary)'}}>Extraction automatique (Bientôt)</span>
          </div>
        </button>
      </div>

      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: 800, margin: 0}}>Historique des Consommations</h2>
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
              <th>Projet</th>
              <th>Référence</th>
              <th>Désignation</th>
              <th>Preneur</th>
              <th>Consommé</th>
            </tr>
          </thead>
          <tbody>
            {historique.length === 0 ? (
              <tr>
                <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Aucune consommation trouvée.
                </td>
              </tr>
            ) : (
              historique.map((h) => (
                <tr key={h.id}>
                  <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{h.date.substring(2)}</td>
                  <td>
                    <span className="badge" style={{backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
                      {h.projet}
                    </span>
                  </td>
                  <td style={{fontFamily: 'monospace', fontWeight: 600}}>{h.reference}</td>
                  <td>{h.designation}</td>
                  <td>{h.preneur}</td>
                  <td style={{fontWeight: 700, color: 'var(--danger-color)'}}>
                    -{h.quantite_utilisee ? `${h.quantite_utilisee} Unité(s)` : `${h.longueur_utilisee} m`}
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
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 2rem 0', letterSpacing: '-0.5px'}}>Consommer du Stock</h2>
            
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
                  <label>Code Client (Projet)</label>
                  <input 
                    type="text"
                    list="projets-list"
                    value={projetCode} 
                    onChange={e => setProjetCode(e.target.value)}
                    placeholder="Sélectionnez ou créez un code client..."
                  />
                  <datalist id="projets-list">
                    {projets.map(p => (
                      <option key={p.id} value={p.code_projet} />
                    ))}
                  </datalist>
                  {isProjetTermine ? (
                    <div style={{marginTop: '0.5rem', color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <AlertCircle size={14} /> Ce projet est terminé. Vous ne pouvez plus consommer de matière dessus.
                    </div>
                  ) : (
                    <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem'}}>
                      S'il n'existe pas, tapez un nouveau nom, il sera créé automatiquement.
                    </span>
                  )}
                </div>
                
                <div>
                  <label>Article à consommer</label>
                  <input 
                    type="text"
                    list="materiaux-list"
                    value={materiauRef}
                    onChange={e => setMateriauRef(e.target.value)}
                    placeholder="Code de l'article (ex: KC-400)"
                    style={{borderColor: (materiauRef !== '' && !selectedMateriau) ? 'var(--danger-color)' : ''}}
                  />
                  <datalist id="materiaux-list">
                    {materiaux.map(m => (
                      <option key={m.materiau_id} value={m.reference}>{m.designation}</option>
                    ))}
                  </datalist>
                  {materiauRef !== '' && !selectedMateriau && (
                    <div style={{marginTop: '0.5rem', color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <AlertCircle size={14} /> Article inconnu. <Link to="/catalogue" style={{color: 'var(--primary-color)', textDecoration: 'underline'}}>Créer au catalogue</Link>
                    </div>
                  )}
                </div>

                {selectedMateriau && (
                  <div>
                    <label>{isBarre ? 'Longueur à couper (mètres)' : 'Quantité (unités)'}</label>
                    <input 
                      type="number" min="0" step={isBarre ? "0.01" : "1"}
                      value={valeur}
                      onChange={e => setValeur(Number(e.target.value))}
                    />
                    {isBarre && (
                      <div style={{marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37, 99, 235, 0.1)', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                        <strong>Note:</strong> Le système gère automatiquement les chutes.
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <label>Nom du Preneur / Ouvrier</label>
                  <input 
                    type="text" 
                    value={preneur} 
                    onChange={e => setPreneur(e.target.value)} 
                    placeholder="Qui a pris cette pièce ?"
                  />
                </div>
              </div>

              <div style={{marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={submitting || !selectedMateriau || isProjetTermine}>
                  {submitting ? 'Enregistrement...' : "Confirmer Consommation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
