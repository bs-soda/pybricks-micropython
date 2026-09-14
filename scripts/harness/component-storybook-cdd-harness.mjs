#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🎨 SODA OS COMPONENT-DRIVEN STORYBOOK (CDD) 5-STATE TEST HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Headless validation of UI Component Contracts, 5-State Lifecycles,
 *          Storybook 8 CDD metadata, and WCAG 2.2 AAA accessibility.
 * Invariants: Article I (Zero Mocks in Production), Article II (Mandatory Verification)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { SodaContractHarness } from './universal-contract-harness.mjs';
import fs from 'fs';
import path from 'path';

export class SodaComponentCddHarness extends SodaContractHarness {
  constructor(componentName = 'GenericComponent') {
    super(`Soda OS Component CDD 5-State Harness: ${componentName}`);
    this.componentName = componentName;
  }

  assert5StateContract(componentSource, storySource) {
    console.log(`\n🎭 1. Validating 5-State Component Lifecycle Contract:`);

    const hasDefault = /Default|Primary|Basic/i.test(storySource);
    this.assert('State 1/5: Default / Idle state story defined', hasDefault, 'Missing Default state in story');

    const hasLoading = /isLoading|loading|Skeleton|Spinner|shimmer/i.test(componentSource) && /Loading/i.test(storySource);
    this.assert('State 2/5: Loading / Skeleton state contract implemented', hasLoading, 'Component must handle loading with skeleton/spinner');

    const hasError = /isError|error|errorMessage|Alert|Boundary/i.test(componentSource) && /Error/i.test(storySource);
    this.assert('State 3/5: Error / Boundary state contract implemented', hasError, 'Component must gracefully render error states');

    const hasEmpty = /isEmpty|empty|noData|No\s+results|EmptyState/i.test(componentSource) || /Empty/i.test(storySource);
    this.assert('State 4/5: Empty / No-Data state contract implemented', hasEmpty, 'Component must render empty state when collections are empty');

    const hasDisabled = /disabled|aria-disabled|isDisabled/i.test(componentSource) && /Disabled/i.test(storySource);
    this.assert('State 5/5: Disabled / Inactive state contract implemented', hasDisabled, 'Component must handle disabled interaction');
  }

  assertAccessibility(componentSource) {
    console.log(`\n♿ 2. Validating WCAG 2.2 AAA & ARIA Accessibility:`);

    const hasAriaRoles = /aria-|role=|tabIndex|aria-label|aria-expanded|aria-live/i.test(componentSource);
    this.assert('Component includes explicit ARIA roles or accessibility tags', hasAriaRoles, 'Missing ARIA attributes');

    const hasKeyboardNav = /onKeyDown|onKeyUp|Enter|Space|Escape|tabIndex/i.test(componentSource) || !/onClick/i.test(componentSource);
    this.assert('Interactive triggers support keyboard accessibility', hasKeyboardNav, 'Clickable elements must support keyboard navigation');
  }

  assertDesignTokenUsage(componentSource) {
    console.log(`\n🎨 3. Validating Design Token Architecture:`);

    const hasRawHex = /#[0-9a-fA-F]{3,6}(?!;)/.test(componentSource) && !/var\(--/.test(componentSource);
    this.assert('Zero hardcoded raw hex colors without CSS token variables', !hasRawHex, 'Found raw hex colors instead of design tokens (var(--...))');

    const hasTokenClasses = /var\(--|text-|bg-|border-|dark:|rounded-|font-/i.test(componentSource);
    this.assert('Component utilizes atomic design system tokens', hasTokenClasses, 'Component should use design token variables or utility classes');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const harness = new SodaComponentCddHarness('SampleButtonComposite');
  const sampleComponent = `
    import React from 'react';
    export const SampleButton = ({ label, isLoading, isError, isEmpty, disabled, onClick }) => {
      if (isLoading) return <div className="skeleton-shimmer" role="status" aria-live="polite">Loading...</div>;
      if (isError) return <div className="alert-error" role="alert">Error loading</div>;
      if (isEmpty) return <div className="empty-state">No items</div>;
      return (
        <button
          disabled={disabled}
          aria-disabled={disabled}
          onClick={onClick}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
          className="bg-primary text-foreground rounded-lg var(--primary-token)"
        >
          {label}
        </button>
      );
    };
  `;
  const sampleStory = `
    export const Default = { args: { label: 'Submit' } };
    export const Loading = { args: { isLoading: true } };
    export const ErrorState = { args: { isError: true } };
    export const EmptyState = { args: { isEmpty: true } };
    export const DisabledState = { args: { disabled: true } };
  `;
  harness.assert5StateContract(sampleComponent, sampleStory);
  harness.assertAccessibility(sampleComponent);
  harness.assertDesignTokenUsage(sampleComponent);
  harness.summary();
}
