import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  FolderOpen,
  GripVertical,
  Lock,
  Menu,
  MoreVertical,
  Plus,
  X
} from 'lucide-react';
import { authApi, menuApi, reportsApi } from '@takeaway-pos/api-client';
import { gbp, toPence, toPounds, UK_VAT_RATES } from '@takeaway-pos/utils';

type MenuTab = 'product' | 'groups' | 'component' | 'label' | 'manual-product' | 'short-hand' | 'department' | 'product-time';
type DrawerMode = null | { type: MenuTab | 'product-item'; item?: any; categoryId?: string };

interface Department { _id: string; name: string; isActive: boolean; }
interface Category { _id: string; name: string; displayOrder: number; isActive?: boolean; parent?: string | Category | null; department?: string | Department | null; backgroundColor?: string; textColor?: string; }
interface ComponentItem { _id: string; name: string; description?: string; color?: string; textColor?: string; defaultPriceDeltaPence: number; isActive: boolean; }
interface LabelItem { _id: string; name: string; description?: string; backgroundColor: string; textColor: string; isActive: boolean; }
interface ModifierOption { _id?: string; component?: string | ComponentItem; name: string; priceDeltaPence: number; isDefault: boolean; isAvailable?: boolean; sortOrder?: number; }
interface ModifierGroup { _id: string; name: string; displayName?: string; dashboardHeading?: string; staticLabelsEnabled: boolean; allowedLabelIds?: Array<string | LabelItem>; samePrice: boolean; samePricePence: number; type: 'required' | 'optional'; selectionType: 'single' | 'multiple'; minSelections: number; maxSelections: number; options: ModifierOption[]; isActive: boolean; }
interface Variation { _id?: string; name: string; priceDeltaPence: number; sku: string; isDefault: boolean; isActive: boolean; sortOrder: number; }
interface GroupAssignment { group: string | ModifierGroup; isEnabled: boolean; requiredOverride: boolean | null; posOrder: number; websiteOrder: number; showOnPos: boolean; showOnWebsite: boolean; }

const navItems: Array<{ key: MenuTab; label: string }> = [
  { key: 'product', label: 'Product' },
  { key: 'groups', label: 'Groups' },
  { key: 'component', label: 'Component' },
  { key: 'label', label: 'Label' },
  { key: 'manual-product', label: 'Manual Product' },
  { key: 'short-hand', label: 'Short Hand' },
  { key: 'department', label: 'Department' },
  { key: 'product-time', label: 'Product Time' }
];

const steps: Record<MenuTab, string[]> = {
  product: [
    "Categorise dishes into Product folders such as Curries, Starters, Pizzas and Kebabs.",
    "Use Manage to add categories, edit folders, or create products inside a folder.",
    "Use the switch to show or hide a category on POS and website.",
    "Click Save Changes after editing product details."
  ],
  groups: [
    "Create groups for dish options such as toppings, sauce and salad, dips or curry add-ons.",
    "Click the plus button to create a new group.",
    "Use Manage to customise the components inside that group.",
    "Enable labels only when the group needs NO, LESS, ON HALF or similar instructions.",
    "Save changes when all components and prices are complete."
  ],
  component: [
    "Create reusable components such as Onion, Mushroom, Cheese Crust or Chicken Tikka.",
    "Set a default price and colour so components are easy to recognise.",
    "Use Manage to edit a component.",
    "Disabled components will not appear in POS or website customisers."
  ],
  label: [
    "Create preparation labels such as NO, LESS, ON CHIPS, ON BURGER, ALL OVER and ON HALF.",
    "Labels are applied under selected components.",
    "Use Manage to update label colour or name.",
    "Disable labels that should not be used by staff."
  ],
  'manual-product': [
    "Manual products are quick counter items that do not need a full product setup.",
    "Click plus to create a manual product.",
    "Set display colours and whether it is active.",
    "Save changes."
  ],
  'short-hand': [
    "Short hand names control compact kitchen or receipt wording.",
    "Create a short hand against a product.",
    "Choose whether it prints on receipt or kitchen ticket.",
    "Save changes."
  ],
  department: [
    "Create kitchen departments such as PIZZA, CURRYS, NANS, BURGERS and DRINKS.",
    "Departments route items to the correct kitchen printer or KDS line.",
    "Use Manage to update a department.",
    "Disable old departments instead of deleting active routes."
  ],
  'product-time': [
    "Product times control when a product or menu is available.",
    "Create breakfast, lunch, dinner or late-night slots.",
    "Set start and end times.",
    "Save changes."
  ]
};

const presetColors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#1e293b'];

function idOf(value?: string | { _id: string } | null) {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id;
}

function activeOf(row: any, tab: MenuTab) {
  if (tab === 'product') return row.isActive !== false;
  if (tab === 'groups') return row.isActive !== false;
  return (row.isActive ?? row.isAvailable) !== false;
}

function titleFor(tab: MenuTab) {
  if (tab === 'product') return 'Category';
  if (tab === 'groups') return 'Groups';
  if (tab === 'component') return 'Components';
  if (tab === 'label') return 'Labels';
  if (tab === 'manual-product') return 'Manual Product';
  if (tab === 'short-hand') return 'Short Hand';
  if (tab === 'department') return 'Department';
  return 'Product Time';
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<MenuTab>('product');
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productTimes, setProductTimes] = useState<any[]>([]);
  const [manualProducts, setManualProducts] = useState<any[]>([]);
  const [shortHands, setShortHands] = useState<any[]>([]);
  const [groupForm, setGroupForm] = useState<any>(null);
  const [productForm, setProductForm] = useState<any>(null);

  useEffect(() => {
    authApi.me().then(() => {
      setIsAuthenticated(true);
      loadAll();
    }).catch(() => undefined);
  }, []);

  async function loadAll() {
    try {
      const [catRes, depRes, compRes, labelRes, groupRes, productRes, timeRes, manualRes, shortRes] = await Promise.all([
        menuApi.categories(),
        menuApi.departments(),
        menuApi.components(),
        menuApi.labels(),
        menuApi.modifierGroups(),
        menuApi.items(),
        menuApi.productTimes(),
        menuApi.manualProducts(),
        menuApi.shorthands()
      ]);
      setCategories(catRes.data.categories || []);
      setDepartments(depRes.data.departments || []);
      setComponents(compRes.data.components || []);
      setLabels(labelRes.data.labels || []);
      setGroups(groupRes.data.modifiers || groupRes.data.modifierGroups || []);
      setProducts(productRes.data.items || []);
      setProductTimes(timeRes.data.productTimes || []);
      setManualProducts(manualRes.data.manualProducts || []);
      setShortHands(shortRes.data.shorthands || []);
      reportsApi.dashboard().catch(() => undefined);
    } catch {
      setErrorMsg('Failed to load menu options.');
    }
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    try {
      await authApi.login({ username, password });
      setIsAuthenticated(true);
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Invalid login');
    }
  }

  function notify(message: string) {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  const rows = useMemo(() => {
    if (activeTab === 'product') return categories.filter(category => !category.parent);
    if (activeTab === 'groups') return groups;
    if (activeTab === 'component') return components;
    if (activeTab === 'label') return labels;
    if (activeTab === 'manual-product') return manualProducts;
    if (activeTab === 'short-hand') return shortHands;
    if (activeTab === 'department') return departments;
    return productTimes;
  }, [activeTab, categories, groups, components, labels, manualProducts, shortHands, departments, productTimes]);

  function openCreate(tab = activeTab) {
    if (tab === 'groups') return openGroup();
    if (tab === 'product') return setDrawer({ type: 'product' });
    setDrawer({ type: tab });
  }

  function openManage(row: any) {
    if (activeTab === 'groups') return openGroup(row);
    if (activeTab === 'product') {
      setProductForm(defaultProductForm(row._id));
      return setDrawer({ type: 'product-item', categoryId: row._id });
    }
    setDrawer({ type: activeTab, item: row });
  }

  function openGroup(group?: ModifierGroup) {
    setGroupForm(group ? {
      name: group.name,
      displayName: group.displayName || '',
      dashboardHeading: group.dashboardHeading || '',
      type: group.type,
      selectionType: group.selectionType,
      minSelections: group.minSelections || 0,
      maxSelections: group.maxSelections || 1,
      staticLabelsEnabled: group.staticLabelsEnabled !== false,
      allowedLabelIds: (group.allowedLabelIds || []).map(idOf),
      isActive: group.isActive !== false,
      samePrice: group.samePrice || false,
      samePricePounds: toPounds(group.samePricePence || 0).toFixed(2),
      options: (group.options || []).map((option, index) => ({
        component: idOf(option.component as any),
        name: option.name,
        pricePounds: toPounds(option.priceDeltaPence || 0).toFixed(2),
        isDefault: !!option.isDefault,
        isAvailable: option.isAvailable !== false,
        sortOrder: option.sortOrder ?? index
      }))
    } : {
      name: '',
      displayName: '',
      dashboardHeading: '',
      type: 'optional',
      selectionType: 'multiple',
      minSelections: 0,
      maxSelections: 10,
      staticLabelsEnabled: true,
      allowedLabelIds: [],
      isActive: true,
      samePrice: false,
      samePricePounds: '0.00',
      options: []
    });
    setDrawer({ type: 'groups', item: group });
  }

  function defaultProductForm(categoryId = '') {
    const pizzaDepartment = departments.find(d => d.name.toLowerCase().includes('pizza'));
    const isPizza = categories.find(c => c._id === categoryId)?.name.toLowerCase().includes('pizza');
    const assignments = groups.map((group, index) => {
      const groupName = group.name.toLowerCase();
      const pizzaGroup = ['crust', 'base', 'topping', 'dip', 'drizzle'].some(term => groupName.includes(term));
      return { group: group._id, isEnabled: isPizza ? pizzaGroup : false, requiredOverride: null, posOrder: index, websiteOrder: index, showOnPos: true, showOnWebsite: true };
    });
    return {
      name: isPizza ? 'Apna Style Pizza' : '',
      menuCode: isPizza ? 'PIZ-APNA' : '',
      description: isPizza ? 'Chicken tikka, onions, peppers, sweetcorn and spicy Asian sauce.' : '',
      pricePounds: isPizza ? '7.99' : '0.00',
      vatRate: 20,
      category: categoryId || categories[0]?._id || '',
      department: isPizza ? pizzaDepartment?._id || '' : '',
      kitchenStationId: isPizza ? 'PIZZA_LINE' : 'OTHER',
      imageUrl: '',
      isAvailable: true,
      publishStatus: 'published',
      channels: { pos: true, website: true, mobile: true },
      variations: isPizza ? [
        { name: '7" Personal', sku: 'PIZ-APNA-07', priceDeltaPence: 0, isDefault: true, isActive: true, sortOrder: 0 },
        { name: '9" Small', sku: 'PIZ-APNA-09', priceDeltaPence: 200, isDefault: false, isActive: true, sortOrder: 1 },
        { name: '12" Medium', sku: 'PIZ-APNA-12', priceDeltaPence: 500, isDefault: false, isActive: true, sortOrder: 2 },
        { name: '14" Large', sku: 'PIZ-APNA-14', priceDeltaPence: 800, isDefault: false, isActive: true, sortOrder: 3 }
      ] : [],
      groupAssignments: assignments
    };
  }

  async function saveSimple(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drawer) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '');
    const isActive = data.get('isActive') === 'on';
    const item = drawer.item;
    try {
      if (drawer.type === 'product') {
        const payload = {
          name,
          displayOrder: Number(data.get('displayOrder') || 0),
          department: String(data.get('department') || '') || null,
          backgroundColor: String(data.get('backgroundColor') || '#f59e0b'),
          textColor: '#ffffff',
          isActive
        };
        item ? await menuApi.updateCategory(item._id, payload) : await menuApi.createCategory(payload);
      }
      if (drawer.type === 'department') {
        item ? await menuApi.updateDepartment(item._id, { name, isActive }) : await menuApi.createDepartment({ name, isActive });
      }
      if (drawer.type === 'component') {
        const payload = { name, description: String(data.get('description') || ''), defaultPriceDeltaPence: toPence(Number(data.get('price') || 0)), color: String(data.get('backgroundColor') || '#1e293b'), textColor: '#ffffff', isActive };
        item ? await menuApi.updateComponent(item._id, payload) : await menuApi.createComponent(payload);
      }
      if (drawer.type === 'label') {
        const payload = { name, description: String(data.get('description') || ''), backgroundColor: String(data.get('backgroundColor') || '#334155'), textColor: '#ffffff', isActive };
        item ? await menuApi.updateLabel(item._id, payload) : await menuApi.createLabel(payload);
      }
      if (drawer.type === 'product-time') {
        const payload = { name, startTime: String(data.get('startTime') || '12:00'), endTime: String(data.get('endTime') || '22:00'), isActive };
        item ? await menuApi.updateProductTime(item._id, payload) : await menuApi.createProductTime(payload);
      }
      if (drawer.type === 'manual-product') {
        const payload = { name, code: String(data.get('code') || ''), pricePence: toPence(Number(data.get('price') || 0)), color: String(data.get('backgroundColor') || '#3b82f6'), textColor: '#ffffff', isActive };
        item ? await menuApi.updateManualProduct(item._id, payload) : await menuApi.createManualProduct(payload);
      }
      if (drawer.type === 'short-hand') {
        const payload = {
          menuItem: String(data.get('menuItem') || ''),
          shorthandCode: String(data.get('shorthandCode') || name),
          printOnReceipt: data.get('printOnReceipt') === 'on',
          printOnTicket: data.get('printOnTicket') === 'on',
          isActive
        };
        item ? await menuApi.updateShortHand(item._id, payload) : await menuApi.createShortHand(payload);
      }
      setDrawer(null);
      notify('Saved changes.');
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Could not save changes.');
    }
  }

  async function saveGroup() {
    try {
      const payload = {
        name: groupForm.name,
        displayName: groupForm.displayName,
        dashboardHeading: groupForm.dashboardHeading,
        type: groupForm.type,
        selectionType: groupForm.selectionType,
        minSelections: Number(groupForm.minSelections || 0),
        maxSelections: Number(groupForm.maxSelections || 1),
        staticLabelsEnabled: groupForm.staticLabelsEnabled,
        allowedLabelIds: groupForm.staticLabelsEnabled ? groupForm.allowedLabelIds : [],
        samePrice: groupForm.samePrice,
        samePricePence: toPence(Number(groupForm.samePricePounds || 0)),
        isActive: groupForm.isActive,
        options: groupForm.options.map((option: any, index: number) => ({
          component: option.component || null,
          name: option.name,
          priceDeltaPence: toPence(Number(option.pricePounds || 0)),
          isDefault: option.isDefault,
          isAvailable: option.isAvailable,
          sortOrder: Number(option.sortOrder ?? index)
        }))
      };
      drawer?.item ? await menuApi.updateModifierGroup(drawer.item._id, payload) : await menuApi.createModifierGroup(payload);
      setDrawer(null);
      notify('Saved changes.');
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Could not save group.');
    }
  }

  async function saveProduct() {
    const enabledAssignments = productForm.groupAssignments.filter((assignment: GroupAssignment) => assignment.isEnabled);
    const payload = {
      name: productForm.name,
      menuCode: productForm.menuCode,
      description: productForm.description,
      category: productForm.category,
      department: productForm.department || null,
      basePricePence: toPence(Number(productForm.pricePounds || 0)),
      vatRate: productForm.vatRate,
      images: productForm.imageUrl ? [productForm.imageUrl] : [],
      isAvailable: productForm.isAvailable,
      publishStatus: productForm.publishStatus,
      channels: productForm.channels,
      kitchenStationId: productForm.kitchenStationId,
      modifierGroups: enabledAssignments.map((assignment: GroupAssignment) => idOf(assignment.group as any)),
      groupAssignments: enabledAssignments.map((assignment: GroupAssignment, index: number) => ({ ...assignment, group: idOf(assignment.group as any), posOrder: assignment.posOrder ?? index, websiteOrder: assignment.websiteOrder ?? index }))
    };
    try {
      const res = drawer?.item ? await menuApi.updateItem(drawer.item._id, payload) : await menuApi.createItem(payload);
      const productId = drawer?.item?._id || res.data.item?._id;
      for (const variation of productForm.variations) {
        const variationPayload = { menuItem: productId, name: variation.name, priceDeltaPence: Number(variation.priceDeltaPence || 0), sku: variation.sku, isDefault: variation.isDefault, isActive: variation.isActive, sortOrder: variation.sortOrder || 0 };
        variation._id ? await menuApi.updateVariation(variation._id, variationPayload) : await menuApi.createVariation(variationPayload);
      }
      setDrawer(null);
      notify('Saved changes.');
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Could not save product.');
    }
  }

  async function removeRow(row: any) {
    if (!confirm('Delete this record?')) return;
    try {
      if (activeTab === 'product') await menuApi.deleteCategory(row._id);
      if (activeTab === 'groups') await menuApi.deleteModifierGroup(row._id);
      if (activeTab === 'component') await menuApi.deleteComponent(row._id);
      if (activeTab === 'label') await menuApi.deleteLabel(row._id);
      if (activeTab === 'department') await menuApi.deleteDepartment(row._id);
      if (activeTab === 'product-time') await menuApi.deleteProductTime(row._id);
      if (activeTab === 'short-hand') await menuApi.deleteShortHand(row._id);
      notify('Deleted.');
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Delete blocked because this record is in use.');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <form onSubmit={login} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2 text-brand-400"><Lock className="h-5 w-5" /><h1 className="font-black">Admin Login</h1></div>
          {errorMsg && <p className="rounded bg-rose-500/10 p-3 text-xs text-rose-300">{errorMsg}</p>}
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm" />
          <button className="w-full rounded bg-brand-600 py-3 text-sm font-bold text-white">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex overflow-hidden">
      <aside className="w-[314px] shrink-0 border-r border-slate-200 bg-slate-100">
        <div className="h-14 flex items-center px-4 border-b border-slate-200">
          <Menu className="h-7 w-7 text-slate-700" />
        </div>
        <nav>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`h-16 w-full flex items-center justify-between px-3 text-left text-[19px] tracking-wide ${activeTab === item.key ? 'bg-white text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span>{item.label}</span>
              <ChevronRight className="h-6 w-6" />
            </button>
          ))}
        </nav>
      </aside>

      <section className="flex-1 bg-white overflow-y-auto">
        <header className="h-24 flex items-center justify-between px-7">
          <h1 className="text-xl font-semibold">{titleFor(activeTab)}</h1>
          <div className="flex items-center gap-6">
            {activeTab === 'product' && <button className="rounded-md bg-slate-950 px-8 py-4 text-lg font-semibold text-white">Manage</button>}
            <button onClick={() => openCreate()} className="p-2 text-slate-700 hover:text-brand-500"><Plus className="h-9 w-9 stroke-[1.5]" /></button>
          </div>
        </header>

        {successMsg && <p className="mx-7 mb-2 rounded bg-emerald-50 p-3 text-sm text-emerald-700">{successMsg}</p>}
        {errorMsg && <p className="mx-7 mb-2 rounded bg-rose-50 p-3 text-sm text-rose-700">{errorMsg}</p>}

        {activeTab === 'manual-product' && rows.length === 0 ? (
          <EmptyState label="Manual Product" onCreate={() => openCreate()} />
        ) : activeTab === 'product-time' && rows.length === 0 ? (
          <EmptyState label="Product Time" onCreate={() => openCreate()} />
        ) : activeTab === 'short-hand' && rows.length === 0 ? (
          <EmptyState label="Short Hand" onCreate={() => openCreate()} />
        ) : (
          <div>
            {activeTab === 'product' && (
              <div className="h-20 flex items-center gap-5 border-b border-slate-200 px-10">
                <span className="h-9 w-9 rounded border-2 border-slate-400" />
                <span className="text-xl font-semibold">Select All</span>
              </div>
            )}
            {rows.map((row: any) => (
              <ManagementRow
                key={row._id}
                row={row}
                tab={activeTab}
                onManage={() => openManage(row)}
                onDelete={() => removeRow(row)}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="w-[398px] shrink-0 bg-slate-700 text-white px-8 py-8">
        <h2 className="mb-8 text-2xl font-semibold">{titleFor(activeTab)}' Steps</h2>
        <div className="space-y-7">
          {steps[activeTab].map((step, index) => (
            <div key={step} className="flex gap-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500 bg-white text-lg font-medium text-blue-600">{String(index + 1).padStart(2, '0')}</span>
              <p className="min-w-0 break-words text-base font-medium leading-snug text-white/95">{step}</p>
            </div>
          ))}
        </div>
      </aside>

      {drawer && (
        <RightDrawer title={drawerTitle(drawer)} onClose={() => setDrawer(null)}>
          {drawer.type === 'groups' && groupForm ? <GroupForm form={groupForm} setForm={setGroupForm} labels={labels} components={components} onSave={saveGroup} /> :
            drawer.type === 'product-item' ? <ProductForm form={productForm || defaultProductForm(drawer.categoryId)} setForm={setProductForm} groups={groups} categories={categories} departments={departments} onSave={saveProduct} /> :
              <SimpleForm drawer={drawer} departments={departments} products={products} onSubmit={saveSimple} />}
        </RightDrawer>
      )}
    </div>
  );
}

function ManagementRow({ row, tab, onManage, onDelete }: { row: any; tab: MenuTab; onManage: () => void; onDelete: () => void }) {
  const active = activeOf(row, tab);
  const name = row.name || row.shorthandCode || row.code || 'Untitled';
  return (
    <div className="min-h-[90px] grid grid-cols-[64px_64px_1fr_110px_140px_64px] items-center border-b border-slate-200 px-10">
      <span className="h-9 w-9 rounded border-2 border-slate-400" />
      <span className="inline-flex h-6 w-12 items-center rounded-full bg-slate-50 shadow">
        <span className="ml-2 h-3 w-3 rounded-full" style={{ backgroundColor: row.backgroundColor || row.color || '#3b82f6' }} />
      </span>
      <div className="flex items-center gap-5">
        {tab === 'product' && <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500 text-white"><FolderOpen className="h-6 w-6" /></span>}
        <span className="text-2xl tracking-wide text-slate-700">{name}</span>
      </div>
      <span className={`relative h-9 w-16 rounded-full ${active ? 'bg-green-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-7 w-7 rounded-full bg-white ${active ? 'right-1' : 'left-1'}`} />
      </span>
      <button onClick={onManage} className="rounded-md bg-slate-950 px-7 py-3 text-lg font-semibold text-white">Manage</button>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onDelete} className="text-slate-400 hover:text-rose-500"><MoreVertical className="h-5 w-5" /></button>
        <GripVertical className="h-7 w-7 text-slate-500" />
      </div>
    </div>
  );
}

function EmptyState({ label, onCreate }: { label: string; onCreate: () => void }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-slate-400">
      <div className="mb-5 grid h-40 w-40 place-items-center rounded-full bg-slate-100 text-6xl">🍽</div>
      <p className="text-xl font-semibold">No {label} Data Found</p>
      <button onClick={onCreate} className="mt-4 text-slate-500 hover:text-brand-500"><Plus className="h-8 w-8" /></button>
    </div>
  );
}

function RightDrawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-[390px] overflow-y-auto bg-white text-slate-900 shadow-2xl">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function drawerTitle(drawer: DrawerMode) {
  if (!drawer) return '';
  if (drawer.type === 'product-item') return drawer.item ? 'Update Product' : 'Create Product';
  if (drawer.type === 'product') return drawer.item ? 'Update Category' : 'Create Category';
  if (drawer.type === 'groups') return drawer.item ? 'Edit Group' : 'Add Group';
  return `${drawer.item ? 'Update' : 'Create'} ${titleFor(drawer.type as MenuTab)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

const inputClass = 'w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500';

function SimpleForm({ drawer, departments, products, onSubmit }: { drawer: DrawerMode; departments: Department[]; products: any[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const item = drawer?.item || {};
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {drawer?.type === 'short-hand' ? (
        <>
          <Field label="Product">
            <select name="menuItem" defaultValue={idOf(item.menuItem)} required className={inputClass}>
              <option value="">Choose Product</option>
              {products.map(product => <option key={product._id} value={product._id}>{product.name}</option>)}
            </select>
          </Field>
          <Field label="Short Hand Code">
            <input name="shorthandCode" defaultValue={item.shorthandCode || ''} required className={inputClass} />
          </Field>
        </>
      ) : (
        <Field label={drawer?.type === 'label' ? 'Label Name' : 'Name'}>
          <input name="name" defaultValue={item.name || ''} required className={inputClass} />
        </Field>
      )}
      {drawer?.type === 'product' && (
        <>
          <Field label="Department">
            <select name="department" defaultValue={idOf(item.department)} className={inputClass}>
              <option value="">None</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Display Order"><input name="displayOrder" type="number" defaultValue={item.displayOrder || 0} className={inputClass} /></Field>
        </>
      )}
      {(drawer?.type === 'component' || drawer?.type === 'manual-product') && (
        <Field label="Price"><input name="price" type="number" step="0.01" defaultValue={toPounds(item.defaultPriceDeltaPence || item.pricePence || 0).toFixed(2)} className={inputClass} /></Field>
      )}
      {(drawer?.type === 'component' || drawer?.type === 'label') && (
        <Field label="Description"><textarea name="description" defaultValue={item.description || ''} className={`${inputClass} h-20`} /></Field>
      )}
      {drawer?.type === 'manual-product' && <Field label="Quick Code"><input name="code" defaultValue={item.code || ''} className={inputClass} /></Field>}
      {drawer?.type === 'product-time' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Time"><input name="startTime" defaultValue={item.startTime || '12:00'} className={inputClass} /></Field>
          <Field label="End Time"><input name="endTime" defaultValue={item.endTime || '22:00'} className={inputClass} /></Field>
        </div>
      )}
      {drawer?.type === 'short-hand' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm">Receipt <input name="printOnReceipt" type="checkbox" defaultChecked={item.printOnReceipt !== false} /></label>
          <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm">Kitchen <input name="printOnTicket" type="checkbox" defaultChecked={item.printOnTicket !== false} /></label>
        </div>
      )}
      {(drawer?.type === 'product' || drawer?.type === 'component' || drawer?.type === 'label' || drawer?.type === 'manual-product') && (
        <Field label="Background Color">
          <div className="flex flex-wrap gap-2">
            {presetColors.map(color => <label key={color} className="h-7 w-7 rounded border" style={{ backgroundColor: color }}><input className="sr-only" type="radio" name="backgroundColor" value={color} defaultChecked={(item.backgroundColor || item.color) === color} /></label>)}
          </div>
        </Field>
      )}
      <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm">
        <span>Display Type / Active</span>
        <input name="isActive" type="checkbox" defaultChecked={(item.isActive ?? item.isAvailable) !== false} className="h-4 w-4" />
      </label>
      <button className="w-full rounded bg-slate-950 py-3 font-semibold text-white">Save Changes</button>
    </form>
  );
}

function GroupForm({ form, setForm, labels, components, onSave }: { form: any; setForm: any; labels: LabelItem[]; components: ComponentItem[]; onSave: () => void }) {
  return (
    <div className="space-y-4">
      <Field label="Group Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><select value={form.selectionType} onChange={e => setForm({ ...form, selectionType: e.target.value })} className={inputClass}><option value="single">Single</option><option value="multiple">Multiple</option></select></Field>
        <Field label="Required"><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputClass}><option value="optional">No</option><option value="required">Yes</option></select></Field>
        <Field label="Min"><input type="number" value={form.minSelections} onChange={e => setForm({ ...form, minSelections: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Max"><input type="number" value={form.maxSelections} onChange={e => setForm({ ...form, maxSelections: Number(e.target.value) })} className={inputClass} /></Field>
      </div>
      <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm"><span>Labels</span><input type="checkbox" checked={form.staticLabelsEnabled} onChange={e => setForm({ ...form, staticLabelsEnabled: e.target.checked })} /></label>
      {form.staticLabelsEnabled && (
        <div className="space-y-2 rounded border border-slate-200 p-3">
          <p className="text-sm font-semibold">Allowed Labels</p>
          {labels.map(label => <label key={label._id} className="mr-3 inline-flex items-center gap-1 text-sm"><input type="checkbox" checked={form.allowedLabelIds.includes(label._id)} onChange={e => setForm({ ...form, allowedLabelIds: e.target.checked ? [...form.allowedLabelIds, label._id] : form.allowedLabelIds.filter((id: string) => id !== label._id) })} />{label.name}</label>)}
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between"><p className="font-semibold">Components</p><button onClick={() => setForm({ ...form, options: [...form.options, { component: '', name: '', pricePounds: '0.00', isDefault: false, isAvailable: true }] })}><Plus /></button></div>
        {form.options.map((option: any, index: number) => (
          <div key={index} className="space-y-2 rounded border border-slate-200 p-3">
            <select value={option.component} onChange={e => {
              const component = components.find(c => c._id === e.target.value);
              const next = [...form.options];
              next[index] = { ...option, component: e.target.value, name: component?.name || option.name, pricePounds: toPounds(component?.defaultPriceDeltaPence || 0).toFixed(2) };
              setForm({ ...form, options: next });
            }} className={inputClass}>
              <option value="">Choose Component</option>
              {components.map(component => <option key={component._id} value={component._id}>{component.name}</option>)}
            </select>
            <input value={option.name} onChange={e => { const next = [...form.options]; next[index] = { ...option, name: e.target.value }; setForm({ ...form, options: next }); }} className={inputClass} placeholder="Display Name" />
            <input value={option.pricePounds} onChange={e => { const next = [...form.options]; next[index] = { ...option, pricePounds: e.target.value }; setForm({ ...form, options: next }); }} type="number" step="0.01" className={inputClass} placeholder="Price" />
            <label className="flex justify-between text-sm">Display On <input type="checkbox" checked={option.isAvailable} onChange={e => { const next = [...form.options]; next[index] = { ...option, isAvailable: e.target.checked }; setForm({ ...form, options: next }); }} /></label>
          </div>
        ))}
      </div>
      <button onClick={onSave} className="w-full rounded bg-slate-950 py-3 font-semibold text-white">Save Changes</button>
    </div>
  );
}

function ProductForm({ form, setForm, groups, categories, departments, onSave }: { form: any; setForm: any; groups: ModifierGroup[]; categories: Category[]; departments: Department[]; onSave: () => void }) {
  if (!form) return null;
  const enabledGroups = form.groupAssignments.filter((a: GroupAssignment) => a.isEnabled).map((a: GroupAssignment) => groups.find(g => g._id === idOf(a.group as any))?.name).filter(Boolean);
  return (
    <div className="space-y-4">
      <Field label="Menu Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
      <Field label="Product Description"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputClass} h-20`} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
        <Field label="Department"><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inputClass}><option value="">Inherit</option>{departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
        <Field label="Price"><input type="number" step="0.01" value={form.pricePounds} onChange={e => setForm({ ...form, pricePounds: e.target.value })} className={inputClass} /></Field>
        <Field label="VAT"><select value={form.vatRate} onChange={e => setForm({ ...form, vatRate: Number(e.target.value) })} className={inputClass}>{UK_VAT_RATES.map(rate => <option key={rate.value} value={rate.value}>{rate.label}</option>)}</select></Field>
      </div>
      <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm"><span>Display On</span><input type="checkbox" checked={form.isAvailable} onChange={e => setForm({ ...form, isAvailable: e.target.checked })} /></label>
      <section className="space-y-2">
        <p className="font-semibold">Sizes / Variations</p>
        {form.variations.map((variation: Variation, index: number) => <div key={index} className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2"><input value={variation.name} onChange={e => { const next = [...form.variations]; next[index] = { ...variation, name: e.target.value }; setForm({ ...form, variations: next }); }} className={inputClass} /><input type="number" value={variation.priceDeltaPence} onChange={e => { const next = [...form.variations]; next[index] = { ...variation, priceDeltaPence: Number(e.target.value) }; setForm({ ...form, variations: next }); }} className={inputClass} /></div>)}
        <button onClick={() => setForm({ ...form, variations: [...form.variations, { name: '', sku: `${form.menuCode || 'SKU'}-${form.variations.length + 1}`, priceDeltaPence: 0, isDefault: false, isActive: true, sortOrder: form.variations.length }] })} className="text-sm font-semibold text-brand-600">+ Add Size</button>
      </section>
      <section className="space-y-2">
        <p className="font-semibold">Groups</p>
        {groups.map((group, index) => {
          const assignment = form.groupAssignments.find((a: GroupAssignment) => idOf(a.group as any) === group._id) || { group: group._id, isEnabled: false, requiredOverride: null, posOrder: index, websiteOrder: index, showOnPos: true, showOnWebsite: true };
          return <label key={group._id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm"><span>{group.name}</span><input type="checkbox" checked={assignment.isEnabled} onChange={e => {
            const rest = form.groupAssignments.filter((a: GroupAssignment) => idOf(a.group as any) !== group._id);
            setForm({ ...form, groupAssignments: [...rest, { ...assignment, isEnabled: e.target.checked }] });
          }} /></label>;
        })}
      </section>
      <section className="rounded border border-slate-200 p-3 text-sm">
        <p className="font-semibold">Preview</p>
        <p>{categories.find(c => c._id === form.category)?.name} &gt; {form.name}</p>
        <p>From {gbp(toPence(Number(form.pricePounds || 0)))}</p>
        <p>Groups: {enabledGroups.join(', ') || 'None'}</p>
      </section>
      <button onClick={onSave} className="w-full rounded bg-slate-950 py-3 font-semibold text-white">Save Changes</button>
    </div>
  );
}
