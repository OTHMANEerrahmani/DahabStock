import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Scissors, CheckCircle, AlertCircle, X, Search, Archive } from 'lucide-react';

interface Projet {
  id: number;
  code_projet: string;
  statut: string;
}

interface CatalogueItem {
  materiau_id: number;
  reference: string;
  designation: string;
  type_item: string;
  categorie_ou_couleur: string;
  stock_actuel: number;
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
  source: string;
  operation_id?: string;
}

interface ChuteInfo {
  chute_id: number;
  date_creation: string;
  reference: string;
  designation: string;
  couleur?: string;
  longueur_restante: number;
  statut: string;
}

export default function Consommation() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [materiaux, setMateriaux] = useState<CatalogueItem[]>([]);
  const [historique, setHistorique] = useState<HistoriqueConsommation[]>([]);
  const [chutes, setChutes] = useState<ChuteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalMode, setModalMode] = useState<'principal' | 'chutes' | null>(null);
  
  const [projetCode, setProjetCode] = useState<string>('');
  const [materiauRef, setMateriauRef] = useState<string>('');
  const [couleur, setCouleur] = useState<string>('');
  const [valeur, setValeur] = useState<number | ''>(''); // Quantité standard
  const [quantiteBarres, setQuantiteBarres] = useState<number>(1); 
  const [preneur, setPreneur] = useState<string>('');
  const [dateConsommation, setDateConsommation] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedChuteId, setSelectedChuteId] = useState<number | ''>('');
  
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const resP: string = await invoke('get_projets');
        const parsedP = JSON.parse(resP);
        if (parsedP.status === 'success') setProjets(parsedP.data);

        const resM: string = await invoke('get_catalogue_complet');
        const parsedM = JSON.parse(resM);
        if (parsedM.status === 'success') setMateriaux(parsedM.data);

        const resH: string = await invoke('get_historique_consommations');
        const parsedH = JSON.parse(resH);
        if (parsedH.status === 'success') setHistorique(parsedH.data);
        
        const resC: string = await invoke('get_stock_chutes');
        const parsedC = JSON.parse(resC);
        if (parsedC.status === 'success') setChutes(parsedC.data.filter((c: ChuteInfo) => c.statut === 'Disponible'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const matchingMateriaux = materiaux.filter(m => m.reference.toLowerCase() === materiauRef.toLowerCase());
  const isBarre = matchingMateriaux.length > 0 && matchingMateriaux[0].type_item === 'Aluminium';
  
  const selectedMateriau = isBarre 
    ? matchingMateriaux.find(m => m.categorie_ou_couleur === couleur)
    : matchingMateriaux[0];

  const stockDisponible = selectedMateriau ? selectedMateriau.stock_actuel : 0;
  const isRupture = isBarre && selectedMateriau && stockDisponible === 0;
  const isInsuffisant = isBarre && selectedMateriau && quantiteBarres > stockDisponible;

  let valeurError = '';
  if (modalMode === 'principal') {
    if (!isBarre && valeur === '') {
      valeurError = 'Veuillez saisir la quantité.';
    } else if (!isBarre && (valeur as number) <= 0) {
      valeurError = 'La valeur doit être > 0.';
    }
  }

  useEffect(() => {
    if (matchingMateriaux.length > 0 && isBarre) {
      if (!matchingMateriaux.find(m => m.categorie_ou_couleur === couleur)) {
        setCouleur(matchingMateriaux[0].categorie_ou_couleur);
      }
    } else {
      setCouleur('');
    }
  }, [materiauRef, isBarre]);

  const selectedProjet = projets.find(p => p.code_projet.toLowerCase() === projetCode.toLowerCase());
  const isProjetTermine = selectedProjet?.statut === 'Terminé';

  const handleSubmitPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projetCode.trim() || !materiauRef.trim() || (!isBarre && (valeur === '' || valeurError !== '')) || !preneur.trim() || (isBarre && quantiteBarres <= 0)) {
      setStatus({ type: 'error', msg: 'Veuillez remplir correctement tous les champs obligatoires.' });
      return;
    }

    if (!selectedMateriau) {
      setStatus({ type: 'error', msg: `L'article sélectionné n'existe pas ou la couleur est invalide.` });
      return;
    }

    if (isRupture || isInsuffisant) {
      setStatus({ type: 'error', msg: 'Vérifiez le stock disponible.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let commandName = isBarre ? 'submit_consommation_barre' : 'submit_consommation_standard';
      let payload: any = {
        code_projet: projetCode,
        materiau_id: selectedMateriau.materiau_id,
        preneur: preneur,
        date_consommation: dateConsommation
      };
      
      if (isBarre) {
        payload.quantite = quantiteBarres;
      } else {
        payload.quantite = valeur as number;
      }

      const response: string = await invoke(commandName, { payload: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        resetForm();
      } else {
        setStatus({ type: 'error', msg: parsed.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitChute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projetCode.trim() || selectedChuteId === '' || !preneur.trim() || !dateConsommation) {
      setStatus({ type: 'error', msg: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let payload = {
        code_projet: projetCode,
        chute_id: Number(selectedChuteId),
        preneur: preneur,
        date_consommation: dateConsommation
      };

      const response: string = await invoke('submit_consommation_chute', { payload: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        resetForm();
      } else {
        setStatus({ type: 'error', msg: parsed.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMateriauRef('');
    setCouleur('');
    setValeur('');
    setQuantiteBarres(1);
    setPreneur('');
    setSelectedChuteId('');
    setTimeout(() => {
      setModalMode(null);
      setStatus(null);
      invoke('get_historique_consommations').then((res: any) => {
        const p = JSON.parse(res);
        if (p.status === 'success') setHistorique(p.data);
      });
      invoke('get_projets').then((res: any) => {
         const p = JSON.parse(res);
         if (p.status === 'success') setProjets(p.data);
      });
      invoke('get_catalogue_complet').then((res: any) => {
        const p = JSON.parse(res);
        if (p.status === 'success') setMateriaux(p.data);
      });
      invoke('get_stock_chutes').then((res: any) => {
        const p = JSON.parse(res);
        if (p.status === 'success') setChutes(p.data.filter((c: ChuteInfo) => c.statut === 'Disponible'));
      });
    }, 1500);
  };

  if (loading) return <div><h2 className="page-title">Consommation</h2><div className="loader"></div></div>;

  const uniqueMateriaux = Array.from(new Map(materiaux.map(m => [m.reference, m])).values());

  const groupedHistorique: HistoriqueConsommation[] = [];
  const processedOpIds = new Set<string>();

  for (const h of historique) {
    if (h.operation_id) {
      if (!processedOpIds.has(h.operation_id)) {
        processedOpIds.add(h.operation_id);
        const group = historique.filter(item => item.operation_id === h.operation_id);
        const groupedItem = { ...h };
        groupedItem.quantite_utilisee = group.reduce((sum, item) => sum + item.quantite_utilisee, 0);
        groupedItem.cout_total = group.reduce((sum, item) => sum + item.cout_total, 0);
        groupedHistorique.push(groupedItem);
      }
    } else {
      groupedHistorique.push(h);
    }
  }

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto'}}>
      
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem'}}>
        <button 
          onClick={() => setModalMode('principal')}
          className="glass-panel" 
          style={{padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', margin: 0, border: '1px solid rgba(239, 68, 68, 0.3)'}}
        >
          <div className="icon-wrapper red">
            <Scissors size={28} />
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--danger-color)'}}>Consommation du stock principal</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Déduire du stock (barres entières ou standard)</span>
          </div>
        </button>

        <button 
          onClick={() => setModalMode('chutes')}
          className="glass-panel" 
          style={{padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', margin: 0, border: '1px solid rgba(16, 185, 129, 0.3)'}}
        >
          <div className="icon-wrapper" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
            <Archive size={28} />
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#10b981'}}>Consommation des chutes</h3>
            <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Utiliser une chute disponible (stock principal inchangé)</span>
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
              <th>Source</th>
              <th>Preneur</th>
              <th>Consommé</th>
            </tr>
          </thead>
          <tbody>
            {groupedHistorique.length === 0 ? (
              <tr>
                <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Aucune consommation trouvée.
                </td>
              </tr>
            ) : (
              groupedHistorique.map((h) => (
                <tr key={h.id}>
                  <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{h.date.substring(2)}</td>
                  <td>
                    <span className="badge" style={{backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
                      {h.projet}
                    </span>
                  </td>
                  <td style={{fontFamily: 'monospace', fontWeight: 600}}>
                    {h.reference}
                    <div style={{fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 'normal'}}>{h.designation}</div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: h.source === 'Stock principal' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: h.source === 'Stock principal' ? 'var(--danger-color)' : '#10b981',
                      border: 'none'
                    }}>
                      {h.source}
                    </span>
                  </td>
                  <td>{h.preneur}</td>
                  <td style={{fontWeight: 700, color: 'var(--danger-color)'}}>
                    -{h.longueur_utilisee > 0 
                        ? (h.quantite_utilisee > 0 ? `${h.quantite_utilisee} ${h.quantite_utilisee > 1 ? 'barres' : 'barre'} (${h.longueur_utilisee}m)` : `${h.longueur_utilisee}m`) 
                        : `${h.quantite_utilisee} Unité(s)`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalMode !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', margin: '2rem', padding: '3rem'}}>
            <button 
              onClick={() => setModalMode(null)}
              style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: '0.2s'}}
            >
              <X size={24} />
            </button>
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 2rem 0', letterSpacing: '-0.5px'}}>
              {modalMode === 'principal' ? 'Consommer du Stock Principal' : 'Consommer une Chute'}
            </h2>
            
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

            <form onSubmit={modalMode === 'principal' ? handleSubmitPrincipal : handleSubmitChute}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem'}}>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div>
                    <label>Code Client (Projet)</label>
                    <input 
                      type="text"
                      list="projets-list"
                      value={projetCode} 
                      onChange={e => setProjetCode(e.target.value)}
                      placeholder="Sélectionnez ou créez un code..."
                    />
                    <datalist id="projets-list">
                      {projets.map(p => (
                        <option key={p.id} value={p.code_projet} />
                      ))}
                    </datalist>
                    {isProjetTermine && (
                      <div style={{marginTop: '0.5rem', color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <AlertCircle size={14} /> Projet terminé.
                      </div>
                    )}
                  </div>

                  <div>
                    <label>Date de consommation</label>
                    <input 
                      type="date" 
                      value={dateConsommation}
                      onChange={e => setDateConsommation(e.target.value)}
                      required
                      style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.95rem'}}
                    />
                  </div>
                </div>

                {modalMode === 'principal' ? (
                  <>
                    <div style={{display: 'grid', gridTemplateColumns: isBarre ? '2fr 1fr' : '1fr', gap: '1rem'}}>
                      <div>
                        <label>Article à consommer</label>
                        <input 
                          type="text"
                          list="materiaux-list"
                          value={materiauRef}
                          onChange={e => setMateriauRef(e.target.value)}
                          placeholder="Code de l'article (ex: KCL104)"
                          style={{borderColor: (materiauRef !== '' && matchingMateriaux.length === 0) ? 'var(--danger-color)' : ''}}
                        />
                        <datalist id="materiaux-list">
                          {uniqueMateriaux.map(m => (
                            <option key={m.reference} value={m.reference}>{m.designation}</option>
                          ))}
                        </datalist>
                        {materiauRef !== '' && matchingMateriaux.length === 0 && (
                          <div style={{marginTop: '0.5rem', color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <AlertCircle size={14} /> Article inconnu.
                          </div>
                        )}
                      </div>

                      {isBarre && (
                        <div>
                          <label>Couleur</label>
                          <select 
                            value={couleur}
                            onChange={e => setCouleur(e.target.value)}
                            style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--input-bg)'}}
                          >
                            {matchingMateriaux.map(m => (
                              <option key={m.materiau_id} value={m.categorie_ou_couleur}>{m.categorie_ou_couleur}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {isBarre && selectedMateriau && (
                      <div style={{
                        padding: '0.75rem 1rem', 
                        borderRadius: 'var(--radius-md)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: isRupture ? 'var(--danger-light)' : (isInsuffisant ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                        border: isRupture ? '1px solid rgba(239, 68, 68, 0.2)' : (isInsuffisant ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'),
                      }}>
                        <span style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)'}}>Stock disponible ({selectedMateriau.categorie_ou_couleur}) :</span>
                        <span style={{
                          fontSize: '1rem', fontWeight: 800,
                          color: isRupture ? 'var(--danger-color)' : (isInsuffisant ? '#d97706' : '#10b981')
                        }}>
                          {stockDisponible} barre(s)
                        </span>
                      </div>
                    )}
                    
                    {isRupture && (
                      <div style={{color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '-0.5rem'}}>
                        <AlertCircle size={14} /> Couleur non disponible.
                      </div>
                    )}

                    {isInsuffisant && !isRupture && (
                      <div style={{color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '-0.5rem'}}>
                        <AlertCircle size={14} /> Stock insuffisant.
                      </div>
                    )}

                    {selectedMateriau && (
                      <>
                        {isBarre ? (
                          <div>
                            <label>Nombre de Barres (Barres complètes déduites)</label>
                            <input 
                              type="number" min="1" step="1"
                              value={quantiteBarres}
                              onChange={e => setQuantiteBarres(Number(e.target.value))}
                            />
                            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem'}}>La consommation correspond toujours à une barre complète (6m).</span>
                          </div>
                        ) : (
                          <div>
                            <label>Quantité (unités)</label>
                            <input 
                              type="number" min="0" step="1"
                              value={valeur}
                              onChange={e => setValeur(e.target.value ? Number(e.target.value) : '')}
                              style={{borderColor: valeurError ? 'var(--danger-color)' : ''}}
                            />
                            {valeurError && <div style={{color: 'var(--danger-color)', fontSize: '0.85rem', marginTop: '0.2rem'}}>{valeurError}</div>}
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label>Chute à consommer</label>
                      <select 
                        value={selectedChuteId}
                        onChange={e => setSelectedChuteId(e.target.value ? Number(e.target.value) : '')}
                        style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--input-bg)'}}
                      >
                        <option value="">-- Sélectionnez une chute disponible --</option>
                        {chutes.map(c => (
                          <option key={c.chute_id} value={c.chute_id}>
                            {c.reference} - {c.designation} {c.couleur ? `(${c.couleur})` : ''} - {c.longueur_restante}m
                          </option>
                        ))}
                      </select>
                      {chutes.length === 0 && (
                        <div style={{marginTop: '0.5rem', color: '#d97706', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <AlertCircle size={14} /> Aucune chute disponible.
                        </div>
                      )}
                    </div>
                  </>
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
                <button type="button" className="btn-secondary" onClick={() => setModalMode(null)}>
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={
                    submitting || 
                    isProjetTermine || 
                    !preneur.trim() || 
                    (modalMode === 'principal' && (!materiauRef.trim() || (materiauRef !== '' && !selectedMateriau) || isRupture || isInsuffisant || valeurError !== '')) || 
                    (modalMode === 'chutes' && selectedChuteId === '')
                  }
                >
                  <CheckCircle size={18} />
                  {submitting ? 'Validation...' : 'Confirmer Consommation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
