import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LevelSelectScreen } from './screens/LevelSelectScreen';
import { LevelIntroScreen } from './screens/LevelIntroScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LevelSelectScreen />} />
        <Route path="/game/:scenarioId" element={<LevelIntroScreen />} />
        <Route path="/game/:scenarioId/play" element={<GameScreen />} />
        <Route path="/game/:scenarioId/result" element={<ResultScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
