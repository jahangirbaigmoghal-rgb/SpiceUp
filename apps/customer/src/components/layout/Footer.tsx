import { MapPin, Phone, Mail, Clock, UtensilsCrossed } from 'lucide-react';
import type { StoreSettings } from '../../types';

interface FooterProps {
  settings: StoreSettings;
}

export function Footer({ settings }: FooterProps) {
  return (
    <footer className="mt-16 bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand & description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  {settings.storeName || 'SpiceUp'}
                </h3>
                <p className="text-xs text-slate-400">
                  {settings.pwaBannerSub}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {settings.pwaBannerDescription}
            </p>
          </div>

          {/* Contact info */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                <span className="text-slate-400">{settings.storeAddress}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-brand-400 shrink-0" />
                <a
                  href={`tel:${settings.storePhone}`}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {settings.storePhone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                <a
                  href={`mailto:${settings.storeEmail}`}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {settings.storeEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Opening hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              Opening Hours
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex justify-between">
                <span>Monday</span>
                <span>16:00 – 23:00</span>
              </li>
              <li className="flex justify-between">
                <span>Tuesday</span>
                <span>16:00 – 23:00</span>
              </li>
              <li className="flex justify-between">
                <span>Wednesday</span>
                <span>16:00 – 23:00</span>
              </li>
              <li className="flex justify-between">
                <span>Thursday</span>
                <span>16:00 – 23:00</span>
              </li>
              <li className="flex justify-between font-medium text-brand-400">
                <span>Friday</span>
                <span>12:00 – 00:00</span>
              </li>
              <li className="flex justify-between font-medium text-brand-400">
                <span>Saturday</span>
                <span>12:00 – 00:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday</span>
                <span>12:00 – 23:00</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Powered by
            <span className="font-bold text-brand-400">SpiceUp</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
