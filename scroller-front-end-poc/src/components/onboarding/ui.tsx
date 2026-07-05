'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/** Magenta full-width CTA ("Continue", "Build my feed"). */
export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-[52px] w-full rounded-zelli-btn bg-zelli-primary text-base font-bold text-white transition-colors hover:bg-zelli-primary-hover focus:outline-none focus:ring-2 focus:ring-zelli-primary focus:ring-offset-2 focus:ring-offset-zelli-bg disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

/** Green-outlined full-width secondary action ("Skip for now", "I'm flexible"). */
export function SecondaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-[52px] w-full rounded-zelli-btn border border-zelli-accent bg-zelli-bg text-base font-bold text-zelli-accent transition-colors hover:bg-zelli-accent-soft focus:outline-none focus:ring-2 focus:ring-zelli-accent focus:ring-offset-2 focus:ring-offset-zelli-bg ${className}`}
    >
      {children}
    </button>
  );
}

interface ChoiceChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  children: ReactNode;
}

/** Pill toggle used for bedrooms, property type and must-haves. */
export function ChoiceChip({ selected, children, className = '', ...props }: ChoiceChipProps) {
  const stateClasses = selected
    ? 'bg-zelli-accent-soft border-zelli-accent text-zelli-accent'
    : 'bg-zelli-bg border-zelli-border text-zelli-ink hover:border-zelli-accent';

  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-zelli-accent focus:ring-offset-2 focus:ring-offset-zelli-bg ${stateClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-bold text-zelli-ink">
      {children}
    </label>
  );
}

/** Single-line text input matching the login/sign-in field styling. */
export function TextField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-[52px] w-full rounded-zelli-input border border-zelli-border bg-zelli-surface px-4 text-[15px] text-zelli-ink placeholder:text-zelli-placeholder focus:border-zelli-primary focus:outline-none focus:ring-2 focus:ring-zelli-primary/30 ${className}`}
    />
  );
}
