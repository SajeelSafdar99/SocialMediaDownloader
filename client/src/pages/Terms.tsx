import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

export default function Terms() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <>
      <SEOHead 
        title="Terms of Service - VidGrabber | User Agreement" 
        description="Read VidGrabber's terms of service and user agreement. Understand your rights and responsibilities when using our video downloader service." 
        keywords="terms of service, user agreement, terms and conditions, savemedia terms, service agreement"
        canonicalUrl="/terms"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Terms of Service - VidGrabber",
          "description": "Terms of service for VidGrabber. Please read these terms before using our service.",
          "url": typeof window !== 'undefined' ? `${window.location.origin}/terms` : 'https://savemedia.app/terms',
          "datePublished": "2024-01-01",
          "dateModified": lastUpdated
        }}
      />
      <Helmet>
        <title>Terms of Service - VidGrabber</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="hero-gradient py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-file-contract text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">Terms of Service</h1>
                <p className="text-lg sm:text-xl text-muted-foreground mb-4">
                  Please read these terms carefully before using VidGrabber. By using our service, you agree to these terms.
                </p>
                <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-8">
                {/* Agreement */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Company Information</h2>
                    <div className="space-y-3 text-muted-foreground">
                      <p className="leading-relaxed">
                        <strong className="text-foreground">Legal Name:</strong> VidGrabber (Pvt) Ltd
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-foreground">Trading Name:</strong> VidGrabber
                      </p>
                      <div className="mt-4">
                        <p className="font-semibold text-foreground mb-2">Contact Information:</p>
                        <div className="pl-4 border-l-4 border-primary space-y-1">
                          <p><i className="fas fa-envelope mr-2 text-primary"></i>Email: support@vidgrabber.online</p>
                          <p><i className="fas fa-phone mr-2 text-primary"></i>Phone: +92 311 4455609</p>
                          <p><i className="fas fa-globe mr-2 text-primary"></i>Website: https://vidgrabber.online</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Agreement */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      By accessing or using VidGrabber ("Service"), you agree to be bound by these Terms of Service 
                      and all applicable laws and regulations. If you do not agree with any of these terms, you are 
                      prohibited from using or accessing this Service.
                    </p>
                  </CardContent>
                </Card>

                {/* Acceptable Use */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      VidGrabber is intended for personal, non-commercial use. You agree to use the Service only for 
                      lawful purposes and in accordance with these Terms. You agree NOT to:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Download copyrighted content without permission from the copyright owner</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Use the Service for commercial purposes without authorization</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Attempt to download private, password-protected, or age-restricted content</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Use automated tools or scripts to abuse the Service</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Reverse engineer, decompile, or attempt to extract the source code</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Interfere with or disrupt the Service or servers</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-times-circle text-red-500 mt-1"></i>
                        <span>Share your account credentials with others</span>
                      </li>
                    </ul>
                    <p className="text-muted-foreground leading-relaxed mt-4">
                      You are solely responsible for ensuring you have the rights to download and use any content. 
                      We are not responsible for any copyright infringement that may occur from your use of the Service.
                    </p>
                  </CardContent>
                </Card>

                {/* Service Availability */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Service Availability & Limitations</h2>
                    <div className="space-y-4 text-muted-foreground">
                      <p className="leading-relaxed">
                        We strive to provide a reliable service, but we do not guarantee that:
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-info-circle text-primary mt-1"></i>
                          <span>The Service will be available 100% of the time without interruption</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-info-circle text-primary mt-1"></i>
                          <span>Every URL will be downloadable at all times</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-info-circle text-primary mt-1"></i>
                          <span>All platforms will be supported indefinitely</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-info-circle text-primary mt-1"></i>
                          <span>Downloaded files will be available forever</span>
                        </li>
                      </ul>
                      <p className="leading-relaxed">
                        Platform policies, content restrictions, technical limitations, and legal requirements may 
                        affect the availability of certain downloads. We reserve the right to modify, suspend, or 
                        discontinue any part of the Service at any time without notice.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Premium Subscriptions */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Premium Subscriptions</h2>
                    <div className="space-y-4 text-muted-foreground">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Billing & Payment</h3>
                        <p className="leading-relaxed">
                          Premium subscriptions are billed monthly. By subscribing, you authorize us to charge your 
                          payment method (via Binance Pay, PayPal, or other supported methods) on a recurring basis 
                          until you cancel.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Cancellation</h3>
                        <p className="leading-relaxed">
                          You may cancel your Premium subscription at any time through your account settings. Cancellation
                          takes effect at the end of your current billing period. You will continue to have access to
                          Premium features until the end of the paid period.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Refund Policy</h3>
                        <p className="leading-relaxed mb-3">
                          We offer refunds under the following circumstances:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                          <li>
                            <strong>7-Day Money-Back Guarantee:</strong> If you're not satisfied with Premium features,
                            you may request a full refund within 7 days of your initial purchase.
                          </li>
                          <li>
                            <strong>Service Issues:</strong> If our service experiences significant technical issues that
                            prevent you from using Premium features for more than 24 consecutive hours, you may be eligible
                            for a prorated refund.
                          </li>
                          <li>
                            <strong>Billing Errors:</strong> If you were charged incorrectly due to a billing error on our
                            part, you will receive a full refund of the incorrect charge.
                          </li>
                          <li>
                            <strong>Duplicate Charges:</strong> Any duplicate charges will be refunded immediately upon
                            verification.
                          </li>
                        </ul>
                        <p className="leading-relaxed mt-3">
                          <strong>No refunds for partial billing periods:</strong> Refunds are not provided for unused
                          portions of a billing period if you cancel mid-cycle. However, you will retain access until
                          the end of the paid period.
                        </p>
                        <p className="leading-relaxed mt-3">
                          <strong>How to request a refund:</strong> Contact our support team at support@savemedia.app
                          with your payment details and reason for the refund request. Refunds are typically processed
                          within 5-10 business days.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Price Changes</h3>
                        <p className="leading-relaxed">
                          We reserve the right to modify subscription prices. Price changes will be communicated at least
                          30 days in advance via email, and you may cancel before the change takes effect.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Intellectual Property */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>
                    <div className="space-y-4 text-muted-foreground">
                      <p className="leading-relaxed">
                        The Service, including its original content, features, and functionality, is owned by VidGrabber 
                        and protected by international copyright, trademark, and other intellectual property laws.
                      </p>
                      <p className="leading-relaxed">
                        Downloaded content remains the property of its respective copyright owners. VidGrabber does not 
                        claim ownership of any content downloaded through our Service. You are responsible for respecting 
                        the intellectual property rights of content creators.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Disclaimer */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Disclaimer of Warranties</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                      OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
                        <span>Warranties of merchantability, fitness for a particular purpose, or non-infringement</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
                        <span>Warranties that the Service will be uninterrupted, secure, or error-free</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
                        <span>Warranties regarding the accuracy, reliability, or availability of downloaded content</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Limitation of Liability */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAVEMEDIA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                      SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED 
                      DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM 
                      YOUR USE OF THE SERVICE.
                    </p>
                  </CardContent>
                </Card>

                {/* Indemnification */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Indemnification</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      You agree to defend, indemnify, and hold harmless VidGrabber and its officers, directors, employees, 
                      and agents from and against any claims, damages, obligations, losses, liabilities, costs, or debt, 
                      and expenses (including attorney's fees) arising from your use of the Service or violation of these Terms.
                    </p>
                  </CardContent>
                </Card>

                {/* Termination */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Termination</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We may terminate or suspend your access to the Service immediately, without prior notice or liability, 
                      for any reason, including if you breach these Terms. Upon termination, your right to use the Service 
                      will cease immediately.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      You may terminate your account at any time by contacting us or using account deletion features. 
                      All provisions of these Terms that by their nature should survive termination shall survive, including 
                      ownership provisions, warranty disclaimers, and limitations of liability.
                    </p>
                  </CardContent>
                </Card>

                {/* Changes to Terms */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      We reserve the right to modify or replace these Terms at any time. If a revision is material, we will 
                      provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change 
                      will be determined at our sole discretion. Your continued use of the Service after changes become effective 
                      constitutes acceptance of the new Terms.
                    </p>
                  </CardContent>
                </Card>

                {/* Governing Law */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Governing Law</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to
                      conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be
                      resolved through appropriate legal channels in Pakistan.
                    </p>
                  </CardContent>
                </Card>

                {/* Complaints Handling */}
                <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                      <i className="fas fa-exclamation-circle text-orange-600 mr-3"></i>
                      Complaints Handling Mechanism
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We are committed to resolving any issues or complaints you may have. Please follow this procedure for filing complaints:
                    </p>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">How to File a Complaint:</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                          <li><strong>Email:</strong> support@vidgrabber.online</li>
                          <li><strong>Subject Line:</strong> "Complaint - [Brief Description]"</li>
                          <li><strong>Include:</strong> Your account email, payment ID (if applicable), detailed description, supporting documentation</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Response Timeline:</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                          <li><strong>Initial Acknowledgment:</strong> Within 24 hours</li>
                          <li><strong>Investigation Period:</strong> 2-3 business days</li>
                          <li><strong>Final Resolution:</strong> Within 7 business days</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Escalation Process:</h3>
                        <p className="text-muted-foreground leading-relaxed ml-4">
                          If you're not satisfied with the resolution provided, you may escalate your complaint by
                          replying to the support email with "ESCALATE" in the subject line. Your complaint will be
                          reviewed by senior management within 3 business days.
                        </p>
                      </div>

                      <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-sm text-muted-foreground">
                          <i className="fas fa-info-circle mr-2 text-orange-600"></i>
                          We aim to resolve all complaints fairly and promptly. Your satisfaction is our priority.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Questions About Terms?</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      If you have any questions about these Terms of Service, please contact us:
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium">
                        <i className="fas fa-envelope text-primary mr-2"></i>
                        Email: <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline">support@vidgrabber.online</a>
                      </p>
                      <p className="font-medium">
                        <i className="fas fa-globe text-primary mr-2"></i>
                        Website: <a href="/contact" className="text-primary hover:underline">Contact Page</a>
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
