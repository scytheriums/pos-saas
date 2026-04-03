'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Step1BusinessInfo } from './steps/Step1BusinessInfo';
import { Step2ContactLocation } from './steps/Step2ContactLocation';
import { Step3TaxLegal } from './steps/Step3TaxLegal';
import { Step4Localization } from './steps/Step4Localization';
import { Step5InitialSetup } from './steps/Step5InitialSetup';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

const onboardingSchema = z.object({
    // Step 1
    name: z.string().min(1, 'Business name is required'),
    businessType: z.string().optional(),
    industry: z.string().optional(),
    logoUrl: z.string().optional(),

    // Step 2
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default('Indonesia'),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional().or(z.literal('')),

    // Step 3
    taxId: z.string().optional(),
    taxRate: z.number().default(11),
    registrationNumber: z.string().optional(),
    legalEntityType: z.string().optional(),

    // Step 4
    currency: z.string().default('IDR'),
    timezone: z.string().default('Asia/Jakarta'),
    dateFormat: z.string().default('DD/MM/YYYY'),
    timeFormat: z.string().default('24h'),

    // Step 5
    firstCategory: z.string().optional(),
    sampleProductName: z.string().optional(),
    sampleProductPrice: z.number().optional(),
    sampleProductStock: z.number().optional(),
    teamMemberEmail: z.string().email().optional().or(z.literal('')),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS = [
    { number: 1, title: 'Business Info', component: Step1BusinessInfo },
    { number: 2, title: 'Contact & Location', component: Step2ContactLocation },
    { number: 3, title: 'Tax & Legal', component: Step3TaxLegal },
    { number: 4, title: 'Localization', component: Step4Localization },
    { number: 5, title: 'Initial Setup', component: Step5InitialSetup },
];

export function OnboardingWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const form = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema) as any,
        defaultValues: {
            name: '',
            businessType: '',
            industry: '',
            logoUrl: '',
            address: '',
            city: '',
            province: '',
            postalCode: '',
            country: 'Indonesia',
            phone: '',
            email: '',
            website: '',
            taxId: '',
            taxRate: 11,
            registrationNumber: '',
            legalEntityType: '',
            currency: 'IDR',
            timezone: 'Asia/Jakarta',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            firstCategory: '',
            sampleProductName: '',
            sampleProductPrice: undefined,
            sampleProductStock: undefined,
            teamMemberEmail: '',
        },
    });

    const progress = ((currentStep + 1) / STEPS.length) * 100;
    const CurrentStepComponent = STEPS[currentStep].component;

    const handleNext = async () => {
        // Define which fields belong to each step
        const stepFields = [
            ['name'], // Step 1: Business name is required
            [], // Step 2: All optional
            [], // Step 3: All optional
            [], // Step 4: All have defaults
            [], // Step 5: All optional
        ];

        // Validate only the fields for the current step
        const fieldsToValidate = stepFields[currentStep];
        const isValid = fieldsToValidate.length > 0
            ? await form.trigger(fieldsToValidate as any)
            : true;

        if (!isValid) return;

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            // Save progress to localStorage
            localStorage.setItem('onboarding Progress', JSON.stringify({
                step: currentStep + 1,
                data: form.getValues(),
            }));
        } else {
            // Final step - submit
            await handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = form.getValues();

            // Submit to API
            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to complete onboarding');
            }

            // Clear progress
            localStorage.removeItem('onboardingProgress');

            // Redirect to dashboard
            // Middleware now fetches metadata directly from Clerk API, so no need to sign out
            window.location.href = '/dashboard/analytics';
        } catch (error: any) {
            console.error('Onboarding error:', error);
            alert(error.message || 'Failed to complete onboarding');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="max-w-3xl mx-auto py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Welcome to Awan POS!</h1>
                    <p className="text-muted-foreground">
                        Let's set up your business in just a few steps
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {STEPS.map((step, index) => (
                            <div
                                key={step.number}
                                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                            >
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${index < currentStep
                                            ? 'bg-primary text-primary-foreground'
                                            : index === currentStep
                                                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                                : 'bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {index < currentStep ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            step.number
                                        )}
                                    </div>
                                    <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className="flex-1 h-1 mx-2 bg-muted relative top-[-12px]">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: index < currentStep ? '100%' : '0%' }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Form */}
                <Form {...form}>
                    <form className="space-y-6">
                        <CurrentStepComponent form={form} />

                        {/* Navigation */}
                        <div className="flex justify-between pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={currentStep === 0 || isSubmitting}
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>

                            <div className="flex gap-2">
                                {currentStep < STEPS.length - 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push('/dashboard')}
                                    >
                                        Skip for now
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                >
                                    {currentStep === STEPS.length - 1 ? (
                                        isSubmitting ? (
                                            'Completing...'
                                        ) : (
                                            <>
                                                Complete Setup
                                                <Check className="ml-2 h-4 w-4" />
                                            </>
                                        )
                                    ) : (
                                        <>
                                            Next
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
