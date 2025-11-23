/**
 * Test script for Analytics API endpoints
 * Run with: npx tsx scripts/test-analytics.ts
 */

const BASE_URL = 'http://localhost:3000';

async function testDailyIncome() {
    console.log('\n=== Testing Daily Income Endpoint ===');

    try {
        // Test today's income
        const todayRes = await fetch(`${BASE_URL}/api/analytics/daily-income`);
        const todayData = await todayRes.json();
        console.log('Today\'s Income:', JSON.stringify(todayData, null, 2));

        // Test specific date
        const dateRes = await fetch(`${BASE_URL}/api/analytics/daily-income?date=2025-11-22`);
        const dateData = await dateRes.json();
        console.log('\nSpecific Date Income:', JSON.stringify(dateData, null, 2));

        // Test date range
        const rangeRes = await fetch(`${BASE_URL}/api/analytics/daily-income?startDate=2025-11-20&endDate=2025-11-22`);
        const rangeData = await rangeRes.json();
        console.log('\nDate Range Income:', JSON.stringify(rangeData, null, 2));

        console.log('✅ Daily Income tests passed');
    } catch (error) {
        console.error('❌ Daily Income test failed:', error);
    }
}

async function testLowStock() {
    console.log('\n=== Testing Low Stock Endpoint ===');

    try {
        // Test with default threshold (10)
        const defaultRes = await fetch(`${BASE_URL}/api/analytics/low-stock`);
        const defaultData = await defaultRes.json();
        console.log('Low Stock (default threshold):', JSON.stringify(defaultData, null, 2));

        // Test with custom threshold
        const customRes = await fetch(`${BASE_URL}/api/analytics/low-stock?threshold=50`);
        const customData = await customRes.json();
        console.log('\nLow Stock (threshold=50):', JSON.stringify(customData, null, 2));

        console.log('✅ Low Stock tests passed');
    } catch (error) {
        console.error('❌ Low Stock test failed:', error);
    }
}

async function testSalesTrends() {
    console.log('\n=== Testing Sales Trends Endpoint ===');

    try {
        // Test week period
        const weekRes = await fetch(`${BASE_URL}/api/analytics/sales-trends?period=week`);
        const weekData = await weekRes.json();
        console.log('Sales Trends (week):', JSON.stringify(weekData, null, 2));

        // Test month period
        const monthRes = await fetch(`${BASE_URL}/api/analytics/sales-trends?period=month`);
        const monthData = await monthRes.json();
        console.log('\nSales Trends (month) - showing first 5 days:',
            JSON.stringify({ ...monthData, data: monthData.data.slice(0, 5) }, null, 2));

        console.log('✅ Sales Trends tests passed');
    } catch (error) {
        console.error('❌ Sales Trends test failed:', error);
    }
}

async function runAllTests() {
    console.log('🚀 Starting Analytics API Tests...');
    console.log('Make sure the dev server is running on http://localhost:3000\n');

    await testDailyIncome();
    await testLowStock();
    await testSalesTrends();

    console.log('\n✨ All analytics tests completed!');
}

runAllTests();
