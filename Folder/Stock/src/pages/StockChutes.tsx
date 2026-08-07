import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Scissors, Plus, X, CheckCircle, AlertCircle, MapPin, ArrowLeft } from 'lucide-react';

interface ChuteInfo {
  chute_id: number;
  date_creation: string;
  reference: string;
  designation: string;
  couleur?: string;
  longueur_restante: number;
  statut: string;
  client_origine?: string;
  categorie_emplacement?: string;
}

interface CatalogueItem {
  materiau_id: number;
  reference: string;
  designation: string;
  type_item: string;
  categorie_ou_couleur: string;
}

export default function StockChutes() {
  const [chutes, setChutes] = useState<ChuteInfo[]>([]);
  const [materiaux, setMateriaux] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materiauRef, setMateriauRef] = useState<string>('');
  const [couleur, setCouleur] = useState<string>('');
  const [longueur, setLongueur] = useState<number | ''>('');
  const [quantite, setQuantite] = useState<number>(1);
  const [categorie, setCategorie] = useState<string>('');
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res: string = await invoke('get_stock_chutes');
        const parsed = JSON.parse(res);
        if (parsed.status === 'success') {
          setChutes(parsed.data);
        }
        
        const resM: string = await invoke('get_catalogue_complet');
        const parsedM = JSON.parse(resM);
        if (parsedM.status === 'success') {
          setMateriaux(parsedM.data.filter((m: CatalogueItem) => m.type_item === 'Aluminium'));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const matches = materiaux.filter(m => m.reference.toLowerCase() === materiauRef.toLowerCase());
    if (matches.length > 0) {
      if (!matches.find(m => m.categorie_ou_couleur === couleur)) {
        setCouleur(matches[0].categorie_ou_couleur);
      }
    } else {
      setCouleur('');
    }
  }, [materiauRef, materiaux, couleur]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiauRef.trim() || !longueur || longueur <= 0 || longueur >= 6) {
      setStatus({ type: 'error', msg: 'Veuillez remplir correctement la référence et la longueur (< 6m).' });
      return;
    }

    const selectedMateriau = materiaux.find(m => m.reference.toLowerCase() === materiauRef.toLowerCase() && m.categorie_ou_couleur === couleur);
    if (!selectedMateriau) {
      setStatus({ type: 'error', msg: 'Référence introuvable ou couleur invalide.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let payload = {
        materiau_id: selectedMateriau.materiau_id,
        longueur_restante: longueur,
        quantite: quantite,
        categorie_emplacement: categorie.trim() || undefined
      };

      const response: string = await invoke('add_chute_manually', { payload: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        setMateriauRef('');
        setCouleur('');
        setLongueur('');
        setQuantite(1);
        setCategorie('');
        setTimeout(() => {
          setIsModalOpen(false);
          setStatus(null);
          invoke('get_stock_chutes').then((resC: any) => {
            const parsedC = JSON.parse(resC);
            if (parsedC.status === 'success') setChutes(parsedC.data);
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

  if (loading) return <div><h2 className="page-title">Stock Chutes</h2><div className="loader"></div></div>;

  const filteredChutes = chutes.filter(c => 
    c.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.statut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.categorie_emplacement && c.categorie_emplacement.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedChutes = filteredChutes.reduce((acc, chute) => {
    const loc = chute.categorie_emplacement?.trim() || 'Non assigné';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(chute);
    return acc;
  }, {} as Record<string, ChuteInfo[]>);

  const chutesToDisplay = selectedLocation ? (groupedChutes[selectedLocation] || []) : [];

  const uniqueMateriaux = Array.from(new Map(materiaux.map(m => [m.reference, m])).values());
  const matchingMateriaux = materiaux.filter(m => m.reference.toLowerCase() === materiauRef.toLowerCase());

  return (
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto'}}>
      
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div className="icon-wrapper red" style={{margin: 0}}>
            <Scissors size={28} />
          </div>
          <div>
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)'}}>Stock des Chutes</h2>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Gestion manuelle et physique des restes de barres</span>
          </div>
        </div>
        
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Ajouter une chute
        </button>
      </div>

      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            {selectedLocation && (
              <button 
                onClick={() => setSelectedLocation(null)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={18} /> Retour
              </button>
            )}
            {!selectedLocation && (
              <>
                <span className="badge" style={{backgroundColor: 'var(--success-light)', color: 'var(--success-color)'}}>
                  {chutes.filter(c => c.statut === 'Disponible').length} Disponibles
                </span>
                <span className="badge" style={{backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)'}}>
                  {chutes.filter(c => c.statut === 'Consommee').length} Consommées
                </span>
              </>
            )}
          </div>

          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                // Si la recherche ne correspond plus à l'emplacement sélectionné, on le désélectionne (optionnel)
              }}
              style={{paddingLeft: '2.5rem'}}
            />
          </div>
        </div>

        {!selectedLocation ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(groupedChutes).map(([loc, chutesInLoc]) => {
              const disponibles = chutesInLoc.filter(c => c.statut === 'Disponible').length;
              return (
                <div key={loc} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="icon-wrapper" style={{ margin: 0, padding: '0.75rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)' }}>
                      <MapPin size={24} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                      {loc}
                    </h3>
                  </div>
                  
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                      Nombre de chutes
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <span style={{ color: disponibles > 0 ? 'var(--success-color)' : 'var(--text-tertiary)', fontWeight: 800 }}>{disponibles}</span> chute(s) disponible(s)
                    </div>
                  </div>
                  
                  <button 
                    className="btn-secondary" 
                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                    onClick={() => setSelectedLocation(loc)}
                  >
                    Voir détails
                  </button>
                </div>
              );
            })}
            {Object.keys(groupedChutes).length === 0 && (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                Aucun emplacement ou chute trouvé.
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="var(--primary-color)" />
              Emplacement : {selectedLocation}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence</th>
                  <th>Désignation</th>
                  <th>L. Restante</th>
                  <th>Emplacement</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {chutesToDisplay.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                      Aucune chute trouvée dans cet emplacement.
                    </td>
                  </tr>
                ) : (
                  chutesToDisplay.map((c) => (
                    <tr key={c.chute_id}>
                      <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{c.date_creation.substring(2)}</td>
                      <td style={{fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)'}}>{c.reference}</td>
                      <td>
                        {c.designation}
                        {c.couleur && (
                          <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.5rem', fontWeight: 600, background: 'var(--input-bg)', padding: '0.15rem 0.4rem', borderRadius: '4px'}}>
                            {c.couleur}
                          </span>
                        )}
                      </td>
                      <td style={{fontWeight: 700}}>
                        <span style={{color: c.longueur_restante > 2 ? 'var(--success-color)' : 'var(--text-primary)'}}>
                          {c.longueur_restante} m
                        </span>
                      </td>
                      <td style={{color: 'var(--text-secondary)'}}>{c.categorie_emplacement || '-'}</td>
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
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', margin: '2rem', padding: '3rem'}}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: '0.2s'}}
            >
              <X size={24} />
            </button>
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, margin: '0 0 2rem 0', letterSpacing: '-0.5px'}}>Ajouter une Chute</h2>
            
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
                  <label>Référence Profilé Aluminium *</label>
                  <input 
                    type="text"
                    list="materiaux-list"
                    value={materiauRef}
                    onChange={e => setMateriauRef(e.target.value)}
                    placeholder="Ex: KCL104"
                    required
                  />
                  <datalist id="materiaux-list">
                    {uniqueMateriaux.map(m => (
                      <option key={m.reference} value={m.reference}>{m.designation}</option>
                    ))}
                  </datalist>
                </div>

                {matchingMateriaux.length > 0 && (
                  <div>
                    <label>Couleur *</label>
                    <select 
                      value={couleur}
                      onChange={e => setCouleur(e.target.value)}
                      style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)'}}
                      required
                    >
                      {matchingMateriaux.map(m => (
                        <option key={m.materiau_id} value={m.categorie_ou_couleur}>{m.categorie_ou_couleur}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label>Longueur restante (mètres) *</label>
                  <input 
                    type="number" min="0.01" step="0.01" max="5.99"
                    value={longueur}
                    onChange={e => setLongueur(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>

                <div>
                  <label>Quantité *</label>
                  <input 
                    type="number" min="1" step="1"
                    value={quantite}
                    onChange={e => setQuantite(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label>Emplacement / Catégorie</label>
                  <input 
                    type="text" 
                    value={categorie} 
                    onChange={e => setCategorie(e.target.value)} 
                    placeholder="Ex: Etagère 3, Rayon A..."
                  />
                </div>

              </div>

              <div style={{marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting || !materiauRef.trim() || !longueur}
                >
                  <CheckCircle size={18} />
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
