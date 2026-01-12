
import { ShoppingItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  // Removed duplicate 'lt' mapping to 'lata' because 'lt' is already mapped to 'L' (litros)
  'lata': 'lata', 'latas': 'lata',
  'garrafa': 'garrafa', 'garrafas': 'garrafa',
  'vidro': 'vidro', 'vidros': 'vidro',
  'bandeja': 'bandeja', 'bandejas': 'bandeja',
  'saco': 'saco', 'sacos': 'saco',
  'par': 'par', 'pares': 'par'
};

const COMMON_UNITS = Object.keys(UNIT_MAP);
const CONNECTORS = ['de', 'do', 'da', 'com', 'para'];

/**
 * Parses a raw text line into a ShoppingItem object.
 * Suporta: "500g de Queijo", "Queijo 500g", "01un sabonete", "2 pacotes macarrão"
 */
export const parseItemText = (text: string): Partial<ShoppingItem> => {
  let raw = text.trim();
  
  // 1. Limpeza inicial de prefixos de lista (bullets, checkboxes)
  raw = raw.replace(/^([-*+•]\s*\[\s*[ xX]*\s*\]|[-*+•]|[(][ xX]*[)]|\d+[\s.)])\s*/, '');
  
  let quantity = 1;
  let unit = 'un';
  let description = raw;

  // 2. Regex para capturar [Número] + [Espaço opcional] + [Unidade Opcional]
  // Este regex tenta pegar o padrão no início ou no fim da string
  const qtyRegex = /(\d+(?:[.,]\d+)?)\s*([a-zA-Záàâãéèêíïóôõöúç]+)?/i;

  // Tentativa 1: Quantidade no início
  const startMatch = raw.match(new RegExp('^' + qtyRegex.source, 'i'));
  if (startMatch) {
    quantity = parseFloat(startMatch[1].replace(',', '.'));
    const unitCandidate = startMatch[2]?.toLowerCase();
    
    if (unitCandidate && UNIT_MAP[unitCandidate]) {
      unit = UNIT_MAP[unitCandidate];
      description = raw.replace(startMatch[0], '').trim();
    } else if (unitCandidate) {
        // Se tem uma palavra mas não é unidade conhecida, pode ser o próprio item
        // A menos que seja um número sozinho
        description = raw.replace(/^(\d+(?:[.,]\d+)?)\s*/, '').trim();
    } else {
        description = raw.replace(/^(\d+(?:[.,]\d+)?)\s*/, '').trim();
    }
  } 
  // Tentativa 2: Quantidade no fim (ex: "Arroz 5kg")
  else {
    const endMatch = raw.match(new RegExp(qtyRegex.source + '$', 'i'));
    if (endMatch) {
      const unitCandidate = endMatch[2]?.toLowerCase();
      if (unitCandidate && UNIT_MAP[unitCandidate]) {
          quantity = parseFloat(endMatch[1].replace(',', '.'));
          unit = UNIT_MAP[unitCandidate];
          description = raw.replace(endMatch[0], '').trim();
      } else {
          // Se for apenas um número no fim sem unidade
          quantity = parseFloat(endMatch[1].replace(',', '.'));
          description = raw.replace(new RegExp('\\s*' + endMatch[1] + '$'), '').trim();
      }
    }
  }

  // 3. Limpeza de conectores (ex: "de Queijo" -> "Queijo", "Queijo de" -> "Queijo")
  CONNECTORS.forEach(conn => {
      const startRegex = new RegExp('^' + conn + '\\s+', 'i');
      const endRegex = new RegExp('\\s+' + conn + '$', 'i');
      description = description.replace(startRegex, '').replace(endRegex, '').trim();
  });

  // 4. Se a descrição ficou vazia (ex: o usuário digitou apenas "500g"), 
  // tentamos restaurar o original ou marcar como pendente
  if (!description) {
    description = raw || "Item sem nome";
  }

  // Capitalizar primeira letra
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return {
    description,
    quantity,
    unit,
    completed: false,
  };
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

    // Ignora headers prováveis (linhas sem números e terminadas em dois pontos)
    const isHeader = trimmed.endsWith(':') && !/\d/.test(trimmed);
    if (isHeader && trimmed.length < 30) return;

    const parsed = parseItemText(trimmed);
    
    if (parsed.description) {
      // Suporte a múltiplas vírgulas em uma linha caso não haja quantidade definida
      // Ex: "Arroz, feijão, batata" -> 3 itens. 
      // Mas "2kg Arroz, feijão" -> Mantém como um item só para evitar erros.
      if (trimmed.includes(',') && !/\d/.test(trimmed)) {
          const parts = trimmed.split(',');
          parts.forEach(part => {
              const p = part.trim();
              if (p) {
                  items.push({
                      id: uuidv4(),
                      description: p.charAt(0).toUpperCase() + p.slice(1),
                      quantity: 1,
                      unit: 'un',
                      completed: false,
                  } as ShoppingItem);
              }
          });
      } else {
          items.push({
            id: uuidv4(),
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
