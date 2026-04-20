//Traceability.jsx
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
  X,
  Plus,
  Save,
  AlertCircle
} from 'lucide-react';

// Composant Modal de création de lot
function CreateLotModal({ isOpen, onClose, onLotCreated }) {
  const [formData, setFormData] = useState({
    numero_lot: '',
    produit: '',
    ordre_id: '',
    quantite_initiale: '',
    date_creation: new Date().toISOString().split('T')[0],
    status: 'in-progress'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateLotNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LOT-${year}${month}${day}-${random}`;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.produit || !formData.quantite_initiale) {
      setError('Veuillez remplir tous les champs obligatoires');
      setLoading(false);
      return;
    }

    const lotData = {
      ...formData,
      numero_lot: formData.numero_lot || generateLotNumber(),
      quantite_initiale: parseInt(formData.quantite_initiale),
      quantite_finale: parseInt(formData.quantite_initiale),
      status: 'in-progress'
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/traceability/lots", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lotData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la création du lot');
      }

      const newLot = await response.json();
      onLotCreated(newLot);
      onClose();
      setFormData({
        numero_lot: '',
        produit: '',
        ordre_id: '',
        quantite_initiale: '',
        date_creation: new Date().toISOString().split('T')[0],
        status: 'in-progress'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-in'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '550px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e9ecef',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px 12px 0 0',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '8px',
                borderRadius: '10px'
              }}>
                <Plus size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Création de lot</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Remplissez les informations ci-dessous</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              <X size={20} color="white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: '#fee',
              borderLeft: '4px solid #dc3545',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              color: '#dc3545'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
              NUMÉRO DE LOT
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                name="numero_lot"
                value={formData.numero_lot}
                onChange={handleChange}
                placeholder="Auto-généré si vide"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, numero_lot: generateLotNumber() })}
                style={{
                  padding: '0 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#5a6268'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#6c757d'}
              >
                Générer
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
              PRODUIT <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              name="produit"
              value={formData.produit}
              onChange={handleChange}
              placeholder="Ex: Joint SPI 45x62x8 - Nitrile"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
                ORDRE DE FABRICATION
              </label>
              <input
                type="text"
                name="ordre_id"
                value={formData.ordre_id}
                onChange={handleChange}
                placeholder="Ex: OF-2026-001"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
                QUANTITÉ INITIALE <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                name="quantite_initiale"
                value={formData.quantite_initiale}
                onChange={handleChange}
                placeholder="Ex: 1000"
                required
                min="1"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
              DATE DE CRÉATION
            </label>
            <input
              type="date"
              name="date_creation"
              value={formData.date_creation}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#6c757d',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#dc3545';
                e.currentTarget.style.color = '#dc3545';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.color = '#6c757d';
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Création en cours...' : (
                <>
                  <Save size={18} />
                  Créer le lot
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Traceability() {
  const [searchLot, setSearchLot] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/traceability/lots");
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setLots(data);
    } catch (err) {
      console.error("Erreur API:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchLot.trim()) {
      setSelectedLot(null);
      return;
    }
    const found = lots.find(lot =>
      lot.numero_lot?.toLowerCase().includes(searchLot.toLowerCase())
    );
    setSelectedLot(found || null);
  };

  const handleLotCreated = (newLot) => {
    fetchLots();
    setSelectedLot(newLot);
    setSearchLot(newLot.numero_lot);
  };

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

  const exportToPDF = (lot) => {
  window.open(`http://127.0.0.1:8000/api/traceability/lots/${lot.numero_lot}/pdf`);
  };

  const toggleStepDetails = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      background: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '10px',
              borderRadius: '10px',
              color: 'white'
            }}>
              <Layers size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#212529' }}>TRAÇABILITÉ</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6c757d' }}>Système de traçabilité MES · Module 04</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Plus size={18} />
              Nouveau lot
            </button>
            <div style={{
              padding: '6px 12px',
              background: '#f8f9fa',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#6c757d',
              fontFamily: 'monospace'
            }}>
              {new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Search section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Search size={20} color="#667eea" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#212529' }}>RECHERCHE PAR NUMÉRO DE LOT</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              NUMÉRO DE LOT
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              placeholder="Ex: LOT-20260402-123"
              value={searchLot}
              onChange={(e) => setSearchLot(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleSearch}
              style={{
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Rechercher
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ACCÈS RAPIDE
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {lots.slice(0, 5).map(lot => (
              <button
                key={lot.id}
                onClick={() => {
                  setSearchLot(lot.numero_lot);
                  setSelectedLot(lot);
                }}
                style={{
                  padding: '6px 14px',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.color = '#212529';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                {lot.numero_lot}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e9ecef',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }} />
          <p style={{ color: '#6c757d' }}>Chargement des données...</p>
        </div>
      )}

      {/* Results */}
      {!loading && selectedLot ? (
        <div>
          {/* Lot summary */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontFamily: 'monospace', fontWeight: '600', color: '#212529' }}>{selectedLot.numero_lot}</h2>
                  <span style={{
                    padding: '4px 12px',
                    background: getStatusColor(selectedLot.status),
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {getStatusLabel(selectedLot.status)}
                  </span>
                </div>
                <p style={{ margin: '8px 0 4px 0', fontSize: '16px', fontWeight: '500', color: '#495057' }}>{selectedLot.produit}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#6c757d' }}>Ordre de fabrication: {selectedLot.ordre_id || 'N/A'}</p>
              </div>
              <button 
                onClick={() => exportToPDF(selectedLot)} 
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <FileText size={14} /> Exporter PDF
              </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CRÉÉ LE</span>
                  <Calendar size={14} color="#667eea" />
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontFamily: 'monospace', fontWeight: '500', color: '#212529' }}>{selectedLot.date_creation}</p>
              </div>
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QTÉ INITIALE</span>
                  <Package size={14} color="#667eea" />
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontFamily: 'monospace', fontWeight: '500', color: '#212529' }}>{selectedLot.quantite_initiale}</p>
              </div>
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QTÉ FINALE</span>
                  <CheckCircle2 size={14} color="#28a745" />
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontFamily: 'monospace', fontWeight: '500', color: '#212529' }}>{selectedLot.quantite_finale}</p>
              </div>
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RENDEMENT</span>
                  <Activity size={14} color="#667eea" />
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontFamily: 'monospace', fontWeight: '500', color: '#212529' }}>
                  {selectedLot.quantite_initiale > 0 
                    ? ((selectedLot.quantite_finale / selectedLot.quantite_initiale) * 100).toFixed(1) 
                    : '0'}%
                </p>
              </div>
            </div>
          </div>

          {/* Historique de production */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Activity size={20} color="#667eea" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#212529' }}>HISTORIQUE DE PRODUCTION</h3>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6c757d', background: '#f8f9fa', padding: '4px 8px', borderRadius: '6px' }}>
                {selectedLot.steps?.length || 0} étape(s)
              </span>
            </div>

            {selectedLot.steps && selectedLot.steps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {selectedLot.steps.map((step, index) => (
                  <div key={step.id || index} style={{ 
                    border: `2px solid ${step.status === 'defect' ? '#ffc107' : step.status === 'completed' ? '#28a745' : '#17a2b8'}`,
                    borderRadius: '10px',
                    background: 'white',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}>
                    <div 
                      onClick={() => toggleStepDetails(step.id || index)}
                      style={{ 
                        padding: '15px 20px',
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
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#212529' }}>{step.operation}</div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>{step.machine} • {step.created_at || step.timestamp || 'Date non spécifiée'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '11px', padding: '3px 10px', background: getStatusColor(step.status), borderRadius: '12px', fontWeight: '500' }}>
                          {getStatusLabel(step.status)}
                        </span>
                        {expandedSteps[step.id || index] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>

                    {expandedSteps[step.id || index] && (
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OPÉRATEUR</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <User size={14} color="#667eea" />
                              <span style={{ fontSize: '13px', color: '#495057' }}>{step.operateur || 'N/A'}</span>
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DURÉE</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <Clock size={14} color="#667eea" />
                              <span style={{ fontSize: '13px', color: '#495057' }}>{formatDuration(step.duree_min)}</span>
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUANTITÉ</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <Package size={14} color="#667eea" />
                              <span style={{ fontSize: '13px', color: '#495057' }}>{step.quantite || 'N/A'} unités</span>
                            </div>
                          </div>
                        </div>

                        {step.parametres && Object.keys(step.parametres).length > 0 && (
                          <div style={{ marginBottom: '15px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                              PARAMÈTRES TECHNIQUES
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                              {step.parametres.temperature && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Thermometer size={14} color="#667eea" />
                                  <span style={{ fontSize: '13px', color: '#495057' }}>{step.parametres.temperature}°C</span>
                                </div>
                              )}
                              {step.parametres.pression && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Gauge size={14} color="#667eea" />
                                  <span style={{ fontSize: '13px', color: '#495057' }}>{step.parametres.pression} bar</span>
                                </div>
                              )}
                              {step.parametres.vitesse && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Zap size={14} color="#667eea" />
                                  <span style={{ fontSize: '13px', color: '#495057' }}>{step.parametres.vitesse} RPM</span>
                                </div>
                              )}
                              {step.parametres.couple && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Settings size={14} color="#667eea" />
                                  <span style={{ fontSize: '13px', color: '#495057' }}>{step.parametres.couple} Nm</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {step.qualite && (
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                              CONTRÔLE QUALITÉ
                            </span>
                            <div style={{ 
                              padding: '12px', 
                              borderRadius: '8px', 
                              background: step.qualite.conforme ? '#d4edda' : '#f8d7da',
                              borderLeft: `4px solid ${step.qualite.conforme ? '#28a745' : '#dc3545'}`
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                {step.qualite.conforme ? <CheckCircle2 size={14} color="#28a745" /> : <AlertTriangle size={14} color="#dc3545" />}
                                <span style={{ fontSize: '13px', fontWeight: '500', color: step.qualite.conforme ? '#155724' : '#721c24' }}>
                                  {step.qualite.conforme ? 'Conforme' : 'Non-conforme'}
                                </span>
                              </div>
                              {step.qualite.controles && (
                                <div style={{ fontSize: '12px', marginTop: '4px', color: step.qualite.conforme ? '#155724' : '#721c24' }}>
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
              <div style={{ textAlign: 'center', padding: '60px', background: '#f8f9fa', borderRadius: '8px', color: '#6c757d' }}>
                <Package size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <p>Aucune étape de production enregistrée</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        !loading && (
          /* All lots view */
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#667eea" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#212529' }}>TOUS LES LOTS</h3>
                <span style={{ fontSize: '12px', background: '#e9ecef', padding: '2px 8px', borderRadius: '20px', color: '#495057' }}>
                  {filteredLots.length} lots
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Filter size={16} color="#6c757d" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'all', label: 'Tous' },
                    { value: 'completed', label: 'Terminés' },
                    { value: 'in-progress', label: 'En cours' },
                    { value: 'rejected', label: 'Rejetés' }
                  ].map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFilterStatus(f.value)}
                      style={{ 
                        padding: '6px 14px', 
                        border: '2px solid',
                        borderColor: filterStatus === f.value ? '#667eea' : '#e9ecef',
                        background: filterStatus === f.value ? '#667eea' : 'white', 
                        color: filterStatus === f.value ? 'white' : '#6c757d', 
                        cursor: 'pointer', 
                        fontSize: '12px',
                        fontWeight: '500',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
              {filteredLots.map(lot => (
                <button
                  key={lot.id}
                  onClick={() => {
                    setSearchLot(lot.numero_lot);
                    setSelectedLot(lot);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '18px',
                    border: '2px solid #e9ecef',
                    borderRadius: '10px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontFamily: 'monospace', fontWeight: '600', color: '#212529' }}>{lot.numero_lot}</h4>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: lot.status === 'completed' ? '#28a745' : lot.status === 'in-progress' ? '#17a2b8' : '#dc3545',
                      boxShadow: `0 0 0 2px ${lot.status === 'completed' ? '#d4edda' : lot.status === 'in-progress' ? '#d1ecf1' : '#f8d7da'}`
                    }} />
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6c757d', fontWeight: '500' }}>{lot.produit}</p>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Ordre:</span> 
                      <span style={{ fontFamily: 'monospace', color: '#495057' }}>{lot.ordre_id || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Étapes:</span> 
                      <span style={{ fontWeight: '500', color: '#495057' }}>{lot.steps?.length || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rendement:</span> 
                      <span style={{ fontFamily: 'monospace', fontWeight: '500', color: '#495057' }}>
                        {lot.quantite_initiale > 0 
                          ? ((lot.quantite_finale / lot.quantite_initiale) * 100).toFixed(1) 
                          : '0'}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredLots.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6c757d' }}>
                <Package size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <p>Aucun lot trouvé</p>
              </div>
            )}
          </div>
        )
      )}

      <CreateLotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLotCreated={handleLotCreated}
      />
    </div> 
  );
}
