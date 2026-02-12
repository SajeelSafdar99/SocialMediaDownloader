import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ThreeDSChallenge() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const accessToken = searchParams.get('accessToken');
  const deviceDataCollectionUrl = searchParams.get('deviceDataCollectionUrl');
  const tracker = searchParams.get('tracker');

  useEffect(() => {
    if (!accessToken || !deviceDataCollectionUrl || !tracker) {
      setError('Missing required parameters for 3DS authentication');
      setLoading(false);
      return;
    }

    // Start device data collection first
    collectDeviceFingerprint();
  }, [accessToken, deviceDataCollectionUrl, tracker]);

  const collectDeviceFingerprint = async () => {
    try {
      console.log('🔄 Collecting device fingerprint...');
      setStatus('Collecting device information...');

      // Generate unique session ID
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create hidden iframe for device data collection
      const deviceIframe = document.createElement('iframe');
      deviceIframe.id = 'cardinal-device-collection-iframe';
      deviceIframe.name = 'cardinal-device-collection-iframe';
      deviceIframe.style.display = 'none';
      deviceIframe.width = '1';
      deviceIframe.height = '1';
      document.body.appendChild(deviceIframe);

      // Create form to post to Cardinal
      const form = document.createElement('form');
      form.id = 'cardinal-device-form';
      form.method = 'POST';
      form.action = deviceDataCollectionUrl!;
      form.target = 'cardinal-device-collection-iframe';

      // Add JWT token
      const jwtInput = document.createElement('input');
      jwtInput.type = 'hidden';
      jwtInput.name = 'JWT';
      jwtInput.value = accessToken!;
      form.appendChild(jwtInput);

      document.body.appendChild(form);
      form.submit();

      console.log('✅ Device fingerprint collection initiated');

      // Wait for device collection to complete (usually takes 2-3 seconds)
      setTimeout(() => {
        console.log('✅ Device fingerprint collected:', sessionId);
        // Clean up
        try {
          document.body.removeChild(deviceIframe);
          document.body.removeChild(form);
        } catch (e) {
          console.log('Cleanup already done');
        }

        // Now perform enrollment with the device fingerprint
        performEnrollment(sessionId);
      }, 3000);
    } catch (err: any) {
      console.error('❌ Device fingerprint collection failed:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const performEnrollment = async (fingerprintId: string) => {
    try {
      console.log('🔄 Performing PAYER_AUTH_ENROLLMENT...');
      setStatus('Authenticating with your bank...');

      const response = await fetch('/api/payment/safepay/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tracker,
          deviceFingerprint: fingerprintId,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Enrollment failed');
      }

      console.log('✅ Enrollment completed');
      console.log('   Authentication status:', data.authenticationStatus);

      // Check authentication status
      if (data.authenticationStatus === 'FRICTIONLESS' || data.authenticationStatus === 'ATTEMPTED') {
        // No challenge needed, payment is complete
        console.log('✅ Frictionless authentication - no challenge required');
        setStatus('Authentication successful!');

        // Wait a moment then redirect to success
        setTimeout(() => {
          navigate(`/subscribe?status=success&provider=safepay&tracker=${tracker}`);
        }, 1500);
      } else if (data.authenticationStatus === 'REQUIRED') {
        // 3DS challenge required
        console.log('⚠️  3DS challenge required');
        startThreeDSChallenge(data.accessToken, data.stepUpUrl);
      } else {
        // Authentication failed
        throw new Error(`Authentication ${data.authenticationStatus || 'failed'}`);
      }
    } catch (err: any) {
      console.error('❌ Enrollment failed:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const startThreeDSChallenge = (token: string, stepUpUrl: string) => {
    try {
      console.log('🔄 Starting 3DS challenge...');
      setStatus('Please complete the verification with your bank...');
      setLoading(false);

      // Wait for iframe to be ready
      setTimeout(() => {
        // Create form for 3DS step-up iframe
        const form = document.createElement('form');
        form.id = 'step-up-form';
        form.method = 'POST';
        form.action = stepUpUrl;
        form.target = 'step-up-iframe';

        // Add JWT token
        const jwtInput = document.createElement('input');
        jwtInput.type = 'hidden';
        jwtInput.name = 'JWT';
        jwtInput.value = token;
        form.appendChild(jwtInput);

        // Add form to document and submit
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        console.log('✅ 3DS challenge iframe loaded');
      }, 500);

      // Listen for messages from the iframe
      if (typeof window !== 'undefined') {
        window.addEventListener('message', handleIframeMessage);
      }
    } catch (err: any) {
      console.error('❌ Failed to start 3DS challenge:', err);
      setError(err.message);
    }
  };

  const handleIframeMessage = async (event: MessageEvent) => {
    console.log('📨 Received message from iframe:', event.data);

    // Handle Cardinal Commerce messages
    if (event.data && typeof event.data === 'object') {
      if (event.data.Status === 'COMPLETE' || event.data.Status === 'SUCCESS') {
        console.log('✅ 3DS authentication completed');
        setStatus('Verification complete! Processing payment...');

        // Verify the payment with our backend
        await verifyPayment();
      } else if (event.data.Status === 'ERROR' || event.data.Status === 'FAILURE') {
        console.error('❌ 3DS authentication failed:', event.data);
        setError('3DS authentication failed. Please try again.');
      }
    }
  };

  const verifyPayment = async () => {
    try {
      console.log('🔄 Verifying payment after 3DS...');

      const response = await fetch('/api/payment/safepay/verify-3ds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tracker }),
      });

      const data = await response.json();

      if (data.ok) {
        console.log('✅ Payment verified successfully');
        // Redirect to success page
        navigate(`/subscribe?status=success&provider=safepay&tracker=${tracker}`);
      } else {
        console.error('❌ Payment verification failed:', data.error);
        setError(data.error || 'Payment verification failed');
      }
    } catch (err: any) {
      console.error('❌ Error verifying payment:', err);
      setError('Failed to verify payment');
    }
  };

  const handleCancel = () => {
    navigate('/subscribe?status=cancelled');
  };

  useEffect(() => {
    return () => {
      // Clean up event listener
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleIframeMessage);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Preparing Secure Payment</CardTitle>
            <CardDescription>
              Please wait while we prepare your secure payment authentication...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground text-center">
              {status}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleCancel} className="w-full">
              Return to Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Verify Your Payment</CardTitle>
          <CardDescription>
            Please complete the verification with your bank
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Your bank requires additional verification. Please complete the verification in the window below.
              </AlertDescription>
            </Alert>

            {/* 3DS Challenge Iframe */}
            <div className="relative w-full bg-white rounded-lg border overflow-hidden" style={{ height: '450px' }}>
              <iframe
                ref={iframeRef}
                id="step-up-iframe"
                name="step-up-iframe"
                className="w-full h-full"
                style={{ border: 0 }}
                title="3DS Authentication"
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-muted-foreground">
                🔒 Secure authentication powered by your bank
              </p>
              <Button variant="outline" onClick={handleCancel}>
                Cancel Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
