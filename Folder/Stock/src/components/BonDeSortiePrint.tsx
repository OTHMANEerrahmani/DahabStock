
export interface LigneBonSortie {
  type: string;
  reference: string;
  designation: string;
  quantite_utilisee: number;
  longueur_utilisee: number;
}

interface BonDeSortiePrintProps {
  operationId: string;
  date: string;
  projet: string;
  preneur: string;
  lignes: LigneBonSortie[];
}

export default function BonDeSortiePrint({ operationId, date, projet, preneur, lignes }: BonDeSortiePrintProps) {
  // Format operations to generate a consistent short BS number
  const bsNumber = operationId ? `BS-${date.split('-')[0]}-${operationId.substring(0, 6).toUpperCase()}` : 'BS-XXX';
  const displayDate = date.split('-').reverse().join('/');

  return (
    <div id="bon-de-sortie-print-container" style={{ 
      position: 'absolute', 
      top: '-9999px', 
      left: '-9999px', 
      width: '210mm', 
      minHeight: '297mm',
      padding: '20mm', 
      fontFamily: 'sans-serif', 
      color: '#000', 
      backgroundColor: '#fff', 
      zIndex: -9999,
      boxSizing: 'border-box'
    }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Bon de Sortie Stock</h1>
        <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>Document officiel de prélèvement matériel</p>
      </div>

      {/* Info section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '14px' }}>
        <div>
          <p style={{ margin: '5px 0' }}><strong>Bon N° :</strong> {bsNumber}</p>
          <p style={{ margin: '5px 0' }}><strong>Projet :</strong> {projet}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '5px 0' }}><strong>Date :</strong> {displayDate}</p>
          <p style={{ margin: '5px 0' }}><strong>Demandeur :</strong> {preneur}</p>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4rem' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left', backgroundColor: '#f9f9f9', color: '#000' }}>Type</th>
            <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left', backgroundColor: '#f9f9f9', color: '#000' }}>Référence</th>
            <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left', backgroundColor: '#f9f9f9', color: '#000' }}>Désignation</th>
            <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', backgroundColor: '#f9f9f9', color: '#000' }}>Quantité</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #000', padding: '10px' }}>{ligne.type}</td>
              <td style={{ border: '1px solid #000', padding: '10px', fontFamily: 'monospace', fontWeight: 'bold' }}>{ligne.reference}</td>
              <td style={{ border: '1px solid #000', padding: '10px' }}>{ligne.designation}</td>
              <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                {ligne.type.includes('Aluminium') 
                    ? (ligne.quantite_utilisee > 0 ? `${ligne.quantite_utilisee} barre(s)` : `${ligne.longueur_utilisee}m`) 
                    : `${ligne.quantite_utilisee} unité(s)`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        
        {/* Demandeur */}
        <div style={{ width: '45%', border: '1px solid #000', padding: '15px', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginTop: 0 }}>Préparé par (Demandeur)</h3>
          <p style={{ margin: '15px 0' }}>Nom : {preneur}</p>
          <p style={{ margin: '15px 0' }}>Date : {displayDate}</p>
          <div style={{ marginTop: '20px', minHeight: '80px' }}>
            <p style={{ margin: 0, color: '#999', fontStyle: 'italic' }}>Signature demandeur</p>
          </div>
        </div>

        {/* Magasinier */}
        <div style={{ width: '45%', border: '1px solid #000', padding: '15px', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginTop: 0 }}>Remis par (Magasinier)</h3>
          <p style={{ margin: '15px 0' }}>Nom : </p>
          <p style={{ margin: '15px 0' }}>Date : </p>
          <div style={{ marginTop: '20px', minHeight: '80px' }}>
            <p style={{ margin: 0, color: '#999', fontStyle: 'italic' }}>Signature magasinier</p>
          </div>
        </div>
      </div>

    </div>
  );
}
