import React from 'react';
import GiftWidget from './GiftWidget';

function App() {
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      <img 
        src="/aircash.png"
        alt="Mock Website Background"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          objectPosition: 'top', // <--- This pins the image to the top
          display: 'block'
        }}
      />

      <GiftWidget />
      
    </div>
  );
}

export default App;