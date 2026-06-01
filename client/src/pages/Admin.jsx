import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, PackagePlus, Plus, Save, Upload } from 'lucide-react';
import { api } from '../services/api';
import { gbp } from '../utils/format';

const tabs = ['Dashboard', 'Products', 'Inventory', 'Suppliers', 'Employees', 'Customers', 'Promotions', 'Gift Cards', 'Reports', 'Settings', 'Audit'];

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  const [data, setData] = useState({});
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({});

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { loadTab(tab); }, [tab]);

  async function loadBase() {
    const [{ data: p }, { data: c }] = await Promise.all([api.get('/products'), api.get('/admin/categories')]);
    setProducts(p);
    setCategories(c);
  }

  async function loadTab(name) {
    const endpoints = {
      Dashboard: '/reports/dashboard',
      Suppliers: '/admin/suppliers',
      Employees: '/admin/users',
      Customers: '/admin/customers',
      Promotions: '/admin/promotions',
      'Gift Cards': '/admin/giftCards',
      Reports: '/reports/sales',
      Settings: '/admin/settings',
      Audit: '/reports/audit',
      Inventory: '/reports/inventory'
    };
    if (!endpoints[name]) return;
    const { data: response } = await api.get(endpoints[name]);
    setData((current) => ({ ...current, [name]: response }));
  }

  async function saveProduct(e) {
    e.preventDefault();
    const payload = {
      ...form,
      category: form.category || categories[0]?._id,
      pricePence: Math.round(Number(form.price || 0) * 100),
      costPricePence: Math.round(Number(form.costPrice || 0) * 100),
      vatRate: Number(form.vatRate || 0),
      stockQuantity: Number(form.stockQuantity || 0),
      reorderLevel: Number(form.reorderLevel || 5),
      reorderQuantity: Number(form.reorderQuantity || 12),
      weightValue: form.weightValue ? Number(form.weightValue) : undefined,
      weightUnit: form.weightUnit || 'each',
      unitOfMeasure: form.unitOfMeasure || 'each',
      soldByWeight: Boolean(form.soldByWeight),
      defaultTareGrams: Number(form.defaultTareGrams || 0),
      scaleBarcodeMode: form.scaleBarcodeMode || 'weight',
      sku: form.sku || `SKU-${Date.now()}`
    };
    const { data: saved } = form._id ? await api.put(`/products/${form._id}`, payload) : await api.post('/products', payload);
    toast.success('Product saved');
    setProducts((items) => [saved, ...items.filter((p) => p._id !== saved._id)]);
    setForm({});
  }

  async function adjustStock(product, quantity, reason) {
    const { data: response } = await api.post(`/products/${product._id}/stock`, { quantity, reason, type: quantity < 0 ? 'wastage' : 'adjustment' });
    setProducts((items) => items.map((p) => p._id === product._id ? response.product : p));
    toast.success('Stock updated');
  }

  async function createResource(resource, payload) {
    await api.post(`/admin/${resource}`, payload);
    toast.success('Saved');
    loadTab(tab);
  }

  const dashboard = data.Dashboard || {};

  return (
    <main className="min-h-screen bg-mist">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-3">
        <div>
          <h1 className="text-xl font-semibold">Admin Console</h1>
          <p className="text-xs text-slate-500">UK grocery POS operations and compliance</p>
        </div>
        <Link to="/" className="rounded bg-ink px-4 py-2 text-white">Go to POS</Link>
      </header>
      <div className="grid lg:grid-cols-[230px_1fr]">
        <nav className="border-r border-line bg-white p-3">
          {tabs.map((name) => <button key={name} onClick={() => setTab(name)} className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${tab === name ? 'bg-ink text-white' : 'hover:bg-mist'}`}>{name}</button>)}
        </nav>
        <section className="p-5">
          {tab === 'Dashboard' && <Dashboard dashboard={dashboard} />}
          {tab === 'Products' && <Products products={products} categories={categories} form={form} setForm={setForm} saveProduct={saveProduct} />}
          {tab === 'Inventory' && <Inventory products={products} report={data.Inventory} adjustStock={adjustStock} />}
          {tab === 'Suppliers' && <SimpleResource title="Suppliers" rows={data.Suppliers || []} fields={['name', 'contactName', 'phone', 'email', 'paymentTerms', 'leadTimeDays']} onCreate={(payload) => createResource('suppliers', payload)} />}
          {tab === 'Employees' && <SimpleResource title="Employees" rows={data.Employees || []} fields={['fullName', 'username', 'email', 'role', 'pin', 'password']} onCreate={(payload) => createResource('users', payload)} />}
          {tab === 'Customers' && <SimpleResource title="Customers" rows={data.Customers || []} fields={['name', 'email', 'phone', 'loyaltyCardNumber']} onCreate={(payload) => createResource('customers', { ...payload, gdprConsent: { granted: true, date: new Date(), method: 'Admin entry' } })} />}
          {tab === 'Promotions' && <Promotions rows={data.Promotions || []} products={products} categories={categories} onCreate={(payload) => createResource('promotions', payload)} />}
          {tab === 'Gift Cards' && <SimpleResource title="Gift Cards" rows={data['Gift Cards'] || []} fields={['code', 'initialBalancePence', 'currentBalancePence', 'status']} onCreate={(payload) => createResource('giftCards', { ...payload, initialBalancePence: Number(payload.initialBalancePence), currentBalancePence: Number(payload.currentBalancePence || payload.initialBalancePence), status: 'active' })} />}
          {tab === 'Reports' && <Reports report={data.Reports} />}
          {tab === 'Settings' && <Settings rows={data.Settings || []} onSave={(payload) => createResource('settings', payload)} />}
          {tab === 'Audit' && <Audit rows={data.Audit || []} />}
        </section>
      </div>
    </main>
  );
}

function Dashboard({ dashboard }) {
  const cards = [
    ['Today revenue', gbp(dashboard.revenuePence)],
    ['Transactions', dashboard.transactions || 0],
    ['Items sold', dashboard.itemsSold || 0],
    ['Low stock', dashboard.lowStock || 0],
    ['Gift card liability', gbp(dashboard.giftCardLiabilityPence)]
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-lg border border-line bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Hourly revenue"><ResponsiveContainer width="100%" height={260}><BarChart data={dashboard.hourlyRevenue || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis tickFormatter={(v) => `£${v / 100}`} /><Tooltip formatter={(v) => gbp(v)} /><Bar dataKey="revenuePence" fill="#2563eb" /></BarChart></ResponsiveContainer></Panel>
        <Panel title="Payment split"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={dashboard.paymentSplit || []} dataKey="amountPence" nameKey="method" outerRadius={95}>{(dashboard.paymentSplit || []).map((_, i) => <Cell key={i} fill={['#16a34a', '#2563eb', '#ea580c', '#7c3aed'][i % 4]} />)}</Pie><Tooltip formatter={(v) => gbp(v)} /></PieChart></ResponsiveContainer></Panel>
      </div>
      <Panel title="Top products today"><DataTable rows={dashboard.topProducts || []} /></Panel>
    </div>
  );
}

function Products({ products, categories, form, setForm, saveProduct }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Panel title={form._id ? 'Edit product' : 'Add product'}>
        <form onSubmit={saveProduct} className="grid gap-3">
          {['name', 'sku', 'barcode', 'plu'].map((field) => <input key={field} placeholder={field} value={form[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="rounded border border-line px-3 py-2" />)}
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Quick code e.g. TOM" value={form.quickCode || ''} onChange={(e) => setForm({ ...form, quickCode: e.target.value.toUpperCase() })} className="rounded border border-line px-3 py-2" />
            <input placeholder="Hotkey e.g. Alt+3" value={form.hotkey || ''} onChange={(e) => setForm({ ...form, hotkey: e.target.value })} className="rounded border border-line px-3 py-2" />
          </div>
          <select value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-line px-3 py-2">{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input placeholder="Selling price £" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded border border-line px-3 py-2" /><input placeholder="Cost price £" value={form.costPrice || ''} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="rounded border border-line px-3 py-2" /></div>
          <div className="grid grid-cols-3 gap-2"><select value={form.vatRate || 0} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} className="rounded border border-line px-2"><option value="0">0%</option><option value="5">5%</option><option value="20">20%</option></select><input placeholder="Stock" value={form.stockQuantity || ''} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="rounded border border-line px-3 py-2" /><input placeholder="Reorder" value={form.reorderLevel || ''} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="rounded border border-line px-3 py-2" /></div>
          <div className="grid grid-cols-3 gap-2">
            <select value={form.unitOfMeasure || 'each'} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} className="rounded border border-line px-2 py-2">
              <option value="each">Each</option><option value="kg">Per kg</option><option value="litre">Per litre</option><option value="pack">Pack</option>
            </select>
            <input placeholder="Pack weight/volume" value={form.weightValue || ''} onChange={(e) => setForm({ ...form, weightValue: e.target.value })} className="rounded border border-line px-3 py-2" />
            <select value={form.weightUnit || 'each'} onChange={(e) => setForm({ ...form, weightUnit: e.target.value })} className="rounded border border-line px-2 py-2">
              <option value="each">each</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="litre">litre</option><option value="pack">pack</option>
            </select>
          </div>
          <div className="rounded border border-line bg-mist/40 p-3">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form.soldByWeight} onChange={(e) => setForm({ ...form, soldByWeight: e.target.checked, unitOfMeasure: e.target.checked ? 'kg' : form.unitOfMeasure || 'each', weightUnit: e.target.checked ? 'kg' : form.weightUnit || 'each' })} /> Sold by weight / loose item</label>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Scale prefix" value={form.scaleBarcodePrefix || ''} onChange={(e) => setForm({ ...form, scaleBarcodePrefix: e.target.value })} className="rounded border border-line px-3 py-2" />
              <select value={form.scaleBarcodeMode || 'weight'} onChange={(e) => setForm({ ...form, scaleBarcodeMode: e.target.value })} className="rounded border border-line px-2 py-2">
                <option value="weight">Barcode stores weight</option><option value="price">Barcode stores price</option>
              </select>
              <input placeholder="Tare grams" value={form.defaultTareGrams || ''} onChange={(e) => setForm({ ...form, defaultTareGrams: e.target.value })} className="rounded border border-line px-3 py-2" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.ageRestricted} onChange={(e) => setForm({ ...form, ageRestricted: e.target.checked })} /> Age restricted</label>
          <button className="rounded bg-ink px-4 py-2 font-semibold text-white"><Save size={16} className="inline" /> Save product</button>
        </form>
      </Panel>
      <Panel title="Product catalogue">
        <div className="mb-3 flex gap-2"><a className="rounded border border-line px-3 py-2 text-sm" href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/export.csv`}><Download size={15} className="inline" /> Export CSV</a><button className="rounded border border-line px-3 py-2 text-sm"><Upload size={15} className="inline" /> CSV import endpoint ready</button></div>
        <DataTable rows={products.map((p) => ({ name: p.name, sku: p.sku, quick: p.quickCode, hotkey: p.hotkey, price: gbp(p.pricePence), vat: `${p.vatRate}%`, stock: p.stockQuantity, saleUnit: p.soldByWeight ? `Loose ${p.unitOfMeasure}` : p.unitOfMeasure, edit: <button onClick={() => setForm({ ...p, price: p.pricePence / 100, costPrice: p.costPricePence / 100, category: p.category?._id || p.category })} className="rounded border border-line px-2 py-1">Edit</button> }))} />
      </Panel>
    </div>
  );
}

function Inventory({ products, report, adjustStock }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Cost valuation" value={gbp(report?.stockValuationCostPence)} />
        <Metric label="Selling valuation" value={gbp(report?.stockValuationSellPence)} />
        <Metric label="Out of stock" value={report?.outOfStock?.length || 0} />
      </div>
      <Panel title="Stock levels">
        <DataTable rows={products.map((p) => ({ name: p.name, sku: p.sku, stock: p.stockQuantity, reorder: p.reorderLevel, value: gbp(p.stockQuantity * p.costPricePence), action: <button onClick={() => adjustStock(p, Number(prompt('Quantity adjustment (+/-)') || 0), prompt('Reason') || 'Manual stock adjustment')} className="rounded border border-line px-2 py-1"><PackagePlus size={15} className="inline" /> Adjust</button> }))} />
      </Panel>
    </div>
  );
}

function Reports({ report }) {
  const hourly = report?.hourly || [];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Revenue" value={gbp(report?.totalRevenuePence)} />
        <Metric label="VAT collected" value={gbp(report?.totalVatPence)} />
        <Metric label="Average basket" value={gbp(report?.averageTransactionPence)} />
        <Metric label="Items sold" value={report?.itemsSold || 0} />
      </div>
      <Panel title="Hourly sales"><ResponsiveContainer width="100%" height={260}><LineChart data={hourly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis tickFormatter={(v) => `£${v / 100}`} /><Tooltip formatter={(v) => gbp(v)} /><Line dataKey="revenuePence" stroke="#16a34a" strokeWidth={3} /></LineChart></ResponsiveContainer></Panel>
      <Panel title="Sales by product"><DataTable rows={report?.byProduct || []} /></Panel>
      <div className="flex gap-2"><a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/sales?format=csv`} className="rounded border border-line bg-white px-3 py-2">Export sales CSV</a><a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/vat?format=csv`} className="rounded border border-line bg-white px-3 py-2">Export VAT MTD CSV</a></div>
    </div>
  );
}

function Promotions({ rows, products, categories, onCreate }) {
  const [local, setLocal] = useState({
    type: 'tiered_price',
    active: true,
    priority: 10,
    selectedProducts: [],
    selectedCategories: [],
    tiersText: '1=9.00, 2=16.00, 3=25.00'
  });

  function update(field, value) {
    setLocal((current) => ({ ...current, [field]: value }));
  }

  function selectedOptions(e) {
    return Array.from(e.target.selectedOptions).map((option) => option.value);
  }

  function submit(e) {
    e.preventDefault();
    const payload = {
      name: local.name,
      type: local.type,
      active: local.active !== false,
      products: local.selectedProducts || [],
      categories: local.selectedCategories || [],
      discountPercent: local.discountPercent ? Number(local.discountPercent) : undefined,
      discountPence: local.discountPounds ? Math.round(Number(local.discountPounds) * 100) : undefined,
      buyQuantity: local.buyQuantity ? Number(local.buyQuantity) : undefined,
      getQuantity: local.getQuantity ? Number(local.getQuantity) : undefined,
      bundlePricePence: local.bundlePrice ? Math.round(Number(local.bundlePrice) * 100) : undefined,
      minSpendPence: local.minSpend ? Math.round(Number(local.minSpend) * 100) : undefined,
      couponCode: local.couponCode,
      tiers: parseTiers(local.tiersText),
      bundleGroups: ['combo_bundle', 'meal_deal'].includes(local.type) ? (local.selectedProducts || []).map((product) => ({ products: [product], quantity: 1 })) : undefined,
      receiptLabel: local.receiptLabel,
      posBadge: local.posBadge,
      priority: Number(local.priority || 0),
      stackable: Boolean(local.stackable)
    };
    onCreate(payload);
    setLocal({ type: local.type, active: true, priority: 10, selectedProducts: [], selectedCategories: [], tiersText: local.tiersText });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Panel title="Create promotion">
        <form onSubmit={submit} className="grid gap-3">
          <input required placeholder="Offer name" value={local.name || ''} onChange={(e) => update('name', e.target.value)} className="rounded border border-line px-3 py-2" />
          <select value={local.type} onChange={(e) => update('type', e.target.value)} className="rounded border border-line px-3 py-2">
            <option value="tiered_price">Tiered price: 1 for £X, 2 for £Y</option>
            <option value="bogof">Buy one get one free</option>
            <option value="bogohp">Buy one get one half price</option>
            <option value="buy_x_get_y">Buy X get Y free</option>
            <option value="mix_match">Mix and match fixed price</option>
            <option value="combo_bundle">Combo bundle</option>
            <option value="meal_deal">Meal deal</option>
            <option value="cheapest_free">Cheapest item free</option>
            <option value="cheapest_half_price">Cheapest item half price</option>
            <option value="simple_discount">Percentage/fixed discount</option>
            <option value="clearance">Reduced to clear</option>
            <option value="coupon">Coupon/voucher</option>
            <option value="min_spend">Minimum spend discount</option>
            <option value="member_price">Loyalty/member price</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Buy / group qty" value={local.buyQuantity || ''} onChange={(e) => update('buyQuantity', e.target.value)} className="rounded border border-line px-3 py-2" />
            <input placeholder="Get free qty" value={local.getQuantity || ''} onChange={(e) => update('getQuantity', e.target.value)} className="rounded border border-line px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Bundle price £" value={local.bundlePrice || ''} onChange={(e) => update('bundlePrice', e.target.value)} className="rounded border border-line px-3 py-2" />
            <input placeholder="Discount £" value={local.discountPounds || ''} onChange={(e) => update('discountPounds', e.target.value)} className="rounded border border-line px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Discount %" value={local.discountPercent || ''} onChange={(e) => update('discountPercent', e.target.value)} className="rounded border border-line px-3 py-2" />
            <input placeholder="Min spend £" value={local.minSpend || ''} onChange={(e) => update('minSpend', e.target.value)} className="rounded border border-line px-3 py-2" />
          </div>
          <input placeholder="Tier prices: 1=9.00, 2=16.00, 3=25.00" value={local.tiersText || ''} onChange={(e) => update('tiersText', e.target.value)} className="rounded border border-line px-3 py-2" />
          <input placeholder="Coupon code" value={local.couponCode || ''} onChange={(e) => update('couponCode', e.target.value.toUpperCase())} className="rounded border border-line px-3 py-2" />
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Products
              <select multiple value={local.selectedProducts || []} onChange={(e) => update('selectedProducts', selectedOptions(e))} className="mt-1 h-36 w-full rounded border border-line px-2 py-2">
                {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Categories
              <select multiple value={local.selectedCategories || []} onChange={(e) => update('selectedCategories', selectedOptions(e))} className="mt-1 h-36 w-full rounded border border-line px-2 py-2">
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Receipt label" value={local.receiptLabel || ''} onChange={(e) => update('receiptLabel', e.target.value)} className="rounded border border-line px-3 py-2" />
            <input placeholder="POS badge" value={local.posBadge || ''} onChange={(e) => update('posBadge', e.target.value)} className="rounded border border-line px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Priority" value={local.priority || ''} onChange={(e) => update('priority', e.target.value)} className="rounded border border-line px-3 py-2" />
            <label className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm"><input type="checkbox" checked={!!local.stackable} onChange={(e) => update('stackable', e.target.checked)} /> Stackable</label>
          </div>
          <button className="rounded bg-ink px-4 py-2 text-white"><Plus size={16} className="inline" /> Create offer</button>
        </form>
      </Panel>
      <Panel title="Active and scheduled offers">
        <DataTable rows={rows.map((promo) => ({
          name: promo.name,
          type: promo.type,
          active: promo.active,
          products: promo.products?.length || 0,
          categories: promo.categories?.length || 0,
          price: promo.bundlePricePence ? gbp(promo.bundlePricePence) : '',
          discount: promo.discountPence ? gbp(promo.discountPence) : promo.discountPercent ? `${promo.discountPercent}%` : '',
          used: promo.usageCount || 0
        }))} />
      </Panel>
    </div>
  );
}

function parseTiers(value = '') {
  return value.split(',').map((part) => {
    const [quantity, price] = part.split('=').map((item) => item.trim());
    return { quantity: Number(quantity), pricePence: Math.round(Number(price) * 100) };
  }).filter((tier) => tier.quantity > 0 && tier.pricePence >= 0);
}

function SimpleResource({ title, rows, fields, onCreate }) {
  const [local, setLocal] = useState({});
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <Panel title={`Create ${title.toLowerCase()}`}>
        <form onSubmit={(e) => { e.preventDefault(); onCreate(local); setLocal({}); }} className="grid gap-2">
          {fields.map((field) => <input key={field} placeholder={field} value={local[field] || ''} onChange={(e) => setLocal({ ...local, [field]: e.target.value })} className="rounded border border-line px-3 py-2" />)}
          <button className="rounded bg-ink px-4 py-2 text-white"><Plus size={16} className="inline" /> Add</button>
        </form>
      </Panel>
      <Panel title={title}><DataTable rows={rows} /></Panel>
    </div>
  );
}

function Settings({ rows, onSave }) {
  const [keyName, setKeyName] = useState('store');
  const [value, setValue] = useState('{"storeName":"Jahan Local Grocers"}');
  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Panel title="Update setting">
        <div className="grid gap-3">
          <input className="rounded border border-line px-3 py-2" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          <textarea className="min-h-44 rounded border border-line px-3 py-2 font-mono text-sm" value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="rounded bg-ink px-4 py-2 text-white" onClick={() => onSave({ key: keyName, value: JSON.parse(value) })}>Save setting</button>
        </div>
      </Panel>
      <Panel title="Current settings"><DataTable rows={rows} /></Panel>
    </div>
  );
}

function Audit({ rows }) {
  return <Panel title="Audit trail"><DataTable rows={rows.map((r) => ({ at: new Date(r.createdAt).toLocaleString('en-GB'), actor: r.actorName || r.actor?.fullName, action: r.action, entity: r.entityType, id: r.entityId }))} /></Panel>;
}

function Panel({ title, children }) {
  return <section className="rounded-lg border border-line bg-white p-4"><h2 className="mb-3 font-semibold">{title}</h2>{children}</section>;
}

function Metric({ label, value }) {
  return <div className="rounded-lg border border-line bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}

function DataTable({ rows = [] }) {
  const cleanRows = rows.slice(0, 100);
  const keys = useMemo(() => Array.from(new Set(cleanRows.flatMap((row) => Object.keys(row || {}).filter((k) => !['_id', '__v', 'passwordHash', 'pinHash'].includes(k))))).slice(0, 9), [rows]);
  if (!cleanRows.length) return <p className="text-sm text-slate-500">No records yet.</p>;
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead><tr>{keys.map((key) => <th key={key} className="border-b border-line px-2 py-2 text-left capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead>
        <tbody>{cleanRows.map((row, index) => <tr key={row._id || index} className="border-b border-line/70">{keys.map((key) => <td key={key} className="max-w-64 truncate px-2 py-2">{renderCell(row[key])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function renderCell(value) {
  if (value?.type) return value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value && typeof value === 'object') return value.name || value.fullName || JSON.stringify(value).slice(0, 60);
  return value ?? '';
}
