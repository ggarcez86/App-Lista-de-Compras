import React, { useState } from 'react';
import { X, Copy, Check, Code, Info, Zap, Play, FileCode } from 'lucide-react';

interface ShareModalProps {
  onClose: () => void;
  listName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose, listName }) => {
  const [copied, setCopied] = useState(false);

  const scriptCode = `/**
 * SCRIPT DE SINCRONIZAÇÃO - VERSÃO 8.0 (ANTI-ERASE)
 * Gerencia Seções, Produtos, Preços e Status com alta persistência.
 */

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const listName = sheet.getRange("A1").getValue() || "Minha Lista";
  
  if (lastRow < 2) return ContentService.createTextOutput(JSON.stringify({name: listName, items: []})).setMimeType(ContentService.MimeType.JSON);

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  const items = values.map((row, index) => {
    if (!row[0]) return null;
    const desc = String(row[0]);
    return {
      id: "remote-" + index + "-" + Date.now(),
      description: desc,
      quantity: row[1] || 0,
      unit: String(row[2]) || "",
      brand: String(row[3]) || "",
      price: row[4] || 0,
      completed: String(row[6]).toUpperCase() === "OK",
      note: String(row[7]) || ""
    };
  }).filter(i => i !== null);

  return ContentService.createTextOutput(JSON.stringify({name: listName, items: items}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Limpeza Profunda controlada
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, Math.max(sheet.getLastRow(), 2), 8).clearContent().clearFormat();
    }
    
    // Cabeçalhos (Linha 1)
    sheet.getRange(1, 1, 1, 8).setValues([["ITEM", "QTD", "UNID", "MARCA", "PREÇO UN", "TOTAL", "STATUS", "OBSERVAÇÕES"]])
         .setBackground("#1e293b").setFontColor("white").setFontWeight("bold");

    if (payload.items && payload.items.length > 0) {
      const rows = payload.items.map(item => [
        item.description,
        item.quantity || "",
        item.unit || "",
        item.brand || "",
        item.price || "",
        (item.quantity && item.price) ? (item.quantity * item.price) : "",
        item.description.includes("[SEÇÃO]") ? "DIVISÃO" : (item.completed ? "OK" : "PENDENTE"),
        item.note || ""
      ]);
      
      sheet.getRange(2, 1, rows.length, 8).setValues(rows);
      
      // Formatação Visual
      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const text = String(rows[i][0]);
        
        if (text.includes("[SEÇÃO]")) {
          sheet.getRange(rowNum, 1, 1, 8)
               .setBackground("#334155")
               .setFontColor("#ffffff")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
        } else if (rows[i][6] === "OK") {
          sheet.getRange(rowNum, 1, 1, 8).setFontColor("#cbd5e1").setFontLine("line-through");
        }
      }
      sheet.getRange(2, 5, rows.length, 2).setNumberFormat("R$ #,##0.00");
    }
    
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 8);
    
    return ContentService.createTextOutput("Sincronizado v8.0").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Erro: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
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
        <div className="p-6 border-b flex justify-between items-center bg-[#1e293b] text-white">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-accent" />
            <div>
              <h2 className="text-xl font-bold">Script de Sincronia v8.0</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Sistema Garcez Heredia</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
             <h4 className="text-amber-800 font-black text-xs mb-2 uppercase tracking-widest">Procedimento de Resgate</h4>
             <p className="text-[11px] text-amber-900 leading-relaxed font-bold">
                Como a planilha foi limpa, siga estes passos:<br/><br/>
                1. Atualize o código no Google com o v8.0 abaixo.<br/>
                2. No App, dentro da lista, use o menu <span className="text-blue-600 font-black">"Mesclar JSON"</span> para subir seu backup.<br/>
                3. O App enviará automaticamente os dados de volta para a planilha.<br/>
                4. <span className="text-amber-600 font-black">Nova URL:</span> Se você mudou de script, atualize o link nas "Preferências" do Dashboard.
             </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Código v8.0 (Resgate)</span>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white active:scale-95'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar Código'}
              </button>
            </div>
            <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-64 border-2 border-slate-800 shadow-inner">
                {scriptCode}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t bg-slate-50">
          <button onClick={onClose} className="w-full bg-accent text-white py-5 rounded-2xl font-black shadow-lg text-sm uppercase tracking-widest active:scale-95 transition-all">
            Feito! Código Atualizado.
          </button>
        </div>
      </div>
    </div>
  );
};