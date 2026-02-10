import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const features = [
    { icon: 'fas fa-infinity', title: 'Unlimited Downloads', desc: 'No daily limits' },
    { icon: 'fas fa-hd-video', title: '4K Quality', desc: 'Highest resolution' },
    { icon: 'fas fa-ad', title: 'Ad-Free', desc: 'Clean experience' },
    { icon: 'fas fa-layer-group', title: 'Batch Downloads', desc: 'Multiple at once' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-premium">
        {/* Header */}
        <DialogHeader>
          <div className="gradient-primary p-8 text-white rounded-t-lg -m-6 mb-6">
            <DialogTitle className="text-3xl font-bold mb-2">Upgrade to Premium</DialogTitle>
            <p className="opacity-90">Unlock unlimited downloads and advanced features</p>
          </div>
        </DialogHeader>
        
        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <i className={`${feature.icon} text-primary text-xl mt-1`}></i>
              <div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pricing Options */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary hover:bg-primary/5'
            }`}
            data-testid="button-plan-monthly"
          >
            <div className="text-left">
              <div className="font-semibold">Monthly Plan</div>
              <div className="text-sm text-muted-foreground">Billed monthly</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">$9.99</div>
              <div className="text-sm text-muted-foreground">/month</div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedPlan('annual')}
            className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${
              selectedPlan === 'annual'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary hover:bg-primary/5'
            }`}
            data-testid="button-plan-annual"
          >
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Annual Plan</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
                  SAVE 40%
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Billed yearly</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">$5.99</div>
              <div className="text-sm text-muted-foreground">/month</div>
            </div>
          </button>
        </div>
        
        {/* Action Button */}
        <Button asChild className="w-full btn-primary px-6 py-4 rounded-xl font-semibold text-lg" data-testid="button-proceed-checkout">
          <Link href="/subscribe">
            <i className="fas fa-lock mr-2"></i>
            Continue to Secure Payment
          </Link>
        </Button>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          <i className="fas fa-shield-alt mr-1"></i>
          100% secure payment via Binance & PayPal
        </p>
      </DialogContent>
    </Dialog>
  );
}
