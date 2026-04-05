'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

export default function SKUSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        autoGenerateSku: false,
        skuFormat: '{BUSINESS}/{DATE}/{COUNTER}',
        skuPrefix: '',
        preview: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/sku');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/sku', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    autoGenerateSku: settings.autoGenerateSku,
                    skuFormat: settings.skuFormat,
                    skuPrefix: settings.skuPrefix || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                toast.success('SKU settings saved successfully');
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to save settings');
            }
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">SKU Auto-Generation</h1>
                <p className="text-xs text-muted-foreground">
                    Configure automatic SKU number generation for new products
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generation Settings</CardTitle>
                    <CardDescription>
                        Enable and configure how SKU codes are automatically generated
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-generate">Enable Auto-Generate SKU</Label>
                            <p className="text-xs text-muted-foreground">
                                Automatically generate SKU codes when creating products
                            </p>
                        </div>
                        <Switch
                            id="auto-generate"
                            checked={settings.autoGenerateSku}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, autoGenerateSku: checked }))
                            }
                        />
                    </div>

                    {/* Format Template */}
                    <div className="space-y-2">
                        <Label htmlFor="format">Format Template</Label>
                        <Input
                            id="format"
                            value={settings.skuFormat}
                            onChange={(e) =>
                                setSettings(prev => ({ ...prev, skuFormat: e.target.value }))
                            }
                            placeholder="{BUSINESS}/{DATE}/{COUNTER}"
                            disabled={!settings.autoGenerateSku}
                        />
                        <p className="text-xs text-muted-foreground">
                            Available placeholders: {'{BUSINESS}'}, {'{DATE}'}, {'{COUNTER}'}, {'{RANDOM}'}, {'{PRODUCT}'}
                        </p>
                    </div>

                    {/* Prefix */}
                    <div className="space-y-2">
                        <Label htmlFor="prefix">Prefix (Optional)</Label>
                        <Input
                            id="prefix"
                            value={settings.skuPrefix || ''}
                            onChange={(e) =>
                                setSettings(prev => ({ ...prev, skuPrefix: e.target.value }))
                            }
                            placeholder="e.g., PROD"
                            disabled={!settings.autoGenerateSku}
                        />
                        <p className="text-xs text-muted-foreground">
                            Add a custom prefix before the generated SKU
                        </p>
                    </div>

                    {/* Preview */}
                    {settings.autoGenerateSku && (
                        <div className="p-4 bg-muted rounded-lg">
                            <Label className="text-sm font-medium">Preview</Label>
                            <p className="text-lg font-mono font-bold mt-2">{settings.preview || 'AWAN/251208/0001'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                This is how your next SKU will look
                            </p>
                        </div>
                    )}

                    {/* Format Examples */}
                    <div className="border-t pt-4">
                        <Label className="text-sm font-medium">Format Examples</Label>
                        <div className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <code className="text-xs">{'{BUSINESS}/{DATE}/{COUNTER}'}</code>
                                <span className="text-muted-foreground">→ AWAN/251208/0001</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="text-xs">{'{BUSINESS}-{COUNTER}'}</code>
                                <span className="text-muted-foreground">→ AWAN-0001</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="text-xs">{'{RANDOM}'}</code>
                                <span className="text-muted-foreground">→ A1B2C3</span>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
