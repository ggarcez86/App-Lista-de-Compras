
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
        id: uuidv4(),
        name: `${data.n || 'Lista Compartilhada'} (Cópia)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncDisabled: data.sd || false,
        items: (data.i || []).map((item: any[]) => ({
            id: uuidv4(),
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
      id: uuidv4(),
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
    // Para importação via texto, podemos perguntar ou assumir local-only por segurança
    // Mas por padrão, seguiremos a configuração global do app (Sheets) se houver URL.
    const newList: ShoppingList = {
      id: uuidv4(),
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
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <div className="text-primary font-bold">Carregando listas...</div>
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
