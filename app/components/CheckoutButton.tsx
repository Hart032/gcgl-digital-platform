'use client';

import React from 'react';
import { usePaystackPayment } from 'react-paystack';

interface CheckoutButtonProps {
  email: string;
  amount: number; // Amount in major currency (e.g., Cedis)
}

export default function CheckoutButton({ email, amount }: CheckoutButtonProps) {
  const config = {
    reference: new Date().getTime().toString(),
    email: email,
    amount: amount * 100, // Paystack expects amount in subunits (pesewas)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_sample',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: { reference: string }) => {
    alert('Payment successful! Reference: ' + reference.reference);
  };

  const onClose = () => {
    console.log('Payment modal closed');
  };

  return (
    <button
      type="button"
      onClick={() => initializePayment({ onSuccess, onClose })}
      className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition shadow-sm"
    >
      Pay GH₵ {amount} via Paystack
    </button>
  );
}