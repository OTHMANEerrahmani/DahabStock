import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Package, Plus, Trash2, CheckCircle, AlertCircle, FileText, X, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Fournisseur {
  fournisseur_id: number;
  nom: string;
}

interface CatalogueItem {
  materiau_id: number;
  reference: string;
  designation: string;
  type_item: string;
  categorie_ou_couleur: string;
  stock_actuel: number;
}

interface LigneReception {
  id: number;
  materiau_ref: string;
  couleur: string;
  quantite_recue: number;
  prix_achat: number;
}

interface HistoriqueReception {
  id: number;
  date: string;
  reference: string;
  designation: string;
  fournisseur: string;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
}

export default function EntreeStock() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [materiaux, setMateriaux] = useState<CatalogueItem[]>([]);
  const [historique, setHistorique] = useState<HistoriqueReception[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [fournisseurNom, setFournisseurNom] = useState<string>('');
  const [numeroBR, setNumeroBR] = useState<string>('');
  const [dateReception, setDateReception] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lignes, setLignes] = useState<LigneReception[]>([{ id: Date.now(), materiau_ref: '', couleur: '', quantite_recue: 1, prix_achat: 0 }]);
  
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const resF: string = await invoke('get_fournisseurs');
        const parsedF = JSON.parse(resF);
        if (parsedF.status === 'success') setFournisseurs(parsedF.data);

        const resM: string = await invoke('get_catalogue_complet');
        const parsedM = JSON.parse(resM);
        if (parsedM.status === 'success') setMateriaux(parsedM.data);

        const resH: string = await invoke('get_historique_receptions');
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

  const startEditPrice = (h: HistoriqueReception) => {
    setEditingPriceId(h.id);
    setEditingPriceValue(h.prix_unitaire);
  };

  const savePrice = async (id: number) => {
    try {
      const res = await invoke('update_prix_reception', { ligneId: id, nouveauPrix: editingPriceValue });
      const parsed = JSON.parse(res as string);
      if (parsed.status === 'success') {
        const resH = await invoke('get_historique_receptions');
        const parsedH = JSON.parse(resH as string);
        if (parsedH.status === 'success') setHistorique(parsedH.data);
      }
    } catch (err) {
      console.error(err);
    }
    setEditingPriceId(null);
  };

  const addLigne = () => {
    setLignes([...lignes, { id: Date.now(), materiau_ref: '', couleur: '', quantite_recue: 1, prix_achat: 0 }]);
  };

  const removeLigne = (id: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const updateLigne = (id: number, field: keyof LigneReception, value: string | number) => {
    setLignes(prevLignes => prevLignes.map(l => {
      if (l.id !== id) return l;
      
      const newLigne = { ...l, [field]: value };
      
      if (field === 'materiau_ref') {
        const matchingMateriaux = materiaux.filter(m => m.reference.toLowerCase() === String(value).toLowerCase());
        const isBarre = matchingMateriaux.length > 0 && matchingMateriaux[0].type_item === 'Aluminium';
        if (isBarre && !matchingMateriaux.find(m => m.categorie_ou_couleur === l.couleur)) {
           newLigne.couleur = matchingMateriaux[0].categorie_ou_couleur;
        } else if (!isBarre) {
           newLigne.couleur = '';
        }
      }
      return newLigne;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseurNom.trim() || !numeroBR) {
      setStatus({ type: 'error', msg: 'Veuillez remplir le fournisseur et le numéro.' });
      return;
    }

    const finalLignes = [];
    for (const l of lignes) {
      if (!l.materiau_ref || l.quantite_recue <= 0) {
        setStatus({ type: 'error', msg: 'Veuillez remplir correctement les lignes de matériaux.' });
        return;
      }
      
      const matchingMateriaux = materiaux.filter(m => m.reference.toLowerCase() === l.materiau_ref.toLowerCase());
      if (matchingMateriaux.length === 0) {
        setStatus({ type: 'error', msg: `L'article avec le code ${l.materiau_ref} n'existe pas dans le catalogue.` });
        return;
      }

      const isBarre = matchingMateriaux[0].type_item === 'Aluminium';
      const mat = isBarre ? matchingMateriaux.find(m => m.categorie_ou_couleur === l.couleur) : matchingMateriaux[0];
      
      if (!mat) {
        setStatus({ type: 'error', msg: `La couleur ${l.couleur} pour l'article ${l.materiau_ref} est invalide.` });
        return;
      }

      finalLignes.push({
        materiau_id: mat.materiau_id,
        quantite_recue: l.quantite_recue,
        prix_achat: l.prix_achat
      });
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let finalFournisseurId = 0;
      const existingF = fournisseurs.find(f => f.nom.toLowerCase() === fournisseurNom.toLowerCase());
      if (existingF) {
        finalFournisseurId = existingF.fournisseur_id;
      } else {
        const resFStr: string = await invoke('add_fournisseur', { nom: fournisseurNom });
        const parsedF = JSON.parse(resFStr);
        if (parsedF.status === 'success') {
          finalFournisseurId = parsedF.data;
        } else {
          throw new Error('Erreur lors de la création du fournisseur');
        }
      }

      const payload = {
        fournisseur_id: finalFournisseurId,
        numero_br: numeroBR,
        date_reception: dateReception,
        lignes: finalLignes
      };
      const response: string = await invoke('submit_reception', { payloadStr: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        setNumeroBR('');
        setFournisseurNom('');
        setDateReception(new Date().toISOString().split('T')[0]);
        setLignes([{ id: Date.now(), materiau_ref: '', couleur: '', quantite_recue: 1, prix_achat: 0 }]);
        setTimeout(() => {
          setIsModalOpen(false);
          setStatus(null);
          invoke('get_historique_receptions').then((resH: any) => {
            const parsedH = JSON.parse(resH);
            if (parsedH.status === 'success') setHistorique(parsedH.data);
          });
          invoke('get_catalogue_complet').then((resM: any) => {
            const parsedM = JSON.parse(resM);
            if (parsedM.status === 'success') setMateriaux(parsedM.data);
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

  if (loading) return <div><h2 className="page-title">Entrée Stock</h2><div className="loader"></div></div>;

  // Générer la liste unique de matériaux pour le datalist (pour avoir la référence ET la désignation)
  const uniqueMateriaux = Array.from(new Map(materiaux.map(m => [m.reference, m])).values());

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto'}}>
      
      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '2.5rem'}}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass-panel" 
          style={{padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', margin: 0}}
        >
          <div className="icon-wrapper blue">
            <Plus size={28} />
          </div>
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--primary-color)'}}>Saisie Manuelle</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Ajouter via formulaire</span>
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
            <h3 style={{margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-secondary)'}}>Importer un Bon de Commande (PDF)</h3>
            <span style={{fontSize: '0.85rem', color: 'var(--text-tertiary)'}}>Extraction automatique hors-ligne (Bientôt)</span>
          </div>
        </button>
      </div>

      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: 800, margin: 0}}>Stock principal</h2>
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
              <th>Fournisseur</th>
              <th>Quantité</th>
              <th>Prix Total</th>
            </tr>
          </thead>
          <tbody>
            {historique.length === 0 ? (
              <tr>
                <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Aucune entrée trouvée.
                </td>
              </tr>
            ) : (
              historique.map((h) => (
                <tr key={h.id}>
                  <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{h.date.substring(2)}</td>
                  <td style={{fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)'}}>{h.reference}</td>
                  <td>{h.designation}</td>
                  <td>
                    <span className="badge" style={{backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)'}}>
                      {h.fournisseur}
                    </span>
                  </td>
                  <td style={{fontWeight: 700}}>+{h.quantite}</td>
                  <td>
                    {editingPriceId === h.id ? (
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={editingPriceValue} 
                          onChange={e => setEditingPriceValue(Number(e.target.value))}
                          style={{width: '90px', padding: '0.25rem 0.5rem'}}
                          title="Prix unitaire"
                        />
                        <button onClick={() => savePrice(h.id)} className="btn-primary" style={{padding: '0.25rem 0.75rem', minHeight: 'auto'}}>
                          OK
                        </button>
                      </div>
                    ) : (
                      <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
                        <span style={{fontWeight: 700, color: 'var(--text-primary)'}}>{h.prix_total.toLocaleString('fr-MA', {style: 'currency', currency: 'MAD'})}</span>
                        <button onClick={() => startEditPrice(h)} style={{background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px'}} title="Modifier le prix unitaire">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', margin: '2rem', padding: '3rem'}}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: '0.2s'}}
            >
              <X size={24} />
            </button>
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 2rem 0', letterSpacing: '-0.5px'}}>Nouvelle Entrée Manuelle</h2>
            
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
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem'}}>
                <div>
                  <label>Fournisseur</label>
                  <input 
                    type="text"
                    list="fournisseurs-list"
                    value={fournisseurNom} 
                    onChange={e => setFournisseurNom(e.target.value)}
                    placeholder="Saisissez ou choisissez un fournisseur..."
                  />
                  <datalist id="fournisseurs-list">
                    {fournisseurs.map(f => (
                      <option key={f.fournisseur_id} value={f.nom} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label>Numéro BC / BR</label>
                  <input 
                    type="text" 
                    value={numeroBR} 
                    onChange={e => setNumeroBR(e.target.value)}
                    placeholder="Ex: 006629/26"
                  />
                </div>
                <div>
                  <label>Date d'entrée</label>
                  <input 
                    type="date" 
                    value={dateReception} 
                    onChange={e => setDateReception(e.target.value)}
                    required
                    style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.95rem'}}
                  />
                </div>
              </div>

              <div style={{marginBottom: '2rem'}}>
                <h3 style={{fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)'}}>
                  <Package size={20} color="var(--primary-color)" /> Matériaux Reçus
                </h3>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {lignes.map((ligne) => {
                    const matchingMateriaux = materiaux.filter(m => m.reference.toLowerCase() === ligne.materiau_ref.toLowerCase());
                    const isCodeUnknown = ligne.materiau_ref !== '' && matchingMateriaux.length === 0;
                    const isBarre = matchingMateriaux.length > 0 && matchingMateriaux[0].type_item === 'Aluminium';
                    
                    return (
                    <div key={ligne.id} style={{background: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', border: isCodeUnknown ? '1px solid var(--danger-color)' : '1px solid var(--border-color)'}}>
                      <div style={{display: 'grid', gridTemplateColumns: isBarre ? '2fr 1.5fr 1fr 1fr auto' : '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center'}}>
                        
                        <div style={{position: 'relative'}}>
                          <input 
                            type="text"
                            list="materiaux-list"
                            value={ligne.materiau_ref}
                            onChange={e => updateLigne(ligne.id, 'materiau_ref', e.target.value)}
                            placeholder="Code (ex: KCL104)"
                            style={{width: '100%'}}
                          />
                          <datalist id="materiaux-list">
                            {uniqueMateriaux.map(m => (
                              <option key={m.reference} value={m.reference}>{m.designation}</option>
                            ))}
                          </datalist>
                        </div>

                        {isBarre && (
                           <div>
                             <select 
                               value={ligne.couleur}
                               onChange={e => updateLigne(ligne.id, 'couleur', e.target.value)}
                               style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--surface-color)'}}
                             >
                               {matchingMateriaux.map(m => (
                                 <option key={m.materiau_id} value={m.categorie_ou_couleur}>{m.categorie_ou_couleur}</option>
                               ))}
                             </select>
                           </div>
                        )}

                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{padding: '0.75rem', background: 'var(--surface-color)', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', border: '1px solid var(--input-border)', borderRight: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600}}>Qté</span>
                        <input 
                          type="number" min="0" step="1"
                          value={ligne.quantite_recue}
                          onChange={e => updateLigne(ligne.id, 'quantite_recue', Number(e.target.value))}
                          style={{borderRadius: '0 var(--radius-md) var(--radius-md) 0'}}
                        />
                      </div>

                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{padding: '0.75rem', background: 'var(--surface-color)', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', border: '1px solid var(--input-border)', borderRight: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600}}>Prix</span>
                        <input 
                          type="number" min="0" step="0.01"
                          value={ligne.prix_achat}
                          onChange={e => updateLigne(ligne.id, 'prix_achat', Number(e.target.value))}
                          style={{borderRadius: '0 var(--radius-md) var(--radius-md) 0'}}
                        />
                      </div>

                      <button type="button" onClick={() => removeLigne(ligne.id)} disabled={lignes.length === 1} style={{padding: '0.75rem', background: 'var(--danger-light)', border: 'none', borderRadius: 'var(--radius-md)', color: lignes.length > 1 ? 'var(--danger-color)' : 'var(--text-tertiary)', cursor: lignes.length > 1 ? 'pointer' : 'not-allowed', transition: '0.2s'}}>
                        <Trash2 size={20} />
                      </button>
                    </div>
                    {isCodeUnknown && (
                      <div style={{marginTop: '0.5rem', color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <AlertCircle size={14} /> Article inconnu. <Link to="/catalogue" style={{color: 'var(--primary-color)', textDecoration: 'underline'}}>Créer au catalogue</Link>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
                
                <button type="button" onClick={addLigne} style={{marginTop: '1.5rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '2px dashed var(--border-color)', color: 'var(--primary-color)', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', transition: '0.2s', width: '100%', justifyContent: 'center'}}>
                  <Plus size={18} /> Ajouter une nouvelle ligne
                </button>
              </div>

              <div style={{marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : "Enregistrer l'entrée"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
