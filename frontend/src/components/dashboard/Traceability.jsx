import { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Clock,
  Settings,
  User,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Activity,
  Layers,
  Calendar,
  Filter,
  Thermometer,
  Gauge,
  Zap,
  FileSpreadsheet,
} from 'lucide-react';

export default function Traceability() {
  const [searchLot, setSearchLot] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});

  // 🔹 Charger les données depuis backend
  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/traceability/lots");
      const data = await response.json();
      setLots(data);
    } catch (err) {
      console.error("Erreur API:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Rechercher un lot spécifique
  const handleSearch = () => {
    if (!searchLot.trim()) {
      setSelectedLot(null);
      return;
    }
    const found = lots.find(lot =>
      lot.numeroLot.toLowerCase().includes(searchLot.toLowerCase())
    );
    setSelectedLot(found || null);
  };

  // 🔹 Filtrer les lots par statut
  const filteredLots = lots.filter(lot =>
    filterStatus === 'all' ? true : lot.status === filterStatus
  );

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'Terminé',
      'in-progress': 'En cours',
      rejected: 'Rejeté',
      defect: 'Défaut'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#d4edda',
      'in-progress': '#fff3cd',
      rejected: '#f8d7da',
      defect: '#f8d7da'
    };
    return colors[status] || '#e9ecef';
  };

  // 🔹 Exporter vers PDF via backend
  const exportToPDF = (lot) => {
    window.open(`http://127.0.0.1:8000/traceability/lots/${lot.id}/pdf`);
  };

  // 🔹 Toggle pour afficher/masquer les détails d'une étape
  const toggleStepDetails = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  // 🔹 Formater la durée
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={24} />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>TRAÇABILITÉ</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>MES · MODULE 04 · v1.0</p>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {new Date().toLocaleString('fr-FR')}
        </div>
      </div>

      {/* Search section */}
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <Search size={18} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>RECHERCHE PAR NUMÉRO DE LOT</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>NUMÉRO DE LOT</label>
            <input
              type="text"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
              placeholder="Ex: LOT-2026-A-001"
              value={searchLot}
              onChange={(e) => setSearchLot(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleSearch}
              style={{ width: '100%', padding: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
            >
              Rechercher
            </button>
          </div>
        </div>

        {/* Quick access */}
        <div style={{ marginTop: '15px' }}>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>ACCÈS RAPIDE AUX LOTS RÉCENTS</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {lots.slice(0, 5).map(lot => (
              <button
                key={lot.id || lot.numeroLot}
                onClick={() => {
                  setSearchLot(lot.numeroLot);
                  setSelectedLot(lot);
                }}
                style={{ padding: '4px 8px', background: '#e0e0e0', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                {lot.numeroLot}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Chargement des données...</p>
        </div>
      )}

      {/* Results */}
      {!loading && selectedLot ? (
        <div>
          {/* Lot summary */}
          <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontFamily: 'monospace' }}>{selectedLot.numeroLot}</h2>
                  <span style={{ padding: '2px 8px', background: getStatusColor(selectedLot.status), borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                    {getStatusLabel(selectedLot.status)}
                  </span>
                </div>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: '500' }}>{selectedLot.produit}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Ordre de fabrication: {selectedLot.ordreId}</p>
              </div>
              <div>
                <button 
                  onClick={() => exportToPDF(selectedLot)} 
                  style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>CRÉÉ LE</span>
                  <Calendar size={14} />
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontFamily: 'monospace' }}>{selectedLot.dateCreation}</p>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>QTÉ INITIALE</span>
                  <Package size={14} />
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontFamily: 'monospace' }}>{selectedLot.quantiteInitiale}</p>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>QTÉ FINALE</span>
                  <CheckCircle2 size={14} />
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontFamily: 'monospace' }}>{selectedLot.quantiteFinale}</p>
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>TAUX RENDEMENT</span>
                  <Activity size={14} />
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontFamily: 'monospace' }}>
                  {selectedLot.quantiteInitiale > 0 
                    ? ((selectedLot.quantiteFinale / selectedLot.quantiteInitiale) * 100).toFixed(1) 
                    : '0'}%
                </p>
              </div>
            </div>
          </div>

          {/* HISTORIQUE DE PRODUCTION - avec étapes détaillées */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Activity size={18} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>HISTORIQUE DE PRODUCTION</h3>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                {selectedLot.steps?.length || 0} étape(s)
              </span>
            </div>

            {selectedLot.steps && selectedLot.steps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedLot.steps.map((step, index) => (
                  <div key={step.id || index} style={{ 
                    border: `2px solid ${step.status === 'defect' ? '#ffc107' : step.status === 'completed' ? '#28a745' : '#17a2b8'}`,
                    borderRadius: '8px',
                    background: 'white',
                    overflow: 'hidden'
                  }}>
                    {/* En-tête de l'étape */}
                    <div 
                      onClick={() => toggleStepDetails(step.id || index)}
                      style={{ 
                        padding: '12px 15px',
                        background: '#f8f9fa',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: expandedSteps[step.id || index] ? '1px solid #e9ecef' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        {step.status === 'completed' && <CheckCircle2 size={20} color="#28a745" />}
                        {step.status === 'defect' && <AlertTriangle size={20} color="#ffc107" />}
                        {step.status === 'in-progress' && <Clock size={20} color="#17a2b8" />}
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{step.operation}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{step.machine} • {step.timestamp}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '12px', padding: '2px 8px', background: getStatusColor(step.status), borderRadius: '12px' }}>
                          {getStatusLabel(step.status)}
                        </span>
                        {expandedSteps[step.id || index] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>

                    {/* Détails de l'étape (expandable) */}
                    {expandedSteps[step.id || index] && (
                      <div style={{ padding: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>OPÉRATEUR</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <User size={14} />
                              <span style={{ fontSize: '13px' }}>{step.operateur || 'N/A'}</span>
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>DURÉE</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <Clock size={14} />
                              <span style={{ fontSize: '13px' }}>{formatDuration(step.dureeMin)}</span>
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>QUANTITÉ</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <Package size={14} />
                              <span style={{ fontSize: '13px' }}>{step.quantite || 'N/A'} unités</span>
                            </div>
                          </div>
                        </div>

                        {/* Paramètres techniques */}
                        {step.parametres && Object.keys(step.parametres).length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '6px' }}>PARAMÈTRES TECHNIQUES</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                              {step.parametres.temperature && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Thermometer size={14} />
                                  <span style={{ fontSize: '12px' }}>{step.parametres.temperature}°C</span>
                                </div>
                              )}
                              {step.parametres.pression && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Gauge size={14} />
                                  <span style={{ fontSize: '12px' }}>{step.parametres.pression} bar</span>
                                </div>
                              )}
                              {step.parametres.vitesse && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Zap size={14} />
                                  <span style={{ fontSize: '12px' }}>{step.parametres.vitesse} RPM</span>
                                </div>
                              )}
                              {step.parametres.couple && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Settings size={14} />
                                  <span style={{ fontSize: '12px' }}>{step.parametres.couple} Nm</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Contrôle qualité */}
                        {step.qualite && (
                          <div>
                            <span style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '6px' }}>CONTRÔLE QUALITÉ</span>
                            <div style={{ 
                              padding: '8px', 
                              borderRadius: '4px', 
                              background: step.qualite.conforme ? '#d4edda' : '#f8d7da',
                              color: step.qualite.conforme ? '#155724' : '#721c24'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                {step.qualite.conforme ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                  {step.qualite.conforme ? 'Conforme' : 'Non-conforme'}
                                </span>
                              </div>
                              {step.qualite.controles && (
                                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                  {Array.isArray(step.qualite.controles) 
                                    ? step.qualite.controles.join(', ')
                                    : step.qualite.controles}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
                <Package size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p>Aucune étape de production enregistrée</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        !loading && (
          /* All lots view */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>TOUS LES LOTS</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} />
                <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                  {['all', 'completed', 'in-progress', 'rejected'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterStatus(f)}
                      style={{ 
                        padding: '4px 8px', 
                        border: 'none', 
                        background: filterStatus === f ? '#007bff' : '#f0f0f0', 
                        color: filterStatus === f ? 'white' : 'black', 
                        cursor: 'pointer', 
                        fontSize: '12px' 
                      }}
                    >
                      {f === 'all' ? 'Tous' : f === 'completed' ? 'Terminés' : f === 'in-progress' ? 'En cours' : 'Rejetés'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
              {filteredLots.map(lot => (
                <button
                  key={lot.id || lot.numeroLot}
                  onClick={() => {
                    setSearchLot(lot.numeroLot);
                    setSelectedLot(lot);
                  }}
                  style={{ textAlign: 'left', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontFamily: 'monospace' }}>{lot.numeroLot}</h4>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: lot.status === 'completed' ? 'green' : lot.status === 'in-progress' ? 'blue' : 'red' }} />
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>{lot.produit}</p>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ordre:</span> 
                      <span style={{ fontFamily: 'monospace' }}>{lot.ordreId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Étapes:</span> 
                      <span>{lot.steps?.length || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rendement:</span> 
                      <span style={{ fontFamily: 'monospace' }}>
                        {lot.quantiteInitiale > 0 
                          ? ((lot.quantiteFinale / lot.quantiteInitiale) * 100).toFixed(1) 
                          : '0'}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredLots.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <Package size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p>Aucun lot trouvé</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}