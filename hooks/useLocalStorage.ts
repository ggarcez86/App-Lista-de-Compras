
import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingList } from '../types';

const STORAGE_KEY = 'my_shopping_lists_v2';
export const FIXED_LIST_ID = 'monthly-fixed-list-001';

export const useLocalStorage = () => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 1. Carregar do localStorage e garantir a Lista Fixa
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let currentLists: ShoppingList[] = [];
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          currentLists = parsed;
        }
      } catch (e) {
        console.error('Falha ao ler listas do storage', e);
      }
    }

    // Garante que a Lista Fixa Mensal existe
    const fixedListExists = currentLists.some(l => l.id === FIXED_LIST_ID);
    if (!fixedListExists) {
      const fixedList: ShoppingList = {
        id: FIXED_LIST_ID,
        name: '🛒 Lista Mensal Fixa',
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      currentLists = [fixedList, ...currentLists];
    }

    setLists(currentLists);
    setLoaded(true);
  }, []);

  // 2. Salvar no localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    }
  }, [lists, loaded]);

  const saveList = useCallback((list: ShoppingList) => {
    setLists((prev) => {
      const index = prev.findIndex((l) => l.id === list.id);
      if (index >= 0) {
        const newLists = [...prev];
        newLists[index] = { ...list, updatedAt: Date.now() };
        return newLists;
      } else {
        return [list, ...prev];
      }
    });
  }, []);

  const deleteList = useCallback((id: string) => {
    // Se for a lista fixa, nós apenas limpamos os itens em vez de deletar
    if (id === FIXED_LIST_ID) {
      setLists((prev) => prev.map(l => 
        l.id === FIXED_LIST_ID ? { ...l, items: [], updatedAt: Date.now() } : l
      ));
    } else {
      setLists((prev) => prev.filter((l) => l.id !== id));
    }
  }, []);

  const duplicateList = useCallback((id: string, newName: string) => {
    setLists((prev) => {
      const original = prev.find((l) => l.id === id);
      if (!original) return prev;

      const newList: ShoppingList = {
        ...original,
        id: crypto.randomUUID(),
        name: newName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: original.items.map(item => ({ ...item, completed: false, id: crypto.randomUUID() }))
      };
      return [newList, ...prev];
    });
  }, []);

  const importBackup = useCallback((backupLists: ShoppingList[]) => {
    let count = 0;
    setLists((prev) => {
      const existingIds = new Set(prev.map(l => l.id));
      const newLists = [...prev];

      backupLists.forEach(list => {
        if (list.id === FIXED_LIST_ID) {
          // Se o backup tem a lista fixa, mescla os itens na nossa atual
          const idx = newLists.findIndex(l => l.id === FIXED_LIST_ID);
          if (idx !== -1) {
            newLists[idx] = { ...newLists[idx], items: [...newLists[idx].items, ...list.items], updatedAt: Date.now() };
          }
          return;
        }

        let listToPush = { ...list };
        if (existingIds.has(listToPush.id)) {
            listToPush.id = crypto.randomUUID();
            listToPush.name = `${listToPush.name} (Importada)`;
        }
        newLists.push(listToPush);
        count++;
      });
      return newLists;
    });
    
    setTimeout(() => {
        if (count > 0) alert(`${count} lista(s) importada(s) com sucesso!`);
    }, 100);
  }, []);

  return { lists, saveList, deleteList, duplicateList, loaded, importBackup };
};
