import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// =====================================================================
// 1. STRIPE CONFIGURATION
// =====================================================================
const stripePromise = loadStripe('pk_test_51SppwNQMYLXWVhXqMwm13L7VuJ5FWifLUZlHTVhKclBDh8VGJSfLAQ6m03C0TfrPUf5n2kiMIAj3n5ygowlYAro400ZgvDqBLh');

// =====================================================================
// 2. CHECKOUT FORM
// =====================================================================
const CheckoutForm = ({ clientSecret, onSuccess, amountDisplay }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: { name: 'Chat Customer' },
      },
      return_url: window.location.href, 
    });

    if (result.error) {
      // If the user closes the 3DS popup or fails authentication
      setError(result.error.message);
      setProcessing(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        onSuccess(result.paymentIntent.id); 
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '10px' }}>
      <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
        <CardElement options={{ 
            style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } } } 
        }} />
      </div>
      {error && <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
      
      <button 
        type="submit" 
        disabled={!stripe || processing}
        style={{
          background: '#10B981', color: 'white', border: 'none', padding: '12px',
          borderRadius: '6px', width: '100%', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px',
          fontSize: '14px', transition: 'background 0.2s'
        }}
      >
        {processing ? 'Processing...' : `Pay €${amountDisplay}`}
      </button>
    </form>
  );
};

// =====================================================================
// 3. MAIN WIDGET COMPONENT
// =====================================================================
const GiftWidget = ({ merchantId = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
      { sender: 'bot', text: 'Hi! I can help you buy a gift card. How much would you like to spend?' }
  ]);
  const [clientSecret, setClientSecret] = useState(null);
  const [currentAmount, setCurrentAmount] = useState(null);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => { 
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, clientSecret]);

  // --- Logic Handling (Same as before) ---
  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsgs = [...messages, { sender: 'user', text: input }];
    setMessages(newMsgs);
    setInput('');

    try {
        const res = await fetch('https://phpstack-1393490-6143252.cloudwaysapps.com/analyze-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input })
        });
        const data = await res.json(); 
        setMessages(prev => [...prev, { sender: 'bot', text: data.bot_reply }]);

        if (data.intent === 'buy_gift' && data.amount) {
            triggerPaymentFlow(data.amount);
        } else if (data.intent === 'cancel_transaction') {
            setClientSecret(null);
            setCurrentAmount(null);
        }
    } catch (err) {
        console.error("Error:", err);
    }
  };

  const triggerPaymentFlow = async (amount) => {
      setCurrentAmount(amount);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Generating secure checkout link...' }]);
      try {
        const res = await fetch('https://phpstack-1393490-6143252.cloudwaysapps.com/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amount * 100, merchantId }) 
        });
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err) { console.error(err); }
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    setClientSecret(null); 
    setMessages(prev => [...prev, { sender: 'bot', text: 'Verifying transaction...' }]);
    try {
        const res = await fetch('https://phpstack-1393490-6143252.cloudwaysapps.com/verify-and-issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId })
        });
        const data = await res.json();
        if (data.success && data.voucherCode) {
            setMessages(prev => [...prev, { 
                sender: 'bot', text: 'Payment Verified! Here is your code:', isTicket: true, voucher: data.voucherCode 
            }]);
        } else {
            setMessages(prev => [...prev, { sender: 'bot', text: 'Verification failed.' }]);
        }
    } catch (error) { console.error(error); }
  };

  // --- STYLES & ANIMATION ---
  const styles = {
    launcher: { 
      position: 'fixed', bottom: '30px', right: '30px', 
      width: '64px', height: '64px', borderRadius: '50%', 
      background: '#DC2626', color: 'white', fontSize: '28px',
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      cursor: 'pointer', zIndex: 9999,
      boxShadow: '0 4px 14px rgba(0,0,0,0.25)', 
      transition: 'transform 0.2s, background 0.2s',
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' // Rotate icon when open
    },
    // NEW: The floating label "Gift Assistant"
    label: {
      position: 'fixed', bottom: '42px', right: '110px',
      background: 'white', padding: '8px 16px', borderRadius: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      fontWeight: '600', fontSize: '14px', color: '#333',
      zIndex: 9998,
      pointerEvents: 'none', // Lets clicks pass through if needed
      opacity: isOpen ? 0 : 1, // Hide when widget is open
      transition: 'opacity 0.2s ease',
      whiteSpace: 'nowrap'
    },
    window: { 
      position: 'fixed', bottom: '110px', right: '30px', 
      width: '380px', height: '600px',
      background: '#f9fafb', borderRadius: '16px', 
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)', 
      display: 'flex', flexDirection: 'column', overflow: 'hidden', 
      zIndex: 9999,
      // NEW: Animation property
      animation: 'slideUpFade 0.3s ease-out forwards',
      transformOrigin: 'bottom right'
    },
    header: { 
      background: '#DC2626', color: 'white', padding: '18px', 
      fontWeight: '600', fontSize: '16px', display: 'flex', justifyContent: 'space-between'
    },
    body: { 
      flex: 1, padding: '20px', overflowY: 'auto', 
      display: 'flex', flexDirection: 'column', gap: '15px' 
    },
    msgBot: { 
      alignSelf: 'flex-start', background: '#fff', padding: '12px 16px', 
      borderRadius: '12px 12px 12px 4px', width: '85%', lineHeight: '1.5',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6'
    },
    msgUser: { 
      alignSelf: 'flex-end', background: '#DC2626', color: 'white', 
      padding: '12px 16px', borderRadius: '12px 12px 4px 12px', maxWidth: '85%',
      boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
    },
    ticket: { 
      border: '2px dashed #DC2626', background: '#fff1f2', 
      padding: '16px', marginTop: '10px', borderRadius: '8px', 
      textAlign: 'center', fontFamily: 'monospace', color: '#333'
    },
    inputArea: {
        padding: '15px', width: '85%', background: 'white', borderTop: '1px solid #f3f4f6'
    },
    input: {
        width: '100%', padding: '12px', borderRadius: '8px', 
        border: '1px solid #e5e7eb', outline: 'none', fontSize: '14px'
    }
  };

  return (
    <>
      {/* 1. Inject Keyframes for Animation */}
      <style>
        {`
          @keyframes slideUpFade {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>

      {/* 2. Floating Label (Visible when closed) */}
      {!isOpen && (
          <div style={styles.label}>
             Gift Assistant 👋
          </div>
      )}

      {/* 3. The Launcher Button */}
      <div 
        style={styles.launcher} 
        onClick={() => setIsOpen(!isOpen)} 
        role="button" 
        tabIndex={0}
      >
        {isOpen ? '✕' : '💬'}
      </div>

      {/* 4. The Main Chat Window (Animated) */}
      {isOpen && (
        <div style={styles.window}>
          <div style={styles.header}>
              <span>Gift Assistant</span>
              <span style={{cursor:'pointer', opacity:0.8}} onClick={() => setIsOpen(false)}>✕</span>
          </div>
          
          <div style={styles.body}>
            {messages.map((msg, idx) => (
              <div key={idx} style={msg.sender === 'bot' ? styles.msgBot : styles.msgUser}>
                {msg.text}
                
                {msg.isTicket && (
                  <div style={styles.ticket}>
                     <div style={{fontWeight:'bold', fontSize:'16px', marginBottom:'5px'}}>XYZ FASHION CARD</div>
                     <div style={{fontSize:'12px', color:'#666'}}>Value: €{currentAmount || '50'}.00</div>
                     <div style={{background:'white', padding:'8px', border:'1px solid #DC2626', margin:'10px 0', fontWeight:'bold', fontSize:'18px'}}>
                        {msg.voucher}
                     </div>
                  </div>
                )}
              </div>
            ))}
            
            {clientSecret && (
              <div style={styles.msgBot}>
                <div style={{fontWeight:'bold', marginBottom:'8px', fontSize:'14px'}}>Secure Checkout</div>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm clientSecret={clientSecret} amountDisplay={currentAmount} onSuccess={handlePaymentSuccess} />
                </Elements>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div style={styles.inputArea}>
            <input 
              style={styles.input}
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..." 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GiftWidget;