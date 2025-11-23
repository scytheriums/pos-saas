import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // Get user from Clerk
        const client = await clerkClient();
        const user = await client.users.getUser(session.userId);

        // Check if user already has a tenant
        if (user.publicMetadata.tenantId) {
            return NextResponse.json({ error: 'User already has a tenant' }, { status: 400 });
        }

        // Use transaction to ensure all operations succeed or fail together
        const result = await prisma.$transaction(async (tx) => {
            // Create tenant with comprehensive data
            const tenant = await tx.tenant.create({
                data: {
                    // Step 1: Business Information
                    name: data.name.trim(),
                    businessType: data.businessType || null,
                    industry: data.industry || null,
                    logoUrl: data.logoUrl || null,

                    // Step 2: Contact & Location
                    address: data.address || null,
                    city: data.city || null,
                    province: data.province || null,
                    postalCode: data.postalCode || null,
                    country: data.country || 'Indonesia',
                    phone: data.phone || null,
                    email: data.email || null,
                    website: data.website || null,

                    // Step 3: Tax & Legal
                    taxId: data.taxId || null,
                    taxRate: data.taxRate || 11,
                    registrationNumber: data.registrationNumber || null,
                    legalEntityType: data.legalEntityType || null,

                    // Step 4: Localization
                    currency: data.currency || 'IDR',
                    timezone: data.timezone || 'Asia/Jakarta',
                    dateFormat: data.dateFormat || 'DD/MM/YYYY',
                    timeFormat: data.timeFormat || '24h',

                    // Mark onboarding as complete
                    onboardingCompleted: true,
                    onboardingStep: 5,
                },
            });

            // Step 5: Create optional initial items
            let category = null;
            if (data.firstCategory) {
                category = await tx.category.create({
                    data: {
                        name: data.firstCategory,
                        tenantId: tenant.id,
                    },
                });
            }

            if (data.sampleProductName && data.sampleProductPrice) {
                // Create product with a default variant
                await tx.product.create({
                    data: {
                        name: data.sampleProductName,
                        minStock: 5,
                        categoryId: category?.id || null,
                        tenantId: tenant.id,
                        variants: {
                            create: {
                                sku: `SAMPLE-${Date.now()}`,
                                price: data.sampleProductPrice,
                                stock: data.sampleProductStock || 10,
                            },
                        },
                    },
                });
            }

            return tenant;
        });

        // TODO: Handle team member invitation (data.teamMemberEmail)
        // This would require sending an email invitation

        // Update user metadata in Clerk (outside transaction as it's external service)
        try {
            console.log('Updating Clerk metadata for user:', session.userId);
            console.log('Tenant ID:', result.id);
            console.log('Tenant Name:', result.name);

            const updateResult = await client.users.updateUserMetadata(session.userId, {
                publicMetadata: {
                    tenantId: result.id,
                    tenantName: result.name,
                    role: 'owner',
                },
            });

            console.log('Clerk metadata update successful:', updateResult.publicMetadata);
        } catch (clerkError) {
            console.error('Failed to update Clerk metadata:', clerkError);
            // Don't fail the whole onboarding if Clerk update fails
            // The tenant is created, user can manually fix metadata
        }

        return NextResponse.json({
            success: true,
            tenantId: result.id,
            tenantName: result.name,
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        return NextResponse.json(
            { error: 'Failed to create tenant', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
