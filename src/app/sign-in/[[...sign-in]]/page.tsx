'use client';

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
    const searchParams = useSearchParams();
    const onboardingComplete = searchParams.get('onboarding') === 'complete';

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="w-full max-w-md">
                {onboardingComplete && (
                    <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-medium text-green-800">Onboarding Complete!</h3>
                                <p className="text-sm text-green-700 mt-1">Please sign in again to access your dashboard.</p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="mt-2 text-gray-600">Sign in to your POS account</p>
                </div>
                <SignIn
                    appearance={{
                        elements: {
                            rootBox: "mx-auto",
                            card: "shadow-2xl",
                        }
                    }}
                />
            </div>
        </div>
    );
}
