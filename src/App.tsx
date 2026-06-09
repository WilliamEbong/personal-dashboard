import { HackerNewsPanel } from './components/panels/HackerNewsPanel';
import { GitHubPanel } from './components/panels/GitHubPanel';

function App() {
  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Tauri App</h1>
      <HackerNewsPanel />
      <GitHubPanel />
    </main>
  );
}

export default App;
