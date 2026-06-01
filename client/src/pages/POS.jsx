import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Barcode,
  CreditCard,
  Grid3X3,
  Home,
  Keyboard,
  Lock,
  LogOut,
  Minus,
  Pause,
  Percent,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Unlock,
  WalletCards
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { gbp, toPence, vatBreakdown } from '../utils/format';
import { displayQuantity, findProductForEntry, shortcutLabel } from '../utils/scanner';

const challengeOptions = ['ID Checked - Customer is 25 or Over', 'ID Checked - Valid ID Produced', 'Sale Refused - Customer Appears Under 25'];
const productAccentClasses = [
  'before:bg-pos-teal border-pos-teal/20',
  'before:bg-pos-gold border-pos-gold/25',
  'before:bg-pos-lime border-pos-lime/30',
  'before:bg-pos-rose border-pos-rose/25',
  'before:bg-pos-navy2 border-pos-navy2/20'
];

export default function POS() {
  const { user, logout, isAdmin } = useAuth();
  const { online, queuedCount, enqueue } = useOfflineQueue();
  const barcodeRef = useRef(null);
  const receiptRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [basket, setBasket] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [customer, setCustomer] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [payments, setPayments] = useState([{ method: 'cash', amount: '' }]);
  const [shift, setShift] = useState(null);
  const [floatAmount, setFloatAmount] = useState('100');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [quote, setQuote] = useState(null);
  const [locked, setLocked] = useState(false);
  const [challengeProduct, setChallengeProduct] = useState(null);
  const [challengeEvents, setChallengeEvents] = useState([]);
  const [pendingWeight, setPendingWeight] = useState(null);
  const [weightEntry, setWeightEntry] = useState({ value: '', reason: 'Manual scale entry' });
  const [scannerMessage, setScannerMessage] = useState('Scanner ready');

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  });

  useEffect(() => {
    localStorage.setItem('recent_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (!locked) barcodeRef.current?.focus();
  }, [locked, basket.length]);

  useEffect(() => {
    if (!basket.length || !online) {
      setQuote(null);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.post('/transactions/quote', {
          customer: customer?._id,
          couponCode,
          lines: basket.map(transactionLinePayload)
        });
        setQuote(data);
      } catch {
        setQuote(null);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [basket, customer?._id, couponCode, online]);

  async function load() {
    try {
      const [{ data: productData }, { data: categoryData }, { data: promotionData }, { data: shiftData }] = await Promise.all([
        api.get('/products?active=true'),
        api.get('/products/meta/categories'),
        api.get('/products/meta/promotions'),
        api.get('/auth/shift/current')
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setPromotions(promotionData);
      setShift(shiftData);
    } catch {
      setProducts(JSON.parse(localStorage.getItem('recent_products') || '[]'));
      toast.error('Using cached product data');
    }
  }

  function shortcuts(e) {
    if (e.key === 'F1') { e.preventDefault(); barcodeRef.current?.focus(); }
    if (e.key === 'F2') { e.preventDefault(); document.getElementById('product-search')?.focus(); }
    if (e.key === 'F4') { e.preventDefault(); hold(); }
    if (e.key === 'F8') { e.preventDefault(); document.getElementById('payment-panel')?.scrollIntoView(); }
    if (e.key === 'F12') { e.preventDefault(); printReceipt(); }
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;
    if (typing) return;
    const hotkeyProduct = products.find((product) => product.hotkey && matchesHotkey(product.hotkey, e));
    if (hotkeyProduct) {
      e.preventDefault();
      setScannerMessage(`${shortcutLabel(hotkeyProduct)} added`);
      addProduct(hotkeyProduct, { trigger: 'hotkey' });
    }
  }

  function matchesHotkey(hotkey, event) {
    const parts = String(hotkey).toLowerCase().split('+').map((part) => part.trim()).filter(Boolean);
    const key = parts.at(-1);
    if (!key || key !== String(event.key).toLowerCase()) return false;
    if (parts.includes('alt') !== event.altKey) return false;
    if (parts.includes('ctrl') !== event.ctrlKey) return false;
    if (parts.includes('shift') !== event.shiftKey) return false;
    return true;
  }

  const visibleProducts = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => (!category || p.category?._id === category || p.category === category) && (!q || [p.name, p.sku, p.barcode, p.plu, p.quickCode, p.hotkey].join(' ').toLowerCase().includes(q))).slice(0, 72);
  }, [products, category, query]);

  const quickProducts = useMemo(() => products
    .filter((p) => p.active !== false && (p.quickCode || p.hotkey || p.favourite))
    .sort((a, b) => Number(Boolean(b.hotkey)) - Number(Boolean(a.hotkey)) || a.name.localeCompare(b.name))
    .slice(0, 16), [products]);

  const totals = useMemo(() => {
    if (quote) return { gross: quote.totalPence || 0, vat: quote.totalVatPence || 0, breakdown: quote.vatBreakdown || {} };
    const gross = basket.reduce((sum, line) => sum + line.pricePence * line.quantity - (line.discountPence || 0), 0);
    const breakdown = vatBreakdown(basket);
    return { gross, vat: Object.values(breakdown).reduce((s, v) => s + v.vatPence, 0), breakdown };
  }, [basket, quote]);

  const itemCount = useMemo(() => basket.reduce((sum, line) => sum + Number(line.quantity || 0), 0), [basket]);
  const promotionSavings = useMemo(() => quote?.promotionApplications?.reduce((sum, promo) => sum + (promo.discountPence || 0), 0) || 0, [quote]);

  async function openShift() {
    const { data } = await api.post('/auth/shift/open', { openingFloatPence: toPence(floatAmount), tillId: 'TILL-1' });
    setShift(data);
    toast.success('Shift opened');
  }

  async function closeShift() {
    const zReport = { totalPence: totals.gross, payments, closedBy: user.fullName };
    const { data } = await api.post('/auth/shift/close', { closingFloatPence: toPence(floatAmount), zReport });
    setShift(data);
    toast.success('Z-report stored');
  }

  function addProduct(product, options = {}) {
    if (product.ageRestricted && !options.challengeConfirmed) {
      setChallengeProduct({ ...product, __options: options });
      return;
    }
    if (product.soldByWeight && !options.quantity && !options.weight?.netWeight) {
      setPendingWeight({ product, options });
      setWeightEntry({ value: '', reason: 'Manual scale entry' });
      return;
    }
    addLine(product, options);
  }

  function addLine(product, options = {}) {
    if (product.stockQuantity <= 0) toast.error(`${product.name} is out of stock`);
    const quantity = Math.max(0.001, Number(options.quantity || options.weight?.netWeight || 1));
    const soldByWeight = Boolean(product.soldByWeight || options.weight);
    const weightUnit = options.weight?.weightUnit || (soldByWeight ? product.unitOfMeasure || 'kg' : product.unitOfMeasure);
    const lineMeta = soldByWeight ? {
      soldByWeight: true,
      grossWeight: options.weight?.grossWeight || quantity,
      tareWeight: options.weight?.tareWeight || 0,
      netWeight: quantity,
      weightUnit,
      weightSource: options.weight?.weightSource || 'manual',
      scaleId: options.weight?.scaleId,
      manualWeightReason: options.weight?.manualWeightReason
    } : {};
    setBasket((current) => {
      const existing = current.find((line) => line._id === product._id && Boolean(line.soldByWeight) === soldByWeight);
      if (existing) {
        return current.map((line) => {
          if (line._id !== product._id || Boolean(line.soldByWeight) !== soldByWeight) return line;
          const nextQuantity = Math.round((Number(line.quantity || 0) + quantity) * 1000) / 1000;
          return {
            ...line,
            quantity: nextQuantity,
            netWeight: soldByWeight ? nextQuantity : line.netWeight,
            grossWeight: soldByWeight ? Math.round((Number(line.grossWeight || 0) + Number(lineMeta.grossWeight || quantity)) * 1000) / 1000 : line.grossWeight
          };
        });
      }
      return [...current, { ...product, ...lineMeta, quantity, discountPence: 0 }];
    });
  }

  function confirmChallenge(outcome) {
    const { __options = {}, ...product } = challengeProduct;
    const event = { product: product._id, productName: product.name, outcome };
    setChallengeEvents((events) => [...events, event]);
    if (outcome.includes('Refused')) toast.error('Sale refused and item removed');
    else addProduct(product, { ...__options, challengeConfirmed: true });
    setChallengeProduct(null);
  }

  function scan(e) {
    e.preventDefault();
    const result = findProductForEntry(products, barcode);
    if (result) {
      addProduct(result.product, { quantity: result.quantity, weight: result.weight, scan: result.scan, trigger: result.source });
      const suffix = result.source === 'scale_label' ? ` - ${Number(result.quantity || 0).toFixed(3)} ${result.weight?.weightUnit || 'kg'}` : '';
      setScannerMessage(`${result.product.name}${suffix}`);
      if (result.scan && !result.scan.checkDigitValid) toast.error('Scale barcode check digit did not validate');
    } else {
      toast.error('Product not found');
      setScannerMessage('No matching barcode, PLU, SKU or quick code');
    }
    setBarcode('');
  }

  function submitWeightEntry(e) {
    e.preventDefault();
    const quantity = Number(weightEntry.value);
    if (!pendingWeight || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a valid weight');
      return;
    }
    addLine(pendingWeight.product, {
      ...pendingWeight.options,
      quantity,
      weight: {
        grossWeight: quantity,
        tareWeight: 0,
        netWeight: quantity,
        weightUnit: pendingWeight.product.unitOfMeasure || 'kg',
        weightSource: 'manual',
        manualWeightReason: weightEntry.reason
      }
    });
    setScannerMessage(`${pendingWeight.product.name} - ${quantity.toFixed(3)} ${pendingWeight.product.unitOfMeasure || 'kg'}`);
    setPendingWeight(null);
    setWeightEntry({ value: '', reason: 'Manual scale entry' });
  }

  function transactionLinePayload(line) {
    return {
      product: line._id,
      quantity: line.quantity,
      discountPence: line.discountPence || 0,
      soldByWeight: Boolean(line.soldByWeight),
      grossWeight: line.grossWeight,
      tareWeight: line.tareWeight,
      netWeight: line.netWeight,
      weightUnit: line.weightUnit,
      weightSource: line.weightSource,
      scaleId: line.scaleId,
      manualWeightReason: line.manualWeightReason
    };
  }

  function setQty(id, quantity) {
    setBasket((current) => current.map((line) => {
      if (line._id !== id) return line;
      const nextQuantity = Math.max(0.001, Number(quantity) || 1);
      return { ...line, quantity: nextQuantity, netWeight: line.soldByWeight ? nextQuantity : line.netWeight };
    }));
  }

  function adjustQty(id, delta) {
    setBasket((current) => current.map((line) => {
      if (line._id !== id) return line;
      const nextQuantity = Math.round(Math.max(0.001, Number(line.quantity || 1) + delta) * 1000) / 1000;
      return { ...line, quantity: nextQuantity, netWeight: line.soldByWeight ? nextQuantity : line.netWeight };
    }));
  }

  async function authoriseAndDiscount(line, discountPence) {
    if (discountPence > 500) {
      const pin = prompt('Manager PIN required');
      await api.post('/auth/verify-pin', { pin });
    }
    setBasket((current) => current.map((item) => item._id === line._id ? { ...item, discountPence } : item));
  }

  async function completePayment() {
    if (!shift) return toast.error('Open a shift first');
    const payload = {
      shift: shift._id,
      customer: customer?._id,
      couponCode,
      lines: basket.map(transactionLinePayload),
      challenge25Events: challengeEvents,
      payments: payments.map((p) => ({ method: p.method, amountPence: toPence(p.amount), tenderedPence: toPence(p.amount), reference: p.reference, status: ['card', 'contactless'].includes(p.method) ? 'simulated' : 'approved' }))
    };
    try {
      const { data } = online ? await api.post('/transactions/sale', payload) : { data: { ...payload, receiptNumber: `OFFLINE-${Date.now()}`, reference: 'Offline queued', totalPence: totals.gross } };
      if (!online) enqueue(payload);
      setLastReceipt(data);
      setBasket([]);
      setPayments([{ method: 'cash', amount: '' }]);
      setCouponCode('');
      setQuote(null);
      setChallengeEvents([]);
      toast.success(online ? 'Payment approved' : 'Queued offline sale');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    }
  }

  async function hold() {
    if (!basket.length) return;
    await api.post('/transactions/hold', { shift: shift?._id, lines: basket.map(transactionLinePayload) });
    setBasket([]);
    toast.success('Transaction held');
  }

  function printReceipt() {
    window.print();
  }

  function quotedLine(line) {
    return quote?.lines?.find((priced) => String(priced.product) === String(line._id));
  }

  function productOfferBadge(product) {
    const categoryId = String(product.category?._id || product.category || '');
    const offer = promotions.find((promo) => {
      const productMatch = promo.products?.some((id) => String(id) === String(product._id));
      const categoryMatch = promo.categories?.some((id) => String(id) === categoryId);
      const bundleMatch = promo.bundleGroups?.some((group) => group.products?.some((id) => String(id) === String(product._id)) || group.categories?.some((id) => String(id) === categoryId));
      return productMatch || categoryMatch || bundleMatch;
    });
    return offer?.posBadge || offer?.receiptLabel || offer?.name;
  }

  if (locked) {
    return (
      <main className="grid min-h-screen place-items-center bg-pos-navy px-4 text-white">
        <button onClick={() => setLocked(false)} className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-semibold shadow-soft backdrop-blur">
          <Unlock size={18} /> Unlock till
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pos-paper text-pos-ink lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen gap-2.5 p-2.5 sm:gap-3 sm:p-3 lg:h-screen lg:grid-cols-[66px_minmax(0,1fr)_minmax(360px,390px)] lg:grid-rows-[66px_minmax(0,1fr)]">
        <aside className="hidden rounded-[18px] bg-pos-navy p-2 text-white shadow-soft lg:row-span-2 lg:grid lg:grid-rows-[58px_repeat(6,54px)_1fr_54px] lg:place-items-center">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pos-gold to-[#ffe48a] font-black text-pos-navy">JG</div>
          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-pos-teal text-white shadow-lg shadow-pos-teal/20" title="POS"><ShoppingCart size={20} /></button>
          <button onClick={() => barcodeRef.current?.focus()} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20" title="Focus barcode"><Barcode size={20} /></button>
          <button onClick={hold} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20" title="Hold transaction"><Pause size={20} /></button>
          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20" title="Refund mode"><RotateCcw size={20} /></button>
          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20" title="Discounts"><Percent size={20} /></button>
          {isAdmin ? <Link to="/admin" className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20" title="Admin settings"><Settings size={20} /></Link> : <span />}
          <span />
          <button onClick={() => setLocked(true)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20" title="Lock till"><Lock size={20} /></button>
        </aside>

        <header className="rounded-[18px] border border-pos-navy/10 bg-white/90 px-3 py-2 shadow-soft backdrop-blur lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pos-gold to-[#ffe48a] text-sm font-black text-pos-navy lg:hidden">JG</div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-black leading-tight text-pos-navy sm:text-xl">Jahan Local Grocers</h1>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    Till 1 - {user.fullName} - {shift?.status === 'open' ? `Shift open ${new Date(shift.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'No open shift'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 ${online ? 'bg-[#e8f8f4] text-[#0b6f68]' : 'bg-amber-100 text-amber-700'}`}>
                <span className={`h-2 w-2 rounded-full ${online ? 'bg-pos-teal' : 'bg-amber-500'}`} /> {online ? 'Online' : `Offline - ${queuedCount} queued`}
              </span>
              <span className="hidden h-9 max-w-[280px] items-center gap-2 truncate rounded-xl bg-[#edf7ff] px-3 text-[#2468a2] sm:inline-flex"><ShieldCheck size={15} className="shrink-0" /> <span className="truncate">{scannerMessage}</span></span>
              {isAdmin && <Link to="/admin" className="inline-flex h-9 items-center gap-2 rounded-xl bg-pos-navy2 px-3 text-white"><Settings size={15} /> Admin</Link>}
              <button onClick={() => setLocked(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-pos-line bg-white text-pos-navy lg:hidden" title="Lock till"><Lock size={17} /></button>
              <button onClick={logout} className="inline-flex h-9 items-center gap-2 rounded-xl border border-pos-line bg-white px-3 text-pos-navy"><LogOut size={15} /> <span className="hidden sm:inline">Logout</span></button>
            </div>
          </div>
        </header>

        {!shift || shift.status !== 'open' ? (
          <section className="mx-auto mt-10 w-full max-w-md rounded-[20px] border border-pos-navy/10 bg-white p-5 shadow-soft lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-pos-navy text-white"><Home size={21} /></div>
              <div>
                <h2 className="text-lg font-black text-pos-navy">Open till</h2>
                <p className="text-sm text-slate-500">Enter the drawer float before serving customers.</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-slate-700">Opening float
              <input className="mt-1 h-12 w-full rounded-xl border border-pos-line px-3 text-lg font-bold outline-none transition focus:border-pos-teal focus:ring-4 focus:ring-pos-teal/10" value={floatAmount} onChange={(e) => setFloatAmount(e.target.value)} />
            </label>
            <button onClick={openShift} className="mt-4 h-12 w-full rounded-2xl bg-pos-navy px-4 font-black text-white shadow-lg shadow-pos-navy/20">Open shift</button>
          </section>
        ) : (
          <>
            <section className="min-h-[560px] rounded-[20px] border border-pos-navy/10 bg-white/75 p-3 shadow-soft backdrop-blur lg:min-h-0 lg:overflow-hidden">
              <div className="grid h-full grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-2.5">
                <form onSubmit={scan} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px] xl:grid-cols-[minmax(0,1fr)_160px_148px]">
                  <label className="relative block">
                    <Barcode className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-teal" size={18} />
                    <input
                      ref={barcodeRef}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan barcode, quick code, SKU or PLU"
                      className="h-12 w-full rounded-2xl border border-pos-line bg-white pl-10 pr-3 text-base font-bold outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-pos-teal focus:ring-4 focus:ring-pos-teal/10"
                    />
                  </label>
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      id="product-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search"
                      className="h-12 w-full rounded-2xl border border-pos-line bg-white pl-10 pr-3 text-sm font-bold outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-pos-teal focus:ring-4 focus:ring-pos-teal/10"
                    />
                  </label>
                  <button className="hidden h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-pos-aqua px-4 font-black text-white shadow-lg shadow-pos-aqua/20 transition hover:bg-pos-teal xl:inline-flex"><Plus size={18} /> Add item</button>
                </form>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button onClick={() => setCategory('')} className={`h-11 shrink-0 rounded-xl px-3 text-xs font-black transition ${!category ? 'bg-pos-navy2 text-white shadow-md shadow-pos-navy/20' : 'border border-pos-line bg-white text-slate-700 hover:border-pos-teal/40'}`}>
                    Favourites
                  </button>
                  {categories.map((c) => (
                    <button key={c._id} onClick={() => setCategory(c._id)} className={`h-11 shrink-0 rounded-xl px-3 text-xs font-black transition ${category === c._id ? 'bg-pos-navy2 text-white shadow-md shadow-pos-navy/20' : 'border border-pos-line bg-white text-slate-700 hover:border-pos-teal/40'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2 rounded-2xl border border-pos-line bg-white/80 p-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                  <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-pos-navy">
                    <Keyboard size={15} className="text-pos-teal" /> Quick keys
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {quickProducts.map((p) => (
                      <button
                        key={`${p._id}-quick`}
                        onClick={() => addProduct(p, { trigger: 'quick_key' })}
                        className="grid h-12 min-w-[88px] shrink-0 grid-cols-[1fr_auto] items-center gap-1 rounded-xl border border-pos-line bg-[#f9fbfb] px-2 text-left transition hover:border-pos-teal/40 hover:bg-[#eefaf7]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-black text-pos-ink">{p.name}</span>
                          <span className="block truncate text-[10px] font-bold text-slate-500">{shortcutLabel(p)}</span>
                        </span>
                        <span className="text-xs font-black text-pos-navy">{gbp(p.pricePence)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                    {visibleProducts.map((p, index) => {
                      const badge = productOfferBadge(p);
                      return (
                        <button
                          key={p._id}
                          onClick={() => addProduct(p)}
                          className={`relative grid h-[96px] grid-rows-[1fr_auto] overflow-hidden rounded-[13px] border bg-white p-2 pl-3 text-left shadow-product transition before:absolute before:inset-y-0 before:left-0 before:w-1.5 hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-pos-teal/20 ${productAccentClasses[index % productAccentClasses.length]} ${p.stockQuantity <= 0 ? 'opacity-50 grayscale' : ''}`}
                        >
                          <span className="line-clamp-2 text-[12px] font-black leading-tight text-[#162334]">{p.name}</span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 truncate text-[11px] font-bold text-slate-500">
                              {p.soldByWeight && <Scale size={11} className="shrink-0 text-pos-teal" />}
                              <span className="truncate">{p.unitPriceLabel || p.quickCode || p.sku}</span>
                            </span>
                            <span className="flex min-w-0 flex-wrap items-end justify-between gap-1">
                              <span className="shrink-0 text-[16px] font-black leading-none text-pos-navy sm:text-[17px]">{gbp(p.pricePence)}</span>
                              {(p.quickCode || p.hotkey) && <span className="rounded-full bg-[#eef7ff] px-1.5 py-0.5 text-[9px] font-black text-[#2468a2]">{shortcutLabel(p)}</span>}
                              {badge && <span className="max-w-[44px] truncate rounded-full bg-[#fff3c4] px-1.5 py-0.5 text-[9px] font-black text-[#815a00] sm:max-w-[62px]">{badge}</span>}
                              {!badge && p.ageRestricted && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-700">C25</span>}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <aside className="min-h-[600px] overflow-hidden rounded-[20px] border border-pos-navy/10 bg-white shadow-soft lg:min-h-0">
              <div className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto]">
                <div className="flex items-center justify-between gap-3 border-b border-pos-line px-3.5 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-pos-navy">Basket</h2>
                      <span className="rounded-full bg-pos-navy/10 px-2 py-0.5 text-[11px] font-black text-pos-navy">{itemCount.toLocaleString('en-GB')} items</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Customer display mirrors totals in real time</p>
                  </div>
                  <div className="rounded-xl bg-[#edf7ff] px-2.5 py-2 text-xs font-black text-[#2468a2]">{customer?.loyaltyCardNumber || 'No customer'}</div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-pos-line bg-[#f5fbfa] p-3">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Voucher or coupon code" className="h-10 rounded-xl border border-dashed border-[#a7c7c3] bg-white px-3 text-sm font-bold outline-none placeholder:text-slate-400 focus:border-pos-teal focus:ring-4 focus:ring-pos-teal/10" />
                  <button onClick={() => setBasket([])} disabled={!basket.length} className="h-10 rounded-xl bg-pos-rose px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Void</button>
                </div>

                <div className="min-h-0 overflow-y-auto p-2.5">
                  {!basket.length && (
                    <div className="grid h-full min-h-56 place-items-center rounded-2xl border border-dashed border-pos-line bg-white/70 p-6 text-center">
                      <div>
                        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-pos-navy/10 text-pos-navy"><Grid3X3 size={24} /></div>
                        <p className="font-black text-pos-navy">Basket is empty</p>
                        <p className="mt-1 text-sm text-slate-500">Scan a barcode or tap a product button.</p>
                      </div>
                    </div>
                  )}
                  {basket.map((line) => {
                    const priced = quotedLine(line);
                    const promotionSaving = Math.max(0, (priced?.discountPence || 0) - (line.discountPence || 0));
                    const quantityText = line.soldByWeight
                      ? `${displayQuantity(line)} @ ${gbp(line.pricePence)}/${line.weightUnit || 'kg'}`
                      : `${line.quantity} x ${gbp(line.pricePence)}`;
                    return (
                      <article key={line._id} className="mb-2 rounded-[13px] border border-pos-line bg-white p-2.5 shadow-sm">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-black leading-tight text-pos-ink">{line.name}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">{quantityText} - VAT {line.vatRate}%</p>
                            {line.weightSource && line.weightSource !== 'not_applicable' && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{line.weightSource.replace('_', ' ')}</p>}
                            {priced?.promotionName && <p className="mt-1 inline-flex rounded-full bg-[#e7f8ef] px-2 py-0.5 text-[11px] font-black text-[#08765f]">{priced.promotionName} saves {gbp(promotionSaving)}</p>}
                          </div>
                          <div className="text-right">
                            <strong className="block text-base font-black text-pos-navy">{gbp(priced?.lineTotalPence ?? (line.pricePence * line.quantity - (line.discountPence || 0)))}</strong>
                            <button onClick={() => setBasket((items) => items.filter((i) => i._id !== line._id))} className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-pos-rose hover:bg-pos-rose/10" title="Remove"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-[32px_minmax(48px,1fr)_32px_auto] items-center gap-1.5">
                          <button onClick={() => adjustQty(line._id, line.soldByWeight ? -0.1 : -1)} className="grid h-8 place-items-center rounded-lg border border-pos-line bg-[#f9fbfb] text-pos-navy"><Minus size={14} /></button>
                          <input type="number" step={line.soldByWeight ? '0.001' : '1'} value={line.quantity} onChange={(e) => setQty(line._id, e.target.value)} className="h-8 rounded-lg border border-pos-line px-2 text-center text-sm font-black outline-none focus:border-pos-teal focus:ring-2 focus:ring-pos-teal/10" />
                          <button onClick={() => adjustQty(line._id, line.soldByWeight ? 0.1 : 1)} className="grid h-8 place-items-center rounded-lg border border-pos-line bg-[#f9fbfb] text-pos-navy"><Plus size={14} /></button>
                          <button onClick={() => authoriseAndDiscount(line, line.discountPence ? 0 : 50)} className="h-8 rounded-lg border border-pos-line px-2 text-xs font-black text-pos-navy hover:border-pos-teal/40">Discount</button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div id="payment-panel" className="bg-pos-navy p-3 text-white">
                  <div className="mb-2 space-y-1 text-xs font-bold text-white/80">
                    <div className="flex justify-between gap-3"><span>Subtotal ex VAT</span><strong>{gbp(totals.gross - totals.vat)}</strong></div>
                    {Object.values(totals.breakdown).map((v) => <div className="flex justify-between gap-3" key={v.vatRate}><span>VAT {v.vatRate}%</span><strong>{gbp(v.vatPence)}</strong></div>)}
                    {quote?.promotionApplications?.map((promo) => <div className="flex justify-between gap-3 text-[#cbf7dc]" key={promo.name}><span className="truncate">{promo.name}</span><strong>-{gbp(promo.discountPence)}</strong></div>)}
                    {promotionSavings > 0 && <div className="flex justify-between gap-3 text-[#cbf7dc]"><span>Total savings</span><strong>-{gbp(promotionSavings)}</strong></div>}
                  </div>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <span className="text-sm font-black text-white/80">Total</span>
                    <span className="text-3xl font-black tracking-normal text-white">{gbp(totals.gross)}</span>
                  </div>
                  <div className="mb-2 grid grid-cols-4 gap-1.5">
                    {[5, 10, 20, 50].map((n) => <button key={n} onClick={() => setPayments([{ method: 'cash', amount: String(n) }])} className="h-9 rounded-lg border border-white/20 bg-white/10 text-sm font-black transition hover:bg-white/20">£{n}</button>)}
                    <button onClick={() => setPayments([{ method: 'cash', amount: String(totals.gross / 100) }])} className="col-span-2 h-9 rounded-lg border border-white/20 bg-white/10 text-sm font-black transition hover:bg-white/20">Exact</button>
                    <button onClick={() => setPayments((p) => [...p, { method: 'card', amount: '' }])} className="col-span-2 h-9 rounded-lg border border-white/20 bg-white/10 text-sm font-black transition hover:bg-white/20"><WalletCards size={15} className="mr-1 inline" /> Split</button>
                  </div>
                  <div className="mb-2 max-h-24 space-y-1 overflow-y-auto">
                    {payments.map((payment, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_32px] gap-1.5">
                        <select className="h-9 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-bold text-white outline-none" value={payment.method} onChange={(e) => setPayments((ps) => ps.map((p, i) => i === index ? { ...p, method: e.target.value } : p))}>
                          <option className="text-pos-ink" value="cash">Cash</option><option className="text-pos-ink" value="card">Card</option><option className="text-pos-ink" value="contactless">Contactless</option><option className="text-pos-ink" value="gift_card">Gift card</option><option className="text-pos-ink" value="account">Account</option>
                        </select>
                        <input className="h-9 rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-bold text-white outline-none placeholder:text-white/50" placeholder="Amount" value={payment.amount} onChange={(e) => setPayments((ps) => ps.map((p, i) => i === index ? { ...p, amount: e.target.value } : p))} />
                        <button onClick={() => setPayments((ps) => ps.filter((_, i) => i !== index))} className="h-9 rounded-lg border border-white/20 bg-white/10 font-black">x</button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={hold} className="h-11 rounded-xl border border-white/20 bg-white/10 text-xs font-black transition hover:bg-white/20"><Pause className="mr-1 inline" size={15} /> Hold</button>
                    <button onClick={printReceipt} className="h-11 rounded-xl border border-white/20 bg-white/10 text-xs font-black transition hover:bg-white/20"><Printer className="mr-1 inline" size={15} /> Reprint</button>
                    <button onClick={completePayment} disabled={!basket.length} className="h-11 rounded-xl bg-gradient-to-br from-pos-gold to-[#ffe17a] text-sm font-black text-[#412d00] shadow-lg shadow-pos-gold/25 disabled:cursor-not-allowed disabled:opacity-50">
                      <CreditCard className="mr-1 inline" size={15} /> Pay
                    </button>
                  </div>
                  <button onClick={closeShift} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 text-xs font-black transition hover:bg-white/20">
                    <ReceiptText size={14} /> Close shift / Z-report
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {challengeProduct && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-pos-navy/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[20px] bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black text-pos-rose">Challenge 25 Required</h2>
            <p className="mt-2 text-sm text-slate-600">Confirm ID outcome for {challengeProduct.name}. This prompt cannot be skipped for age-restricted products.</p>
            <div className="mt-4 grid gap-2">{challengeOptions.map((option) => <button key={option} onClick={() => confirmChallenge(option)} className="rounded-2xl border border-pos-line px-3 py-3 text-left text-sm font-bold transition hover:border-pos-teal/40 hover:bg-pos-paper">{option}</button>)}</div>
          </div>
        </div>
      )}

      {pendingWeight && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-pos-navy/70 p-4 backdrop-blur-sm">
          <form onSubmit={submitWeightEntry} className="w-full max-w-md rounded-[20px] bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-pos-navy">Enter weight</h2>
                <p className="mt-1 text-sm text-slate-600">{pendingWeight.product.name} at {gbp(pendingWeight.product.pricePence)}/{pendingWeight.product.unitOfMeasure || 'kg'}</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f8f4] text-pos-teal"><Scale size={21} /></div>
            </div>
            <label className="mt-4 block text-sm font-black text-pos-navy">
              Weight ({pendingWeight.product.unitOfMeasure || 'kg'})
              <input
                autoFocus
                type="number"
                min="0.001"
                step="0.001"
                value={weightEntry.value}
                onChange={(e) => setWeightEntry((current) => ({ ...current, value: e.target.value }))}
                className="mt-1 h-12 w-full rounded-2xl border border-pos-line px-3 text-lg font-black outline-none focus:border-pos-teal focus:ring-4 focus:ring-pos-teal/10"
              />
            </label>
            <label className="mt-3 block text-sm font-black text-pos-navy">
              Source / note
              <select
                value={weightEntry.reason}
                onChange={(e) => setWeightEntry((current) => ({ ...current, reason: e.target.value }))}
                className="mt-1 h-11 w-full rounded-2xl border border-pos-line px-3 text-sm font-bold outline-none focus:border-pos-teal focus:ring-4 focus:ring-pos-teal/10"
              >
                <option>Manual scale entry</option>
                <option>Scanner label failed</option>
                <option>Scale display verified</option>
                <option>Loose item PLU entry</option>
              </select>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPendingWeight(null)} className="h-11 rounded-2xl border border-pos-line bg-white font-black text-pos-navy">Cancel</button>
              <button className="h-11 rounded-2xl bg-pos-teal font-black text-white shadow-lg shadow-pos-teal/20">Add weighed item</button>
            </div>
          </form>
        </div>
      )}

      <div ref={receiptRef} className="receipt-print hidden p-3 text-xs">
        <h1 className="text-center font-bold">Jahan Local Grocers</h1>
        <p className="text-center">VAT Reg: GB123456789</p>
        <p>Receipt: {lastReceipt?.receiptNumber || 'Last receipt unavailable'}</p>
        {lastReceipt?.lines?.map((line) => <p key={line._id}>{line.productName} {line.soldByWeight ? displayQuantity(line) : `x${line.quantity}`} {gbp(line.lineTotalPence)}</p>)}
        <p className="font-bold">Total {gbp(lastReceipt?.totalPence || totals.gross)}</p>
      </div>
    </main>
  );
}
