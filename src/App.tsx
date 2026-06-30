import { ReviewPlayer } from './components/review/ReviewPlayer';
import { ReviewProvider } from './state/ReviewContext';

export default function App() {
  return (
    <ReviewProvider>
      <ReviewPlayer />
    </ReviewProvider>
  );
}
