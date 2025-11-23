export default function TestEnvPage() {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    return (
        <div className="p-8">
            <h1>Environment Test</h1>
            <p>Publishable Key: {publishableKey ? '✅ Loaded' : '❌ Missing'}</p>
            <p>First 20 chars: {publishableKey?.substring(0, 20)}...</p>
        </div>
    );
}