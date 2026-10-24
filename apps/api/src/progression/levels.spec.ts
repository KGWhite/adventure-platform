import { levelForMerit, levelProgress, skillsUnlockedBetween } from './levels.js';

describe('progression levels', () => {
  it('derives the level from accumulated merit', () => {
    const cases: [number, number][] = [
      [0, 1], [19, 1], [20, 2], [49, 2], [50, 3], [100, 4], [160, 5], [999, 5],
    ];
    for (const [merit, level] of cases) {
      expect(levelForMerit(merit)).toBe(level);
    }
  });

  it('reports progress to the next level and MAX at the cap', () => {
    expect(levelProgress(50)).toEqual({
      current: 3, max: 5, merit: 50, currentLevelMerit: 50, nextLevelMerit: 100, meritToNext: 50,
    });
    expect(levelProgress(200)).toMatchObject({ current: 5, nextLevelMerit: null, meritToNext: null });
  });

  it('lists every skill unlocked when jumping several levels', () => {
    expect(skillsUnlockedBetween(1, 3).map((skill) => skill.id)).toEqual(['element-slash', 'fire-tornado']);
    expect(skillsUnlockedBetween(3, 3)).toEqual([]);
  });
});
