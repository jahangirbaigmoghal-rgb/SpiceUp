import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Flame, 
  Clock, 
  Check, 
  ChevronRight, 
  RefreshCw, 
  Utensils, 
  Truck, 
  ShoppingBag
} from 'lucide-react';
import { minutesSince, kdsUrgencyClass } from '@spiceup/utils';
import { ordersApi } from '@spiceup/api-client';

interface OrderItem {
  name: string;
  quantity: number;
  modifiers?: Array<{ name: string }>;
}

interface Order {
  _id: string;
  orderRef: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'collected';
  createdAt: string;
  customerDetails?: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
  notes?: string;
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const prepTimeMinutes = 12;

  // Poll intervals for timers
  const [, setTick] = useState(0);

  // Load orders initial
  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.list({ status: 'confirmed,preparing' });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.warn('Failed to load active orders. Using mock simulator mode.');
      // Mock fallback data for demonstration
      setOrders([
        {
          _id: '1',
          orderRef: 'ORD-20260531-0001',
          orderType: 'dine-in',
          status: 'confirmed',
          createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5 mins ago
          customerDetails: { name: 'Table 4', phone: '' },
          items: [
            { name: '12" Pepperoni Feast Pizza', quantity: 2, modifiers: [{ name: 'Stuffed Crust' }, { name: 'Extra Cheese' }] },
            { name: 'Garlic Pizza Bread', quantity: 1 }
          ],
          notes: 'No onions on garlic bread please.'
        },
        {
          _id: '2',
          orderRef: 'ORD-20260531-0002',
          orderType: 'delivery',
          status: 'preparing',
          createdAt: new Date(Date.now() - 15 * 60_000).toISOString(), // 15 mins ago
          customerDetails: { name: 'Sarah Jenkins', phone: '07700900077' },
          items: [
            { name: '12" BBQ Chicken Pizza', quantity: 1, modifiers: [{ name: 'Thin Crust' }] },
            { name: 'Potato Wedges', quantity: 2 }
          ]
        },
        {
          _id: '3',
          orderRef: 'ORD-20260531-0003',
          orderType: 'takeaway',
          status: 'confirmed',
          createdAt: new Date(Date.now() - 25 * 60_000).toISOString(), // 25 mins ago
          customerDetails: { name: 'John Doe (AI Phone)', phone: '07700900123' },
          items: [
            { name: '12" Margherita Pizza', quantity: 1 },
            { name: 'Chicken Wings (Hot)', quantity: 1 }
          ],
          notes: 'Customer paying via card link.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    
    // Timer ticking for age calculation every 10 seconds
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);

    // Socket.io initialization
    const socketUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Realtime events
    socket.on('order:created', (newOrder: Order) => {
      // Play high pitch kitchen notification beep
      playBeep();
      setOrders(prev => {
        if (prev.some(o => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
    });

    socket.on('order:status_updated', (updatedOrder: Order) => {
      setOrders(prev => {
        // If order transitioned to ready/delivered/cancelled, remove it from cooking queue
        if (['ready', 'dispatched', 'delivered', 'collected', 'cancelled'].includes(updatedOrder.status)) {
          return prev.filter(o => o._id !== updatedOrder._id);
        }
        // Otherwise update status
        return prev.map(o => o._id === updatedOrder._id ? { ...o, status: updatedOrder.status } : o);
      });
    });

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // beep length
    } catch (e) {
      console.warn('Audio feedback blocked by browser policies.');
    }
  };

  // Status transitions: confirmed -> preparing -> ready
  const handleBump = async (id: string, currentStatus: Order['status']) => {
    const nextStatusMap: Record<string, Order['status']> = {
      confirmed: 'preparing',
      preparing: 'ready'
    };
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    try {
      await ordersApi.updateStatus(id, nextStatus);
      // Update local state
      if (nextStatus === 'ready') {
        // Remove from preparing view
        setOrders(prev => prev.filter(o => o._id !== id));
        playBeep(); // completion sound
      } else {
        setOrders(prev => prev.map(o => o._id === id ? { ...o, status: nextStatus } : o));
      }
    } catch (err) {
      // Fallback update in case API is mocked
      if (nextStatus === 'ready') {
        setOrders(prev => prev.filter(o => o._id !== id));
      } else {
        setOrders(prev => prev.map(o => o._id === id ? { ...o, status: nextStatus } : o));
      }
    }
  };

  const getOrderTypeIcon = (type: Order['orderType']) => {
    switch (type) {
      case 'dine-in': return <Utensils className="w-4 h-4 text-emerald-400" />;
      case 'delivery': return <Truck className="w-4 h-4 text-brand-400" />;
      case 'takeaway': return <ShoppingBag className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* ─── Header ─── */}
      <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 bg-slate-950/80 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide uppercase">Kitchen Display System (KDS)</h1>
            <p className="text-[10px] text-slate-500">Live Preparation Station</p>
          </div>
          <span className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2 text-xs bg-slate-900 px-3 py-1 rounded-full text-slate-400 border border-slate-800">
            <span>Prep Queue: {orders.length} Tickets</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs bg-slate-900/60 px-3 py-1 rounded-full text-slate-400 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>Avg Cook: {prepTimeMinutes}m</span>
          </div>

          <button 
            onClick={loadOrders} 
            className="p-2 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-slate-400 font-semibold">{isConnected ? 'Server Linked' : 'Standalone'}</span>
          </div>
        </div>
      </header>

      {/* ─── Ticket Workspace ─── */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-900/20 flex space-x-4 items-start select-none">
        
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-xs">Connecting cook monitors...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
            <Check className="w-16 h-16 stroke-[1] text-emerald-500/40 mb-2" />
            <span className="text-sm font-semibold">Kitchen clear! All orders prepared.</span>
          </div>
        ) : (
          orders.map((order) => {
            const ageMins = minutesSince(order.createdAt);
            const urgencyClass = kdsUrgencyClass(order.createdAt);
            const isUrgent = ageMins > 20;

            return (
              <div 
                key={order._id} 
                className={`w-80 shrink-0 kds-card rounded-2xl flex flex-col max-h-[80vh] shadow-2xl transition-all duration-300 ${urgencyClass} ${
                  isUrgent ? 'kds-urgent' : ''
                }`}
              >
                {/* Card Header */}
                <header className="p-4 border-b border-white/5 flex flex-col space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm tracking-tight text-white">{order.orderRef}</span>
                    <div className="flex items-center space-x-1 bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300">
                      {getOrderTypeIcon(order.orderType)}
                      <span className="ml-1">{order.orderType}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center space-x-1 text-slate-300 text-xs font-semibold">
                      <span>{order.customerDetails?.name || 'Walkin'}</span>
                      {order.customerDetails?.phone && (
                        <span className="text-slate-500 text-[10px]">({order.customerDetails.phone})</span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-xs font-bold text-brand-400">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      <span>{ageMins}m</span>
                    </div>
                  </div>
                </header>

                {/* Card Contents (Items list) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-start text-sm">
                        <span className="font-extrabold text-white">{item.quantity}x <span className="underline decoration-brand-500/30 decoration-2">{item.name}</span></span>
                      </div>
                      
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="pl-4 border-l border-white/10 space-y-0.5">
                          {item.modifiers.map((m, mIdx) => (
                            <div key={mIdx} className="text-xs font-bold text-amber-300">
                              + {m.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {order.notes && (
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-xs text-brand-300 font-semibold leading-relaxed mt-2">
                      Notes: {order.notes}
                    </div>
                  )}
                </div>

                {/* Card Footer (Bump button) */}
                <footer className="p-3 border-t border-white/5 bg-slate-950/20">
                  <button
                    onClick={() => handleBump(order._id, order.status)}
                    className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all text-white bg-brand-600 hover:bg-brand-500 active:scale-98 shadow-lg shadow-brand-500/10 cursor-pointer"
                  >
                    <span>{order.status === 'confirmed' ? 'START COOKING' : 'BUMP / COMPLETE'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </footer>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
