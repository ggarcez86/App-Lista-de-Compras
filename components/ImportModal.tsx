
import React, { useState, useEffect, useRef } from 'react';
import { parseShoppingListText } from '../utils/parser';
import { ShoppingItem } from '../types';
import { X, ArrowRight, Check, Download, Edit3, Tag } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImport: (items: ShoppingItem[], listName: string) => void;
  isMergeMode?: boolean; // Se true, apenas confirma os itens e fecha
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
      alert('Nenhum item identificado. Verifique o texto colado.');
      return;
    }
    
    // Tenta pegar a primeira linha como nome se for curta (ex: "Lista de Churrasco")
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
        alert("Por favor, dê um nome para a sua lista.");
        nameInputRef.current?.focus();
        return;
    }
    onImport(parsedItems, listName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] animate-slide-up border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between border-b p-5 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Tag size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                {isMergeMode ? 'Adicionar Itens' : 'Importar Lista'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-200 text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                  <b>Como funciona?</b> Cole seu texto abaixo. O app identifica automaticamente itens, quantidades (kg, g, pct) e formatos de lista variados.
                </p>
              </div>
              <div className="relative">
                <textarea
                    className="h-72 w-full rounded-xl border-2 border-gray-100 p-4 font-mono text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none bg-gray-50/30 text-gray-800 placeholder:text-gray-300 transition-all"
                    placeholder="Ex:&#10;1kg Arroz&#10;2 latas de milho&#10;Feijão carioca..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {!isMergeMode && (
                <div className="bg-white p-5 rounded-2xl border-2 border-primary/20 shadow-sm relative group">
                    <label className="mb-2 block text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                    Nome da sua nova lista
                    </label>
                    <div className="relative">
                        <input
                        ref={nameInputRef}
                        type="text"
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        placeholder="Ex: Rancho do Mês"
                        className="w-full rounded-lg border-b-2 border-transparent p-0 text-xl font-black focus:border-primary focus:outline-none bg-transparent text-gray-900 pr-10"
                        />
                        <Edit3 className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                    {isMergeMode ? 'Itens que serão adicionados' : 'Confirmação dos itens'} ({parsedItems.length})
                </p>
                <ul className="max-h-52 overflow-y-auto rounded-2xl border bg-gray-50/50 p-2 text-sm divide-y divide-gray-100 shadow-inner">
                  {parsedItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center p-3">
                      <span className="text-gray-700 font-bold">{item.description}</span>
                      <span className="text-primary font-black bg-white shadow-sm border border-emerald-50 px-3 py-1 rounded-full text-[10px] uppercase">
                        {item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {!isMergeMode && (
                <div className="pt-2 border-t border-dashed">
                    <button 
                    onClick={handleDownloadJSON}
                    className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-500 py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
                    >
                    <Download size={16} /> Salvar arquivo JSON
                    </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50/50 flex gap-4">
          {step === 1 ? (
            <button
              onClick={handleParse}
              disabled={!text.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-black text-white hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              Analisar Texto <ArrowRight size={20} />
            </button>
          ) : (
            <>
                <button
                    onClick={() => setStep(1)}
                    className="px-6 rounded-xl border-2 border-gray-200 font-bold text-gray-400 hover:bg-white transition-colors active:scale-95"
                >
                    Voltar
                </button>
                <button
                    onClick={handleFinish}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-black text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                >
                    {isMergeMode ? 'Adicionar Agora' : 'Salvar e Abrir'} <Check size={20} />
                </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
