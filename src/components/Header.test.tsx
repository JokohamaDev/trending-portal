import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header component', () => {
  it('should render header with title', () => {
    render(
      <Header
        isDarkMode={false}
        layoutStyle="A"
        onDarkModeToggle={() => {}}
        onLayoutToggle={() => {}}
        onRefresh={() => {}}
        refreshing={false}
        cooldownSeconds={0}
        loading={false}
      />
    );

    expect(screen.getByText('Vietnam Trending')).toBeInTheDocument();
  });

  it('should call onDarkModeToggle when dark mode button is clicked', () => {
    const onDarkModeToggle = vi.fn();
    render(
      <Header
        isDarkMode={false}
        layoutStyle="A"
        onDarkModeToggle={onDarkModeToggle}
        onLayoutToggle={() => {}}
        onRefresh={() => {}}
        refreshing={false}
        cooldownSeconds={0}
        loading={false}
      />
    );

    const darkModeButton = screen.getByTitle('Switch to dark mode');
    darkModeButton.click();
    expect(onDarkModeToggle).toHaveBeenCalled();
  });

  it('should call onLayoutToggle when layout button is clicked', () => {
    const onLayoutToggle = vi.fn();
    render(
      <Header
        isDarkMode={false}
        layoutStyle="A"
        onDarkModeToggle={() => {}}
        onLayoutToggle={onLayoutToggle}
        onRefresh={() => {}}
        refreshing={false}
        cooldownSeconds={0}
        loading={false}
      />
    );

    const layoutButton = screen.getByTitle('Switch to layout B');
    layoutButton.click();
    expect(onLayoutToggle).toHaveBeenCalled();
  });

  it('should disable refresh button when cooldown is active', () => {
    render(
      <Header
        isDarkMode={false}
        layoutStyle="A"
        onDarkModeToggle={() => {}}
        onLayoutToggle={() => {}}
        onRefresh={() => {}}
        refreshing={false}
        cooldownSeconds={30}
        loading={false}
      />
    );

    const refreshButton = screen.getByTitle(/Wait 30s/);
    expect(refreshButton).toBeDisabled();
  });

  it('should show loading spinner when refreshing', () => {
    render(
      <Header
        isDarkMode={false}
        layoutStyle="A"
        onDarkModeToggle={() => {}}
        onLayoutToggle={() => {}}
        onRefresh={() => {}}
        refreshing={true}
        cooldownSeconds={0}
        loading={false}
      />
    );

    const refreshButton = screen.getByTitle(/Refresh data/);
    expect(refreshButton.textContent).toContain('...');
  });
});
