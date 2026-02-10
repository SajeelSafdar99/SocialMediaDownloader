import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

export default function Privacy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <>
      <SEOHead 
        title="Privacy Policy - VidGrabber | Data Protection & Privacy" 
        description="Read VidGrabber's privacy policy to learn how we collect, use, and protect your personal data. We are committed to your privacy and data security." 
        keywords="privacy policy, data protection, user privacy, data security, GDPR compliance, savemedia privacy"
        canonicalUrl="/privacy"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Privacy Policy - VidGrabber",
          "description": "Privacy policy for VidGrabber. Learn how we protect your data and handle your information.",
          "url": typeof window !== 'undefined' ? `${window.location.origin}/privacy` : 'https://savemedia.app/privacy',
          "datePublished": "2024-01-01",
          "dateModified": lastUpdated
        }}
      />
      <Helmet>
        <title>Privacy Policy - VidGrabber</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="hero-gradient py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-shield-alt text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">Privacy Policy</h1>
                <p className="text-lg sm:text-xl text-muted-foreground mb-4">
                  Clear, simple, and designed around temporary file storage. Your privacy is our priority.
                </p>
                <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-8">
                {/* Introduction */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Introduction</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      VidGrabber ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                      explains how we collect, use, disclose, and safeguard your information when you use our video 
                      downloading service.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      By using VidGrabber, you agree to the collection and use of information in accordance with this policy. 
                      If you do not agree with our policies and practices, please do not use our service.
                    </p>
                  </CardContent>
                </Card>

                {/* Information We Collect */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center">
                          <i className="fas fa-database text-primary mr-2"></i>
                          Download Metadata
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          We store download metadata including URLs, selected format/quality, timestamps, and download status 
                          to provide download history functionality. This information is stored securely and is only accessible 
                          to you through your account.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center">
                          <i className="fas fa-user text-primary mr-2"></i>
                          Account Information
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          If you create an account, we collect your email address, username, and password (encrypted). 
                          We may also collect authentication information if you sign in using social login providers (Google, 
                          Facebook, GitHub).
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center">
                          <i className="fas fa-chart-line text-primary mr-2"></i>
                          Usage Data
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          We automatically collect information about how you use our service, including IP addresses, browser 
                          type, device information, pages visited, and time spent on pages. This helps us improve our service 
                          and prevent abuse.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center">
                          <i className="fas fa-cookie text-primary mr-2"></i>
                          Cookies & Tracking
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          We use cookies and similar tracking technologies to maintain your session, remember your preferences, 
                          and analyze usage patterns. You can control cookies through your browser settings.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* How We Use Information */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
                    <ul className="space-y-3 text-muted-foreground">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>To provide, maintain, and improve our video downloading service</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>To process your downloads and maintain your download history</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>To authenticate users and prevent unauthorized access</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>To send important service updates and notifications</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>To detect, prevent, and address technical issues and abuse</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>To analyze usage patterns and improve user experience</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* File Storage */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Temporary File Storage</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Files are stored temporarily on our servers for a limited time (typically 1-24 hours) and are 
                      automatically deleted after this period. This approach:
                    </p>
                    <ul className="space-y-2 text-muted-foreground mb-4">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-shield-alt text-primary mt-1"></i>
                        <span>Protects user privacy by not storing files indefinitely</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-server text-primary mt-1"></i>
                        <span>Keeps our storage lean and costs manageable</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-redo text-primary mt-1"></i>
                        <span>Allows you to re-download expired files from your history</span>
                      </li>
                    </ul>
                    <p className="text-muted-foreground leading-relaxed">
                      If your file expires, you can use the Re-download button in your history to regenerate the file 
                      with the same format and quality. We never share downloaded files with third parties.
                    </p>
                  </CardContent>
                </Card>

                {/* Data Sharing */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Data Sharing & Disclosure</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:
                    </p>
                    <ul className="space-y-3 text-muted-foreground">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-gavel text-primary mt-1"></i>
                        <span><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-shield-alt text-primary mt-1"></i>
                        <span><strong>Protection of Rights:</strong> To protect our rights, property, or safety, or that of our users</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-cog text-primary mt-1"></i>
                        <span><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our service (hosting, analytics, payment processing)</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-handshake text-primary mt-1"></i>
                        <span><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Your Rights */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Your Privacy Rights</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      You have the following rights regarding your personal information:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <i className="fas fa-eye text-primary mr-2"></i>
                          Access
                        </h4>
                        <p className="text-sm text-muted-foreground">View your personal data and download history</p>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <i className="fas fa-edit text-primary mr-2"></i>
                          Update
                        </h4>
                        <p className="text-sm text-muted-foreground">Modify your account information and preferences</p>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <i className="fas fa-trash text-primary mr-2"></i>
                          Delete
                        </h4>
                        <p className="text-sm text-muted-foreground">Delete items from your download history or your account</p>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <i className="fas fa-ban text-primary mr-2"></i>
                          Opt-Out
                        </h4>
                        <p className="text-sm text-muted-foreground">Opt out of non-essential communications and tracking</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Data Security</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We implement appropriate technical and organizational measures to protect your personal information:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-lock text-primary mt-1"></i>
                        <span>Encryption of data in transit and at rest</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-key text-primary mt-1"></i>
                        <span>Secure password hashing (bcrypt)</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-firewall text-primary mt-1"></i>
                        <span>Regular security audits and updates</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-shield-virus text-primary mt-1"></i>
                        <span>DDoS protection and rate limiting</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-user-shield text-primary mt-1"></i>
                        <span>Access controls and authentication</span>
                      </li>
                    </ul>
                    <p className="text-muted-foreground leading-relaxed mt-4">
                      However, no method of transmission over the Internet or electronic storage is 100% secure. 
                      While we strive to use commercially acceptable means to protect your information, we cannot 
                      guarantee absolute security.
                    </p>
                  </CardContent>
                </Card>

                {/* Children's Privacy */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Our service is not intended for children under 13 years of age. We do not knowingly collect 
                      personal information from children under 13. If you are a parent or guardian and believe your 
                      child has provided us with personal information, please contact us immediately.
                    </p>
                  </CardContent>
                </Card>

                {/* Changes to Policy */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Changes to This Privacy Policy</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
                      the new Privacy Policy on this page and updating the "Last updated" date. You are advised to 
                      review this Privacy Policy periodically for any changes.
                    </p>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      If you have any questions about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium">
                        <i className="fas fa-envelope text-primary mr-2"></i>
                        Email: <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline">support@vidgrabber.online</a>
                      </p>
                      <p className="font-medium">
                        <i className="fas fa-globe text-primary mr-2"></i>
                        Website: <Link href="/contact" className="text-primary hover:underline">Contact Page</Link>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
