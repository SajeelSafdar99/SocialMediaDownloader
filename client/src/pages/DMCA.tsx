import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function DMCA() {
  return (
    <>
      <SEOHead 
        title="DMCA Policy - VidGrabber | Copyright Protection" 
        description="DMCA policy for VidGrabber. Learn how to submit a copyright infringement notice or counter-notification. We respect intellectual property rights." 
        keywords="DMCA policy, copyright protection, takedown notice, copyright infringement, DMCA compliance"
        canonicalUrl="/dmca"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "DMCA Policy - VidGrabber",
          "description": "DMCA policy for VidGrabber. Learn how to submit a copyright infringement notice.",
          "url": typeof window !== 'undefined' ? `${window.location.origin}/dmca` : 'https://savemedia.app/dmca'
        }}
      />
      <Helmet>
        <title>DMCA - VidGrabber</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="hero-gradient py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-gavel text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">DMCA Policy</h1>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  VidGrabber respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA).
                </p>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-8">
                {/* Overview */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Overview</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      VidGrabber is a service that allows users to download publicly available content from various social 
                      media platforms. We do not host, store, or distribute copyrighted content. We act as an intermediary 
                      service that processes download requests.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mt-4">
                      If you believe that content available through our Service infringes your copyright, you may submit 
                      a DMCA takedown notice. We will respond to valid notices in accordance with the DMCA.
                    </p>
                  </CardContent>
                </Card>

                {/* Filing a DMCA Notice */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Filing a DMCA Takedown Notice</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      To file a DMCA takedown notice, please send an email to our designated DMCA agent with the following information:
                    </p>
                    
                    <div className="bg-muted/50 rounded-lg p-6 mb-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <i className="fas fa-envelope text-primary mr-2"></i>
                        DMCA Agent Contact
                      </h3>
                      <p className="font-medium mb-2">Email: <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline">support@vidgrabber.online</a></p>
                      <p className="text-sm text-muted-foreground">Subject: DMCA Takedown Notice</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-3">Required Information:</h3>
                        <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
                          <li>
                            <strong className="text-foreground">Identification of Copyrighted Work:</strong> Describe the copyrighted work 
                            that you claim has been infringed, including the title, author, and any registration information.
                          </li>
                          <li>
                            <strong className="text-foreground">Identification of Infringing Material:</strong> Provide the specific URL(s) 
                            or link(s) to the content that you claim infringes your copyright. Include enough information for us to locate 
                            the material.
                          </li>
                          <li>
                            <strong className="text-foreground">Contact Information:</strong> Your full name, mailing address, telephone 
                            number, and email address.
                          </li>
                          <li>
                            <strong className="text-foreground">Good Faith Statement:</strong> A statement that you have a good faith belief 
                            that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, 
                            or the law.
                          </li>
                          <li>
                            <strong className="text-foreground">Accuracy Statement:</strong> A statement that the information in the notice 
                            is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner.
                          </li>
                          <li>
                            <strong className="text-foreground">Signature:</strong> A physical or electronic signature of the copyright 
                            owner or authorized representative.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Counter-Notification */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Counter-Notification</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      If you believe that your content was removed in error, you may file a counter-notification. To be effective, 
                      your counter-notification must include:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>Your physical or electronic signature</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>Identification of the material that was removed and its location before removal</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>Your name, address, and telephone number</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <i className="fas fa-check-circle text-primary mt-1"></i>
                        <span>A statement that you consent to the jurisdiction of the federal court in your district</span>
                      </li>
                    </ul>
                    <p className="text-muted-foreground leading-relaxed mt-4">
                      Send counter-notifications to: <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline">support@vidgrabber.online</a>
                    </p>
                  </CardContent>
                </Card>

                {/* Process */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Our Process</h2>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                          1
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Receive Notice</h3>
                          <p className="text-sm text-muted-foreground">
                            We receive and review your DMCA takedown notice to ensure it contains all required information.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                          2
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Review & Verify</h3>
                          <p className="text-sm text-muted-foreground">
                            We verify the notice is valid and identify the infringing content in our system.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                          3
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Take Action</h3>
                          <p className="text-sm text-muted-foreground">
                            We remove or disable access to the infringing material and notify the user who submitted it.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                          4
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Respond</h3>
                          <p className="text-sm text-muted-foreground">
                            We respond to you confirming the action taken, typically within 1-3 business days.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Repeat Infringers */}
                <Card className="border-2 border-border shadow-lg">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Repeat Infringers</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      In accordance with the DMCA, we maintain a policy of terminating, in appropriate circumstances, 
                      the accounts of users who are repeat infringers. We reserve the right to terminate accounts that 
                      repeatedly violate copyright laws.
                    </p>
                  </CardContent>
                </Card>

                {/* False Claims */}
                <Card className="border-2 border-red-200 bg-red-50/50">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4 text-red-900">Warning: False Claims</h2>
                    <p className="text-red-800 leading-relaxed mb-4">
                      <strong>Please note:</strong> Under Section 512(f) of the DMCA, any person who knowingly materially 
                      misrepresents that material or activity is infringing may be subject to liability for damages, 
                      including costs and attorney's fees.
                    </p>
                    <p className="text-red-800 leading-relaxed">
                      Before filing a DMCA notice, please ensure that you are the copyright owner or authorized to act 
                      on behalf of the copyright owner, and that the use of the material is not authorized by law.
                    </p>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      If you have questions about our DMCA policy or need assistance filing a notice, please contact us:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <i className="fas fa-envelope text-primary"></i>
                        </div>
                        <div>
                          <p className="font-semibold">DMCA Agent</p>
                          <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline">
                            support@vidgrabber.online
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <i className="fas fa-headset text-primary"></i>
                        </div>
                        <div>
                          <p className="font-semibold">General Support</p>
                          <Link href="/contact" className="text-primary hover:underline">
                            Contact Support
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-primary/20">
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link href="/contact">Contact Us</Link>
                      </Button>
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
