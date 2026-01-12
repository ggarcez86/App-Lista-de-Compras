
import { ShoppingItem } from '../types';

/**
 * Mapeamento de unidades para normalização
 */
const UNIT_MAP: Record<string, string> = {
  'kg': 'kg', 'kilo': 'kg', 'quilo': 'kg', 'kilos': 'kg', 'quilos': 'kg',
  'g': 'g', 'gr': 'g', 'grama': 'g', 'gramas': 'g',
  'ml': 'ml', 'mililitro': 'ml', 'mililitros': 'ml',
  'l': 'L', 'lt': 'L', 'litro': 'L', 'litros': 'L',
  'un': 'un', 'unid': 'un', 'unidade': 'un', 'unidades': 'un',
  'pct': 'pct', 'pacote': 'pct', 'pacotes': 'pct',
  'cx': 'cx', 'caixa': 'cx', 'caixas': 'cx',
  'lata': 'lata', 'latas': 'lata',
  'garrafa': 'garrafa', 'garrafas': 'garrafa',
  'vidro': 'vidro', 'vidros': 'vidro',
  'bandeja': 'bandeja', 'bandejas': 'bandeja',
  'saco': 'saco', 'sacos': 'saco',
  'par': 'par', 'pares': 'par'
};

const CONNECTORS = ['de', 'do', 'da', 'com', 'para'];

/**
 * Parses a raw text line into a ShoppingItem object.
 */
export const parseItemText = (text: string): Partial<ShoppingItem> => {
  let raw = text.trim();
  raw = raw.replace(/^([-*+•]\s*\[\s*[ xX]*\s*\]|[-*+•]|[(][ xX]*[)]|\d+[\s.)])\s*/, '');
  
  let quantity = 1;
  let unit = 'un';
  let description = raw;

  const qtyRegex = /(\d+(?:[.,]\d+)?)\s*([a-zA-Záàâãéèêíïóôõöúç]+)?/i;

  const startMatch = raw.match(new RegExp('^' + qtyRegex.source, 'i'));
  if (startMatch) {
    quantity = parseFloat(startMatch[1].replace(',', '.'));
    const unitCandidate = startMatch[2]?.toLowerCase();
    
    if (unitCandidate && UNIT_MAP[unitCandidate]) {
      unit = UNIT_MAP[unitCandidate];
      description = raw.replace(startMatch[0], '').trim();
    } else {
        description = raw.replace(/^(\d+(?:[.,]\d+)?)\s*/, '').trim();
    }
  } else {
    const endMatch = raw.match(new RegExp(qtyRegex.source + '$', 'i'));
    if (endMatch) {
      const unitCandidate = endMatch[2]?.toLowerCase();
      if (unitCandidate && UNIT_MAP[unitCandidate]) {
          quantity = parseFloat(endMatch[1].replace(',', '.'));
          unit = UNIT_MAP[unitCandidate];
          description = raw.replace(endMatch[0], '').trim();
      } else {
          quantity = parseFloat(endMatch[1].replace(',', '.'));
          description = raw.replace(new RegExp('\\s*' + endMatch[1] + '$'), '').trim();
      }
    }
  }

  CONNECTORS.forEach(conn => {
      const startRegex = new RegExp('^' + conn + '\\s+', 'i');
      const endRegex = new RegExp('\\s+' + conn + '$', 'i');
      description = description.replace(startRegex, '').replace(endRegex, '').trim();
  });

  if (!description) description = raw || "Item sem nome";
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return { description, quantity, unit, completed: false };
};

/**
 * Converte um bloco de texto do WhatsApp em uma lista de ShoppingItem
 */
export const parseShoppingListText = (rawText: string): ShoppingItem[] => {
  const items: ShoppingItem[] = [];
  const lines = rawText.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const isHeader = trimmed.endsWith(':') && !/\d/.test(trimmed);
    if (isHeader && trimmed.length < 30) return;

    const parsed = parseItemText(trimmed);
    
    if (parsed.description) {
      if (trimmed.includes(',') && !/\d/.test(trimmed)) {
          const parts = trimmed.split(',');
          parts.forEach(part => {
              const p = part.trim();
              if (p) {
                  items.push({
                      id: crypto.randomUUID(),
                      description: p.charAt(0).toUpperCase() + p.slice(1),
                      quantity: 1,
                      unit: 'un',
                      completed: false,
                  } as ShoppingItem);
              }
          });
      } else {
          items.push({
            id: crypto.randomUUID(),
            description: parsed.description,
            quantity: parsed.quantity || 1,
            unit: parsed.unit || 'un',
            completed: false,
          } as ShoppingItem);
      }
    }
  });

  return items;
};
