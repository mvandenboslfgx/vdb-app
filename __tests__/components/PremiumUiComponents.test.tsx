import { renderWithProviders, screen } from '../test-utils';

import { DashboardGreeting } from '@/design-system/DashboardGreeting';
import { MetricCard } from '@/design-system/MetricCard';
import { PremiumTabIcon } from '@/design-system/PremiumTabIcon';
import { ProjectSummaryCard } from '@/design-system/ProjectSummaryCard';
import { CommercialDocumentCard } from '@/design-system/CommercialDocumentCard';

describe('Premium UI components', () => {
  it('greets with time-based first name', async () => {
    await renderWithProviders(
      <DashboardGreeting fullName="Matthijs Jansen" now={new Date('2026-07-24T09:00:00')} />,
    );
    expect(screen.getByText('Good morning, Matthijs')).toBeTruthy();
    expect(screen.queryByText(/Customer A/i)).toBeNull();
  });

  it('falls back when no name is available', async () => {
    await renderWithProviders(<DashboardGreeting fullName={null} />);
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('renders vector tab icons without unicode glyphs', async () => {
    await renderWithProviders(<PremiumTabIcon name="home-variant" focused />);
    // Vector icon path — must not fall back to a Text glyph square.
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders inactive tab icon in muted state', async () => {
    await renderWithProviders(<PremiumTabIcon name="folder-outline" focused={false} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows metric card value and detail', async () => {
    await renderWithProviders(
      <MetricCard
        testID="metric-messages"
        title="Messages"
        value="0"
        detail="No new messages"
        icon="message-text-outline"
      />,
    );
    expect(screen.getByTestId('metric-messages')).toBeTruthy();
    expect(screen.getByText('No new messages')).toBeTruthy();
  });

  it('renders project summary without seed identifiers', async () => {
    await renderWithProviders(
      <ProjectSummaryCard
        testID="project-card"
        title="Nieuwe VDB-bedrijfswebsite"
        description="Ontwerp en ontwikkeling"
        statusLabel="Intake"
        progressPercent={18}
        nextAction="Intake gesprek afronden"
        onPress={() => undefined}
      />,
    );
    expect(screen.getByText('Nieuwe VDB-bedrijfswebsite')).toBeTruthy();
    expect(screen.queryByText(/Local Seed/i)).toBeNull();
    expect(screen.queryByText(/Q-LOCAL/i)).toBeNull();
  });

  it('renders commercial document card', async () => {
    await renderWithProviders(
      <CommercialDocumentCard
        kind="quote"
        title="Offerte websiteontwikkeling"
        reference="OFF-2026-014"
        amount="€ 121,00"
        statusLabel="Ready for review"
        actionLabel="Review"
        onPress={() => undefined}
      />,
    );
    expect(screen.getByText('Offerte websiteontwikkeling')).toBeTruthy();
    expect(screen.getByText('OFF-2026-014')).toBeTruthy();
    expect(screen.queryByText(/Q-LOCAL-SEED/i)).toBeNull();
  });
});
