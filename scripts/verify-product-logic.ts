import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const body = {
        name: "Logic Test Shirt",
        description: "Testing logic directly",
        price: 29.99,
        hasVariants: true,
        options: [
            { name: "Size", values: ["S", "M"] },
            { name: "Color", values: ["Red", "Blue"] }
        ],
        variants: [
            {
                sku: "LOGIC-RED-S",
                barcode: "LOGIC1",
                price: 29.99,
                stock: 10,
                options: { "Size": "S", "Color": "Red" }
            }
        ],
        tenantId: "default-tenant"
    };

    const activeTenantId = body.tenantId;

    console.log("Starting transaction...");

    const result = await prisma.$transaction(async (tx) => {
        // 1. Create Base Product
        const product = await tx.product.create({
            data: {
                name: body.name,
                description: body.description,
                minStock: 10,
                // hasVariants removed as not in schema
                tenantId: activeTenantId,
            },
        });
        console.log("Product created:", product.id);

        if (body.options && body.options.length > 0) {
            // 2. Create Options & Values
            const optionMaps = [];

            for (const opt of body.options) {
                const createdOption = await tx.productOption.create({
                    data: {
                        productId: product.id,
                        name: opt.name,
                    },
                });

                const valueMap = new Map<string, string>();

                for (const val of opt.values) {
                    const createdValue = await tx.productOptionValue.create({
                        data: {
                            optionId: createdOption.id,
                            value: val,
                        },
                    });
                    valueMap.set(val, createdValue.id);
                }

                optionMaps.push({ name: opt.name, values: valueMap });
            }

            // 3. Create Variants
            if (body.variants && body.variants.length > 0) {
                for (const variant of body.variants) {
                    const valueIds: string[] = [];

                    for (const [optName, optValue] of Object.entries(variant.options)) {
                        const optMap = optionMaps.find(o => o.name === optName);
                        if (optMap) {
                            const valId = optMap.values.get(optValue as string);
                            if (valId) {
                                valueIds.push(valId);
                            }
                        }
                    }

                    await tx.productVariant.create({
                        data: {
                            productId: product.id,
                            sku: variant.sku,
                            barcode: variant.barcode,
                            price: new Prisma.Decimal(variant.price),
                            stock: variant.stock,
                            optionValues: {
                                connect: valueIds.map(id => ({ id }))
                            }
                        }
                    });
                }
            }
        }

        return product;
    });

    console.log("Transaction successful:", result);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
