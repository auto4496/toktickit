// Reproduce supplemental source hashes from immutable Git blobs, independent of checkout line endings.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const commit = '827dca9665a365931758137c25d174faa5d69c87'; // Reviewed PR #51 merge.
const output = path.join(root, 'artifacts/lab-04/release/committed-source-hashes.json');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const sha = data => createHash('sha256').update(data).digest('hex');
const normalize = data => Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
const sources = ['docs/lab-04/ai-use.md', 'scripts/lab-04/build-review-report.cjs'];
const files = sources.map(name => {
  const blob = git('show', `${commit}:${name}`);
  return {
    path: name,
    gitBlobOid: git('rev-parse', `${commit}:${name}`).toString('utf8').trim(),
    committedBytes: blob.length,
    committedSha256: sha(blob),
    utf8LfSha256: sha(normalize(blob)),
  };
});
const reportPath = 'artifacts/lab-04/release/lab-4-review-draft.pdf';
const pdf = git('show', `${commit}:${reportPath}`);
const result = {
  sourceCommit: commit,
  sourceReview: 'https://github.com/auto4496/toktickit/pull/51',
  method: 'Read exact Git blob bytes with git show <commit>:<path>. SHA-256 hashes those bytes. utf8LfSha256 decodes UTF-8 and changes CRLF to LF; it performs no trimming or other normalization.',
  scope: 'Supplement to the original workingFileHashes, which describe Windows checkout bytes at report generation. This does not rewrite original report provenance or claim a new render.',
  files,
  report: { path: reportPath, committedBytes: pdf.length, sha256: sha(pdf) },
};
if (process.argv.includes('--write')) {
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
} else {
  const stored = JSON.parse(fs.readFileSync(output, 'utf8'));
  if (JSON.stringify(stored) !== JSON.stringify(result)) throw Error('Committed-source manifest differs from immutable Git blobs');
}
for (const name of sources) {
  const expected = files.find(file => file.path === name);
  if (sha(normalize(fs.readFileSync(path.join(root, name)))) !== expected.utf8LfSha256) throw Error(`Working source differs after LF normalization: ${name}`);
}
if (sha(fs.readFileSync(path.join(root, reportPath))) !== result.report.sha256) throw Error('Working PDF differs from reviewed PDF');
console.log(`Verified ${files.length} committed source blobs and reviewed PDF at ${commit}.`);
