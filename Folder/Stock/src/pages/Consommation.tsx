import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { Scissors, CheckCircle, AlertCircle, X, Search, Archive, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import BonDeSortiePrint from '../components/BonDeSortiePrint';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

interface LigneConsommation {
  id: number;
  type_materiau: 'Accessoire' | 'Barre Aluminium';
  materiauRef: string;
  couleur: string;
  quantite: number | '';
}

interface GroupedHistorique {
  type: 'group' | 'single';
  operation_id?: string;
  id: string;
  date: string;
  projet: string;
  preneur: string;
  items: HistoriqueConsommation[];
}

export default function Consommation() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [materiaux, setMateriaux] = useState<CatalogueItem[]>([]);
  const [historique, setHistorique] = useState<HistoriqueConsommation[]>([]);
  const [chutes, setChutes] = useState<ChuteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalMode, setModalMode] = useState<'principal' | 'chutes' | null>(null);
  
  const [projetCode, setProjetCode] = useState<string>('');
  const [preneur, setPreneur] = useState<string>('');
  const [dateConsommation, setDateConsommation] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [lignes, setLignes] = useState<LigneConsommation[]>([{
    id: Date.now(), type_materiau: 'Accessoire', materiauRef: '', couleur: '', quantite: 1
  }]);
  
  const [selectedChuteId, setSelectedChuteId] = useState<number | ''>('');
  
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);
  
  const [successOperationId, setSuccessOperationId] = useState<string | null>(null);
  const [savedPdfPath, setSavedPdfPath] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any>(null);

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

  const selectedProjet = projets.find(p => p.code_projet.toLowerCase() === projetCode.toLowerCase());
  const isProjetTermine = selectedProjet?.statut === 'Terminé';

  const getLigneValidation = (ligne: LigneConsommation) => {
    const matchingMateriaux = materiaux.filter(m => m.reference.toLowerCase() === ligne.materiauRef.toLowerCase());
    const isBarre = ligne.type_materiau === 'Barre Aluminium';
    
    const selectedMateriau = isBarre 
      ? matchingMateriaux.find(m => m.categorie_ou_couleur === ligne.couleur)
      : matchingMateriaux[0];
  
    const stockDisponible = selectedMateriau ? selectedMateriau.stock_actuel : 0;
    const isRupture = isBarre && selectedMateriau && stockDisponible === 0;
    const isInsuffisant = selectedMateriau && typeof ligne.quantite === 'number' && ligne.quantite > stockDisponible;
  
    let errorMsg = '';
    if (ligne.quantite === '') {
      errorMsg = 'Veuillez saisir la quantité.';
    } else if (ligne.quantite <= 0) {
      errorMsg = 'La valeur doit être > 0.';
    } else if (isRupture || isInsuffisant) {
      errorMsg = 'Stock insuffisant.';
    }
  
    return { selectedMateriau, stockDisponible, isRupture, isInsuffisant, errorMsg, isBarre, matchingMateriaux };
  };

  const addLigne = () => {
    setLignes([...lignes, { id: Date.now(), type_materiau: 'Accessoire', materiauRef: '', couleur: '', quantite: 1 }]);
  };

  const removeLigne = (id: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const updateLigne = (id: number, field: keyof LigneConsommation, value: any) => {
    setLignes(prev => prev.map(l => {
      if (l.id === id) {
        const newL = { ...l, [field]: value };
        if (field === 'type_materiau') {
          newL.materiauRef = '';
          newL.couleur = '';
          newL.quantite = 1;
        }
        if (field === 'materiauRef' && newL.type_materiau === 'Barre Aluminium') {
          const matching = materiaux.filter(m => m.reference.toLowerCase() === newL.materiauRef.toLowerCase());
          if (matching.length > 0 && !matching.find(m => m.categorie_ou_couleur === newL.couleur)) {
            newL.couleur = matching[0].categorie_ou_couleur;
          }
        }
        return newL;
      }
      return l;
    }));
  };

  const handleSubmitPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projetCode.trim() || !preneur.trim() || !dateConsommation) {
      setStatus({ type: 'error', msg: 'Veuillez remplir correctement les informations générales obligatoires.' });
      return;
    }

    if (lignes.length === 0) {
      setStatus({ type: 'error', msg: 'Veuillez ajouter au moins un article.' });
      return;
    }

    const payloadLignes = [];
    for (const ligne of lignes) {
      if (!ligne.materiauRef.trim()) {
        setStatus({ type: 'error', msg: 'Toutes les lignes doivent avoir une référence.' });
        return;
      }

      const v = getLigneValidation(ligne);
      if (!v.selectedMateriau) {
        setStatus({ type: 'error', msg: `L'article ${ligne.materiauRef} n'existe pas ou la couleur est invalide.` });
        return;
      }
      if (v.errorMsg) {
        setStatus({ type: 'error', msg: `Erreur sur l'article ${ligne.materiauRef} : ${v.errorMsg}` });
        return;
      }

      payloadLignes.push({
        type_materiau: ligne.type_materiau,
        materiau_id: v.selectedMateriau.materiau_id,
        quantite: ligne.quantite
      });
    }

    setSubmitting(true);
    setStatus(null);

    try {
      let payload = {
        code_projet: projetCode,
        preneur: preneur,
        date_consommation: dateConsommation,
        lignes: payloadLignes
      };

      const response: string = await invoke('submit_consommation_multi', { payload: JSON.stringify(payload) });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        setSuccessOperationId(parsed.data.operation_id);
        const printLignes = lignes.map(l => {
          const v = getLigneValidation(l);
          return {
            type: l.type_materiau,
            reference: l.materiauRef,
            designation: v.selectedMateriau ? v.selectedMateriau.designation : '',
            quantite_utilisee: l.quantite as number,
            longueur_utilisee: 0
          };
        });
        setPrintData({
          operationId: parsed.data.operation_id,
          date: dateConsommation,
          projet: projetCode,
          preneur: preneur,
          lignes: printLignes
        });
        setStatus({ type: 'success', msg: parsed.data.message });
        resetFormPartial();
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
        setSuccessOperationId(parsed.data.operation_id);
        const selectedChute = chutes.find(c => c.chute_id === Number(selectedChuteId));
        setPrintData({
          operationId: parsed.data.operation_id,
          date: dateConsommation,
          projet: projetCode,
          preneur: preneur,
          lignes: selectedChute ? [{
            type: 'Barre Aluminium (Chute)',
            reference: selectedChute.reference,
            designation: selectedChute.designation || 'Chute',
            quantite_utilisee: 0,
            longueur_utilisee: selectedChute.longueur_restante
          }] : []
        });
        setStatus({ type: 'success', msg: parsed.data.message });
        resetFormPartial();
      } else {
        setStatus({ type: 'error', msg: parsed.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormPartial = () => {
    setLignes([{ id: Date.now(), type_materiau: 'Accessoire', materiauRef: '', couleur: '', quantite: 1 }]);
    setPreneur('');
    setSelectedChuteId('');
    refreshData();
  };

  const refreshData = () => {
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
  };

  const handleGeneratePDF = async (opId: string | null = null, printDataRef: any = null, action: 'download' | 'print' = 'download') => {
    const element = document.getElementById('bon-de-sortie-print-container');
    if (!element) return;
    
    // Fallback to state if not provided
    const data = printDataRef || printData;
    const filename = data ? `Bon_Sortie_${data.operationId}_${data.projet}_${data.date}.pdf` : `Bon_De_Sortie_${opId || 'Document'}.pdf`;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfArrayBuffer = pdf.output('arraybuffer');
      const payload = {
        filename,
        data: Array.from(new Uint8Array(pdfArrayBuffer)),
        is_temp: action === 'print'
      };
      
      const response: string = await invoke('save_pdf_document', { payload });
      const parsed = JSON.parse(response);
      
      if (parsed.status === 'success') {
        if (action === 'download') {
          setStatus({ 
            type: 'success', 
            msg: `Bon de sortie enregistré avec succès.`
          });
          setSavedPdfPath(parsed.path);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (action === 'print') {
          if (!savedPdfPath && !status) {
             setStatus({ type: 'success', msg: `Document envoyé pour impression.` });
          }
        }
      } else {
        setStatus({ type: 'error', msg: `Erreur lors de l'enregistrement: ${parsed.error}` });
      }
    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err);
      setStatus({ type: 'error', msg: `Erreur lors de la génération du PDF: ${String(err)}` });
    }
  };

  if (loading) return <div><h2 className="page-title">Consommation</h2><div className="loader"></div></div>;

  const uniqueMateriaux = Array.from(new Map(materiaux.map(m => [m.reference, m])).values());

  const groupedHistorique: GroupedHistorique[] = [];
  const processedOpIds = new Set<string>();

  for (const h of historique) {
    if (h.operation_id) {
      if (!processedOpIds.has(h.operation_id)) {
        processedOpIds.add(h.operation_id);
        const group = historique.filter(item => item.operation_id === h.operation_id);
        groupedHistorique.push({
           type: 'group',
           operation_id: h.operation_id,
           id: `group-${h.operation_id}`,
           date: h.date,
           projet: h.projet,
           preneur: h.preneur,
           items: group
        });
      }
    } else {
      groupedHistorique.push({ type: 'single', id: `single-${h.id}`, date: h.date, projet: h.projet, preneur: h.preneur, items: [h] });
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
              <th>Détails</th>
              <th>Preneur</th>
              <th>Action / Source</th>
            </tr>
          </thead>
          <tbody>
            {groupedHistorique.length === 0 ? (
              <tr>
                <td colSpan={5} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Aucune consommation trouvée.
                </td>
              </tr>
            ) : (
              groupedHistorique.map((group) => (
                <React.Fragment key={group.id}>
                  {group.type === 'single' || (group.type === 'group' && group.items.length === 1) ? (
                    <tr style={{background: 'transparent'}}>
                      <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{group.items[0].date.substring(2)}</td>
                      <td>
                        <span className="badge" style={{backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
                          {group.items[0].projet}
                        </span>
                      </td>
                      <td style={{fontFamily: 'monospace', fontWeight: 600}}>
                        {group.items[0].reference}
                        <div style={{fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 'normal'}}>{group.items[0].designation}</div>
                      </td>
                      <td>{group.items[0].preneur}</td>
                      <td>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                          <span className="badge" style={{
                            backgroundColor: group.items[0].source === 'Stock principal' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: group.items[0].source === 'Stock principal' ? 'var(--danger-color)' : '#10b981',
                            border: 'none',
                            alignSelf: 'flex-start'
                          }}>
                            {group.items[0].source}
                          </span>
                          <span style={{fontWeight: 700, color: 'var(--danger-color)'}}>
                            -{group.items[0].longueur_utilisee > 0 
                                ? (group.items[0].quantite_utilisee > 0 ? `${group.items[0].quantite_utilisee} ${group.items[0].quantite_utilisee > 1 ? 'barres' : 'barre'} (${group.items[0].longueur_utilisee}m)` : `${group.items[0].longueur_utilisee}m`) 
                                : `${group.items[0].quantite_utilisee} Unité(s)`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr style={{background: 'rgba(255,255,255,0.01)'}}>
                        <td style={{fontWeight: 500, whiteSpace: 'nowrap'}}>{group.date.substring(2)}</td>
                        <td>
                          <span className="badge" style={{backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
                            {group.projet}
                          </span>
                        </td>
                        <td style={{fontWeight: 600, color: 'var(--text-secondary)'}}>
                          {group.items.length} articles consommés
                        </td>
                        <td>{group.preneur}</td>
                        <td>
                          <button 
                            className="btn-secondary" 
                            style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}} 
                            onClick={() => setExpandedOpId(expandedOpId === group.operation_id ? null : (group.operation_id || null))}
                          >
                            {expandedOpId === group.operation_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {expandedOpId === group.operation_id ? 'Masquer' : 'Voir détails'}
                          </button>
                        </td>
                      </tr>
                      {expandedOpId === group.operation_id && (
                        <tr style={{background: 'rgba(0,0,0,0.1)'}}>
                          <td colSpan={5} style={{padding: '1rem'}}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Détails de l'opération</h4>
                              <button 
                                onClick={() => {
                                  const historyPrintData = {
                                    operationId: group.operation_id,
                                    date: group.date,
                                    projet: group.projet,
                                    preneur: group.preneur,
                                    lignes: group.items.map(item => ({
                                      type: item.source.includes('Barre') ? 'Barre Aluminium' : (item.source.includes('Chute') ? 'Barre Aluminium (Chute)' : 'Accessoire'),
                                      reference: item.reference,
                                      designation: item.designation,
                                      quantite_utilisee: item.quantite_utilisee,
                                      longueur_utilisee: item.longueur_utilisee
                                    }))
                                  };
                                  setPrintData(historyPrintData);
                                  setTimeout(() => handleGeneratePDF(group.operation_id, historyPrintData, 'download'), 100);
                                }}
                                className="btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              >
                                📄 Télécharger PDF
                              </button>
                              
                              <button 
                                onClick={() => {
                                  const historyPrintData = {
                                    operationId: group.operation_id,
                                    date: group.date,
                                    projet: group.projet,
                                    preneur: group.preneur,
                                    lignes: group.items.map(item => ({
                                      type: item.source.includes('Barre') ? 'Barre Aluminium' : (item.source.includes('Chute') ? 'Barre Aluminium (Chute)' : 'Accessoire'),
                                      reference: item.reference,
                                      designation: item.designation,
                                      quantite_utilisee: item.quantite_utilisee,
                                      longueur_utilisee: item.longueur_utilisee
                                    }))
                                  };
                                  setPrintData(historyPrintData);
                                  setTimeout(() => handleGeneratePDF(group.operation_id, historyPrintData, 'print'), 100);
                                }}
                                className="btn-primary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              >
                                🖨 Imprimer
                              </button>
                            </div>
                            <table style={{width: '100%'}}>
                               <tbody>
                                 {group.items.map((item, i) => (
                                   <tr key={`sub-${i}`}>
                                     <td style={{width: '20%'}}>{item.reference}</td>
                                     <td style={{width: '50%'}}>{item.designation}</td>
                                     <td style={{width: '30%', textAlign: 'right'}}>
                                       {item.longueur_utilisee > 0 ? `${item.longueur_utilisee}m` : `${item.quantite_utilisee} Unité(s)`}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
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
          <div className="glass-panel" style={{width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', margin: '2rem', padding: '3rem'}}>
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
              <div style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', backgroundColor: status.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)', color: status.type === 'success' ? 'var(--text-primary)' : 'var(--danger-color)', border: `1px solid ${status.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}` }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: (successOperationId || savedPdfPath) ? '1rem' : '0', color: status.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                  {status.msg}
                </div>
                {successOperationId && !savedPdfPath && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                    <button 
                      onClick={() => setTimeout(() => handleGeneratePDF(successOperationId, null, 'download'), 100)}
                      className="btn-secondary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      📄 Télécharger PDF
                    </button>
                    <button 
                      onClick={() => setTimeout(() => handleGeneratePDF(successOperationId, null, 'print'), 100)}
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      🖨 Imprimer
                    </button>
                    <button 
                      onClick={() => { setSuccessOperationId(null); setSavedPdfPath(null); setStatus(null); }}
                      className="btn-secondary"
                    >
                      Nouvelle Consommation
                    </button>
                  </div>
                )}
                {savedPdfPath && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                    <button 
                      onClick={() => openPath(savedPdfPath)}
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      📄 Ouvrir le PDF
                    </button>
                    <button 
                      onClick={() => { setSuccessOperationId(null); setSavedPdfPath(null); setStatus(null); }}
                      className="btn-secondary"
                    >
                      Nouvelle Consommation
                    </button>
                  </div>
                )}
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
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', marginBottom: '0.5rem'}}>
                       <h3 style={{fontSize: '1.1rem', margin: 0, fontWeight: 700}}>Articles à consommer</h3>
                       <button type="button" className="btn-secondary" onClick={addLigne} style={{padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                         <Plus size={16} /> Ajouter un article
                       </button>
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                      {lignes.map((ligne, index) => {
                         const { selectedMateriau, stockDisponible, isRupture, isInsuffisant, errorMsg, isBarre, matchingMateriaux } = getLigneValidation(ligne);
                         
                         return (
                           <div key={ligne.id} style={{padding: '1.25rem', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)'}}>
                             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                               <strong style={{color: 'var(--text-secondary)'}}>Ligne {index + 1}</strong>
                               {lignes.length > 1 && (
                                 <button type="button" onClick={() => removeLigne(ligne.id)} style={{background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem'}}>
                                   <X size={18} />
                                 </button>
                               )}
                             </div>
                             
                             <div style={{display: 'grid', gridTemplateColumns: isBarre ? '1.5fr 2fr 1fr 1fr' : '1.5fr 2fr 1fr', gap: '1rem'}}>
                                <div>
                                  <label>Type de matériau</label>
                                  <select value={ligne.type_materiau} onChange={e => updateLigne(ligne.id, 'type_materiau', e.target.value)}>
                                    <option value="Accessoire">Accessoire</option>
                                    <option value="Barre Aluminium">Barre Aluminium</option>
                                  </select>
                                </div>
                                <div>
                                  <label>Référence</label>
                                  <input type="text" list="materiaux-list" value={ligne.materiauRef} onChange={e => updateLigne(ligne.id, 'materiauRef', e.target.value)} style={{borderColor: (ligne.materiauRef !== '' && matchingMateriaux.length === 0) ? 'var(--danger-color)' : ''}} placeholder="Ex: 200.032" />
                                </div>
                                {isBarre && (
                                   <div>
                                     <label>Couleur</label>
                                     <select value={ligne.couleur} onChange={e => updateLigne(ligne.id, 'couleur', e.target.value)}>
                                        {matchingMateriaux.map(m => (
                                           <option key={m.materiau_id} value={m.categorie_ou_couleur}>{m.categorie_ou_couleur}</option>
                                        ))}
                                     </select>
                                   </div>
                                )}
                                <div>
                                  <label>{isBarre ? 'Nombre de barres' : 'Quantité'}</label>
                                  <input type="number" min="1" step="1" value={ligne.quantite} onChange={e => updateLigne(ligne.id, 'quantite', e.target.value ? Number(e.target.value) : '')} style={{borderColor: errorMsg ? 'var(--danger-color)' : ''}} />
                                </div>
                             </div>
                             
                             {selectedMateriau && (
                                <div style={{
                                  marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                                  background: isRupture ? 'var(--danger-light)' : (isInsuffisant ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                                  border: isRupture ? '1px solid rgba(239, 68, 68, 0.2)' : (isInsuffisant ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'),
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                   <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                                     Stock disponible : <strong style={{color: isRupture ? 'var(--danger-color)' : (isInsuffisant ? '#d97706' : '#10b981')}}>{stockDisponible}</strong> {isBarre ? 'barre(s)' : 'unité(s)'}
                                   </span>
                                   {errorMsg && <span style={{fontSize: '0.85rem', color: 'var(--danger-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem'}}><AlertCircle size={14} /> {errorMsg}</span>}
                                </div>
                             )}
                           </div>
                         );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label>Chute à consommer</label>
                      <select 
                        value={selectedChuteId}
                        onChange={e => setSelectedChuteId(e.target.value ? Number(e.target.value) : '')}
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
                    placeholder="Qui a pris ces pièces ?"
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
                    (modalMode === 'principal' && lignes.some(l => getLigneValidation(l).errorMsg !== '' || !l.materiauRef.trim())) || 
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
      <datalist id="materiaux-list">
        {uniqueMateriaux.map(m => (
          <option key={m.reference} value={m.reference}>{m.designation}</option>
        ))}
      </datalist>

      {printData && <BonDeSortiePrint {...printData} />}
    </div>
  );
}
