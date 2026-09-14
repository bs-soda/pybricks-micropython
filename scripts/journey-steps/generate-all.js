const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Import individual flow runners
const flow0 = require('./flow-0-auth');
const flow1 = require('./flow-1-campaign-setup');
const flow2 = require('./flow-2-creator-onboarding');
const flow3 = require('./flow-3-sample-approval');
const flow4 = require('./flow-4-content-moderation');
const flow5 = require('./flow-5-spark-sync-reports');

const OUTPUT_FILE = path.join(__dirname, 'figma-nodes.json');

async function compileAllFlows() {
  console.log('🏁 Starting Unified User Journey compilation (including Login flows)...');
  console.log('==================================================');
  
  const browser = await puppeteer.launch({ headless: true });

  try {
    // Run all flows sequentially in a single browser context
    const f0Steps = await flow0.runFlow(browser);
    const f1Steps = await flow1.runFlow(browser);
    const f2Steps = await flow2.runFlow(browser);
    const f3Steps = await flow3.runFlow(browser);
    const f4Steps = await flow4.runFlow(browser);
    const f5Steps = await flow5.runFlow(browser);

    console.log('==================================================');
    console.log('Stitching flows together into a single unified JSON...');

    const f0Count = f0Steps.length;
    const f1Count = f1Steps.length;
    const f2Count = f2Steps.length;
    const f3Count = f3Steps.length;
    const f4Count = f4Steps.length;
    const f5Count = f5Steps.length;

    // Apply cumulative offsets to connections in each flow
    f0Steps.forEach(step => {
      if (step.connections) {
        step.connections.forEach(conn => {
          conn.destinationIndex += 0;
        });
      }
    });

    f1Steps.forEach(step => {
      if (step.connections) {
        step.connections.forEach(conn => {
          conn.destinationIndex += f0Count;
        });
      }
    });

    f2Steps.forEach(step => {
      if (step.connections) {
        step.connections.forEach(conn => {
          conn.destinationIndex += (f0Count + f1Count);
        });
      }
    });

    f3Steps.forEach(step => {
      if (step.connections) {
        step.connections.forEach(conn => {
          conn.destinationIndex += (f0Count + f1Count + f2Count);
        });
      }
    });

    f4Steps.forEach(step => {
      if (step.connections) {
        step.connections.forEach(conn => {
          conn.destinationIndex += (f0Count + f1Count + f2Count + f3Count);
        });
      }
    });

    f5Steps.forEach(step => {
      if (step.connections) {
        step.connections.forEach(conn => {
          conn.destinationIndex += (f0Count + f1Count + f2Count + f3Count + f4Count);
        });
      }
    });

    // Combine all steps
    const allSteps = [
      ...f0Steps,
      ...f1Steps,
      ...f2Steps,
      ...f3Steps,
      ...f4Steps,
      ...f5Steps
    ];

    // Establish cross-flow connections to form one continuous chain
    
    // Connect Admin Login (index 1) to Flow 1 start (Campaigns List index 4)
    const adminLoginIndex = 1;
    const f1StartIndex = f0Count; // 4
    allSteps[adminLoginIndex].connections = allSteps[adminLoginIndex].connections || [];
    allSteps[adminLoginIndex].connections.push({
      triggerText: 'Sign in',
      destinationIndex: f1StartIndex
    });

    // Connect Brand Login (index 2) to Flow 3 start (Sample Approvals index 12)
    const brandLoginIndex = 2;
    const f3StartIndex = f0Count + f1Count + f2Count; // 12
    allSteps[brandLoginIndex].connections = allSteps[brandLoginIndex].connections || [];
    allSteps[brandLoginIndex].connections.push({
      triggerText: 'Sign in',
      destinationIndex: f3StartIndex
    });

    // Connect Creator LINE Login (index 3) to Flow 2 start (Campaign Offer index 8)
    const creatorLoginIndex = 3;
    const f2StartIndex = f0Count + f1Count; // 8
    allSteps[creatorLoginIndex].connections = allSteps[creatorLoginIndex].connections || [];
    allSteps[creatorLoginIndex].connections.push({
      triggerText: 'Continue with LINE',
      destinationIndex: f2StartIndex
    });

    // Chain Flow 1 Campaign setup complete (index 7) -> Flow 2 Start (index 8)
    const f1EndIndex = f0Count + f1Count - 1; // 7
    allSteps[f1EndIndex].connections = allSteps[f1EndIndex].connections || [];
    allSteps[f1EndIndex].connections.push({
      triggerText: 'Summer Glow Collection',
      destinationIndex: f2StartIndex
    });

    // Chain Flow 2 Sample Requested (index 11) -> Flow 3 start (index 12)
    const f2EndIndex = f0Count + f1Count + f2Count - 1; // 11
    allSteps[f2EndIndex].connections = allSteps[f2EndIndex].connections || [];
    allSteps[f2EndIndex].connections.push({
      triggerText: 'Awaiting approval',
      destinationIndex: f3StartIndex
    });

    // Chain Flow 3 Sample Received (index 13) -> Flow 4 Start Video Submission (index 14)
    const f3EndIndex = f0Count + f1Count + f2Count + f3Count - 1; // 13
    const f4StartIndex = f0Count + f1Count + f2Count + f3Count; // 14
    allSteps[f3EndIndex].connections = allSteps[f3EndIndex].connections || [];
    allSteps[f3EndIndex].connections.push({
      triggerText: 'received',
      destinationIndex: f4StartIndex
    });

    // Chain Flow 4 Moderation approved (index 17) -> Flow 5 Start Campaign Reports (index 18)
    const f4EndIndex = f0Count + f1Count + f2Count + f3Count + f4Count - 1; // 17
    const f5StartIndex = f0Count + f1Count + f2Count + f3Count + f4Count; // 18
    allSteps[f4EndIndex].connections = allSteps[f4EndIndex].connections || [];
    allSteps[f4EndIndex].connections.push({
      triggerText: 'Campaigns',
      destinationIndex: f5StartIndex
    });

    // Write final stitched JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allSteps, null, 2));

    console.log(`\n🎉 Success! Unified user journey saved to: ${OUTPUT_FILE}`);
    console.log(`📊 Total stitched screens generated: ${allSteps.length} screens`);
    console.log('==================================================');

  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
  } finally {
    await browser.close();
  }
}

compileAllFlows();
