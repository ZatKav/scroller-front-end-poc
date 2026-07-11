'use client';

import type { ReactNode } from 'react';
import ZelliWordmark from '@/components/ZelliWordmark';
import { PrimaryButton, SecondaryButton } from './ui';

export const ONBOARDING_TOTAL_STEPS = 4;

interface OnboardingChromeProps {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel: string;
  onSecondary: () => void;
  secondaryDisabled?: boolean;
}

/**
 * Shared layout for every onboarding step: Zelli wordmark + "Step X of 4"
 * indicator, heading, subtitle, the step's fields, and a magenta primary /
 * green-outline secondary button pair pinned to the bottom. Mirrors the Zelli
 * MVP onboarding frames (nodes 29:62, 29:88, 30:104, 30:151).
 */
export default function OnboardingChrome({
  step,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: OnboardingChromeProps) {
  return (
    <div className="flex min-h-screen justify-center bg-zelli-bg px-6 py-12">
      <div className="flex w-full max-w-[393px] flex-col">
        <header className="flex items-start justify-between">
          <ZelliWordmark />
          <span className="mt-2 text-[13px] font-bold text-zelli-accent">
            Step {step} of {ONBOARDING_TOTAL_STEPS}
          </span>
        </header>

        <div className="mt-16">
          <h1 className="text-[34px] font-bold leading-tight text-zelli-ink">{title}</h1>
          <p className="mt-5 text-base leading-6 text-zelli-ink">{subtitle}</p>
        </div>

        <div className="mt-9">{children}</div>

        <div className="mt-auto space-y-3 pt-12">
          <PrimaryButton type="button" onClick={onPrimary} disabled={primaryDisabled}>
            {primaryLabel}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onSecondary} disabled={secondaryDisabled}>
            {secondaryLabel}
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
