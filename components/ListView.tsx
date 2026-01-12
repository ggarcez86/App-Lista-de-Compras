
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingList, ShoppingItem, SortOption } from '../types';
import { ArrowLeft, Trash2, Plus, MoreVertical, Check, RefreshCw, ShoppingBag, Users, FileText, Upload, Download, Edit3, Type, Eraser, CloudOff, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { parseItemText } from '../utils/parser';
import { ShareModal } from './ShareModal';
import { ImportModal } from './ImportModal';
import { FIXED_LIST_ID } from '../hooks/useLocalStorage';

const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxo6cKf1F3GPwuPbxmIBUJir-PBNbtWrKzT4fQlwVapq27XWWoMxD-3hgcfFLT-C0CDpg/exec';

interface ListViewProps {
  list: ShoppingList;
  onUpdate: (updatedList: ShoppingList) => void;
  onBack: () => void;
  onDeleteList: () => void;
  onDuplicate: (id: string, newName: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({ list, onUpdate, onBack, onDeleteList }) => {
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastPushStatus, setLastPushStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const sheetsUrl = localStorage.getItem('gsheets_url') || DEFAULT_SHEETS_URL;
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef<number | null>(null);
  
  const lastLocalActionTime = useRef<number>(0);
  const isFixed = list.id === FIXED_LIST_ID;
  const syncDisabled = !!list.syncDisabled;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const silentPull = async () => {
    if (syncDisabled) return;
    if (Date.now() - lastLocalActionTime.current < 5000) return;
    
    if (!sheetsUrl || !sheetsUrl.includes('/exec') || isSyncing) return;
    setIsSyncing(true);
    try {
        const response = await fetch(`${sheetsUrl}?t=${Date.now()}`);
        const remoteData = await response.json();
        if (remoteData && Array.isArray(remoteData.items)) {
            const normalizedRemote = remoteData.items.map((ri: any, idx: number) => ({
                id: ri.id || `item-${idx}-${Date.now()}`,
                description: ri.description || ri.item || ri.n || "Item",
                quantity: parseFloat(ri.quantity || ri.q || ri.qtd) || 1,
                unit: ri.unit || ri.u || 'un',
                brand: ri.brand || ri.b || '',
                price: parseFloat(ri.price || ri.p || ri.valor) || 0,
                completed: !!(ri.completed || ri.c || ri.ok),
                note: ri.note || ri.obs || ''
            }));

            const localSig = JSON.stringify(list.items.map(i => ({d: i.description, q: i.quantity, c: i.completed, p: i.price})));
            const remoteSig = JSON.stringify(normalizedRemote.map((i: any) => ({d: i.description, q: i.quantity, c: i.completed, p: i.price})));
            
            if (localSig !== remoteSig) {
                onUpdate({ ...list, items: normalizedRemote, updatedAt: Date.now() });
            }
            setLastPushStatus('done');
        }
    } catch (e) {
        setLastPushStatus('error');
    } finally {
        setIsSyncing(false);
        setTimeout(() => setLastPushStatus('idle'), 3000);
    }
  };

  useEffect(() => {
    if (syncDisabled) return;
    if (!sheetsUrl || !sheetsUrl.includes('/exec')) return;
    if (isInitialMount.current) { silentPull(); isInitialMount.current = false; }
    const interval = setInterval(() => { if (!isSyncing && !editingItemId) silentPull(); }, 12000);
    return () => clearInterval(interval);
  }, [sheetsUrl, editingItemId, syncDisabled]);

  const silentPush = async (currentList: ShoppingList) => {
    if (syncDisabled) return;
    if (!sheetsUrl || !sheetsUrl.includes('/exec')) return;
    setLastPushStatus('syncing');
    try {
        await fetch(sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name: currentList.name, items: currentList.items, updatedAt: Date.now() })
        });
        setLastPushStatus('done');
        setTimeout(() => setLastPushStatus('idle'), 2000);
    } catch (e) {
        setLastPushStatus('error');
    }
  };

  const handleAction = (updatedItems: ShoppingItem[]) => {
    lastLocalActionTime.current = Date.now();
    const updatedList = { ...list, items: updatedItems, updatedAt: Date.now() };
    onUpdate(updatedList);
    
    if (syncDisabled) return;
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => silentPush(updatedList), 800);
  };

  const toggleItem = (itemId: string) => {
    const updatedItems = list.items.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item);
    handleAction(updatedItems);
  };

  const updateItem = (itemId: string, updates: Partial<ShoppingItem>) => {
    const updatedItems = list.items.map((item) => item.id === itemId ? { ...item, ...updates } : item);
    handleAction(updatedItems);
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = list.items.filter((item) => item.id !== itemId);
    handleAction(updatedItems);
  };

  const handleAddItem = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemText.trim()) return;
    const parsed = parseItemText(newItemText);
    const newItem: ShoppingItem = {
      id: uuidv4(),
      description: parsed.description || newItemText,
      quantity: parsed.quantity || 1,
      unit: parsed.unit || 'un',
      completed: false,
    };
    handleAction([...list.items, newItem]);
    setNewItemText('');
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        let rawItems: any[] = [];
        
        // Função auxiliar para validar se um objeto parece ser um item de compra
        const isItem = (obj: any) => obj && (obj.description || obj.item || obj.n || obj.desc) && !obj.items;

        // Lógica de Detecção Robusta
        if (Array.isArray(importedData)) {
            // Pode ser um array de itens OU um array de listas (Backup)
            if (importedData.length > 0) {
                if (importedData[0].items && Array.isArray(importedData[0].items)) {
                    // É um BACKUP (Array de listas) -> Pega itens de todas as listas
                    importedData.forEach(listObj => {
                        if (listObj.items) rawItems = [...rawItems, ...listObj.items];
                    });
                } else {
                    // É um array de itens simples
                    rawItems = importedData;
                }
            }
        } else if (importedData.items && Array.isArray(importedData.items)) {
            // É um objeto de Lista Única
            rawItems = importedData.items;
        } else if (importedData.i && Array.isArray(importedData.i)) {
            // Formato compactado
            rawItems = importedData.i.map((row: any[]) => ({
                description: row[0], quantity: row[1], unit: row[2], completed: row[3], note: row[4], price: row[5], brand: row[6]
            }));
        } else if (isItem(importedData)) {
            // Objeto de item único
            rawItems = [importedData];
        }

        if (rawItems.length > 0) {
            const mapped = rawItems.map((i: any) => {
                // Se o "item" for na verdade um objeto de lista que escapou da detecção, ignora
                if (i.items && Array.isArray(i.items)) return null;

                const desc = i.description || i.item || i.desc || i.n || i.name;
                if (!desc || typeof desc !== 'string') return null;

                return {
                    id: uuidv4(),
                    description: String(desc).trim(),
                    quantity: parseFloat(i.quantity || i.q || 1),
                    unit: String(i.unit || i.u || 'un').trim(),
                    price: parseFloat(i.price || i.p || 0),
                    completed: !!(i.completed || i.c || i.ok),
                    brand: String(i.brand || i.b || '').trim(),
                    note: String(i.note || i.obs || '').trim()
                };
            }).filter(Boolean) as ShoppingItem[];

            if (mapped.length > 0) {
                handleAction([...list.items, ...mapped]);
                setIsMenuOpen(false);
                alert(`${mapped.length} produtos adicionados à lista "${list.name}"!`);
            } else {
                alert("Nenhum produto válido encontrado no arquivo.");
            }
        } else {
            alert("Não foi possível encontrar itens neste arquivo JSON.");
        }
      } catch (err) { 
        console.error(err);
        alert("Erro ao processar arquivo JSON."); 
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportThisList = () => {
    const dataStr = JSON.stringify(list, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const sortedItems = useMemo(() => {
    const items = [...list.items];
    if (sortBy === 'status') return items.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
    return items;
  }, [list.items, sortBy]);

  const progress = list.items.length === 0 ? 0 : (list.items.filter(i => i.completed).length / list.items.length) * 100;

  return (
    <div className="flex h-screen flex-col bg-[#f8fafc]">
      <header className={`sticky top-0 z-40 shadow-sm border-b-2 bg-white ${isFixed ? 'border-amber-200' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between p-4 px-6">
          <div className="flex items-center gap-4 overflow-hidden">
            <button onClick={onBack} className="rounded-2xl p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-90">
              <ArrowLeft size={20} />
            </button>
            <div className="overflow-hidden">
              <h1 className="text-lg font-heading font-black text-slate-900 truncate pr-2 flex items-center gap-2">
                {list.name}
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 shadow-sm border-2 border-white ${syncDisabled ? 'bg-slate-300' : (lastPushStatus === 'syncing' || isSyncing ? 'bg-blue-500 animate-pulse' : lastPushStatus === 'error' ? 'bg-red-500' : 'bg-accent')}`} />
              </h1>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {syncDisabled ? 'Lista Privada' : (isSyncing ? 'Atualizando...' : 'Sincronizada')} {isFixed ? '• Mensal' : ''}
              </span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
             {!syncDisabled && <button onClick={() => setShowShareModal(true)} className="rounded-2xl p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Users size={20} /></button>}
             <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`rounded-2xl p-2.5 transition-all ${isMenuOpen ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><MoreVertical size={20} /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 rounded-3xl bg-white p-3 shadow-2xl border z-[100] animate-fade-in border-slate-100 divide-y divide-slate-50">
                      <div className="py-2">
                          <button onClick={() => { const newName = prompt('Novo apelido da lista:', list.name); if (newName) { onUpdate({ ...list, name: newName.trim(), updatedAt: Date.now() }); } setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-3 rounded-xl">
                              <Type size={16} className="text-slate-400" /> Renomear Lista
                          </button>
                      </div>
                      <div className="py-2">
                          <button onClick={() => { setShowTextImportModal(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-accent font-black hover:bg-emerald-50 flex items-center gap-3 rounded-xl">
                              <FileText size={16} /> Importar WhatsApp
                          </button>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-3 text-sm text-blue-600 font-bold hover:bg-blue-50 flex items-center gap-3 rounded-xl">
                              <Upload size={16} /> Mesclar JSON
                          </button>
                      </div>
                      <div className="py-2">
                          <button onClick={handleExportThisList} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-3 rounded-xl">
                              <Download size={16} className="text-slate-400" /> Exportar JSON
                          </button>
                          {isFixed ? (
                            <button onClick={() => { if(confirm("Deseja resetar os itens da lista mensal?")) { handleAction([]); } setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-amber-600 font-black hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-3">
                                <Eraser size={16} /> Resetar Itens Fixos
                            </button>
                          ) : (
                            <button onClick={() => { if(confirm("Excluir lista permanentemente?")) { setIsMenuOpen(false); setTimeout(onDeleteList, 100); } }} className="w-full text-left px-4 py-3 text-sm text-red-600 font-black hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3">
                                <Trash2 size={16} /> Excluir Coleção
                            </button>
                          )}
                      </div>
                  </div>
                )}
             </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
        <div className="h-2 w-full bg-slate-50 overflow-hidden">
          <div className="h-full bg-accent transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 pb-36">
        {list.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-10">
            <div className="p-10 rounded-[3rem] bg-white shadow-xl shadow-slate-200/50 mb-8 border border-slate-50">
                <ShoppingBag size={80} strokeWidth={1} className="text-slate-200" />
            </div>
            <h3 className="font-heading font-black text-slate-800 text-xl tracking-tight">Começar Lista</h3>
            <p className="text-sm text-slate-400 mt-3 max-w-[240px] leading-relaxed">Sua coleção está vazia. Adicione itens ou use a importação automática.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {sortedItems.map((item) => (
              <li key={item.id} className={`flex flex-col gap-2 rounded-[2rem] border-2 bg-white p-5 shadow-sm transition-all duration-300 ${item.completed ? 'bg-slate-50 border-slate-100 opacity-60 scale-[0.98]' : 'border-white shadow-md'}`}>
                <div className="flex items-center gap-5">
                  <button onClick={() => toggleItem(item.id)} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-all duration-500 ${item.completed ? 'border-accent bg-accent text-white scale-90' : 'border-slate-100 text-transparent hover:border-accent/30 bg-slate-50'}`}><Check size={28} strokeWidth={4} /></button>
                  <div className="flex-1 min-w-0" onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}>
                    <div className="flex justify-between items-start gap-3">
                        <span className={`text-base font-bold leading-snug break-words transition-all ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.description}</span>
                        <div className="shrink-0 flex flex-col items-end">
                            <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl border ${item.completed ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                {item.quantity}{item.unit}
                            </span>
                            {(item.price || 0) > 0 && <span className="text-[10px] font-black text-accent mt-2 tracking-tight">R$ {item.price?.toFixed(2)}</span>}
                        </div>
                    </div>
                  </div>
                </div>
                {editingItemId === item.id && (
                  <div className="mt-5 border-t border-slate-100 pt-5 space-y-5 animate-slide-up">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Produto</label>
                        <input type="text" className="w-full p-4 text-sm rounded-2xl border-2 border-slate-50 focus:border-accent focus:outline-none font-bold text-slate-800 bg-slate-50" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Qtd / Medida</label>
                            <div className="flex border-2 border-slate-50 rounded-2xl overflow-hidden bg-slate-50">
                                <input type="number" step="any" className="w-1/2 p-4 text-sm bg-transparent focus:outline-none font-bold text-slate-700" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} />
                                <input type="text" className="w-1/2 p-4 text-sm bg-white border-l focus:outline-none font-medium" value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} />
                            </div>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Preço Un.</label>
                            <input type="number" step="0.01" className="w-full p-4 text-sm rounded-2xl border-2 border-slate-50 focus:border-accent focus:outline-none font-bold text-slate-700 bg-slate-50" value={item.price || ''} onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
                         </div>
                    </div>
                    <div className="flex justify-between gap-4 pt-2">
                        <button onClick={() => deleteItem(item.id)} className="flex items-center justify-center gap-3 rounded-2xl bg-red-50 px-6 py-5 text-xs font-black text-red-600 border border-red-100 flex-1 active:scale-95 transition-all"><Trash2 size={18} /> Remover</button>
                        <button onClick={() => setEditingItemId(null)} className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-5 text-xs font-black text-white shadow-xl flex-1 active:scale-95 transition-all">Pronto</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl p-6 border-t border-slate-100 z-20 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.05)] rounded-t-[3rem]">
        <form onSubmit={handleAddItem} className="flex gap-3 w-full max-w-2xl mx-auto">
          <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="O que vamos comprar hoje?" className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-5 text-slate-900 focus:border-accent focus:bg-white focus:outline-none transition-all font-bold placeholder:text-slate-300 shadow-inner" />
          <button type="submit" disabled={!newItemText.trim()} className="flex items-center justify-center rounded-2xl bg-slate-900 px-8 text-white shadow-2xl active:scale-90 disabled:opacity-50 transition-all"><Plus size={36} strokeWidth={3} /></button>
        </form>
      </footer>

      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} listName={list.name} />}
      {showTextImportModal && <ImportModal onClose={() => setShowTextImportModal(false)} onImport={(items) => { handleAction([...list.items, ...items]); setShowTextImportModal(false); }} isMergeMode={true} />}
    </div>
  );
};
