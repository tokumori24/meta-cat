import { DEMO_SCENE_CONTENT } from './sceneContent.ts';

test('defines the visible Phaser demo content', () => {
  expect(DEMO_SCENE_CONTENT).toEqual({
    title: 'Phaser is running',
    subtitle: 'React 19 + Vite + TypeScript',
  });
});
