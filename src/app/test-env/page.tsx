export default function TestEnvPage() {
    const authSecret = process.env.BETTER_AUTH_SECRET;
    const authUrl = process.env.BETTER_AUTH_URL;

    return (
        <div className="p-8">
            <h1>Environment Test</h1>
            <p>BETTER_AUTH_SECRET: {authSecret ? '✅ Loaded' : '❌ Missing'}</p>
            <p>BETTER_AUTH_URL: {authUrl ? `✅ ${authUrl}` : '❌ Missing'}</p>
        </div>
    );
}