
export interface ShoppingItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // 'un', 'kg', 'g', 'L', 'ml'
  brand?: string;
  price?: number;
  note?: string;
  completed: boolean;
  isSection?: boolean; // Identifica se é uma tarja de seção
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
  updatedAt: number;
  remoteUrl?: string; // URL do Google Apps Script
  lastSync?: number;
  syncDisabled?: boolean; // Se true, a lista não tentará sincronizar com o Sheets
}

export type SortOption = 'default' | 'alphabetical' | 'status';