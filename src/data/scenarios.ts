import type { BriefScenario } from '../types';
import tutorialData from './levels/level-000-tutorial.json';
import level001Data from './levels/level-001-bakery-logo.json';
import level002Data from './levels/level-002-startup-launch.json';
import level003Data from './levels/level-003-app-launch.json';
import level004Data from './levels/level-004-hotel-rebrand.json';
import level005Data from './levels/level-005-ngo-campaign.json';

export const SCENARIOS: BriefScenario[] = [
  tutorialData as BriefScenario,
  level001Data as BriefScenario,
  level002Data as BriefScenario,
  level003Data as BriefScenario,
  level004Data as BriefScenario,
  level005Data as BriefScenario,
];

export function getScenarioById(id: string): BriefScenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

export function getScenariosForAct(actNumber: number): BriefScenario[] {
  return SCENARIOS.filter(s => s.actNumber === actNumber);
}
