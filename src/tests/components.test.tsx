import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/common/Button';
import { StatusBadge, CategoryPill, TechTag } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { SectionHeading } from '../components/common/SectionHeading';

describe('UI Component Library Foundation', () => {
  it('renders Button with primary variant and text content', () => {
    render(<Button variant="primary">Launch Pipeline</Button>);
    const button = screen.getByRole('button', { name: /Launch Pipeline/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-brand-primary');
    expect(button).toHaveClass('text-white');
  });

  it('renders Button with disabled and loading state', () => {
    render(<Button disabled isLoading>Processing</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-60');
  });

  it('renders StatusBadge with Verified Live styling', () => {
    render(<StatusBadge status="Verified Live Implementation" />);
    const badge = screen.getByText('Verified Live Implementation');
    expect(badge).toBeInTheDocument();
  });

  it('renders StatusBadge with Google Play Closed Testing ONLY correctly', () => {
    render(<StatusBadge status="Google Play Closed Testing ONLY" />);
    const badge = screen.getByText('Google Play Closed Testing ONLY');
    expect(badge).toBeInTheDocument();
  });

  it('renders TechTag and CategoryPill with proper text', () => {
    render(
      <div>
        <TechTag label="Kubernetes" />
        <CategoryPill label="DevSecOps & Cloud" />
      </div>
    );
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('DevSecOps & Cloud')).toBeInTheDocument();
  });

  it('renders Card with light-theme border and shadow classes', () => {
    const { container } = render(<Card hoverable>Card Content</Card>);
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl).toHaveClass('bg-white');
    expect(cardEl).toHaveClass('border');
    expect(cardEl).toHaveClass('shadow-card');
    expect(cardEl).not.toHaveClass('bg-black');
    expect(cardEl).not.toHaveClass('dark');
  });

  it('renders SectionHeading with title and badge', () => {
    render(<SectionHeading badge="Skills" title="Core Infrastructure" subtitle="Subtitle text" />);
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Core Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });
});

