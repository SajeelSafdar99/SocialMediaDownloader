import { useState } from 'react';
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit to backend API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Message Sent!",
          description: "We've received your message and will get back to you within 24-48 hours.",
        });

        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: "fas fa-envelope",
      title: "Email Support",
      value: "support@vidgrabber.online",
      description: "Get help with downloads, account issues, or general questions",
      action: "mailto:support@vidgrabber.online",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: "fas fa-bug",
      title: "Report a Bug",
      value: "support@vidgrabber.online",
      description: "Found an issue? Let us know and we'll fix it ASAP",
      action: "mailto:support@vidgrabber.online",
      color: "from-red-500 to-red-600",
    },
    {
      icon: "fas fa-handshake",
      title: "Partnerships",
      value: "support@vidgrabber.online",
      description: "Interested in partnering with us? We'd love to hear from you",
      action: "mailto:support@vidgrabber.online",
      color: "from-green-500 to-green-600",
    },
    {
      icon: "fas fa-newspaper",
      title: "Press & Media",
      value: "support@vidgrabber.online",
      description: "Media inquiries and press releases",
      action: "mailto:support@vidgrabber.online",
      color: "from-purple-500 to-purple-600",
    },
  ];

  const faqLinks = [
    { question: "How do I download videos?", link: "/faq" },
    { question: "Which platforms are supported?", link: "/faq" },
    { question: "Why did my download fail?", link: "/faq" },
    { question: "How do I upgrade to Premium?", link: "/subscribe" },
  ];

  return (
    <>
      <SEOHead
        title="Contact Us - Get Help & Support | VidGrabber"
        description="Contact VidGrabber support team for help with downloads, account issues, bug reports, partnerships, or general questions. We respond within 24-48 hours."
        keywords="contact savemedia, savemedia support, video downloader help, customer support, technical support"
        canonicalUrl="/contact"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact VidGrabber",
          "description": "Contact VidGrabber support team for help and support",
          "url": typeof window !== 'undefined' ? `${window.location.origin}/contact` : 'https://vidgrabber.online/contact',
          "mainEntity": {
            "@type": "Organization",
            "name": "VidGrabber",
            "email": "support@vidgrabber.online",
            "contactPoint": [
              {
                "@type": "ContactPoint",
                "contactType": "Customer Support",
                "email": "support@vidgrabber.online",
                "availableLanguage": "English"
              },
              {
                "@type": "ContactPoint",
                "contactType": "Technical Support",
                "email": "support@vidgrabber.online",
                "availableLanguage": "English"
              }
            ]
          }
        }}
      />
      <Helmet>
        <title>Contact - VidGrabber</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="hero-gradient py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-headset text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">Contact Us</h1>
                <p className="text-lg sm:text-xl text-muted-foreground">
                  Support, feedback, partnerships — we'd love to hear from you. 
                  Our team typically responds within 24-48 hours.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Methods */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Business Address & Phone */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-map-marker-alt text-primary text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Business Address</h3>
                        <address className="not-italic text-sm text-muted-foreground leading-relaxed">
                          VidGrabber (Pvt) Ltd<br />
                          Township <br />
                          Lahore, Punjab<br />
                          Pakistan
                        </address>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-phone text-primary text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Phone Support</h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Pakistan:</strong>
                        </p>
                        <a href="tel:+923114455609" className="text-primary hover:underline font-medium">
                          +92-114-455609
                        </a>
                        <p className="text-xs text-muted-foreground mt-2">
                          Mon-Fri: 9AM-6PM PKT<br />
                          Sat: 10AM-4PM PKT
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-envelope text-primary text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Email Support</h3>
                        <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline font-medium text-sm break-all">
                          support@vidgrabber.online
                        </a>
                        <p className="text-xs text-muted-foreground mt-2">
                          Response within 24-48 hours
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {contactMethods.map((method, index) => (
                  <Card key={index} className="border-2 border-border hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center mx-auto mb-4`}>
                        <i className={`${method.icon} text-white text-2xl`}></i>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{method.title}</h3>
                      <a 
                        href={method.action}
                        className="text-primary hover:underline font-medium block mb-2"
                      >
                        {method.value}
                      </a>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Contact Form */}
                <Card className="border-2 border-border shadow-xl">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          placeholder="What's this about?"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us how we can help..."
                          rows={6}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full rounded-xl" 
                        size="lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane mr-2"></i>
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Help Section */}
                <div className="space-y-6">
                  <Card className="border-2 border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-lightbulb text-primary text-xl"></i>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-3">Before You Write</h3>
                          <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                              <i className="fas fa-check text-primary mt-1"></i>
                              <span>Include the URL you tried to download</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <i className="fas fa-check text-primary mt-1"></i>
                              <span>Mention the platform and format/quality</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <i className="fas fa-check text-primary mt-1"></i>
                              <span>Share any error message shown</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <i className="fas fa-check text-primary mt-1"></i>
                              <span>Include your device/browser information</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-border">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Quick Answers</h3>
                      <div className="space-y-3">
                        {faqLinks.map((item, index) => (
                          <a
                            key={index}
                            href={item.link}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
                          >
                            <span className="text-muted-foreground group-hover:text-foreground">
                              {item.question}
                            </span>
                            <i className="fas fa-chevron-right text-muted-foreground group-hover:text-primary"></i>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-clock text-primary text-xl"></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Response Time</h3>
                          <p className="text-muted-foreground text-sm">
                            We typically respond to all inquiries within <strong>24-48 hours</strong>. 
                            For urgent issues, please include "URGENT" in your subject line.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
