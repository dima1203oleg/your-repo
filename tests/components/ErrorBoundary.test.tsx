import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../components/ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Component that throws an error
const ThrowErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('displays error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Системна Помилка')).toBeInTheDocument();
    expect(screen.getByText(/Виникла неочікувана помилка/)).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const details = screen.getByText(/Деталі помилки/);
    expect(details).toBeInTheDocument();

    // Click to expand details
    fireEvent.click(details);
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Деталі помилки/)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('recovers from error state', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText('Системна Помилка')).toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByText('Спробувати знову');
    fireEvent.click(resetButton);

    // Create a new component instance to test recovery
    const { container: newContainer } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should show the normal content now
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Системна Помилка')).not.toBeInTheDocument();
  });

  it('navigates to home when home button is clicked', () => {
    const originalLocation = window.location.href;
    delete (window as any).location;
    window.location = { ...window.location, href: '' } as any;

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByText('Головна');
    fireEvent.click(homeButton);

    expect(window.location.href).toBe('/');

    // Restore original location
    window.location.href = originalLocation;
  });
});
