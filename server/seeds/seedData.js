const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const LoanProduct = require('../models/LoanProduct');
const LoanApplication = require('../models/LoanApplication');
const ApplicationDocument = require('../models/ApplicationDocument');
const VerificationNote = require('../models/VerificationNote');
const ApprovalDecision = require('../models/ApprovalDecision');
const Disbursement = require('../models/Disbursement');
const { calculateEmi, calculateDti } = require('../services/eligibilityEngine');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/loan_tracker';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // 1. Clear existing data
    await Promise.all([
      User.deleteMany({}),
      LoanProduct.deleteMany({}),
      LoanApplication.deleteMany({}),
      ApplicationDocument.deleteMany({}),
      VerificationNote.deleteMany({}),
      ApprovalDecision.deleteMany({}),
      Disbursement.deleteMany({}),
    ]);
    console.log('[Seed] Cleared existing collections.');

    // 2. Create Staff Users
    const loanOfficer = await User.create({
      name: 'Marcus Vance',
      email: 'officer.marcus@bank.com',
      password: 'password123',
      role: 'loan_officer',
      phone: '+1 (555) 234-8901',
    });

    const approver = await User.create({
      name: 'Elena Rostova',
      email: 'approver.elena@bank.com',
      password: 'password123',
      role: 'approver',
      phone: '+1 (555) 876-5432',
    });

    // 3. Create Applicants
    const applicantsData = [
      { name: 'Sarah Jenkins', email: 'applicant.sarah@demo.com', phone: '+1 (555) 101-2001', creditScore: 740, monthlyIncome: 6200, existingMonthlyDebt: 450 },
      { name: 'Michael Chang', email: 'applicant.michael@demo.com', phone: '+1 (555) 101-2002', creditScore: 760, monthlyIncome: 8500, existingMonthlyDebt: 1200 },
      { name: 'Emily Rodriguez', email: 'applicant.emily@demo.com', phone: '+1 (555) 101-2003', creditScore: 710, monthlyIncome: 4200, existingMonthlyDebt: 300 },
      { name: 'David Kim', email: 'applicant.david@demo.com', phone: '+1 (555) 101-2004', creditScore: 730, monthlyIncome: 5800, existingMonthlyDebt: 600 },
      { name: 'Priya Sharma', email: 'applicant.priya@demo.com', phone: '+1 (555) 101-2005', creditScore: 780, monthlyIncome: 9800, existingMonthlyDebt: 800 },
      { name: 'James Wilson', email: 'applicant.james@demo.com', phone: '+1 (555) 101-2006', creditScore: 695, monthlyIncome: 4500, existingMonthlyDebt: 500 },
      { name: 'Marcus Cole', email: 'applicant.marcus@demo.com', phone: '+1 (555) 101-2007', creditScore: 670, monthlyIncome: 3900, existingMonthlyDebt: 750 },
      { name: 'Laura Bennett', email: 'applicant.laura@demo.com', phone: '+1 (555) 101-2008', creditScore: 750, monthlyIncome: 7200, existingMonthlyDebt: 650 },
      { name: 'Carlos Gomez', email: 'applicant.carlos@demo.com', phone: '+1 (555) 101-2009', creditScore: 705, monthlyIncome: 4800, existingMonthlyDebt: 400 },
      { name: 'Lisa Anderson', email: 'applicant.lisa@demo.com', phone: '+1 (555) 101-2010', creditScore: 740, monthlyIncome: 6000, existingMonthlyDebt: 350 },
      { name: 'Robert Taylor', email: 'applicant.robert@demo.com', phone: '+1 (555) 101-2011', creditScore: 580, monthlyIncome: 2800, existingMonthlyDebt: 1100 },
      { name: 'Angela Martinez', email: 'applicant.angela@demo.com', phone: '+1 (555) 101-2012', creditScore: 690, monthlyIncome: 3000, existingMonthlyDebt: 1800 },
    ];

    const applicants = [];
    for (const appData of applicantsData) {
      const u = await User.create({
        ...appData,
        password: 'password123',
        role: 'applicant',
      });
      applicants.push(u);
    }
    console.log(`[Seed] Created ${applicants.length} applicants, 1 officer, 1 approver.`);

    // 4. Create 3 Loan Products with distinct eligibility rules & checklists
    const personalLoanProduct = await LoanProduct.create({
      name: 'Express Personal Loan',
      category: 'Personal',
      description: 'Quick uncollateralized financing for personal expenses, medical emergencies, or debt consolidation.',
      minAmount: 2000,
      maxAmount: 50000,
      minTenureMonths: 6,
      maxTenureMonths: 60,
      baseInterestRate: 11.5,
      minMonthlyIncome: 2500,
      minCreditScore: 650,
      maxDtiRatio: 45,
      requiredDocuments: [
        { code: 'id_proof', label: 'Government ID / Passport', description: 'Clear photo of National ID or Passport', isMandatory: true },
        { code: 'income_proof', label: 'Recent Paystubs (Last 2 Months)', description: 'Official pay statements from employer', isMandatory: true },
        { code: 'address_proof', label: 'Proof of Address', description: 'Utility bill or lease agreement under applicant name', isMandatory: true },
        { code: 'bank_statement', label: 'Bank Statement (Last 6 Months)', description: 'Full monthly transaction history', isMandatory: true },
      ],
    });

    const homeLoanProduct = await LoanProduct.create({
      name: 'Prime Home Loan',
      category: 'Home',
      description: 'Competitive long-term mortgage financing for residential property acquisition or construction.',
      minAmount: 50000,
      maxAmount: 1000000,
      minTenureMonths: 60,
      maxTenureMonths: 360,
      baseInterestRate: 6.8,
      minMonthlyIncome: 5500,
      minCreditScore: 720,
      maxDtiRatio: 50,
      requiredDocuments: [
        { code: 'id_proof', label: 'Government ID / Passport', description: 'Certified copy of identification', isMandatory: true },
        { code: 'income_proof', label: '2 Years Tax Returns & W2s', description: 'Official IRS transcripts or tax returns', isMandatory: true },
        { code: 'address_proof', label: 'Current Address Proof', description: 'Utility or mortgage statement', isMandatory: true },
        { code: 'property_papers', label: 'Property Sale Agreement & Deeds', description: 'Signed purchase agreement & title search', isMandatory: true },
        { code: 'property_valuation', label: 'Property Valuation Certificate', description: 'Independent appraisal certificate', isMandatory: true },
      ],
    });

    const vehicleLoanProduct = await LoanProduct.create({
      name: 'DriveEasy Auto Loan',
      category: 'Vehicle',
      description: 'Low-rate auto financing for new and certified pre-owned passenger vehicles.',
      minAmount: 5000,
      maxAmount: 100000,
      minTenureMonths: 12,
      maxTenureMonths: 84,
      baseInterestRate: 8.2,
      minMonthlyIncome: 3200,
      minCreditScore: 680,
      maxDtiRatio: 40,
      requiredDocuments: [
        { code: 'id_proof', label: "Driver's License", description: 'Valid state driving license', isMandatory: true },
        { code: 'income_proof', label: 'Proof of Income', description: 'Recent 3 months salary slips or tax proof', isMandatory: true },
        { code: 'vehicle_quotation', label: 'Dealer Proforma Invoice', description: 'Official quotation with VIN and pricing breakdown', isMandatory: true },
        { code: 'insurance_proof', label: 'Auto Insurance Pre-Approval', description: 'Binder or quote from insurance carrier', isMandatory: true },
      ],
    });

    console.log('[Seed] Created 3 Loan Products with distinct eligibility thresholds.');

    // 5. Seed Applications Across All Stages

    // Helper to generate mock document docs
    const generateDocsForProduct = (appId, product, statusPattern = {}) => {
      return product.requiredDocuments.map((reqDoc) => {
        const docStatus = statusPattern[reqDoc.code] || 'PENDING';
        return {
          applicationId: appId,
          docCode: reqDoc.code,
          title: reqDoc.label,
          description: reqDoc.description,
          isMandatory: reqDoc.isMandatory,
          status: docStatus,
          fileUrl: docStatus !== 'PENDING' ? `/uploads/mock_${reqDoc.code}.pdf` : '',
          originalName: docStatus !== 'PENDING' ? `${reqDoc.code}_document.pdf` : '',
          mimeType: 'application/pdf',
          size: 1024 * 180,
          submittedAt: docStatus !== 'PENDING' ? new Date(Date.now() - 86400000 * 2) : null,
          verifiedAt: docStatus === 'VERIFIED' ? new Date(Date.now() - 86400000 * 1) : null,
          verifiedBy: docStatus === 'VERIFIED' ? loanOfficer._id : null,
          verificationRemarks: docStatus === 'VERIFIED' ? 'Verified against official databases.' : '',
        };
      });
    };

    // --- Application 1: Enquiry-Submitted ---
    {
      const appUser = applicants[0]; // Sarah Jenkins
      const emi = calculateEmi(15000, personalLoanProduct.baseInterestRate, 24);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0001',
        applicantId: appUser._id,
        loanProductId: personalLoanProduct._id,
        requestedAmount: 15000,
        requestedTenureMonths: 24,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Enquiry-Submitted',
        timeline: [
          {
            fromStatus: '',
            toStatus: 'Enquiry-Submitted',
            timestamp: new Date(Date.now() - 3600000 * 4),
            changedBy: appUser._id,
            changedByName: appUser.name,
            role: 'applicant',
            notes: 'Enquiry submitted online. Algorithmic eligibility passed.',
          },
        ],
      });
      await ApplicationDocument.insertMany(generateDocsForProduct(app._id, personalLoanProduct, {}));
    }

    // --- Application 2: Documents-Pending (Home Loan) ---
    {
      const appUser = applicants[1]; // Michael Chang
      const emi = calculateEmi(400000, homeLoanProduct.baseInterestRate, 360);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0002',
        applicantId: appUser._id,
        loanProductId: homeLoanProduct._id,
        requestedAmount: 400000,
        requestedTenureMonths: 360,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Documents-Pending',
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 3), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 3), changedByName: 'System', role: 'system', notes: 'Automated eligibility passed. Mandatory document checklist created.' },
        ],
      });
      // 2 submitted, 3 pending
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, homeLoanProduct, {
          id_proof: 'SUBMITTED',
          income_proof: 'SUBMITTED',
          address_proof: 'PENDING',
          property_papers: 'PENDING',
          property_valuation: 'PENDING',
        })
      );
    }

    // --- Application 3: Documents-Pending (Vehicle Loan) ---
    {
      const appUser = applicants[2]; // Emily Rodriguez
      const emi = calculateEmi(28000, vehicleLoanProduct.baseInterestRate, 48);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0003',
        applicantId: appUser._id,
        loanProductId: vehicleLoanProduct._id,
        requestedAmount: 28000,
        requestedTenureMonths: 48,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Documents-Pending',
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: 'System', role: 'system' },
        ],
      });
      // 3 submitted, 1 pending
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, vehicleLoanProduct, {
          id_proof: 'SUBMITTED',
          income_proof: 'SUBMITTED',
          vehicle_quotation: 'SUBMITTED',
          insurance_proof: 'PENDING',
        })
      );
    }

    // --- Application 4: Documents-Verified ---
    {
      const appUser = applicants[3]; // David Kim
      const emi = calculateEmi(12000, personalLoanProduct.baseInterestRate, 24);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0004',
        applicantId: appUser._id,
        loanProductId: personalLoanProduct._id,
        requestedAmount: 12000,
        requestedTenureMonths: 24,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Documents-Verified',
        assignedOfficerId: loanOfficer._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 4), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 4), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 1), changedByName: loanOfficer.name, role: 'loan_officer', notes: 'All 4 required documents verified and validated by officer.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, personalLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          address_proof: 'VERIFIED',
          bank_statement: 'VERIFIED',
        })
      );
      await VerificationNote.create({
        applicationId: app._id,
        authorId: loanOfficer._id,
        authorRole: 'loan_officer',
        authorName: loanOfficer.name,
        recommendation: 'NOTE_ONLY',
        remarks: 'All documents verified successfully. Income matches employer payroll database.',
      });
    }

    // --- Application 5: Under-Review (Home Loan) ---
    {
      const appUser = applicants[4]; // Priya Sharma
      const emi = calculateEmi(550000, homeLoanProduct.baseInterestRate, 240);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0005',
        applicantId: appUser._id,
        loanProductId: homeLoanProduct._id,
        requestedAmount: 550000,
        requestedTenureMonths: 240,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Under-Review',
        assignedOfficerId: loanOfficer._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 6), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 6), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 3), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Documents-Verified', toStatus: 'Under-Review', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: loanOfficer.name, role: 'loan_officer', notes: 'Officer recommended approval. Prime borrower profile.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, homeLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          address_proof: 'VERIFIED',
          property_papers: 'VERIFIED',
          property_valuation: 'VERIFIED',
        })
      );
      await VerificationNote.create({
        applicationId: app._id,
        authorId: loanOfficer._id,
        authorRole: 'loan_officer',
        authorName: loanOfficer.name,
        recommendation: 'RECOMMEND_APPROVAL',
        remarks: 'Applicant has pristine 780 FICO score, low existing debt, and clear title deed with certified appraisal.',
      });
    }

    // --- Application 6: Under-Review (Vehicle Loan) ---
    {
      const appUser = applicants[5]; // James Wilson
      const emi = calculateEmi(35000, vehicleLoanProduct.baseInterestRate, 60);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0006',
        applicantId: appUser._id,
        loanProductId: vehicleLoanProduct._id,
        requestedAmount: 35000,
        requestedTenureMonths: 60,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Under-Review',
        assignedOfficerId: loanOfficer._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 5), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 5), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Documents-Verified', toStatus: 'Under-Review', timestamp: new Date(Date.now() - 86400000 * 1), changedByName: loanOfficer.name, role: 'loan_officer', notes: 'Forwarded for underwriter terms assignment.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, vehicleLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          vehicle_quotation: 'VERIFIED',
          insurance_proof: 'VERIFIED',
        })
      );
      await VerificationNote.create({
        applicationId: app._id,
        authorId: loanOfficer._id,
        authorRole: 'loan_officer',
        authorName: loanOfficer.name,
        recommendation: 'RECOMMEND_APPROVAL',
        remarks: 'Vehicle dealer invoice verified. Recommend approval at standard rate.',
      });
    }

    // --- Application 7: More-Info-Requested ---
    {
      const appUser = applicants[6]; // Marcus Cole
      const emi = calculateEmi(8000, personalLoanProduct.baseInterestRate, 24);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0007',
        applicantId: appUser._id,
        loanProductId: personalLoanProduct._id,
        requestedAmount: 8000,
        requestedTenureMonths: 24,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'More-Info-Requested',
        assignedOfficerId: loanOfficer._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 5), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 5), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'More-Info-Requested', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: loanOfficer.name, role: 'loan_officer', notes: 'Bank statement uploaded was illegible; please upload full PDF statements.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, personalLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          address_proof: 'VERIFIED',
          bank_statement: 'REJECTED',
        })
      );
      await VerificationNote.create({
        applicationId: app._id,
        authorId: loanOfficer._id,
        authorRole: 'loan_officer',
        authorName: loanOfficer.name,
        recommendation: 'REQUEST_MORE_INFO',
        remarks: 'Bank statement provided has missing pages 2 and 3. Requesting complete statement.',
      });
    }

    // --- Application 8: Approved (Awaiting Applicant Acceptance) ---
    {
      const appUser = applicants[7]; // Laura Bennett
      const emi = calculateEmi(320000, 6.5, 360);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0008',
        applicantId: appUser._id,
        loanProductId: homeLoanProduct._id,
        requestedAmount: 350000,
        requestedTenureMonths: 360,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Approved',
        assignedOfficerId: loanOfficer._id,
        assignedApproverId: approver._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 7), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 7), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 4), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Documents-Verified', toStatus: 'Under-Review', timestamp: new Date(Date.now() - 86400000 * 3), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Under-Review', toStatus: 'Approved', timestamp: new Date(Date.now() - 86400000 * 1), changedByName: approver.name, role: 'approver', notes: 'Approved for $320,000 at preferential 6.5% interest rate. Pending applicant sign-off.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, homeLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          address_proof: 'VERIFIED',
          property_papers: 'VERIFIED',
          property_valuation: 'VERIFIED',
        })
      );
      await ApprovalDecision.create({
        applicationId: app._id,
        approverId: approver._id,
        decision: 'APPROVED',
        approvedAmount: 320000,
        approvedTenureMonths: 360,
        approvedInterestRate: 6.5,
        monthlyEmi: emi,
        decisionNote: 'Approved based on excellent credit score and verified asset collateral.',
        applicantAccepted: false,
        decidedAt: new Date(Date.now() - 86400000 * 1),
      });
    }

    // --- Application 9: Terms-Accepted-by-Applicant (Ready for Disbursement) ---
    {
      const appUser = applicants[8]; // Carlos Gomez
      const emi = calculateEmi(22000, 8.0, 48);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0009',
        applicantId: appUser._id,
        loanProductId: vehicleLoanProduct._id,
        requestedAmount: 22000,
        requestedTenureMonths: 48,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Terms-Accepted-by-Applicant',
        assignedOfficerId: loanOfficer._id,
        assignedApproverId: approver._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 8), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 8), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 5), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Documents-Verified', toStatus: 'Under-Review', timestamp: new Date(Date.now() - 86400000 * 4), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Under-Review', toStatus: 'Approved', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: approver.name, role: 'approver' },
          { fromStatus: 'Approved', toStatus: 'Terms-Accepted-by-Applicant', timestamp: new Date(Date.now() - 86400000 * 1), changedByName: appUser.name, role: 'applicant', notes: 'Applicant formally executed loan agreement and accepted loan terms.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, vehicleLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          vehicle_quotation: 'VERIFIED',
          insurance_proof: 'VERIFIED',
        })
      );
      await ApprovalDecision.create({
        applicationId: app._id,
        approverId: approver._id,
        decision: 'APPROVED',
        approvedAmount: 22000,
        approvedTenureMonths: 48,
        approvedInterestRate: 8.0,
        monthlyEmi: emi,
        decisionNote: 'Full financing approved for new sedan purchase.',
        applicantAccepted: true,
        applicantAcceptedAt: new Date(Date.now() - 86400000 * 1),
        decidedAt: new Date(Date.now() - 86400000 * 2),
      });
    }

    // --- Application 10: Disbursed (Completed Lifecycle) ---
    {
      const appUser = applicants[9]; // Lisa Anderson
      const emi = calculateEmi(18000, 11.0, 36);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0010',
        applicantId: appUser._id,
        loanProductId: personalLoanProduct._id,
        requestedAmount: 18000,
        requestedTenureMonths: 36,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'ELIGIBLE',
        status: 'Disbursed',
        assignedOfficerId: loanOfficer._id,
        assignedApproverId: approver._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 12), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 12), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 9), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Documents-Verified', toStatus: 'Under-Review', timestamp: new Date(Date.now() - 86400000 * 7), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Under-Review', toStatus: 'Approved', timestamp: new Date(Date.now() - 86400000 * 5), changedByName: approver.name, role: 'approver' },
          { fromStatus: 'Approved', toStatus: 'Terms-Accepted-by-Applicant', timestamp: new Date(Date.now() - 86400000 * 3), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Terms-Accepted-by-Applicant', toStatus: 'Disbursed', timestamp: new Date(Date.now() - 86400000 * 1), changedByName: approver.name, role: 'approver', notes: 'Funds disbursed via ACH to checking account.' },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, personalLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          address_proof: 'VERIFIED',
          bank_statement: 'VERIFIED',
        })
      );
      await ApprovalDecision.create({
        applicationId: app._id,
        approverId: approver._id,
        decision: 'APPROVED',
        approvedAmount: 18000,
        approvedTenureMonths: 36,
        approvedInterestRate: 11.0,
        monthlyEmi: emi,
        decisionNote: 'Standard personal loan terms granted.',
        applicantAccepted: true,
        applicantAcceptedAt: new Date(Date.now() - 86400000 * 3),
        decidedAt: new Date(Date.now() - 86400000 * 5),
      });

      const firstEmi = new Date();
      firstEmi.setDate(firstEmi.getDate() + 25);
      await Disbursement.create({
        applicationId: app._id,
        transactionReference: 'DISB-TXN-2026-884123',
        amount: 18000,
        paymentMethod: 'ACH',
        bankName: 'Wells Fargo Bank NA',
        bankAccountNumber: '9843210489',
        bankIfsc: 'WFBIUS6S',
        disbursementDate: new Date(Date.now() - 86400000 * 1),
        firstEmiDate: firstEmi,
        processedBy: approver._id,
        notes: 'Full amount transferred to borrower checking account.',
      });
    }

    // --- Application 11: Rejected (Auto-Rejected on Submission: LOW_CREDIT_SCORE) ---
    {
      const appUser = applicants[10]; // Robert Taylor (Credit: 580 < 650)
      const emi = calculateEmi(10000, personalLoanProduct.baseInterestRate, 24);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi);
      await LoanApplication.create({
        applicationNumber: 'LN-2026-0011',
        applicantId: appUser._id,
        loanProductId: personalLoanProduct._id,
        requestedAmount: 10000,
        requestedTenureMonths: 24,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'INELIGIBLE',
        status: 'Rejected',
        rejectionReason: 'LOW_CREDIT_SCORE',
        rejectionRemarks: `Credit score of ${appUser.creditScore} is below minimum threshold (${personalLoanProduct.minCreditScore})`,
        rejectedAt: new Date(Date.now() - 86400000 * 2),
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Rejected', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: 'Algorithmic Eligibility Engine', role: 'system', notes: `Automated rejection: Credit score of ${appUser.creditScore} is below minimum threshold (${personalLoanProduct.minCreditScore}).` },
        ],
      });
    }

    // --- Application 12: Rejected (Underwriter-Rejected: HIGH_DEBT_TO_INCOME) ---
    {
      const appUser = applicants[11]; // Angela Martinez (DTI > max allowed)
      const emi = calculateEmi(25000, vehicleLoanProduct.baseInterestRate, 48);
      const dti = calculateDti(appUser.monthlyIncome, appUser.existingMonthlyDebt, emi); // (1800 + 612) / 3000 = 80.4% > 40%
      const app = await LoanApplication.create({
        applicationNumber: 'LN-2026-0012',
        applicantId: appUser._id,
        loanProductId: vehicleLoanProduct._id,
        requestedAmount: 25000,
        requestedTenureMonths: 48,
        monthlyIncome: appUser.monthlyIncome,
        existingMonthlyDebt: appUser.existingMonthlyDebt,
        creditScore: appUser.creditScore,
        calculatedDtiRatio: dti,
        estimatedEmi: emi,
        eligibilityStatus: 'FLAGGED',
        status: 'Rejected',
        rejectionReason: 'HIGH_DEBT_TO_INCOME',
        rejectionRemarks: `Underwriting credit assessment failed: Total monthly debt obligations exceed institution risk tolerance (${dti}% DTI vs 40% limit).`,
        rejectedAt: new Date(Date.now() - 86400000 * 1),
        assignedOfficerId: loanOfficer._id,
        assignedApproverId: approver._id,
        timeline: [
          { fromStatus: '', toStatus: 'Enquiry-Submitted', timestamp: new Date(Date.now() - 86400000 * 4), changedByName: appUser.name, role: 'applicant' },
          { fromStatus: 'Enquiry-Submitted', toStatus: 'Documents-Pending', timestamp: new Date(Date.now() - 86400000 * 4), changedByName: 'System', role: 'system' },
          { fromStatus: 'Documents-Pending', toStatus: 'Documents-Verified', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Documents-Verified', toStatus: 'Under-Review', timestamp: new Date(Date.now() - 86400000 * 2), changedByName: loanOfficer.name, role: 'loan_officer' },
          { fromStatus: 'Under-Review', toStatus: 'Rejected', timestamp: new Date(Date.now() - 86400000 * 1), changedByName: approver.name, role: 'approver', notes: `Underwriter rejection: HIGH_DEBT_TO_INCOME. DTI ratio of ${dti}% is excessive.` },
        ],
      });
      await ApplicationDocument.insertMany(
        generateDocsForProduct(app._id, vehicleLoanProduct, {
          id_proof: 'VERIFIED',
          income_proof: 'VERIFIED',
          vehicle_quotation: 'VERIFIED',
          insurance_proof: 'VERIFIED',
        })
      );
      await ApprovalDecision.create({
        applicationId: app._id,
        approverId: approver._id,
        decision: 'REJECTED',
        rejectionReason: 'HIGH_DEBT_TO_INCOME',
        decisionNote: `Total debt burden of $${appUser.existingMonthlyDebt} against income of $${appUser.monthlyIncome} leads to severe debt distress risk.`,
        decidedAt: new Date(Date.now() - 86400000 * 1),
      });
    }

    console.log('[Seed] Successfully seeded 12 distinct applications covering all lifecycle stages!');
    console.log('[Seed] Database seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
