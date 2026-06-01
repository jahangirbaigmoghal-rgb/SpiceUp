import os

file_content = """import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Edit3,
  FolderTree,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Type,
  X,
  MoreVertical,
} from 'lucide-react';
import { authApi, menuApi, reportsApi } from '@takeaway-pos/api-client';
import { toPounds, UK_VAT_RATES } from '@takeaway-pos/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type Section =
  | 'dashboard'
  | 'product'
  | 'groups'
  | 'component'
  | 'label'
  | 'manual-product'
  | 'short-hand'
  | 'department'
  | 'product-time';

interface Department {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
  displayOrder: number;
  isActive?: boolean;
  parent?: string | Category | null;
  department?: string | Department | null;
  backgroundColor?: string;
  textColor?: string;
  description?: string;
}

interface ComponentItem {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  textColor?: string;
  defaultPriceDeltaPence: number;
  isActive: boolean;
}

interface LabelItem {
  _id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
}

interface ModifierOption {
  _id?: string;
  component?: string | ComponentItem;
  name: string;
  priceDeltaPence: number;
  isDefault: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
}

interface ModifierGroup {
  _id: string;
  name: string;
  displayName?: string;
  dashboardHeading?: string;
  staticLabelsEnabled: boolean;
  allowedLabelIds?: Array<string | LabelItem>;
  samePrice: boolean;
  samePricePence: number;
  type: 'required' | 'optional';
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
  isActive: boolean;
}

interface GroupAssignment {
  group: string | ModifierGroup;
  isEnabled: boolean;
  requiredOverride: boolean | null;
  posOrder: number;
  websiteOrder: number;
  showOnPos: boolean;
  showOnWebsite: boolean;
}

interface MenuItem {
  _id: string;
  name: string;
  menuCode?: string;
  description?: string;
  pricePence: number;
  vatRate: 0 | 5 | 20;
  category: string | Category;
  isAvailable: boolean;
  backgroundColor?: string;
  textColor?: string;
  printOption?: string;
  images?: string[];
  modifierGroups: string[];
  groupAssignments?: GroupAssignment[];
  variationsEnabled?: boolean;
  variations?: Array<{
    _id?: string;
    name: string;
    priceDeltaPence: number;
    sku: string;
    isDefault?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }>;
  publishStatus?: 'draft' | 'published';
  channels?: {
    pos: boolean;
    website: boolean;
    mobile: boolean;
  };
}

interface ManualProduct {
  _id: string;
  name: string;
  code?: string;
  pricePence: number;
  category?: string | Category;
  description?: string;
  color?: string;
  printOption?: string;
  isActive: boolean;
}

interface ShortHand {
  _id: string;
  menuItem: string | MenuItem;
  shorthandCode: string;
  printOnReceipt: boolean;
  printOnTicket: boolean;
  isActive: boolean;
}

interface ProductTime {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const blankProductForm = {
  name: '',
  menuCode: '',
  description: '',
  pricePounds: '0.00',
  vatRate: 20 as 0 | 5 | 20,
  category: '',
  isAvailable: true,
  backgroundColor: '#1e293b',
  textColor: '#ffffff',
  printOption: 'both',
  imageUrl: '',
  selectedModifiers: [] as string[],
  groupAssignments: [] as GroupAssignment[],
  variationsEnabled: false,
  variations: [] as any[],
  publishStatus: 'published' as 'draft' | 'published',
  channels: {
    pos: true,
    website: true,
    mobile: true,
  }
};

const STEPS: Record<string, { title: string; steps: string[] }> = {
  dashboard: {
    title: 'Dashboard Guide',
    steps: ['Welcome to TakeawayPOS admin dashboard.'],
  },
  product: {
    title: "Product's Steps",
    steps: [
      'Manage categories and dishes.',
      'Tap "+" to add a folder or a product.',
      'Products must belong to a category.',
    ],
  },
  groups: {
    title: 'Group Guide',
    steps: [
      'Groups cluster choices (e.g. Size, Sauce).',
      'Toggle active to enable choices.',
    ],
  },
  component: {
    title: 'Component Guide',
    steps: [
      'Components are toppings or ingredients.',
      'Used inside modifier groups.',
    ],
  },
  label: {
    title: 'Label Guide',
    steps: [
      'Labels define quantity prefixes (e.g. NO, LESS).',
      'Can be created here and assigned to groups.',
    ],
  },
  'manual-product': {
    title: 'Manual Product Guide',
    steps: ['Manage ad-hoc manual override products.'],
  },
  'short-hand': {
    title: 'Shorthand Guide',
    steps: ['Shorthands define quick codes for checkout print rules.'],
  },
  department: {
    title: 'Department Guide',
    steps: ['Kitchen print routing departments.'],
  },
  'product-time': {
    title: 'Time Shift Guide',
    steps: ['Set shift-based menu availability windows.'],
  },
};

const cs = [
  { bg: "#b91c1c", text: "#ffffff", label: "Red" },
  { bg: "#f59e0b", text: "#ffffff", label: "Amber" },
  { bg: "#10b981", text: "#ffffff", label: "Emerald" },
  { bg: "#3b82f6", text: "#ffffff", label: "Blue" },
  { bg: "#8b5cf6", text: "#ffffff", label: "Violet" },
  { bg: "#ec4899", text: "#ffffff", label: "Pink" },
  { bg: "#1e293b", text: "#f8fafc", label: "Slate" },
];

const poundsInput = (pence: number) => toPounds(pence).toFixed(2);
const toPenceLocal = (pounds: number | string) => Math.round(parseFloat(String(pounds)) * 100) || 0;
const idOf = (val: any): string => (val && typeof val === 'object' ? val._id : val) || '';

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StepsPanel({ section }: { section: Section }) {
  const config = STEPS[section] || STEPS.product;
  return (
    <aside className="w-72 flex-shrink-0 border-l border-slate-900 bg-slate-950 p-6 flex flex-col overflow-y-auto">
      <h3 className="mb-5 text-sm font-extrabold text-slate-200 uppercase tracking-wider">{config.title}</h3>
      <ol className="space-y-4">
        {config.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-brand-400 text-xs font-black">
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-xs leading-relaxed text-slate-400" dangerouslySetInnerHTML={{ __html: step }} />
          </li>
        ))}
      </ol>
    </aside>
  );
}

function EmptyState({ message = 'No Data Found', subMessage = 'Add item to the list' }: { message?: string; subMessage?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 text-6xl opacity-30">🍽️</div>
      <p className="text-sm font-bold text-slate-400">{message}</p>
      <p className="mt-1 text-xs text-slate-600">{subMessage}</p>
    </div>
  );
}

function Pill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${active ? 'bg-emerald-400 shadow-md shadow-emerald-400/20' : 'bg-slate-600'}`}
    />
  );
}

interface ListRowProps {
  children: React.ReactNode;
  onManage?: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
  menuContent?: React.ReactNode;
  active?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  showToggle?: boolean;
  toggleChecked?: boolean;
  onToggle?: (v: boolean) => void;
}

function ListRow({
  children,
  onManage,
  onMenuClick,
  menuContent,
  active = true,
  selected,
  onSelect,
  showToggle,
  toggleChecked,
  onToggle,
}: ListRowProps) {
  return (
    <div className={`flex items-center gap-3 border-b border-slate-900 px-5 py-4 transition-colors hover:bg-slate-900/30 ${selected ? 'bg-brand-500/5' : ''}`}>
      {onSelect !== undefined && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500"
        />
      )}
      <Pill active={active} />
      <div className="flex flex-1 items-center gap-3 min-w-0">{children}</div>
      {showToggle && onToggle && (
        <ToggleSwitch checked={!!toggleChecked} onChange={onToggle} />
      )}
      {onManage && (
        <button
          onClick={onManage}
          className="flex-shrink-0 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-slate-100 cursor-pointer"
        >
          Manage
        </button>
      )}
      {onMenuClick && (
        <div className="relative flex-shrink-0">
          <button
            onClick={onMenuClick}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuContent}
        </div>
      )}
    </div>
  );
}

function ContextMenu({ items, onClose }: { items: { label: string; onClick: () => void; danger?: boolean }[]; onClose: () => void }) {
  return (
    <div
      className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-slate-800 bg-slate-900 py-1.5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`block w-full px-4 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
            item.danger
              ? 'text-rose-400 hover:bg-rose-950/20'
              : 'text-slate-350 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// redesigned modern dark theme Drawer layout & wrappers
function Drawer({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`${
          wide ? 'max-w-2xl' : 'max-w-md'
        } h-full w-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden relative`}
      >
        <header className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20 shrink-0">
          <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function DrawerInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all ${
        props.className || ''
      }`}
    />
  );
}

function DrawerSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all ${
        props.className || ''
      }`}
    />
  );
}

function DrawerToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function SaveButton({ label = 'Save Changes', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      type="submit"
      onClick={onClick}
      className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-[0.98] cursor-pointer"
    >
      {label}
    </button>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState<Section>('product');
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [stats, setStats] = useState({ todaySales: 0, orderCount: 0, avgTicket: 0, activeVoiceCalls: 0 });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([]);
  const [shortHands, setShortHands] = useState<ShortHand[]>([]);
  const [productTimes, setProductTimes] = useState<ProductTime[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  // Drawers state
  const [productDrawer, setProductDrawer] = useState<MenuItem | null | false>(false);
  const [productStep, setProductStep] = useState(0);
  const [productForm, setProductForm] = useState<any>(blankProductForm);

  const [groupDrawer, setGroupDrawer] = useState<ModifierGroup | null | false>(false);
  const [groupForm, setGroupForm] = useState<any>(null);

  const [addComponentPanel, setAddComponentPanel] = useState<string | null>(null); // groupId
  const [addComponentSelected, setAddComponentSelected] = useState<string[]>([]);

  const [simpleDrawer, setSimpleDrawer] = useState<null | { type: Section; item?: any }>(null);
  const [simpleActive, setSimpleActive] = useState(true);

  // Hex color picker bindings states
  const [catBgColor, setCatBgColor] = useState('#b91c1c');
  const [compColor, setCompColor] = useState('#1e293b');
  const [labelBgColor, setLabelBgColor] = useState('#334155');
  const [labelTextColor, setLabelTextColor] = useState('#ffffff');
  const [manualColor, setManualColor] = useState('#3b82f6');

  // Helper alert notifier
  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Check auth and bootstrap
  useEffect(() => {
    authApi.me()
      .then(() => {
        setIsAuthenticated(true);
        loadAll();
      })
      .catch(() => undefined);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await authApi.login({ username, password });
      setIsAuthenticated(true);
      loadAll();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setIsAuthenticated(false);
      setUsername('');
      setPassword('');
    } catch {
      setIsAuthenticated(false);
    }
  };

  const loadAll = async () => {
    try {
      const [catRes, itemRes, groupRes, compRes, labelRes, depRes, manRes, shRes, ptRes] = await Promise.all([
        menuApi.categories(),
        menuApi.items(),
        menuApi.modifierGroups(),
        menuApi.components(),
        menuApi.labels(),
        menuApi.departments(),
        menuApi.manualProducts().catch(() => ({ data: { manualProducts: [] } })),
        menuApi.shorthands().catch(() => ({ data: { shorthands: [] } })),
        menuApi.productTimes().catch(() => ({ data: { productTimes: [] } })),
      ]);
      setCategories(catRes.data.categories || []);
      setProducts(itemRes.data.items || []);
      setGroups(groupRes.data.modifiers || groupRes.data.modifierGroups || []);
      setComponents(compRes.data.components || []);
      setLabels(labelRes.data.labels || []);
      setDepartments(depRes.data.departments || []);
      setManualProducts(manRes.data.manualProducts || []);
      setShortHands(shRes.data.shorthands || []);
      setProductTimes(ptRes.data.productTimes || []);

      reportsApi.dashboard()
        .then((res) => setStats(res.data.stats || stats))
        .catch(() => undefined);
    } catch {
      setErrorMsg('Failed to load menu data.');
    }
  };

  // ── Filters & Computed ─────────────────────────────────────────────────────

  const filterRows = <T extends { name?: string; isActive?: boolean; isAvailable?: boolean }>(rows: T[]) => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => !term || (row.name || '').toLowerCase().includes(term));
  };

  const productCategories = useMemo(() => categories.filter((c) => c.isActive !== false), [categories]);
  const activeLabels = useMemo(() => labels.filter((l) => l.isActive !== false), [labels]);

  const toggleProductActive = async (product: MenuItem) => {
    try {
      await menuApi.updateItem(product._id, { isAvailable: !product.isAvailable });
      showFeedback('Product status updated.');
      await loadAll();
    } catch { /* noop */ }
  };

  const toggleComponentActive = async (comp: ComponentItem) => {
    try {
      await menuApi.updateComponent(comp._id, { isActive: !comp.isActive });
      showFeedback('Component status updated.');
      await loadAll();
    } catch { /* noop */ }
  };

  const deleteRecord = async (type: string, id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      if (type === 'departments') await menuApi.deleteDepartment(id);
      if (type === 'categories') await menuApi.deleteCategory(id);
      if (type === 'components') await menuApi.deleteComponent(id);
      if (type === 'labels') await menuApi.deleteLabel(id);
      if (type === 'groups') await menuApi.deleteModifierGroup(id);
      if (type === 'products') await menuApi.deleteItem(id);
      if (type === 'manual-products') await menuApi.deleteManualProduct(id);
      if (type === 'shorthands') await menuApi.deleteShortHand(id);
      if (type === 'product-times') await menuApi.deleteProductTime(id);
      showFeedback('Deleted.');
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Delete blocked because the record is in use.');
    }
  };

  // ── Simple Drawer Controls ──────────────────────────────────────────────────

  const openSimple = (type: Section, item?: any) => {
    setSimpleDrawer({ type, item });
    setSimpleActive(item ? item.isActive !== false : true);
    if (type === 'product') {
      setCatBgColor(item?.backgroundColor || '#b91c1c');
    }
    if (type === 'component') {
      setCompColor(item?.color || '#1e293b');
    }
    if (type === 'label') {
      setLabelBgColor(item?.backgroundColor || '#334155');
      setLabelTextColor(item?.textColor || '#ffffff');
    }
    if (type === 'manual-product') {
      setManualColor(item?.color || '#3b82f6');
    }
  };

  const saveSimple = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!simpleDrawer) return;
    const form = new FormData(e.currentTarget);
    const { type, item } = simpleDrawer;
    const base: any = { 
      name: String(form.get('name') || ''), 
      isActive: simpleActive 
    };

    try {
      if (type === 'department') {
        item ? await menuApi.updateDepartment(item._id, base) : await menuApi.createDepartment(base);
      }
      else if (type === 'product') {
        const payload = {
          ...base,
          displayOrder: Number(form.get('displayOrder') || 0),
          parent: String(form.get('parent') || '') || null,
          department: String(form.get('department') || '') || null,
          backgroundColor: catBgColor,
          textColor: '#ffffff',
          description: String(form.get('description') || ''),
        };
        item ? await menuApi.updateCategory(item._id, payload) : await menuApi.createCategory(payload);
      }
      else if (type === 'component') {
        const payload = {
          ...base,
          description: String(form.get('description') || ''),
          defaultPriceDeltaPence: toPenceLocal(Number(form.get('defaultPrice') || 0)),
          color: compColor,
          textColor: '#ffffff',
        };
        item ? await menuApi.updateComponent(item._id, payload) : await menuApi.createComponent(payload);
      }
      else if (type === 'label') {
        const payload = {
          ...base,
          backgroundColor: labelBgColor,
          textColor: labelTextColor,
        };
        item ? await menuApi.updateLabel(item._id, payload) : await menuApi.createLabel(payload);
      }
      else if (type === 'manual-product') {
        const payload = {
          ...base,
          code: String(form.get('code') || '') || null,
          pricePence: toPenceLocal(Number(form.get('pricePounds') || 0)),
          category: String(form.get('category') || '') || null,
          description: String(form.get('description') || ''),
          color: manualColor,
          printOption: String(form.get('printOption') || 'both'),
        };
        item ? await menuApi.updateManualProduct(item._id, payload) : await menuApi.createManualProduct(payload);
      }
      else if (type === 'short-hand') {
        const payload = {
          menuItem: String(form.get('menuItem') || ''),
          shorthandCode: String(form.get('shorthandCode') || ''),
          printOnReceipt: form.get('printOnReceipt') === 'on',
          printOnTicket: form.get('printOnTicket') === 'on',
          isActive: base.isActive,
        };
        item ? await menuApi.updateShortHand(item._id, payload) : await menuApi.createShortHand(payload);
      }
      else if (type === 'product-time') {
        const payload = {
          name: base.name,
          startTime: String(form.get('startTime') || '12:00'),
          endTime: String(form.get('endTime') || '22:00'),
          isActive: base.isActive,
        };
        item ? await menuApi.updateProductTime(item._id, payload) : await menuApi.createProductTime(payload);
      }

      setSimpleDrawer(null);
      showFeedback('Record saved successfully.');
      await loadAll();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Failed to save record.');
    }
  };

  // ── Product CRUD Actions ────────────────────────────────────────────────────

  const openProduct = (product?: MenuItem) => {
    setProductDrawer(product || null);
    setProductStep(0);
    if (product) {
      setProductForm({
        name: product.name,
        menuCode: product.menuCode || '',
        description: product.description || '',
        pricePounds: poundsInput(product.pricePence),
        vatRate: product.vatRate,
        category: typeof product.category === 'string' ? product.category : product.category?._id || '',
        isAvailable: product.isAvailable,
        backgroundColor: product.backgroundColor || '#1e293b',
        textColor: product.textColor || '#ffffff',
        printOption: product.printOption || 'both',
        imageUrl: product.images?.[0] || '',
        selectedModifiers: product.modifierGroups.map((g: any) => typeof g === 'string' ? g : g._id),
        publishStatus: product.publishStatus || 'published',
        channels: product.channels || { pos: true, website: true, mobile: true },
      });
    } else {
      setProductForm({
        ...blankProductForm,
        category: selectedCategory || productCategories[0]?._id || '',
      });
    }
  };

  const saveProduct = async () => {
    setErrorMsg('');
    const pricePence = toPenceLocal(productForm.pricePounds || 0);
    const payload = {
      name: productForm.name,
      menuCode: productForm.menuCode,
      description: productForm.description,
      pricePence,
      basePricePence: pricePence,
      vatRate: productForm.vatRate,
      category: productForm.category,
      isAvailable: productForm.isAvailable,
      backgroundColor: productForm.backgroundColor,
      textColor: productForm.textColor,
      printOption: productForm.printOption,
      images: productForm.imageUrl ? [productForm.imageUrl] : [],
      modifierGroups: productForm.selectedModifiers,
      publishStatus: productForm.publishStatus,
      channels: productForm.channels,
    };
    try {
      const editing = productDrawer as MenuItem | null;
      editing
        ? await menuApi.updateItem(editing._id, payload)
        : await menuApi.createItem(payload);
      setProductDrawer(false);
      showFeedback('Product saved.');
      await loadAll();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Could not save product.');
    }
  };

  // ── Modifier Group CRUD Actions ──────────────────────────────────────────────

  const openGroup = (group?: ModifierGroup) => {
    setGroupDrawer(group || null);
    if (group) {
      setGroupForm({
        name: group.name,
        displayName: group.displayName || '',
        dashboardHeading: group.dashboardHeading || '',
        staticLabelsEnabled: group.staticLabelsEnabled !== false,
        allowedLabelIds: (group.allowedLabelIds || []).map(idOf),
        samePrice: group.samePrice || false,
        samePricePounds: poundsInput(group.samePricePence || 0),
        type: group.type || 'optional',
        selectionType: group.selectionType || 'single',
        minSelections: group.minSelections || 0,
        maxSelections: group.maxSelections || 1,
        isActive: group.isActive !== false,
        options: (group.options || []).map((o, i) => ({
          component: idOf(o.component as any),
          name: o.name,
          pricePounds: poundsInput(o.priceDeltaPence || 0),
          isDefault: !!o.isDefault,
          sortOrder: o.sortOrder ?? i,
        })),
      });
    } else {
      setGroupForm({
        name: '',
        displayName: '',
        dashboardHeading: '',
        staticLabelsEnabled: true,
        allowedLabelIds: [],
        samePrice: false,
        samePricePounds: '0.00',
        type: 'optional',
        selectionType: 'single',
        minSelections: 0,
        maxSelections: 1,
        isActive: true,
        options: [],
      });
    }
  };

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm) return;
    setErrorMsg('');
    const samePricePence = toPenceLocal(groupForm.samePricePounds || 0);
    const payload = {
      name: groupForm.name,
      displayName: groupForm.displayName,
      dashboardHeading: groupForm.dashboardHeading,
      staticLabelsEnabled: groupForm.staticLabelsEnabled,
      allowedLabelIds: groupForm.allowedLabelIds,
      samePrice: groupForm.samePrice,
      samePricePence,
      type: groupForm.type,
      selectionType: groupForm.selectionType,
      minSelections: Number(groupForm.minSelections || 0),
      maxSelections: Number(groupForm.maxSelections || 1),
      options: groupForm.options.map((o: any) => ({
        component: o.component || null,
        name: o.name,
        priceDeltaPence: toPenceLocal(o.pricePounds || 0),
        isDefault: !!o.isDefault,
      })),
      isActive: groupForm.isActive,
    };
    try {
      const editing = groupDrawer as ModifierGroup | null;
      editing
        ? await menuApi.updateModifierGroup(editing._id, payload)
        : await menuApi.createModifierGroup(payload);
      setGroupDrawer(false);
      showFeedback('Modifier group saved.');
      await loadAll();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to save modifier group.');
    }
  };

  // ── Add Components to Group Panel ──────────────────────────────────────────

  const openAddComponentPanel = (groupId: string) => {
    setAddComponentPanel(groupId);
    const activeGp = groups.find(g => g._id === groupId);
    const activeCompIds = activeGp?.options?.map(o => idOf(o.component)) || [];
    setAddComponentSelected(activeCompIds);
  };

  const saveComponentsToGroup = async () => {
    if (!addComponentPanel) return;
    const activeGp = groups.find(g => g._id === addComponentPanel);
    if (!activeGp) return;

    const currentOptionsMap = new Map(activeGp.options.map(o => [idOf(o.component), o]));
    const newOptions = addComponentSelected.map((compId) => {
      const existing = currentOptionsMap.get(compId);
      if (existing) return existing;
      const comp = components.find(c => c._id === compId);
      return {
        component: compId,
        name: comp?.name || '',
        priceDeltaPence: comp?.defaultPriceDeltaPence || 0,
        isDefault: false
      };
    });

    const payload = {
      ...activeGp,
      allowedLabelIds: (activeGp.allowedLabelIds || []).map(idOf),
      options: newOptions
    };

    try {
      await menuApi.updateModifierGroup(addComponentPanel, payload);
      setAddComponentPanel(null);
      showFeedback('Components added to group.');
      await loadAll();
    } catch {
      setErrorMsg('Failed to update group components.');
    }
  };

  // ── Context Menu Helpers ────────────────────────────────────────────────────

  const getGroupContextMenu = (group: ModifierGroup) => [
    { label: 'Edit Group', onClick: () => openGroup(group) },
    { label: 'Add Existing Component', onClick: () => openAddComponentPanel(group._id) },
    { label: 'Delete Group', onClick: () => deleteRecord('groups', group._id), danger: true },
  ];

  const getSimpleContextMenu = (type: string, item: any) => {
    const labelText = activeSection === 'product-time' ? 'Shift' : activeSection;
    return [
      { label: `Edit ${labelText}`, onClick: () => openSimple(activeSection, item) },
      { label: `Delete ${labelText}`, onClick: () => deleteRecord(type, item._id), danger: true },
    ];
  };

  // Computed layout helpers for active folders list
  const topCategories = useMemo(() => categories.filter((c) => !c.parent), [categories]);
  const activeCategoryObject = selectedCategory ? categories.find((c) => c._id === selectedCategory) : null;
  const filteredProducts = useMemo(() => {
    return products.filter((u) => {
      const catId = typeof u.category === 'string' ? u.category : u.category?._id;
      if (selectedCategory) {
        const subCatIds = categories.filter((c) => idOf(c.parent) === selectedCategory).map((c) => c._id);
        return catId === selectedCategory || subCatIds.includes(catId || '');
      }
      return true;
    });
  }, [products, selectedCategory, categories]);

  const sectionLabel = useMemo(() => {
    if (activeSection === 'product') return 'Category';
    if (activeSection === 'groups') return 'Group';
    if (activeSection === 'component') return 'Component';
    if (activeSection === 'label') return 'Label';
    if (activeSection === 'manual-product') return 'Manual Product';
    if (activeSection === 'short-hand') return 'Shorthand';
    if (activeSection === 'department') return 'Department';
    if (activeSection === 'product-time') return 'Product Time';
    return 'Item';
  }, [activeSection]);

  // ─── Render app ─────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-sm glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10">
          <div className="flex items-center space-x-3 mb-6 justify-center">
            <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">TakeawayPOS Admin</h1>
              <p className="text-[10px] text-slate-400">Enterprise Backoffice Login</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200"
                placeholder="admin"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-brand-500/10 cursor-pointer"
            >
              Sign In to Management
            </button>
          </form>

          {(errorMsg || successMsg) && (
            <div className={`mt-4 flex items-center space-x-2 p-3 rounded-lg text-xs border ${
              errorMsg ? 'bg-red-950/40 border-red-500/20 text-red-405' : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg || successMsg}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ── Left Sidebar Nav ── */}
      <aside className={`w-60 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0`}>
        <div className="h-16 flex items-center space-x-2.5 px-5 border-b border-slate-900 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-wide">Backoffice Pro</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveSection('dashboard'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <div className="pt-3 pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Menu Configuration
          </div>

          <button
            onClick={() => { setActiveSection('product'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'product'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Products & Categories</span>
          </button>

          <button
            onClick={() => { setActiveSection('groups'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'groups'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Modifier Groups</span>
          </button>

          <button
            onClick={() => { setActiveSection('component'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'component'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Component Database</span>
          </button>

          <button
            onClick={() => { setActiveSection('label'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'label'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Label Instructions</span>
          </button>

          <button
            onClick={() => { setActiveSection('manual-product'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'manual-product'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Manual Product</span>
          </button>

          <button
            onClick={() => { setActiveSection('short-hand'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'short-hand'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Short Hand Codes</span>
          </button>

          <button
            onClick={() => { setActiveSection('department'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'department'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Departments</span>
          </button>

          <button
            onClick={() => { setActiveSection('product-time'); setSearch(''); setContextMenuId(null); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'product-time'
                ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Product Time Shift</span>
          </button>
        </nav>

        <div className="p-3 border-t border-slate-900 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Panel ── */}
      <main className="flex-1 flex flex-col bg-slate-900/10 overflow-hidden">
        <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 bg-slate-950/20">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
            {activeSection.replace('-', ' ')} MANAGEMENT
          </h2>

          <div className="flex items-center space-x-4">
            {/* Search Input */}
            {activeSection !== 'dashboard' && (
              <div className="relative w-56">
                <span className="absolute left-3 top-2 text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-855 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-350 focus:border-brand-500"
                />
              </div>
            )}

            {/* Quick Alert Notifiers */}
            {(errorMsg || successMsg) && (
              <div className={`px-4 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 ${
                successMsg ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/30 border-rose-500/30 text-rose-450'
              }`}>
                <span>{successMsg || errorMsg}</span>
              </div>
            )}

            {/* Add Record Buttons */}
            {activeSection !== 'dashboard' && activeSection !== 'product' && (
              <button
                onClick={() => openSimple(activeSection)}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create {sectionLabel}</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main workspace scrolling list area */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* 1. Dashboard View */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
                    <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center text-brand-400">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Today's Sales</span>
                      <h3 className="text-lg font-extrabold mt-0.5 text-slate-100">{poundsInput(stats.todaySales)}</h3>
                    </div>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Orders</span>
                      <h3 className="text-lg font-extrabold mt-0.5 text-slate-100">{stats.orderCount}</h3>
                    </div>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
                    <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Average Ticket</span>
                      <h3 className="text-lg font-extrabold mt-0.5 text-slate-100">{poundsInput(stats.avgTicket)}</h3>
                    </div>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
                    <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-450">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Phone Agent Calls</span>
                      <h3 className="text-lg font-extrabold mt-0.5 text-slate-100">{stats.activeVoiceCalls}</h3>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-350 tracking-wider">Printer Routing Servers</h4>
                    <div className="space-y-3">
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Stripe Payments API</span>
                        <p className="text-xs text-slate-400 font-semibold mt-1">Mock Mode (Dev)</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Kitchen ESC/POS Printer</span>
                        <p className="text-xs text-slate-400 font-semibold mt-1">Listening on TCP/9100</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-350 tracking-wider">System Parameters</h4>
                    <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-855 text-xs text-slate-400 space-y-2">
                      <div className="flex justify-between">
                        <span>Database Engines:</span>
                        <span className="font-semibold text-slate-300">MongoDB Core</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Systems:</span>
                        <span className="font-semibold text-slate-300">MemoryCache Context</span>
                      </div>
                      <div className="flex justify-between">
                        <span>POS Terminals Connected:</span>
                        <span className="font-semibold text-slate-300">2 Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Product and Categories View */}
            {activeSection === 'product' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full items-start">
                {/* Categories folder tree */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Folders</span>
                    <button
                      onClick={() => openSimple('product')}
                      className="p-1 hover:bg-slate-800 text-brand-400 rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        selectedCategory === null ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>All Curries & Items</span>
                    </button>

                    {topCategories.map((u) => {
                      const subcats = categories.filter((c) => idOf(c.parent) === u._id);
                      return (
                        <div key={u._id} className="space-y-0.5">
                          <div className="group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors hover:bg-slate-800/40">
                            <button
                              onClick={() => setSelectedCategory(u._id)}
                              className={`flex-1 flex items-center space-x-2 text-left cursor-pointer ${
                                selectedCategory === u._id ? 'text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: u.backgroundColor || '#b91c1c' }} />
                              <span className="truncate">{u.name}</span>
                            </button>
                            <div className="hidden group-hover:flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => openSimple('product', u)}
                                className="p-0.5 text-slate-500 hover:text-brand-400 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRecord('categories', u._id)}
                                className="p-0.5 text-slate-500 hover:text-rose-450 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {subcats.length > 0 && (
                            <div className="pl-6 border-l border-slate-800 space-y-0.5">
                              {subcats.map((sub) => (
                                <div
                                  key={sub._id}
                                  className="group flex items-center justify-between px-3 py-1 rounded-lg text-[11px] font-medium hover:bg-slate-800/40"
                                >
                                  <button
                                    onClick={() => setSelectedCategory(sub._id)}
                                    className={`flex-1 text-left truncate cursor-pointer ${
                                      selectedCategory === sub._id ? 'text-brand-400 font-bold' : 'text-slate-500 hover:text-slate-350'
                                    }`}
                                  >
                                    ↳ {sub.name}
                                  </button>
                                  <div className="hidden group-hover:flex items-center space-x-1 shrink-0">
                                    <button
                                      onClick={() => openSimple('product', sub)}
                                      className="p-0.5 text-slate-600 hover:text-brand-400 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteRecord('categories', sub._id)}
                                      className="p-0.5 text-slate-600 hover:text-rose-450 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Products Table Area */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-200 uppercase">
                        {activeCategoryObject ? activeCategoryObject.name : 'ALL MENU ITEMS'}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Products list inside folder. Click Create Product to add menu items.
                      </p>
                    </div>

                    <button
                      onClick={() => openProduct()}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Product</span>
                    </button>
                  </div>

                  <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                    {filterRows(filteredProducts).length === 0 ? (
                      <EmptyState message="No Products Found" subMessage="Click '+' to add a product" />
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            <th className="p-4 pl-6">Grid/Visual</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Category Folder</th>
                            <th className="p-4 text-right">Price</th>
                            <th className="p-4 text-center">Active</th>
                            <th className="p-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-xs">
                          {filterRows(filteredProducts).map((u) => {
                            const catText = categories.find((c) => c._id === idOf(u.category))?.name || 'Unassigned';
                            return (
                              <tr key={u._id} className="hover:bg-slate-900/20 text-slate-300">
                                <td className="p-4 pl-6">
                                  <div
                                    className="w-16 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border border-slate-800"
                                    style={{ backgroundColor: u.backgroundColor || '#1e293b', color: u.textColor || '#ffffff' }}
                                  >
                                    GRID
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="font-semibold text-slate-100">{u.name}</div>
                                  <div className="text-[10px] text-slate-500">{u.menuCode || 'NO CODE'}</div>
                                </td>
                                <td className="p-4 font-semibold text-slate-400">{catText}</td>
                                <td className="p-4 text-right font-bold text-slate-200">£{poundsInput(u.pricePence)}</td>
                                <td className="p-4 text-center">
                                  <ToggleSwitch checked={u.isAvailable} onChange={() => toggleProductActive(u)} />
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => openProduct(u)}
                                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteRecord('products', u._id)}
                                      className="p-1.5 hover:bg-slate-800 text-rose-500 hover:text-rose-450 rounded-lg cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Modifier Groups View */}
            {activeSection === 'groups' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(groups).length === 0 ? (
                    <EmptyState message="No Modifier Groups Found" subMessage="Click '+' to add a group" />
                  ) : (
                    filterRows(groups).map((group) => (
                      <ListRow
                        key={group._id}
                        active={group.isActive}
                        onManage={() => openGroup(group)}
                        onMenuClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === group._id ? null : group._id);
                        }}
                        menuContent={contextMenuId === group._id ? (
                          <ContextMenu
                            items={getGroupContextMenu(group)}
                            onClose={() => setContextMenuId(null)}
                          />
                        ) : undefined}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-slate-100">{group.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {group.options?.length || 0} options · {group.selectionType} select mode
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-855 px-2 py-1 rounded">
                          {group.type}
                        </span>
                      </ListRow>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. Components View */}
            {activeSection === 'component' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(components).length === 0 ? (
                    <EmptyState message="No Components Found" subMessage="Click '+' to add a component" />
                  ) : (
                    filterRows(components).map((comp) => (
                      <ListRow
                        key={comp._id}
                        active={comp.isActive}
                        onManage={() => openSimple('component', comp)}
                        onMenuClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === comp._id ? null : comp._id);
                        }}
                        menuContent={contextMenuId === comp._id ? (
                          <ContextMenu
                            items={getSimpleContextMenu('components', comp)}
                            onClose={() => setContextMenuId(null)}
                          />
                        ) : undefined}
                        showToggle
                        toggleChecked={comp.isActive}
                        onToggle={() => toggleComponentActive(comp)}
                      >
                        <div className="flex h-7 w-7 rounded-lg shrink-0 border border-slate-855" style={{ backgroundColor: comp.color || '#1e293b' }} />
                        <div className="flex-1 truncate">
                          <span className="font-bold uppercase text-slate-100">{comp.name}</span>
                          {comp.description && (
                            <p className="text-[10px] text-slate-500 truncate">{comp.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-200 shrink-0">
                          +£{poundsInput(comp.defaultPriceDeltaPence)}
                        </span>
                      </ListRow>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. Labels View */}
            {activeSection === 'label' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(labels).length === 0 ? (
                    <EmptyState message="No Labels Found" subMessage="Click '+' to add a label instruction" />
                  ) : (
                    filterRows(labels).map((lbl) => (
                      <ListRow
                        key={lbl._id}
                        active={lbl.isActive}
                        onManage={() => openSimple('label', lbl)}
                        onMenuClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === lbl._id ? null : lbl._id);
                        }}
                        menuContent={contextMenuId === lbl._id ? (
                          <ContextMenu
                            items={getSimpleContextMenu('labels', lbl)}
                            onClose={() => setContextMenuId(null)}
                          />
                        ) : undefined}
                      >
                        <div className="flex-1 flex items-center space-x-3">
                          <span
                            className="rounded px-2.5 py-0.5 text-xs font-bold shrink-0 border border-slate-800/20"
                            style={{ backgroundColor: lbl.backgroundColor, color: lbl.textColor }}
                          >
                            {lbl.name}
                          </span>
                          <span className="text-[10px] text-slate-500">Preset visual overlay chip style</span>
                        </div>
                      </ListRow>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 6. Manual Products View */}
            {activeSection === 'manual-product' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(manualProducts).length === 0 ? (
                    <EmptyState message="No Manual Products Found" subMessage="Click '+' to create an ad-hoc product" />
                  ) : (
                    filterRows(manualProducts).map((mp) => (
                      <ListRow
                        key={mp._id}
                        active={mp.isActive}
                        onManage={() => openSimple('manual-product', mp)}
                        onMenuClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === mp._id ? null : mp._id);
                        }}
                        menuContent={contextMenuId === mp._id ? (
                          <ContextMenu
                            items={getSimpleContextMenu('manual-products', mp)}
                            onClose={() => setContextMenuId(null)}
                          />
                        ) : undefined}
                      >
                        <div className="flex h-7 w-7 rounded-lg shrink-0 border border-slate-855" style={{ backgroundColor: mp.color || '#3b82f6' }} />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-100">{mp.name}</div>
                          <div className="text-[10px] text-slate-500">{mp.code || 'NO CODE'}</div>
                        </div>
                        <span className="text-xs font-bold text-slate-200">
                          £{poundsInput(mp.pricePence)}
                        </span>
                      </ListRow>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. Short Hand View */}
            {activeSection === 'short-hand' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(shortHands).length === 0 ? (
                    <EmptyState message="No Shorthands Found" subMessage="Click '+' to map a shortcut" />
                  ) : (
                    filterRows(shortHands).map((sh) => {
                      const itemText = typeof sh.menuItem === 'object' && sh.menuItem ? sh.menuItem.name : products.find(p => p._id === sh.menuItem)?.name || 'Unknown item';
                      return (
                        <ListRow
                          key={sh._id}
                          active={sh.isActive}
                          onManage={() => openSimple('short-hand', sh)}
                          onMenuClick={(e) => {
                            e.stopPropagation();
                            setContextMenuId(contextMenuId === sh._id ? null : sh._id);
                          }}
                          menuContent={contextMenuId === sh._id ? (
                            <ContextMenu
                              items={getSimpleContextMenu('shorthands', sh)}
                              onClose={() => setContextMenuId(null)}
                            />
                          ) : undefined}
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-slate-100">{sh.shorthandCode}</div>
                            <div className="text-[10px] text-slate-500">Maps directly to: {itemText}</div>
                          </div>
                          <div className="flex gap-2 text-[10px] uppercase font-bold">
                            {sh.printOnReceipt && <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">Receipt</span>}
                            {sh.printOnTicket && <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-brand-400">Kitchen</span>}
                          </div>
                        </ListRow>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 8. Kitchen Departments View */}
            {activeSection === 'department' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(departments).length === 0 ? (
                    <EmptyState message="No Departments Found" subMessage="Click '+' to add a printer department" />
                  ) : (
                    filterRows(departments).map((dept) => (
                      <ListRow
                        key={dept._id}
                        active={dept.isActive}
                        onManage={() => openSimple('department', dept)}
                        onMenuClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === dept._id ? null : dept._id);
                        }}
                        menuContent={contextMenuId === dept._id ? (
                          <ContextMenu
                            items={getSimpleContextMenu('departments', dept)}
                            onClose={() => setContextMenuId(null)}
                          />
                        ) : undefined}
                      >
                        <div className="flex-1">
                          <span className="font-extrabold uppercase text-slate-100 tracking-wider">{dept.name}</span>
                        </div>
                      </ListRow>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 9. Product times View */}
            {activeSection === 'product-time' && (
              <div className="space-y-4">
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  {filterRows(productTimes).length === 0 ? (
                    <EmptyState message="No Time Slots Configured" subMessage="Click '+' to add a shift slot" />
                  ) : (
                    filterRows(productTimes).map((pt) => (
                      <ListRow
                        key={pt._id}
                        active={pt.isActive}
                        onManage={() => openSimple('product-time', pt)}
                        onMenuClick={(e) => {
                          e.stopPropagation();
                          setContextMenuId(contextMenuId === pt._id ? null : pt._id);
                        }}
                        menuContent={contextMenuId === pt._id ? (
                          <ContextMenu
                            items={getSimpleContextMenu('product-times', pt)}
                            onClose={() => setContextMenuId(null)}
                          />
                        ) : undefined}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-slate-100">{pt.name}</div>
                          <div className="text-[10px] text-slate-500">{pt.startTime} – {pt.endTime} hours</div>
                        </div>
                      </ListRow>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Help Instructions Steps Panel */}
          <StepsPanel section={activeSection} />
        </div>
      </main>

      {/* ─── Drawers and Slide-ins ───────────────────────────────────────────── */}

      {/* 1. Simple entity Drawers (Category/Folder, Component, Label, ManualProduct, ShortHand, Department, ProductTime) */}
      {simpleDrawer && (
        <Drawer
          title={`${simpleDrawer.item ? 'Update' : 'Create'} ${
            simpleDrawer.type === 'product' ? 'Category' : sectionLabel
          }`}
          onClose={() => setSimpleDrawer(null)}
        >
          <form onSubmit={saveSimple} className="space-y-5">
            <DrawerField label={simpleDrawer.type === 'product' ? 'Category Name' : `${sectionLabel} Name`}>
              <DrawerInput 
                name="name" 
                defaultValue={simpleDrawer.item?.name || ''} 
                required 
                placeholder={`e.g. Enter ${simpleDrawer.type === 'product' ? 'category' : sectionLabel.toLowerCase()}...`}
              />
            </DrawerField>

            {simpleDrawer.type === 'product' && (
              <>
                <DrawerField label="Category Description">
                  <textarea
                    name="description"
                    defaultValue={simpleDrawer.item?.description || ''}
                    maxLength={150}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all focus:outline-none"
                    placeholder="Describe this category folder..."
                  />
                </DrawerField>

                <DrawerField label="Parent Category (For Sub-categories)">
                  <DrawerSelect name="parent" defaultValue={idOf(simpleDrawer.item?.parent)}>
                    <option value="">None (Top Level Category)</option>
                    {categories.filter(c => !c.parent && c._id !== simpleDrawer.item?._id).map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Printer Route Department">
                  <DrawerSelect name="department" defaultValue={idOf(simpleDrawer.item?.department)}>
                    <option value="">No Routing (Default)</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Sort displayOrder">
                  <DrawerInput 
                    type="number" 
                    name="displayOrder" 
                    defaultValue={simpleDrawer.item?.displayOrder || categories.length + 1} 
                    required 
                  />
                </DrawerField>

                <DrawerField label="Category Preset Colors">
                  <div className="grid grid-cols-4 gap-2">
                    {cs.map((u) => (
                      <button
                        key={u.bg}
                        type="button"
                        onClick={() => setCatBgColor(u.bg)}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                          catBgColor === u.bg ? 'border-brand-500 scale-105 shadow' : 'border-slate-800 hover:border-slate-700'
                        }`}
                        style={{ backgroundColor: u.bg, color: u.text }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </DrawerField>

                <DrawerField label="Custom Background Color Sync">
                  <div className="flex gap-2">
                    <DrawerInput 
                      value={catBgColor} 
                      onChange={(e) => setCatBgColor(e.target.value)} 
                      className="flex-1 font-mono uppercase"
                    />
                    <input 
                      type="color" 
                      value={catBgColor} 
                      onChange={(e) => setCatBgColor(e.target.value)} 
                      className="w-12 h-10 bg-transparent border-0 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </DrawerField>
              </>
            )}

            {simpleDrawer.type === 'component' && (
              <>
                <DrawerField label="Default Price Surcharge (GBP)">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
                    <DrawerInput 
                      type="number" 
                      step="0.01" 
                      name="defaultPrice" 
                      defaultValue={simpleDrawer.item ? poundsInput(simpleDrawer.item.defaultPriceDeltaPence) : '0.00'} 
                      required 
                      className="pl-8"
                    />
                  </div>
                </DrawerField>

                <DrawerField label="Description">
                  <textarea
                    name="description"
                    defaultValue={simpleDrawer.item?.description || ''}
                    maxLength={150}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all focus:outline-none"
                    placeholder="Optional details..."
                  />
                </DrawerField>

                <DrawerField label="Component Button Color presets">
                  <div className="grid grid-cols-4 gap-2">
                    {cs.map((u) => (
                      <button
                        key={u.bg}
                        type="button"
                        onClick={() => setCompColor(u.bg)}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                          compColor === u.bg ? 'border-brand-500 scale-105 shadow' : 'border-slate-800 hover:border-slate-700'
                        }`}
                        style={{ backgroundColor: u.bg, color: u.text }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </DrawerField>

                <DrawerField label="Custom Color Sync">
                  <div className="flex gap-2">
                    <DrawerInput 
                      value={compColor} 
                      onChange={(e) => setCompColor(e.target.value)} 
                      className="flex-1 font-mono uppercase"
                    />
                    <input 
                      type="color" 
                      value={compColor} 
                      onChange={(e) => setCompColor(e.target.value)} 
                      className="w-12 h-10 bg-transparent border-0 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </DrawerField>
              </>
            )}

            {simpleDrawer.type === 'label' && (
              <>
                <DrawerField label="Label Color Presets">
                  <div className="grid grid-cols-4 gap-2">
                    {cs.map((u) => (
                      <button
                        key={u.bg}
                        type="button"
                        onClick={() => { setLabelBgColor(u.bg); setLabelTextColor(u.text); }}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                          labelBgColor === u.bg ? 'border-brand-500 scale-105 shadow' : 'border-slate-800 hover:border-slate-700'
                        }`}
                        style={{ backgroundColor: u.bg, color: u.text }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </DrawerField>

                <DrawerField label="Label Background Color Sync">
                  <div className="flex gap-2">
                    <DrawerInput 
                      value={labelBgColor} 
                      onChange={(e) => setLabelBgColor(e.target.value)} 
                      className="flex-1 font-mono uppercase"
                    />
                    <input 
                      type="color" 
                      value={labelBgColor} 
                      onChange={(e) => setLabelBgColor(e.target.value)} 
                      className="w-12 h-10 bg-transparent border-0 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </DrawerField>

                <DrawerField label="Label Text Color Sync">
                  <div className="flex gap-2">
                    <DrawerInput 
                      value={labelTextColor} 
                      onChange={(e) => setLabelTextColor(e.target.value)} 
                      className="flex-1 font-mono uppercase"
                    />
                    <input 
                      type="color" 
                      value={labelTextColor} 
                      onChange={(e) => setLabelTextColor(e.target.value)} 
                      className="w-12 h-10 bg-transparent border-0 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </DrawerField>
              </>
            )}

            {simpleDrawer.type === 'manual-product' && (
              <>
                <DrawerField label="Quick Code">
                  <DrawerInput 
                    name="code" 
                    defaultValue={simpleDrawer.item?.code || ''} 
                    placeholder="e.g. MAN-99"
                  />
                </DrawerField>

                <DrawerField label="Price (GBP)">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
                    <DrawerInput 
                      type="number" 
                      step="0.01" 
                      name="pricePounds" 
                      defaultValue={simpleDrawer.item ? poundsInput(simpleDrawer.item.pricePence) : '0.00'} 
                      required 
                      className="pl-8"
                    />
                  </div>
                </DrawerField>

                <DrawerField label="Target Category Folder">
                  <DrawerSelect name="category" defaultValue={idOf(simpleDrawer.item?.category)}>
                    <option value="">Unassigned Folder</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Kitchen Print Routing">
                  <DrawerSelect name="printOption" defaultValue={simpleDrawer.item?.printOption || 'both'}>
                    <option value="both">Both Receipt and Chef Ticket</option>
                    <option value="ticket">Chef Ticket Only</option>
                    <option value="receipt">Customer Receipt Only</option>
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Description">
                  <textarea
                    name="description"
                    defaultValue={simpleDrawer.item?.description || ''}
                    maxLength={150}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all focus:outline-none"
                    placeholder="Describe ingredients..."
                  />
                </DrawerField>

                <DrawerField label="Visual button color sync">
                  <div className="flex gap-2">
                    <DrawerInput 
                      value={manualColor} 
                      onChange={(e) => setManualColor(e.target.value)} 
                      className="flex-1 font-mono uppercase"
                    />
                    <input 
                      type="color" 
                      value={manualColor} 
                      onChange={(e) => setManualColor(e.target.value)} 
                      className="w-12 h-10 bg-transparent border-0 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </DrawerField>
              </>
            )}

            {simpleDrawer.type === 'short-hand' && (
              <>
                <DrawerField label="Target Menu Item">
                  <DrawerSelect name="menuItem" defaultValue={idOf(simpleDrawer.item?.menuItem)}>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Shorthand Abbreviation Code">
                  <DrawerInput 
                    name="shorthandCode" 
                    defaultValue={simpleDrawer.item?.shorthandCode || ''} 
                    required 
                    placeholder="e.g. Marg"
                  />
                </DrawerField>

                <div className="space-y-3 pt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-855">
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="printOnReceipt" 
                      defaultChecked={simpleDrawer.item ? !!simpleDrawer.item.printOnReceipt : false} 
                      className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
                    />
                    <span>Print Shorthand on Customer Receipt</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="printOnTicket" 
                      defaultChecked={simpleDrawer.item ? !!simpleDrawer.item.printOnTicket : true} 
                      className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
                    />
                    <span>Print Shorthand on Kitchen Chef Ticket</span>
                  </label>
                </div>
              </>
            )}

            {simpleDrawer.type === 'product-time' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <DrawerField label="Start Time">
                    <DrawerInput 
                      name="startTime" 
                      defaultValue={simpleDrawer.item?.startTime || '12:00'} 
                      required 
                      placeholder="e.g. 12:00"
                    />
                  </DrawerField>
                  <DrawerField label="End Time">
                    <DrawerInput 
                      name="endTime" 
                      defaultValue={simpleDrawer.item?.endTime || '22:00'} 
                      required 
                      placeholder="e.g. 22:00"
                    />
                  </DrawerField>
                </div>
              </>
            )}

            <DrawerToggleRow 
              label="Active" 
              checked={simpleActive} 
              onChange={(v) => setSimpleActive(v)} 
            />
            <input type="hidden" name="isActive" value={simpleActive ? 'on' : 'off'} />

            <SaveButton />
          </form>
        </Drawer>
      )}

      {/* 2. Modifier Group Drawer */}
      {groupDrawer !== false && groupForm && (
        <Drawer
          title={groupDrawer ? 'Edit Modifier Group' : 'Create Modifier Group'}
          onClose={() => setGroupDrawer(false)}
          wide
        >
          <form onSubmit={saveGroup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Internal Group Title">
                <DrawerInput 
                  value={groupForm.name} 
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} 
                  required 
                  placeholder="e.g. Choose size"
                />
              </DrawerField>
              <DrawerField label="Customer Display Name">
                <DrawerInput 
                  value={groupForm.displayName} 
                  onChange={(e) => setGroupForm({ ...groupForm, displayName: e.target.value })} 
                  placeholder="e.g. Pizza Size"
                />
              </DrawerField>
            </div>

            <DrawerField label="Dashboard Header Overlay">
              <DrawerInput 
                value={groupForm.dashboardHeading} 
                onChange={(e) => setGroupForm({ ...groupForm, dashboardHeading: e.target.value })} 
                placeholder="e.g. EXTRA ADDONS FOR PIZZAS"
              />
            </DrawerField>

            <div className="grid grid-cols-3 gap-3">
              <DrawerField label="Select Mode">
                <DrawerSelect 
                  value={groupForm.selectionType} 
                  onChange={(e) => setGroupForm({ ...groupForm, selectionType: e.target.value })}
                >
                  <option value="single">Single Select</option>
                  <option value="multiple">Multiple Select</option>
                </DrawerSelect>
              </DrawerField>
              
              <DrawerField label="Min Selections">
                <DrawerInput 
                  type="number" 
                  value={groupForm.minSelections} 
                  onChange={(e) => setGroupForm({ ...groupForm, minSelections: parseInt(e.target.value) || 0 })} 
                />
              </DrawerField>

              <DrawerField label="Max Selections">
                <DrawerInput 
                  type="number" 
                  value={groupForm.maxSelections} 
                  onChange={(e) => setGroupForm({ ...groupForm, maxSelections: parseInt(e.target.value) || 1 })} 
                />
              </DrawerField>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
              <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupForm.samePrice}
                  onChange={(e) => setGroupForm({ ...groupForm, samePrice: e.target.checked })}
                  className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
                />
                <span>Same Price For Options</span>
              </label>

              {groupForm.samePrice && (
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-500 text-xs">£</span>
                  <DrawerInput 
                    type="number" 
                    step="0.01" 
                    value={groupForm.samePricePounds} 
                    onChange={(e) => setGroupForm({ ...groupForm, samePricePounds: e.target.value })} 
                    className="pl-6 pr-2 py-1.5"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={groupForm.staticLabelsEnabled}
                onChange={(e) => setGroupForm({ ...groupForm, staticLabelsEnabled: e.target.checked })}
                className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
              />
              <span>Enable quantity modify Labels (LESS, NO, ON HALF)</span>
            </label>

            {/* Components Options Rows */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selectable Option components</span>
                <button
                  type="button"
                  onClick={() => setGroupForm({
                    ...groupForm,
                    options: [
                      ...groupForm.options,
                      { component: '', name: '', pricePounds: '0.00', isDefault: false }
                    ]
                  })}
                  className="text-[10px] font-bold text-brand-400 hover:text-brand-350 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option Row</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto p-2.5 bg-slate-950 rounded-xl border border-slate-900">
                {groupForm.options.map((o: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                    <select
                      value={o.component}
                      onChange={(e) => {
                        const compId = e.target.value;
                        const matchComp = components.find(c => c._id === compId);
                        const newName = matchComp ? matchComp.name : '';
                        const newPrice = matchComp ? poundsInput(matchComp.defaultPriceDeltaPence) : '0.00';
                        const updated = [...groupForm.options];
                        updated[idx] = {
                          ...updated[idx],
                          component: compId,
                          name: newName,
                          pricePounds: newPrice
                        };
                        setGroupForm({ ...groupForm, options: updated });
                      }}
                      className="bg-slate-950 border border-slate-855 rounded px-2 py-1.5 text-[11px] text-slate-200 flex-1"
                    >
                      <option value="">-- Choose Component --</option>
                      {components.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      value={o.name}
                      onChange={(e) => {
                        const updated = [...groupForm.options];
                        updated[idx].name = e.target.value;
                        setGroupForm({ ...groupForm, options: updated });
                      }}
                      placeholder="Display Name"
                      className="w-24 bg-slate-950 border border-slate-855 rounded px-2 py-1.5 text-[11px] text-slate-200"
                    />

                    {!groupForm.samePrice && (
                      <div className="relative w-16">
                        <span className="absolute left-1.5 top-1.5 text-slate-500 text-[10px]">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={o.pricePounds}
                          onChange={(e) => {
                            const updated = [...groupForm.options];
                            updated[idx].pricePounds = e.target.value;
                            setGroupForm({ ...groupForm, options: updated });
                          }}
                          className="w-full bg-slate-950 border border-slate-855 rounded pl-4 pr-1 py-1.5 text-[10px] text-slate-200 text-right"
                        />
                      </div>
                    )}

                    <label className="flex items-center space-x-1 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={o.isDefault}
                        onChange={(e) => {
                          const updated = [...groupForm.options];
                          if (groupForm.selectionType === 'single' && e.target.checked) {
                            updated.forEach(item => item.isDefault = false);
                          }
                          updated[idx].isDefault = e.target.checked;
                          setGroupForm({ ...groupForm, options: updated });
                        }}
                        className="rounded text-brand-500 bg-slate-950 border-slate-855 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-slate-500">Def</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setGroupForm({
                        ...groupForm,
                        options: groupForm.options.filter((_: any, i: number) => i !== idx)
                      })}
                      className="p-1 hover:bg-slate-800 text-rose-500 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {groupForm.options.length === 0 && (
                  <span className="text-[10px] text-slate-500 block text-center py-4">
                    No custom component items added. Link components above.
                  </span>
                )}
              </div>
            </div>

            {/* Allowed Labels Selector */}
            {groupForm.staticLabelsEnabled && activeLabels.length > 0 && (
              <div className="rounded-lg border border-slate-855 bg-slate-950/40 p-4">
                <p className="mb-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Allowed Labels</p>
                <div className="grid grid-cols-2 gap-3">
                  {activeLabels.map((lbl) => (
                    <label key={lbl._id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={groupForm.allowedLabelIds.includes(lbl._id)}
                        onChange={(e) => setGroupForm({
                          ...groupForm,
                          allowedLabelIds: e.target.checked
                            ? [...groupForm.allowedLabelIds, lbl._id]
                            : groupForm.allowedLabelIds.filter((id: string) => id !== lbl._id),
                        })}
                        className="h-4 w-4 rounded border-slate-855 bg-slate-950 text-brand-500"
                      />
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: lbl.backgroundColor, color: lbl.textColor }}
                      >
                        {lbl.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DrawerToggleRow 
              label="Group Active" 
              checked={groupForm.isActive} 
              onChange={(v) => setGroupForm({ ...groupForm, isActive: v })} 
            />

            <SaveButton />
          </form>
        </Drawer>
      )}

      {/* 3. Product Wizard Drawer (Multi-step) */}
      {productDrawer !== false && (
        <Drawer
          title={productDrawer ? 'Edit Product' : 'Create Product'}
          onClose={() => setProductDrawer(false)}
          wide
        >
          <div className="space-y-5">
            {/* Step tabs wizard header */}
            <div className="flex gap-1 rounded-xl bg-slate-950/60 p-1 border border-slate-855 shrink-0">
              {['Basic', 'Route', 'Sizes', 'Groups', 'Channels', 'Preview'].map((step, i) => (
                <button
                  key={step}
                  onClick={() => setProductStep(i)}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    productStep === i 
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            {/* Step 0: Basic Details */}
            {productStep === 0 && (
              <div className="space-y-4">
                <DrawerField label="Product Name">
                  <DrawerInput 
                    value={productForm.name} 
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} 
                    required 
                    placeholder="e.g. CHICKEN JALFREZI"
                  />
                </DrawerField>

                <DrawerField label="Base Price (£)">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
                    <DrawerInput 
                      type="number" 
                      step="0.01" 
                      value={productForm.pricePounds} 
                      onChange={(e) => setProductForm({ ...productForm, pricePounds: e.target.value })} 
                      required 
                      className="pl-8"
                    />
                  </div>
                </DrawerField>

                <DrawerField label="VAT Rate">
                  <DrawerSelect 
                    value={productForm.vatRate} 
                    onChange={(e) => setProductForm({ ...productForm, vatRate: Number(e.target.value) })}
                  >
                    {UK_VAT_RATES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Product Description">
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    maxLength={150}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all focus:outline-none"
                    placeholder="Ingredients summary..."
                  />
                </DrawerField>

                <DrawerField label="Product Image URL">
                  <DrawerInput 
                    value={productForm.imageUrl} 
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} 
                    placeholder="e.g. https://images.unsplash.com/..."
                  />
                </DrawerField>
              </div>
            )}

            {/* Step 1: Print Routing / category */}
            {productStep === 1 && (
              <div className="space-y-4">
                <DrawerField label="Target Category Folder">
                  <DrawerSelect 
                    value={productForm.category} 
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    {productCategories.map((c) => (
                      <option key={c._id} value={c._id}>{c.parent ? `↳ ${c.name}` : c.name}</option>
                    ))}
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Menu/Kitchen Code">
                  <DrawerInput 
                    value={productForm.menuCode} 
                    onChange={(e) => setProductForm({ ...productForm, menuCode: e.target.value })} 
                    placeholder="e.g. CUR-01"
                  />
                </DrawerField>

                <DrawerField label="Kitchen Print routing target">
                  <DrawerSelect 
                    value={productForm.printOption} 
                    onChange={(e) => setProductForm({ ...productForm, printOption: e.target.value })}
                  >
                    <option value="both">Both Receipt and Chef Ticket</option>
                    <option value="ticket">Chef Ticket Only</option>
                    <option value="receipt">Customer Receipt Only</option>
                  </DrawerSelect>
                </DrawerField>

                <DrawerField label="Preset Button Grid Colors">
                  <div className="grid grid-cols-4 gap-2">
                    {cs.map((u) => (
                      <button
                        key={u.bg}
                        type="button"
                        onClick={() => setProductForm({ ...productForm, backgroundColor: u.bg, textColor: u.text })}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                          productForm.backgroundColor === u.bg ? 'border-brand-500 scale-105 shadow' : 'border-slate-800 hover:border-slate-700'
                        }`}
                        style={{ backgroundColor: u.bg, color: u.text }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </DrawerField>
              </div>
            )}

            {/* Step 2: Size & Portion Variations */}
            {productStep === 2 && (
              <div className="space-y-4">
                <DrawerToggleRow 
                  label="Enable Size / Portion Variations" 
                  checked={!!productForm.variationsEnabled} 
                  onChange={(v) => setProductForm({ ...productForm, variationsEnabled: v })} 
                />
                
                {productForm.variationsEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portions Config</span>
                      <button
                        type="button"
                        onClick={() => setProductForm({
                          ...productForm,
                          variations: [
                            ...(productForm.variations || []),
                            { name: '', priceDeltaPence: 0, priceDeltaPounds: '0.00', sku: '', isDefault: false, isActive: true }
                          ]
                        })}
                        className="text-[10px] font-bold text-brand-400 hover:text-brand-350 flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Portion Size</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-900">
                      {(productForm.variations || []).map((v: any, index: number) => (
                        <div key={index} className="bg-slate-900 p-2.5 rounded-lg border border-slate-855 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              value={v.name}
                              onChange={(e) => {
                                const updated = [...productForm.variations];
                                updated[index].name = e.target.value;
                                setProductForm({ ...productForm, variations: updated });
                              }}
                              placeholder="e.g. Large / Small / 12inch"
                              className="bg-slate-950 border border-slate-855 rounded px-2 py-1.5 text-xs text-slate-200 flex-1"
                            />
                            <div className="relative w-20">
                              <span className="absolute left-1.5 top-1.5 text-slate-500 text-[10px]">£</span>
                              <input
                                type="number"
                                step="0.01"
                                value={v.priceDeltaPounds || poundsInput(v.priceDeltaPence)}
                                onChange={(e) => {
                                  const updated = [...productForm.variations];
                                  updated[index].priceDeltaPounds = e.target.value;
                                  updated[index].priceDeltaPence = toPenceLocal(e.target.value);
                                  setProductForm({ ...productForm, variations: updated });
                                }}
                                className="w-full bg-slate-950 border border-slate-855 rounded pl-4 pr-1 py-1.5 text-xs text-slate-200 text-right"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setProductForm({
                                ...productForm,
                                variations: productForm.variations.filter((_: any, i: number) => i !== index)
                              })}
                              className="p-1 hover:bg-slate-850 text-rose-500 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                            <label className="flex items-center space-x-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={v.isDefault}
                                onChange={(e) => {
                                  const updated = [...productForm.variations];
                                  if (e.target.checked) updated.forEach(x => x.isDefault = false);
                                  updated[index].isDefault = e.target.checked;
                                  setProductForm({ ...productForm, variations: updated });
                                }}
                                className="rounded text-brand-500 bg-slate-950 border-slate-855"
                              />
                              <span>Default Size Selection</span>
                            </label>
                            
                            <label className="flex items-center space-x-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={v.isActive !== false}
                                onChange={(e) => {
                                  const updated = [...productForm.variations];
                                  updated[index].isActive = e.target.checked;
                                  setProductForm({ ...productForm, variations: updated });
                                }}
                                className="rounded text-brand-500 bg-slate-950 border-slate-855"
                              />
                              <span>Portion Active</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Linked Modifier Groups Checklist */}
            {productStep === 3 && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                  Attached Modifier Groups
                </span>
                
                <div className="space-y-2 max-h-72 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-900">
                  {groups.map((u) => (
                    <label 
                      key={u._id} 
                      className="flex items-center space-x-3 rounded-lg p-2.5 hover:bg-slate-900 border border-transparent hover:border-slate-855 cursor-pointer select-none transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={productForm.selectedModifiers.includes(u._id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setProductForm({
                            ...productForm,
                            selectedModifiers: checked
                              ? [...productForm.selectedModifiers, u._id]
                              : productForm.selectedModifiers.filter((id: string) => id !== u._id)
                          });
                        }}
                        className="rounded text-brand-500 bg-slate-900 border-slate-800 w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 truncate">
                        <div className="text-xs font-bold text-slate-200">{u.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {u.options?.length || 0} custom components · {u.selectionType} select mode
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Channels & Active */}
            {productStep === 4 && (
              <div className="space-y-4">
                <DrawerToggleRow 
                  label="Product Active (Available for order)" 
                  checked={productForm.isAvailable} 
                  onChange={(v) => setProductForm({ ...productForm, isAvailable: v })} 
                />
                
                <DrawerField label="Publish Status">
                  <DrawerSelect 
                    value={productForm.publishStatus} 
                    onChange={(e) => setProductForm({ ...productForm, publishStatus: e.target.value })}
                  >
                    <option value="published">Active Published</option>
                    <option value="draft">Draft (Hidden)</option>
                  </DrawerSelect>
                </DrawerField>

                <div className="space-y-3 pt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-855">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-1">
                    Enabled Order Channels
                  </span>
                  
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!productForm.channels.pos} 
                      onChange={(e) => setProductForm({
                        ...productForm,
                        channels: { ...productForm.channels, pos: e.target.checked }
                      })}
                      className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
                    />
                    <span>Show on POS Terminal screen</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!productForm.channels.website} 
                      onChange={(e) => setProductForm({
                        ...productForm,
                        channels: { ...productForm.channels, website: e.target.checked }
                      })}
                      className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
                    />
                    <span>Show on Customer Website</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!productForm.channels.mobile} 
                      onChange={(e) => setProductForm({
                        ...productForm,
                        channels: { ...productForm.channels, mobile: e.target.checked }
                      })}
                      className="rounded text-brand-500 bg-slate-950 border-slate-855 w-4 h-4"
                    />
                    <span>Show on Mobile PWA App</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 5: Preview & Save */}
            {productStep === 5 && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                  POS Grid Button Preview
                </span>

                <div className="flex justify-center p-6 bg-slate-950 rounded-2xl border border-slate-900">
                  <div
                    className="w-32 h-20 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-3 text-center shadow-lg relative overflow-hidden transition-all scale-105"
                    style={{ backgroundColor: productForm.backgroundColor || '#1e293b', color: productForm.textColor || '#ffffff' }}
                  >
                    <div className="font-extrabold text-[10px] uppercase truncate w-full">{productForm.name || 'PORTION PREVIEW'}</div>
                    <div className="text-[9px] font-bold mt-1 opacity-70">£{productForm.pricePounds || '0.00'}</div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Menu Code Alias:</span>
                    <span className="font-mono text-slate-200">{productForm.menuCode || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax rates (VAT):</span>
                    <span className="text-slate-200">{productForm.vatRate}%</span>
                  </div>
                </div>

                <div className="pt-4">
                  <SaveButton label={productDrawer ? 'Update Product' : 'Create Product'} onClick={saveProduct} />
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* 4. Full screen popup checklist for adding components to group */}
      {addComponentPanel && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end" 
          onClick={(e) => e.target === e.currentTarget && setAddComponentPanel(null)}
        >
          <div className="h-full w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden relative">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0 bg-slate-950/20">
              <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">Add Component</h2>
              <button 
                onClick={() => setAddComponentPanel(null)} 
                className="text-slate-500 hover:text-slate-355 p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {components.map((comp) => (
                <label 
                  key={comp._id} 
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-950/50 cursor-pointer transition-colors border border-transparent hover:border-slate-855/30"
                >
                  <input
                    type="checkbox"
                    checked={addComponentSelected.includes(comp._id)}
                    onChange={(e) => {
                      setAddComponentSelected((prev) =>
                        e.target.checked ? [...prev, comp._id] : prev.filter((id) => id !== comp._id)
                      );
                    }}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs font-bold uppercase text-slate-300">{comp.name}</span>
                </label>
              ))}
            </div>
            <div className="border-t border-slate-800 p-4 bg-slate-950 shrink-0">
              <button
                onClick={saveComponentsToGroup}
                className="w-full rounded-xl bg-brand-600 hover:bg-brand-500 py-3 text-xs font-bold text-white transition-all shadow-md shadow-brand-500/10 cursor-pointer"
              >
                Add Selected Components
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open(r"apps/admin/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(file_content)

print("App.tsx has been rewritten successfully.")
