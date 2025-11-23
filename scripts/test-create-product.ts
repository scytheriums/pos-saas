async function main() {
    const product = {
        name: "Test Shirt",
        description: "A test shirt with variants",
        price: 29.99,
        hasVariants: true,
        options: [
            { name: "Size", values: ["S", "M"] },
            { name: "Color", values: ["Red", "Blue"] }
        ],
        variants: [
            {
                sku: "SHIRT-RED-S",
                barcode: "111111",
                price: 29.99,
                stock: 10,
                options: { "Size": "S", "Color": "Red" }
            },
            {
                sku: "SHIRT-BLUE-M",
                barcode: "222222",
                price: 30.99,
                stock: 5,
                options: { "Size": "M", "Color": "Blue" }
            }
        ]
    };

    try {
        const response = await fetch("http://localhost:3001/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        console.log("Product Created Successfully:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error creating product:", error);
        process.exit(1);
    }
}

main();
