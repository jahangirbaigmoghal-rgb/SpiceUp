import { motion } from 'framer-motion';
import { MapPin, Check, AlertCircle, Star, Clock, Truck } from 'lucide-react';
import { gbp } from '@spiceup/utils';
import { Button } from '../ui/Button';
import type { StoreSettings, PostcodeCheckResult } from '../../types';

interface HeroBannerProps {
  settings: StoreSettings;
  postcode: string;
  setPostcode: (v: string) => void;
  postcodeStatus: PostcodeCheckResult;
  postcodeError: string;
  checking: boolean;
  onCheckPostcode: (e: React.FormEvent) => void;
}

export function HeroBanner({
  settings,
  postcode,
  setPostcode,
  postcodeStatus,
  postcodeError,
  checking,
  onCheckPostcode,
}: HeroBannerProps) {
  const title = settings.pwaBannerTitle || settings.storeName || 'SpiceUp';
  const words = title.split(' ');
  const lastWord = words.length > 1 ? words.pop() : null;

  return (
    <section
      className="relative rounded-3xl overflow-hidden shadow-xl"
      aria-label="Restaurant hero"
    >
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${settings.pwaBannerImage}')`,
        }}
        aria-hidden
      />
      {/* Warm gradient overlay — left dark to right transparent (light mode) */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        {/* Left text block */}
        <motion.div
          className="space-y-4 max-w-xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Promo badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/90 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Truck className="w-3.5 h-3.5" />
            Free Delivery over {gbp(settings.freeDeliveryThresholdPence ?? 1500)}
          </span>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {lastWord ? (
              <>
                {words.join(' ')}{' '}
                <span className="bg-gradient-to-r from-brand-400 to-orange-300 bg-clip-text text-transparent">
                  {lastWord}
                </span>
              </>
            ) : (
              title
            )}
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-md">
            {settings.pwaBannerDescription}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm text-slate-300">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-brand-400 text-brand-400" />
              <span className="font-bold text-white">4.8</span>
              <span className="text-slate-400">(5,762+ reviews)</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-slate-500 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>
                Collection {settings.estimatedCollectionMinutes ?? 15}m
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-brand-400" />
              <span>
                Delivery {settings.estimatedDeliveryMinutes ?? 45}m
              </span>
            </div>
          </div>
        </motion.div>

        {/* Postcode checker card */}
        <motion.div
          className="w-full lg:w-80 shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-500" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Check Delivery
              </h3>
            </div>

            <form onSubmit={onCheckPostcode} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. ST6 5EP"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
                aria-label="Enter your postcode"
              />
              <Button type="submit" size="md" loading={checking}>
                {checking ? '' : 'Verify'}
              </Button>
            </form>

            {/* Result */}
            {postcodeStatus.checked && postcodeStatus.valid && (
              <motion.p
                className="text-sm text-green-600 font-semibold flex items-center gap-1.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Check className="w-4 h-4 shrink-0" />
                We deliver to you! {postcodeStatus.deliveryFee > 0 ? `Fee: ${gbp(postcodeStatus.deliveryFee)}` : 'FREE delivery'}
              </motion.p>
            )}

            {postcodeError && (
              <motion.p
                className="text-sm text-red-600 font-semibold flex items-start gap-1.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {postcodeError}
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
