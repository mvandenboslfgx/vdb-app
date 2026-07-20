import { renderWithProviders, screen } from '../test-utils';

import DevDiagnosticsScreen from '../../app/(customer)/more/diagnostics';

jest.mock('@/config/env', () => {
  const actual = jest.requireActual('@/config/env');
  return {
    ...actual,
    isDevelopment: true,
    clientEnv: {
      ...actual.clientEnv,
      appEnv: 'development',
      supabaseUrl: 'http://127.0.0.1:54321',
      hasSupabaseConfig: true,
      useMockData: false,
    },
  };
});

jest.mock('@/lib/supabase', () => ({
  getSupabase: () => null,
}));

jest.mock('@/api/repositories/_utils', () => ({
  getRepositoryAdapter: () => 'supabase',
}));

describe('DevDiagnosticsScreen', () => {
  it('renders development diagnostics without secrets', async () => {
    await renderWithProviders(<DevDiagnosticsScreen />);
    expect(screen.getByTestId('screen-dev-diagnostics')).toBeTruthy();
    expect(screen.getByTestId('btn-diagnostics-refresh')).toBeTruthy();
    expect(screen.queryByText(/eyJ/)).toBeNull();
    expect(screen.queryByText(/service_role/i)).toBeNull();
  });
});
