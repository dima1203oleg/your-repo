import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressiveLoader, SkeletonCard, SkeletonTable, SkeletonChart } from '../../components/ProgressiveLoader';

// Mock timers
jest.useFakeTimers();

describe('ProgressiveLoader', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('shows loading state initially', () => {
    render(
      <ProgressiveLoader delay={0}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    expect(screen.getByText((content, element) => {
      return content.includes('Завантаження...');
    })).toBeInTheDocument();
  });

  it('shows content after loading completes', async () => {
    render(
      <ProgressiveLoader delay={0} minDisplayTime={0}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    // Fast-forward past loading time
    act(() => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.getByText('Loaded content')).toBeInTheDocument();
    });
  });

  it('respects delay before showing loading UI', () => {
    render(
      <ProgressiveLoader delay={200}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    // Should not show loading UI immediately
    expect(screen.queryByText('Завантаження...')).not.toBeInTheDocument();

    // Advance past delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText((content, element) => {
      return content.includes('Завантаження...');
    })).toBeInTheDocument();
  });

  it('respects minimum display time', async () => {
    const onLoadComplete = jest.fn();

    render(
      <ProgressiveLoader delay={0} minDisplayTime={500} onLoadComplete={onLoadComplete}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    // Fast-forward past loading time (shorter than minDisplayTime)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should still be loading
    expect(screen.getByText((content, element) => {
      return content.includes('Завантаження...');
    })).toBeInTheDocument();
    expect(onLoadComplete).not.toHaveBeenCalled();

    // Fast-forward past minimum display time AND loading time
    act(() => {
      jest.advanceTimersByTime(1200); // Total 1500ms to ensure loading completes
    });

    await waitFor(() => {
      expect(screen.getByText('Loaded content')).toBeInTheDocument();
      expect(onLoadComplete).toHaveBeenCalled();
    });
  });

  it('shows custom fallback when provided', () => {
    const customFallback = <div>Custom loading...</div>;

    render(
      <ProgressiveLoader delay={0} fallback={customFallback}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    expect(screen.queryByText('Завантаження...')).not.toBeInTheDocument();
  });

  it('updates progress during loading', () => {
    render(
      <ProgressiveLoader delay={0}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    // Advance past delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Progress should be > 0
    const progressText = screen.getByText(/Завантаження... \d+%/);
    expect(progressText).toBeInTheDocument();

    // Progress should increase over time
    act(() => {
      jest.advanceTimersByTime(100);
    });

    const newProgressText = screen.getByText(/Завантаження... \d+%/);
    expect(newProgressText).toBeInTheDocument();
  });

  it('calls onLoadComplete when loading finishes', async () => {
    const onLoadComplete = jest.fn();

    render(
      <ProgressiveLoader delay={0} minDisplayTime={0} onLoadComplete={onLoadComplete}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    act(() => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(onLoadComplete).toHaveBeenCalled();
    });
  });

  it('cleans up timers on unmount', () => {
    const { unmount } = render(
      <ProgressiveLoader delay={200}>
        <div>Loaded content</div>
      </ProgressiveLoader>
    );

    unmount();

    // Should not cause memory leaks or errors
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Завантаження...')).not.toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('renders skeleton card structure', () => {
    render(<SkeletonCard />);
    
    const skeleton = document.querySelector('.bg-slate-800.rounded-lg.p-4.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-slate-800', 'rounded-lg', 'p-4', 'animate-pulse');
  });

  it('applies custom className', () => {
    render(<SkeletonCard className="custom-class" />);
    
    const skeleton = document.querySelector('.bg-slate-800.rounded-lg.p-4.animate-pulse');
    expect(skeleton).toHaveClass('custom-class');
  });
});

describe('SkeletonTable', () => {
  it('renders default number of rows', () => {
    render(<SkeletonTable />);
    
    const rows = document.querySelectorAll('.space-y-2 > div');
    expect(rows).toHaveLength(5);
  });

  it('renders custom number of rows', () => {
    render(<SkeletonTable rows={3} />);
    
    const rows = document.querySelectorAll('.space-y-2 > div');
    expect(rows).toHaveLength(3);
  });

  it('applies custom className', () => {
    render(<SkeletonTable className="custom-class" />);
    
    const table = document.querySelector('.space-y-2');
    expect(table).toHaveClass('custom-class');
  });
});

describe('SkeletonChart', () => {
  it('renders chart skeleton structure', () => {
    render(<SkeletonChart />);
    
    const chart = document.querySelector('.bg-slate-800.rounded-lg.p-6');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveClass('bg-slate-800', 'rounded-lg', 'p-6');
  });

  it('applies custom className', () => {
    render(<SkeletonChart className="custom-class" />);
    
    const chart = document.querySelector('.bg-slate-800.rounded-lg.p-6');
    expect(chart).toHaveClass('custom-class');
  });
});
