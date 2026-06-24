import { useState } from 'react';
import { deliveryApi } from '@spiceup/api-client';
import { isValidUKPostcode } from '@spiceup/utils';
import type { PostcodeCheckResult } from '../types';

interface Options {
  baseDeliveryFee: number;
}

export function useDeliveryZone({ baseDeliveryFee }: Options) {
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<PostcodeCheckResult>({
    checked: false,
    valid: false,
    deliveryFee: 0,
  });
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const check = async (rawPostcode?: string): Promise<boolean> => {
    const pc = (rawPostcode ?? postcode).replace(/\s+/g, '').toUpperCase();
    setError('');

    if (!isValidUKPostcode(pc)) {
      setError('Please enter a valid UK postcode.');
      setStatus({ checked: true, valid: false, deliveryFee: 0 });
      return false;
    }

    setChecking(true);
    try {
      const res = await deliveryApi.validateZone({ postcode: pc });
      if (res.data?.valid) {
        setStatus({
          checked: true,
          valid: true,
          deliveryFee: res.data.deliveryFeePence || 0,
        });
        return true;
      }
      setStatus({ checked: true, valid: false, deliveryFee: 0 });
      setError('Sorry, your address is outside our delivery zone. Collection only.');
      return false;
    } catch {
      // Mock fallback for ST6 / WN areas
      if (pc.startsWith('ST6') || pc.startsWith('WN1') || pc.startsWith('WN2')) {
        setStatus({ checked: true, valid: true, deliveryFee: baseDeliveryFee });
        return true;
      }
      setStatus({ checked: true, valid: false, deliveryFee: 0 });
      setError('Outside delivery boundaries. Please select Store Collection.');
      return false;
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setPostcode('');
    setStatus({ checked: false, valid: false, deliveryFee: 0 });
    setError('');
  };

  return {
    postcode,
    setPostcode,
    status,
    error,
    checking,
    check,
    reset,
  };
}
