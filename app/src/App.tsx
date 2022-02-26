import React from 'react';
import Home from './pages/home';
import { Wallet } from './components';

function App() {
  return (
    <Wallet>
      <Home />
    </Wallet>
  );
}

export default App;