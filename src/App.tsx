/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Plus, ShoppingCart, RotateCcw, Share2, Download, 
  Printer, Moon, Sun, Edit2, CheckSquare, Square, X, 
  Check, TrendingUp, TrendingDown, Minus, History, 
  HelpCircle, BookOpen, Zap, Save, Copy, MoreVertical,
  ChevronDown, ChevronUp, Filter, Search, Package,
  ClipboardCheck, FileJson, Smartphone, MessageSquare, BarChart3,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Constants & Types ---

const CATEGORIES = [
  'All', 'Vegetables', 'Fruits', 'Dairy', 'Spices', 
  'Rice & Pulses', 'Oils', 'Meat & Fish', 'Beverages', 
  'Snacks', 'Others'
];

type Unit = 'kg' | 'lbs' | 'g' | 'pcs';

interface MasterItem {
  name: string;
  category: string;
  pricePerKg: number;
}

interface ShoppingItem extends MasterItem {
  weight: number;
}

interface PriceEntry {
  price: number;
  date: string;
  timestamp: number;
}

interface Template {
  id: number;
  name: string;
  items: Record<string, ShoppingItem>;
  checked: Record<string, boolean>;
  createdAt: string;
  itemCount: number;
}

// --- Utilities ---

const formatWeight = (w: number, unit: Unit = 'kg') => {
  const n = Math.round(w * 10) / 10;
  if (isNaN(n) || n < 0) return `0 ${unit}`;
  
  if (unit === 'pcs') {
    const count = Math.round(n);
    return count === 1 ? '1 piece' : `${count} pieces`;
  }
  
  if (unit === 'kg') {
    const whole = Math.floor(n);
    const frac = Math.round((n - whole) * 10);
    if (frac === 0) return `${whole} kg`;
    if (frac === 5) return `${whole === 0 ? '' : whole + ' '}½ kg`;
    return `${n} kg`;
  }

  return `${n} ${unit}`;
};

// --- Components ---

export default function App() {
  // --- State ---
  const [groceryItems, setGroceryItems] = useState<MasterItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, ShoppingItem>>({});
  const [trashedItems, setTrashedItems] = useState<MasterItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('Others');
  const [newPrice, setNewPrice] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('added');
  const [unit, setUnit] = useState<Unit>('kg');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceEntry[]>>({});
  const [spendingHistory, setSpendingHistory] = useState<Record<string, number>>({});
  
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<string | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showLoadTemplatesModal, setShowLoadTemplatesModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);

  const [sortByMaster, setSortByMaster] = useState('added');
  
  // UI State
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpTab, setHelpTab] = useState<'overview' | 'basics' | 'bulk' | 'templates' | 'price' | 'tips'>('overview');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [boughtCollapsed, setBoughtCollapsed] = useState(true);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- PWA Install Logic ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- Persistence ---
  useEffect(() => {
    const raw = localStorage.getItem('vibeGroceryData');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.groceryItems) setGroceryItems(d.groceryItems);
        if (d.selectedItems) setSelectedItems(d.selectedItems);
        if (d.trashedItems) setTrashedItems(d.trashedItems);
        if (d.checkedItems) setCheckedItems(d.checkedItems);
        if (d.darkMode !== undefined) setDarkMode(d.darkMode);
        if (d.unit) setUnit(d.unit);
        if (d.templates) setTemplates(d.templates);
        if (d.priceHistory) setPriceHistory(d.priceHistory);
        if (d.spendingHistory) setSpendingHistory(d.spendingHistory);
      } catch (e) { console.error("Failed to load data", e); }
    } else {
      // First time user
      setTimeout(() => setShowHelpModal(true), 2000);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vibeGroceryData', JSON.stringify({
      groceryItems, selectedItems, trashedItems, checkedItems, darkMode, unit, templates, priceHistory, spendingHistory
    }));
  }, [groceryItems, selectedItems, trashedItems, checkedItems, darkMode, unit, templates, priceHistory, spendingHistory]);

  // --- Logic ---

  const addToUndo = (action: any) => {
    setUndoStack(prev => [...prev.slice(-4), action]);
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5000);
  };

  const performUndo = () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    if (action.type === 'deleteFromShopping') {
      setSelectedItems(prev => ({ ...prev, [action.name]: action.item }));
    } else if (action.type === 'toggleCheck') {
      setCheckedItems(prev => ({ ...prev, [action.name]: !prev[action.name] }));
    } else if (action.type === 'clearCompleted') {
      setSelectedItems(prev => ({ ...prev, ...action.items }));
      setCheckedItems(prev => ({ ...prev, ...action.checked }));
    } else if (action.type === 'moveToTrash') {
      setGroceryItems(prev => [...prev, action.item]);
      setTrashedItems(prev => prev.filter(i => i.name !== action.name));
    }

    setShowUndo(false);
  };

  const addPriceToHistory = (name: string, price: number) => {
    const today = new Date().toISOString().split('T')[0];
    const entry: PriceEntry = { price, date: today, timestamp: Date.now() };
    setPriceHistory(prev => {
      const history = prev[name] || [];
      // Only add if price changed
      if (history.length > 0 && history[history.length - 1].price === price) return prev;
      return {
        ...prev,
        [name]: [...history.slice(-9), entry]
      };
    });
  };

  const addNewItem = () => {
    const name = newItem.trim();
    if (!name) return;
    if (groceryItems.some(i => i.name === name)) return;
    
    const price = Number(newPrice) || 0;
    setGroceryItems(prev => [...prev, { 
      name, 
      category: newCategory, 
      pricePerKg: price 
    }]);
    addPriceToHistory(name, price);
    setNewItem('');
    setNewPrice('');
  };

  const confirmEditName = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingName(null);
      return;
    }
    if (groceryItems.some(i => i.name === trimmed)) {
      setEditingName(null);
      return;
    }

    setGroceryItems(prev => prev.map(i => i.name === oldName ? { ...i, name: trimmed } : i));
    setSelectedItems(prev => {
      if (!prev[oldName]) return prev;
      const u = { ...prev };
      u[trimmed] = { ...u[oldName], name: trimmed };
      delete u[oldName];
      return u;
    });
    setCheckedItems(prev => {
      if (prev[oldName] === undefined) return prev;
      const u = { ...prev };
      u[trimmed] = u[oldName];
      delete u[oldName];
      return u;
    });
    setPriceHistory(prev => {
      if (!prev[oldName]) return prev;
      const u = { ...prev };
      u[trimmed] = u[oldName];
      delete u[oldName];
      return u;
    });
    setEditingName(null);
  };

  const confirmEditPrice = (name: string, price: number) => {
    setGroceryItems(prev => prev.map(i => i.name === name ? { ...i, pricePerKg: price } : i));
    setSelectedItems(prev => {
      if (!prev[name]) return prev;
      return { ...prev, [name]: { ...prev[name], pricePerKg: price } };
    });
    addPriceToHistory(name, price);
    setEditingPrice(null);
  };

  const confirmEditCategory = (name: string, category: string) => {
    setGroceryItems(prev => prev.map(i => i.name === name ? { ...i, category } : i));
    setSelectedItems(prev => {
      if (!prev[name]) return prev;
      return { ...prev, [name]: { ...prev[name], category } };
    });
    setEditingCategory(null);
  };

  const getPriceChange = (name: string) => {
    const history = priceHistory[name] || [];
    if (history.length < 2) return null;
    const latest = history[history.length - 1].price;
    const previous = history[history.length - 2].price;
    const diff = latest - previous;
    const percent = ((diff / previous) * 100).toFixed(1);
    return { diff, percent, latest, previous };
  };

  const addToShoppingList = (name: string) => {
    if (selectedItems[name]) {
      setActiveItem(name);
      setInputValue(String(selectedItems[name].weight || 0));
      return;
    }
    const master = groceryItems.find(i => i.name === name);
    const item = { 
      name,
      weight: 0, 
      category: master?.category || 'Others', 
      pricePerKg: master?.pricePerKg || 0 
    };
    setSelectedItems(prev => ({ ...prev, [name]: item }));
    setActiveItem(name);
    setInputValue('0');
  };

  const toggleCheck = (name: string) => {
    setCheckedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const deleteFromShopping = (name: string) => {
    const item = selectedItems[name];
    addToUndo({ type: 'deleteFromShopping', name, item });
    setSelectedItems(prev => { const u = {...prev}; delete u[name]; return u; });
    setCheckedItems(prev => { const u = {...prev}; delete u[name]; return u; });
  };

  const moveToTrash = (name: string) => {
    const item = groceryItems.find(i => i.name === name);
    if (!item) return;
    addToUndo({ type: 'moveToTrash', name, item });
    setGroceryItems(prev => prev.filter(i => i.name !== name));
    setTrashedItems(prev => [...prev, item]);
    // Also remove from shopping list if present
    setSelectedItems(prev => {
      const u = { ...prev };
      delete u[name];
      return u;
    });
    setCheckedItems(prev => {
      const u = { ...prev };
      delete u[name];
      return u;
    });
  };

  const restoreFromTrash = (name: string) => {
    const item = trashedItems.find(i => i.name === name);
    if (!item) return;
    setTrashedItems(prev => prev.filter(i => i.name !== name));
    setGroceryItems(prev => [...prev, item]);
  };

  const permanentlyDelete = (name: string) => {
    setTrashedItems(prev => prev.filter(i => i.name !== name));
  };

  const emptyTrash = () => {
    if (window.confirm('Permanently delete all items in trash?')) {
      setTrashedItems([]);
    }
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const newTemplate: Template = {
      id: Date.now(),
      name,
      items: { ...selectedItems },
      checked: { ...checkedItems },
      createdAt: new Date().toLocaleDateString(),
      itemCount: Object.keys(selectedItems).length
    };
    setTemplates(prev => [...prev, newTemplate]);
    setTemplateName('');
    setShowTemplatesModal(false);
  };

  const loadTemplate = (template: Template, mode: 'replace' | 'add') => {
    if (mode === 'replace') {
      setSelectedItems(template.items);
      setCheckedItems(template.checked);
    } else {
      setSelectedItems(prev => ({ ...prev, ...template.items }));
      setCheckedItems(prev => ({ ...prev, ...template.checked }));
    }
    setShowLoadTemplatesModal(false);
  };

  const deleteTemplate = (id: number) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const exportBackup = () => {
    const data = {
      groceryItems, selectedItems, trashedItems, checkedItems, darkMode, unit, templates, priceHistory, spendingHistory,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcart-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const shareList = (method: 'whatsapp' | 'sms' | 'copy' | 'print' | 'native' | 'txt') => {
    const names = Object.keys(selectedItems);
    if (names.length === 0) return;

    let text = `🛒 *My Shopping List*\n\n`;
    names.forEach(name => {
      const item = selectedItems[name];
      const isChecked = checkedItems[name] ? '✓' : '☐';
      text += `${isChecked} ${name} - ${formatWeight(item.weight, unit)} (₹${item.pricePerKg}/${unit === 'pcs' ? 'pc' : 'kg'} = ₹${(item.weight * item.pricePerKg).toFixed(2)})\n`;
    });
    text += `\n*Total Cost: ₹${stats.cost.toFixed(2)}*`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else if (method === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(text)}`);
    } else if (method === 'copy') {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } else if (method === 'print') {
      window.print();
    } else if (method === 'native') {
      if (navigator.share) {
        navigator.share({ title: 'My Shopping List', text });
      } else {
        shareList('copy');
      }
    } else if (method === 'txt') {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
    }
  };

  const convertWeight = (w: number, from: Unit, to: Unit) => {
    if (from === to) return w;
    // Internal storage is always kg (or count for pcs)
    // 1 kg = 2.20462 lbs
    // 1 kg = 1000 g
    let inKg = w;
    if (from === 'lbs') inKg = w / 2.20462;
    if (from === 'g') inKg = w / 1000;

    if (to === 'kg') return inKg;
    if (to === 'lbs') return inKg * 2.20462;
    if (to === 'g') return inKg * 1000;
    return w; // pcs
  };

  const handleUnitChange = (newUnit: Unit) => {
    const newSelected = { ...selectedItems };
    Object.keys(newSelected).forEach(name => {
      if (unit !== 'pcs' && newUnit !== 'pcs') {
        newSelected[name].weight = convertWeight(newSelected[name].weight, unit, newUnit);
      }
    });
    setSelectedItems(newSelected);
    setUnit(newUnit);
  };

  const handleSmartPaste = () => {
    if (!importText.trim()) return;

    const lines = importText.split(/[\n,;]+/).filter(l => l.trim());
    let addedCount = 0;

    const newSelected = { ...selectedItems };
    
    lines.forEach(line => {
      // Try to extract weight and name
      // Matches patterns like "2kg tomatoes" or "tomatoes 2kg" or "milk 1"
      const weightMatch = line.match(/(\d+(?:\.\d+)?)\s*(kg|lbs|g|pcs|pieces|grams|pounds)?/i);
      const weight = weightMatch ? parseFloat(weightMatch[1]) : 1;
      const unitFound = weightMatch?.[2]?.toLowerCase() || 'kg';
      
      // Remove the weight part to get the name
      let name = line.replace(/(\d+(?:\.\d+)?)\s*(kg|lbs|g|pcs|pieces|grams|pounds)?/i, '').trim();
      // Clean up common prefixes like "- " or "* " or "• "
      name = name.replace(/^[-*•✓⭕]\s*/, '').trim();

      if (name) {
        // Find in master or create new
        const master = groceryItems.find(i => i.name.toLowerCase() === name.toLowerCase());
        const finalName = master ? master.name : name;
        
        if (!newSelected[finalName]) {
          newSelected[finalName] = {
            name: finalName,
            weight: weight,
            category: master ? master.category : 'Others',
            pricePerKg: master ? master.pricePerKg : 0
          };
          addedCount++;
        }
      }
    });

    setSelectedItems(newSelected);
    setImportText('');
    setShowImportModal(false);
    if (addedCount > 0) {
      addToUndo({ type: 'smartPaste', count: addedCount });
    }
  };

  const clearCompleted = () => {
    const names = Object.keys(selectedItems);
    const boughtNames = names.filter(n => checkedItems[n]);
    if (boughtNames.length === 0) return;

    const boughtCost = boughtNames.reduce((s, n) => s + (selectedItems[n].weight * selectedItems[n].pricePerKg), 0);
    
    // Update spending history
    const today = new Date().toISOString().split('T')[0];
    setSpendingHistory(prev => ({
      ...prev,
      [today]: (prev[today] || 0) + boughtCost
    }));

    const newSelected = { ...selectedItems };
    const newChecked = { ...checkedItems };
    boughtNames.forEach(n => {
      delete newSelected[n];
      delete newChecked[n];
    });

    setSelectedItems(newSelected);
    setCheckedItems(newChecked);
    addToUndo({ type: 'clearCompleted', count: boughtNames.length, cost: boughtCost });
  };

  const bulkCheck = () => {
    const newChecked = { ...checkedItems };
    selectedForBulk.forEach(name => {
      newChecked[name] = true;
    });
    setCheckedItems(newChecked);
    setSelectedForBulk(new Set());
    setBulkMode(false);
  };

  const bulkUncheck = () => {
    const newChecked = { ...checkedItems };
    selectedForBulk.forEach(name => {
      newChecked[name] = false;
    });
    setCheckedItems(newChecked);
    setSelectedForBulk(new Set());
    setBulkMode(false);
  };

  const bulkDelete = () => {
    if (window.confirm(`Delete ${selectedForBulk.size} items from cart?`)) {
      const newSelected = { ...selectedItems };
      const newChecked = { ...checkedItems };
      selectedForBulk.forEach(name => {
        delete newSelected[name];
        delete newChecked[name];
      });
      setSelectedItems(newSelected);
      setCheckedItems(newChecked);
      setSelectedForBulk(new Set());
      setBulkMode(false);
    }
  };

  const selectAllBulk = () => {
    setSelectedForBulk(new Set(Object.keys(selectedItems)));
  };

  // --- Calculations ---
  const stats = useMemo(() => {
    const names = Object.keys(selectedItems);
    const totalWeight = names.reduce((s, n) => s + (selectedItems[n].weight || 0), 0);
    const totalCost = names.reduce((s, n) => s + (selectedItems[n].weight * selectedItems[n].pricePerKg), 0);
    const boughtCost = names.filter(n => checkedItems[n]).reduce((s, n) => s + (selectedItems[n].weight * selectedItems[n].pricePerKg), 0);
    return {
      count: names.length,
      checked: names.filter(n => checkedItems[n]).length,
      weight: totalWeight,
      cost: totalCost,
      boughtCost
    };
  }, [selectedItems, checkedItems]);

  const filteredMaster = useMemo(() => {
    return groceryItems
      .filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterCategory === 'All' || i.category === filterCategory)
      )
      .sort((a, b) => {
        if (sortByMaster === 'name') return a.name.localeCompare(b.name);
        if (sortByMaster === 'category') return a.category.localeCompare(b.category);
        if (sortByMaster === 'price') return b.pricePerKg - a.pricePerKg;
        return 0; // 'added' is default order in array
      });
  }, [groceryItems, searchTerm, filterCategory, sortByMaster]);

  const sortedShopping = useMemo(() => {
    return Object.keys(selectedItems).sort((a, b) => {
      if (sortBy === 'checked') {
        if (checkedItems[a] && !checkedItems[b]) return 1;
        if (!checkedItems[a] && checkedItems[b]) return -1;
      }
      if (sortBy === 'name') return a.localeCompare(b);
      if (sortBy === 'category') return selectedItems[a].category.localeCompare(selectedItems[b].category);
      if (sortBy === 'price') return (selectedItems[b].weight * selectedItems[b].pricePerKg) - (selectedItems[a].weight * selectedItems[a].pricePerKg);
      return 0;
    });
  }, [selectedItems, sortBy, checkedItems]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      data.push({
        date: dateStr,
        label,
        amount: spendingHistory[dateStr] || 0
      });
    }
    return data;
  }, [spendingHistory]);

  // --- Render Helpers ---

  const theme = {
    bg: darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f8fafc]',
    card: darkMode ? 'bg-[#141414] border-[#262626]' : 'bg-white border-[#e2e8f0]',
    text: darkMode ? 'text-white' : 'text-[#0f172a]',
    muted: darkMode ? 'text-gray-400' : 'text-gray-500',
    accent: 'text-emerald-500',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 shadow-sm hover:shadow-md active:scale-95'
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-emerald-500/30`}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-opacity-80 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <ShoppingCart className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SmartCart</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">Smart Shopping Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-xs font-medium opacity-50 uppercase tracking-wider">Total Budget</span>
            <span className="text-lg font-bold text-emerald-500">₹{stats.cost.toFixed(2)}</span>
          </div>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-xl border ${theme.card} hover:scale-105 transition-transform`}
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
          
          <button 
            onClick={() => setShowTrash(true)}
            className={`p-2.5 rounded-xl border ${theme.card} hover:scale-105 transition-transform`}
          >
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
          
          <button 
            onClick={() => setShowBackupModal(true)}
            className={`p-2.5 rounded-xl border ${theme.card} hover:scale-105 transition-transform`}
          >
            <Save className="w-5 h-5 text-blue-500" />
          </button>

          <button 
            onClick={() => shareList('copy')}
            className={`p-2.5 rounded-xl border ${theme.card} hover:scale-105 transition-transform`}
          >
            <Share2 className="w-5 h-5 text-emerald-500" />
          </button>

          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {deferredPrompt && (
            <button 
              onClick={handleInstall}
              className="hidden md:flex items-center gap-2 p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 animate-pulse"
              title="Install SmartCart on your device"
            >
              <Download className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Install App</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Master List & Controls */}
        <div className="lg:col-span-5 space-y-6">
          <section className={`p-6 rounded-3xl border ${theme.card} shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-500" /> Catalog
              </h2>
              <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg">
                {groceryItems.length} Items
              </span>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input 
                  type="text" 
                  placeholder="Search catalog..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border ${theme.card} focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      filterCategory === cat 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                        : `${theme.card} border opacity-70 hover:opacity-100`
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <select 
                    value={sortByMaster}
                    onChange={(e) => setSortByMaster(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border ${theme.card} text-[10px] font-black uppercase tracking-widest outline-none`}
                  >
                    <option value="added">Sort: Added</option>
                    <option value="name">Sort: Name</option>
                    <option value="category">Sort: Category</option>
                    <option value="price">Sort: Price</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {filteredMaster.map(item => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={item.name}
                      className={`group p-3 rounded-2xl border ${theme.card} hover:border-emerald-500/50 transition-all flex items-center justify-between`}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        {editingName === item.name ? (
                          <input 
                            autoFocus
                            className="bg-transparent border-b border-emerald-500 outline-none font-bold text-sm w-full"
                            defaultValue={item.name}
                            onBlur={(e) => confirmEditName(item.name, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmEditName(item.name, (e.target as HTMLInputElement).value)}
                          />
                        ) : (
                          <div className="flex items-center gap-2 group/name">
                            <span className="font-bold text-sm truncate">{item.name}</span>
                            <button onClick={() => setEditingName(item.name)} className="opacity-0 group-hover/name:opacity-100 transition-opacity">
                              <Edit2 className="w-3 h-3 opacity-40" />
                            </button>
                          </div>
                        )}
                        
                        {editingCategory === item.name ? (
                          <select 
                            autoFocus
                            className="bg-transparent text-[10px] uppercase tracking-wider font-bold outline-none"
                            value={item.category}
                            onChange={(e) => confirmEditCategory(item.name, e.target.value)}
                            onBlur={() => setEditingCategory(null)}
                          >
                            {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <button 
                            onClick={() => setEditingCategory(item.name)}
                            className="text-[10px] uppercase tracking-wider opacity-40 font-bold text-left hover:opacity-100"
                          >
                            {item.category}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {editingPrice === item.name ? (
                            <input 
                              autoFocus
                              type="number"
                              className="w-16 bg-transparent border-b border-emerald-500 outline-none text-xs font-bold text-right"
                              defaultValue={item.pricePerKg}
                              onBlur={(e) => confirmEditPrice(item.name, Number(e.target.value))}
                              onKeyDown={(e) => e.key === 'Enter' && confirmEditPrice(item.name, Number((e.target as HTMLInputElement).value))}
                            />
                          ) : (
                            <div className="flex flex-col items-end group/price">
                              <button 
                                onClick={() => setEditingPrice(item.name)}
                                className="text-xs font-bold opacity-60 hover:opacity-100"
                              >
                                ₹{item.pricePerKg}/kg
                              </button>
                              {(() => {
                                const change = getPriceChange(item.name);
                                if (!change) return null;
                                return (
                                  <button 
                                    onClick={() => {
                                      setSelectedItemForHistory(item.name);
                                      setShowPriceHistoryModal(true);
                                    }}
                                    className={`text-[9px] font-black flex items-center gap-0.5 ${change.diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}
                                  >
                                    {change.diff > 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                                    {change.percent}%
                                  </button>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => addToShoppingList(item.name)}
                            className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => moveToTrash(item.name)}
                            className="w-8 h-8 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredMaster.length === 0 && (
                  <div className="py-12 text-center opacity-30">
                    <Search className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm font-medium">No items found</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={`p-6 rounded-3xl border ${theme.card} shadow-sm`}>
            <h3 className="text-sm font-bold uppercase tracking-widest opacity-40 mb-4">Add New Item</h3>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Item name..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl border ${theme.card} outline-none focus:ring-2 focus:ring-emerald-500/20`}
              />
              <div className="flex gap-2">
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`flex-1 px-4 py-3 rounded-2xl border ${theme.card} outline-none`}
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input 
                  type="number" 
                  placeholder="₹/kg"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className={`w-24 px-4 py-3 rounded-2xl border ${theme.card} outline-none text-center`}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={addNewItem}
                  className={`flex-1 py-4 rounded-2xl font-bold ${theme.button}`}
                >
                  Create Item
                </button>
                <button 
                  onClick={() => setShowImportModal(true)}
                  className={`flex-1 py-4 rounded-2xl font-bold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-all`}
                >
                  Bulk Add
                </button>
              </div>
            </div>
          </section>

          {/* Spending Chart Section */}
          <section className={`p-6 rounded-3xl border ${theme.card} shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" /> Spending Trends
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Last 7 Days</span>
            </div>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, opacity: 0.5 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className={`p-2 rounded-lg border ${theme.card} shadow-xl text-[10px] font-bold`}>
                            ₹{payload[0].value}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.amount > 0 ? '#10b981' : (darkMode ? '#262626' : '#f1f5f9')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Right Column: Shopping List */}
        <div className="lg:col-span-7 space-y-6">
          <section className={`p-6 rounded-3xl border ${theme.card} shadow-xl relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <ShoppingCart className="w-64 h-64 rotate-12" />
            </div>

            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Shopping List</h2>
                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">
                  {stats.checked} of {stats.count} items bought
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select 
                  value={unit}
                  onChange={(e) => handleUnitChange(e.target.value as Unit)}
                  className={`px-3 py-2 rounded-xl border ${theme.card} text-xs font-bold outline-none`}
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                  <option value="g">g</option>
                  <option value="pcs">pcs</option>
                </select>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-3 py-2 rounded-xl border ${theme.card} text-xs font-bold outline-none`}
                >
                  <option value="added">Recent</option>
                  <option value="name">A-Z</option>
                  <option value="category">Category</option>
                  <option value="price">Price</option>
                  <option value="checked">Checked</option>
                </select>
                <button 
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    bulkMode ? 'bg-orange-500 text-white' : `${theme.card} border opacity-70`
                  }`}
                >
                  {bulkMode ? 'Exit Bulk' : 'Bulk Edit'}
                </button>
                {stats.checked > 0 && (
                  <button 
                    onClick={clearCompleted}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  >
                    Complete Trip
                  </button>
                )}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`p-4 rounded-2xl border ${theme.card} bg-emerald-500/5`}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Total Items</span>
                <span className="text-xl font-black">{stats.count}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${theme.card} bg-blue-500/5`}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Weight</span>
                <span className="text-xl font-black">{formatWeight(stats.weight, unit)}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${theme.card} bg-amber-500/5`}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Est. Cost</span>
                <span className="text-xl font-black">₹{stats.cost.toFixed(0)}</span>
              </div>
            </div>

            {bulkMode && (
              <div className="flex items-center gap-2 mb-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <button 
                  onClick={selectAllBulk}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest"
                >
                  Select All
                </button>
                <button 
                  onClick={() => setSelectedForBulk(new Set())}
                  className="px-3 py-1.5 rounded-lg bg-gray-500/20 text-gray-500 text-[10px] font-black uppercase tracking-widest"
                >
                  Deselect
                </button>
                <div className="flex-1" />
                <button 
                  onClick={bulkCheck}
                  className="p-2 rounded-lg bg-emerald-600 text-white"
                  title="Mark as bought"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={bulkUncheck}
                  className="p-2 rounded-lg bg-amber-500 text-white"
                  title="Mark as unbought"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={bulkDelete}
                  className="p-2 rounded-lg bg-red-600 text-white"
                  title="Remove from cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* List Items */}
            <div className="space-y-3 min-h-[400px]">
              <AnimatePresence mode="popLayout">
                {sortedShopping.filter(n => !checkedItems[n] || !boughtCollapsed).map(name => {
                  const item = selectedItems[name];
                  const isChecked = !!checkedItems[name];
                  const isActive = activeItem === name;
                  const isBulkSelected = selectedForBulk.has(name);

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={name}
                      className={`group p-4 rounded-2xl border-2 transition-all ${
                        isBulkSelected ? 'border-orange-500 bg-orange-500/5' :
                        isChecked 
                          ? 'opacity-40 grayscale border-transparent bg-gray-500/5' 
                          : isActive 
                            ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/5' 
                            : `${theme.card} hover:border-emerald-500/30`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {bulkMode ? (
                            <button 
                              onClick={() => {
                                const next = new Set(selectedForBulk);
                                if (next.has(name)) next.delete(name);
                                else next.add(name);
                                setSelectedForBulk(next);
                              }}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isBulkSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-orange-500/30'
                              }`}
                            >
                              {isBulkSelected && <Check className="w-4 h-4" />}
                            </button>
                          ) : (
                            <button 
                              onClick={() => toggleCheck(name)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-emerald-500/30'
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4" />}
                            </button>
                          )}
                          <div className="min-w-0">
                            <h4 className={`font-bold text-sm md:text-base truncate ${isChecked ? 'line-through' : ''}`}>{name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.category}</span>
                              <span className="w-1 h-1 rounded-full bg-emerald-500/30" />
                              <span className="text-[10px] font-black opacity-40">₹{item.pricePerKg}/kg</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {isActive ? (
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number"
                                    autoFocus
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setSelectedItems(prev => ({
                                          ...prev,
                                          [name]: { ...prev[name], weight: Number(inputValue) || 0 }
                                        }));
                                        setActiveItem(null);
                                      }
                                    }}
                                    className="w-16 px-2 py-1 rounded-lg border border-emerald-500 bg-white text-black text-sm font-bold text-center outline-none"
                                  />
                                  <span className="text-xs font-bold opacity-40">{unit}</span>
                                </div>
                                <div className="flex gap-1">
                                  {(unit === 'kg' ? [0.25, 0.5, 1, 2, 5] : 
                                    unit === 'lbs' ? [0.5, 1, 2, 5, 10] :
                                    unit === 'g' ? [100, 250, 500, 1000] :
                                    [1, 2, 6, 12]).map(v => (
                                    <button 
                                      key={v}
                                      onClick={() => {
                                        setInputValue(String(v));
                                        setSelectedItems(prev => ({
                                          ...prev,
                                          [name]: { ...prev[name], weight: v }
                                        }));
                                        setActiveItem(null);
                                      }}
                                      className="px-2 py-1 rounded-md bg-emerald-600/10 text-emerald-600 text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition-all"
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setActiveItem(name);
                                  setInputValue(String(item.weight));
                                }}
                                className="text-right"
                              >
                                <p className="text-sm font-black text-emerald-500">{formatWeight(item.weight, unit)}</p>
                                <p className="text-[10px] font-bold opacity-40">₹{(item.weight * item.pricePerKg).toFixed(2)}</p>
                              </button>
                            )}
                          </div>
                          <button 
                            onClick={() => deleteFromShopping(name)}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {stats.checked > 0 && boughtCollapsed && (
                <button 
                  onClick={() => setBoughtCollapsed(false)}
                  className="w-full py-3 rounded-2xl bg-emerald-600/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600/20 transition-all"
                >
                  <ChevronDown className="w-3 h-3" />
                  Show {stats.checked} bought items
                </button>
              )}

              {!boughtCollapsed && stats.checked > 0 && (
                <button 
                  onClick={() => setBoughtCollapsed(true)}
                  className="w-full py-3 rounded-2xl bg-emerald-600/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600/20 transition-all"
                >
                  <ChevronUp className="w-3 h-3" />
                  Hide bought items
                </button>
              )}

              {stats.count === 0 && (
                <div className="py-24 text-center opacity-20">
                  <ShoppingCart className="w-24 h-24 mx-auto mb-4" />
                  <p className="text-xl font-black uppercase tracking-widest">List is Empty</p>
                </div>
              )}
            </div>
          </section>

          {/* Actions Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button 
              onClick={() => shareList('whatsapp')}
              className={`p-4 rounded-3xl border ${theme.card} flex flex-col items-center gap-2 hover:border-emerald-500/50 transition-all`}
            >
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
            </button>
            <button 
              onClick={() => setShowTemplatesModal(true)}
              className={`p-4 rounded-3xl border ${theme.card} flex flex-col items-center gap-2 hover:border-emerald-500/50 transition-all`}
            >
              <Save className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Save Template</span>
            </button>
            <button 
              onClick={() => setShowLoadTemplatesModal(true)}
              className={`p-4 rounded-3xl border ${theme.card} flex flex-col items-center gap-2 hover:border-emerald-500/50 transition-all`}
            >
              <RotateCcw className="w-5 h-5 text-purple-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Load Template</span>
            </button>
            <button 
              onClick={() => shareList('print')}
              className={`p-4 rounded-3xl border ${theme.card} flex flex-col items-center gap-2 hover:border-emerald-500/50 transition-all`}
            >
              <Printer className="w-5 h-5 text-gray-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Print List</span>
            </button>
          </div>
        </div>
      </main>

      {/* Undo Toast */}
      <AnimatePresence>
        {showUndo && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-[#1a1a1a] text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-6">
              <span className="text-sm font-bold">Action completed</span>
              <button 
                onClick={performUndo}
                className="text-emerald-400 font-black text-xs uppercase tracking-widest hover:text-emerald-300"
              >
                Undo
              </button>
              <button onClick={() => setShowUndo(false)}><X className="w-4 h-4 opacity-40" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals (Simplified for brevity, but functional) */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] border ${theme.card} shadow-2xl`}
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-emerald-600/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">SmartCart Guide</h2>
                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Master your shopping</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <X className="w-6 h-6 opacity-40" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5 p-2 gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview', icon: BookOpen },
                  { id: 'basics', label: 'Basics', icon: Package },
                  { id: 'bulk', label: 'Bulk Ops', icon: Zap },
                  { id: 'templates', label: 'Templates', icon: Save },
                  { id: 'price', label: 'Price History', icon: History },
                  { id: 'tips', label: 'Tips & Tricks', icon: Smartphone }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setHelpTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      helpTab === tab.id 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                        : 'opacity-40 hover:opacity-100 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {helpTab === 'overview' && (
                    <motion.div 
                      key="overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-xl font-black tracking-tight">Welcome to SmartCart!</h3>
                      <p className="text-sm opacity-60 leading-relaxed">SmartCart is your privacy-first, local-only grocery shopping assistant. No accounts, no tracking, just smart shopping.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { title: 'Local Storage', desc: 'Data stays on your device', icon: ShieldCheck },
                          { title: 'Offline Ready', desc: 'Works without internet', icon: Smartphone },
                          { title: 'Price Tracking', desc: 'Catch inflation early', icon: TrendingUp },
                          { title: 'Smart Paste', desc: 'Add from WhatsApp/SMS', icon: ClipboardCheck }
                        ].map((f, i) => (
                          <div key={i} className={`p-4 rounded-2xl border ${theme.card} flex gap-4 items-center`}>
                            <f.icon className="w-6 h-6 text-emerald-500" />
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest">{f.title}</h4>
                              <p className="text-[10px] opacity-50">{f.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {helpTab === 'basics' && (
                    <motion.div 
                      key="basics"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-3xl border ${theme.card} bg-emerald-500/5`}>
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                            <Plus className="w-5 h-5 text-emerald-500" />
                          </div>
                          <h3 className="font-black text-sm uppercase tracking-widest mb-2">Adding Items</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Browse the <b>Catalog</b> on the left. Tap the plus icon to add any item to your active shopping list.</p>
                        </div>
                        <div className={`p-6 rounded-3xl border ${theme.card} bg-blue-500/5`}>
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                            <Edit2 className="w-5 h-5 text-blue-500" />
                          </div>
                          <h3 className="font-black text-sm uppercase tracking-widest mb-2">Adjust Weights</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Tap on the weight value (e.g., 1kg) in your list to quickly change the quantity. Costs update instantly!</p>
                        </div>
                        <div className={`p-6 rounded-3xl border ${theme.card} bg-purple-500/5`}>
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                            <CheckSquare className="w-5 h-5 text-purple-500" />
                          </div>
                          <h3 className="font-black text-sm uppercase tracking-widest mb-2">Check Off</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Tap the checkbox to mark items as bought. They'll auto-collapse to keep your list clean.</p>
                        </div>
                        <div className={`p-6 rounded-3xl border ${theme.card} bg-orange-500/5`}>
                          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                            <ShoppingCart className="w-5 h-5 text-orange-500" />
                          </div>
                          <h3 className="font-black text-sm uppercase tracking-widest mb-2">Complete Trip</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Finished shopping? Tap <b>Complete Trip</b> to save your spending to the history and clear your list.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {helpTab === 'bulk' && (
                    <motion.div 
                      key="bulk"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className={`p-8 rounded-[2rem] border ${theme.card} bg-orange-500/5 flex gap-6 items-start`}>
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                          <Zap className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight mb-2">Bulk Select</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Enable <b>Bulk Edit</b> in the shopping list. Select multiple items to check off or delete them all at once. Save time!</p>
                        </div>
                      </div>
                      <div className={`p-8 rounded-[2rem] border ${theme.card} bg-emerald-500/5 flex gap-6 items-start`}>
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                          <ClipboardCheck className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight mb-2">Smart Paste</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Copy a list from WhatsApp and use <b>Smart Paste</b>. We'll extract items and weights automatically.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {helpTab === 'templates' && (
                    <motion.div 
                      key="templates"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className={`p-8 rounded-[2rem] border ${theme.card} bg-blue-500/5 flex gap-6 items-start`}>
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                          <Save className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight mb-2">List Templates</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Save your common lists (like "Weekly Groceries") as templates. Load them in one click next time!</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {helpTab === 'price' && (
                    <motion.div 
                      key="price"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className={`p-8 rounded-[2rem] border ${theme.card} bg-red-500/5 flex gap-6 items-start`}>
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-red-500/20 flex items-center justify-center">
                          <TrendingUp className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight mb-2">Price Tracking</h3>
                          <p className="text-sm opacity-60 leading-relaxed">We track the last 10 price changes for every item. See inflation trends (↑/↓) and view full history by tapping the arrow.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {helpTab === 'tips' && (
                    <motion.div 
                      key="tips"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className={`p-8 rounded-[2rem] border ${theme.card} bg-emerald-500/5 flex gap-6 items-start`}>
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                          <Smartphone className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight mb-2">PWA Installation</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Install SmartCart on your phone for a full-screen, app-like experience. Works offline!</p>
                        </div>
                      </div>
                      <div className={`p-8 rounded-[2rem] border ${theme.card} bg-blue-500/5 flex gap-6 items-start`}>
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                          <RotateCcw className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight mb-2">Undo System</h3>
                          <p className="text-sm opacity-60 leading-relaxed">Made a mistake? You have 5 seconds to undo deletions, checks, and more via the toast at the bottom.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs ${theme.button}`}
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showImportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-lg p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Smart Paste</h2>
                <button onClick={() => setShowImportModal(false)}><X className="w-6 h-6 opacity-40" /></button>
              </div>
              <p className="text-sm opacity-50 mb-6 font-medium">Paste a list from WhatsApp or SMS. We'll automatically detect items and weights.</p>
              <textarea 
                className={`w-full h-48 p-4 rounded-3xl border ${theme.card} outline-none focus:ring-2 focus:ring-emerald-500/20 mb-6 text-sm`}
                placeholder="Example: tomatoes 2kg, milk 1l, eggs 12pcs..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold bg-gray-500/10 hover:bg-gray-500/20"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSmartPaste}
                  className={`flex-1 py-4 rounded-2xl font-bold ${theme.button}`}
                >
                  Parse & Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showTrash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-lg p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl flex flex-col max-h-[80vh]`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Trash2 className="w-6 h-6 text-red-500" /> Trash Bin
                </h2>
                <button onClick={() => setShowTrash(false)}><X className="w-6 h-6 opacity-40" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {trashedItems.map(item => (
                  <div key={item.name} className={`p-4 rounded-2xl border ${theme.card} flex items-center justify-between`}>
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => restoreFromTrash(item.name)}
                        className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => permanentlyDelete(item.name)}
                        className="p-2 rounded-xl bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {trashedItems.length === 0 && (
                  <div className="py-12 text-center opacity-20">
                    <Trash2 className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm font-bold">Trash is empty</p>
                  </div>
                )}
              </div>

              {trashedItems.length > 0 && (
                <button 
                  onClick={emptyTrash}
                  className="mt-6 w-full py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20"
                >
                  Empty Trash
                </button>
              )}
            </motion.div>
          </motion.div>
        )}

        {showPriceHistoryModal && selectedItemForHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-lg p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <History className="w-6 h-6 text-emerald-500" /> Price History
                </h2>
                <button onClick={() => setShowPriceHistoryModal(false)}><X className="w-6 h-6 opacity-40" /></button>
              </div>
              
              <div className="mb-6">
                <p className="text-lg font-black">{selectedItemForHistory}</p>
                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Tracking last 10 changes</p>
              </div>

              <div className="space-y-3">
                {(priceHistory[selectedItemForHistory] || []).slice().reverse().map((entry, idx, arr) => {
                  const prev = arr[idx + 1];
                  const diff = prev ? entry.price - prev.price : 0;
                  return (
                    <div key={entry.timestamp} className={`p-4 rounded-2xl border ${theme.card} flex items-center justify-between`}>
                      <div>
                        <p className="text-xs font-bold opacity-40">{new Date(entry.timestamp).toLocaleDateString()}</p>
                        <p className="font-black text-lg">₹{entry.price}</p>
                      </div>
                      {diff !== 0 && (
                        <div className={`flex items-center gap-1 font-black text-xs ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {diff > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showTemplatesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-lg p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Save Template</h2>
                <button onClick={() => setShowTemplatesModal(false)}><X className="w-6 h-6 opacity-40" /></button>
              </div>
              <input 
                type="text" 
                placeholder="Template name (e.g. Weekly Groceries)"
                className={`w-full p-4 rounded-2xl border ${theme.card} outline-none focus:ring-2 focus:ring-emerald-500/20 mb-6`}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <button 
                onClick={saveTemplate}
                className={`w-full py-4 rounded-2xl font-bold ${theme.button}`}
              >
                Save Template
              </button>
            </motion.div>
          </motion.div>
        )}

        {showLoadTemplatesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-lg p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl flex flex-col max-h-[80vh]`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Load Template</h2>
                <button onClick={() => setShowLoadTemplatesModal(false)}><X className="w-6 h-6 opacity-40" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {templates.map(t => (
                  <div key={t.id} className={`p-4 rounded-2xl border ${theme.card}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-black text-lg">{t.name}</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{t.itemCount} items • {t.createdAt}</p>
                      </div>
                      <button 
                        onClick={() => deleteTemplate(t.id)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => loadTemplate(t, 'replace')}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        Replace List
                      </button>
                      <button 
                        onClick={() => loadTemplate(t, 'add')}
                        className="flex-1 py-2 rounded-xl bg-emerald-600/10 text-emerald-600 text-xs font-bold"
                      >
                        Add to List
                      </button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="py-12 text-center opacity-20">
                    <RotateCcw className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm font-bold">No templates saved</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showBackupModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-lg p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Backup & Restore</h2>
                <button onClick={() => setShowBackupModal(false)}><X className="w-6 h-6 opacity-40" /></button>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={exportBackup}
                  className="w-full py-6 rounded-3xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 flex flex-col items-center gap-2 transition-all"
                >
                  <Download className="w-8 h-8 text-emerald-500" />
                  <span className="font-black text-xs uppercase tracking-widest">Export Backup (.json)</span>
                </button>
                
                <label className="w-full py-6 rounded-3xl border-2 border-dashed border-blue-500/30 hover:border-blue-500 flex flex-col items-center gap-2 transition-all cursor-pointer">
                  <RotateCcw className="w-8 h-8 text-blue-500" />
                  <span className="font-black text-xs uppercase tracking-widest">Import Backup</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const d = JSON.parse(ev.target?.result as string);
                            if (d.groceryItems) setGroceryItems(d.groceryItems);
                            if (d.selectedItems) setSelectedItems(d.selectedItems);
                            if (d.trashedItems) setTrashedItems(d.trashedItems);
                            if (d.checkedItems) setCheckedItems(d.checkedItems);
                            if (d.templates) setTemplates(d.templates);
                            if (d.priceHistory) setPriceHistory(d.priceHistory);
                            if (d.spendingHistory) setSpendingHistory(d.spendingHistory);
                            alert('Backup restored successfully!');
                            setShowBackupModal(false);
                          } catch (err) {
                            alert('Invalid backup file');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
