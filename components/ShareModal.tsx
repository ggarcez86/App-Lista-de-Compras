import React, { useState } from 'react';
import { X, Copy, Check, Code, Info, Zap, Play, FileCode } from 'lucide-react';

interface ShareModalProps {
  onClose: () => void;
  listName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose, listName }) => {
  const [copied, setCopied] = useState(false);

  const scriptCode = `/**
 * SCRIPT DE SINCRONIZAÇÃO - VERSÃO 3.0 (ULTRA-SYNC)
 * Permite editar na planilha e ver no app, e vice-versa.
 */

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const listName = sheet.getRange("A1").getValue() || "Minha Lista";
  
  // Se a planilha estiver vazia (só cabeçalho ou menos)
  if (lastRow < 2) return ContentService.createTextOutput(JSON.stringify({name: listName, items: []})).setMimeType(ContentService.MimeType.JSON);

  // Lê os dados das colunas A até H
  const range = sheet.getRange(2, 1, lastRow - 1, 8);
  const values = range.getValues();
  
  const items = values.map((row, index) => {
    if (!row[0]) return null; // Pula linhas sem nome
    return {
      id: "remote-" + index, // IDs temporários para itens vindos da planilha
      description: String(row[0]),
      quantity: parseFloat(row[1]) || 1,
      unit: String(row[2]) || "un",
      brand: String(row[3]) || "",
      price: parseFloat(row[4]) || 0,
      completed: String(row[6]).toUpperCase() === "OK",
      note: String(row[7]) || ""
    };
  }).filter(item => item !== null);

  const result = {
    name: listName,
    items: items,
    updatedAt: Date.now()
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return processarDados(data);
  } catch (err) {
    return ContentService.createTextOutput("Erro: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function processarDados(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // 1. Salva o nome da lista na A1 (opcional, para organização)
  // sheet.getRange("A1").setValue(payload.name);

  // 2. Limpa dados antigos (A2 em diante)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow(), 8).clear();
  }
  
  // Cabeçalhos (Sempre garante que existam)
  const headers = [["ITEM", "QTD", "UNID", "MARCA", "PREÇO UN", "TOTAL", "STATUS", "OBSERVAÇÕES"]];
  sheet.getRange(1, 1, 1, 8).setValues(headers)
    .setBackground("#059669").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");

  if (payload.items && payload.items.length > 0) {
    const rows = payload.items.map(item => {
      const preco = parseFloat(item.price) || 0;
      const qtd = parseFloat(item.quantity) || 0;
      return [
        item.description,
        qtd,
        item.unit,
        item.brand || "",
        preco,
        (qtd * preco),
        item.completed ? "OK" : "PENDENTE",
        item.note || ""
      ];
    });
    
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
    
    // Formatação
    for (var i = 0; i < rows.length; i++) {
      const row = i + 2;
      if (rows[i][6] === "OK") {
        sheet.getRange(row, 1, 1, 8).setBackground("#ecfdf5").setFontColor("#9ca3af");
        sheet.getRange(row, 1).setFontLine("line-through");
      } else {
        sheet.getRange(row, 1, 1, 8).setBackground("white").setFontColor("black").setFontLine("none");
      }
    }
    sheet.getRange(2, 5, rows.length, 2).setNumberFormat("R$ #,##0.00");
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 8);
  
  return ContentService.createTextOutput("Sincronizado!").setMimeType(ContentService.MimeType.TEXT);
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-emerald-600 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Planilha ↔ App (Sincronia Total)</h2>
              <p className="text-emerald-100 text-xs">O que você mudar na planilha, muda no app!</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
             <h4 className="text-blue-700 font-bold text-sm mb-1">Atenção!</h4>
             <p className="text-[11px] text-blue-800 leading-relaxed">
                Este script foi atualizado para ler o conteúdo das células. Se você apagar uma linha na planilha, o app também apagará o item. Se mudar um preço no Excel, o app atualizará o valor.
             </p>
          </section>

          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="flex items-center gap-2 font-bold text-gray-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">1</span>
                Copie o Novo Código
              </h3>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {copied ? <Check size={14} /> : <Code size={14} />}
                {copied ? 'Copiado!' : 'Copiar Script'}
              </button>
            </div>
            <pre className="bg-gray-900 text-emerald-400 p-5 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-48 border-4 border-gray-800 shadow-inner">
                {scriptCode}
            </pre>
          </section>

          <section className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Info size={16} className="text-amber-600" />
                Lembrete de Atualização:
            </h3>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Para o novo script funcionar, você deve ir no Google Apps Script, colar este código sobre o antigo e clicar em <b>"Implantar {" > "} Gerenciar Implantações"</b>, editar a atual e selecionar <b>"Nova Versão"</b>. Caso contrário, ele continuará usando o script antigo.
            </p>
          </section>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg text-sm">
            Entendido, Script Atualizado!
          </button>
        </div>
      </div>
    </div>
  );
};