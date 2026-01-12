import React, { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Dashboard } from './components/Dashboard';
import { ListView } from './components/ListView';
import { ImportModal } from './components/ImportModal';
import { ShoppingItem, ShoppingList } from './types';

function App() {
  const { lists, saveList, deleteList, duplicateList, loaded, importBackup } = useLocalStorage();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const expandList = (data: any): ShoppingList => {
    if (data.items && typeof data.items[0] === 'object' && !Array.isArray(data.items[0])) {
        return data as ShoppingList;
    }

    return {
        id: crypto.randomUUID(),
        name: `${data.n || 'Lista Compartilhada'} (Cópia)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncDisabled: data.sd || false,
        items: (data.i || []).map((item: any[]) => ({
            id: crypto.randomUUID(),
            description: item[0],
            quantity: item[1] || 1,
            unit: item[2] || 'un',
            completed: !!item[3],
            note: item[4] || '',
            price: item[5] || undefined,
            brand: item[6] || undefined
        }))
    };
  };

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#import=')) {
            try {
                const encoded = hash.replace('#import=', '');
                const jsonString = decodeURIComponent(escape(atob(encoded)));
                const parsedData = JSON.parse(jsonString);
                
                const importedList = expandList(parsedData);
                saveList(importedList);
                
                window.location.hash = '';
                setActiveListId(importedList.id);
            } catch (e) {
                console.error("Import failed", e);
            }
        }
    };
    
    if (loaded) {
        handleHashChange();
    }
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [saveList, loaded]);

  const handleCreateList = (name: string, syncDisabled: boolean) => {
    const newList: ShoppingList = {
      id: crypto.randomUUID(),
      name,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncDisabled
    };
    saveList(newList);
    setActiveListId(newList.id);
  };

  const handleImport = (items: ShoppingItem[], name: string) => {
    const newList: ShoppingList = {
      id: crypto.randomUUID(),
      name,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncDisabled: false
    };
    saveList(newList);
    setActiveListId(newList.id);
  };

  const handleDeleteList = useCallback((id: string) => {
    setActiveListId(null);
    setTimeout(() => {
        deleteList(id);
    }, 10);
  }, [deleteList]);

  if (!loaded) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#1e293b] p-6 text-center">
      <div className="flex flex-col items-center w-full max-w-[500px] animate-pulse">
        <img src="https://bioflow.online/logosemfundo.png" alt="Carregando..." className="w-full mb-12 drop-shadow-[0_25px_25px_rgba(0,0,0,0.5)]" />
        <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-accent w-1/2 rounded-full animate-[shimmer_2s_infinite_linear]"></div>
        </div>
      </div>
    </div>
  );

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <>
      {activeList ? (
        <ListView
          list={activeList}
          onUpdate={saveList}
          onBack={() => setActiveListId(null)}
          onDeleteList={() => handleDeleteList(activeList.id)}
          onDuplicate={duplicateList}
        />
      ) : (
        <Dashboard
          lists={lists}
          onCreateList={handleCreateList}
          onImportList={() => setIsImportModalOpen(true)}
          onSelectList={setActiveListId}
          onDuplicateList={duplicateList}
          onDeleteList={handleDeleteList}
          onRestoreBackup={importBackup}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImport}
        />
      )}
    </>
  );
}

export default App;