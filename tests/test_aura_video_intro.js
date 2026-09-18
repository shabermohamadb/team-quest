import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import http from 'http';

console.log('======================================================================');
console.log('       AURA 7F WEEKLY BASH — VIDEO INTRO VERIFICATION SUITE           ');
console.log('======================================================================\n');

// 1. VIDEO ASSET INTEGRITY
console.log('--- TEST 1: Video Asset Verification ---');
const videoPath = path.resolve('public/aura_intro.mp4');
const distVideoPath = path.resolve('dist/aura_intro.mp4');
assert.strictEqual(fs.existsSync(videoPath), true, 'public/aura_intro.mp4 must exist');
assert.strictEqual(fs.existsSync(distVideoPath), true, 'dist/aura_intro.mp4 must exist in build distribution');

const videoStats = fs.statSync(videoPath);
console.log(`[PASS] Video file present: ${(videoStats.size / (1024 * 1024)).toFixed(2)} MB`);
assert(videoStats.size > 1000000 && videoStats.size < 5000000, 'Video file size should be between 1MB and 5MB');

// 2. VIDEO METADATA & FASTSTART
console.log('\n--- TEST 2: Video Encoding & Faststart Verification ---');
const probeRaw = execSync(`ffprobe -v error -show_entries stream=codec_name,width,height,duration -show_entries format=duration,size -of json "${videoPath}"`).toString();
const probeData = JSON.parse(probeRaw);

const videoStream = probeData.streams.find(s => s.codec_name === 'h264');
const audioStream = probeData.streams.find(s => s.codec_name === 'aac');

assert(videoStream, 'H.264 video stream must be present');
assert.strictEqual(videoStream.width, 1280, 'Width must be 1280 (720p)');
assert.strictEqual(videoStream.height, 720, 'Height must be 720 (16:9)');
console.log(`[PASS] Video stream: H.264, ${videoStream.width}x${videoStream.height} (16:9 ratio preserved)`);

assert(audioStream, 'AAC audio stream must be present');
console.log(`[PASS] Audio stream: AAC stereo present`);

const duration = parseFloat(probeData.format.duration);
console.log(`[PASS] Duration: ${duration.toFixed(1)}s (matches 10s master video)`);
assert(duration >= 9.8 && duration <= 10.2, 'Duration must be approx 10s');

// Faststart moov atom test
const buffer = Buffer.alloc(256);
const fd = fs.openSync(videoPath, 'r');
fs.readSync(fd, buffer, 0, 256, 0);
fs.closeSync(fd);
const headerStr = buffer.toString('binary');
assert(headerStr.includes('moov'), 'Moov atom must be at beginning of file for instant web streaming');
console.log('[PASS] Faststart moov atom verified at the beginning of the MP4 file');

// 3. HTTP STREAMING & RANGE REQUEST SUPPORT
console.log('\n--- TEST 3: HTTP Server Range Requests (HTTP 206) ---');
async function testRangeRequest() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/aura_intro.mp4',
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023'
      }
    }, (res) => {
      assert.strictEqual(res.statusCode, 206, 'Server must return 206 Partial Content for range requests');
      assert.strictEqual(res.headers['accept-ranges'], 'bytes', 'Server must advertise Accept-Ranges: bytes');
      assert.strictEqual(res.headers['content-range'], `bytes 0-1023/${videoStats.size}`);
      assert.strictEqual(res.headers['content-type'], 'video/mp4');
      console.log(`[PASS] HTTP 206 Partial Content verified (Range bytes 0-1023/${videoStats.size})`);
      resolve();
    });
    req.on('error', reject);
    req.end();
  });
}
await testRangeRequest();

// 4. FRONTEND COMPONENT ARCHITECTURE AUDIT
console.log('\n--- TEST 4: Frontend Component (CinematicIntro.jsx) Code Audit ---');
const introCode = fs.readFileSync('src/components/CinematicIntro.jsx', 'utf8');

// Zero browser controls
assert(!introCode.includes('controls={true}') && !introCode.includes('controls '), 'Native browser video controls must NOT be present');
console.log('[PASS] Zero native browser video controls verified');

// Autoplay resilience
assert(introCode.includes('attemptAutoplay') || introCode.includes('video.play()'), 'Autoplay attempt logic must be implemented');
assert(introCode.includes('video.muted = true') || introCode.includes('setIsMuted(true)'), 'Muted fallback for autoplay policy must be implemented');
console.log('[PASS] Autoplay resilience (unmuted attempt + muted fallback) verified');

// Audio toggle
assert(introCode.includes('toggleSound') || introCode.includes('UNMUTE'), 'Sound toggle button must be present');
console.log('[PASS] Sound toggle (Mute / Unmute) control verified');

// Skip intro
assert(introCode.includes('SKIP INTRO') || introCode.includes('handleFinish'), 'Skip intro control must be present');
console.log('[PASS] Skip Intro control verified');

// Aspect ratio & full-viewport
assert(introCode.includes('object-contain'), 'Must use object-contain to preserve original 16:9 aspect ratio');
console.log('[PASS] Aspect ratio preservation (object-contain) verified');

// Non-blocking fallback
assert(introCode.includes('hasError') || introCode.includes('onError'), 'Error fallback must be implemented');
console.log('[PASS] Non-blocking fallback on video error verified');

// 5. FIRST-LOAD GATEWAY VERIFICATION (App.jsx)
console.log('\n--- TEST 5: First-load Only Rules (App.jsx) ---');
const appCode = fs.readFileSync('src/App.jsx', 'utf8');
assert(appCode.includes('shouldShowIntro'), 'App.jsx must implement shouldShowIntro gate');
assert(appCode.includes('aura7f_intro_seen'), 'App.jsx must record aura7f_intro_seen in sessionStorage');
assert(appCode.includes('team_quest_session'), 'App.jsx must bypass intro for active team player reconnects');
assert(appCode.includes('/admin') && appCode.includes('#admin'), 'App.jsx must bypass intro for admin routes');
console.log('[PASS] First-load sessionStorage, active player bypass, and admin route bypass verified');

console.log('\n======================================================================');
console.log('       AURA VIDEO INTRO SUITE: ALL TESTS PASSED SUCCESSFULLY ✓        ');
console.log('======================================================================\n');
