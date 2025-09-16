/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PolicyPage from '../page';

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
if (typeof window !== 'undefined') {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: mockWriteText,
    },
    writable: true,
  });
}

describe.skip('PolicyPage - UI tests need React setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render policy generator with default values', () => {
    render(<PolicyPage />);
    
    expect(screen.getByText('Policy Command Generator')).toBeInTheDocument();
    expect(screen.getByText('Basic Policy')).toBeInTheDocument();
    expect(screen.getByText('Token Policy')).toBeInTheDocument();
    expect(screen.getByText('Remove (kick)')).toBeInTheDocument();
    expect(screen.getByText('Restrict (read-only)')).toBeInTheDocument();
  });

  it('should generate basic policy command by default', () => {
    render(<PolicyPage />);

    const commandElement = screen.getByText('/setpolicy basic restrict');
    expect(commandElement).toBeInTheDocument();
  });

  it('should switch to token policy and show token fields', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);
    
    const tokenPolicyButton = screen.getByText('Token Policy');
    await user.click(tokenPolicyButton);
    
    expect(screen.getByLabelText(/Token Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum Amount Required/i)).toBeInTheDocument();
  });

  it('should generate token policy command when token policy is selected', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);

    const tokenPolicyButton = screen.getByText('Token Policy');
    await user.click(tokenPolicyButton);

    const commandElement = screen.getByText('/setpolicy token 1 XCP restrict');
    expect(commandElement).toBeInTheDocument();
  });

  it('should update command when enforcement action changes', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);
    
    const restrictButton = screen.getByText('Restrict (read-only)');
    await user.click(restrictButton);
    
    const commandElement = screen.getByText('/setpolicy basic restrict');
    expect(commandElement).toBeInTheDocument();
  });

  it('should update token symbol and amount in command', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);
    
    // Switch to token policy
    const tokenPolicyButton = screen.getByText('Token Policy');
    await user.click(tokenPolicyButton);
    
    // Change token symbol
    const tokenInput = screen.getByLabelText(/Token Name/i);
    await user.clear(tokenInput);
    await user.type(tokenInput, 'PEPECASH');
    
    // Change amount
    const amountInput = screen.getByLabelText(/Minimum Amount Required/i);
    await user.clear(amountInput);
    await user.type(amountInput, '1000');
    
    const commandElement = screen.getByText('/setpolicy token 1000 PEPECASH restrict');
    expect(commandElement).toBeInTheDocument();
  });

  it('should have a copy button for the command', () => {
    render(<PolicyPage />);

    // Verify the copy button exists
    const copyButton = screen.getByTitle('Copy to clipboard');
    expect(copyButton).toBeInTheDocument();

    // Verify the command is displayed (default is restrict)
    expect(screen.getByText('/setpolicy basic restrict')).toBeInTheDocument();
  });


  it('should show important warning about bot limitations', () => {
    render(<PolicyPage />);

    expect(screen.getByText(/Important: Existing Members Not Affected/i)).toBeInTheDocument();
    expect(screen.getByText(/CANNOT/)).toBeInTheDocument();
    expect(screen.getByText(/can only track and verify members who join AFTER/i)).toBeInTheDocument();
  });

  it('should have clickable logo that links to home', () => {
    render(<PolicyPage />);

    // Get the logo link specifically (there are multiple links on the page)
    const links = screen.getAllByRole('link');
    const logoLink = links.find(link => link.getAttribute('href') === '/');
    expect(logoLink).toBeInTheDocument();
  });

  it('should convert token symbol to uppercase', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);
    
    // Switch to token policy
    const tokenPolicyButton = screen.getByText('Token Policy');
    await user.click(tokenPolicyButton);
    
    // Type lowercase token symbol
    const tokenInput = screen.getByLabelText(/Token Name/i);
    await user.clear(tokenInput);
    await user.type(tokenInput, 'xcp');
    
    // Check that input value is uppercase
    expect(tokenInput).toHaveValue('XCP');
  });


  it('should handle empty token symbol gracefully', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);

    // Switch to token policy
    const tokenPolicyButton = screen.getByText('Token Policy');
    await user.click(tokenPolicyButton);

    // Clear token symbol
    const tokenInput = screen.getByLabelText(/Token Name/i);
    await user.clear(tokenInput);

    // Command should show with amount first, then empty symbol
    // When token symbol is empty, the command will have double spaces
    const allElements = screen.getAllByText((content, element) => {
      return !!(element?.textContent?.includes('/setpolicy token 1') &&
                element?.textContent?.includes('kick'));
    });
    expect(allElements.length).toBeGreaterThan(0);
  });

  it('should handle empty amount gracefully', async () => {
    const user = userEvent.setup();
    render(<PolicyPage />);

    // Switch to token policy
    const tokenPolicyButton = screen.getByText('Token Policy');
    await user.click(tokenPolicyButton);

    // Clear amount
    const amountInput = screen.getByLabelText(/Minimum Amount Required/i);
    await user.clear(amountInput);

    // Command should show with empty amount first, then symbol
    // When amount is empty, the command will have double spaces
    const allElements = screen.getAllByText((content, element) => {
      return !!(element?.textContent?.includes('/setpolicy token') &&
                element?.textContent?.includes('XCP restrict'));
    });
    expect(allElements.length).toBeGreaterThan(0);
  });


  it('should have link to FAQ page', () => {
    render(<PolicyPage />);
    
    const faqLink = screen.getByText(/View all commands and FAQ/i);
    expect(faqLink.closest('a')).toHaveAttribute('href', '/faq');
  });
});