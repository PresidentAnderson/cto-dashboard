#!/usr/bin/env node
/**
 * GitHub Sync Testing Script
 * Tests the GitHub synchronization system
 *
 * Usage:
 *   node test-github-sync.js [username]
 *
 * Example:
 *   node test-github-sync.js PresidentAnderson
 */

const { syncGitHubRepos } = require('./backend/lib/github-sync');
require('dotenv').config();

const username = process.argv[2] || 'PresidentAnderson';
const token = process.env.GITHUB_TOKEN || null;

console.log('='.repeat(60));
console.log('GitHub Repository Sync Test');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log(`Token: ${token ? 'Provided (rate limit: 5000/hour)' : 'Not provided (rate limit: 60/hour)'}`);
console.log('='.repeat(60));
console.log('');

async function runTest() {
    try {
        const result = await syncGitHubRepos(username, token);

        console.log('');
        console.log('='.repeat(60));
        console.log('SYNC RESULTS');
        console.log('='.repeat(60));

        if (result.success) {
            console.log('Status: SUCCESS');
            console.log('');
            console.log('Statistics:');
            console.log(`  Total Repositories: ${result.stats.total}`);
            console.log(`  Newly Imported:     ${result.stats.imported}`);
            console.log(`  Updated:            ${result.stats.updated}`);
            console.log(`  Failed:             ${result.stats.failed}`);
            console.log(`  Duration:           ${(result.duration_ms / 1000).toFixed(2)}s`);

            if (result.stats.errors.length > 0) {
                console.log('');
                console.log('Errors:');
                result.stats.errors.forEach((err, idx) => {
                    console.log(`  ${idx + 1}. ${err.repo}: ${err.error}`);
                });
            }
        } else {
            console.log('Status: FAILED');
            console.log(`Error: ${result.error}`);
            console.log('');
            console.log('Partial Statistics:');
            console.log(`  Total Attempted:    ${result.stats.total}`);
            console.log(`  Imported:           ${result.stats.imported}`);
            console.log(`  Updated:            ${result.stats.updated}`);
            console.log(`  Failed:             ${result.stats.failed}`);
        }

        console.log('='.repeat(60));

        process.exit(result.success ? 0 : 1);

    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('FATAL ERROR');
        console.error('='.repeat(60));
        console.error(error);
        console.error('='.repeat(60));
        process.exit(1);
    }
}

runTest();
