import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Tag,
  Package,
  Layers,
  CircleDot,
  Hash,
  Gift,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { menuApi } from '@spiceup/api-client';
import { gbp, toPence, toPounds } from '@spiceup/utils';

type StudioTab = 'products' | 'categories' | 'groups' | 'components' | 'labels' | 'bundles';

interface Category {
  _id: string;
  name: string;
  displayOrder: number;
  isActive?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

interface Product {
  _id: string;
  name: string;
  basePricePence: number;
  vatRate: number;
  isAvailable: boolean;
  category: string | Category;
  modifierGroups?: any[];
}

interface ModifierGroup {
  _id: string;
  name: string;
  displayName?: string;
  isActive: boolean;
  options?: any[];
}

interface ComponentItem {
  _id: string;
  name: string;
  defaultPriceDeltaPence: number;
  isActive: boolean;
  color?: string;
}

interface LabelItem {
  _id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
}

interface BundleItem {
  _id: string;
  name: string;
  bundlePricePence: number;
  isActive: boolean;
  components?: any[];
}

const tabs: Array<{ key: StudioTab; label: string; icon: any }> = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'groups', label: 'Groups', icon: CircleDot },
  { key: 'components', label: 'Components', icon: Tag },
  { key: 'labels', label: 'Labels', icon: Hash },
  { key: 'bundles', label: 'Bundles', icon: Gift },
];

export default function MenuStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>('products');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [bundles, setBundles] = useState<BundleItem[]>([]);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<any>({});

  const notify = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, prodRes, groupRes, compRes, labelRes, bundleRes] = await Promise.all([
        menuApi.categories(),
        menuApi.items(),
        menuApi.modifierGroups(),
        menuApi.components(),
        menuApi.labels(),
        menuApi.bundles(),
      ]);
      setCategories(catRes.data.categories || []);
      setProducts(prodRes.data.items || []);
      setGroups(groupRes.data.modifiers || groupRes.data.modifierGroups || []);
      setComponents(compRes.data.components || []);
      setLabels(labelRes.data.labels || []);
      setBundles(bundleRes.data.bundles || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleProductAvailability = async (product: Product) => {
    try {
      await menuApi.toggleAvailability(product._id, !product.isAvailable);
      setProducts(prev =>
        prev.map(p => (p._id === product._id ? { ...p, isAvailable: !p.isAvailable } : p))
      );
      notify(`${product.name} is now ${!product.isAvailable ? 'available' : 'unavailable'}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle availability');
    }
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'products') {
      setEditForm({
        name: item.name,
        pricePounds: toPounds(item.basePricePence || 0).toFixed(2),
        vatRate: item.vatRate || 20,
        isAvailable: item.isAvailable !== false,
        category: typeof item.category === 'string' ? item.category : item.category?._id,
      });
    } else if (activeTab === 'categories') {
      setEditForm({
        name: item.name,
        displayOrder: item.displayOrder || 0,
        isActive: item.isActive !== false,
        backgroundColor: item.backgroundColor || '#1e293b',
        textColor: item.textColor || '#ffffff',
      });
    } else if (activeTab === 'groups') {
      setEditForm({
        name: item.name,
        displayName: item.displayName || '',
        isActive: item.isActive !== false,
      });
    } else if (activeTab === 'components') {
      setEditForm({
        name: item.name,
        pricePounds: toPounds(item.defaultPriceDeltaPence || 0).toFixed(2),
        isActive: item.isActive !== false,
        color: item.color || '#3b82f6',
      });
    } else if (activeTab === 'labels') {
      setEditForm({
        name: item.name,
        backgroundColor: item.backgroundColor || '#334155',
        textColor: item.textColor || '#ffffff',
        isActive: item.isActive !== false,
      });
    } else if (activeTab === 'bundles') {
      setEditForm({
        name: item.name,
        pricePounds: toPounds(item.bundlePricePence || 0).toFixed(2),
        isActive: item.isActive !== false,
      });
    }
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      if (activeTab === 'products') {
        await menuApi.updateItem(editingItem._id, {
          name: editForm.name,
          basePricePence: toPence(Number(editForm.pricePounds || 0)),
          vatRate: Number(editForm.vatRate),
          isAvailable: editForm.isAvailable,
          category: editForm.category,
        });
      } else if (activeTab === 'categories') {
        await menuApi.updateCategory(editingItem._id, {
          name: editForm.name,
          displayOrder: Number(editForm.displayOrder || 0),
          isActive: editForm.isActive,
          backgroundColor: editForm.backgroundColor,
          textColor: editForm.textColor,
        });
      } else if (activeTab === 'groups') {
        await menuApi.updateModifierGroup(editingItem._id, {
          name: editForm.name,
          displayName: editForm.displayName,
          isActive: editForm.isActive,
        });
      } else if (activeTab === 'components') {
        await menuApi.updateComponent(editingItem._id, {
          name: editForm.name,
          defaultPriceDeltaPence: toPence(Number(editForm.pricePounds || 0)),
          isActive: editForm.isActive,
          color: editForm.color,
        });
      } else if (activeTab === 'labels') {
        await menuApi.updateLabel(editingItem._id, {
          name: editForm.name,
          backgroundColor: editForm.backgroundColor,
          textColor: editForm.textColor,
          isActive: editForm.isActive,
        });
      } else if (activeTab === 'bundles') {
        await menuApi.updateBundle(editingItem._id, {
          name: editForm.name,
          bundlePricePence: toPence(Number(editForm.pricePounds || 0)),
          isActive: editForm.isActive,
        });
      }
      setEditingItem(null);
      notify('Saved successfully');
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      if (activeTab === 'products') await menuApi.deleteItem(id);
      else if (activeTab === 'categories') await menuApi.deleteCategory(id);
      else if (activeTab === 'groups') await menuApi.deleteModifierGroup(id);
      else if (activeTab === 'components') await menuApi.deleteComponent(id);
      else if (activeTab === 'labels') await menuApi.deleteLabel(id);
      else if (activeTab === 'bundles') await menuApi.deleteBundle(id);
      notify('Deleted successfully');
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openCreate = () => {
    setShowCreate(true);
    if (activeTab === 'products') {
      setCreateForm({ name: '', pricePounds: '0.00', vatRate: 20, isAvailable: true, category: categories[0]?._id || '' });
    } else if (activeTab === 'categories') {
      setCreateForm({ name: '', displayOrder: 0, isActive: true, backgroundColor: '#1e293b', textColor: '#ffffff' });
    } else if (activeTab === 'groups') {
      setCreateForm({ name: '', displayName: '', isActive: true });
    } else if (activeTab === 'components') {
      setCreateForm({ name: '', pricePounds: '0.00', isActive: true, color: '#3b82f6' });
    } else if (activeTab === 'labels') {
      setCreateForm({ name: '', backgroundColor: '#334155', textColor: '#ffffff', isActive: true });
    } else if (activeTab === 'bundles') {
      setCreateForm({ name: '', pricePounds: '0.00', isActive: true });
    }
  };

  const saveCreate = async () => {
    try {
      if (activeTab === 'products') {
        await menuApi.createItem({
          name: createForm.name,
          basePricePence: toPence(Number(createForm.pricePounds || 0)),
          vatRate: Number(createForm.vatRate),
          isAvailable: createForm.isAvailable,
          category: createForm.category,
        });
      } else if (activeTab === 'categories') {
        await menuApi.createCategory({
          name: createForm.name,
          displayOrder: Number(createForm.displayOrder || 0),
          isActive: createForm.isActive,
          backgroundColor: createForm.backgroundColor,
          textColor: createForm.textColor,
        });
      } else if (activeTab === 'groups') {
        await menuApi.createModifierGroup({
          name: createForm.name,
          displayName: createForm.displayName,
          type: 'optional',
          selectionType: 'multiple',
          minSelections: 0,
          maxSelections: 10,
          staticLabelsEnabled: true,
          allowedLabelIds: [],
          isActive: createForm.isActive,
          options: [],
        });
      } else if (activeTab === 'components') {
        await menuApi.createComponent({
          name: createForm.name,
          defaultPriceDeltaPence: toPence(Number(createForm.pricePounds || 0)),
          isActive: createForm.isActive,
          color: createForm.color,
        });
      } else if (activeTab === 'labels') {
        await menuApi.createLabel({
          name: createForm.name,
          backgroundColor: createForm.backgroundColor,
          textColor: createForm.textColor,
          isActive: createForm.isActive,
        });
      } else if (activeTab === 'bundles') {
        await menuApi.createBundle({
          name: createForm.name,
          bundlePricePence: toPence(Number(createForm.pricePounds || 0)),
          isActive: createForm.isActive,
          components: [],
        });
      }
      setShowCreate(false);
      notify('Created successfully');
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create');
    }
  };

  const getRows = () => {
    switch (activeTab) {
      case 'products': return products;
      case 'categories': return categories;
      case 'groups': return groups;
      case 'components': return components;
      case 'labels': return labels;
      case 'bundles': return bundles;
      default: return [];
    }
  };

  const filteredRows = getRows().filter((row: any) => {
    if (!search) return true;
    return row.name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setEditingItem(null); setShowCreate(false); }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-500/15 border-brand-500 text-brand-400'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:border-brand-500 outline-none w-48"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center space-x-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center space-x-2 bg-red-950/30 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredRows.length === 0 && !loading && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-600">
            <Package className="w-12 h-12 stroke-[1] mb-2" />
            <span className="text-xs">No items found</span>
          </div>
        )}

        {activeTab === 'products' && (filteredRows as Product[]).map((product) => (
          <div key={product._id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => toggleProductAvailability(product)}
                className="text-slate-500 hover:text-brand-400 transition-colors"
              >
                {product.isAvailable !== false ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </button>
              <div>
                <span className="text-sm font-semibold text-slate-200">{product.name}</span>
                <span className="text-xs text-slate-500 ml-2">
                  {typeof product.category === 'string'
                    ? categories.find(c => c._id === product.category)?.name || product.category
                    : product.category?.name}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-brand-400">{gbp(product.basePricePence)}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">VAT {product.vatRate}%</span>
              <button onClick={() => openEdit(product)} className="text-slate-500 hover:text-brand-400 transition-colors">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(product._id)} className="text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'categories' && (filteredRows as Category[]).map((cat) => (
          <div key={cat._id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 rounded-md border border-slate-700" style={{ backgroundColor: cat.backgroundColor || '#1e293b' }} />
              <span className="text-sm font-semibold text-slate-200">{cat.name}</span>
              <span className="text-xs text-slate-500">Order: {cat.displayOrder}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cat.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {cat.isActive !== false ? 'Active' : 'Hidden'}
              </span>
              <button onClick={() => openEdit(cat)} className="text-slate-500 hover:text-brand-400 transition-colors"><Save className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(cat._id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}

        {activeTab === 'groups' && (filteredRows as ModifierGroup[]).map((group) => (
          <div key={group._id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-colors">
            <div>
              <span className="text-sm font-semibold text-slate-200">{group.name}</span>
              {group.displayName && <span className="text-xs text-slate-500 ml-2">({group.displayName})</span>}
              <span className="text-xs text-slate-500 ml-2">{group.options?.length || 0} options</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${group.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {group.isActive !== false ? 'Active' : 'Hidden'}
              </span>
              <button onClick={() => openEdit(group)} className="text-slate-500 hover:text-brand-400 transition-colors"><Save className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(group._id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}

        {activeTab === 'components' && (filteredRows as ComponentItem[]).map((comp) => (
          <div key={comp._id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="w-5 h-5 rounded-full" style={{ backgroundColor: comp.color || '#3b82f6' }} />
              <span className="text-sm font-semibold text-slate-200">{comp.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-slate-300">{gbp(comp.defaultPriceDeltaPence)}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${comp.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {comp.isActive !== false ? 'Active' : 'Hidden'}
              </span>
              <button onClick={() => openEdit(comp)} className="text-slate-500 hover:text-brand-400 transition-colors"><Save className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(comp._id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}

        {activeTab === 'labels' && (filteredRows as LabelItem[]).map((label) => (
          <div key={label._id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: label.backgroundColor, color: label.textColor }}>
                {label.name}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${label.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {label.isActive !== false ? 'Active' : 'Hidden'}
              </span>
              <button onClick={() => openEdit(label)} className="text-slate-500 hover:text-brand-400 transition-colors"><Save className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(label._id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}

        {activeTab === 'bundles' && (filteredRows as BundleItem[]).map((bundle) => (
          <div key={bundle._id} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:bg-slate-900/50 transition-colors">
            <div>
              <span className="text-sm font-semibold text-slate-200">{bundle.name}</span>
              <span className="text-xs text-slate-500 ml-2">{bundle.components?.length || 0} slots</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-brand-400">{gbp(bundle.bundlePricePence)}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bundle.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {bundle.isActive !== false ? 'Active' : 'Hidden'}
              </span>
              <button onClick={() => openEdit(bundle)} className="text-slate-500 hover:text-brand-400 transition-colors"><Save className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(bundle._id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Edit {tabs.find(t => t.key === activeTab)?.label}</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
              <input
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
              />

              {(activeTab === 'products' || activeTab === 'components' || activeTab === 'bundles') && (
                <>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Price (£)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.pricePounds || ''}
                      onChange={(e) => setEditForm({ ...editForm, pricePounds: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'products' && (
                <>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">VAT Rate</label>
                  <select
                    value={editForm.vatRate || 20}
                    onChange={(e) => setEditForm({ ...editForm, vatRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={20}>20%</option>
                  </select>
                </>
              )}

              {activeTab === 'categories' && (
                <>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Display Order</label>
                  <input
                    type="number"
                    value={editForm.displayOrder || 0}
                    onChange={(e) => setEditForm({ ...editForm, displayOrder: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">BG Color</label>
                      <input
                        type="color"
                        value={editForm.backgroundColor || '#1e293b'}
                        onChange={(e) => setEditForm({ ...editForm, backgroundColor: e.target.value })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Text Color</label>
                      <input
                        type="color"
                        value={editForm.textColor || '#ffffff'}
                        onChange={(e) => setEditForm({ ...editForm, textColor: e.target.value })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'labels' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">BG Color</label>
                    <input
                      type="color"
                      value={editForm.backgroundColor || '#334155'}
                      onChange={(e) => setEditForm({ ...editForm, backgroundColor: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Text Color</label>
                    <input
                      type="color"
                      value={editForm.textColor || '#ffffff'}
                      onChange={(e) => setEditForm({ ...editForm, textColor: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'components' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Color</label>
                  <input
                    type="color"
                    value={editForm.color || '#3b82f6'}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              <label className="flex items-center justify-between rounded-xl border border-slate-800 p-3 text-sm">
                <span className="text-slate-300">Active / Available</span>
                <input
                  type="checkbox"
                  checked={!!editForm.isActive || !!editForm.isAvailable}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked, isAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600"
                />
              </label>
            </div>

            <button
              onClick={saveEdit}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Create {tabs.find(t => t.key === activeTab)?.label}</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
              <input
                value={createForm.name || ''}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
              />

              {(activeTab === 'products' || activeTab === 'components' || activeTab === 'bundles') && (
                <>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Price (£)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.pricePounds || ''}
                      onChange={(e) => setCreateForm({ ...createForm, pricePounds: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'products' && (
                <>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={createForm.category || ''}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none"
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </>
              )}

              <label className="flex items-center justify-between rounded-xl border border-slate-800 p-3 text-sm">
                <span className="text-slate-300">Active</span>
                <input
                  type="checkbox"
                  checked={createForm.isActive !== false}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600"
                />
              </label>
            </div>

            <button
              onClick={saveCreate}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


