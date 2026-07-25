import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, CheckCircle, AlertCircle } from 'lucide-react';

interface CatalogueItem {
  materiau_id: number;
  reference: string;
  designation: string;
  type_item: string;
  categorie_ou_couleur: string;
  stock_actuel: number;
}

export default function Catalogue() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  // Form states
  const [itemType, setItemType] = useState<'Standard'|'Aluminium'>('Standard');
  const [reference, setReference] = useState('');
  const [designation, setDesignation] = useState('');
  
  // Standard specific (hidden and defaulted)
  
  // Alu specific
  const [couleur, setCouleur] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCatalogue = async () => {
    try {
      const res: string = await invoke('get_catalogue_complet');
      const parsed = JSON.parse(res);
      if (parsed.status === 'success') {
        setItems(parsed.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogue();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference || !designation) {
      setStatus({ type: 'error', msg: 'La référence et la désignation sont obligatoires.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let resStr = '';
      if (itemType === 'Standard') {
        const payload = {
          reference, designation, categorie: "Accessoire", prix_unitaire: 0.0
        };
        resStr = await invoke('add_article_standard', { payloadStr: JSON.stringify(payload) });
      } else {
        if (!couleur) throw new Error('La couleur est requise.');
        const payload = {
          reference, designation, couleur, longueur: 6.0, prix_par_metre: 0.0
        };
        resStr = await invoke('add_barre_aluminium', { payloadStr: JSON.stringify(payload) });
      }

      const parsed = JSON.parse(resStr);
      if (parsed.status === 'success') {
        setStatus({ type: 'success', msg: parsed.data });
        // Reset form
        setReference(''); setDesignation('');
        setCouleur('');
        await loadCatalogue();
        
        setTimeout(() => {
          setStatus(null);
        }, 3000);
      } else {
        setStatus({ type: 'error', msg: parsed.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.type_item === itemType &&
    (item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categorie_ou_couleur.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto'}}>
      
      {/* NOUVEL ARTICLE FORM */}
      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: 800, margin: 0}}>Nouvel Article</h2>
          <div style={{display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', padding: '0.25rem', borderRadius: 'var(--radius-md)'}}>
            <button 
              type="button"
              onClick={() => setItemType('Standard')}
              className={itemType === 'Standard' ? 'btn-primary' : 'btn-secondary'}
              style={itemType === 'Standard' ? {padding: '0.5rem 1rem'} : {padding: '0.5rem 1rem', border: 'none', background: 'transparent'}}
            >
              Accessoires
            </button>
            <button 
              type="button"
              onClick={() => setItemType('Aluminium')}
              className={itemType === 'Aluminium' ? 'btn-primary' : 'btn-secondary'}
              style={itemType === 'Aluminium' ? {padding: '0.5rem 1rem'} : {padding: '0.5rem 1rem', border: 'none', background: 'transparent'}}
            >
              Profilé
            </button>
          </div>
        </div>

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
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
            <div>
              <label>Code / Référence</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder={itemType === 'Standard' ? "e.g. KC-400" : "e.g. ALU-BLANC-6M"} />
            </div>
            <div>
              <label>Désignation (Nom)</label>
              <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder={itemType === 'Standard' ? "e.g. Profilé Coulissant" : "e.g. Profilé Aluminium Blanc"} />
            </div>
            


            {itemType === 'Aluminium' && (
              <div>
                <label>Couleur</label>
                <input type="text" value={couleur} onChange={e => setCouleur(e.target.value)} placeholder="e.g. Blanc" />
              </div>
            )}
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end'}}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              Ajouter au catalogue
            </button>
          </div>
        </form>
      </div>

      {/* CATALOGUE TABLE */}
      <div className="glass-panel">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: 800, margin: 0}}>Catalogue des Pièces ({items.length})</h2>
          <div style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{paddingLeft: '2.5rem'}}
            />
          </div>
        </div>

        {loading ? (
          <div className="loader"></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Désignation</th>
                <th>Type</th>
                <th>Catégorie / Couleur</th>
                <th style={{textAlign: 'center'}}>Stock Actuel</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                    Aucune pièce trouvée dans le catalogue.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.materiau_id}>
                    <td style={{fontWeight: 600}}>{item.reference}</td>
                    <td>{item.designation}</td>
                    <td><span className="badge" style={{background: 'var(--bg-color)', color: 'var(--text-secondary)'}}>{item.type_item}</span></td>
                    <td>{item.categorie_ou_couleur}</td>
                    <td style={{textAlign: 'center'}}>
                      <span className={`badge ${item.stock_actuel > 0 ? 'success' : 'danger'}`}>
                        {item.stock_actuel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
