import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <i className="fas fa-download text-white"></i>
              </div>
              <span className="text-xl font-bold gradient-text">VidGrabber</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download videos with the format and quality you choose. Fast, simple, and privacy-friendly.
            </p>
            <div className="flex space-x-3">
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                aria-label="X"
              >
                <i className="fab fa-twitter"></i>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                aria-label="Facebook"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Downloaders</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/instagram-downloader" className="hover:text-foreground transition-colors cursor-pointer">Instagram Downloader</Link></li>
              <li><Link href="/tiktok-downloader" className="hover:text-foreground transition-colors cursor-pointer">TikTok Downloader</Link></li>
              <li><Link href="/youtube-downloader" className="hover:text-foreground transition-colors cursor-pointer">YouTube Downloader</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors cursor-pointer">About</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors cursor-pointer">Contact</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors cursor-pointer">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <i className="fas fa-envelope mt-1 mr-2 text-primary"></i>
                <a href="mailto:support@vidgrabber.online" className="hover:text-foreground transition-colors">
                  support@vidgrabber.online
                </a>
              </li>
              <li className="flex items-start">
                <i className="fas fa-phone mt-1 mr-2 text-primary"></i>
                <a href="tel:+92XXXXXXXXXX" className="hover:text-foreground transition-colors">
                  +92 [Your Number]
                </a>
              </li>
              <li className="flex items-start">
                <i className="fas fa-map-marker-alt mt-1 mr-2 text-primary"></i>
                <span>[City], Pakistan</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</Link></li>
              <li><Link href="/dmca" className="hover:text-foreground transition-colors cursor-pointer">DMCA</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} VidGrabber. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span>Built for creators.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
