import { describe, expect, it } from 'vitest';
import { stripTerminal } from './ansi';

describe('stripTerminal', () => {
  it('keeps a rainbow moniker as letters only', () => {
    expect(
      stripTerminal(
        '<#FFDC00>G<#E3DA00>L<#C6D800>I<#AAD500>T<#8ED300>C<#71D100>H<#55CF',
      ),
    ).toBe('GLITCH');
  });

  it('strips closed hex, %c, and ANSI', () => {
    expect(stripTerminal('<#ff0000>Go%cn')).toBe('Go');
    expect(stripTerminal('%ch%ccGLITCH%cn')).toBe('GLITCH');
    expect(stripTerminal('\u001b[32mKESS\u001b[0m')).toBe('KESS');
  });

  it('keeps real and %r line breaks', () => {
    expect(stripTerminal('leans.%rchecks the mag.')).toBe('leans.\nchecks the mag.');
    expect(stripTerminal('leans.\nchecks the mag.')).toBe('leans.\nchecks the mag.');
  });
});
