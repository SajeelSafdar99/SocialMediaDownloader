import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ThreeDSAuth from './ThreeDSAuth';

interface FlexWindow extends Window {
  FLEX?: any;
}

declare let window: FlexWindow;

export default function FlexCheckout() {
  const [location] = useLocation();

  // Extract tracker from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const tracker = searchParams.get('tracker');

  // Navigation helper
  const navigate = (path: string) => {
    window.location.href = path;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [captureContext, setCaptureContext] = useState<string | null>(null);
  const [microformInstance, setMicroformInstance] = useState<any>(null);

  // 3DS Authentication state
  const [requires3DS, setRequires3DS] = useState(false);
  const [threeDSData, setThreeDSData] = useState<{
    accessToken: string;
    stepUpUrl: string;
    deviceCollectionUrl: string;
  } | null>(null);

  // Load Cybersource Flex SDK
  useEffect(() => {
    if (!tracker) {
      setError('No tracker token provided');
      setLoading(false);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="flex.cybersource.com"]');
    if (existingScript) {
      console.log('✅ Cybersource Flex SDK already loaded');
      fetchCaptureContext();
      return;
    }

    // Load Cybersource Flex SDK
    console.log('🔄 Loading Cybersource Flex SDK...');
    const script = document.createElement('script');

    // Cybersource Flex Microform SDK URL
    // The correct URL for production Flex SDK (no /v2/ in path)
    script.src = 'https://flex.cybersource.com/microform/bundle/v2/flex-microform.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      console.log('✅ Cybersource Flex SDK loaded successfully');
      console.log('🔍 Checking for FLEX object...');
      console.log('   window.FLEX:', typeof window.FLEX);
      console.log('   window.Flex:', typeof (window as any).Flex);
      console.log('   All window keys with "flex":', Object.keys(window).filter(k => k.toLowerCase().includes('flex')));

      // Wait a bit for the SDK to initialize
      // Cybersource may use different object names
      setTimeout(() => {
        // Check multiple possible object names
        const flex = window.FLEX || (window as any).Flex || (window as any).flex;

        if (flex) {
          console.log('✅ FLEX object available');
          window.FLEX = flex; // Normalize to window.FLEX
          fetchCaptureContext();
        } else {
          console.error('❌ FLEX object not available after SDK load');
          console.error('   This might mean:');
          console.error('   1. The SDK URL is wrong');
          console.error('   2. SafePay needs a different SDK');
          console.error('   3. The SDK requires initialization');
          setError('Payment system initialization failed. SafePay Flex may not be configured correctly. Please contact support.');
          setLoading(false);
        }
      }, 500); // Increase timeout to 500ms
    };

    script.onerror = (e) => {
      console.error('❌ Failed to load Cybersource Flex SDK:', e);
      console.error('   Script src:', script.src);
      console.error('   Trying alternative URL...');

      // Try alternative URL if first one fails
      const altScript = document.createElement('script');
      altScript.src = 'https://flex.cybersource.com/microform/bundle/v2.0/flex-microform.min.js';
      altScript.async = true;
      altScript.crossOrigin = 'anonymous';

      altScript.onload = () => {
        console.log('✅ Cybersource Flex SDK loaded (alternative URL)');
        console.log('🔍 Checking for FLEX object (alternative)...');
        setTimeout(() => {
          const flex = window.FLEX || (window as any).Flex || (window as any).flex;
          if (flex) {
            window.FLEX = flex;
            fetchCaptureContext();
          } else {
            console.error('❌ FLEX object still not available');
            setError('Payment system not available. SafePay Flex configuration issue. Please contact support.');
            setLoading(false);
          }
        }, 500);
      };

      altScript.onerror = () => {
        console.error('❌ Failed to load Cybersource Flex SDK from alternative URL');
        setError('Failed to load payment system. Please check your internet connection and try again.');
        setLoading(false);
      };

      document.head.appendChild(altScript);
    };

    document.head.appendChild(script);

    return () => {
      // Only remove if it exists and we added it
      if (script.parentNode === document.head) {
        document.head.removeChild(script);
      }
    };
  }, [tracker]);

  // Fetch capture context from backend
  const fetchCaptureContext = async () => {
    try {
      console.log('🔄 Fetching capture context for tracker:', tracker);
      const response = await fetch(`/api/payment/safepay/capture-context/${tracker}`);
      const data = await response.json();

      console.log('📥 Capture context response:', data);

      if (!data.ok || !data.captureContext) {
        throw new Error(data.error || 'Failed to get payment session');
      }

      let contextString = data.captureContext;

      // If captureContext is an object, try to extract JWT
      if (typeof contextString === 'object') {
        console.log('⚠️  Capture context is an object, attempting to extract JWT');
        console.log('   Object keys:', Object.keys(contextString));

        // Try common JWT field names
        if (contextString.jwt) {
          contextString = contextString.jwt;
        } else if (contextString.capture_context) {
          contextString = contextString.capture_context;
        } else if (contextString.token) {
          contextString = contextString.token;
        } else {
          console.error('❌ Could not find JWT in capture context object');
          throw new Error('Invalid capture context format. Please contact support.');
        }
      }

      // If it's a string that looks like JSON (starts with {), try to parse it
      if (typeof contextString === 'string' && contextString.trim().startsWith('{')) {
        console.log('⚠️  Capture context looks like JSON string, attempting to parse...');
        try {
          const parsed = JSON.parse(contextString);
          console.log('   Parsed object keys:', Object.keys(parsed));

          // Look for JWT in the parsed object
          if (parsed.jwt) {
            console.log('   ✅ Found JWT in parsed object');
            contextString = parsed.jwt;
          } else if (parsed.capture_context) {
            console.log('   ✅ Found capture_context in parsed object');
            contextString = parsed.capture_context;
          } else if (parsed.token && typeof parsed.token === 'string' && parsed.token.startsWith('eyJ')) {
            console.log('   ✅ Found JWT-like token in parsed object');
            contextString = parsed.token;
          } else if (parsed.action) {
            // Check if action object contains capture context
            console.log('   🔍 Checking action object...');
            console.log('   Action object keys:', Object.keys(parsed.action));

            // Check for nested flex object (SafePay's actual structure!)
            if (parsed.action.flex && parsed.action.flex.capture_context_jwt) {
              console.log('   ✅ Found capture_context_jwt in action.flex object!');
              contextString = parsed.action.flex.capture_context_jwt;
            } else if (parsed.action.capture_context) {
              console.log('   ✅ Found capture_context in action object');
              contextString = parsed.action.capture_context;
            } else if (parsed.action.jwt) {
              console.log('   ✅ Found jwt in action object');
              contextString = parsed.action.jwt;
            } else if (parsed.action.token && typeof parsed.action.token === 'string' && parsed.action.token.startsWith('eyJ')) {
              console.log('   ✅ Found JWT-like token in action object');
              contextString = parsed.action.token;
            } else {
              console.error('❌ Action object does not contain a JWT');
              console.error('   Tracker keys:', Object.keys(parsed.tracker || {}));
              console.error('   Action keys:', Object.keys(parsed.action || {}));
              console.error('   Checking for flex object:', !!parsed.action.flex);
              if (parsed.action.flex) {
                console.error('   Flex object keys:', Object.keys(parsed.action.flex));
              }
              console.error('   Full parsed object:', JSON.stringify(parsed, null, 2));
              throw new Error('SafePay returned tracker object but could not find JWT. Please contact SafePay support.');
            }
          } else {
            console.error('❌ Parsed object does not contain a JWT');
            console.error('   Available keys:', Object.keys(parsed));
            console.error('   This is not a valid capture context!');
            throw new Error('SafePay returned tracker object instead of JWT. Their Flex integration is broken. Please contact SafePay support.');
          }
        } catch (parseError: any) {
          if (parseError.message.includes('SafePay')) {
            throw parseError; // Re-throw our custom error
          }
          console.error('❌ Failed to parse capture context as JSON:', parseError);
          // If parse fails, maybe it's actually a JWT that starts with { by coincidence
          // JWTs are base64 encoded and shouldn't start with {, so this is unlikely
        }
      }

      console.log('✅ Capture context extracted:', typeof contextString);
      console.log('   Preview:', contextString.substring(0, 100) + '...');
      console.log('   Looks like JWT:', contextString.startsWith('eyJ')); // JWTs start with eyJ

      setCaptureContext(contextString);
      initializeFlex(contextString);
    } catch (err: any) {
      console.error('❌ Failed to fetch capture context:', err);
      setError(err.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  // Initialize Cybersource Flex Microform
  const initializeFlex = (context: string) => {
    try {
      console.log('🔄 Initializing Cybersource Flex...');
      console.log('   Context length:', context.length);

      if (!window.FLEX) {
        throw new Error('Flex SDK not loaded');
      }

      console.log('✅ Flex SDK available, creating Flex instance...');
      const flex = new window.FLEX(context);
      console.log('✅ Flex instance created');
      console.log('   Flex object type:', typeof flex);
      console.log('   Flex has createToken:', typeof flex.createToken);
      console.log('   Flex has microform:', typeof flex.microform);

      const microform = flex.microform('card', {
        styles: {
          'input': {
            'font-size': '16px',
            'font-family': 'Inter, sans-serif',
            'color': '#374151',
          },
          ':focus': { 'color': '#111827' },
          ':disabled': { 'cursor': 'not-allowed' },
          'valid': { 'color': '#059669' },
          'invalid': { 'color': '#DC2626' }
        }
      });
      console.log('✅ Microform created');
      console.log('   Microform type:', typeof microform);
      console.log('   Microform has createToken:', typeof microform.createToken);

      // Store microform instance in state for later use (createToken is on microform, not flex!)
      setMicroformInstance(microform);

      const cardNumber = microform.createField('number', {
        placeholder: '•••• •••• •••• ••••'
      });
      const securityCode = microform.createField('securityCode', {
        placeholder: 'CVV'
      });
      console.log('✅ Card fields created');
      console.log('   Card field type:', typeof cardNumber);
      console.log('   CVV field type:', typeof securityCode);

      // Set loading to false first to render the DOM elements
      setLoading(false);

      // Wait a bit for React to render the DOM elements
      setTimeout(() => {
        console.log('🔄 Loading card fields into DOM...');
        const cardContainer = document.getElementById('card-number-container');
        const cvvContainer = document.getElementById('security-code-container');

        console.log('   Card container exists:', !!cardContainer);
        console.log('   CVV container exists:', !!cvvContainer);

        if (!cardContainer || !cvvContainer) {
          console.error('❌ DOM containers not found!');
          setError('Payment form not ready. Please refresh the page.');
          return;
        }

        try {
          // Load card number field
          console.log('🔄 Loading card number field...');
          cardNumber.load('#card-number-container');
          console.log('✅ Card number field load() called');

          // Load security code field
          console.log('🔄 Loading security code field...');
          securityCode.load('#security-code-container');
          console.log('✅ Security code field load() called');

          // Check if iframes were actually created
          setTimeout(() => {
            const cardIframe = cardContainer.querySelector('iframe');
            const cvvIframe = cvvContainer.querySelector('iframe');

            console.log('🔍 Checking if Flex iframes were created...');
            console.log('   Card iframe exists:', !!cardIframe);
            console.log('   CVV iframe exists:', !!cvvIframe);

            if (cardIframe) {
              console.log('   Card iframe src:', cardIframe.src);
              console.log('   Card iframe dimensions:', cardIframe.offsetWidth, 'x', cardIframe.offsetHeight);
            }
            if (cvvIframe) {
              console.log('   CVV iframe src:', cvvIframe.src);
              console.log('   CVV iframe dimensions:', cvvIframe.offsetWidth, 'x', cvvIframe.offsetHeight);
            }

            if (!cardIframe || !cvvIframe) {
              console.error('❌ Flex iframes were not created!');
              console.error('   This might mean:');
              console.error('   1. Capture context JWT is invalid for this origin');
              console.error('   2. Origin mismatch (check JWT targetOrigins)');
              console.error('   3. Cybersource Flex config issue');
              setError('Card fields failed to load. The capture context may be invalid for this origin. Please contact support.');
            } else {
              console.log('✅ Flex iframes successfully created!');
              console.log('✅ Card fields are ready for input');
            }
          }, 1000); // Wait 1 second to check if iframes loaded

          console.log('✅ Flex initialization complete!');
        } catch (loadError: any) {
          console.error('❌ Error loading Flex fields:', loadError);
          setError(`Failed to load card fields: ${loadError.message}`);
        }
      }, 100); // Small delay to let React render
    } catch (err: any) {
      console.error('❌ Failed to initialize Flex:', err);
      console.error('   Error details:', {
        message: err.message,
        stack: err.stack,
        contextPreview: context?.substring(0, 200)
      });
      setError(`Failed to initialize payment form: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!microformInstance) {
      setError('Payment system not initialized. Please refresh the page.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('🔄 Processing payment...');
      console.log('   Microform instance type:', typeof microformInstance);
      console.log('   Microform has createToken:', typeof microformInstance.createToken);

      const expiryMonth = (document.getElementById('expiry-month') as HTMLSelectElement)?.value;
      const expiryYear = (document.getElementById('expiry-year') as HTMLSelectElement)?.value;

      console.log('   Expiry:', expiryMonth, '/', expiryYear);

      if (!expiryMonth || !expiryYear) {
        throw new Error('Please select expiry date');
      }

      const options = {
        expirationMonth: expiryMonth,
        expirationYear: expiryYear,
      };

      console.log('🔄 Calling createToken...');

      // Create token with Microform
      // This generates a transient token JWT that we need to send to our backend
      // The backend will then submit it to SafePay via PROCESS_TRANSIENT_TOKEN action
      microformInstance.createToken(options, async (err: any, token: string) => {
        if (err) {
          console.error('❌ Microform token error:', err);
          setError('Invalid card details. Please check and try again.');
          setProcessing(false);
          return;
        }

        console.log('✅ Transient token generated');
        console.log('   Token length:', token?.length);
        console.log('🔄 Submitting token to backend for processing...');

        // CRITICAL: Send the transient token to our backend
        // The backend will call SafePay's PROCESS_TRANSIENT_TOKEN endpoint
        try {
          const response = await fetch('/api/payment/safepay/flex/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tracker,
              transientToken: token // Send the JWT token from Flex Microform
            }),
          });

          const result = await response.json();
          console.log('📥 Payment response:', result);

          if (result.ok) {
            // Check if we need to handle 3DS authentication
            if (result.requires3DS && result.accessToken) {
              console.log('⚠️  3DS authentication required');
              setProcessing(false);
              setRequires3DS(true);
              setThreeDSData({
                accessToken: result.accessToken,
                stepUpUrl: result.stepUpUrl || 'https://centinelapistag.cardinalcommerce.com/V2/Cruise/StepUp',
                deviceCollectionUrl: result.deviceCollectionUrl || 'https://centinelapistag.cardinalcommerce.com/V1/Cruise/Collect'
              });
              return;
            }

            // Payment completed successfully without 3DS
            console.log('✅ Payment successful!');
            navigate('/subscribe?status=success&provider=safepay');
            return;
          }

          // If payment failed
          throw new Error(result.error || 'Payment processing failed');

        } catch (err: any) {
          console.error('❌ Payment error:', err);
          setError(err.message || 'Payment failed. Please try again.');
          setProcessing(false);
        }
      });
    } catch (err: any) {
      console.error('❌ Submit error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  if (!tracker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Payment Session</h1>
          <p className="text-gray-600 mb-4">No tracker token provided</p>
          <button
            onClick={() => navigate('/subscribe')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    );
  }

  // Show 3DS authentication if required
  if (requires3DS && threeDSData) {
    return (
      <ThreeDSAuth
        tracker={tracker}
        accessToken={threeDSData.accessToken}
        stepUpUrl={threeDSData.stepUpUrl}
        deviceCollectionUrl={threeDSData.deviceCollectionUrl}
        onSuccess={() => {
          console.log('✅ 3DS authentication successful');
          navigate('/subscribe?status=success&provider=safepay');
        }}
        onCancel={() => {
          console.log('❌ 3DS authentication cancelled');
          navigate('/subscribe?status=cancelled');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600">Enter your card details securely</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading payment form...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm mb-3">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <div
                id="card-number-container"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent"
              ></div>
            </div>

            {/* Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Month
                </label>
                <select
                  id="expiry-month"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">MM</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = String(i + 1).padStart(2, '0');
                    return <option key={month} value={month}>{month}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Year
                </label>
                <select
                  id="expiry-year"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">YYYY</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>

            {/* CVV */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Code (CVV)
              </label>
              <div
                id="security-code-container"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent"
              ></div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Pay Now'
              )}
            </button>

            <p className="text-xs text-center text-gray-500">
              🔒 Your payment is secure and encrypted
            </p>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/subscribe?status=cancelled')}
            className="text-sm text-gray-600 hover:text-gray-900"
            disabled={processing}
          >
            Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
}
