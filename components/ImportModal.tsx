
import React, { useState, useEffect, useRef } from 'react';
import { parseShoppingListText } from '../utils/parser';
import { ShoppingItem } from '../types';
import { X, ArrowRight, Check, Download, Edit3, Tag } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImport: (items: ShoppingItem[], listName: string) => void;
  isMergeMode?: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, isMergeMode = false }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [text, setText] = useState('');
  const [parsedItems, setParsedItems] = useState<ShoppingItem[]>([]);
  const [listName, setListName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    const items = parseShoppingListText(text);
    if (items.length === 0) {
      alert('Nenhum item identificado.');
      return;
    }
    
    const firstLine = text.split('\n')[0].trim();
    const suggestedName = (firstLine.length > 2 && firstLine.length < 30) 
      ? firstLine.replace(/^[-*•]\s*|[:]$/g, '') 
      : 'Minha Lista de Compras';

    setParsedItems(items);
    setListName(suggestedName);
    setStep(2);
  };

  useEffect(() => {
    if (step === 2 && nameInputRef.current) {
      nameInputRef.current.select();
    }
  }, [step]);

  const handleDownloadJSON = () => {
    const tempData = {
        id: crypto.randomUUID(),
        name: listName || 'Nova Lista',
        items: parsedItems,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    const dataStr = JSON.stringify(tempData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(listName || 'lista').replace(/\s+/g, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    if (!isMergeMode && !listName.trim()) {
        alert("Dê um nome para a lista.");
        nameInputRef.current?.focus();
        return;
    }
    onImport(parsedItems, listName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between border-b p-5 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-primary" />
            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                {isMergeMode ? 'Adicionar Itens' : 'Importar Lista'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-200 text-gray-400"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm text-emerald-800 font-medium">Cole seu texto do WhatsApp abaixo.</p>
              </div>
              <textarea
                  className="h-72 w-full rounded-xl border-2 border-gray-100 p-4 font-mono text-sm focus:border-primary focus:outline-none bg-gray-50/30 text-gray-800"
                  placeholder="Ex: 1kg Arroz..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {!isMergeMode && (
                <div className="bg-white p-5 rounded-2xl border-2 border-primary/20 shadow-sm relative">
                    <label className="mb-2 block text-[10px] font-black text-primary uppercase tracking-widest">Nome da Lista</label>
                    <input ref={nameInputRef} type="text" value={listName} onChange={(e) => setListName(e.target.value)} className="w-full text-xl font-black focus:outline-none bg-transparent text-gray-900" />
                    <Edit3 className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                </div>
              )}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Itens identificados ({parsedItems.length})</p>
                <ul className="max-h-52 overflow-y-auto rounded-2xl border bg-gray-50/50 p-2 text-sm divide-y divide-gray-100">
                  {parsedItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center p-3">
                      <span className="text-gray-700 font-bold">{item.description}</span>
                      <span className="text-primary font-black bg-white px-3 py-1 rounded-full text-[10px]">{item.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50/50 flex gap-4">
          {step === 1 ? (
            <button onClick={handleParse} disabled={!text.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-black text-white disabled:opacity-50 shadow-lg active:scale-95 transition-all">Analisar Texto <ArrowRight size={20} /></button>
          ) : (
            <>
                <button onClick={() => setStep(1)} className="px-6 rounded-xl border-2 border-gray-200 font-bold text-gray-400">Voltar</button>
                <button onClick={handleFinish} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-black text-white shadow-lg active:scale-95 transition-all">Confirmar <Check size={20} /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
