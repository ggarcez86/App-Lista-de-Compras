
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingList, ShoppingItem, SortOption } from '../types';
import { ArrowLeft, Trash2, Plus, MoreVertical, Check, FileText, Upload, Download, Type, Eraser, Users, ShoppingBag } from 'lucide-react';
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
      id: crypto.randomUUID(),
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
        
        if (Array.isArray(importedData)) {
            if (importedData.length > 0 && importedData[0].items) {
                importedData.forEach(listObj => { if (listObj.items) rawItems = [...rawItems, ...listObj.items]; });
            } else { rawItems = importedData; }
        } else if (importedData.items) { rawItems = importedData.items; }

        if (rawItems.length > 0) {
            const mapped = rawItems.map((i: any) => ({
                id: crypto.randomUUID(),
                description: String(i.description || i.item || i.n || "Item").trim(),
                quantity: parseFloat(i.quantity || i.q || 1),
                unit: String(i.unit || i.u || 'un').trim(),
                price: parseFloat(i.price || i.p || 0),
                completed: !!(i.completed || i.c || i.ok),
                brand: String(i.brand || i.b || '').trim(),
                note: String(i.note || i.obs || '').trim()
            })).filter(i => i.description);

            handleAction([...list.items, ...mapped]);
            setIsMenuOpen(false);
            alert(`${mapped.length} produtos adicionados!`);
        }
      } catch (err) { alert("Erro ao processar JSON."); }
    };
    reader.readAsText(file);
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
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`rounded-2xl p-2.5 transition-all ${isMenuOpen ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}><MoreVertical size={20} /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 rounded-3xl bg-white p-3 shadow-2xl border z-[100] border-slate-100 divide-y divide-slate-50 animate-fade-in">
                      <div className="py-2">
                          <button onClick={() => { setShowTextImportModal(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-accent font-black hover:bg-emerald-50 flex items-center gap-3 rounded-xl"><FileText size={16} /> Importar WhatsApp</button>
                          <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-3 text-sm text-blue-600 font-bold hover:bg-blue-50 flex items-center gap-3 rounded-xl"><Upload size={16} /> Mesclar JSON</button>
                      </div>
                      <div className="py-2">
                          {isFixed ? (
                            <button onClick={() => { if(confirm("Resetar itens?")) { handleAction([]); } setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-amber-600 font-black hover:bg-amber-50 rounded-xl flex items-center gap-3"><Eraser size={16} /> Resetar Mensal</button>
                          ) : (
                            <button onClick={() => { if(confirm("Excluir?")) { onDeleteList(); } }} className="w-full text-left px-4 py-3 text-sm text-red-600 font-black hover:bg-red-50 rounded-xl flex items-center gap-3"><Trash2 size={16} /> Excluir Coleção</button>
                          )}
                      </div>
                  </div>
                )}
             </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
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
            {sortedItems.map((item) => (
              <li key={item.id} className={`flex flex-col gap-2 rounded-[2rem] border-2 bg-white p-5 shadow-sm transition-all ${item.completed ? 'bg-slate-50 border-slate-100 opacity-60 scale-[0.98]' : 'border-white shadow-md'}`}>
                <div className="flex items-center gap-5">
                  <button onClick={() => toggleItem(item.id)} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-all ${item.completed ? 'border-accent bg-accent text-white scale-90' : 'border-slate-100 text-transparent bg-slate-50'}`}><Check size={28} strokeWidth={4} /></button>
                  <div className="flex-1 min-w-0" onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}>
                    <div className="flex justify-between items-start gap-3">
                        <span className={`text-base font-bold leading-snug break-words ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.description}</span>
                        <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl border shrink-0 ${item.completed ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.quantity}{item.unit}</span>
                    </div>
                  </div>
                </div>
                {editingItemId === item.id && (
                  <div className="mt-5 border-t border-slate-100 pt-5 space-y-4 animate-slide-up">
                    <input type="text" className="w-full p-4 text-sm rounded-2xl border-2 border-slate-50 font-bold bg-slate-50" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                    <div className="flex gap-4">
                        <button onClick={() => deleteItem(item.id)} className="flex items-center justify-center gap-3 rounded-2xl bg-red-50 px-6 py-4 text-xs font-black text-red-600 flex-1">Remover</button>
                        <button onClick={() => setEditingItemId(null)} className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-xs font-black text-white flex-1">Pronto</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl p-6 border-t border-slate-100 z-20 pb-safe rounded-t-[3rem]">
        <form onSubmit={handleAddItem} className="flex gap-3 w-full max-w-2xl mx-auto">
          <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="O que comprar?" className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-slate-900 focus:border-accent focus:bg-white focus:outline-none transition-all font-bold" />
          <button type="submit" disabled={!newItemText.trim()} className="flex items-center justify-center rounded-2xl bg-slate-900 px-8 text-white shadow-xl active:scale-90 disabled:opacity-50 transition-all"><Plus size={32} strokeWidth={3} /></button>
        </form>
      </footer>

      {showTextImportModal && <ImportModal onClose={() => setShowTextImportModal(false)} onImport={(items) => { handleAction([...list.items, ...items]); setShowTextImportModal(false); }} isMergeMode={true} />}
    </div>
  );
};
