import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingList, ShoppingItem, SortOption } from '../types';
import { ArrowLeft, Trash2, Plus, Settings, Check, FileText, Upload, Eraser, ShoppingBag, Tag, Info, DollarSign, X, SortAsc, ListFilter, List, ChevronUp, ChevronDown, LayoutGrid, RefreshCw, Share2, FileJson } from 'lucide-react';
import { parseItemText } from '../utils/parser';
import { ImportModal } from './ImportModal';
import { ShareModal } from './ShareModal';
import { FIXED_LIST_ID } from '../hooks/useLocalStorage';

const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycby5cYTDF49bQzIkw8onpC4DSVWiQqSWm2pYcgBWb_xZH9DLwc0tTolLXOgJ4dmADU5FNA/exec';

const SECTION_COLORS: Record<string, string> = {
  "Mercearia": "bg-[#0a3d4a]",
  "Bebidas": "bg-[#164e63]",
  "Higiene e Limpeza": "bg-[#334155]",
  "Hortifrúti": "bg-[#065f46]",
  "Padaria": "bg-[#0f766e]",
  "Frios e Laticínios": "bg-[#115e59]",
  "Açougue": "bg-[#450a0a]",
  "Congelados": "bg-[#155e75]",
  "Outras": "bg-slate-600"
};

interface ListViewProps {
  list: ShoppingList;
  onUpdate: (updatedList: ShoppingList) => void;
  onBack: () => void;
  onDeleteList: () => void;
  onDuplicate: (id: string, newName: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({ list, onUpdate, onBack, onDeleteList }) => {
  const [newItemText, setNewItemText] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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

  const silentPush = async (currentList: ShoppingList) => {
    if (syncDisabled || !sheetsUrl || !sheetsUrl.includes('/exec')) return;
    setLastPushStatus('syncing');
    const itemsForSync = currentList.items.map(item => ({
        ...item,
        description: item.isSection ? `[SEÇÃO] ${item.description}` : item.description
    }));
    try {
        await fetch(sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                name: currentList.name, 
                items: itemsForSync, 
                updatedAt: Date.now(),
                isFixed: isFixed
            })
        });
        setLastPushStatus('done');
        setTimeout(() => setLastPushStatus('idle'), 2000);
    } catch (e) {
        setLastPushStatus('error');
    }
  };

  const silentPull = async (isManual = false) => {
    if (syncDisabled || !sheetsUrl || !sheetsUrl.includes('/exec') || isSyncing) return;
    if (!isManual && Date.now() - lastLocalActionTime.current < 5000) return;
    setIsSyncing(true);
    try {
        const response = await fetch(`${sheetsUrl}?t=${Date.now()}`);
        const remoteData = await response.json();
        if (remoteData && Array.isArray(remoteData.items)) {
            const normalizedRemote = remoteData.items.map((ri: any, idx: number) => {
                const desc = String(ri.description || ri.item || "");
                const isSec = desc.includes('[SEÇÃO]');
                return {
                    id: ri.id || `item-remote-${idx}-${Date.now()}`,
                    description: isSec ? desc.replace('[SEÇÃO]', '').trim() : desc,
                    quantity: parseFloat(ri.quantity) || (isSec ? 0 : 1),
                    unit: ri.unit || (isSec ? '' : 'un'),
                    brand: ri.brand || '',
                    price: parseFloat(ri.price) || 0,
                    completed: !!ri.completed,
                    note: ri.note || '',
                    isSection: isSec
                };
            });
            const remoteHasSections = normalizedRemote.some(i => i.isSection);
            const localHasSections = list.items.some(i => i.isSection);
            if (isFixed && localHasSections && !remoteHasSections) {
                await silentPush(list);
                setIsSyncing(false);
                return;
            }
            // TIPAGEM EXPLÍCITA PARA FIX DO ERRO VERCEL
            const localSig = JSON.stringify(list.items.map((i: ShoppingItem) => ({d: i.description, c: i.completed, q: i.quantity})));
            const remoteSig = JSON.stringify(normalizedRemote.map((i: any) => ({d: i.description, c: i.completed, q: i.quantity})));
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
    if (isInitialMount.current) {
        setTimeout(() => silentPull(true), 1500);
        isInitialMount.current = false;
    }
    const interval = setInterval(() => { if (!isSyncing && !editingItem) silentPull(); }, 12000);
    return () => clearInterval(interval);
  }, [syncDisabled, editingItem, sheetsUrl]);

  const handleAction = (updatedItems: ShoppingItem[]) => {
    lastLocalActionTime.current = Date.now();
    const updatedList = { ...list, items: updatedItems, updatedAt: Date.now() };
    onUpdate(updatedList);
    if (syncDisabled) return;
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => silentPush(updatedList), 1000);
  };

  const handleJsonImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        let rawItems: any[] = [];
        if (Array.isArray(importedData)) {
            if (importedData.length > 0 && (importedData[0].items || importedData[0].i)) {
                const matchingList = importedData.find((l: any) => (l.name || l.n) === list.name) || importedData[0];
                rawItems = matchingList.items || matchingList.i || [];
            } else {
                rawItems = importedData;
            }
        } else {
            rawItems = importedData.items || importedData.i || [];
        }

        if (rawItems.length > 0) {
            const currentItems = [...list.items];
            const newProcessedItems: ShoppingItem[] = [];

            rawItems.forEach((item: any) => {
                const desc = String(item.description || item.item || item.n || item.d || "").trim();
                if (!desc) return;

                const isSec = !!(item.isSection || item.s || desc.includes("[SEÇÃO]"));
                const cleanDesc = isSec ? desc.replace('[SEÇÃO]', '').trim() : desc;

                if (isSec && currentItems.some(i => i.isSection && i.description.trim() === cleanDesc)) return;

                newProcessedItems.push({
                    id: crypto.randomUUID(),
                    description: cleanDesc,
                    quantity: parseFloat(item.quantity || item.q || item.qtd) || (isSec ? 0 : 1),
                    unit: String(item.unit || item.u || (isSec ? "" : "un")),
                    brand: String(item.brand || item.b || ""),
                    price: parseFloat(item.price || item.p || item.v) || 0,
                    note: String(item.note || item.obs || item.o || ""),
                    completed: !!(item.completed || item.c || item.ok),
                    isSection: isSec
                });
            });

            if (isFixed) {
                const merged = [...currentItems];
                newProcessedItems.forEach(ni => {
                    const exists = merged.find(mi => mi.description === ni.description && mi.isSection === ni.isSection);
                    if (exists) {
                        Object.assign(exists, { ...ni, id: exists.id });
                    } else {
                        merged.push(ni);
                    }
                });
                handleAction(merged);
            } else {
                handleAction([...currentItems, ...newProcessedItems]);
            }
            alert(`${newProcessedItems.length} itens processados e mesclados!`);
        } else {
            alert("Nenhum item válido encontrado no arquivo.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro crítico ao ler JSON. O formato pode estar corrompido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.items.length) return;
    if (sortBy !== 'default') setSortBy('default');
    const newItems = [...list.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    handleAction(newItems);
  };

  const toggleItem = (itemId: string) => {
    if (list.items.find(i => i.id === itemId)?.isSection) return; 
    const updatedItems = list.items.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item);
    handleAction(updatedItems);
  };

  const updateItem = (itemId: string, updates: Partial<ShoppingItem>) => {
    const updatedItems = list.items.map((item) => item.id === itemId ? { ...item, ...updates } : item);
    if (editingItem && editingItem.id === itemId) setEditingItem({ ...editingItem, ...updates });
    handleAction(updatedItems);
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = list.items.filter((item) => item.id !== itemId);
    handleAction(updatedItems);
    setEditingItem(null);
  };

  const handleAddItem = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemText.trim()) return;
    const parsed = parseItemText(newItemText);
    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      description: parsed.description || newItemText,
      quantity: parsed.quantity || 1,
      unit: parsed.unit || 'un',
      completed: false,
    };
    handleAction([...list.items, newItem]);
    setNewItemText('');
  };

  const sortedItems = useMemo(() => {
    let items = [...list.items];
    if (sortBy === 'alphabetical') {
      return items.sort((a, b) => {
          if (a.isSection && !b.isSection) return -1;
          if (!a.isSection && b.isSection) return 1;
          return a.description.localeCompare(b.description, 'pt-BR');
      });
    }
    if (sortBy === 'status') {
      return items.sort((a, b) => {
          if (a.isSection && !b.isSection) return -1;
          if (!a.isSection && b.isSection) return 1;
          return (a.completed === b.completed ? 0 : a.completed ? 1 : -1);
      });
    }
    return items;
  }, [list.items, sortBy]);

  const totalItems = list.items.filter(i => !i.isSection).length;
  const completedItems = list.items.filter(i => i.completed && !i.isSection).length;
  const progress = totalItems === 0 ? 0 : (completedItems / totalItems) * 100;

  return (
    <div className="flex h-screen flex-col bg-[#f8fafc]">
      <header className={`sticky top-0 z-40 shadow-sm border-b-2 bg-white ${isFixed ? 'border-[#0a3d4a]/20' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between p-4 px-6">
          <div className="flex items-center gap-4 overflow-hidden">
            <button onClick={onBack} className="rounded-2xl p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-90"><ArrowLeft size={20} /></button>
            <div className="overflow-hidden">
              <h1 className="text-lg font-heading font-black text-slate-900 truncate pr-2 flex items-center gap-2">
                {list.name}
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 shadow-sm border-2 border-white ${syncDisabled ? 'bg-slate-300' : (lastPushStatus === 'syncing' || isSyncing ? 'bg-blue-500 animate-pulse' : lastPushStatus === 'error' ? 'bg-red-500' : 'bg-accent')}`} />
              </h1>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{syncDisabled ? 'Lista Privada' : 'Sincronizada'}</span>
            </div>
          </div>
          <div className="flex gap-1">
             <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`rounded-2xl p-2.5 transition-all ${isMenuOpen ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}><Settings size={22} /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 rounded-3xl bg-white p-3 shadow-2xl border z-[100] border-slate-100 divide-y divide-slate-50 animate-fade-in overflow-hidden">
                      <div className="py-2">
                          <button onClick={() => { silentPull(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-colors text-blue-600"><RefreshCw size={16} /> Sincronizar Agora</button>
                          <button onClick={() => { setShowShareModal(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-colors text-accent"><Share2 size={16} /> Código Script v8.0</button>
                      </div>
                      <div className="py-2">
                          <button onClick={() => { setSortBy('default'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-colors ${sortBy === 'default' ? 'text-accent bg-emerald-50' : 'text-slate-700'}`}><List size={16} /> Ordem Manual</button>
                          <button onClick={() => { setSortBy('alphabetical'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-colors ${sortBy === 'alphabetical' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}><SortAsc size={16} /> Organizar A-Z</button>
                      </div>
                      <div className="py-2">
                          <button onClick={() => { setShowTextImportModal(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-emerald-600 font-black hover:bg-emerald-50 flex items-center gap-3 rounded-xl transition-colors"><FileText size={16} /> Importar WhatsApp</button>
                          <button onClick={() => { fileInputRef.current?.click(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-blue-600 font-black hover:bg-blue-50 flex items-center gap-3 rounded-xl transition-colors"><FileJson size={16} /> Mesclar JSON</button>
                      </div>
                      <div className="py-2">
                          {isFixed ? (
                            <button onClick={() => { if(confirm("Limpar produtos mantendo as seções?")) { handleAction(list.items.filter(i => i.isSection)); } setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-[#0a3d4a] font-black hover:bg-teal-50 rounded-xl flex items-center gap-3 transition-colors"><Eraser size={16} /> Resetar Mensal</button>
                          ) : (
                            <button onClick={() => { if(confirm("Deseja excluir esta coleção permanentemente?")) { onDeleteList(); } }} className="w-full text-left px-4 py-3 text-sm text-red-600 font-black hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors"><Trash2 size={16} /> Excluir Coleção</button>
                          )}
                      </div>
                  </div>
                )}
             </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleJsonImport} accept=".json" className="hidden" />
        <div className="h-1.5 w-full bg-slate-50 overflow-hidden">
          <div className="h-full bg-accent transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5 pb-36">
        {list.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-10 opacity-40">
            <ShoppingBag size={60} className="mb-4" />
            <h3 className="font-heading font-black text-slate-800">Sua lista está vazia</h3>
          </div>
        ) : (
          <ul className="space-y-4">
            {sortedItems.map((item, index) => {
              if (item.isSection) {
                  return (
                    <li key={item.id} className="pt-3 pb-0.5">
                        <div className={`flex items-center gap-4 rounded-xl py-2 px-5 shadow-sm ${SECTION_COLORS[item.description] || 'bg-slate-600'} bg-gradient-to-r from-black/10 to-transparent backdrop-blur-sm text-white border border-white/5 transition-all active:scale-[0.99]`}>
                            <div className="h-7 w-7 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md shrink-0">
                                <LayoutGrid size={14} />
                            </div>
                            <h4 className="text-xs font-heading font-black uppercase tracking-widest">{item.description}</h4>
                        </div>
                    </li>
                  );
              }
              return (
                <li key={item.id} className={`flex items-center gap-4 rounded-[2rem] border-2 bg-white p-5 shadow-sm transition-all duration-200 ${item.completed ? 'bg-slate-50 border-slate-100 opacity-60 scale-[0.98]' : 'border-white shadow-md'}`}>
                    <div className="flex flex-col gap-1 items-center justify-center shrink-0 pr-1">
                        <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className={`p-1 rounded-lg transition-colors ${index === 0 ? 'text-slate-100' : 'text-slate-400 hover:bg-slate-50'}`}><ChevronUp size={22} strokeWidth={3} /></button>
                        <button onClick={() => moveItem(index, 'down')} disabled={index === sortedItems.length - 1} className={`p-1 rounded-lg transition-colors ${index === sortedItems.length - 1 ? 'text-slate-100' : 'text-slate-400 hover:bg-slate-50'}`}><ChevronDown size={22} strokeWidth={3} /></button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-all ${item.completed ? 'border-accent bg-accent text-white scale-90' : 'border-slate-100 text-transparent bg-slate-50'}`}><Check size={28} strokeWidth={4} /></button>
                    <div className="flex-1 min-w-0" onClick={() => setEditingItem(item)}>
                      <div className="flex justify-between items-start gap-3">
                          <span className={`text-base font-bold leading-snug break-words ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.description}</span>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                              <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl border ${item.completed ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                  {item.quantity}{item.unit}
                              </span>
                              {item.price ? <span className="text-[10px] font-bold text-emerald-600">R$ {(item.price * item.quantity).toFixed(2)}</span> : null}
                          </div>
                      </div>
                    </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl p-6 border-t border-slate-100 z-20 pb-safe rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleAddItem} className="flex gap-3 w-full max-w-2xl mx-auto">
          <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="O que comprar?" className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-slate-900 focus:border-accent focus:bg-white focus:outline-none transition-all font-bold" />
          <button type="submit" disabled={!newItemText.trim()} className="flex items-center justify-center rounded-2xl bg-slate-900 px-8 text-white shadow-xl active:scale-90 disabled:opacity-50 transition-all"><Plus size={32} strokeWidth={3} /></button>
        </form>
      </footer>

      {editingItem && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-900/70 p-0 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] bg-white p-8 sm:p-10 shadow-2xl relative my-auto border-t sm:border border-slate-100 animate-slide-up">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-heading font-black text-slate-900 tracking-tight">Editar Produto</h2>
                    <button onClick={() => setEditingItem(null)} className="text-slate-300 hover:text-slate-500 p-2"><X size={28} /></button>
                </div>
                <div className="space-y-6 text-left">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1.5"><Tag size={10} /> Descrição</label>
                        <input type="text" className="w-full p-5 text-base rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-accent focus:bg-white focus:outline-none transition-all" value={editingItem.description} onChange={(e) => updateItem(editingItem.id, { description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Qtd</label>
                            <input type="number" step="0.1" className="w-full p-5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-accent focus:outline-none" value={editingItem.quantity} onChange={(e) => updateItem(editingItem.id, { quantity: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Unidade</label>
                            <select className="w-full p-5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-accent focus:outline-none appearance-none" value={editingItem.unit} onChange={(e) => updateItem(editingItem.id, { unit: e.target.value })}>
                                <option value="un">un</option><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="pct">pct</option><option value="cx">cx</option><option value="lata">lata</option><option value="vidro">vidro</option><option value="par">par</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Marca</label>
                            <input type="text" placeholder="Opcional" className="w-full p-5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-accent focus:outline-none" value={editingItem.brand || ''} onChange={(e) => updateItem(editingItem.id, { brand: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1"><DollarSign size={10} /> Preço Unit.</label>
                            <input type="number" step="0.01" placeholder="0,00" className="w-full p-5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-accent focus:outline-none" value={editingItem.price || ''} onChange={(e) => updateItem(editingItem.id, { price: parseFloat(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1"><Info size={10} /> Notas</label>
                        <textarea rows={3} className="w-full p-5 rounded-2xl border-2 border-slate-50 font-bold bg-slate-50 focus:border-accent focus:outline-none resize-none" value={editingItem.note || ''} onChange={(e) => updateItem(editingItem.id, { note: e.target.value })} />
                    </div>
                    <div className="flex gap-4 pt-4 pb-2">
                        <button onClick={() => deleteItem(editingItem.id)} className="flex items-center justify-center gap-3 rounded-2xl bg-red-50 px-6 py-5 text-sm font-black text-red-600 flex-1 active:bg-red-100 transition-colors"><Trash2 size={20} /> Excluir</button>
                        <button onClick={() => setEditingItem(null)} className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-5 text-sm font-black text-white flex-1 shadow-2xl active:scale-95 transition-all"><Check size={20} /> Pronto</button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {showTextImportModal && <ImportModal onClose={() => setShowTextImportModal(false)} onImport={(items) => { handleAction([...list.items, ...items]); setShowTextImportModal(false); }} isMergeMode={true} />}
      {showShareModal && <ShareModal listName={list.name} onClose={() => setShowShareModal(false)} />}
    </div>
  );
};