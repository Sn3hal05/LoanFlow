const API_BASE = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('\n--- STARTING AUTOMATED LOAN API & EDGE CASE TESTS ---\n');

  try {
    // 1. Login as Applicant
    const applicantLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'applicant.sarah@demo.com',
        password: 'password123',
      }),
    });
    console.log('✓ 1. Applicant Login Successful:', applicantLogin.data.name, `(${applicantLogin.data.role})`);
    const applicantToken = applicantLogin.data.token;

    // 2. Login as Loan Officer
    const officerLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'officer.marcus@bank.com',
        password: 'password123',
      }),
    });
    console.log('✓ 2. Loan Officer Login Successful:', officerLogin.data.name, `(${officerLogin.data.role})`);
    const officerToken = officerLogin.data.token;

    // 3. Login as Approver
    const approverLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'approver.elena@bank.com',
        password: 'password123',
      }),
    });
    console.log('✓ 3. Approver Login Successful:', approverLogin.data.name, `(${approverLogin.data.role})`);
    const approverToken = approverLogin.data.token;

    // Fetch products
    const productsRes = await req('/products');
    const personalProduct = productsRes.data.find((p) => p.name === 'Express Personal Loan');
    console.log('✓ 4. Fetched Products, target:', personalProduct.name);

    // 5. Test Edge Case 1: Duplicate Active Application
    console.log('\nTesting Edge Case 1: Duplicate Active Application check...');
    const duplicateRes = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: JSON.stringify({
        loanProductId: personalProduct._id,
        requestedAmount: 10000,
        requestedTenureMonths: 24,
        monthlyIncome: 6200,
        existingMonthlyDebt: 450,
        creditScore: 740,
      }),
    });
    if (duplicateRes.status === 409) {
      console.log('✓ PASSED: Duplicate active application blocked with HTTP 409:', duplicateRes.data.message);
    } else {
      throw new Error(`Expected 409 Conflict, received status ${duplicateRes.status}`);
    }

    // 6. Test Edge Case 2: Ineligible Applicant (Low Credit Score) Auto-Rejection
    console.log('\nTesting Edge Case 2: Ineligible Applicant Auto-Rejection...');
    const lowScoreEmail = `test.lowcredit.${Date.now()}@demo.com`;
    const regRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bad Credit Test User',
        email: lowScoreEmail,
        password: 'password123',
        creditScore: 520, // Below 650
        monthlyIncome: 3000,
        existingMonthlyDebt: 400,
      }),
    });
    const lowUserToken = regRes.data.token;

    const autoRejectAppRes = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lowUserToken}` },
      body: JSON.stringify({
        loanProductId: personalProduct._id,
        requestedAmount: 5000,
        requestedTenureMonths: 24,
        monthlyIncome: 3000,
        existingMonthlyDebt: 400,
        creditScore: 520,
      }),
    });
    const autoRejectedApp = autoRejectAppRes.data.application;
    if (
      autoRejectedApp.status === 'Rejected' &&
      autoRejectedApp.rejectionReason === 'LOW_CREDIT_SCORE'
    ) {
      console.log(
        '✓ PASSED: Ineligible submission immediately auto-rejected! Status:',
        autoRejectedApp.status,
        '| Reason:',
        autoRejectedApp.rejectionReason,
        '| Remarks:',
        autoRejectedApp.rejectionRemarks
      );
    } else {
      throw new Error('Auto-rejection failed');
    }

    // 7. Test Edge Case 3: Approver tries to approve an application with documents still pending
    console.log('\nTesting Edge Case 3: Approver blocked from approving while docs are pending...');
    const appsRes = await req('/applications', {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    const docPendingApp = appsRes.data.find((a) => a.applicationNumber === 'LN-2026-0002');

    const invalidApproveRes = await req(`/underwriting/${docPendingApp._id}/decision`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
      body: JSON.stringify({
        decision: 'APPROVED',
        approvedAmount: 400000,
        approvedTenureMonths: 360,
        approvedInterestRate: 6.8,
      }),
    });
    if (invalidApproveRes.status === 400) {
      console.log('✓ PASSED: Approver blocked from approving with pending docs:', invalidApproveRes.data.message);
    } else {
      throw new Error(`Expected 400 Bad Request, received status ${invalidApproveRes.status}`);
    }

    // 8. Test Terms Acceptance & Fund Disbursement Flow
    console.log('\nTesting End-to-End: Terms Acceptance & Disbursement flow...');
    const approvedApp = appsRes.data.find((a) => a.applicationNumber === 'LN-2026-0008');

    // Login as Laura Bennett
    const lauraLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'applicant.laura@demo.com',
        password: 'password123',
      }),
    });
    const lauraToken = lauraLogin.data.token;

    // Laura accepts approved terms
    const acceptRes = await req(`/applications/${approvedApp._id}/accept-terms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${lauraToken}` },
    });
    console.log('✓ Applicant accepted terms. Status is now:', acceptRes.data.application.status);

    // Approver executes disbursement
    const disbRes = await req(`/disbursement/${approvedApp._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
      body: JSON.stringify({
        bankAccountNumber: '9843920192',
        bankName: 'JPMorgan Chase Bank',
        bankIfsc: 'CHASUS33',
        paymentMethod: 'ACH',
        notes: 'Disbursement authorized under verified mortgage terms.',
      }),
    });
    console.log(
      '✓ Disbursement completed. Transaction Ref:',
      disbRes.data.disbursement.transactionReference,
      '| First EMI Date:',
      disbRes.data.disbursement.firstEmiDate,
      '| Status is now:',
      disbRes.data.application.status
    );

    console.log('\n✓✓✓ ALL BACKEND AND WORKFLOW STATE MACHINE TESTS PASSED! ✓✓✓\n');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
