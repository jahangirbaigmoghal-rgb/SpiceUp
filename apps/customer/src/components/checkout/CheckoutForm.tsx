import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea } from '../ui/Input';
import type { OrderType, CustomerDetails } from '../../types';

const baseSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  phone: z
    .string()
    .min(7, 'Please enter a valid phone number')
    .regex(/^[0-9 +()-]+$/, 'Phone number contains invalid characters'),
  email: z.string().email('Please enter a valid email address'),
  address: z.string().optional(),
});

const deliverySchema = baseSchema.extend({
  address: z
    .string()
    .min(5, 'Please enter your full delivery address'),
});

export type CheckoutFormValues = z.infer<typeof baseSchema>;

interface CheckoutFormProps {
  orderType: OrderType;
  onSubmit: (data: CustomerDetails) => void;
  defaultValues?: Partial<CustomerDetails>;
}

export function CheckoutForm({
  orderType,
  onSubmit,
  defaultValues,
}: CheckoutFormProps) {
  const schema = orderType === 'delivery' ? deliverySchema : baseSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });

  const handleValid = (data: CheckoutFormValues) => {
    onSubmit({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address || '',
    });
  };

  return (
    <form
      id="checkout-form"
      onSubmit={handleSubmit(handleValid)}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">
          1
        </span>
        <h3 className="font-bold text-base text-slate-900">
          {orderType === 'delivery' ? 'Delivery' : 'Contact'} Details
        </h3>
      </div>

      <Input
        label="Full Name"
        placeholder="Sarah Jenkins"
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Phone Number"
          type="tel"
          placeholder="07700 900077"
          required
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="sarah@example.com"
          required
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      {orderType === 'delivery' && (
        <Textarea
          label="Delivery Address"
          placeholder="Street number, house/apartment info…"
          required
          rows={3}
          error={errors.address?.message}
          {...register('address')}
        />
      )}
    </form>
  );
}
