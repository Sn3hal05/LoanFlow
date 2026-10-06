const { GoogleGenerativeAI } = require('@google/generative-ai');

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * AI-powered full credit risk assessment for underwriters.
 * Analyzes applicant financial profile and documents, produces narrative risk report.
 */
const generateRiskAssessment = async (application, documents, notes, product) => {
  const client = getGeminiClient();
  if (!client) {
    return getFallbackRiskAssessment(application, product);
  }

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

---

Please provide a structured credit risk assessment report with the following sections:
1. **Risk Summary** (2-3 sentences: overall risk level: Low/Medium/High/Very High)
2. **Credit Profile Analysis** (evaluate FICO score, income stability, debt burden)
3. **Key Risk Factors** (bullet points of concerns and positives)
4. **DTI Analysis** (interpret the debt-to-income ratio in context)
5. **Recommendation** (Approve / Approve with Conditions / Decline, with reasoning)
6. **Suggested Conditions** (if applicable: collateral, guarantor, lower amount, shorter tenure)

Keep the tone professional, factual, and concise. Format clearly.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return {
      success: true,
      source: 'gemini-1.5-flash',
      report: text,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AI Risk Assessment Error]:', error.message);
    return getFallbackRiskAssessment(application, product);
  }
};

/**
 * AI-powered eligibility chatbot — applicants can ask about their loan chances.
 */
const chatAboutEligibility = async (message, applicationContext = null) => {
  const client = getGeminiClient();
  if (!client) {
    return {
      success: false,
      reply: "AI assistant is not configured. Please add a GEMINI_API_KEY to enable this feature.",
      source: 'fallback',
    };
  }

  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const contextStr = applicationContext
    ? `
## Current Application Context:
- Product: ${applicationContext.productName}
- Requested Amount: $${applicationContext.requestedAmount?.toLocaleString()}
- Credit Score: ${applicationContext.creditScore}
- Monthly Income: $${applicationContext.monthlyIncome?.toLocaleString()}
- Current DTI: ${applicationContext.dti}%
- Current Status: ${applicationContext.status}
`
    : '';

  const prompt = `
You are LoanFlow AI, a friendly and knowledgeable loan eligibility assistant. Help the applicant understand loan eligibility, the application process, required documents, and financial concepts. Be concise (3-4 sentences max), helpful, and professional.

${contextStr}

Applicant's Question: "${message}"

Answer helpfully and directly. If you don't know something specific to their institution, give general financial guidance.
`;

  try {
    const result = await model.generateContent(prompt);
    return {
      success: true,
      reply: result.response.text(),
      source: 'gemini-1.5-flash',
    };
  } catch (error) {
    console.error('[AI Chat Error]:', error.message);
    return {
      success: false,
      reply: "I'm having trouble connecting right now. Please try again in a moment.",
      source: 'fallback',
    };
  }
};

/**
 * AI-powered document review summary for loan officers.
 */
const generateDocumentSummary = async (application, documents) => {
  const client = getGeminiClient();
  if (!client) {
    return {
      success: false,
      summary: 'AI document summary requires GEMINI_API_KEY configuration.',
      source: 'fallback',
    };
  }

  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const docList = documents.map(
    (d) => `- ${d.title}: ${d.status}${d.verificationRemarks ? ` (Note: ${d.verificationRemarks})` : ''}`
  ).join('\n');

  const prompt = `
You are a loan document verification AI. Summarize the document compliance status for loan application ${application.applicationNumber}.

Documents Status:
${docList}

Applicant: ${application.applicantId?.name || 'Unknown'}
Product: ${application.loanProductId?.name || 'Unknown'}

Provide a brief 2-3 sentence professional summary of the document compliance state, flag any concerns, and state if the file is ready for underwriting review.
`;

  try {
    const result = await model.generateContent(prompt);
    return {
      success: true,
      summary: result.response.text(),
      source: 'gemini-1.5-flash',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      summary: 'Could not generate AI document summary at this time.',
      source: 'fallback',
    };
  }
};

/**
 * AI loan product recommender — suggests best product for a given financial profile.
 */
const recommendLoanProduct = async (profile, products) => {
  const client = getGeminiClient();
  if (!client) {
    return { success: false, recommendation: null };
  }

  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const productsStr = products.map(
    (p) => `- ${p.name}: Min Score ${p.minCreditScore}, Min Income $${p.minMonthlyIncome}, Max DTI ${p.maxDtiRatio}%, Rate ${p.baseInterestRate}%, Amount $${p.minAmount.toLocaleString()}-$${p.maxAmount.toLocaleString()}`
  ).join('\n');

  const prompt = `
You are a loan product recommendation AI. Based on the applicant profile below, recommend the SINGLE best loan product and briefly explain why (2-3 sentences).

Applicant Profile:
- Credit Score: ${profile.creditScore}
- Monthly Income: $${profile.monthlyIncome?.toLocaleString()}
- Existing Monthly Debt: $${profile.existingMonthlyDebt?.toLocaleString()}
- Desired Loan Amount: $${profile.desiredAmount?.toLocaleString()}
- Loan Purpose: ${profile.purpose || 'Not specified'}

Available Products:
${productsStr}

Respond in JSON format: { "productName": "...", "rationale": "...", "estimatedEligibility": "High/Medium/Low" }
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);
    return { success: true, recommendation: parsed, source: 'gemini-1.5-flash' };
  } catch (error) {
    return { success: false, recommendation: null };
  }
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

  if (score < minScore) { riskLevel = 'High'; concerns.push(`Credit score (${score}) below minimum threshold (${minScore})`); }
  else if (score < minScore + 50) { riskLevel = 'Medium'; }
  else { positives.push(`Strong credit score of ${score}`); }

  if (dti > maxDti) { riskLevel = 'Very High'; concerns.push(`DTI ratio (${dti}%) exceeds maximum policy ceiling (${maxDti}%)`); }
  else if (dti > maxDti - 10) { if (riskLevel === 'Low') riskLevel = 'Medium'; concerns.push(`DTI ratio (${dti}%) approaching policy ceiling (${maxDti}%)`); }
  else { positives.push(`Healthy DTI ratio of ${dti}%`); }

  const disposableIncome = (application.monthlyIncome || 0) - (application.existingMonthlyDebt || 0) - (application.estimatedEmi || 0);
  if (disposableIncome > 2000) positives.push(`Adequate disposable income of $${disposableIncome.toFixed(0)}/mo after EMI`);

  const recommendation = riskLevel === 'Low' ? 'APPROVE' : riskLevel === 'Medium' ? 'APPROVE WITH CONDITIONS' : 'DECLINE';

  return {
    success: true,
    source: 'rule-based-fallback',
    report: `## Risk Assessment Summary\n**Risk Level: ${riskLevel}**\n\nThis assessment is rule-based (AI not configured).\n\n**Positives:**\n${positives.map(p => `- ${p}`).join('\n') || '- None identified'}\n\n**Concerns:**\n${concerns.map(c => `- ${c}`).join('\n') || '- None identified'}\n\n**Recommendation: ${recommendation}**`,
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
