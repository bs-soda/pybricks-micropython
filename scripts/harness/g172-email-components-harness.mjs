#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-172: RESPONSIVE EMAIL COMPONENTS & STORYBOOK 8 HARNESS
 * Verifies email design tokens, 8 core components, Storybook stories,
 * and public package exports.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

let passedAssertions = 0;
let totalAssertions = 0;

function assertCheck(description, condition) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ${ANSI.green}✔${ANSI.reset} ${description}`);
  } else {
    console.error(`  ${ANSI.red}✖ FAIL:${ANSI.reset} ${description}`);
    process.exitCode = 1;
  }
}

const rootDir = process.cwd();
const tokensFile = path.join(rootDir, "code/packages/ui/src/emails/tokens.ts");
const headerFile = path.join(rootDir, "code/packages/ui/src/emails/EmailHeader.tsx");
const otpFile = path.join(rootDir, "code/packages/ui/src/emails/EmailOtpBox.tsx");
const buttonFile = path.join(rootDir, "code/packages/ui/src/emails/EmailActionButton.tsx");
const invoiceFile = path.join(rootDir, "code/packages/ui/src/emails/EmailInvoiceSummary.tsx");
const creatorFile = path.join(rootDir, "code/packages/ui/src/emails/EmailCreatorCard.tsx");
const meetingFile = path.join(rootDir, "code/packages/ui/src/emails/EmailMeetingInvite.tsx");
const dunningFile = path.join(rootDir, "code/packages/ui/src/emails/EmailDunningNotice.tsx");
const footerFile = path.join(rootDir, "code/packages/ui/src/emails/EmailFooter.tsx");
const indexFile = path.join(rootDir, "code/packages/ui/src/emails/index.ts");
const storiesFile = path.join(rootDir, "code/packages/ui/src/emails/stories/EmailComponents.stories.tsx");
const packageIndex = path.join(rootDir, "code/packages/ui/src/index.ts");
const archSpec = path.join(rootDir, "docs/03-architecture/responsive-email-components-storybook-architecture.md");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-172: RESPONSIVE EMAIL COMPONENTS & STORYBOOK HARNESS             ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}🎨 1. Verifying Email Design Tokens & Layout Constants:${ANSI.reset}`);
assertCheck("tokens.ts exists", fs.existsSync(tokensFile));
if (fs.existsSync(tokensFile)) {
  const src = fs.readFileSync(tokensFile, "utf8");
  assertCheck("Contains maxDesktopWidth 600px", src.includes("600px"));
  assertCheck("Contains minMobileWidth 320px", src.includes("320px"));
  assertCheck("Contains primary color #4F46E5", src.includes("#4F46E5"));
}

console.log(`\n${ANSI.bold}📦 2. Verifying 8 Atomic & Composite Email Components:${ANSI.reset}`);
assertCheck("EmailHeader.tsx exists", fs.existsSync(headerFile));
assertCheck("EmailOtpBox.tsx exists", fs.existsSync(otpFile));
assertCheck("EmailActionButton.tsx exists", fs.existsSync(buttonFile));
assertCheck("EmailInvoiceSummary.tsx exists", fs.existsSync(invoiceFile));
assertCheck("EmailCreatorCard.tsx exists", fs.existsSync(creatorFile));
assertCheck("EmailMeetingInvite.tsx exists", fs.existsSync(meetingFile));
assertCheck("EmailDunningNotice.tsx exists", fs.existsSync(dunningFile));
assertCheck("EmailFooter.tsx exists", fs.existsSync(footerFile));
assertCheck("emails/index.ts barrel export exists", fs.existsSync(indexFile));

console.log(`\n${ANSI.bold}📚 3. Verifying Storybook 8 CDD Catalog:${ANSI.reset}`);
assertCheck("EmailComponents.stories.tsx exists", fs.existsSync(storiesFile));
if (fs.existsSync(storiesFile)) {
  const stories = fs.readFileSync(storiesFile, "utf8");
  assertCheck("Contains FullOtpVerificationTemplate story", stories.includes("FullOtpVerificationTemplate"));
  assertCheck("Contains FullInvoiceAndBillingTemplate story", stories.includes("FullInvoiceAndBillingTemplate"));
  assertCheck("Contains FullCampaignBriefAndMeetingTemplate story", stories.includes("FullCampaignBriefAndMeetingTemplate"));
  assertCheck("Contains FullDunningOverdueWarningTemplate story", stories.includes("FullDunningOverdueWarningTemplate"));
}

console.log(`\n${ANSI.bold}🔗 4. Verifying Package Exports & Architecture Spec:${ANSI.reset}`);
if (fs.existsSync(packageIndex)) {
  const pkg = fs.readFileSync(packageIndex, "utf8");
  assertCheck("Public index exports ./emails", pkg.includes('export * from "./emails";'));
}
assertCheck("Architecture spec exists", fs.existsSync(archSpec));

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-172 EMAIL COMPONENTS HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
