
import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, FileText, ChevronRight, HelpCircle, Trash2, Edit2, Save, Plus } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, FinancialCategory, FinancialAccount, CostCenter } from '../types';
import * as XLSX from 'xlsx';

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: any[]) => void;
  categories: FinancialCategory[];
  accounts: FinancialAccount[];
  costCenters: CostCenter[];
}

type TabType = 'IMPORT' | 'TEMPLATE';

// Mappings for Portuguese Support
const TYPE_MAP: Record<string, TransactionType> = {
    'RECEITA': TransactionType.INCOME,
    'DESPESA': TransactionType.EXPENSE,
    'INCOME': TransactionType.INCOME, // Fallback
    'EXPENSE': TransactionType.EXPENSE // Fallback
};

const STATUS_MAP: Record<string, 'PAID' | 'PENDING'> = {
    'REALIZADO': 'PAID',
    'PAGO': 'PAID',
    'RECEBIDO': 'PAID',
    'PENDENTE': 'PENDING',
    'PAID': 'PAID', // Fallback
    'PENDING': 'PENDING' // Fallback
};

const METHOD_MAP: Record<string, PaymentMethod> = {
    'PIX': 'PIX',
    'BOLETO': 'BOLETO',
    'CARTÃO DE CRÉDITO': 'CREDIT_CARD',
    'CARTAO DE CREDITO': 'CREDIT_CARD',
    'CARTÃO DE DÉBITO': 'DEBIT_CARD',
    'CARTAO DE DEBITO': 'DEBIT_CARD',
    'DINHEIRO': 'CASH',
    'TRANSFERÊNCIA': 'TRANSFER',
    'TRANSFERENCIA': 'TRANSFER',
    'OUTRO': 'OTHER'
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'PIX': 'Pix',
  'BOLETO': 'Boleto',
  'CREDIT_CARD': 'Cartão de Crédito',
  'DEBIT_CARD': 'Cartão de Débito',
  'CASH': 'Dinheiro',
  'TRANSFER': 'Transferência',
  'OTHER': 'Outro'
};

const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({ isOpen, onClose, onImport, categories, accounts, costCenters }) => {
  const [activeTab, setActiveTab] = useState<TabType>('IMPORT');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- EXCEL GENERATOR (TEMPLATE WITH DROPDOWNS) ---
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1. Prepare Validation Data (Hidden Sheet) - TRANSLATED TO PORTUGUESE
    const types = ['Receita', 'Despesa'];
    const statuses = ['Realizado', 'Pendente'];
    const methods = ['Pix', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência', 'Outro'];
    
    const categoryNames = categories.filter(c => c.active).map(c => c.name);
    const accountNames = accounts.filter(a => a.status === 'ACTIVE').map(a => a.name);
    const costCenterNames = costCenters.filter(c => c.status === 'ACTIVE').map(c => c.name);

    // Find max length to create data sheet rows
    const maxLength = Math.max(types.length, statuses.length, methods.length, categoryNames.length, accountNames.length, costCenterNames.length);
    const dataRows = [];
    
    // Header for data sheet (just for clarity)
    dataRows.push(['_Types', '_Status', '_Methods', '_Categories', '_Accounts', '_CostCenters']);

    for(let i=0; i<maxLength; i++) {
        dataRows.push([
            types[i] || '',
            statuses[i] || '',
            methods[i] || '',
            categoryNames[i] || '',
            accountNames[i] || '',
            costCenterNames[i] || ''
        ]);
    }

    const dataWS = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, dataWS, "Dados");

    // 2. Prepare Template Sheet
    const headers = [
      'Data (AAAA-MM-DD)', 
      'Descrição', 
      'Valor', 
      'Tipo', 
      'Categoria', 
      'Conta (Opcional)',
      'Centro de Custo (Opcional)',
      'Forma Pagamento', 
      'Status'
    ];
    
    const example = [
      new Date().toISOString().split('T')[0],
      'Ex: Venda de Consultoria',
      1500.00,
      'Receita',
      categoryNames[0] || 'Vendas',
      accountNames[0] || '',
      costCenterNames[0] || '',
      'Pix',
      'Realizado'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // Apply Validation
    if(!ws['!dataValidation']) ws['!dataValidation'] = [];

    // Col D (Type): Index 3
    ws['!dataValidation'].push({
        sqref: "D2:D1000",
        type: 'list',
        operator: 'equal',
        formula1: "'Dados'!$A$2:$A$" + (types.length + 1),
        showDropDown: true
    });

    // Col E (Category): Index 4
    ws['!dataValidation'].push({
        sqref: "E2:E1000",
        type: 'list',
        operator: 'equal',
        formula1: "'Dados'!$D$2:$D$" + (categoryNames.length + 1),
        showDropDown: true
    });

    // Col F (Account): Index 5 (New)
    if (accountNames.length > 0) {
        ws['!dataValidation'].push({
            sqref: "F2:F1000",
            type: 'list',
            operator: 'equal',
            formula1: "'Dados'!$E$2:$E$" + (accountNames.length + 1),
            showDropDown: true
        });
    }

    // Col G (Cost Center): Index 6 (New)
    if (costCenterNames.length > 0) {
        ws['!dataValidation'].push({
            sqref: "G2:G1000",
            type: 'list',
            operator: 'equal',
            formula1: "'Dados'!$F$2:$F$" + (costCenterNames.length + 1),
            showDropDown: true
        });
    }

    // Col H (Method): Index 7 (Shifted)
    ws['!dataValidation'].push({
        sqref: "H2:H1000",
        type: 'list',
        operator: 'equal',
        formula1: "'Dados'!$C$2:$C$" + (methods.length + 1),
        showDropDown: true
    });

    // Col I (Status): Index 8 (Shifted)
    ws['!dataValidation'].push({
        sqref: "I2:I1000",
        type: 'list',
        operator: 'equal',
        formula1: "'Dados'!$B$2:$B$" + (statuses.length + 1),
        showDropDown: true
    });

    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // Data
        { wch: 30 }, // Desc
        { wch: 15 }, // Valor
        { wch: 15 }, // Tipo
        { wch: 25 }, // Categoria
        { wch: 25 }, // Conta
        { wch: 25 }, // CC
        { wch: 20 }, // Forma
        { wch: 15 }  // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Modelo Importação");

    // Hide the 'Dados' sheet
    if(!wb.Workbook) wb.Workbook = { Sheets: [] };
    if(!wb.Workbook.Sheets) wb.Workbook.Sheets = [];
    wb.Workbook.Sheets[0] = { Hidden: 1 }; // Dados
    wb.Workbook.Sheets[1] = { Hidden: 0 }; // Modelo

    XLSX.writeFile(wb, "modelo_importacao_fingestao.xlsx");
  };

  // Helper for dates
  const formatDateToISO = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    
    // Excel Serial Number
    if (typeof val === 'number') {
        const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset()); 
        return dateObj.toISOString().split('T')[0];
    }
    
    // String Handling
    if (typeof val === 'string') {
        const clean = val.trim();
        // Check for DD/MM/YYYY (Brazilian format common in Excel)
        if (clean.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const parts = clean.split('/');
            // Convert to YYYY-MM-DD
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        // Check for YYYY-MM-DD (Already ISO)
        if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return clean;
        }
    }
    
    // Fallback
    return new Date().toISOString().split('T')[0];
  };

  // --- EXCEL PARSER ---
  const parseExcelData = (arrayBuffer: ArrayBuffer) => {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Try to find the visible data sheet if default is hidden 'Dados'
        if (workbook.SheetNames[0] === 'Dados' && workbook.SheetNames.length > 1) {
            worksheet = workbook.Sheets[workbook.SheetNames[1]];
        }
        
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const parsed: any[] = [];
        let hasError = false;

        // Skip header (index 0), start at 1
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const dateRaw = row[0];
            const description = row[1];
            const amount = row[2];
            const typeRaw = row[3];
            const categoryRaw = row[4];
            const accountName = row[5];
            const costCenterName = row[6];
            const methodRaw = row[7];
            const statusRaw = row[8];

            if (!description || amount === undefined || amount === null) {
                continue; 
            }

            // Handle Date strictly
            const dateStr = formatDateToISO(dateRaw);

            // TRANSLATE INPUTS
            const typeStr = typeof typeRaw === 'string' ? typeRaw.toUpperCase().trim() : '';
            const statusStr = typeof statusRaw === 'string' ? statusRaw.toUpperCase().trim() : '';
            const methodStr = typeof methodRaw === 'string' ? methodRaw.toUpperCase().trim() : '';

            // Map Portuguese/Excel values to Internal Types
            const finalType = TYPE_MAP[typeStr] || TransactionType.EXPENSE;
            const finalStatus = STATUS_MAP[statusStr] || 'PAID';
            let finalMethod: PaymentMethod = METHOD_MAP[methodStr] || 'OTHER';

            // Map Names to IDs
            let resolvedAccountId = '';
            
            if (accountName) {
                const foundAccount = accounts.find(a => a.name.trim().toLowerCase() === String(accountName).trim().toLowerCase());
                if (foundAccount) {
                    resolvedAccountId = foundAccount.id;
                }
            }

            let resolvedCostCenterId = '';
            if (costCenterName) {
                const foundCC = costCenters.find(c => c.name.trim().toLowerCase() === String(costCenterName).trim().toLowerCase());
                if (foundCC) {
                    resolvedCostCenterId = foundCC.id;
                }
            }

            // Try to match category name loosely
            const categoryName = String(categoryRaw || '').trim();
            
            parsed.push({
                // Generate a temporary ID for the preview row
                _tempId: Math.random().toString(36).substr(2, 9),
                date: dateStr,
                description: String(description),
                amount: Number(amount),
                type: finalType,
                category: categoryName || 'Geral',
                accountId: resolvedAccountId, 
                costCenterId: resolvedCostCenterId, 
                
                // Allow editing these as well
                paymentMethod: finalMethod,
                status: finalStatus
            });
        }

        if (parsed.length === 0) {
            setError('Nenhum dado válido encontrado na planilha.');
        } else {
            setError('');
            setPreviewData(parsed);
        }
    } catch (err) {
        console.error(err);
        setError('Erro ao processar o arquivo. Verifique se é um Excel válido.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        parseExcelData(arrayBuffer);
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  // --- EDIT FUNCTIONS ---
  const handleUpdateRow = (index: number, field: string, value: any) => {
      const updated = [...previewData];
      updated[index] = { ...updated[index], [field]: value };
      setPreviewData(updated);
  };

  const handleDeleteRow = (index: number) => {
      const updated = previewData.filter((_, i) => i !== index);
      setPreviewData(updated);
  };

  const handleAddEmptyRow = () => {
      const newRow = {
          _tempId: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: 0,
          type: TransactionType.EXPENSE,
          category: 'Geral',
          accountId: accounts[0]?.id || '', // Default to first account
          costCenterId: '',
          paymentMethod: 'PIX',
          status: 'PAID'
      };
      setPreviewData([...previewData, newRow]);
      setError(''); // Clear errors if any, since we are adding data
  };

  const handleConfirmImport = () => {
    if (previewData.length > 0) {
        // Transform preview data back to full transaction structure needed by parent
        const finalData = previewData.map(row => ({
            date: row.date,
            description: row.description || 'Sem descrição',
            amount: Number(row.amount),
            type: row.type,
            category: row.category,
            accountId: row.accountId || accounts[0]?.id, // Fallback if still empty
            costCenterId: row.costCenterId,
            status: row.status,
            payments: [{
                method: row.paymentMethod || 'OTHER',
                amount: Number(row.amount),
                date: row.date,
                status: row.status
            }]
        }));
        onImport(finalData);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="text-green-600" size={24}/> Importação em Lote
            </h3>
            <p className="text-sm text-gray-500 mt-1">Carregue, corrija e confirme seus lançamentos.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('IMPORT')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'IMPORT' ? 'border-b-2 border-green-600 text-green-700 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                1. Carregar e Corrigir
            </button>
            <button 
                onClick={() => setActiveTab('TEMPLATE')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'TEMPLATE' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                2. Baixar Modelo
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-hidden flex flex-col flex-1">
            {activeTab === 'IMPORT' ? (
                <div className="flex flex-col h-full space-y-4">
                    {/* Upload Area */}
                    {!previewData.length ? (
                        <div className="flex flex-col flex-1 gap-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group flex-1"
                            >
                                <div className="p-4 bg-gray-100 rounded-full mb-4 group-hover:bg-white text-gray-400 group-hover:text-green-600 transition-colors">
                                    <Upload size={36} />
                                </div>
                                <h4 className="font-semibold text-gray-700 mb-1 text-lg">Clique para carregar planilha</h4>
                                <p className="text-sm text-gray-500">Suporta arquivos .XLSX (Excel)</p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    accept=".xlsx, .xls, .csv" 
                                    className="hidden" 
                                />
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="h-px bg-gray-200 flex-1"></div>
                                <span className="text-sm text-gray-400 font-medium uppercase">Ou</span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                            </div>

                            <button 
                                onClick={handleAddEmptyRow}
                                className="w-full py-4 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Preencher Manualmente
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100 mb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-green-600" size={24}/>
                                    <div>
                                        <p className="font-bold text-green-800">{file ? file.name : 'Entrada Manual'}</p>
                                        <p className="text-xs text-green-600">{previewData.length} registros encontrados. <span className="font-bold">Verifique e corrija os dados abaixo.</span></p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); }} className="text-xs text-red-500 hover:underline font-semibold bg-white px-3 py-1.5 rounded border border-red-100">
                                    Descartar e Recomeçar
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm bg-white custom-scrollbar relative">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="p-3 border-b border-gray-200 w-10 text-center">#</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[110px]">Data</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[200px]">Descrição</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[100px]">Valor</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[100px]">Tipo</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[120px]">Forma Pag.</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[100px]">Status</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[150px]">Categoria</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[150px]">Conta Destino</th>
                                            <th className="p-3 border-b border-gray-200 min-w-[150px]">C. Custo</th>
                                            <th className="p-3 border-b border-gray-200 w-10 text-center">Excluir</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewData.map((row, idx) => (
                                            <tr key={row._tempId || idx} className="hover:bg-blue-50/50 transition-colors group">
                                                <td className="p-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                                                
                                                <td className="p-2">
                                                    <input 
                                                        type="date" 
                                                        value={row.date} 
                                                        onChange={(e) => handleUpdateRow(idx, 'date', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none transition-all text-black"
                                                    />
                                                </td>
                                                
                                                <td className="p-2">
                                                    <input 
                                                        type="text" 
                                                        value={row.description} 
                                                        onChange={(e) => handleUpdateRow(idx, 'description', e.target.value)}
                                                        className={`w-full bg-transparent border hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none transition-all text-black ${!row.description ? 'border-red-300 bg-red-50' : 'border-transparent'}`}
                                                        placeholder="Descrição obrigatória"
                                                    />
                                                </td>
                                                
                                                <td className="p-2">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={row.amount} 
                                                        onChange={(e) => handleUpdateRow(idx, 'amount', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none transition-all font-mono text-black"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={row.type}
                                                        onChange={(e) => handleUpdateRow(idx, 'type', e.target.value)}
                                                        className={`w-full text-xs font-bold rounded px-1 py-1 outline-none border border-transparent hover:border-gray-300 focus:border-indigo-500 cursor-pointer ${row.type === 'INCOME' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}
                                                    >
                                                        <option value="INCOME">Receita</option>
                                                        <option value="EXPENSE">Despesa</option>
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={row.paymentMethod}
                                                        onChange={(e) => handleUpdateRow(idx, 'paymentMethod', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none cursor-pointer text-xs text-black"
                                                    >
                                                        {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={row.status}
                                                        onChange={(e) => handleUpdateRow(idx, 'status', e.target.value)}
                                                        className={`w-full text-xs font-bold rounded px-1 py-1 outline-none border border-transparent hover:border-gray-300 focus:border-indigo-500 cursor-pointer ${row.status === 'PAID' ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'}`}
                                                    >
                                                        <option value="PAID">Realizado</option>
                                                        <option value="PENDING">Pendente</option>
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    <select // Using standard input for category name or mapping to known categories if complex logic needed
                                                        value={row.category}
                                                        onChange={(e) => handleUpdateRow(idx, 'category', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none cursor-pointer text-black"
                                                    >
                                                        {categories
                                                            .filter(c => c.type === row.type)
                                                            .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                                        }
                                                        <option value="Geral">Geral (Padrão)</option>
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={row.accountId || ''}
                                                        onChange={(e) => handleUpdateRow(idx, 'accountId', e.target.value)}
                                                        className={`w-full border rounded px-2 py-1 outline-none cursor-pointer text-xs ${!row.accountId ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-transparent bg-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white text-black'}`}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={row.costCenterId || ''}
                                                        onChange={(e) => handleUpdateRow(idx, 'costCenterId', e.target.value)}
                                                        className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none cursor-pointer text-black"
                                                    >
                                                        <option value="">-</option>
                                                        {costCenters.map(cc => (
                                                            <option key={cc.id} value={cc.id}>{cc.name}</option>
                                                        ))}
                                                    </select>
                                                </td>

                                                <td className="p-2 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteRow(idx)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Remover linha"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Add Row Button at the bottom of table */}
                            <button 
                                onClick={handleAddEmptyRow}
                                className="w-full py-3 bg-gray-50 border-t border-gray-200 text-gray-600 font-bold hover:bg-gray-100 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus size={16} /> Adicionar Linha
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-100">
                            <AlertCircle size={20}/> {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-lg">
                            <Download size={20}/> Baixe o modelo padrão
                        </h4>
                        <p className="text-sm text-blue-700 mb-6 leading-relaxed">
                            Utilize nosso arquivo Excel com <b>menus suspensos inteligentes</b>. 
                            Ele já vem configurado com suas categorias, contas bancárias e centros de custo atuais para evitar erros de digitação.
                        </p>
                        <button 
                            onClick={handleDownloadTemplate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-bold text-sm transition-colors shadow-md flex items-center gap-2"
                        >
                            <Download size={18}/> Download Modelo .XLSX
                        </button>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><HelpCircle size={16}/> Como funciona?</h4>
                        <ul className="space-y-3 text-xs text-gray-600">
                            <li className="flex gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="bg-white p-1.5 rounded shadow-sm h-fit"><CheckCircle2 size={16} className="text-green-600"/></div>
                                <div>
                                    <strong className="block text-gray-800 mb-1">Listas de Seleção</strong>
                                    Selecione Categorias, Contas e Centros de Custo diretamente das listas no Excel. O sistema reconhecerá os nomes automaticamente.
                                </div>
                            </li>
                            <li className="flex gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="bg-white p-1.5 rounded shadow-sm h-fit"><CheckCircle2 size={16} className="text-green-600"/></div>
                                <div>
                                    <strong className="block text-gray-800 mb-1">Correção Online</strong>
                                    Após o upload, você poderá editar todos os dados em uma tabela antes de salvar, garantindo que nada entre errado no sistema.
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
           <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors">
             Cancelar
           </button>
           {activeTab === 'IMPORT' && (
               <button 
                 type="button" 
                 onClick={handleConfirmImport}
                 disabled={previewData.length === 0}
                 className={`px-6 py-2.5 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
                     previewData.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md transform hover:-translate-y-0.5'
                 }`}
               >
                 <Save size={18}/> Salvar {previewData.length > 0 ? `${previewData.length} Lançamentos` : ''}
               </button>
           )}
           {activeTab === 'TEMPLATE' && (
               <button 
                 type="button" 
                 onClick={() => setActiveTab('IMPORT')}
                 className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
               >
                 Ir para Importação <ChevronRight size={18}/>
               </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default ImportTransactionsModal;
