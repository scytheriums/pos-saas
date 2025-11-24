import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Simple welcome tour that shows a series of modal steps after onboarding.
// It does not use a heavy library; it just walks the user through key features.
// The tour is shown only once per browser (tracked via localStorage).

interface TourStep {
    title: string;
    description: string;
}

const steps: TourStep[] = [
    {
        title: 'Welcome to POS Dashboard',
        description: 'Here you can see an overview of your sales, orders, and stock levels.',
    },
    {
        title: 'Analytics',
        description: 'The analytics page provides revenue trends, top‑selling products and more.',
    },
    {
        title: 'POS',
        description: 'Start a new transaction from the POS page, manage cashiers and receipts.',
    },
    {
        title: 'Products',
        description: 'Create, edit and organize your product catalog from the Products page.',
    },
];

export function WelcomeTour() {
    const [open, setOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem('welcomeTourCompleted');
        if (!completed) {
            setOpen(true);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Tour finished
            localStorage.setItem('welcomeTourCompleted', 'true');
            setOpen(false);
        }
    };

    const handleSkip = () => {
        localStorage.setItem('welcomeTourCompleted', 'true');
        setOpen(false);
    };

    if (!open) return null;

    const step = steps[currentStep];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{step.title}</DialogTitle>
                    <DialogDescription>{step.description}</DialogDescription>
                </DialogHeader>
                <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={handleSkip}>
                        Skip Tour
                    </Button>
                    <Button onClick={handleNext}>
                        {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
