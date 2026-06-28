import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  XCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  ChefHat,
  Truck,
  Ban,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { ordersApi } from '@spiceup/api-client';
import { gbp } from '@spiceup/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Order {
  _id: string;
  reference: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalPence: number;
  customerDetails?: {
    name: string;
    phone: string;
    address?: string;
    postcode?: string;
  };
  items: any[];
  createdAt: string;
  notes?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'preparing', label: 'Preparing', icon: ChefHat, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  { value: 'ready', label: 'Ready', icon: Package, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  { value: 'cancelled', label: 'Cancelled', icon: Ban, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
];

const statusMap: Record<string, typeof statusOptions[0]> = Object.fromEntries(statusOptions.map(s => [s.value, s]));

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [showRefundModal, setShowRefundModal] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ordersApi.list({ limit: 200 });
      setOrders(res.data.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setActionLoading(orderId);
    try {
      await ordersApi.updateStatus(orderId, status);
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!showCancelModal || !cancelReason.trim()) return;
    setActionLoading(showCancelModal);
    try {
      await ordersApi.cancel(showCancelModal, cancelReason);
      setShowCancelModal(null);
      setCancelReason('');
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async () => {
    if (!showRefundModal || !refundAmount) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Refund amount must be a positive number');
      return;
    }
    setActionLoading(showRefundModal);
    try {
      const amountPence = Math.round(parseFloat(refundAmount) * 100);
      await ordersApi.refund(showRefundModal, { amountPence, reason: 'POS refund' });
      setShowRefundModal(null);
      setRefundAmount('');
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to refund order');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.reference?.toLowerCase().includes(search.toLowerCase()) ||
      order.customerDetails?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.customerDetails?.phone?.includes(search);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatItems = (items: any[]) => {
    return items.map((item) => {
      const name = item.name || item.menuItemSnapshot?.name || 'Unknown Item';
      const qty = item.quantity || 1;
      const price = item.pricePence || item.menuItemSnapshot?.basePricePence || 0;
      const mods: string[] = item.modifiers?.map((m: any) => m.name || m.optionName) || [];
      return { name, quantity: qty, pricePence: price, modifiers: mods };
    });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ref, name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:border-brand-500 outline-none w-64"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-brand-500 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center space-x-2 bg-red-950/30 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredOrders.length === 0 && !loading && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-600">
            <Package className="w-12 h-12 stroke-[1] mb-2" />
            <span className="text-xs">No orders found</span>
          </div>
        )}

        {filteredOrders.map((order) => {
          const isExpanded = expandedOrder === order._id;
          const statusMeta = statusMap[order.status] || statusOptions[0];
          const StatusIcon = statusMeta.icon;

          return (
            <div
              key={order._id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? 'border-brand-500/30 bg-slate-900/60'
                  : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50'
              }`}
            >
              {/* Order Header Row */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center space-x-1.5 ${statusMeta.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusMeta.label}</span>
                  </div>

                  <div>
                    <span className="text-sm font-bold text-slate-200">{order.reference}</span>
                    <span className="text-xs text-slate-500 ml-2">{order.orderType}</span>
                  </div>

                  <div className="text-xs text-slate-400">
                    {order.customerDetails?.name || 'Walk-in'}
                  </div>

                  <div className="text-xs text-slate-500">
                    {formatDate(order.createdAt)}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm font-extrabold text-brand-400">{gbp(order.totalPence)}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {order.paymentMethod}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-800/50 pt-4 space-y-4">
                  {/* Customer Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Customer</span>
                      <span className="text-xs font-semibold text-slate-200">{order.customerDetails?.name || 'N/A'}</span>
                      <span className="text-xs text-slate-400 block">{order.customerDetails?.phone || ''}</span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Address</span>
                      <span className="text-xs text-slate-300">
                        {order.customerDetails?.address || 'N/A'}
                        {order.customerDetails?.postcode && `, ${order.customerDetails.postcode}`}
                      </span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Payment</span>
                      <span className="text-xs font-semibold text-slate-200">{order.paymentMethod}</span>
                      <span className="text-xs text-slate-400 block">{order.paymentStatus}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">Items</span>
                    <div className="space-y-1.5">
                      {formatItems(order.items).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-800/50">
                          <div>
                            <span className="text-xs font-semibold text-slate-200">{item.quantity}x {item.name}</span>
                            {item.modifiers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {item.modifiers.map((mod: string, modIdx: number) => (
                                  <span key={modIdx} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{mod}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-300">{gbp(item.pricePence * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Update Status:</span>
                      {statusOptions
                        .filter((s) => s.value !== order.status)
                        .map((s) => (
                          <button
                            key={s.value}
                            disabled={actionLoading === order._id}
                            onClick={() => handleStatusUpdate(order._id, s.value)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                          >
                            {s.label}
                          </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowRefundModal(order._id)}
                        disabled={actionLoading === order._id || order.status === 'cancelled'}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Refund</span>
                      </button>
                      <button
                        onClick={() => setShowCancelModal(order._id)}
                        disabled={actionLoading === order._id || order.status === 'cancelled'}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-950/30 border border-red-500/30 hover:bg-red-950/50 text-red-400 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Cancel Order</h3>
            <p className="text-xs text-slate-400">Please provide a reason for cancellation.</p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancellation reason..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-red-500 outline-none"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowCancelModal(null); setCancelReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || actionLoading === showCancelModal}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Refund Order</h3>
            <p className="text-xs text-slate-400">Enter refund amount in GBP.</p>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
              <input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 outline-none"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowRefundModal(null); setRefundAmount(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundAmount || actionLoading === showRefundModal}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
