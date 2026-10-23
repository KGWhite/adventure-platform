import { resolveCard, SKILLS } from './skills.js';

describe('resolveCard', () => {
  it('casts strike immediately and charges element cards on an empty slot', () => {
    expect(resolveCard(null, 'STRIKE')).toEqual({ kind: 'cast', skill: SKILLS.strike });
    expect(resolveCard(null, 'FIRE')).toEqual({ kind: 'charge' });
  });

  it('combines two different elements regardless of order', () => {
    expect(resolveCard('FIRE', 'WIND')).toEqual({ kind: 'cast', skill: SKILLS['fire-tornado'] });
    expect(resolveCard('WIND', 'FIRE')).toEqual({ kind: 'cast', skill: SKILLS['fire-tornado'] });
    expect(resolveCard('WATER', 'FIRE')).toEqual({ kind: 'cast', skill: SKILLS['steam-burst'] });
    expect(resolveCard('WIND', 'WATER')).toEqual({ kind: 'cast', skill: SKILLS['healing-rain'] });
  });

  it('turns element + strike into element slash and same elements into a fizzle', () => {
    expect(resolveCard('WATER', 'STRIKE')).toEqual({ kind: 'cast', skill: SKILLS['element-slash'] });
    expect(resolveCard('FIRE', 'FIRE')).toEqual({ kind: 'fizzle' });
  });
});
