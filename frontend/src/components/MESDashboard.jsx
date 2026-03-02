import React from 'react';
import { 
  Search,
  LayoutDashboard,
  Cpu,
  ClipboardList,
  Activity,
  AlertOctagon,
  TrendingUp,
  FileText
} from 'lucide-react';

const MESDashboard = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header avec recherche */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Rechercher des commandes, clients, produits..."
              className="w-full outline-none text-gray-600 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Titre principal */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-800">Système MES - Atelier de Production</h1>
        <p className="text-sm text-gray-500 mt-1">Manufacturing Execution System • Gestion complète de l'atelier</p>
      </div>

      {/* Menu de navigation - 7 options */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex space-x-8">
          <NavItem icon={LayoutDashboard} label="Tableau de bord" active />
          <NavItem icon={Cpu} label="Machines" />
          <NavItem icon={ClipboardList} label="Ordres de fabrication" />
          <NavItem icon={Activity} label="Suivi production" />
          <NavItem icon={AlertOctagon} label="Arrêts & Pannes" />
          <NavItem icon={TrendingUp} label="Performance" />
          <NavItem icon={FileText} label="Tracabilité" />
        </div>
      </div>

      {/* Contenu principal (placeholder) */}
      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          Contenu du tableau de bord - Sélectionnez une option
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active = false }) => (
  <button className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
    active 
      ? 'border-blue-500 text-blue-600' 
      : 'border-transparent text-gray-600 hover:text-gray-900'
  }`}>
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default MESDashboard;