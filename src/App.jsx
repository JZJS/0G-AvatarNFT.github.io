import Template from './Template.jsx';
import Explore from './Explore.jsx';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Template />} />
      <Route path="/explore" element={<Explore />} />
    </Routes>
  );
}

export default App;
