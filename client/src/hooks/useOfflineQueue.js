import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const QUEUE_KEY = 'offline_transactions';

export function useOfflineQueue() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(() => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      syncQueue();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  function enqueue(payload) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    setQueuedCount(queue.length);
  }

  async function syncQueue() {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      try {
        await api.post('/transactions/sale', item.payload);
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    setQueuedCount(remaining.length);
    if (remaining.length < queue.length) toast.success('Offline transactions synced');
  }

  return { online, queuedCount, enqueue, syncQueue };
}
