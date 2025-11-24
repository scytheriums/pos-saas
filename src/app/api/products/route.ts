import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { logCrudAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            console.error('Auth error:', authResult.error);
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        const body = await req.json();
        const { name, description, hasVariants, options, variants, minStock, categoryId } = body;

        console.log('Creating product payload:', JSON.stringify({
            name,
            hasVariants,
            optionsCount: options?.length,
            variantsCount: variants?.length,
            firstVariant: variants?.[0]
        }, null, 2));

        if (!name) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Create Base Product
            const product = await tx.product.create({
                data: {
                    name,
                    description,
                    minStock: minStock || 10,
                    categoryId: categoryId || null,
                    tenantId,
                },
            });

            console.log('Base product created:', product.id);

            if (!hasVariants) {
                // Create a single default variant for simple products
                if (!variants || variants.length === 0) {
                    throw new Error("Simple product must have at least one variant definition");
                }

                const simpleVariant = variants[0];
                console.log('Creating simple variant:', simpleVariant);

                let sku = simpleVariant.sku;
                let isUnique = false;
                let attempts = 0;

                // Ensure SKU uniqueness
                while (!isUnique && attempts < 5) {
                    const existing = await tx.productVariant.findUnique({
                        where: { sku }
                    });

                    if (!existing) {
                        isUnique = true;
                    } else {
                        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                        sku = `${simpleVariant.sku}-${suffix}`;
                        attempts++;
                    }
                }

                if (!isUnique) {
                    sku = `${simpleVariant.sku}-${Date.now()}`;
                }

                await tx.productVariant.create({
                    data: {
                        productId: product.id,
                        sku: sku,
                        price: new Prisma.Decimal(simpleVariant.price),
                        cost: new Prisma.Decimal(simpleVariant.cost || 0),
                        stock: simpleVariant.stock,
                    },
                });
            } else if (options && options.length > 0) {
                // 2. Create Options & Values and build ID mapping
                // Map: optionName -> { optionId, values: Map<valueName, valueId> }
                const optionMap = new Map<string, { optionId: string; valueMap: Map<string, string> }>();

                for (const opt of options) {
                    const createdOption = await tx.productOption.create({
                        data: {
                            productId: product.id,
                            name: opt.name,
                        },
                    });

                    const valueMap = new Map<string, string>();

                    // Create values for this option
                    for (const valueName of opt.values) {
                        const createdValue = await tx.productOptionValue.create({
                            data: {
                                optionId: createdOption.id,
                                value: valueName,
                            },
                        });
                        valueMap.set(valueName, createdValue.id);
                    }

                    optionMap.set(opt.name, { optionId: createdOption.id, valueMap });
                }

                // 3. Create Variants with proper option value connections
                if (variants && variants.length > 0) {
                    // The frontend sends optionValueIds which are temp IDs
                    // We need to reconstruct which option values each variant should have
                    // based on the combination order

                    // Generate all combinations to match with frontend variants
                    const combinations = generateCombinations(options);

                    console.log('Generated combinations:', combinations.length);
                    console.log('Received variants:', variants.length);

                    for (let i = 0; i < variants.length && i < combinations.length; i++) {
                        const variant = variants[i];
                        const combination = combinations[i];

                        // Get the real database IDs for this combination
                        const optionValueIds: string[] = [];

                        for (const { optionName, valueName } of combination) {
                            const optData = optionMap.get(optionName);
                            if (optData) {
                                const valueId = optData.valueMap.get(valueName);
                                if (valueId) {
                                    optionValueIds.push(valueId);
                                }
                            }
                        }

                        console.log(`Creating variant ${i}:`, { sku: variant.sku, optionValueIds });

                        let sku = variant.sku;
                        let isUnique = false;
                        let attempts = 0;

                        // Ensure SKU uniqueness
                        while (!isUnique && attempts < 5) {
                            const existing = await tx.productVariant.findUnique({
                                where: { sku }
                            });

                            if (!existing) {
                                isUnique = true;
                            } else {
                                // Append random 4-char suffix if SKU exists
                                const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                                sku = `${variant.sku}-${suffix}`;
                                attempts++;
                            }
                        }

                        // Fallback if still not unique
                        if (!isUnique) {
                            sku = `${variant.sku}-${Date.now()}`;
                        }

                        await tx.productVariant.create({
                            data: {
                                productId: product.id,
                                sku: sku,
                                price: new Prisma.Decimal(variant.price),
                                cost: new Prisma.Decimal(variant.cost || 0),
                                stock: variant.stock,
                                optionValues: {
                                    connect: optionValueIds.map(id => ({ id }))
                                }
                            }
                        });
                    }
                }
            }

            return product;
        });

        // Log audit trail
        await logCrudAudit({
            tenantId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE",
            resource: "PRODUCT",
            resourceId: result.id,
            after: {
                name: result.name,
                hasVariants: hasVariants,
                categoryId: result.categoryId
            },
            request: req
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error creating product:", error);
        // Return more detailed error for debugging
        return NextResponse.json({
            error: "Failed to create product",
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

// Helper function to generate all combinations of option values
function generateCombinations(options: { name: string; values: string[] }[]): Array<{ optionName: string; valueName: string }[]> {
    if (options.length === 0) return [];

    let combinations: Array<{ optionName: string; valueName: string }[]> = [[]];

    for (const option of options) {
        const newCombinations: Array<{ optionName: string; valueName: string }[]> = [];
        for (const combo of combinations) {
            for (const value of option.values) {
                newCombinations.push([...combo, { optionName: option.name, valueName: value }]);
            }
        }
        combinations = newCombinations;
    }

    return combinations;
}

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user and tenant
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { tenantId } = authResult.user;

        // Pagination parameters
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);
        const search = searchParams.get('search');
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
            tenantId,
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } }
                ]
            } : {})
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    minStock: true,
                    categoryId: true,
                    tenantId: true,
                    createdAt: true,
                    options: {
                        select: {
                            id: true,
                            name: true,
                            values: {
                                select: {
                                    id: true,
                                    value: true
                                }
                            }
                        }
                    },
                    variants: {
                        select: {
                            id: true,
                            sku: true,
                            price: true,
                            stock: true,
                            optionValues: {
                                select: {
                                    id: true,
                                    value: true,
                                    option: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.product.count({ where })
        ]);

        return NextResponse.json({ products, total, page, limit });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
