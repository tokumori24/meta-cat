import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../constants.ts';
import { DEMO_SCENE_CONTENT } from '../domain/sceneContent.ts';

const panelColor = 0x2f6fed;
const titleStyle = {
  color: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '28px',
};
const subtitleStyle = {
  color: '#dbe7ff',
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '16px',
};

export class DemoScene extends Phaser.Scene {
  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.rectangle(centerX, centerY, 360, 200, panelColor);
    this.add.text(centerX, centerY - 24, DEMO_SCENE_CONTENT.title, titleStyle).setOrigin(0.5);
    this.add.text(centerX, centerY + 24, DEMO_SCENE_CONTENT.subtitle, subtitleStyle).setOrigin(0.5);
  }
}
