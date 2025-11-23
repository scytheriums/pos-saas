async function debugProduct() {
    try {
        const response = await fetch("http://localhost:3000/api/products");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        const productWithVariants = products.find((p: any) => p.variants && p.variants.length > 0);

        if (productWithVariants) {
            console.log("Product:", productWithVariants.name);
            console.log("Options:", JSON.stringify(productWithVariants.options, null, 2));
            console.log("First Variant:", JSON.stringify(productWithVariants.variants[0], null, 2));

            // Check IDs
            const optionValueId = productWithVariants.options[0].values[0].id;
            const variantOptionValueId = productWithVariants.variants[0].optionValues[0]?.id;

            console.log("Option Value ID from Options:", optionValueId);
            console.log("Option Value ID from Variant:", variantOptionValueId);
        } else {
            console.log("No products with variants found.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

debugProduct();
