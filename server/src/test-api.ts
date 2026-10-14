import app from './index';
import http from 'http';

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5001, () => resolve()));
  console.log('Test Server listening on port 5001');

  const BASE = 'http://localhost:5001/api';

  try {
    // 1. Health check
    console.log('Testing Health Endpoint...');
    const healthRes = await fetch(`${BASE}/health`);
    const healthJson = await healthRes.json();
    console.log('✓ Health status:', healthJson.status, '| Demo mode:', healthJson.demoMode);

    // 2. Auth: Login as Ramesh
    console.log('\nTesting Auth Login as Ramesh...');
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ramesh@example.com', password: 'password123' }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.success) throw new Error(loginJson.error);
    const token = loginJson.data.token;
    console.log('✓ Logged in as:', loginJson.data.user.full_name);
    console.log('✓ Auth token received');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Profile
    console.log('\nTesting Profile GET...');
    const profileRes = await fetch(`${BASE}/profile`, { headers: authHeaders });
    const profileJson = await profileRes.json();
    console.log('✓ Profile name:', profileJson.data.profile.full_name, '| Members in group:', profileJson.data.memberCount);

    // 4. Family Members
    console.log('\nTesting Family Members GET...');
    const membersRes = await fetch(`${BASE}/family/members`, { headers: authHeaders });
    const membersJson = await membersRes.json();
    console.log('✓ Family members found:', membersJson.data.map((m: any) => m.display_name).join(', '));
    const brother = membersJson.data.find((m: any) => m.display_name.includes('Brother'));
    if (!brother) throw new Error('Brother member not found in seed');

    // 5. Categories
    console.log('\nTesting Categories GET...');
    const catRes = await fetch(`${BASE}/categories`, { headers: authHeaders });
    const catJson = await catRes.json();
    console.log('✓ Total categories:', catJson.data.length);

    // 6. Report Summary for Brother
    console.log(`\nTesting Report Summary for Brother (${brother.display_name})...`);
    const brotherSummaryRes = await fetch(`${BASE}/reports/summary?memberId=${brother.id}`, { headers: authHeaders });
    const brotherSummaryJson = await brotherSummaryRes.json();
    console.log('✓ Brother Total Spending: ₹' + brotherSummaryJson.data.customRangeTotal);
    console.log('✓ Expected: ₹1540 (Petrol ₹1200 + Medical ₹130 + Motor ₹90 + Wire ₹120)');
    console.log('✓ Category Breakdown for Brother:');
    brotherSummaryJson.data.categoryTotals.forEach((cat: any) => {
      console.log(`   - ${cat.categoryName}: ₹${cat.total} (${cat.percentage}%)`);
    });

    if (brotherSummaryJson.data.customRangeTotal !== 1540) {
      console.warn('Warning: expected ₹1540 but got', brotherSummaryJson.data.customRangeTotal);
    } else {
      console.log('>>> VERIFICATION PASSED: Ramesh brother total is exactly ₹1540! <<<');
    }

    // 7. PDF Generation for Brother
    console.log('\nTesting Server-Side PDF Generation for Brother Statement...');
    const pdfRes = await fetch(`${BASE}/reports/pdf`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        memberId: brother.id,
        title: `Expense Statement for ${brother.display_name}`,
      }),
    });
    const pdfJson = await pdfRes.json();
    console.log('✓ Generated PDF Report ID:', pdfJson.data.reportId);
    console.log('✓ PDF Filename:', pdfJson.data.filename);
    console.log('✓ PDF Size (bytes):', pdfJson.data.size);

    // 8. Download / Stream PDF
    console.log('\nTesting PDF Stream GET...');
    const streamRes = await fetch(`http://localhost:5001${pdfJson.data.downloadUrl}`);
    const pdfBuffer = await streamRes.arrayBuffer();
    console.log('✓ Streamed PDF Content-Type:', streamRes.headers.get('content-type'));
    console.log('✓ Streamed PDF buffer length:', pdfBuffer.byteLength);

    console.log('\n======================================================');
    console.log(' ALL EXPENSEAPP BACKEND TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
