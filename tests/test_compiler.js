const assert = require('assert');
const compiler = require('../devops_compiler.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

console.log('=== DevOpsDSL v4.0 Compiler Test Suite ===');
test('Module 1 (Lexer): Tokenizes keywords, identifiers, literals & comments', () => {
  const lex = new compiler.Lexer('// test\nserver web1 { port = 8080 }').tokenize();
  assert.strictEqual(lex.errors.length, 0);
  assert.strictEqual(lex.metrics.keywordsCount, 1);
});
test('Module 2 (Parser): Builds CFG AST', () => {
  const res = compiler.Pipeline.compile('network n1 { driver = "bridge" }');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.parserResult.metrics.totalResources, 1);
});
test('Module 3 (Semantic): Catches undeclared ref, type mismatch & circular cycle', () => {
  assert.strictEqual(compiler.Pipeline.compile('server w1 { depends_on = [missing] }').success, false);
  assert.strictEqual(compiler.Pipeline.compile('server w1 { port = "eighty" }').success, false);
  assert.strictEqual(compiler.Pipeline.compile('server w1 { depends_on = [db1] } database db1 { depends_on = [w1] }').semanticResult.metrics.cycleDetected, true);
});
test('Module 4 (IR & FinOps): Kahn staging & transitive reduction', () => {
  const res = compiler.Pipeline.compile('network n1 { driver = "bridge" }\ndatabase db1 { image = "postgres:15" port = 5432 depends_on = [n1] }\nserver w1 { image = "nginx:1.25" port = 8080 depends_on = [db1, n1] }', { env: 'prod' });
  assert.deepStrictEqual(res.irResult.linearOrder, ['n1', 'db1', 'w1']);
  assert.ok(res.irResult.prunedEdges.length === 1);
  assert.strictEqual(res.irResult.finops.totalContainers, 3);
});
test('Module 5 (CodeGen) + Linter Auto-Fix + MiniZip', () => {
  const src = 'server w1 {\n  image = "nginx:latest"\n  port = 8080\n}';
  const res = compiler.Pipeline.compile(src);
  assert.ok(res.codeGenResult.terraform.includes('docker_container'));
  const fixed = compiler.Linter.applyAutoFix(src, res.linterResult.findings.find(f => f.code === 'DEV-OPS-002'));
  assert.ok(fixed.includes('nginx:1.25-alpine'));
  const zip = compiler.MiniZip.build([{ name: 'main.tf', content: res.codeGenResult.terraform }]);
  assert.strictEqual(zip[0], 0x50);
  assert.strictEqual(zip[1], 0x4b);
});
console.log(`Completed ${passed} tests cleanly.`);
