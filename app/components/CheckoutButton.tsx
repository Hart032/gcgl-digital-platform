'use client';

import React from 'react';
import { usePaystackPayment } from 'react-paystack';

interface CheckoutButtonProps {
  email: string;
  amount: number; // Amount in major currency (e.g., Cedis)
  onSuccess?: (reference: { reference: string }) => void;
  onClose?: () => void;
}

export default function CheckoutButton({ email, amount, onSuccess, onClose }: CheckoutButtonProps) {
  const config = {
    reference: new Date().getTime().toString(),
    email: email,
    amount: amount * 100, // Paystack expects amount in subunits (pesewas)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_sample',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const handleSuccess = (reference: { reference: string }) => {
    if (onSuccess) {
      onSuccess(reference);
      return;
    }

    alert('Payment successful! Reference: ' + reference.reference);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    console.log('Payment modal closed');
  };

  return (
    <button
      type="button"
      onClick={() => initializePayment({ onSuccess: handleSuccess, onClose: handleClose })}
      className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition shadow-sm"
    >
      Pay GH₵ {amount} via Paystack
    </button>
  );
}