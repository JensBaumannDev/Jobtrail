import { scaleToFit } from './fit-scale';

describe('scaleToFit', () => {
  it('shrinks the content to the available width', () => {
    expect(scaleToFit(416, 832)).toBe(0.5);
  });

  it('never enlarges content that already fits', () => {
    expect(scaleToFit(1200, 832)).toBe(1);
    expect(scaleToFit(832, 832)).toBe(1);
  });

  it('keeps full size when a width can not be measured', () => {
    expect(scaleToFit(343, 0)).toBe(1);
    expect(scaleToFit(0, 832)).toBe(1);
    expect(scaleToFit(Number.NaN, 832)).toBe(1);
    expect(scaleToFit(343, Number.NaN)).toBe(1);
  });
});
