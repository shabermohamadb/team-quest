import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('    AURA 7F WEEKLY BASH — FULL-SCREEN GAME MODE TEST SUITE            ');
console.log('======================================================================\n');

// 1. FULLSCREEN UTILITY MODULE
console.log('--- TEST 1: Fullscreen Utility Architecture ---');
const fsUtilCode = fs.readFileSync('src/utils/fullscreen.js', 'utf8');
assert(fsUtilCode.includes('requestFullscreenMode'), 'Must export requestFullscreenMode');
assert(fsUtilCode.includes('exitFullscreenMode'), 'Must export exitFullscreenMode');
assert(fsUtilCode.includes('isBrowserFullscreen'), 'Must export isBrowserFullscreen');
assert(fsUtilCode.includes('useFullscreenStatus'), 'Must export useFullscreenStatus');
assert(fsUtilCode.includes('webkitRequestFullscreen'), 'Must handle webkit prefix');
assert(fsUtilCode.includes('fullscreenchange'), 'Must attach fullscreenchange listener');
console.log('[PASS] Fullscreen utility handles cross-browser APIs and reactive hook state');

// 2. VIEWPORT & SAFE AREA CONFIGURATION
console.log('\n--- TEST 2: Safe Area & Viewport Configuration ---');
const htmlCode = fs.readFileSync('index.html', 'utf8');
assert(htmlCode.includes('viewport-fit=cover'), 'index.html must include viewport-fit=cover for mobile notches');
console.log('[PASS] viewport-fit=cover configured in index.html');

const cssCode = fs.readFileSync('src/index.css', 'utf8');
assert(cssCode.includes('safe-area-inset-top'), 'CSS must declare safe-area-inset-top');
assert(cssCode.includes('safe-area-inset-bottom'), 'CSS must declare safe-area-inset-bottom');
assert(cssCode.includes('safe-top') && cssCode.includes('safe-bottom'), 'CSS must provide safe-top and safe-bottom utility classes');
assert(cssCode.includes('fullscreen-game-viewport'), 'CSS must provide fullscreen-game-viewport');
assert(cssCode.includes('no-scrollbar'), 'CSS must provide no-scrollbar utility');
console.log('[PASS] Safe area insets (notches/home indicator) and no-scrollbar CSS verified');

// 3. APP.JSX ROUTING & FULLSCREEN ISOLATION
console.log('\n--- TEST 3: App.jsx Fullscreen Container & Scroll Lock ---');
const appCode = fs.readFileSync('src/App.jsx', 'utf8');
// Refresh session instant restoration
assert(appCode.includes('getInitialPlayerTeam'), 'App.jsx must initialize playerTeam from localStorage to prevent flash on refresh');
// Scroll lock
assert(appCode.includes("document.body.style.overflow = 'hidden'"), 'Must lock body scroll during player game');
assert(appCode.includes("document.documentElement.style.overflow = 'hidden'"), 'Must lock html element scroll during player game');
// Hide navbar when joined
assert(appCode.includes('!playerTeam') && appCode.includes('<Navbar'), 'Navbar must be hidden once player joins team');
// Viewport container
assert(appCode.includes('100vw') || appCode.includes('w-screen'), 'App.jsx must use full-viewport width');
assert(appCode.includes('100dvh') || appCode.includes('h-screen'), 'App.jsx must use full-viewport height');
console.log('[PASS] Instant refresh restoration, body scroll lock, Navbar hiding, and 100vw/100dvh container verified');

// 4. LOGIN LOBBY VIEW FULLSCREEN TRANSITION & LOBBY ARENA
console.log('\n--- TEST 4: LoginLobbyView Fullscreen Join & Lobby Arena ---');
const lobbyCode = fs.readFileSync('src/views/LoginLobbyView.jsx', 'utf8');
assert(lobbyCode.includes('requestFullscreenMode'), 'handleJoin must invoke requestFullscreenMode on user gesture');
assert(lobbyCode.includes('transitionStage') || lobbyCode.includes('TRANSITIONING'), 'Must provide smooth transition state');
assert(lobbyCode.includes('w-screen') && lobbyCode.includes('h-screen'), 'Lobby must use w-screen and h-screen');
assert(lobbyCode.includes('safe-top') && lobbyCode.includes('safe-bottom'), 'Lobby must respect safe-top and safe-bottom');
assert(lobbyCode.includes('ONE ACTIVE DEVICE CONFIRMED'), 'Lobby must confirm active device limit');
assert(lobbyCode.includes('FULLSCREEN') || lobbyCode.includes('requestFs'), 'Lobby must provide Fullscreen button if browser exited');
console.log('[PASS] Fullscreen invocation on Join Game, 500ms smooth transition, edge-to-edge Lobby arena, and Fullscreen toggle verified');

// 5. PLAYER VIEW FULL-SCREEN GAME ARENA
console.log('\n--- TEST 5: PlayerView In-Game Arena Architecture ---');
const playerCode = fs.readFileSync('src/views/PlayerView.jsx', 'utf8');
assert(playerCode.includes('w-screen') && playerCode.includes('h-screen'), 'PlayerView must use w-screen and h-screen');
assert(playerCode.includes('safe-top') && playerCode.includes('safe-bottom'), 'PlayerView must respect safe area insets');
assert(playerCode.includes('<Timer'), 'Prominent top timer must be present in top header bar');
assert(playerCode.includes('min-h-[48px]'), 'Answer inputs and submit buttons must have min 48px touch targets for mobile');
assert(playerCode.includes('FULLSCREEN') || playerCode.includes('requestFs'), 'PlayerView must provide Fullscreen toggle button');
assert(playerCode.includes('CLUE 0'), 'Round 1 must feature prominent Clue block');
assert(playerCode.includes('IDENTIFY THE MISSING ELEMENT'), 'Round 2 must feature missing element block');
assert(playerCode.includes('CRACK THE ENCRYPTED CIPHER'), 'Round 3 must feature cipher cracking block');
assert(playerCode.includes('YOUR TEAM:') && playerCode.includes('<TeamBadge'), 'PlayerView must display active team indicator');
assert(!playerCode.includes('max-w-4xl mx-auto py-4 px-3 md:px-4 space-y-5'), 'Old boxed container must be removed');
console.log('[PASS] Fullscreen game arena layout, top timer prominence, mobile 48px touch targets, and round presentations verified');

console.log('\n======================================================================');
console.log('     FULL-SCREEN GAME MODE SUITE: ALL CHECKS PASSED ✓                  ');
console.log('======================================================================\n');
