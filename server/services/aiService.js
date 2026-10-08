const { GoogleGenerativeAI } = require('@google/generative-ai');

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Intelligent Rule-based Knowledge Base for LoanFlow Assistant.
 * Provides instant, reliable, and contextual responses when external network / API is unavailable.
 */
const getIntelligentChatReply = (message, applicationContext = null) => {
  const msg = (message || '').toLowerCase();

  // 1. Document Queries
  if (msg.includes('document') || msg.includes('doc') || msg.includes('upload') || msg.includes('proof') || msg.includes('paper')) {
    if (msg.includes('home') || applicationContext?.productName?.toLowerCase().includes('home')) {
      return "For a **Prime Home Loan**, you will need: \n1. Government Photo ID (Passport/Driver's License)\n2. 2 Years Tax Returns & W-2s\n3. Current Address Proof (Utility Bill)\n4. Property Sale Agreement & Title Deeds\n5. Certified Property Valuation Report.";
    }
    if (msg.includes('auto') || msg.includes('vehicle') || msg.includes('car') || applicationContext?.productName?.toLowerCase().includes('auto')) {
      return "For a **DriveEasy Auto Loan**, required documents include: \n1. Valid Driver's License\n2. Recent 3-Month Paystubs\n3. Dealer Proforma Invoice / Quotation\n4. Comprehensive Vehicle Insurance Pre-Approval.";
    }
    return "Required documents vary by loan type:\n• **Personal Loan**: Govt ID, 2 Months Paystubs, Bank Statements, Address Proof.\n• **Home Loan**: Govt ID, 2 Years Tax Returns, Property Deeds, Valuation Report.\n• **Auto Loan**: Driver's License, Paystubs, Dealer Invoice, Insurance Pre-approval.";
  }

  // 2. EMI & Interest Calculation Queries
  if (msg.includes('emi') || msg.includes('interest') || msg.includes('calculate') || msg.includes('monthly payment') || msg.includes('formula') || msg.includes('rate')) {
    if (applicationContext?.requestedAmount && applicationContext?.productName) {
      return `For your **${applicationContext.productName}** enquiry of **$${applicationContext.requestedAmount?.toLocaleString()}**, EMI is computed using the reducing balance formula: [P × r × (1+r)^n] / [(1+r)^n - 1]. You can review your exact monthly installment in the loan details overview.`;
    }
    return "Monthly EMI is calculated using standard banking reducing-balance amortization: **EMI = [P × r × (1+r)^n] / [(1+r)^n - 1]**, where *P* is Principal loan amount, *r* is monthly interest rate (APR / 12 / 100), and *n* is tenure in months.";
  }

  // 3. Rejection / Ineligibility Queries
  if (msg.includes('reject') || msg.includes('denied') || msg.includes('ineligible') || msg.includes('fail') || msg.includes('why')) {
    return "Loans may be declined due to fixed policy reasons:\n1. **Low Credit Score**: Below minimum product threshold (e.g. <650 for Personal, <720 for Home).\n2. **High Debt-To-Income (DTI)**: Total debt obligations exceed product ceiling (40%-50%).\n3. **Insufficient Income**: Monthly income below required threshold.\n4. **Incomplete Documents**: Missing mandatory documentation during verification.";
  }

  // 4. Status / Timeline Queries
  if (msg.includes('status') || msg.includes('stage') || msg.includes('track') || msg.includes('progress') || msg.includes('process') || msg.includes('step')) {
    if (applicationContext) {
      return `Your current application for **${applicationContext.productName}** is in the **"${applicationContext.status}"** stage. You can check the visual 7-step timeline on your dashboard for live milestone updates.`;
    }
    return "The LoanFlow lifecycle moves through 7 key stages: \n1. Enquiry Submitted ➔ 2. Documents Upload ➔ 3. Officer Verification ➔ 4. Underwriting Review ➔ 5. Sanction Decision ➔ 6. Terms Acceptance ➔ 7. Fund Disbursement.";
  }

  // 5. Credit Score / DTI Queries
  if (msg.includes('credit score') || msg.includes('fico') || msg.includes('score') || msg.includes('dti')) {
    return "• **Credit Score Requirements**: Express Personal (min 650), DriveEasy Auto (min 680), Prime Home (min 720).\n• **DTI Ratio**: We recommend keeping your existing debt plus proposed loan EMI under 40%-45% of your gross monthly income.";
  }

  // 6. Disbursement & Approval Queries
  if (msg.includes('disburse') || msg.includes('payout') || msg.includes('receive') || msg.includes('fund') || msg.includes('bank')) {
    return "Once your application is approved by the Underwriter and you accept the sanctioned terms, our Approver executes fund settlement. Funds are credited to your bank account with an official disbursement voucher and first EMI due schedule.";
  }

  // 7. General / Default Helpful Guidance
  if (applicationContext) {
    return `Hello! I'm tracking your **${applicationContext.productName || 'Loan'}** application (#${applicationContext.status || 'Active'}). You can ask me about required documents, EMI calculation, eligibility rules, or how to accept your loan terms.`;
  }
  return "Hello! I'm **LoanFlow AI**, your loan assistant. Ask me anything about our loan products (Personal, Home, Auto), required verification documents, EMI formulas, or approval guidelines!";
};

/**
 * AI-powered full credit risk assessment for underwriters.
 * Analyzes applicant financial profile and documents, produces narrative risk report.
 */
const generateRiskAssessment = async (application, documents, notes, product) => {
  const client = getGeminiClient();
  if (client) {
    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const verifiedDocs = documents.filter((d) => d.status === 'VERIFIED').length;
      const totalDocs = documents.length;

      const prompt = `
You are an expert credit underwriter AI assistant at a financial institution. Analyze the following loan application and provide a professional credit risk assessment report.

## Loan Application Data:
- Application Number: ${application.applicationNumber}
- Loan Product: ${product?.name || 'Unknown'} (${product?.category || 'N/A'} Loan)
- Requested Amount: $${application.requestedAmount?.toLocaleString()}
- Requested Tenure: ${application.requestedTenureMonths} months
- Estimated Monthly EMI: $${application.estimatedEmi?.toLocaleString()}

## Applicant Financial Profile:
- Monthly Gross Income: $${application.monthlyIncome?.toLocaleString()}
- Existing Monthly Debt Obligations: $${application.existingMonthlyDebt?.toLocaleString()}
- FICO Credit Score: ${application.creditScore} / 850
- Calculated Debt-to-Income (DTI) Ratio: ${application.calculatedDtiRatio}%
- Algorithmic Eligibility Result: ${application.eligibilityStatus}

## Product Eligibility Thresholds:
- Minimum Credit Score Required: ${product?.minCreditScore || 650}
- Maximum DTI Ceiling: ${product?.maxDtiRatio || 45}%
- Minimum Monthly Income Required: $${product?.minMonthlyIncome?.toLocaleString() || '2,500'}
- Base Interest Rate: ${product?.baseInterestRate || 'N/A'}%

## Document Compliance:
- Documents Verified: ${verifiedDocs} / ${totalDocs}
- All Mandatory Docs Verified: ${verifiedDocs === totalDocs ? 'YES' : 'NO'}

## Loan Officer Notes:
${notes?.length > 0 ? notes.map((n) => `- ${n.authorName} (${n.recommendation}): "${n.remarks}"`).join('\n') : 'No officer notes recorded.'}

Provide a structured credit risk report: Risk Summary, Credit Analysis, Key Factors, Recommendation, and Suggested Terms.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return {
        success: true,
        source: 'gemini-1.5-flash',
        report: text,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('[AI Risk Assessment Gemini Fallback]:', error.message);
    }
  }

  return getFallbackRiskAssessment(application, product);
};

/**
 * AI-powered eligibility chatbot — applicants can ask about their loan chances.
 */
const chatAboutEligibility = async (message, applicationContext = null) => {
  const client = getGeminiClient();
  if (client) {
    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const contextStr = applicationContext
        ? `\n## Application Context:\n- Product: ${applicationContext.productName}\n- Amount: $${applicationContext.requestedAmount?.toLocaleString()}\n- Score: ${applicationContext.creditScore}\n- Income: $${applicationContext.monthlyIncome?.toLocaleString()}\n- DTI: ${applicationContext.dti}%\n- Status: ${applicationContext.status}\n`
        : '';

      const prompt = `You are LoanFlow AI, an intelligent, helpful loan assistant. Answer concisely and professionally (2-4 sentences max).\n${contextStr}\nQuestion: "${message}"`;
      const result = await model.generateContent(prompt);
      return {
        success: true,
        reply: result.response.text(),
        source: 'gemini-1.5-flash',
      };
    } catch (error) {
      console.warn('[AI Chat Gemini Fallback]:', error.message);
    }
  }

  // Robust contextual fallback logic ensures 100% reliability
  const fallbackReply = getIntelligentChatReply(message, applicationContext);
  return {
    success: true,
    reply: fallbackReply,
    source: 'loanflow-assistant',
  };
};

/**
 * AI-powered document review summary for loan officers.
 */
const generateDocumentSummary = async (application, documents) => {
  const client = getGeminiClient();
  if (client) {
    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const docList = documents
        .map((d) => `- ${d.title}: ${d.status}${d.verificationRemarks ? ` (${d.verificationRemarks})` : ''}`)
        .join('\n');

      const prompt = `Summarize document verification compliance for application ${application.applicationNumber}.\n${docList}`;
      const result = await model.generateContent(prompt);
      return {
        success: true,
        summary: result.response.text(),
        source: 'gemini-1.5-flash',
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[Doc Summary Fallback]:', err.message);
    }
  }

  const verified = documents.filter((d) => d.status === 'VERIFIED').length;
  const total = documents.length;
  return {
    success: true,
    summary: `${verified} of ${total} mandatory documents have been reviewed and verified. ${verified === total ? 'File is ready for underwriting sanction.' : 'Pending document submissions required.'}`,
    source: 'rule-based-summary',
    generatedAt: new Date().toISOString(),
  };
};

/**
 * AI loan product recommender — suggests best product for a given financial profile.
 */
const recommendLoanProduct = async (profile, products) => {
  const client = getGeminiClient();
  if (client) {
    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const productsStr = products
        .map((p) => `- ${p.name}: Min Score ${p.minCreditScore}, Min Income $${p.minMonthlyIncome}, Max DTI ${p.maxDtiRatio}%`)
        .join('\n');

      const prompt = `Recommend 1 best loan product for: Score ${profile.creditScore}, Income $${profile.monthlyIncome}, Debt $${profile.existingMonthlyDebt}, Amount $${profile.desiredAmount}. Available:\n${productsStr}\nRespond in JSON: {"productName": "...", "rationale": "...", "estimatedEligibility": "High/Medium/Low"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);
      return { success: true, recommendation: parsed, source: 'gemini-1.5-flash' };
    } catch (err) {
      console.warn('[AI Rec Fallback]:', err.message);
    }
  }

  // Deterministic recommendation fallback
  let selected = products[0];
  if (profile.desiredAmount > 50000 && profile.creditScore >= 720) {
    const home = products.find((p) => p.category === 'Home');
    if (home) selected = home;
  } else if (profile.desiredAmount >= 10000 && profile.creditScore >= 680) {
    const auto = products.find((p) => p.category === 'Vehicle');
    if (auto) selected = auto;
  }

  return {
    success: true,
    recommendation: {
      productName: selected.name,
      rationale: `Matched based on credit score (${profile.creditScore}) and requested loan volume ($${profile.desiredAmount?.toLocaleString() || '15,000'}).`,
      estimatedEligibility: profile.creditScore >= selected.minCreditScore ? 'High' : 'Moderate',
    },
    source: 'rule-based-recommender',
  };
};

/**
 * Fallback deterministic risk assessment when AI is not available.
 */
const getFallbackRiskAssessment = (application, product) => {
  const score = application.creditScore || 0;
  const dti = application.calculatedDtiRatio || 0;
  const maxDti = product?.maxDtiRatio || 45;
  const minScore = product?.minCreditScore || 650;

  let riskLevel = 'Low';
  let concerns = [];
  let positives = [];

  if (score < minScore) {
    riskLevel = 'High';
    concerns.push(`Credit score (${score}) below minimum threshold (${minScore})`);
  } else if (score < minScore + 50) {
    riskLevel = 'Medium';
  } else {
    positives.push(`Strong credit score of ${score}`);
  }

  if (dti > maxDti) {
    riskLevel = 'Very High';
    concerns.push(`DTI ratio (${dti}%) exceeds maximum policy ceiling (${maxDti}%)`);
  } else if (dti > maxDti - 10) {
    if (riskLevel === 'Low') riskLevel = 'Medium';
    concerns.push(`DTI ratio (${dti}%) approaching policy ceiling (${maxDti}%)`);
  } else {
    positives.push(`Healthy DTI ratio of ${dti}%`);
  }

  const disposableIncome =
    (application.monthlyIncome || 0) -
    (application.existingMonthlyDebt || 0) -
    (application.estimatedEmi || 0);
  if (disposableIncome > 2000) {
    positives.push(`Adequate disposable income of $${disposableIncome.toFixed(0)}/mo after proposed EMI`);
  }

  const recommendation =
    riskLevel === 'Low' ? 'APPROVE' : riskLevel === 'Medium' ? 'APPROVE WITH CONDITIONS' : 'DECLINE';

  return {
    success: true,
    source: 'rule-based-fallback',
    report: `## Risk Assessment Summary\n**Risk Level: ${riskLevel}**\n\n**Positives:**\n${positives.map((p) => `- ${p}`).join('\n') || '- None identified'}\n\n**Concerns:**\n${concerns.map((c) => `- ${c}`).join('\n') || '- None identified'}\n\n**Recommendation: ${recommendation}**`,
    riskLevel,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  generateRiskAssessment,
  chatAboutEligibility,
  generateDocumentSummary,
  recommendLoanProduct,
};
