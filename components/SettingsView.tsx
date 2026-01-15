
import React, { useState, useEffect, useRef } from 'react';
import { Company, FinancialCategory, AccountPlanItem, DRELineItem, DREMapping, TransactionType, DRETemplate, CustomMenuItem, PermissionKey } from '../types';
import { transactionService } from '../services/transactionService';
import { accountPlanService } from '../services/accountPlanService';
import { dreService } from '../services/dreService';
import { companyService } from '../services/companyService';
import { updateCompanySettings, getCompanyMenu, saveCompanyMenu, resetCompanyMenu } from '../services/mockData'; // Keep mock for company settings/menu for now if no service exists

import CategoryModal from './CategoryModal';
import AccountPlanModal from './AccountPlanModal';
import DRELineModal from './DRELineModal';
import DREMappingModal from './DREMappingModal';
import DRETemplateModal from './DRETemplateModal';
import {
    Settings, Tags, BookOpen, FileText, Plus, Search, Edit2, Trash2,
    TrendingUp, TrendingDown, Check, X, Layers, Building2, Save, Palette,
    Lock, Eye, Copy, LayoutTemplate, Menu, ArrowUp, ArrowDown, FolderPlus,
    Monitor, RefreshCw, EyeOff, CornerDownRight, Grid, GripVertical,
    LayoutDashboard, Bot, CircleDollarSign, Target, Wallet, Landmark, CalendarRange, Briefcase, Wrench, Users, Handshake, ListTodo, Filter, BarChart3, Activity, CreditCard, Calendar, Upload, Image, Key, ShieldCheck,
    ChevronDown, ChevronRight, Link as LinkIcon, ExternalLink
} from 'lucide-react';

interface SettingsViewProps {
    company: Company;
    onRefresh: () => void;
}

type SettingsTab = 'COMPANY' | 'CATEGORIES' | 'ACCOUNT_PLAN' | 'DRE_CONFIG' | 'MENU';

// Helper for available system views
const SYSTEM_VIEWS: { id: string; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'ai_advisor', label: 'IA Financeira', icon: 'Bot' },
    { id: 'transactions', label: 'Lançamentos', icon: 'CircleDollarSign' },
    { id: 'goals', label: 'Metas', icon: 'Target' },
    { id: 'prolabore', label: 'Prolabore', icon: 'Wallet' },
    { id: 'cost_centers', label: 'Centro de Custos', icon: 'Tags' },
    { id: 'accounts', label: 'Contas', icon: 'Landmark' },
    { id: 'agenda', label: 'Agenda', icon: 'Calendar' },
    { id: 'long_term', label: 'Longo Prazo', icon: 'CalendarRange' },
    { id: 'assets', label: 'Gestão de Ativos', icon: 'Briefcase' },
    { id: 'tools', label: 'Ferramentas', icon: 'Wrench' },
    { id: 'reports', label: 'Relatórios', icon: 'FileText' },
    { id: 'users', label: 'Usuários', icon: 'Users' },
    { id: 'settings', label: 'Configurações', icon: 'Settings' },
];

// Available Icons for Picker (Must match Layout.tsx mapping)
const AVAILABLE_ICONS = [
    { id: 'LayoutDashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Bot', icon: <Bot size={20} /> },
    { id: 'CircleDollarSign', icon: <CircleDollarSign size={20} /> },
    { id: 'Target', icon: <Target size={20} /> },
    { id: 'Wallet', icon: <Wallet size={20} /> },
    { id: 'Tags', icon: <Tags size={20} /> },
    { id: 'Landmark', icon: <Landmark size={20} /> },
    { id: 'CalendarRange', icon: <CalendarRange size={20} /> },
    { id: 'Briefcase', icon: <Briefcase size={20} /> },
    { id: 'Wrench', icon: <Wrench size={20} /> },
    { id: 'FileText', icon: <FileText size={20} /> },
    { id: 'Users', icon: <Users size={20} /> },
    { id: 'Settings', icon: <Settings size={20} /> },
    { id: 'Handshake', icon: <Handshake size={20} /> },
    { id: 'ListTodo', icon: <ListTodo size={20} /> },
    { id: 'Filter', icon: <Filter size={20} /> },
    { id: 'Building2', icon: <Building2 size={20} /> },
    { id: 'BarChart3', icon: <BarChart3 size={20} /> },
    { id: 'Activity', icon: <Activity size={20} /> },
    { id: 'CreditCard', icon: <CreditCard size={20} /> },
    { id: 'Calendar', icon: <Calendar size={20} /> }
];

const SettingsView: React.FC<SettingsViewProps> = ({ company, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('COMPANY');
    const [searchTerm, setSearchTerm] = useState('');

    // Data Fetching
    const [categories, setCategories] = useState<FinancialCategory[]>([]);
    const [accountPlan, setAccountPlan] = useState<AccountPlanItem[]>([]);
    const [dreTemplates, setDreTemplates] = useState<DRETemplate[]>([]);
    const [dreLines, setDreLines] = useState<DRELineItem[]>([]); // Move dreLines to state

    const loadData = async () => {
        const cats = await transactionService.fetchCategories(company.id);
        if (cats) setCategories(cats);

        const accs = await accountPlanService.fetchAccountPlan(company.id);
        if (accs) setAccountPlan(accs);

        const tpls = await dreService.fetchTemplates(company.id);
        if (tpls) setDreTemplates(tpls);
    };

    useEffect(() => {
        loadData();
    }, [company.id, onRefresh]); // Refresh when asked


    // Template State
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

    // Initialize Active Template (Prefer System Default or First available)
    useEffect(() => {
        if (dreTemplates.length > 0 && !activeTemplateId) {
            const sysDefault = dreTemplates.find(t => t.isSystemDefault);
            setActiveTemplateId(sysDefault ? sysDefault.id : dreTemplates[0].id);
        }
    }, [dreTemplates, activeTemplateId]);

    const activeTemplate = dreTemplates.find(t => t.id === activeTemplateId);

    useEffect(() => {
        let mounted = true;

        const fetchLines = async () => {
            if (activeTemplateId) {
                const lines = await dreService.fetchDRELines(activeTemplateId);
                if (mounted) setDreLines(lines);
            } else {
                if (mounted) setDreLines([]);
            }
        };

        fetchLines();

        return () => { mounted = false; };
    }, [activeTemplateId, onRefresh]);

    const isTemplateReadOnly = activeTemplate?.isSystemDefault;

    // Modals State
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);

    const [isAccModalOpen, setIsAccModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountPlanItem | null>(null);

    const [isDREModalOpen, setIsDREModalOpen] = useState(false);
    const [editingDRELine, setEditingDRELine] = useState<DRELineItem | null>(null);

    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [mappingLine, setMappingLine] = useState<DRELineItem | null>(null);

    // Template Modal State
    const [isTplModalOpen, setIsTplModalOpen] = useState(false);
    const [isCloningTpl, setIsCloningTpl] = useState(false);

    // Menu State
    const [menuItems, setMenuItems] = useState<CustomMenuItem[]>([]);
    const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
    const [editingMenuItem, setEditingMenuItem] = useState<CustomMenuItem | null>(null);

    // DRE Expansion State
    const [expandedDREItems, setExpandedDREItems] = useState<Set<string>>(new Set());

    const toggleDREExpansion = (id: string) => {
        const newSet = new Set(expandedDREItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedDREItems(newSet);
    };

    // Drag State
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Logo & Token State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showToken, setShowToken] = useState(false);

    useEffect(() => {
        if (activeTab === 'MENU') {
            setMenuItems(getCompanyMenu(company.id));
        }
    }, [activeTab, company.id]);

    // Company Form State
    const [companyForm, setCompanyForm] = useState({
        name: company.name,
        cnpj: company.cnpj,
        phone: company.phone || '',
        address: company.address || '',
        primaryColor: company.primaryColor || 'indigo',
        logo: company.logo || '',
        apiToken: company.apiToken || '',
        apiTokenDescription: company.apiTokenDescription || ''
    });

    useEffect(() => {
        setCompanyForm({
            name: company.name,
            cnpj: company.cnpj,
            phone: company.phone || '',
            address: company.address || '',
            primaryColor: company.primaryColor || 'indigo',
            logo: company.logo || '',
            apiToken: company.apiToken || '',
            apiTokenDescription: company.apiTokenDescription || ''
        });
    }, [company]);

    const handleCompanySave = async (e: React.FormEvent) => {
        e.preventDefault();
        // Use real service
        const success = await companyService.updateCompany(company.id, companyForm);
        if (success) {
            alert('Dados da empresa atualizados com sucesso!');
            onRefresh();
        } else {
            alert('Erro ao atualizar dados da empresa.');
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyForm(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateToken = () => {
        // Generate a pseudo-secure token
        const randomPart = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now().toString(36);
        const token = `sk_${company.id}_${timestamp}_${randomPart}`;

        setCompanyForm(prev => ({ ...prev, apiToken: token }));
        setShowToken(true);
    };

    const handleDeleteToken = async () => {
        if (confirm('Tem certeza? Integrações externas usando este token irão parar de funcionar.')) {
            // Immediate persistence for security actions
            const success = await companyService.updateCompany(company.id, {
                apiToken: '',
                apiTokenDescription: ''
            });

            if (success) {
                setCompanyForm(prev => ({ ...prev, apiToken: '', apiTokenDescription: '' }));
                alert('Token revogado com sucesso.');
            } else {
                alert('Erro ao revogar token.');
            }
        }
    };

    const handleLeaveCompany = async () => {
        if (confirm(`ATENÇÃO: Você está prestes a remover seu acesso à empresa "${company.name}".\n\nEsta ação NÃO APAGA a empresa, apenas remove você da equipe.\n\nDeseja continuar?`)) {
            const result = await companyService.leaveCompany(company.id);
            if (result.success) {
                alert('Você saiu da empresa com sucesso. Você será redirecionado para sua carteira.');
                window.location.reload(); // Simple reload to refresh app state/list
            } else {
                alert('Não foi possível sair: ' + result.message);
            }
        }
    };

    // --- Handlers: Categories ---
    const handleSaveCategory = async (data: any) => {
        if (editingCategory) {
            // Edição não suportada plenamente no backend service ainda, alerta temp
            alert('Edição de categorias não implementada no backend ainda.');
        } else {
            await transactionService.createCategory({ ...data, companyId: company.id });
        }
        onRefresh();
    };
    const handleDeleteCategory = async (id: string) => {
        if (confirm('Excluir categoria?')) {
            await transactionService.deleteCategory(id);
            onRefresh();
        }
    };

    // --- Handlers: Account Plan ---
    const handleSaveAccount = async (data: any) => {
        if (editingAccount) {
            await accountPlanService.updateAccountPlanItem(editingAccount.id, data);
        } else {
            await accountPlanService.createAccountPlanItem({ ...data, companyId: company.id });
        }
        onRefresh();
    };
    const handleDeleteAccount = async (id: string) => {
        if (confirm('Excluir conta do plano?')) {
            await accountPlanService.deleteAccountPlanItem(id);
            onRefresh();
        }
    };

    // --- Handlers: DRE Templates ---
    const handleOpenCloneTemplate = () => {
        setIsCloningTpl(true);
        setIsTplModalOpen(true);
    };

    const handleOpenNewTemplate = () => {
        setIsCloningTpl(false);
        setIsTplModalOpen(true);
    };

    const handleSaveTemplate = async (name: string) => {
        let newId: string | null = null;

        if (isCloningTpl && activeTemplateId) {
            newId = await dreService.cloneTemplate(activeTemplateId, name, company.id);
        } else {
            // New Model -> Clones System Default
            newId = await dreService.createTemplate(name, company.id);
        }

        if (newId) {
            await loadData(); // Refresh list
            setActiveTemplateId(newId); // Switch to new
            setIsTplModalOpen(false);
        } else {
            alert('Erro ao criar modelo. Verifique se o modelo padrão do sistema foi inicializado.');
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!templateId) return;

        if (confirm('Tem certeza que deseja excluir este modelo de DRE? Esta ação não pode ser desfeita.')) {
            const success = await dreService.deleteTemplate(templateId);
            if (success) {
                // If the deleted one was active, switch to another
                if (activeTemplateId === templateId) {
                    const remaining = dreTemplates.filter(t => t.id !== templateId);
                    if (remaining.length > 0) {
                        setActiveTemplateId(remaining[0].id);
                    } else {
                        setActiveTemplateId(null);
                    }
                }
                // Refresh list
                loadData();
            } else {
                alert('Erro ao excluir o modelo. Verifique se existem dependências.');
            }
        }
    };

    // --- Handlers: DRE Lines ---
    const handleSaveDRELine = async (data: any) => {
        if (!activeTemplateId || isTemplateReadOnly) return;

        if (data.id) {
            // Update
            const success = await dreService.updateDRELine({
                ...data,
                templateId: activeTemplateId // Ensure template ID is preserved
            });
            if (!success) alert('Erro ao atualizar linha.');
        } else {
            // Create
            // Calculate next order
            const maxOrder = dreLines.reduce((max, line) => Math.max(max, line.order), 0);

            const newLine = await dreService.createDRELine({
                templateId: activeTemplateId,
                name: data.name,
                type: data.type,
                parentId: data.parentId || null, // Ensure explicit null if undefined
                order: maxOrder + 1
            });
            if (!newLine) alert('Erro ao criar linha.');
        }

        // Refresh DRE Lines
        const lines = await dreService.fetchDRELines(activeTemplateId);
        setDreLines(lines);
        setIsDREModalOpen(false);
    };

    const handleDeleteDRELine = async (id: string) => {
        if (isTemplateReadOnly) return;

        // Validation: Prevent deleting groups with children
        const hasChildren = dreLines.some(line => line.parentId === id);
        if (hasChildren) {
            alert('Não é possível excluir este item pois ele possui linhas dependentes (filhos). Mova ou exclua os itens filhos primeiro.');
            return;
        }

        if (confirm('Excluir linha da DRE? Isso removerá também os mapeamentos associados.')) {
            const success = await dreService.deleteDRELine(id);
            if (success) {
                const lines = await dreService.fetchDRELines(activeTemplateId!);
                setDreLines(lines);
            } else {
                alert('Erro ao excluir linha.');
            }
        }
    };
    const handleUpdateMappings = async (lineId: string, mappings: DREMapping[]) => {
        if (isTemplateReadOnly) return;

        const success = await dreService.updateDREMappings(lineId, mappings);
        if (success) {
            // Refresh lines to show updated mappings count
            const lines = await dreService.fetchDRELines(activeTemplateId!);
            setDreLines(lines);
            setIsMappingModalOpen(false);
        } else {
            alert("Erro ao atualizar mapeamentos.");
        }
    };

    // --- Handlers: Menu Configuration ---
    const handleMenuSave = () => {
        saveCompanyMenu(company.id, menuItems);
        alert('Menu atualizado com sucesso!');
        onRefresh(); // Updates Layout sidebar instantly
    };

    const handleMenuReset = () => {
        if (confirm('Deseja restaurar o menu padrão do sistema?')) {
            resetCompanyMenu(company.id);
            onRefresh(); // Updates Layout sidebar instantly
        }
    };

    const addMenuItem = (viewId: string) => {
        const systemView = SYSTEM_VIEWS.find(v => v.id === viewId);
        if (!systemView) return;

        const newItem: CustomMenuItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'ITEM',
            label: systemView.label,
            icon: systemView.icon,
            viewId: systemView.id,
            active: true
        };

        // Add as child if group selected, else root
        if (selectedMenuItemId) {
            const updated = [...menuItems];
            const addToGroup = (items: CustomMenuItem[]): boolean => {
                for (const item of items) {
                    if (item.id === selectedMenuItemId) {
                        if (item.type === 'GROUP') {
                            item.children = [...(item.children || []), newItem];
                            return true;
                        }
                    }
                    if (item.children && addToGroup(item.children)) return true;
                }
                return false;
            };
            if (addToGroup(updated)) {
                setMenuItems(updated);
                return;
            }
        }
        setMenuItems([...menuItems, newItem]);
    };

    const addMenuGroup = () => {
        const newGroup: CustomMenuItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'GROUP',
            label: 'Novo Grupo',
            groupType: 'COLLAPSIBLE',
            children: [],
            isExpanded: true, // Default to expanded in editor for visibility
            active: true
        };
        setMenuItems([...menuItems, newGroup]);
    };

    const moveItem = (direction: 'up' | 'down') => {
        if (!selectedMenuItemId) return;

        const moveInList = (list: CustomMenuItem[]): CustomMenuItem[] => {
            const idx = list.findIndex(i => i.id === selectedMenuItemId);
            if (idx === -1) {
                return list.map(item => ({ ...item, children: item.children ? moveInList(item.children) : undefined }));
            }

            const newList = [...list];
            if (direction === 'up' && idx > 0) {
                [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
            } else if (direction === 'down' && idx < newList.length - 1) {
                [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
            }
            return newList;
        };

        setMenuItems(moveInList(menuItems));
    };

    // Enhanced Delete: Promotes children instead of deleting them if it's a group
    const deleteMenuItem = () => {
        if (!selectedMenuItemId) return;

        // Verify if item is group and has children
        const checkGroupChildren = (list: CustomMenuItem[]): boolean => {
            for (const item of list) {
                if (item.id === selectedMenuItemId) {
                    return item.type === 'GROUP' && !!item.children && item.children.length > 0;
                }
                if (item.children && checkGroupChildren(item.children)) return true;
            }
            return false;
        };

        const hasChildren = checkGroupChildren(menuItems);
        const msg = hasChildren
            ? 'Este grupo contém itens. Deseja excluí-lo e mover os itens para o nível superior?'
            : 'Tem certeza que deseja remover este item?';

        if (!confirm(msg)) return;

        const deleteFromList = (list: CustomMenuItem[]): CustomMenuItem[] => {
            return list.flatMap(item => {
                if (item.id === selectedMenuItemId) {
                    // If it's a group with children, promote children to current level
                    if (item.type === 'GROUP' && item.children && item.children.length > 0) {
                        return item.children; // Promote children (Explode group)
                    }
                    return []; // Delete item
                }
                if (item.children) {
                    return [{ ...item, children: deleteFromList(item.children) }];
                }
                return [item];
            });
        };
        setMenuItems(deleteFromList(menuItems));
        setSelectedMenuItemId(null);
    };

    const toggleItemActive = (itemId: string, currentStatus: boolean) => {
        const updateList = (list: CustomMenuItem[]): CustomMenuItem[] => {
            return list.map(item => {
                if (item.id === itemId) {
                    return { ...item, active: !currentStatus };
                }
                if (item.children) return { ...item, children: updateList(item.children) };
                return item;
            });
        };
        setMenuItems(updateList(menuItems));
    };

    const handleEditItem = (item: CustomMenuItem) => {
        setEditingMenuItem({ ...item });
    };

    const saveItemChanges = () => {
        if (!editingMenuItem) return;

        const updateList = (list: CustomMenuItem[]): CustomMenuItem[] => {
            return list.map(item => {
                if (item.id === editingMenuItem.id) {
                    return {
                        ...item,
                        label: editingMenuItem.label,
                        groupType: editingMenuItem.groupType,
                        icon: editingMenuItem.icon,
                        isExpanded: editingMenuItem.isExpanded
                    };
                }
                if (item.children) return { ...item, children: updateList(item.children) };
                return item;
            });
        };

        setMenuItems(updateList(menuItems));
        setEditingMenuItem(null);
    };

    // --- Drag and Drop Logic ---

    // Extract item from tree
    const extractItem = (list: CustomMenuItem[], id: string): { item: CustomMenuItem | null, newList: CustomMenuItem[] } => {
        let extracted: CustomMenuItem | null = null;
        const filterRecursive = (items: CustomMenuItem[]): CustomMenuItem[] => {
            const result: CustomMenuItem[] = [];
            for (const item of items) {
                if (item.id === id) {
                    extracted = item;
                } else {
                    const newItem = { ...item };
                    if (item.children) {
                        newItem.children = filterRecursive(item.children);
                    }
                    result.push(newItem);
                }
            }
            return result;
        };
        const newList = filterRecursive(list);
        return { item: extracted, newList };
    };

    const handleDragStart = (e: React.DragEvent, item: CustomMenuItem) => {
        e.stopPropagation();
        setDraggedItemId(item.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    };

    const handleDragOver = (e: React.DragEvent, targetId?: string, isGroup?: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        if (targetId && targetId !== draggedItemId) {
            setDragOverId(targetId);
        } else {
            setDragOverId(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string, isGroup: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
        const draggedId = e.dataTransfer.getData('text/plain');

        if (!draggedId || draggedId === targetId) return;

        // 1. Extract item
        const { item, newList } = extractItem(menuItems, draggedId);
        if (!item) return;

        // 2. Insert Logic
        // If dropping on a Group, nest it.
        // If dropping on an Item, reorder (place before/after). 
        // For simplicity in this non-library impl, we place BEFORE the target item.

        const insertRecursive = (list: CustomMenuItem[]): CustomMenuItem[] => {
            if (isGroup && targetId) {
                // Logic: If target is a group, we nest inside it
                return list.map(node => {
                    if (node.id === targetId) {
                        return { ...node, children: [...(node.children || []), item] };
                    }
                    if (node.children) {
                        return { ...node, children: insertRecursive(node.children) };
                    }
                    return node;
                });
            } else {
                // Logic: Insert before target in the same list level
                const targetIndex = list.findIndex(n => n.id === targetId);
                if (targetIndex !== -1) {
                    const newArr = [...list];
                    newArr.splice(targetIndex, 0, item);
                    return newArr;
                }
                // If not found in this level, try children
                return list.map(node => {
                    if (node.children) {
                        return { ...node, children: insertRecursive(node.children) };
                    }
                    return node;
                });
            }
        };

        if (isGroup) {
            setMenuItems(insertRecursive(newList));
        } else {
            // If inserting before a root item
            const rootIndex = newList.findIndex(n => n.id === targetId);
            if (rootIndex !== -1) {
                const newArr = [...newList];
                newArr.splice(rootIndex, 0, item);
                setMenuItems(newArr);
            } else {
                // Nested reordering
                setMenuItems(insertRecursive(newList));
            }
        }
        setDraggedItemId(null);
    };

    // Handle dropping on the main container (Move to Root)
    const handleDropOnRoot = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverId(null);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId) return;

        const { item, newList } = extractItem(menuItems, draggedId);
        if (item) {
            setMenuItems([...newList, item]);
        }
        setDraggedItemId(null);
    };

    // --- Filtering ---
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredAccountPlan = accountPlan.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.includes(searchTerm)
    );

    // --- Renderers ---

    // ... (Company, Categories, AccountPlan, DRE Tabs unchanged) ...
    const renderCompanyTab = () => (
        <div className="max-w-2xl animate-in fade-in duration-300 space-y-6">
            {/* LOGO UPLOAD & BASIC INFO */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Building2 className="text-indigo-600" size={20} /> Dados Cadastrais
                </h3>

                <form onSubmit={handleCompanySave} className="space-y-6">

                    {/* Logo Area */}
                    <div className="flex items-center gap-6">
                        <div
                            className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 relative group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {companyForm.logo ? (
                                <img src={companyForm.logo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-400 group-hover:text-indigo-500">
                                    <Image size={24} className="mx-auto mb-1" />
                                    <span className="text-[10px] font-bold">Logo</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload size={20} className="text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-800">Identidade Visual</h4>
                            <p className="text-xs text-gray-500 mt-1">Carregue a logomarca da sua empresa. Recomendado: PNG com fundo transparente, 200x200px.</p>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-indigo-600 text-xs font-bold hover:underline">
                                Alterar Imagem
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Razão Social / Nome</label>
                            <input
                                type="text"
                                required
                                value={companyForm.name}
                                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ</label>
                            <input
                                type="text"
                                required
                                value={companyForm.cnpj}
                                onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
                            <input
                                type="text"
                                value={companyForm.phone}
                                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label>
                            <input
                                type="text"
                                value={companyForm.address}
                                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Palette size={16} /> Personalização
                        </h4>
                        <div className="flex gap-3">
                            {['indigo', 'blue', 'emerald', 'red', 'violet', 'orange'].map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setCompanyForm({ ...companyForm, primaryColor: color })}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${companyForm.primaryColor === color ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: `var(--color-${color}-600, ${color})` }}
                                    title={color}
                                >
                                    {companyForm.primaryColor === color && <Check size={14} className="text-white mx-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                        >
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>

            {/* API & TOKEN */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Key className="text-orange-500" size={20} /> Integração e Acesso (Token)
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Gere um <b>Token de Acesso</b> para permitir que Consultores ou BPOs importem esta empresa para suas carteiras externas, ou para integrar com outros sistemas.
                </p>

                {!companyForm.apiToken ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center border-2 border-dashed border-gray-200">
                        <ShieldCheck className="mx-auto text-gray-300 mb-3" size={32} />
                        <h4 className="text-sm font-bold text-gray-700 mb-1">Nenhum Token Ativo</h4>
                        <p className="text-xs text-gray-500 mb-4">Gerar um token permite acesso externo seguro.</p>
                        <button onClick={handleGenerateToken} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                            Gerar Novo Token
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Token Ativo</span>
                                <button onClick={handleDeleteToken} className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                                    <Trash2 size={12} /> Revogar
                                </button>
                            </div>
                            <div className="relative group">
                                <div className={`font-mono text-sm bg-white border border-yellow-200 p-3 rounded-md break-all ${showToken ? 'text-gray-800' : 'text-gray-400 blur-sm select-none'}`}>
                                    {showToken ? companyForm.apiToken : 'sk_••••••••••••••••••••••••••••••••'}
                                </div>
                                <button
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 bg-white/80 rounded"
                                    title={showToken ? 'Ocultar' : 'Revelar'}
                                >
                                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-yellow-700 mt-2">
                                <Lock size={12} className="inline mr-1" />
                                Compartilhe este token apenas com BPOs ou Consultores de confiança. Eles poderão importar sua empresa para a gestão deles.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* DANGER ZONE / GOVERNANCE */}
            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                    <ShieldCheck className="text-red-600" size={20} /> Zona de Governança
                </h3>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-red-50 rounded-lg border border-red-100">
                    <div>
                        <h4 className="font-bold text-red-900">Sair da Empresa / Remover da Carteira</h4>
                        <p className="text-sm text-red-700 mt-1 max-w-lg">
                            Ao realizar esta ação, você removerá seu próprio acesso a esta empresa.
                            A empresa <b>NÃO</b> será excluída e continuará acessível para outros administradores.
                        </p>
                    </div>
                    <button
                        onClick={handleLeaveCompany}
                        className="whitespace-nowrap px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 hover:border-red-300 shadow-sm transition-colors flex items-center gap-2"
                    >
                        <ExternalLink size={16} className="rotate-180" />
                        Sair da Empresa
                    </button>
                </div>
            </div>
        </div>

    );

    const renderCategoriesTab = () => (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Categorias Financeiras</h3>
                <button
                    onClick={() => { setEditingCategory(null); setIsCatModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <Plus size={16} /> Nova Categoria
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-black"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map(cat => (
                    <div key={cat.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50" style={{ color: cat.color }}>
                                {cat.type === TransactionType.INCOME ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">{cat.name}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${cat.type === TransactionType.INCOME ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {cat.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
                                    </span>
                                    {!cat.active && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inativo</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {cat.isSystemDefault ? (
                                <span title="Padrão do Sistema (Somente Leitura)" className="p-1.5 text-gray-300 cursor-not-allowed">
                                    <Lock size={16} />
                                </span>
                            ) : (
                                <>
                                    <button onClick={() => { setEditingCategory(cat); setIsCatModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAccountPlanTab = () => (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Plano de Contas (Contábil)</h3>
                    <p className="text-xs text-gray-500">Estrutura padrão para Comércio e Serviço (Imutável).</p>
                </div>
                <button
                    onClick={() => { setEditingAccount(null); setIsAccModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <Plus size={16} /> Nova Conta
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por código ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-black"
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 w-32">Código</th>
                            <th className="px-6 py-3">Nome da Conta</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3 w-24 text-center">Status</th>
                            <th className="px-6 py-3 w-24 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredAccountPlan.sort((a, b) => a.code.localeCompare(b.code)).map(acc => {
                            // Calculate indent based on dots in code (e.g. 1.1.1 has 2 dots)
                            const level = (acc.code.match(/\./g) || []).length;
                            const isSystem = acc.isSystemDefault;

                            return (
                                <tr key={acc.id} className={`hover:bg-gray-50 group ${isSystem ? 'bg-gray-50/30' : ''}`}>
                                    <td className="px-6 py-3 font-mono text-gray-600">{acc.code}</td>
                                    <td className="px-6 py-3">
                                        <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center gap-2">
                                            {level > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}
                                            <span className={`text-gray-900 ${level === 0 ? 'font-bold' : (level === 1 ? 'font-semibold' : 'font-medium')}`}>
                                                {acc.name}
                                            </span>
                                            {isSystem && <span title="Conta do Sistema (Padrão)"><Lock size={12} className="text-gray-400" /></span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{acc.type}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {acc.status === 'ACTIVE'
                                            ? <Check size={16} className="text-green-500 mx-auto" />
                                            : <X size={16} className="text-gray-300 mx-auto" />
                                        }
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isSystem ? (
                                                <button onClick={() => { setEditingAccount(acc); setIsAccModalOpen(true); }} className="text-gray-400 hover:text-indigo-600" title="Visualizar">
                                                    <Eye size={16} />
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setEditingAccount(acc); setIsAccModalOpen(true); }} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded" title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Excluir">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const organizeDRE = (lines: DRELineItem[]) => {
        const root: DRELineItem[] = [];
        const map = new Map<string, DRELineItem & { children: DRELineItem[] }>();

        // Sort by order first
        const sorted = [...lines].sort((a, b) => a.order - b.order);

        // Initialize map
        sorted.forEach(line => {
            // @ts-ignore
            map.set(line.id, { ...line, children: [] });
        });

        // Build Tree
        sorted.forEach(line => {
            if (line.parentId && map.has(line.parentId)) {
                map.get(line.parentId)!.children.push(map.get(line.id)!);
            } else {
                root.push(map.get(line.id)!);
            }
        });

        return root;
    };

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case 'REVENUE': return 'bg-green-100 text-green-700 border-green-200';
            case 'DEDUCTION': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'COST': return 'bg-red-50 text-red-700 border-red-100'; // lighter red
            case 'EXPENSE': return 'bg-red-100 text-red-700 border-red-200';
            case 'TAX': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'SUBTOTAL': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'RESULT': return 'bg-slate-900 text-white border-slate-700';
            case 'GROUP': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getBadgeLabel = (type: string) => {
        switch (type) {
            case 'REVENUE': return 'receita';
            case 'DEDUCTION': return 'deducao';
            case 'COST': return 'custo';
            case 'EXPENSE': return 'despesa';
            case 'TAX': return 'imposto';
            case 'SUBTOTAL': return 'subtotal';
            case 'RESULT': return 'total'; // As per image "total" for result
            case 'GROUP': return 'grupo';
            default: return type.toLowerCase();
        }
    };

    const renderDREConfigTab_Legacy = () => {
        const tree = organizeDRE(dreLines);

        const renderRow = (item: DRELineItem & { children?: DRELineItem[] }, level: number = 0) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedDREItems.has(item.id);
            const isResult = item.type === 'RESULT';
            const isSubtotal = item.type === 'SUBTOTAL';
            const isGroup = item.type === 'GROUP';

            // -- Style Logic --
            let rowClass = "flex items-center justify-between p-3 border-b border-gray-100 last:border-0 transition-all select-none ";

            // Backgrounds
            if (isResult) rowClass += "bg-slate-900 hover:bg-slate-800 text-white shadow-sm my-1 rounded-lg border-none ";
            else if (isSubtotal) rowClass += "bg-blue-50/50 hover:bg-blue-50 text-slate-800 ";
            else if (isGroup) rowClass += "bg-gray-50 hover:bg-gray-100 text-gray-800 ";
            else rowClass += "bg-white hover:bg-white text-gray-600 hover:text-gray-900 ";

            // Font & Text
            let textClass = "text-sm transition-colors ";
            if (isResult) textClass += "font-bold text-white uppercase tracking-wide ";
            else if (isSubtotal) textClass += "font-bold text-slate-700 uppercase tracking-tight ";
            else if (isGroup) textClass += "font-semibold text-gray-800 ";
            else textClass += "font-medium ";

            // Indentation (Visual Hierarchy)
            const paddingLeft = level * 20 + 12;

            return (
                <div key={item.id} className="w-full">
                    <div
                        className={rowClass}
                        style={{ paddingLeft: `${paddingLeft}px` }}
                        onClick={() => (hasChildren || isGroup) && toggleDREExpansion(item.id)}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            {/* Expand/Collapse Toggle */}
                            <div className="w-6 flex justify-center shrink-0">
                                {hasChildren || isGroup ? (
                                    <button
                                        className={`p-1 rounded transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${isResult ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-indigo-600'}`}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                ) : (
                                    level > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div> // Dot for leaf items
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className={textClass}>{item.name}</span>
                                {/* Secondary Info for Detailed View (Ops) */}
                                {(item as any).code && <span className={`text-[10px] ${isResult ? 'text-white/40' : 'text-gray-300'} font-mono`}>{(item as any).code}</span>}
                            </div>

                            {/* Tags / Badges */}
                            <div className="flex items-center gap-2 ml-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-50 font-bold uppercase tracking-wider ${getBadgeStyle(item.type)}`}>
                                    {getBadgeLabel(item.type)}
                                </span>

                                {/* Mapping Indicator */}
                                {(item.mappings && item.mappings.length > 0) && (
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded border border-gray-200 bg-white shadow-sm flex items-center gap-1 font-medium ${isResult ? 'text-slate-800' : 'text-gray-500'}`}
                                        title={`${item.mappings.length} conta(s) ou categoria(s) vinculadas`}
                                    >
                                        <LinkIcon size={10} className="text-indigo-500" />
                                        {item.mappings.length}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 pl-4" onClick={(e) => e.stopPropagation()}>
                            {isTemplateReadOnly ? (
                                isResult ? null : <Lock size={12} className="text-gray-300" title="Somente Leitura" />
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setMappingLine(item); setIsMappingModalOpen(true); }}
                                        className={`p-1.5 rounded transition-colors ${isResult ? 'text-gray-400 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                        title="Mapear Contas/Categorias"
                                    >
                                        <LinkIcon size={14} />
                                    </button>
                                    <button
                                        onClick={() => { setEditingDRELine(item); setIsDREModalOpen(true); }}
                                        className={`p-1.5 rounded transition-colors ${isResult ? 'text-gray-400 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                        title="Editar Linha"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDRELine(item.id)}
                                        className={`p-1.5 rounded transition-colors ${isResult ? 'text-gray-400 hover:text-red-400 hover:bg-white/20' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                        title="Excluir Linha"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Children Container (Accordion) */}
                    {hasChildren && isExpanded && (
                        <div className="relative">
                            {/* Connector Line */}
                            <div className="absolute left-[20px] top-0 bottom-0 w-px bg-gray-100 z-0"></div>
                            <div className="relative z-10">
                                {item.children?.map(child => renderRow(child, level + 1))}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex-1 w-full md:w-auto">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <LayoutTemplate size={12} /> Modelo DRE Ativo
                        </label>
                        <select
                            value={activeTemplateId || ''}
                            onChange={(e) => setActiveTemplateId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black text-sm"
                        >
                            {dreTemplates.map(tpl => (
                                <option key={tpl.id} value={tpl.id}>
                                    {tpl.name} {tpl.isSystemDefault ? '(Sistema)' : '(Customizado)'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleOpenCloneTemplate}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-xs font-bold"
                            title="Criar novo modelo baseado neste"
                        >
                            <Copy size={14} /> Duplicar Modelo
                        </button>
                        {!isTemplateReadOnly && (
                            <button
                                onClick={handleDeleteTemplate}
                                className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-bold"
                                title="Excluir este modelo"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={handleOpenNewTemplate}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-bold"
                            title="Criar um novo modelo baseado na estrutura padrão"
                        >
                            <Plus size={14} /> Novo do Padrão
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Estrutura DRE</h3>
                        <p className="text-sm text-gray-500">
                            {isTemplateReadOnly
                                ? <span className="flex items-center gap-1 text-orange-600"><Lock size={12} /> Modelo de Sistema (Somente Leitura) - Duplique para editar.</span>
                                : 'Configure a estrutura hierárquica e mapeamentos.'}
                        </p>
                    </div>
                    {!isTemplateReadOnly && (
                        <button
                            onClick={() => { setEditingDRELine(null); setIsDREModalOpen(true); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <Plus size={16} /> Nova Linha
                        </button>
                    )}
                </div>

                <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${isTemplateReadOnly ? 'opacity-90' : ''}`}>
                    {tree.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {tree.map(item => renderRow(item))}
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <LayoutTemplate size={24} />
                            </div>
                            <div>
                                <h4 className="text-gray-900 font-medium">Nenhuma linha encontrada</h4>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                                    Este modelo parece estar vazio. Tente "Duplicar Modelo" ou "Novo do Padrão" para carregar a estrutura inicial, ou rode o script de inicialização.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDREConfigTab = () => {
        const tree = organizeDRE(dreLines);

        const renderRow = (item: DRELineItem & { children?: DRELineItem[] }, level: number = 0) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedDREItems.has(item.id);
            const isResult = item.type === 'RESULT';
            const isSubtotal = item.type === 'SUBTOTAL';
            const isGroup = item.type === 'GROUP';

            let rowClass = "flex items-center justify-between p-3 border-b border-gray-100 last:border-0 transition-all select-none ";
            if (isResult) rowClass += "bg-slate-900 hover:bg-slate-800 text-white shadow-sm my-1 rounded-lg border-none ";
            else if (isSubtotal) rowClass += "bg-blue-50/50 hover:bg-blue-50 text-slate-800 ";
            else if (isGroup) rowClass += "bg-gray-50 hover:bg-gray-100 text-gray-800 ";
            else rowClass += "bg-white hover:bg-white text-gray-600 hover:text-gray-900 ";

            let textClass = "text-sm transition-colors ";
            if (isResult) textClass += "font-bold text-white uppercase tracking-wide ";
            else if (isSubtotal) textClass += "font-bold text-slate-700 uppercase tracking-tight ";
            else if (isGroup) textClass += "font-semibold text-gray-800 ";
            else textClass += "font-medium ";

            const paddingLeft = level * 20 + 12;

            return (
                <div key={item.id} className="w-full">
                    <div
                        className={rowClass}
                        style={{ paddingLeft: `${paddingLeft}px` }}
                        onClick={() => (hasChildren || isGroup) && toggleDREExpansion(item.id)}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-6 flex justify-center shrink-0">
                                {hasChildren || isGroup ? (
                                    <button
                                        className={`p-1 rounded transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${isResult ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-indigo-600'}`}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                ) : (
                                    level > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className={textClass}>{item.name}</span>
                                {(item as any).code && <span className={`text-[10px] ${isResult ? 'text-white/40' : 'text-gray-300'} font-mono`}>{(item as any).code}</span>}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-50 font-bold uppercase tracking-wider ${getBadgeStyle(item.type)}`}>
                                    {getBadgeLabel(item.type)}
                                </span>
                                {(item.mappings && item.mappings.length > 0) && (
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded border border-gray-200 bg-white shadow-sm flex items-center gap-1 font-medium ${isResult ? 'text-slate-800' : 'text-gray-500'}`}
                                        title={`${item.mappings.length} conta(s) ou categoria(s) vinculadas`}
                                    >
                                        <LinkIcon size={10} className="text-indigo-500" />
                                        {item.mappings.length}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 pl-4" onClick={(e) => e.stopPropagation()}>
                            {isTemplateReadOnly ? (
                                isResult ? null : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setMappingLine(item); setIsMappingModalOpen(true); }}
                                            className="p-1.5 rounded transition-colors text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                            title="Visualizar Mapeamentos"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <Lock size={12} className="text-gray-300" title="Somente Leitura" />
                                    </div>
                                )
                            ) : (
                                <>
                                    <button onClick={() => { setMappingLine(item); setIsMappingModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600" title="Mapear"><LinkIcon size={14} /></button>
                                    <button onClick={() => { setEditingDRELine(item); setIsDREModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600" title="Editar"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDeleteDRELine(item.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500" title="Excluir"><Trash2 size={14} /></button>
                                </>
                            )}
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="relative">
                            <div className="absolute left-[20px] top-0 bottom-0 w-px bg-gray-100 z-0"></div>
                            <div className="relative z-10">
                                {item.children?.map(child => renderRow(child, level + 1))}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-300 p-2">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-start gap-4">
                    <h3 className="text-lg font-bold text-gray-800">Selecione o Modelo de DRE</h3>
                    <p className="text-gray-500 text-sm -mt-3">Escolha um dos modelos abaixo para visualizar e configurar a estrutura.</p>

                    <div className="flex flex-wrap gap-4 w-full">
                        {dreTemplates.map(tpl => {
                            const isActive = activeTemplateId === tpl.id;
                            return (
                                <div
                                    key={tpl.id}
                                    onClick={() => setActiveTemplateId(tpl.id)}
                                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer min-w-[240px] ${isActive
                                        ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`p-2.5 rounded-lg ${isActive ? 'bg-indigo-100/50 text-indigo-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                        <LayoutTemplate size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-sm ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{tpl.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                            {tpl.isSystemDefault ? 'Modelo de Sistema' : 'Personalizado'}
                                        </div>
                                    </div>

                                    {isActive && (
                                        <div className="absolute top-2 right-2">
                                            <Check size={14} className="text-indigo-600" />
                                        </div>
                                    )}

                                    {/* Actions Overlay (visible on hover) */}
                                    <div className={`absolute right-2 bottom-2 flex gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenCloneTemplate(); }} // Clones current if active, but logic uses activeTemplateId. 
                                            // Better to set active first? The click on parent sets active. 
                                            // The handler uses 'activeTemplate' state. We must ensure it's set. 
                                            // Actually, 'Clone' usually implies cloning *this* one.
                                            // Since handleOpenCloneTemplate uses 'activeTemplate', we should only show this button if it's the active one OR update the handle to accept an ID? 
                                            // Existing handler uses 'activeTemplate'. To be safe, I will make the button "Clone Active". 
                                            // BUT, user might want to clone a non-active one.
                                            // I'll stick to: Click card selects it. If selected, you see actions? 
                                            // The user wants ease. I will assume clicking the card makes it active instantly.
                                            // If I click the button inside, the parent onClick fires first (bubbling) unless I stopPropagation.
                                            // If I stopPropagation, the active ID won't change.
                                            // So I should allow setting active, but if I want to clone *that* specific one, I need to ensure the state updates.
                                            // Or cleaner: clicking the card selects it. The actions are for the *selected* card?
                                            // No, actions on a specific card should act on *that* card.
                                            // I will refactor logic slightly: if I click "Clone" on a card that isn't active, it should probably become active then clone, or just clone.
                                            // Given the constraints, I will keep it simple: Select first, then actions are available.
                                            // OR: I can just trigger the action.
                                            // Let's rely on the toolbar actions? No, user wants it *here*.
                                            // I will modify the Clone button to just call handleOpenCloneTemplate. Note that handleOpenCloneTemplate clones the *active* template.
                                            // So I must ensure this card IS the active template before cloning. 
                                            // Simplest UX: Only show actions on the *active* card.

                                            // Wait, if I only show on active, I save complexity.
                                            // If I want to clone another, I click it (it activates), then I click clone. 
                                            // This is acceptable.
                                            className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:text-indigo-600 text-gray-400 shadow-sm"
                                            title="Duplicar Modelo"
                                        >
                                            <Copy size={12} />
                                        </button>
                                        {!tpl.isSystemDefault && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                                                className="p-1.5 bg-white border border-gray-200 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 shadow-sm"
                                                title="Excluir Modelo"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            onClick={handleOpenNewTemplate}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 text-gray-400 transition-all font-bold text-sm min-w-[160px]"
                        >
                            <Plus size={18} />
                            Novo Modelo
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600" /> Estrutura de {activeTemplate?.name}
                        </h4>
                        {!isTemplateReadOnly && (
                            <button
                                onClick={() => { setEditingDRELine(null); setIsDREModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={14} /> Adicionar Linha
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {tree.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {tree.map(item => renderRow(item))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-400">
                                <LayoutTemplate size={32} className="mx-auto mb-2 opacity-20" />
                                <p>Estrutura vazia. Selecione outro modelo ou crie linhas.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderMenuEditorTab = () => {
        // Helper to render tree with Drag and Drop Support
        const renderMenuItem = (item: CustomMenuItem, level: number = 0) => {
            const isSelected = selectedMenuItemId === item.id;
            const isActive = item.active !== false;
            const isDragOver = dragOverId === item.id;

            let bgClass = '';
            if (isSelected) {
                bgClass = 'bg-indigo-50 border-l-4 border-l-indigo-600';
            } else {
                bgClass = 'border-l-4 border-l-transparent';
                if (level > 0) {
                    bgClass += ' bg-slate-50 hover:bg-slate-100';
                } else {
                    bgClass += ' bg-white hover:bg-gray-50';
                }
            }

            // D&D Visual Feedback for nesting vs ordering
            if (isDragOver) {
                if (item.type === 'GROUP') {
                    bgClass += ' ring-2 ring-indigo-400 ring-inset bg-indigo-50';
                } else {
                    // Reorder visual
                    bgClass += ' border-t-2 border-t-indigo-500';
                }
            }

            const paddingLeft = (level * 28) + 12;
            const ItemIconComponent = AVAILABLE_ICONS.find(i => i.id === item.icon)?.icon || <Monitor size={18} />;

            return (
                <React.Fragment key={item.id}>
                    <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, item.id, item.type === 'GROUP')}
                        onDrop={(e) => handleDrop(e, item.id, item.type === 'GROUP')}
                        onClick={() => setSelectedMenuItemId(item.id)}
                        className={`flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer transition-colors ${bgClass} ${!isActive ? 'opacity-50 grayscale' : ''} ${draggedItemId === item.id ? 'opacity-30 border-2 border-dashed border-gray-400' : ''}`}
                        style={{ paddingLeft: `${paddingLeft}px` }}
                    >
                        <div className="flex items-center gap-3 relative">
                            <GripVertical size={14} className="text-gray-300 cursor-grab active:cursor-grabbing" />

                            {/* Visual hierarchy connector for children */}
                            {level > 0 && (
                                <CornerDownRight size={14} className="text-gray-300 absolute -left-5 top-1/2 -translate-y-1/2" />
                            )}

                            {item.type === 'GROUP' ? <FolderPlus size={18} className="text-indigo-500 flex-shrink-0" /> : <span className="text-gray-500">{ItemIconComponent}</span>}
                            <div>
                                <span className={`text-sm ${item.type === 'GROUP' ? 'font-bold text-gray-800' : 'text-gray-700'} ${!isActive ? 'line-through' : ''}`}>
                                    {item.label}
                                </span>
                                {item.type === 'GROUP' && (
                                    <span className="ml-2 text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded shadow-sm">
                                        {item.groupType === 'FIXED' ? 'Fixo' : 'Expansível'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleItemActive(item.id, isActive); }}
                                className={`p-1.5 rounded transition-colors ${isActive ? 'text-gray-400 hover:text-green-600' : 'text-gray-300 hover:text-green-600'}`}
                                title={isActive ? "Inativar" : "Ativar"}
                            >
                                {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); handleEditItem(item); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                                <Edit2 size={14} />
                            </button>

                            {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                        </div>
                    </div>
                    {item.children && item.children.map(child => renderMenuItem(child, level + 1))}
                </React.Fragment>
            );
        };

        return (
            <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">

                {/* Left Panel: Available Views */}
                <div className="w-full lg:w-1/3 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                            <Plus size={16} className="text-green-600" /> Adicionar Item
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">Selecione um grupo na lista ao lado para adicionar itens dentro dele.</p>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                            {SYSTEM_VIEWS.map(view => (
                                <button
                                    key={view.id}
                                    onClick={() => addMenuItem(view.id)}
                                    className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-sm group"
                                >
                                    <span className="text-gray-600 group-hover:text-indigo-700">{view.label}</span>
                                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-indigo-500" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-2 text-sm">Estrutura</h4>
                        <button
                            onClick={addMenuGroup}
                            className="w-full py-2 bg-white border border-blue-200 text-blue-700 font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <FolderPlus size={16} /> Criar Grupo
                        </button>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-2">
                            <Grid size={16} /> Organização
                        </h4>
                        <ul className="text-xs text-gray-500 mb-2 list-disc pl-4 space-y-1">
                            <li>Arraste <b>sobre um Grupo</b> para aninhar.</li>
                            <li>Arraste <b>sobre um Item</b> para reordenar (inserir antes).</li>
                            <li>Arraste para a área pontilhada abaixo para <b>mover para a Raiz</b>.</li>
                        </ul>
                    </div>
                </div>

                {/* Right Panel: Menu Tree */}
                <div
                    className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col"
                    onDragOver={(e) => handleDragOver(e)} // Allow drop on container
                    onDrop={handleDropOnRoot} // Default to root drop if not handled by items
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Menu size={18} className="text-indigo-600" /> Menu Atual
                        </h4>
                        <div className="flex gap-2">
                            <button onClick={() => moveItem('up')} disabled={!selectedMenuItemId} className="p-2 border bg-white rounded hover:bg-gray-100 disabled:opacity-50"><ArrowUp size={16} /></button>
                            <button onClick={() => moveItem('down')} disabled={!selectedMenuItemId} className="p-2 border bg-white rounded hover:bg-gray-100 disabled:opacity-50"><ArrowDown size={16} /></button>
                            <button onClick={deleteMenuItem} disabled={!selectedMenuItemId} className="p-2 border border-red-200 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[400px] bg-white relative">
                        {menuItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Menu size={48} className="mb-2 opacity-20" />
                                <p className="text-sm">O menu está vazio.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {menuItems.map(item => renderMenuItem(item))}
                            </div>
                        )}

                        {/* Root Drop Zone */}
                        <div
                            onDragOver={handleDropOnRoot}
                            onDrop={handleDropOnRoot}
                            className={`p-6 m-2 border-2 border-dashed rounded-lg flex items-center justify-center text-xs font-bold uppercase tracking-wider transition-colors ${dragOverId === null && draggedItemId
                                ? 'border-blue-400 bg-blue-50 text-blue-600 scale-[1.01]'
                                : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                }`}
                        >
                            Solte aqui para Mover para a Raiz
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                        <button onClick={handleMenuReset} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                            <RefreshCw size={14} /> Restaurar Padrão
                        </button>
                        <button onClick={handleMenuSave} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2">
                            <Save size={18} /> Salvar Menu
                        </button>
                    </div>
                </div>

                {/* Enhanced Item Edit Modal */}
                {editingMenuItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Edit2 size={18} className="text-indigo-600" />
                                    Editar {editingMenuItem.type === 'GROUP' ? 'Grupo' : 'Item'}
                                </h3>
                                <button onClick={() => setEditingMenuItem(null)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                                {/* Label */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rótulo / Nome</label>
                                    <input
                                        type="text"
                                        value={editingMenuItem.label}
                                        onChange={(e) => setEditingMenuItem({ ...editingMenuItem, label: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                                    />
                                </div>

                                {/* Group Type Selector */}
                                {editingMenuItem.type === 'GROUP' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Comportamento</label>
                                            <select
                                                value={editingMenuItem.groupType}
                                                onChange={(e) => setEditingMenuItem({ ...editingMenuItem, groupType: e.target.value as 'FIXED' | 'COLLAPSIBLE' })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black text-sm"
                                            >
                                                <option value="FIXED">Fixo (Cabeçalho de Seção)</option>
                                                <option value="COLLAPSIBLE">Expansível (Accordion)</option>
                                            </select>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                {editingMenuItem.groupType === 'FIXED'
                                                    ? 'Itens filhos ficarão sempre visíveis. Use para separar seções grandes.'
                                                    : 'Usuário pode abrir e fechar o grupo. Ideal para submenus.'}
                                            </p>
                                        </div>

                                        {editingMenuItem.groupType === 'COLLAPSIBLE' && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="isExpanded"
                                                    checked={!!editingMenuItem.isExpanded}
                                                    onChange={(e) => setEditingMenuItem({ ...editingMenuItem, isExpanded: e.target.checked })}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-white"
                                                />
                                                <label htmlFor="isExpanded" className="text-sm text-gray-700 cursor-pointer select-none">
                                                    Expandido por Padrão?
                                                </label>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Icon Picker */}
                                {editingMenuItem.type === 'ITEM' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center gap-1">
                                            <Grid size={12} /> Ícone
                                        </label>
                                        <div className="grid grid-cols-5 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 h-32 overflow-y-auto custom-scrollbar">
                                            {AVAILABLE_ICONS.map(ic => (
                                                <button
                                                    key={ic.id}
                                                    onClick={() => setEditingMenuItem({ ...editingMenuItem, icon: ic.id })}
                                                    className={`p-2 rounded flex items-center justify-center transition-all ${editingMenuItem.icon === ic.id
                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                        : 'bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100'
                                                        }`}
                                                    title={ic.id}
                                                >
                                                    {ic.icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <button onClick={saveItemChanges} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm transition-colors">
                                    Confirmar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <CategoryModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                onSave={handleSaveCategory}
                initialData={editingCategory}
                accountPlanOptions={accountPlan}
            />

            <AccountPlanModal
                isOpen={isAccModalOpen}
                onClose={() => setIsAccModalOpen(false)}
                onSave={handleSaveAccount}
                initialData={editingAccount}
                allAccounts={accountPlan}
            />

            <DRELineModal
                isOpen={isDREModalOpen}
                onClose={() => setIsDREModalOpen(false)}
                onSave={handleSaveDRELine}
                initialData={editingDRELine}
                availableParents={dreLines}
            />

            <DREMappingModal
                isOpen={isMappingModalOpen}
                onClose={() => setIsMappingModalOpen(false)}
                onUpdate={handleUpdateMappings}
                lineItem={mappingLine}
                categories={categories}
                accounts={accountPlan}
                readOnly={isTemplateReadOnly}
            />

            <DRETemplateModal
                isOpen={isTplModalOpen}
                onClose={() => setIsTplModalOpen(false)}
                onSave={handleSaveTemplate}
                isCloning={isCloningTpl}
                baseTemplateName={activeTemplate?.name}
            />

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <Settings size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
                    <p className="text-gray-500">Gerencie categorias, plano de contas, dados da empresa e menu.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => { setActiveTab('COMPANY'); setSearchTerm(''); }}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'COMPANY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2"><Building2 size={16} /> Empresa</div>
                </button>
                <button
                    onClick={() => { setActiveTab('CATEGORIES'); setSearchTerm(''); }}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'CATEGORIES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2"><Tags size={16} /> Categorias</div>
                </button>
                <button
                    onClick={() => { setActiveTab('ACCOUNT_PLAN'); setSearchTerm(''); }}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ACCOUNT_PLAN' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2"><BookOpen size={16} /> Plano de Contas</div>
                </button>
                <button
                    onClick={() => { setActiveTab('DRE_CONFIG'); setSearchTerm(''); }}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'DRE_CONFIG' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2"><FileText size={16} /> Configuração DRE</div>
                </button>
                <button
                    onClick={() => { setActiveTab('MENU'); setSearchTerm(''); }}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'MENU' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2"><Menu size={16} /> Menu</div>
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] pt-4">
                {activeTab === 'COMPANY' && renderCompanyTab()}
                {activeTab === 'CATEGORIES' && renderCategoriesTab()}
                {activeTab === 'ACCOUNT_PLAN' && renderAccountPlanTab()}
                {activeTab === 'DRE_CONFIG' && renderDREConfigTab()}
                {activeTab === 'MENU' && renderMenuEditorTab()}
            </div>
        </div>
    );
};

export default SettingsView;
