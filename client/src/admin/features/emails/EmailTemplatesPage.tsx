import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Mail, Eye, Edit, Save, TestTube, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: any;
  isActive: boolean;
}

interface SmtpConfig {
  id?: number;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'VidGrabber',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadSmtpConfig();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/email-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setTemplates(data.templates);
      }
    } catch (error) {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const loadSmtpConfig = async () => {
    try {
      const response = await fetch('/api/admin/smtp-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok && data.config) {
        setSmtp(data.config);
      }
    } catch (error) {
      console.error('Failed to load SMTP config');
    }
  };

  const handleSaveTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('Template updated successfully');
        loadTemplates();
        setSelectedTemplate(null);
      } else {
        toast.error(data.error || 'Failed to update template');
      }
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/smtp-config', {
        method: smtp.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(smtp),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('SMTP configuration saved successfully');
        setShowSmtpConfig(false);
        loadSmtpConfig();
      } else {
        toast.error(data.error || 'Failed to save SMTP configuration');
      }
    } catch (error) {
      toast.error('Failed to save SMTP configuration');
    }
  };

  const handleTestSmtp = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/admin/smtp-config/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        toast.success(data.message || 'SMTP connection successful!');
      } else {
        toast.error(data.error || 'SMTP connection failed');
      }
    } catch (error) {
      toast.error('Failed to test SMTP connection');
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setSendingTestEmail(true);
      const response = await fetch('/api/admin/smtp-config/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ email: testEmailAddress }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success(data.message || 'Test email sent successfully!');
        setShowTestEmailDialog(false);
        setTestEmailAddress('');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const getTemplateBadge = (name: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      welcome: { label: 'Registration', variant: 'success' },
      forgot_password: { label: 'Password Reset', variant: 'warning' },
      subscription: { label: 'Subscription', variant: 'info' },
    };

    const config = badges[name] || { label: name, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-500 mt-1">Manage email templates and SMTP configuration</p>
        </div>
        <Button
          leftIcon={<Settings className="h-4 w-4" />}
          variant="outline"
          onClick={() => setShowSmtpConfig(true)}
        >
          SMTP Settings
        </Button>
      </div>

      {/* SMTP Status */}
      {smtp.host && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">SMTP Configured</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="text-sm text-gray-600">
                {smtp.fromName} &lt;{smtp.fromEmail}&gt;
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestSmtp}
                  isLoading={testing}
                  leftIcon={<TestTube className="h-4 w-4" />}
                >
                  Test Connection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowTestEmailDialog(true)}
                  leftIcon={<Mail className="h-4 w-4" />}
                >
                  Send Test Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.subject}
                      </h3>
                      {getTemplateBadge(template.name)}
                      {template.isActive && <Badge variant="success">Active</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Template: <code className="bg-gray-100 px-2 py-1 rounded">{template.name}</code>
                    </p>
                    {template.variables && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Available Variables:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(JSON.parse(JSON.stringify(template.variables))).map((key) => (
                            <code key={key} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                              {`{{${key}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye className="h-4 w-4" />}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                      className="cursor-pointer"
                    >
                      Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={<Edit className="h-4 w-4" />}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedTemplate(template);
                        setShowPreview(false);
                      }}
                      className="cursor-pointer"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Template Modal */}
      {selectedTemplate && !showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit Template: {selectedTemplate.name}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <Input
                  value={selectedTemplate.subject}
                  onChange={(e: any) =>
                    setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Content
                </label>
                <textarea
                  value={selectedTemplate.htmlContent}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, htmlContent: e.target.value })
                  }
                  rows={20}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plain Text Content (Optional)
                </label>
                <textarea
                  value={selectedTemplate.textContent || ''}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, textContent: e.target.value })
                  }
                  rows={5}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={() => handleSaveTemplate(selectedTemplate)}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedTemplate && showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Preview: {selectedTemplate.name}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowPreview(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-700">Subject:</p>
                <p className="text-lg">{selectedTemplate.subject}</p>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={selectedTemplate.htmlContent}
                  className="w-full h-[600px]"
                  title="Email Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Config Modal */}
      {showSmtpConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">SMTP Configuration</h2>
                <button
                  type="button"
                  onClick={() => setShowSmtpConfig(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSmtp} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <Input
                    value={smtp.host}
                    onChange={(e: any) => setSmtp({ ...smtp, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Gmail: smtp.gmail.com | SendGrid: smtp.sendgrid.net</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <Input
                    type="number"
                    value={smtp.port}
                    onChange={(e: any) => setSmtp({ ...smtp, port: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">587 (STARTTLS) or 465 (SSL)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
                  <div className="flex items-center h-10">
                    <input
                      type="checkbox"
                      checked={smtp.secure}
                      onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label className="ml-2 text-sm text-gray-700">Use SSL (port 465)</label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Uncheck for STARTTLS (port 587)</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <Input
                    value={smtp.username}
                    onChange={(e: any) => setSmtp({ ...smtp, username: e.target.value })}
                    placeholder="your-email@gmail.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Your email address</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <Input
                    type="password"
                    value={smtp.password}
                    onChange={(e: any) => setSmtp({ ...smtp, password: e.target.value })}
                    placeholder="App password (not your email password)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For Gmail: Use App Password from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Account Settings</a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                  <Input
                    type="email"
                    value={smtp.fromEmail}
                    onChange={(e: any) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                    placeholder="noreply@savemedia.app"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                  <Input
                    value={smtp.fromName}
                    onChange={(e: any) => setSmtp({ ...smtp, fromName: e.target.value })}
                    placeholder="VidGrabber"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  <i className="fas fa-info-circle mr-2"></i>
                  Gmail Users:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-6 list-disc">
                  <li>Enable 2-Factor Authentication on your Gmail account</li>
                  <li>Generate an App Password at: myaccount.google.com/apppasswords</li>
                  <li>Use the app password (not your regular password)</li>
                  <li>Host: smtp.gmail.com, Port: 587, Secure: Yes</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setShowSmtpConfig(false)}>
                  Cancel
                </Button>
                <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Test Email Dialog */}
      {showTestEmailDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Send Test Email</h2>
              <button
                type="button"
                onClick={() => setShowTestEmailDialog(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Send a test email to verify your SMTP configuration is working correctly.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email Address
                </label>
                <Input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e: any) => setTestEmailAddress(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the email address where you want to receive the test email
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTestEmailDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendTestEmail}
                  isLoading={sendingTestEmail}
                  leftIcon={<Mail className="h-4 w-4" />}
                >
                  Send Test Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
