'use client';

import { useEffect, useState } from 'react';

// One request per page load, shared by every component that asks
let cached: Promise<string[] | null> | null = null;

function loadPermissions(): Promise<string[] | null> {
    if (!cached) {
        cached = fetch('/api/me/permissions')
            .then(res => (res.ok ? res.json() : null))
            .then(data => (data && Array.isArray(data.permissions) ? data.permissions : null))
            .catch(() => null);
    }
    return cached;
}

/** The signed-in user's permissions as "ACTION:RESOURCE" strings; null while loading or if unavailable. */
export function usePermissions(): string[] | null {
    const [permissions, setPermissions] = useState<string[] | null>(null);
    useEffect(() => {
        let active = true;
        loadPermissions().then(p => { if (active) setPermissions(p); });
        return () => { active = false; };
    }, []);
    return permissions;
}
