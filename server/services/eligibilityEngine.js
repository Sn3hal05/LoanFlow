/**
 * Calculates monthly EMI based on reducing balance method:
 * P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
function calculateEmi(principal, annualInterestRate, tenureMonths) {
  if (!principal || !tenureMonths) return 0;
  if (!annualInterestRate || annualInterestRate <= 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Calculates Debt-to-Income (DTI) ratio percentage:
 * ((existingMonthlyDebt + proposedEmi) / monthlyIncome) * 100
 */
function calculateDti(monthlyIncome, existingMonthlyDebt, proposedEmi) {
  if (!monthlyIncome || monthlyIncome <= 0) return 100;
  const totalDebtObligation = (existingMonthlyDebt || 0) + (proposedEmi || 0);
  const dti = (totalDebtObligation / monthlyIncome) * 100;
  return Math.round(dti * 10) / 10;
}

/**
 * Evaluates applicant data against LoanProduct eligibility parameters.
 * Returns { isEligible, rejectionReason, remarks, emi, dti }
 */
function evaluateEligibility(product, applicationData) {
  const {
    requestedAmount,
    requestedTenureMonths,
    monthlyIncome,
    existingMonthlyDebt = 0,
    creditScore,
  } = applicationData;

  const remarks = [];
  let isEligible = true;
  let rejectionReason = null;

  // 1. Amount boundary check
  const amountPassed =
    requestedAmount >= product.minAmount && requestedAmount <= product.maxAmount;
  remarks.push({
    rule: 'LOAN_AMOUNT_RANGE',
    passed: amountPassed,
    message: amountPassed
      ? `Requested $${requestedAmount.toLocaleString()} is within range ($${product.minAmount.toLocaleString()} - $${product.maxAmount.toLocaleString()})`
      : `Requested $${requestedAmount.toLocaleString()} is outside allowed limit ($${product.minAmount.toLocaleString()} - $${product.maxAmount.toLocaleString()})`,
  });
  if (!amountPassed) {
    isEligible = false;
    rejectionReason = rejectionReason || 'INSUFFICIENT_INCOME';
  }

  // 2. Tenure boundary check
  const tenurePassed =
    requestedTenureMonths >= product.minTenureMonths &&
    requestedTenureMonths <= product.maxTenureMonths;
  remarks.push({
    rule: 'TENURE_RANGE',
    passed: tenurePassed,
    message: tenurePassed
      ? `Tenure of ${requestedTenureMonths} months is within range (${product.minTenureMonths} - ${product.maxTenureMonths} mo)`
      : `Tenure of ${requestedTenureMonths} months is outside allowed range (${product.minTenureMonths} - ${product.maxTenureMonths} mo)`,
  });
  if (!tenurePassed) {
    isEligible = false;
  }

  // 3. Minimum Income check
  const incomePassed = monthlyIncome >= product.minMonthlyIncome;
  remarks.push({
    rule: 'MIN_MONTHLY_INCOME',
    passed: incomePassed,
    message: incomePassed
      ? `Monthly income of $${monthlyIncome.toLocaleString()} satisfies minimum ($${product.minMonthlyIncome.toLocaleString()})`
      : `Monthly income of $${monthlyIncome.toLocaleString()} is below required minimum ($${product.minMonthlyIncome.toLocaleString()})`,
  });
  if (!incomePassed) {
    isEligible = false;
    rejectionReason = rejectionReason || 'INSUFFICIENT_INCOME';
  }

  // 4. Minimum Credit Score check
  const scorePassed = creditScore >= product.minCreditScore;
  remarks.push({
    rule: 'MIN_CREDIT_SCORE',
    passed: scorePassed,
    message: scorePassed
      ? `Credit score of ${creditScore} meets minimum requirement (${product.minCreditScore})`
      : `Credit score of ${creditScore} is below minimum threshold (${product.minCreditScore})`,
  });
  if (!scorePassed) {
    isEligible = false;
    rejectionReason = rejectionReason || 'LOW_CREDIT_SCORE';
  }

  // 5. Projected EMI & DTI check
  const projectedEmi = calculateEmi(
    requestedAmount,
    product.baseInterestRate,
    requestedTenureMonths
  );
  const calculatedDti = calculateDti(
    monthlyIncome,
    existingMonthlyDebt,
    projectedEmi
  );

  const dtiPassed = calculatedDti <= product.maxDtiRatio;
  remarks.push({
    rule: 'MAX_DTI_RATIO',
    passed: dtiPassed,
    message: dtiPassed
      ? `Calculated DTI of ${calculatedDti}% is within maximum ceiling of ${product.maxDtiRatio}%`
      : `Calculated DTI of ${calculatedDti}% exceeds maximum allowed ceiling of ${product.maxDtiRatio}% (Monthly EMI: $${projectedEmi})`,
  });
  if (!dtiPassed) {
    isEligible = false;
    rejectionReason = rejectionReason || 'HIGH_DEBT_TO_INCOME';
  }

  return {
    isEligible,
    rejectionReason: isEligible ? null : rejectionReason,
    remarks,
    emi: projectedEmi,
    dti: calculatedDti,
  };
}

module.exports = {
  calculateEmi,
  calculateDti,
  evaluateEligibility,
};
