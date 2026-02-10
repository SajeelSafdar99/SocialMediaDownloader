import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ThreeDSAuthProps {
  tracker: string;
  accessToken: string;
  stepUpUrl: string;
  deviceCollectionUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ThreeDSAuth({
  tracker,
  accessToken,
  stepUpUrl,
  deviceCollectionUrl,
  onSuccess,
  onCancel
}: ThreeDSAuthProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [enrollmentStarted, setEnrollmentStarted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Step 1: Device Data Collection
  useEffect(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log('🔄 Starting device fingerprinting...');
    console.log('   Session ID:', sessionId);
    console.log('   Collection URL:', deviceCollectionUrl);

    // Create hidden iframe for device data collection
    const iframe = document.createElement('iframe');
    iframe.id = 'cardinal-device-data-iframe';
    iframe.name = 'cardinal-device-data-iframe';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '-1000px';
    iframe.style.left = '-1000px';

    // Create form for device data collection
    const form = document.createElement('form');
    form.id = 'cardinal-device-data-form';
    form.method = 'POST';
    form.action = deviceCollectionUrl;
    form.target = 'cardinal-device-data-iframe';

    // Add JWT token
    const jwtInput = document.createElement('input');
    jwtInput.type = 'hidden';
    jwtInput.name = 'JWT';
    jwtInput.value = accessToken;

    form.appendChild(jwtInput);
    document.body.appendChild(form);
    document.body.appendChild(iframe);

    // Submit form to collect device data
    console.log('📤 Submitting device data collection form...');
    form.submit();

    // Wait for device data collection to complete (typically 5-10 seconds)
    const timeout = setTimeout(() => {
      console.log('✅ Device data collection completed');
      console.log('   Device fingerprint session ID:', sessionId);
      setDeviceFingerprint(sessionId);
      setLoading(false);

      // Clean up
      form.remove();
      iframe.remove();
    }, 5000); // Wait 5 seconds for device data collection

    return () => {
      clearTimeout(timeout);
      form.remove();
      iframe.remove();
    };
  }, [accessToken, deviceCollectionUrl]);

  // Step 2: Handle Enrollment
  const handleEnrollment = async () => {
    if (!deviceFingerprint) {
      setError('Device fingerprinting not completed');
      return;
    }

    setEnrollmentStarted(true);
    setError(null);

    try {
      console.log('🔄 Starting payer authentication enrollment...');
      console.log('   Tracker:', tracker);
      console.log('   Device Fingerprint:', deviceFingerprint);

      const response = await fetch('/api/payment/safepay/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracker,
          deviceFingerprint,
          successUrl: `${window.location.origin}/subscribe?status=success&provider=safepay`,
          failureUrl: `${window.location.origin}/subscribe?status=cancelled`,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Enrollment failed');
      }

      console.log('✅ Enrollment response:', data);

      const { authenticationStatus } = data;

      if (authenticationStatus === 'FRICTIONLESS' || authenticationStatus === 'ATTEMPTED') {
        // No challenge required, proceed directly
        console.log('✅ Frictionless authentication - no challenge required');
        onSuccess();
      } else if (authenticationStatus === 'REQUIRED') {
        // Challenge required - show step-up iframe
        console.log('⚠️  Challenge required - showing step-up iframe');
        showStepUpChallenge(data.stepUpUrl, data.accessToken);
      } else {
        throw new Error(`Authentication status: ${authenticationStatus}`);
      }
    } catch (err: any) {
      console.error('❌ Enrollment failed:', err);
      setError(err.message || 'Authentication failed');
      setEnrollmentStarted(false);
    }
  };

  // Step 3: Show Step-Up Challenge (3DS OTP screen)
  const showStepUpChallenge = (url: string, token: string) => {
    console.log('🔄 Loading 3DS challenge iframe...');
    console.log('   Step-up URL:', url);

    // Create iframe for 3DS challenge
    const iframe = iframeRef.current;
    if (!iframe) {
      setError('Could not create challenge iframe');
      return;
    }

    // Set iframe src to Cardinal Cruise Step-Up endpoint
    // Create form and submit to iframe
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = 'step-up-iframe';
    form.style.display = 'none';

    // Add JWT token
    const jwtInput = document.createElement('input');
    jwtInput.type = 'hidden';
    jwtInput.name = 'JWT';
    jwtInput.value = token;

    form.appendChild(jwtInput);
    document.body.appendChild(form);

    // Submit form
    form.submit();
    form.remove();

    // Listen for messages from the iframe
    window.addEventListener('message', handleStepUpMessage);
  };

  const handleStepUpMessage = (event: MessageEvent) => {
    console.log('📨 Received message from step-up iframe:', event);

    // Cardinal sends messages when challenge is complete
    if (event.data) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('   Parsed message:', data);

        if (data.Status === 'COMPLETE' || data.Status === 'SUCCESS') {
          console.log('✅ 3DS challenge completed successfully');
          onSuccess();
        } else if (data.Status === 'FAILURE' || data.Status === 'ERROR') {
          console.error('❌ 3DS challenge failed');
          setError('Authentication failed. Please try again.');
          setEnrollmentStarted(false);
        }
      } catch (err) {
        console.error('❌ Error parsing message:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
            <h2 className="text-xl font-semibold mb-2">Preparing Authentication</h2>
            <p className="text-gray-600">Collecting device information for secure payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Secure Payment Authentication</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!enrollmentStarted ? (
            <>
              <p className="text-gray-600 mb-6 text-center">
                Your bank requires additional verification to complete this payment. Click continue to proceed.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleEnrollment}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!deviceFingerprint}
                >
                  Continue to Verification
                </Button>

                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="w-full"
                >
                  Cancel Payment
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
                <p className="text-center text-gray-600">
                  Please complete the verification with your bank
                </p>
              </div>

              {/* Step-up iframe for 3DS challenge */}
              <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                <iframe
                  ref={iframeRef}
                  id="step-up-iframe"
                  name="step-up-iframe"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="3DS Authentication"
                />
              </div>

              <Button
                onClick={onCancel}
                variant="outline"
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
