export default function TestEnvPage() {
    const authSecret = process.env.BETTER_AUTH_SECRET;
    const authUrl = process.env.BETTER_AUTH_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    const vars = [
        { name: 'BETTER_AUTH_SECRET', value: authSecret, display: authSecret ? '✅ Set' : '❌ MISSING' },
        { name: 'BETTER_AUTH_URL', value: authUrl, display: authUrl ? `✅ ${authUrl}` : '❌ MISSING' },
        { name: 'NEXT_PUBLIC_APP_URL', value: appUrl, display: appUrl ? `✅ ${appUrl}` : '❌ MISSING' },
        { name: 'DATABASE_URL', value: dbUrl, display: dbUrl ? `✅ ${dbUrl.substring(0, 50)}...` : '❌ MISSING' },
        { name: 'DIRECT_URL', value: directUrl, display: directUrl ? `✅ ${directUrl.substring(0, 50)}...` : '❌ MISSING' },
    ];

    return (
        <div className="p-8 font-mono">
            <h1 className="text-xl font-bold mb-6">Environment Check</h1>
            <div className="space-y-3">
                {vars.map(v => (
                    <div key={v.name} className="flex gap-4">
                        <span className="w-52 text-gray-500 shrink-0">{v.name}</span>
                        <span className={v.value ? 'text-green-700' : 'text-red-600 font-bold'}>{v.display}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}