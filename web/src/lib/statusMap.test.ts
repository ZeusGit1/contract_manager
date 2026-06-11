import { statusInfo } from './statusMap';

describe('statusInfo', () => {
  it('statusInfo — InProcess — labels "In process" with draft badge', () => {
    expect(statusInfo('InProcess')).toEqual({ label: 'In process', badge: 'draft' });
  });

  it('statusInfo — OutForSignature — labels "Out for signature" with info badge', () => {
    expect(statusInfo('OutForSignature')).toEqual({ label: 'Out for signature', badge: 'info' });
  });

  it('statusInfo — OnHold — maps to the McDermott "hold" badge extension', () => {
    expect(statusInfo('OnHold').badge).toBe('hold');
  });

  it('statusInfo — Terminated — maps to failed badge', () => {
    expect(statusInfo('Terminated').badge).toBe('failed');
  });
});
