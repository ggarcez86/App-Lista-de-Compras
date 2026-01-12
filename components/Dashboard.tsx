import React, { useState, useRef, useEffect } from 'react';
import { ShoppingList } from '../types';
import { Plus, ShoppingBag, Smartphone, X, Check, Settings, Download, Upload, Database, Code, ArrowRight, Star, CloudOff, Cloud, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { FIXED_LIST_ID } from '../hooks/useLocalStorage';

const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxo6cKf1F3GPwuPbxmIBUJir-PBNbtWrKzT4fQlwVapq27XWWoMxD-3hgcfFLT-C0CDpg/exec';
const MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Syi4iWiSR5-XCPkW4xSyZwcwQ_PvsykAf_FnUhX2Po4/edit?usp=sharing';

interface DashboardProps {
  lists: ShoppingList[];
  onCreateList: (name: string, syncDisabled: boolean) => void;
  onImportList: () => void;
  onSelectList: (id: string) => void;
  onDuplicateList: (id: string, newName: string) => void;
  onDeleteList: (id: string) => void;
  onRestoreBackup: (lists: ShoppingList[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  lists, 
  onCreateList, 
  onImportList, 
  onSelectList,
  onRestoreBackup 
}) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isNamingList, setIsNamingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [sheetsUrl, setSheetsUrl] = useState(localStorage.getItem('gsheets_url') || DEFAULT_SHEETS_URL);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('gsheets_url', sheetsUrl);
  }, [sheetsUrl]);

  const handleConfirmCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim(), !syncEnabled);
    setShowCreateMenu(false);
    setIsNamingList(false);
    setNewListName('');
    setSyncEnabled(true);
  };

  const sortedLists = [...lists].sort((a, b) => {
    if (a.id === FIXED_LIST_ID) return -1;
    if (b.id === FIXED_LIST_ID) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] pb-20 text-center">
      {/* Topo Decorativo com a Identidade da Família */}
      <div className="bg-[#1e293b] text-white pt-8 pb-32 px-6 rounded-b-[5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 h-64 w-64 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 h-48 w-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        {/* Barra Superior de Ações */}
        <div className="relative z-20 flex justify-between items-center mb-4">
            <button onClick={() => setShowSettings(true)} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-all active:scale-90 text-white/40">
              <Settings size={26} />
            </button>
            <button onClick={() => setShowInstallHelp(true)} className="p-4 rounded-2xl bg-accent/20 hover:bg-accent/30 text-accent border border-accent/20 transition-all active:scale-90">
              <Smartphone size={26} />
            </button>
        </div>

        {/* Logo Centralizado e GIGANTE (Sem Fundo) */}
        <header className="relative z-10 flex flex-col items-center justify-center py-2">
            <img 
              src="https://bioflow.online/logosemfundo.png" 
              alt="Garcez Heredia" 
              className="h-72 sm:h-96 w-auto object-contain transition-transform active:scale-95 cursor-pointer drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
              onClick={() => window.location.reload()}
            />
        </header>

        <div className="mt-4 relative z-10 space-y-4 max-w-sm mx-auto">
           <button 
             onClick={() => setShowCreateMenu(true)} 
             className="w-full flex items-center justify-between group rounded-[2.5rem] bg-white p-7 text-slate-900 shadow-2xl active:scale-[0.98] transition-all"
           >
             <div className="flex items-center gap-5">
                <div className="bg-accent/10 p-4 rounded-[1.5rem] text-accent">
                    <Plus size={34} strokeWidth={3} />
                </div>
                <span className="font-heading font-black text-2xl tracking-tighter">Nova Lista</span>
             </div>
             <ArrowRight size={26} className="text-slate-300 group-hover:text-accent transition-colors" />
           </button>

           <a 
             href={MASTER_SHEET_URL}
             target="_blank"
             rel="noopener noreferrer"
             className="w-full flex items-center justify-between group rounded-[2.2rem] bg-white/5 border border-white/10 p-6 text-white hover:bg-white/10 active:scale-[0.98] transition-all"
           >
             <div className="flex items-center gap-5 text-left">
                <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-400">
                    <FileSpreadsheet size={30} />
                </div>
                <div>
                    <span className="font-bold text-xl block leading-tight">Planilha Mestra</span>
                    <span className="text-[12px] text-white/30 uppercase font-black tracking-widest">Acesso Direto Sheets</span>
                </div>
             </div>
             <ArrowRight size={22} className="text-white/10 group-hover:text-emerald-400 transition-colors" />
           </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-6 -mt-16 relative z-20 space-y-12">
        <div className="space-y-8">
          <div className="flex justify-center items-center">
            <h2 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.6em] flex items-center gap-6">
                <span className="h-1 w-12 rounded-full bg-slate-200"></span>
                Suas Listas
                <span className="h-1 w-12 rounded-full bg-slate-200"></span>
            </h2>
          </div>
          
          <div className="grid gap-6">
              {sortedLists.map((list) => {
                  const isFixed = list.id === FIXED_LIST_ID;
                  const isLocal = !!list.syncDisabled;
                  return (
                    <div 
                        key={list.id} 
                        className={`bg-white rounded-[3.5rem] border-2 shadow-sm overflow-hidden active:scale-[0.97] transition-all hover:shadow-2xl cursor-pointer group ${isFixed ? 'border-amber-200 bg-amber-50/50' : 'border-transparent'}`} 
                        onClick={() => onSelectList(list.id)}
                    >
                        <div className="px-6 py-9 sm:px-10 flex justify-between items-center text-left">
                            <div className="overflow-hidden pr-4 flex-1">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                                    <h3 className={`font-heading font-black text-2xl sm:text-3xl tracking-tight transition-colors ${isFixed ? 'text-amber-900' : 'text-slate-800 group-hover:text-accent'}`}>
                                        {list.name}
                                    </h3>
                                    {isFixed && (
                                        <span className="bg-amber-500 text-[10px] text-white px-3.5 py-2 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shrink-0 shadow-lg shadow-amber-100">
                                            <Star size={12} fill="white" /> FIXA
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className={`text-sm sm:text-base font-bold uppercase tracking-tight ${isFixed ? 'text-amber-600' : isLocal ? 'text-slate-400' : 'text-blue-500'}`}>
                                        {list.items.length} itens
                                    </p>
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                    <p className="text-[12px] sm:text-[13px] font-bold text-slate-300 uppercase tracking-tighter">
                                        {isFixed ? 'Residencial Mensal' : isLocal ? 'Modo Local' : 'Nuvem Ativa'}
                                    </p>
                                </div>
                            </div>
                            <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-[2.2rem] flex items-center justify-center transition-all shadow-md shrink-0 ${isFixed ? 'bg-amber-500 text-white shadow-amber-200' : isLocal ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-accent group-hover:text-white group-hover:border-accent'}`}>
                                {isLocal ? <CloudOff size={34} /> : (isFixed ? <Check size={44} strokeWidth={4} /> : <ShoppingBag size={34} />)}
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>
        </div>

        {/* Footer com crédito discreto */}
        <footer className="pt-20 pb-16">
            <p className="text-[13px] font-black text-slate-300 uppercase tracking-[0.8em]">
                Sistema Residencial v2.5
            </p>
        </footer>
      </div>
      {/* ... (restante do componente Dashboard permanece igual) ... */}
      {showSettings && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/80 p-0 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="w-full max-w-sm rounded-t-[3rem] sm:rounded-3xl bg-white p-8 shadow-2xl relative my-auto border-t sm:border border-slate-100">
                <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors">
                    <X size={28} />
                </button>
                <h2 className="text-2xl font-heading font-black text-slate-900 mb-8 tracking-tight text-left">Preferências</h2>
                
                <div className="space-y-8 text-left">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] text-blue-600 font-black uppercase tracking-widest">
                                <Database size={14} /> Link de Sincronia
                            </div>
                        </div>
                        <input 
                            type="text" 
                            className="w-full text-xs p-5 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:outline-none bg-slate-50 font-mono"
                            value={sheetsUrl}
                            onChange={(e) => setSheetsUrl(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-8">
                        <button onClick={() => { const listsToExport = lists; const dataStr = JSON.stringify(listsToExport, null, 2); const dataBlob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(dataBlob); const link = document.createElement('a'); link.href = url; link.download = `backup_garcez_heredia_${new Date().toISOString().split('T')[0]}.json`; link.click(); URL.revokeObjectURL(url); }} className="flex flex-col items-center gap-3 rounded-2xl border p-5 bg-white active:scale-95 shadow-sm">
                            <Download className="text-blue-500" />
                            <span className="font-black text-[10px] uppercase">Exportar</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 rounded-2xl border p-5 bg-white active:scale-95 shadow-sm">
                            <Upload className="text-amber-500" />
                            <span className="font-black text-[10px] uppercase">Importar</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const content = e.target?.result as string; const importedData = JSON.parse(content); onRestoreBackup(Array.isArray(importedData) ? importedData : [importedData]); setShowSettings(false); } catch (err) { alert("Erro ao ler o arquivo."); } }; reader.readAsText(file); }} accept=".json" className="hidden" />
                    </div>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black mt-10 shadow-xl">Confirmar</button>
            </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/80 p-0 sm:p-4 backdrop-blur-sm animate-fade-in text-center">
            <div className="w-full max-w-sm rounded-t-[3rem] sm:rounded-3xl bg-white p-10 shadow-2xl relative">
                <button onClick={() => setShowInstallHelp(false)} className="absolute top-10 right-10 text-slate-300"><X size={28} /></button>
                <div className="flex flex-col items-center">
                    <div className="bg-slate-50 p-5 rounded-3xl text-slate-900 mb-6 border border-slate-100"><Smartphone size={40} /></div>
                    <h2 className="text-2xl font-heading font-black text-slate-900 mb-6">Salvar no Início</h2>
                    <p className="text-sm text-slate-600 font-medium text-left space-y-4">
                        Para usar como um App:<br/>
                        1. Toque no ícone de <b>Compartilhar</b><br/>
                        2. Escolha <b>"Adicionar à Tela de Início"</b>
                    </p>
                    <button onClick={() => setShowInstallHelp(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg mt-10">Concluído</button>
                </div>
            </div>
        </div>
      )}

      {showCreateMenu && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in text-center">
            <div className="w-full max-w-sm rounded-[3rem] bg-white p-10 shadow-2xl animate-slide-up relative">
                <button onClick={() => setShowCreateMenu(false)} className="absolute top-8 right-8 text-slate-300"><X size={24} /></button>
                {!isNamingList ? (
                    <div className="space-y-4 text-left">
                        <h2 className="mb-8 text-2xl font-heading font-black text-slate-900 tracking-tight text-center">Configurar Lista</h2>
                        <button onClick={() => setIsNamingList(true)} className="flex w-full items-center gap-5 rounded-3xl border-2 p-6 active:bg-slate-50 transition-all border-slate-100">
                            <div className="bg-slate-100 p-3 rounded-2xl text-slate-900"><Plus size={24} /></div>
                            <div className="text-left font-black text-slate-800">Criar Manualmente</div>
                        </button>
                        <button onClick={() => { setShowCreateMenu(false); onImportList(); }} className="flex w-full items-center gap-5 rounded-3xl border-2 p-6 active:bg-blue-50 transition-all border-slate-100">
                            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Check size={24} /></div>
                            <div className="text-left font-black text-slate-800">Importar do WhatsApp</div>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleConfirmCreate} className="space-y-6 text-left">
                        <h2 className="text-2xl font-heading font-black text-center text-slate-900">Novo Catálogo</h2>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Apelido da Lista</label>
                                <input autoFocus type="text" className="w-full p-5 rounded-2xl border-2 bg-slate-50 font-bold focus:border-accent focus:outline-none transition-all" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Ex: Supermercado" />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${syncEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                        {syncEnabled ? <Cloud size={18} /> : <CloudOff size={18} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black text-slate-700">Backup em Nuvem</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Sincronia Automática</p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setSyncEnabled(!syncEnabled)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${syncEnabled ? 'bg-accent shadow-inner' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${syncEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl mt-4 active:scale-95 transition-all">Criar Lista</button>
                    </form>
                )}
            </div>
        </div>
      )}
    </div>
  );
};