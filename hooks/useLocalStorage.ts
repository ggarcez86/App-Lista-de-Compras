import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingList, ShoppingItem } from '../types';

const STORAGE_KEY = 'my_shopping_lists_v2';
export const FIXED_LIST_ID = 'monthly-fixed-list-001';

const INITIAL_SECTIONS = [
  "Mercearia",
  "Bebidas",
  "Higiene e Limpeza",
  "Hortifrúti",
  "Padaria",
  "Frios e Laticínios",
  "Açougue",
  "Congelados",
  "Outras"
];

export const useLocalStorage = () => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loaded, setLoaded] = useState(false);

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

    const fixedListExists = currentLists.some(l => l.id === FIXED_LIST_ID);
    if (!fixedListExists) {
      const fixedItems: ShoppingItem[] = INITIAL_SECTIONS.map((section, idx) => ({
        id: `section-${idx}`,
        description: section,
        quantity: 0,
        unit: '',
        completed: false,
        isSection: true
      }));

      const fixedList: ShoppingList = {
        id: FIXED_LIST_ID,
        name: '🛒 Lista Mensal Fixa',
        items: fixedItems,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      currentLists = [fixedList, ...currentLists];
    }

    setLists(currentLists);
    setLoaded(true);
  }, []);

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
    if (id === FIXED_LIST_ID) {
      setLists((prev) => prev.map(l => {
        if (l.id === FIXED_LIST_ID) {
           const resetItems = INITIAL_SECTIONS.map((section, idx) => ({
              id: `section-${idx}`,
              description: section,
              quantity: 0,
              unit: '',
              completed: false,
              isSection: true
           }));
           return { ...l, items: resetItems, updatedAt: Date.now() };
        }
        return l;
      }));
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
      const newLists = [...prev];

      // Cast incomingList to any to support minified property access (i, n, sd) commonly found in backups
      backupLists.forEach((incomingList: any) => {
        // Fix for Error: Property 'i' does not exist on type 'ShoppingList' (Line 126)
        const rawItems = incomingList.items || incomingList.i || [];
        
        // Sanatiza itens para garantir que não existam campos vazios/nulos
        const sanitizedItems: ShoppingItem[] = rawItems.map((item: any) => {
            const desc = item.description || item.item || item.n || item.d || "Item sem nome";
            return {
                id: crypto.randomUUID(),
                description: String(desc).replace('[SEÇÃO]', '').trim(),
                quantity: parseFloat(item.quantity || item.q || item.qtd) || 0,
                unit: item.unit || item.u || "",
                brand: item.brand || item.b || "",
                price: parseFloat(item.price || item.p || 0) || 0,
                note: item.note || item.obs || "",
                completed: !!(item.completed || item.c),
                isSection: !!(item.isSection || item.s || String(desc).includes("[SEÇÃO]"))
            };
        });

        if (incomingList.id === FIXED_LIST_ID) {
          const idx = newLists.findIndex(l => l.id === FIXED_LIST_ID);
          if (idx !== -1) {
            // No caso da mensal fixa, mesclamos apenas itens que não existem
            const currentItemNames = new Set(newLists[idx].items.map(i => i.description));
            const itemsToAdd = sanitizedItems.filter(si => !currentItemNames.has(si.description));
            newLists[idx] = { 
                ...newLists[idx], 
                items: [...newLists[idx].items, ...itemsToAdd], 
                updatedAt: Date.now() 
            };
          }
        } else {
            const newList: ShoppingList = {
                id: crypto.randomUUID(),
                // Fix for Error: Property 'n' does not exist on type 'ShoppingList' (Line 159)
                name: incomingList.name || incomingList.n || `Importada ${Date.now()}`,
                items: sanitizedItems,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                // Fix for Error: Property 'sd' does not exist on type 'ShoppingList' (Line 163)
                syncDisabled: !!(incomingList.syncDisabled || incomingList.sd)
            };
            newLists.push(newList);
            count++;
        }
      });
      return newLists;
    });
    
    setTimeout(() => {
        alert("Backup processado com sucesso!");
    }, 100);
  }, []);

  return { lists, saveList, deleteList, duplicateList, loaded, importBackup };
};
