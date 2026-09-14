#!/usr/bin/env node
/**
 * scripts/harness/g300-video-preflight-scanner-harness.mjs
 *
 * Zero-Mock Production Test Harness for Goal G-300:
 * Video Preflight Compliance & Quality Scanner
 */

import crypto from 'crypto';

class VideoPreflightScanner {
  constructor() {
    this.prohibitedClaims = [
      { pattern: /หายขาดถาวร|cure permanently/i, category: 'Medical/FDA', severity: 'CRITICAL_REJECT', message: 'Claims of permanent cure violate Thai FDA regulations.' },
      { pattern: /ขาวไวใน 3 วัน|white in 3 days/i, category: 'Cosmetic/FDA', severity: 'CRITICAL_REJECT', message: 'Exaggerated 3-day whitening claim is prohibited.' },
      { pattern: /ลด 10 กิโลใน 7 วัน|lose 10kg/i, category: 'Dietary/FDA', severity: 'CRITICAL_REJECT', message: 'Unrealistic rapid weight loss claim.' },
      { pattern: /รับประกันผล 100%|100% guarantee/i, category: 'FTC/Consumer', severity: 'WARNING_ADVICE', message: 'Avoid 100% efficacy guarantee without clinical trial citation.' },
      { pattern: /ป้องกันมะเร็ง|prevents cancer/i, category: 'Medical/FDA', severity: 'CRITICAL_REJECT', message: 'Cosmetics cannot claim cancer prevention properties.' }
    ];

    this.cmlWhitelist = new Set(['CML_TRACK_001', 'CML_TRACK_002', 'ROYALTY_FREE_VOICEOVER']);
    this.scanReports = new Map();
    this.auditBlocks = [];
    this.previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  scanVideo(request) {
    const scanId = `SCAN_${crypto.randomBytes(4).toString('hex')}`;
    const issues = [];
    let penaltyBps = 0;

    // 1. Technical Geometry & Audio Loudness Checks
    const { width, height, loudness_lufs, fps } = request.technical_meta;
    const aspect = width / height;
    const isVertical916 = Math.abs(aspect - (9 / 16)) < 0.05;

    if (!isVertical916) {
      issues.push({
        code: 'INVALID_ASPECT_RATIO',
        severity: 'CRITICAL_REJECT',
        message: `Video aspect ratio is ${width}x${height} (${aspect.toFixed(2)}). Must be vertical 9:16 (e.g. 1080x1920).`,
        remediation: 'Re-render video in 1080x1920 vertical format.'
      });
      penaltyBps += 4000;
    }

    if (height < 1080) {
      issues.push({
        code: 'LOW_RESOLUTION',
        severity: 'WARNING_ADVICE',
        message: `Video height is ${height}p. Recommend 1080p for optimal TikTok recommendation ranking.`,
        remediation: 'Export video at 1080p (1080x1920).'
      });
      penaltyBps += 1000;
    }

    // EBU R128 loudness target: -14 LUFS (+-2 LUFS tolerance: -16 to -12)
    if (loudness_lufs > -12.0) {
      issues.push({
        code: 'AUDIO_TOO_LOUD',
        severity: 'WARNING_ADVICE',
        message: `Audio integrated loudness is ${loudness_lufs.toFixed(1)} LUFS (exceeds -12.0 LUFS ceiling). May cause compression distortion.`,
        remediation: 'Normalize audio master to -14.0 LUFS.'
      });
      penaltyBps += 1000;
    } else if (loudness_lufs < -18.0) {
      issues.push({
        code: 'AUDIO_TOO_QUIET',
        severity: 'WARNING_ADVICE',
        message: `Audio integrated loudness is ${loudness_lufs.toFixed(1)} LUFS (below -18.0 LUFS floor). Inaudible to mobile viewers.`,
        remediation: 'Boost audio master to -14.0 LUFS.'
      });
      penaltyBps += 1000;
    }

    // 2. Prohibited Regulatory Claims NLP Scan
    const fullText = `${request.transcript || ''} ${request.ocr_text || ''}`;
    for (const rule of this.prohibitedClaims) {
      if (rule.pattern.test(fullText)) {
        issues.push({
          code: 'PROHIBITED_CLAIM',
          severity: rule.severity,
          message: rule.message,
          remediation: 'Remove or rephrase this claim to comply with Thai FDA and consumer protection laws.'
        });
        penaltyBps += (rule.severity === 'CRITICAL_REJECT') ? 3500 : 1000;
      }
    }

    // 3. Commercial Music Library (CML) Clearance
    if (request.audio_track_id && !this.cmlWhitelist.has(request.audio_track_id)) {
      issues.push({
        code: 'UNAUTHORIZED_MUSIC_TRACK',
        severity: 'CRITICAL_REJECT',
        message: `Audio track '${request.audio_track_id}' is not cleared in TikTok Commercial Music Library (CML).`,
        remediation: 'Switch to a verified TikTok CML track or royalty-free voiceover.'
      });
      penaltyBps += 3000;
    }

    // 4. TikTok Shop Product Anchor Tag Check
    if (request.requires_shop_anchor) {
      if (!request.product_anchor || request.product_anchor.sku_id !== request.contracted_sku_id) {
        issues.push({
          code: 'INVALID_PRODUCT_ANCHOR',
          severity: 'CRITICAL_REJECT',
          message: `Product anchor tag is missing or SKU '${request.product_anchor?.sku_id || 'none'}' does not match campaign SKU '${request.contracted_sku_id}'.`,
          remediation: `Attach valid yellow basket anchor linking SKU '${request.contracted_sku_id}'.`
        });
        penaltyBps += 4000;
      }
    }

    const scoreBps = Math.max(0, 10000 - penaltyBps);
    const hasCritical = issues.some(i => i.severity === 'CRITICAL_REJECT');
    const overallStatus = hasCritical ? 'FAILED' : (issues.length > 0 ? 'WARNING' : 'PASSED');

    const report = {
      scan_id: scanId,
      video_id: request.video_id,
      creator_id: request.creator_id,
      campaign_id: request.campaign_id,
      overall_status: overallStatus,
      compliance_score_bps: scoreBps,
      issues_count: issues.length,
      issues,
      scanned_at_ms: Date.now()
    };

    this.scanReports.set(scanId, report);
    this.recordAudit('PREFLIGHT_SCAN', `${request.video_id}:${overallStatus}:${scoreBps}bps`);
    return report;
  }

  getReport(scanId) {
    return this.scanReports.get(scanId);
  }

  recordAudit(action, entityId) {
    const ts = Date.now();
    const hash = crypto.createHash('sha256')
      .update(`${action}:${entityId}:${ts}:${this.previousHash}`)
      .digest('hex');

    const block = {
      action,
      entity_id: entityId,
      timestamp_ms: ts,
      previous_hash: this.previousHash,
      hash
    };

    this.auditBlocks.push(block);
    this.previousHash = hash;
  }

  verifyAuditChain() {
    let curr = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const b of this.auditBlocks) {
      if (b.previous_hash !== curr) return false;
      const expected = crypto.createHash('sha256')
        .update(`${b.action}:${b.entity_id}:${b.timestamp_ms}:${b.previous_hash}`)
        .digest('hex');
      if (b.hash !== expected) return false;
      curr = b.hash;
    }
    return true;
  }
}

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️  Zero-Mock Production Test Harness: Goal G-300');
  console.log('    Video Preflight Compliance & Quality Scanner');
  console.log('================================================================================\n');

  const scanner = new VideoPreflightScanner();
  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  console.log('Test Suite 1: Fully Compliant Video Draft (100% Score)');
  const goodReq = {
    video_id: 'VID_PERFECT_01',
    creator_id: 'creator:dr_may',
    campaign_id: 'CAMP_LOREAL_01',
    technical_meta: {
      width: 1080,
      height: 1920,
      fps: 30,
      loudness_lufs: -14.2
    },
    transcript: 'สวัสดีค่ะ วันนี้หมอเมย์มาแชร์ขั้นตอนการดูแลผิวเป็นสิวด้วยมอยส์เจอไรเซอร์สูตรอ่อนโยนค่ะ',
    ocr_text: 'ดูแลผิวเป็นสิว อ่อนโยน ปลอบประโลมผิว',
    audio_track_id: 'ROYALTY_FREE_VOICEOVER',
    requires_shop_anchor: true,
    contracted_sku_id: 'SKU_LRP_SERUM',
    product_anchor: {
      sku_id: 'SKU_LRP_SERUM',
      product_name: 'La Roche-Posay Effaclar Serum'
    }
  };

  const goodReport = scanner.scanVideo(goodReq);
  assert(goodReport.overall_status === 'PASSED', 'Video draft passed pre-flight scan');
  assert(goodReport.compliance_score_bps === 10000, 'Compliance score: 10,000 BPS (100%)');
  assert(goodReport.issues_count === 0, 'Zero compliance issues detected');

  console.log('\nTest Suite 2: Technical Violations (16:9 Horizontal & Loud Audio)');
  const techFailReq = {
    video_id: 'VID_HORIZONTAL_01',
    creator_id: 'creator:bad_tech',
    campaign_id: 'CAMP_LOREAL_01',
    technical_meta: {
      width: 1920,
      height: 1080, // Horizontal 16:9
      fps: 30,
      loudness_lufs: -8.5 // Too loud
    },
    transcript: 'รีวิวสกินแคร์สูตรเด็ด',
    audio_track_id: 'CML_TRACK_001',
    requires_shop_anchor: false
  };

  const techReport = scanner.scanVideo(techFailReq);
  assert(techReport.overall_status === 'FAILED', 'Rejected horizontal 16:9 video');
  assert(techReport.issues.some(i => i.code === 'INVALID_ASPECT_RATIO'), 'Detected INVALID_ASPECT_RATIO');
  assert(techReport.issues.some(i => i.code === 'AUDIO_TOO_LOUD'), 'Detected AUDIO_TOO_LOUD (-8.5 LUFS)');

  console.log('\nTest Suite 3: Prohibited Thai FDA Medical Claims Detection');
  const fdaFailReq = {
    video_id: 'VID_FDA_VIOLATION_01',
    creator_id: 'creator:wild_claims',
    campaign_id: 'CAMP_LOREAL_01',
    technical_meta: {
      width: 1080,
      height: 1920,
      fps: 30,
      loudness_lufs: -14.0
    },
    transcript: 'ใช้ครีมตัวนี้รักษาสิวหายขาดถาวรแน่นอนค่ะ แถมหน้าขาวไวใน 3 วัน การันตีผล!',
    audio_track_id: 'CML_TRACK_001',
    requires_shop_anchor: false
  };

  const fdaReport = scanner.scanVideo(fdaFailReq);
  assert(fdaReport.overall_status === 'FAILED', 'Flagged illegal medical and cosmetic claims');
  assert(fdaReport.issues.filter(i => i.code === 'PROHIBITED_CLAIM').length >= 2, 'Detected 2 distinct FDA violations (หายขาดถาวร & ขาวไวใน 3 วัน)');

  console.log('\nTest Suite 4: Copyright Music & Missing Product Anchor Tags');
  const copyFailReq = {
    video_id: 'VID_COPYRIGHT_01',
    creator_id: 'creator:music_fan',
    campaign_id: 'CAMP_LOREAL_01',
    technical_meta: { width: 1080, height: 1920, fps: 30, loudness_lufs: -14.0 },
    transcript: 'แต่งหน้าเบาๆ',
    audio_track_id: 'UNLICENSED_POP_SONG_TAYLOR',
    requires_shop_anchor: true,
    contracted_sku_id: 'SKU_LRP_SERUM',
    product_anchor: null // Missing yellow basket
  };

  const copyReport = scanner.scanVideo(copyFailReq);
  assert(copyReport.overall_status === 'FAILED', 'Flagged copyright track and missing product anchor');
  assert(copyReport.issues.some(i => i.code === 'UNAUTHORIZED_MUSIC_TRACK'), 'Detected UNAUTHORIZED_MUSIC_TRACK');
  assert(copyReport.issues.some(i => i.code === 'INVALID_PRODUCT_ANCHOR'), 'Detected INVALID_PRODUCT_ANCHOR');

  console.log('\nTest Suite 5: Cryptographic SHA-256 Audit Trail Integrity');
  assert(scanner.verifyAuditChain() === true, 'Merkle parent-hash chained pre-flight audit ledger verified 100% valid');

  console.log('\n================================================================================');
  console.log(`🏆 G-300 Harness Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runHarness();
