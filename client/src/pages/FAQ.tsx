import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const faqCategories = [
	{
		category: "Getting Started",
		icon: "fas fa-rocket",
		items: [
			{
				q: "How do I download videos from social media?",
				a: "Simply paste the video URL in the download form on our homepage or platform-specific pages. Select your preferred format (MP4 for video or MP3 for audio) and quality, then click download. The file will be processed and ready for download in seconds.",
			},
			{
				q: "Which platforms are supported?",
				a: "We support downloading public media from Instagram, TikTok, YouTube, Facebook, Twitter/X, and more. Availability depends on the platform and the link type. Some platforms may have restrictions on certain content types.",
			},
			{
				q: "Do I need to create an account?",
				a: "No account is required for basic downloads. However, creating a free account gives you access to download history, faster processing, and the ability to re-download expired files. Premium accounts unlock unlimited downloads and 4K quality.",
			},
			{
				q: "Is VidGrabber free to use?",
				a: "Yes! VidGrabber offers a free tier with 5 downloads per day for web users and 7 downloads per 30-day window for bot users. Upgrade to Premium for unlimited downloads, 4K quality, faster speeds, and no ads.",
			},
		],
	},
	{
		category: "Downloads & Files",
		icon: "fas fa-download",
		items: [
			{
				q: "Why do downloads expire?",
				a: "Files are stored temporarily on our servers for privacy and storage management. After a short time (typically 1-24 hours), they will be deleted automatically. This keeps our service fast and secure while protecting user privacy.",
			},
			{
				q: "Can I re-download an expired item?",
				a: "Yes! Use the Re-download button in your download history to regenerate the file with the same format and quality. This feature is available for all users with an account.",
			},
			{
				q: "What video qualities are available?",
				a: "Free users can download videos in SD (480p), HD (720p), and Full HD (1080p) quality. Premium users also get access to 4K (2160p) quality for supported platforms. Audio extraction is available in high-quality MP3 format.",
			},
			{
				q: "Can I download private videos?",
				a: "No, we can only download publicly accessible videos due to privacy and platform restrictions. Private, password-protected, or age-restricted content cannot be downloaded.",
			},
			{
				q: "How long does a download take?",
				a: "Most downloads complete within 10-30 seconds depending on video length and quality. Longer videos or higher quality may take up to 2-3 minutes. Premium users get priority processing for faster speeds.",
			},
		],
	},
	{
		category: "Premium & Plans",
		icon: "fas fa-crown",
		items: [
			{
				q: "What's included in Premium?",
				a: "Premium includes unlimited downloads, 4K quality access, faster download speeds, no ads, batch downloads, and priority customer support. Premium is available as a monthly subscription for $9.99/month.",
			},
			{
				q: "How do I upgrade to Premium?",
				a: "Click the 'Subscribe' button in the header or visit /subscribe. You can pay securely via Binance Pay or PayPal. Premium activates immediately after payment confirmation.",
			},
			{
				q: "Can I cancel Premium anytime?",
				a: "Yes, you can cancel your Premium subscription at any time. Your Premium access will remain active until the end of your current billing period. No refunds are provided for partial periods.",
			},
			{
				q: "Do Premium codes exist?",
				a: "Yes, Premium codes are available from administrators for promotional purposes, giveaways, or partnerships. Contact support or check our social media for code giveaways.",
			},
		],
	},
	{
		category: "Technical & Troubleshooting",
		icon: "fas fa-tools",
		items: [
			{
				q: "Why did my download fail?",
				a: "Downloads can fail for several reasons: the video was removed or made private, the URL is invalid, platform restrictions, or temporary server issues. Try again or contact support with the URL and error message.",
			},
			{
				q: "The video quality is lower than expected",
				a: "Video quality depends on what the original platform provides. Some videos are only available in certain qualities. Premium users can access the highest available quality including 4K when supported.",
			},
			{
				q: "Can I use VidGrabber on mobile?",
				a: "Yes! VidGrabber works on all devices including smartphones and tablets. You can also use our Telegram or WhatsApp bots for convenient mobile downloads without opening a browser.",
			},
			{
				q: "Do I need to install any software?",
				a: "No installation required! VidGrabber works directly in your web browser on any device. For mobile users, we also offer Telegram and WhatsApp bots for easy access.",
			},
		],
	},
	{
		category: "Legal & Privacy",
		icon: "fas fa-shield-alt",
		items: [
			{
				q: "Is it legal to download videos?",
				a: "Downloading is legal for personal use. However, please respect copyright and only download content you have permission to use. We comply with DMCA takedown requests. See our Terms of Service for more information.",
			},
			{
				q: "Do you store my personal data?",
				a: "We store minimal data necessary for the service: download history (if you have an account), email (if provided), and basic usage statistics. Files are automatically deleted after a short period. See our Privacy Policy for details.",
			},
			{
				q: "How do I report copyright infringement?",
				a: "If you believe content infringes your copyright, please send a DMCA notice to support@vidgrabber.online with the required information. See our DMCA page for details on the process.",
			},
		],
	},
];

export default function FAQ() {
	// Flatten all FAQ items for structured data
	const allFaqs = faqCategories.flatMap(category => 
		category.items.map(item => ({
			question: item.q,
			answer: item.a
		}))
	);

	return (
		<>
			<SEOHead
				title="FAQ - Frequently Asked Questions | VidGrabber"
				description="Frequently asked questions about VidGrabber. Learn how to download videos, use Premium features, troubleshoot issues, and more."
				keywords="savemedia faq, video downloader help, download questions, savemedia support, how to download videos"
				canonicalUrl="/faq"
				faqData={allFaqs}
				structuredData={[
					{
						"@context": "https://schema.org",
						"@type": "WebPage",
						"name": "FAQ - Frequently Asked Questions | VidGrabber",
						"description": "Frequently asked questions about VidGrabber video downloader",
						"url": typeof window !== 'undefined' ? `${window.location.origin}/faq` : 'https://savemedia.app/faq',
						"mainEntity": {
							"@type": "FAQPage",
							"mainEntity": allFaqs.map(faq => ({
								"@type": "Question",
								"name": faq.question,
								"acceptedAnswer": {
									"@type": "Answer",
									"text": faq.answer
								}
							}))
						}
					}
				]}
			/>
			<Helmet>
				<title>FAQ - VidGrabber</title>
			</Helmet>
			<div className="min-h-screen bg-background flex flex-col">
				<Header />
				<main className="flex-1">
					{/* Hero Section */}
					<section className="hero-gradient py-16 sm:py-20">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="text-center max-w-3xl mx-auto">
								<div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
									<i className="fas fa-question-circle text-white text-3xl"></i>
								</div>
								<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
									Frequently Asked Questions
								</h1>
								<p className="text-lg sm:text-xl text-muted-foreground">
									Quick answers to common questions about VidGrabber. Can't find what you're looking for? 
									<Link href="/contact" className="text-primary hover:underline ml-1">Contact us</Link>.
								</p>
							</div>
						</div>
					</section>

					{/* FAQ Categories */}
					<section className="py-16">
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div className="space-y-12">
								{faqCategories.map((category, categoryIndex) => (
									<div key={categoryIndex}>
										<div className="flex items-center space-x-3 mb-6">
											<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
												<i className={`${category.icon} text-primary text-xl`}></i>
											</div>
											<h2 className="text-2xl sm:text-3xl font-bold">{category.category}</h2>
										</div>
										<div className="space-y-4">
											{category.items.map((item, itemIndex) => (
												<Card
													key={itemIndex}
													className="border-2 border-border hover:border-primary/50 transition-all overflow-hidden"
												>
													<CardContent className="p-0">
														<details className="group">
															<summary className="w-full px-6 py-5 text-left flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors font-semibold text-lg">
																<span className="pr-4">{item.q}</span>
																<i className="fas fa-chevron-down text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0"></i>
															</summary>
															<div className="px-6 pb-5 text-muted-foreground leading-relaxed">
																{item.a}
															</div>
														</details>
													</CardContent>
												</Card>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					</section>

					{/* CTA Section */}
					<section className="py-16 bg-muted/30">
						<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
							<Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
								<CardContent className="p-12">
									<h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
									<p className="text-lg text-muted-foreground mb-8">
										Our support team is here to help. Get in touch and we'll respond within 24-48 hours.
									</p>
									<div className="flex flex-wrap justify-center gap-4">
										<Button asChild size="lg" className="rounded-xl">
											<Link href="/contact">Contact Support</Link>
										</Button>
										<Button asChild size="lg" variant="outline" className="rounded-xl">
											<Link href="/">Start Downloading</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>
					</section>
				</main>
				<Footer />
			</div>
		</>
	);
}
