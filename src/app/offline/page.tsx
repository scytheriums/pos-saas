'use client';

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-6 p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100">
                    <svg
                        className="w-10 h-10 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                        />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">You're Offline</h1>
                    <p className="text-gray-600 max-w-md">
                        It looks like you've lost your internet connection. Some features may not be available.
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                    Try Again
                </button>

                <div className="pt-4 text-sm text-gray-500">
                    <p>Cached pages and the POS will continue to work offline.</p>
                </div>
            </div>
        </div>
    );
}
