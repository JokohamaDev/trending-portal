import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer component', () => {
  it('should render footer with copyright', () => {
    render(
      <Footer
        lastUpdated={null}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('© 2026 Trending Portal')).toBeInTheDocument();
  });

  it('should show loading state when loading', () => {
    render(
      <Footer
        lastUpdated={null}
        loading={true}
        error={null}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show last updated time when data is loaded', () => {
    const lastUpdated = new Date('2026-04-10T10:00:00.000Z').toISOString();
    render(
      <Footer
        lastUpdated={lastUpdated}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText(/GMT\+7/)).toBeInTheDocument();
  });

  it('should show loading state when there is an error', () => {
    render(
      <Footer
        lastUpdated={null}
        loading={false}
        error="Failed to load"
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
