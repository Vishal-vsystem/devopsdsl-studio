/**
 * DevOpsDSL: A Domain-Specific Infrastructure Compiler (Enterprise Engine v3.0)
 * Course: Compiler Design (CSA1422) | Dr. K. Pandikumar | Saveetha Engineering College
 * Team: K. Subashree (192522396), Vishwa U (192511192), Vishal Balaji J (192525014),
 *       Divya U (192372277), Ganesh Reddy V (192525262)
 *
 * 5 Core Compiler Modules + DevOps Innovation Engine:
 *  - Module 1: Lexical Analysis (DFA Tokenizer, Position/Offset Tracking, Comment Tokens)
 *  - Module 2: Syntax Analysis (Recursive Descent CFG Parser, Rich AST)
 *  - Module 3: Semantic Analysis (Symbol Table, Strict Type Checking, Cycle Detection)
 *  - Module 4: Intermediate Representation & Optimization (DAG, Kahn's Topological Sort, FinOps)
 *  - Module 5: Multi-Target Code Generation (Terraform HCL, Docker Compose, Kubernetes, Ansible)
 *  - Shift-Left DevOps Linter + One-Click Auto-Remediation + Cloud Resource Estimator
 *  - Syntax Highlighters for DSL, HCL, YAML, JSON
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DevOpsCompiler = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // =========================================================================
  // MODULE 1: LEXICAL ANALYSIS (DFA TOKENIZER)
  // =========================================================================
  class DevOpsLexer {
    constructor(source) {
      this.source = source || '';
      this.length = this.source.length;
      this.cursor = 0;
      this.line = 1;
      this.col = 1;
      this.tokens = [];
      this.errors = [];
      this.comments = [];
      this.keywords = new Set([
        'server', 'database', 'network', 'volume', 'cache',
        'loadbalancer', 'service', 'storage', 'gateway', 'queue'
      ]);
      this.booleans = new Set(['true', 'false']);
    }

    tokenize() {
      while (this.cursor < this.length) {
        const ch = this.source[this.cursor];

        if (ch === ' ' || ch === '\t' || ch === '\r') {
          this.advance();
          continue;
        }

        if (ch === '\n') {
          this.cursor++;
          this.line++;
          this.col = 1;
          continue;
        }

        if ((ch === '/' && this.peek() === '/') || ch === '#') {
          this.skipSingleLineComment();
          continue;
        }

        if (ch === '/' && this.peek() === '*') {
          this.skipMultiLineComment();
          continue;
        }

        const startLine = this.line;
        const startCol = this.col;
        const startOffset = this.cursor;

        const delimiters = {
          '{': 'LBRACE',
          '}': 'RBRACE',
          '[': 'LBRACKET',
          ']': 'RBRACKET',
          ',': 'COMMA',
          ':': 'COLON'
        };

        if (delimiters[ch]) {
          this.tokens.push({
            type: delimiters[ch],
            value: ch,
            line: startLine,
            col: startCol,
            startOffset,
            endOffset: startOffset + 1,
            category: 'delimiter'
          });
          this.advance();
          continue;
        }

        if (ch === '=') {
          this.tokens.push({
            type: 'ASSIGN',
            value: '=',
            line: startLine,
            col: startCol,
            startOffset,
            endOffset: startOffset + 1,
            category: 'operator'
          });
          this.advance();
          continue;
        }

        if (this.isDigit(ch)) {
          this.tokens.push(this.readNumber(startLine, startCol, startOffset));
          continue;
        }

        if (ch === '"' || ch === "'") {
          this.tokens.push(this.readString(ch, startLine, startCol, startOffset));
          continue;
        }

        if (this.isAlpha(ch) || ch === '_') {
          this.tokens.push(this.readIdentifierOrKeyword(startLine, startCol, startOffset));
          continue;
        }

        this.errors.push({
          phase: 'Lexical Analysis',
          line: startLine,
          col: startCol,
          message: `Lexical Error (L${startLine}:C${startCol}): Unexpected character '${ch}' (0x${ch.charCodeAt(0).toString(16)})`
        });
        this.advance();
      }

      this.tokens.push({
        type: 'EOF',
        value: '<EOF>',
        line: this.line,
        col: this.col,
        startOffset: this.cursor,
        endOffset: this.cursor,
        category: 'control'
      });

      return {
        tokens: this.tokens,
        errors: this.errors,
        comments: this.comments,
        metrics: {
          totalTokens: this.tokens.length,
          sourceLength: this.length,
          totalLines: this.line,
          keywordsCount: this.tokens.filter(t => t.type === 'KEYWORD').length,
          identifiersCount: this.tokens.filter(t => t.type === 'IDENT').length,
          literalsCount: this.tokens.filter(t => ['NUMBER', 'STRING', 'BOOL'].includes(t.type)).length,
          commentsStripped: this.comments.length
        }
      };
    }

    advance() {
      this.cursor++;
      this.col++;
    }

    peek(offset = 1) {
      return this.cursor + offset < this.length ? this.source[this.cursor + offset] : '\0';
    }

    isDigit(ch) {
      return ch >= '0' && ch <= '9';
    }

    isAlpha(ch) {
      return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
    }

    isAlphaNumeric(ch) {
      return this.isAlpha(ch) || this.isDigit(ch) || ch === '_' || ch === '-';
    }

    skipSingleLineComment() {
      const line = this.line;
      let txt = '';
      while (this.cursor < this.length && this.source[this.cursor] !== '\n') {
        txt += this.source[this.cursor];
        this.advance();
      }
      this.comments.push({ line, text: txt.trim() });
    }

    skipMultiLineComment() {
      const startLine = this.line;
      let txt = '';
      this.advance();
      this.advance();
      while (this.cursor < this.length) {
        if (this.source[this.cursor] === '*' && this.peek() === '/') {
          this.advance();
          this.advance();
          this.comments.push({ line: startLine, text: txt.trim() });
          return;
        }
        if (this.source[this.cursor] === '\n') {
          this.line++;
          this.col = 1;
          this.cursor++;
          txt += '\n';
        } else {
          txt += this.source[this.cursor];
          this.advance();
        }
      }
      this.errors.push({
        phase: 'Lexical Analysis',
        line: startLine,
        col: 1,
        message: `Unterminated multi-line comment starting at line ${startLine}`
      });
    }

    readNumber(startLine, startCol, startOffset) {
      let numStr = '';
      while (this.cursor < this.length && (this.isDigit(this.source[this.cursor]) || this.source[this.cursor] === '.')) {
        numStr += this.source[this.cursor];
        this.advance();
      }
      const val = numStr.includes('.') ? parseFloat(numStr) : parseInt(numStr, 10);
      return {
        type: 'NUMBER',
        value: val,
        raw: numStr,
        line: startLine,
        col: startCol,
        startOffset,
        endOffset: this.cursor,
        category: 'literal'
      };
    }

    readString(quoteChar, startLine, startCol, startOffset) {
      this.advance();
      let str = '';
      let closed = false;
      while (this.cursor < this.length) {
        const ch = this.source[this.cursor];
        if (ch === '\\') {
          this.advance();
          if (this.cursor < this.length) {
            const esc = this.source[this.cursor];
            if (esc === 'n') str += '\n';
            else if (esc === 't') str += '\t';
            else str += esc;
            this.advance();
          }
          continue;
        }
        if (ch === quoteChar) {
          this.advance();
          closed = true;
          break;
        }
        if (ch === '\n') {
          break; // unclosed string on line
        }
        str += ch;
        this.advance();
      }

      if (!closed) {
        this.errors.push({
          phase: 'Lexical Analysis',
          line: startLine,
          col: startCol,
          message: `Unterminated string literal at line ${startLine}, col ${startCol}`
        });
      }

      return {
        type: 'STRING',
        value: str,
        raw: `${quoteChar}${str}${quoteChar}`,
        line: startLine,
        col: startCol,
        startOffset,
        endOffset: this.cursor,
        category: 'literal'
      };
    }

    readIdentifierOrKeyword(startLine, startCol, startOffset) {
      let ident = '';
      while (this.cursor < this.length && this.isAlphaNumeric(this.source[this.cursor])) {
        ident += this.source[this.cursor];
        this.advance();
      }

      const lower = ident.toLowerCase();
      if (this.keywords.has(lower)) {
        return {
          type: 'KEYWORD',
          value: lower,
          line: startLine,
          col: startCol,
          startOffset,
          endOffset: this.cursor,
          category: 'keyword'
        };
      }
      if (this.booleans.has(lower)) {
        return {
          type: 'BOOL',
          value: lower === 'true',
          raw: lower,
          line: startLine,
          col: startCol,
          startOffset,
          endOffset: this.cursor,
          category: 'literal'
        };
      }
      return {
        type: 'IDENT',
        value: ident,
        line: startLine,
        col: startCol,
        startOffset,
        endOffset: this.cursor,
        category: 'identifier'
      };
    }
  }

  // =========================================================================
  // MODULE 2: SYNTAX ANALYSIS (RECURSIVE DESCENT CFG PARSER)
  // =========================================================================
  class DevOpsParser {
    constructor(tokens) {
      this.tokens = tokens || [];
      this.cursor = 0;
      this.errors = [];
      this.rulesApplied = new Set();
      this.ruleCount = 0;
    }

    current() {
      return this.tokens[this.cursor] || { type: 'EOF', value: '<EOF>', line: 0, col: 0 };
    }

    advance() {
      const token = this.current();
      if (token.type !== 'EOF') this.cursor++;
      return token;
    }

    match(expectedType) {
      const token = this.current();
      if (token.type === expectedType) return this.advance();
      return null;
    }

    expect(expectedType, contextDescription) {
      const token = this.current();
      if (token.type === expectedType) return this.advance();
      this.errors.push({
        phase: 'Syntax Analysis',
        line: token.line,
        col: token.col,
        message: `Syntax Error (L${token.line}:C${token.col}): Expected '${expectedType}' ${contextDescription || ''}, got '${token.value || token.type}'`
      });
      return null;
    }

    recordRule(rule) {
      this.rulesApplied.add(rule);
      this.ruleCount++;
    }

    parse() {
      this.recordRule('program -> resource*');
      const ast = {
        type: 'Program',
        line: 1,
        col: 1,
        resources: []
      };

      while (this.current().type !== 'EOF') {
        if (this.current().type === 'KEYWORD') {
          const resNode = this.parseResource();
          if (resNode) ast.resources.push(resNode);
        } else {
          const tok = this.current();
          this.errors.push({
            phase: 'Syntax Analysis',
            line: tok.line,
            col: tok.col,
            message: `Syntax Error (L${tok.line}:C${tok.col}): Unexpected token '${tok.value}' outside resource block. Expected server, database, network, volume, or cache.`
          });
          this.advance();
        }
      }

      return {
        ast,
        errors: this.errors,
        rulesApplied: Array.from(this.rulesApplied),
        ruleInvocations: this.ruleCount,
        metrics: {
          totalResources: ast.resources.length,
          astNodeCount: this.countAstNodes(ast),
          maxDepth: this.calculateAstDepth(ast)
        }
      };
    }

    parseResource() {
      this.recordRule("resource -> TYPE ID '{' attr* '}'");
      const typeToken = this.advance();
      const nameToken = this.match('IDENT');

      if (!nameToken) {
        this.errors.push({
          phase: 'Syntax Analysis',
          line: typeToken.line,
          col: typeToken.col,
          message: `Syntax Error (L${typeToken.line}): Missing identifier name after resource type '${typeToken.value}'`
        });
        this.synchronizeToNextResource();
        return null;
      }

      const lbrace = this.expect('LBRACE', `to open block for '${nameToken.value}'`);
      if (!lbrace) {
        this.synchronizeToNextResource();
        return null;
      }

      const attributes = [];
      while (this.current().type !== 'RBRACE' && this.current().type !== 'EOF') {
        const attr = this.parseAttribute();
        if (attr) attributes.push(attr);
        else this.advance();
      }

      const rbrace = this.expect('RBRACE', `to close block for '${nameToken.value}'`);

      return {
        type: 'ResourceDeclaration',
        resourceType: typeToken.value,
        name: nameToken.value,
        line: typeToken.line,
        col: typeToken.col,
        attributes,
        endLine: rbrace ? rbrace.line : this.current().line
      };
    }

    parseAttribute() {
      this.recordRule("attr -> ID '=' value");
      const keyToken = this.match('IDENT');
      if (!keyToken) {
        const tok = this.current();
        this.errors.push({
          phase: 'Syntax Analysis',
          line: tok.line,
          col: tok.col,
          message: `Syntax Error (L${tok.line}): Expected attribute identifier, found '${tok.value}'`
        });
        return null;
      }

      if (!this.expect('ASSIGN', `after attribute '${keyToken.value}'`)) {
        return null;
      }

      const valueNode = this.parseValue();
      if (!valueNode) return null;

      return {
        type: 'Attribute',
        key: keyToken.value,
        value: valueNode,
        line: keyToken.line,
        col: keyToken.col
      };
    }

    parseValue() {
      const tok = this.current();
      if (tok.type === 'NUMBER') {
        this.recordRule('value -> NUMBER');
        this.advance();
        return { type: 'NumberLiteral', value: tok.value, raw: tok.raw, line: tok.line, col: tok.col };
      }
      if (tok.type === 'STRING') {
        this.recordRule('value -> STRING');
        this.advance();
        return { type: 'StringLiteral', value: tok.value, line: tok.line, col: tok.col };
      }
      if (tok.type === 'BOOL') {
        this.recordRule('value -> BOOL');
        this.advance();
        return { type: 'BooleanLiteral', value: tok.value, line: tok.line, col: tok.col };
      }
      if (tok.type === 'LBRACKET') {
        return this.parseList();
      }
      if (tok.type === 'IDENT') {
        this.recordRule('value -> ID');
        this.advance();
        return { type: 'IdentifierReference', name: tok.value, line: tok.line, col: tok.col };
      }

      this.errors.push({
        phase: 'Syntax Analysis',
        line: tok.line,
        col: tok.col,
        message: `Syntax Error (L${tok.line}): Invalid value '${tok.value}'. Expected NUMBER, STRING, BOOL, list or ID.`
      });
      return null;
    }

    parseList() {
      this.recordRule("list -> '[' value (',' value)* ']'");
      const lbracket = this.advance();
      const elements = [];

      if (this.current().type !== 'RBRACKET') {
        const firstVal = this.parseValue();
        if (firstVal) elements.push(firstVal);
        while (this.current().type === 'COMMA') {
          this.advance();
          if (this.current().type === 'RBRACKET') break;
          const nextVal = this.parseValue();
          if (nextVal) elements.push(nextVal);
        }
      }

      this.expect('RBRACKET', 'to close list literal');
      return { type: 'ListLiteral', elements, line: lbracket.line, col: lbracket.col };
    }

    synchronizeToNextResource() {
      while (this.current().type !== 'EOF') {
        if (this.current().type === 'KEYWORD') return;
        if (this.current().type === 'RBRACE') {
          this.advance();
          return;
        }
        this.advance();
      }
    }

    countAstNodes(node) {
      if (!node) return 0;
      let count = 1;
      if (node.resources) node.resources.forEach(r => count += this.countAstNodes(r));
      if (node.attributes) node.attributes.forEach(a => count += this.countAstNodes(a));
      if (node.value) count += this.countAstNodes(node.value);
      if (node.elements) node.elements.forEach(e => count += this.countAstNodes(e));
      return count;
    }

    calculateAstDepth(node) {
      if (!node) return 0;
      let maxSub = 0;
      if (node.resources) node.resources.forEach(r => maxSub = Math.max(maxSub, this.calculateAstDepth(r)));
      if (node.attributes) node.attributes.forEach(a => maxSub = Math.max(maxSub, this.calculateAstDepth(a)));
      if (node.value) maxSub = Math.max(maxSub, this.calculateAstDepth(node.value));
      if (node.elements) node.elements.forEach(e => maxSub = Math.max(maxSub, this.calculateAstDepth(e)));
      return 1 + maxSub;
    }
  }

  // =========================================================================
  // MODULE 3: SEMANTIC ANALYSIS & SYMBOL TABLE
  // =========================================================================
  class DevOpsSemanticAnalyzer {
    constructor(ast, options = {}) {
      this.ast = ast || { resources: [] };
      this.env = options.env || 'dev';
      this.symbolTable = new Map();
      this.errors = [];
      this.warnings = [];
      this.referenceChecks = [];
      this.typeChecks = [];
    }

    analyze() {
      // 1. Build Global Symbol Table & catch duplicate identifiers
      for (const res of this.ast.resources) {
        if (this.symbolTable.has(res.name)) {
          const existing = this.symbolTable.get(res.name);
          this.errors.push({
            phase: 'Semantic Analysis',
            line: res.line,
            col: res.col,
            message: `Duplicate resource declaration: '${res.name}' already defined at line ${existing.line}`
          });
        } else {
          const attrMap = {};
          for (const attr of res.attributes) attrMap[attr.key] = attr.value;

          this.symbolTable.set(res.name, {
            name: res.name,
            type: res.resourceType,
            line: res.line,
            endLine: res.endLine || res.line,
            col: res.col,
            attributes: attrMap,
            rawAttributes: res.attributes,
            dependencies: []
          });
        }
      }

      // 2. Strict Attribute Type Checking & Symbol Reference Validation
      for (const [name, sym] of this.symbolTable.entries()) {
        const deps = [];
        const seenDeps = new Set();

        for (const [key, valNode] of Object.entries(sym.attributes)) {
          if (key === 'port') {
            const ok = valNode.type === 'NumberLiteral' && Number.isInteger(valNode.value) && valNode.value >= 1 && valNode.value <= 65535;
            this.typeChecks.push({ resource: name, attribute: 'port', expected: 'int (1..65535)', got: valNode.type, passed: ok, line: valNode.line });
            if (valNode.type !== 'NumberLiteral' || !Number.isInteger(valNode.value)) {
              const gotDesc = valNode.type === 'StringLiteral' ? `string "${valNode.value}"` : valNode.type;
              this.errors.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `error: line ${valNode.line}: port expects int, got ${gotDesc}`
              });
            } else if (valNode.value < 1 || valNode.value > 65535) {
              this.errors.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `error: line ${valNode.line}: port number ${valNode.value} out of valid TCP/UDP range [1..65535]`
              });
            }
          }

          if (key === 'replicas') {
            const ok = valNode.type === 'NumberLiteral' && Number.isInteger(valNode.value) && valNode.value >= 1;
            this.typeChecks.push({ resource: name, attribute: 'replicas', expected: 'int (>=1)', got: valNode.type, passed: ok, line: valNode.line });
            if (!ok) {
              this.errors.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `error: line ${valNode.line}: replicas expects positive integer, got ${valNode.value}`
              });
            }
          }

          if (key === 'image' || key === 'driver' || key === 'restart' || key === 'cpu' || key === 'memory' || key === 'healthcheck') {
            const ok = valNode.type === 'StringLiteral';
            this.typeChecks.push({ resource: name, attribute: key, expected: 'string', got: valNode.type, passed: ok, line: valNode.line });
            if (!ok) {
              this.errors.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `error: line ${valNode.line}: ${key} expects string, got ${valNode.type}`
              });
            }
            if (key === 'driver' && sym.type !== 'network' && sym.type !== 'volume' && sym.type !== 'storage') {
              this.warnings.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `warning: line ${valNode.line}: 'driver' ignored for '${sym.type}' resource`
              });
            }
          }

          if (key === 'env') {
            const ok = valNode.type === 'ListLiteral' || valNode.type === 'StringLiteral';
            this.typeChecks.push({ resource: name, attribute: 'env', expected: 'list<string> | string', got: valNode.type, passed: ok, line: valNode.line });
            if (!ok) {
              this.errors.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `error: line ${valNode.line}: env expects string list ["KEY=VAL"], got ${valNode.type}`
              });
            }
          }

          // Reference attributes
          if (key === 'depends_on' || key === 'network' || key === 'networks' || key === 'volume' || key === 'storage') {
            const pushDep = (refName, ln, cl) => {
              if (!seenDeps.has(refName)) {
                seenDeps.add(refName);
                deps.push({ name: refName, line: ln, col: cl, via: key });
              }
            };
            if (valNode.type === 'IdentifierReference') {
              pushDep(valNode.name, valNode.line, valNode.col);
            } else if (valNode.type === 'ListLiteral') {
              for (const el of valNode.elements) {
                if (el.type === 'IdentifierReference') pushDep(el.name, el.line, el.col);
                else if (el.type === 'StringLiteral') pushDep(el.value, el.line, el.col);
                else {
                  this.errors.push({
                    phase: 'Semantic Analysis',
                    line: el.line,
                    col: el.col,
                    message: `error: line ${el.line}: ${key} list elements must be declared resource identifiers`
                  });
                }
              }
            } else if (key === 'depends_on') {
              this.errors.push({
                phase: 'Semantic Analysis',
                line: valNode.line,
                col: valNode.col,
                message: `error: line ${valNode.line}: depends_on expects identifier or list [id1, id2]`
              });
            }
          }
        }

        // Verify referenced symbols exist in Global Symbol Table
        for (const dep of deps) {
          const exists = this.symbolTable.has(dep.name);
          this.referenceChecks.push({
            from: name,
            to: dep.name,
            via: dep.via,
            line: dep.line,
            resolved: exists && dep.name !== name
          });

          if (!exists) {
            this.errors.push({
              phase: 'Semantic Analysis',
              line: dep.line,
              col: dep.col,
              message: `error: line ${dep.line}: '${dep.name}' is not declared`
            });
          } else if (dep.name === name) {
            this.errors.push({
              phase: 'Semantic Analysis',
              line: dep.line,
              col: dep.col,
              message: `error: line ${dep.line}: circular dependency: resource '${name}' cannot depend on itself`
            });
          } else {
            sym.dependencies.push(dep.name);
          }
        }
      }

      // 3. Circular dependency DFS cycle check
      const cycleErrors = this.detectCircularDependencies();
      this.errors.push(...cycleErrors);

      return {
        symbolTable: Array.from(this.symbolTable.values()),
        symbolMap: this.symbolTable,
        errors: this.errors,
        warnings: this.warnings,
        referenceChecks: this.referenceChecks,
        typeChecks: this.typeChecks,
        metrics: {
          totalSymbols: this.symbolTable.size,
          errorCount: this.errors.length,
          warningCount: this.warnings.length,
          cycleDetected: cycleErrors.length > 0,
          isSemanticallyValid: this.errors.length === 0
        }
      };
    }

    detectCircularDependencies() {
      const cycleErrors = [];
      const visited = new Map();
      const path = [];
      const reportedCycles = new Set();

      for (const name of this.symbolTable.keys()) visited.set(name, 0);

      const dfs = (nodeName) => {
        visited.set(nodeName, 1);
        path.push(nodeName);
        const node = this.symbolTable.get(nodeName);
        if (node) {
          for (const dep of node.dependencies) {
            const state = visited.get(dep);
            if (state === 1) {
              const idx = path.indexOf(dep);
              const cyclePath = path.slice(idx).concat(dep).join(' -> ');
              if (!reportedCycles.has(cyclePath)) {
                reportedCycles.add(cyclePath);
                cycleErrors.push({
                  phase: 'Semantic Analysis',
                  line: node.line,
                  col: node.col,
                  message: `error: circular dependency: ${cyclePath}`
                });
              }
            } else if (state === 0) {
              dfs(dep);
            }
          }
        }
        path.pop();
        visited.set(nodeName, 2);
      };

      for (const name of this.symbolTable.keys()) {
        if (visited.get(name) === 0) dfs(name);
      }
      return cycleErrors;
    }
  }

  // =========================================================================
  // MODULE 4: INTERMEDIATE REPRESENTATION, OPTIMIZATION & FINOPS ESTIMATOR
  // =========================================================================
  class DevOpsIROptimizer {
    constructor(symbolMap, options = {}) {
      this.symbolMap = symbolMap || new Map();
      this.env = options.env || 'dev';
      this.graph = new Map();
      this.stages = [];
      this.linearOrder = [];
      this.optimizations = [];
      this.prunedEdges = [];
    }

    buildIR() {
      for (const [name, sym] of this.symbolMap.entries()) {
        this.graph.set(name, {
          name,
          type: sym.type,
          line: sym.line,
          attributes: this.normalizeAttributes(sym.attributes),
          dependencies: [...sym.dependencies],
          inDegree: 0,
          edgesOut: [],
          edgesIn: []
        });
      }

      for (const [name, node] of this.graph.entries()) {
        for (const depName of node.dependencies) {
          const depNode = this.graph.get(depName);
          if (depNode) {
            depNode.edgesIn.push(name);
            node.edgesOut.push(depName);
            node.inDegree++;
          }
        }
      }

      this.runOptimizationPasses();
      this.computeTopologicalStages();
      const finops = this.computeResourceFootprint();

      return {
        graph: this.graph,
        stages: this.stages,
        linearOrder: this.linearOrder,
        optimizations: this.optimizations,
        prunedEdges: this.prunedEdges,
        finops,
        env: this.env,
        metrics: {
          vertices: this.graph.size,
          edges: Array.from(this.graph.values()).reduce((sum, n) => sum + n.dependencies.length, 0),
          totalStages: this.stages.length,
          optimizationsCount: this.optimizations.length
        }
      };
    }

    normalizeAttributes(rawAttrs) {
      const normalized = {};
      for (const [k, v] of Object.entries(rawAttrs)) {
        if (v.type === 'NumberLiteral' || v.type === 'StringLiteral' || v.type === 'BooleanLiteral') {
          normalized[k] = v.value;
        } else if (v.type === 'IdentifierReference') {
          normalized[k] = v.name;
        } else if (v.type === 'ListLiteral') {
          normalized[k] = v.elements.map(e => (e.value !== undefined ? e.value : (e.name || e.raw)));
        } else {
          normalized[k] = v.value;
        }
      }
      return normalized;
    }

    runOptimizationPasses() {
      for (const [name, node] of this.graph.entries()) {
        // 1. Constant Normalization: port -> [host:container]
        if (node.attributes.port && !node.attributes.ports) {
          const p = node.attributes.port;
          const containerPort = p === 8080 ? 80 : p;
          node.attributes.ports = [`${p}:${containerPort}`];
          this.optimizations.push({
            pass: 'Constant Normalization',
            target: name,
            description: `Synthesized port mapping [${p}:${containerPort}] from scalar port ${p}`
          });
        }

        // 2. Environment-aware Defaults & Policy Synthesis
        const isWorkload = !['network', 'volume', 'storage'].includes(node.type);
        if (isWorkload) {
          if (!node.attributes.restart) {
            node.attributes.restart = 'unless-stopped';
            this.optimizations.push({
              pass: 'Policy Synthesis',
              target: name,
              description: "Injected resilient restart policy: 'unless-stopped'"
            });
          }

          if (!node.attributes.healthcheck) {
            const defaultHc = node.type === 'database'
              ? 'pg_isready -U postgres'
              : (node.type === 'cache' ? 'redis-cli ping' : 'curl -f http://localhost/ || exit 1');
            node.attributes.healthcheck = defaultHc;
            this.optimizations.push({
              pass: 'Resilience Injection',
              target: name,
              description: `Synthesized health probe: "${defaultHc}"`
            });
          }

          // Production profile auto-scaling replicas if omitted
          if (this.env === 'prod' && (node.type === 'server' || node.type === 'gateway' || node.type === 'loadbalancer')) {
            if (!node.attributes.replicas || node.attributes.replicas < 2) {
              node.attributes.replicas = 2;
              this.optimizations.push({
                pass: 'Env Overlay (PROD)',
                target: name,
                description: 'Scaled minimum replicas to 2 for zero-downtime High Availability'
              });
            }
          }

          // CPU/Memory limit injection
          if (!node.attributes.memory) {
            node.attributes.memory = node.type === 'database' ? (this.env === 'prod' ? '2048m' : '1024m') : '512m';
            this.optimizations.push({
              pass: 'Resource Quotas',
              target: name,
              description: `Applied memory limit ${node.attributes.memory} (${this.env.toUpperCase()} profile)`
            });
          }
          if (!node.attributes.cpu) {
            node.attributes.cpu = node.type === 'database' ? '1000m' : '500m';
          }
        }
      }

      // 3. Transitive Dependency Reduction
      // Build transitive closure to prune redundant direct edges accurately
      const canReach = (start, target, visited = new Set()) => {
        const startNode = this.graph.get(start);
        if (!startNode) return false;
        for (const next of startNode.dependencies) {
          if (next === target) return true;
          if (!visited.has(next)) {
            visited.add(next);
            if (canReach(next, target, visited)) return true;
          }
        }
        return false;
      };

      for (const [aName, aNode] of this.graph.entries()) {
        const depsCopy = [...aNode.dependencies];
        for (const cName of depsCopy) {
          // Check if any OTHER direct dependency bName reaches cName
          const subsumedBy = depsCopy.find(bName => bName !== cName && canReach(bName, cName));
          if (subsumedBy) {
            const idx = aNode.dependencies.indexOf(cName);
            if (idx !== -1) {
              aNode.dependencies.splice(idx, 1);
              aNode.inDegree = Math.max(0, aNode.inDegree - 1);
              this.prunedEdges.push({ from: aName, to: cName, via: subsumedBy });
              this.optimizations.push({
                pass: 'Transitive Reduction',
                target: aName,
                description: `Pruned redundant edge ${aName} -> ${cName} (subsumed via ${subsumedBy})`
              });
            }
          }
        }
      }
    }

    computeTopologicalStages() {
      const inDegrees = new Map();
      const childrenMap = new Map();

      for (const [name, node] of this.graph.entries()) {
        inDegrees.set(name, node.dependencies.length);
        childrenMap.set(name, []);
      }

      for (const [name, node] of this.graph.entries()) {
        for (const dep of node.dependencies) {
          if (childrenMap.has(dep)) childrenMap.get(dep).push(name);
        }
      }

      let currentQueue = [];
      for (const [name, deg] of inDegrees.entries()) {
        if (deg === 0) currentQueue.push(name);
      }

      let stageIndex = 1;
      while (currentQueue.length > 0) {
        currentQueue.sort();
        this.stages.push({
          stageNumber: stageIndex,
          stageName: `Stage ${stageIndex}`,
          resources: [...currentQueue]
        });
        this.linearOrder.push(...currentQueue);

        const nextQueue = [];
        for (const parent of currentQueue) {
          for (const child of childrenMap.get(parent)) {
            const newDeg = inDegrees.get(child) - 1;
            inDegrees.set(child, newDeg);
            if (newDeg === 0) nextQueue.push(child);
          }
        }
        currentQueue = nextQueue;
        stageIndex++;
      }
    }

    computeResourceFootprint() {
      let totalContainers = 0;
      let totalCpuMillicores = 0;
      let totalMemoryMb = 0;
      const exposedPorts = [];
      const breakdown = [];

      for (const name of this.linearOrder) {
        const node = this.graph.get(name);
        if (['network', 'volume', 'storage'].includes(node.type)) continue;
        const replicas = parseInt(node.attributes.replicas || 1, 10);
        const cpuStr = String(node.attributes.cpu || '500m');
        const memStr = String(node.attributes.memory || '512m');
        const cpuVal = cpuStr.endsWith('m') ? parseInt(cpuStr, 10) : parseFloat(cpuStr) * 1000;
        const memVal = memStr.toLowerCase().endsWith('g') ? parseFloat(memStr) * 1024 : parseInt(memStr, 10);

        totalContainers += replicas;
        totalCpuMillicores += cpuVal * replicas;
        totalMemoryMb += memVal * replicas;

        if (node.attributes.port) {
          exposedPorts.push({ resource: name, port: node.attributes.port });
        }

        const monthlyUsd = ((cpuVal / 1000) * 14.5 + (memVal / 1024) * 5.2) * replicas;
        breakdown.push({
          name,
          type: node.type,
          replicas,
          cpuPerPod: `${cpuVal}m`,
          memPerPod: `${memVal}Mi`,
          estMonthlyUsd: monthlyUsd.toFixed(2)
        });
      }

      const estMonthlyTotalUsd = breakdown.reduce((acc, b) => acc + parseFloat(b.estMonthlyUsd), 0);

      return {
        totalResources: this.graph.size,
        totalContainers,
        totalVcpu: (totalCpuMillicores / 1000).toFixed(2),
        totalMemoryGb: (totalMemoryMb / 1024).toFixed(2),
        exposedPorts,
        estMonthlyTotalUsd: estMonthlyTotalUsd.toFixed(2),
        breakdown
      };
    }
  }

  // =========================================================================
  // MODULE 5: MULTI-TARGET CODE GENERATION
  // =========================================================================
  class DevOpsCodeGenerator {
    constructor(irResult) {
      this.graph = irResult.graph;
      this.stages = irResult.stages;
      this.linearOrder = irResult.linearOrder;
      this.env = irResult.env || 'dev';
    }

    generateAll() {
      const terraform = this.generateTerraform();
      const dockerCompose = this.generateDockerCompose();
      const kubernetes = this.generateKubernetes();
      const ansible = this.generateAnsible();
      const githubActions = this.generateGitHubActions();

      return {
        terraform,
        dockerCompose,
        kubernetes,
        ansible,
        githubActions,
        metadata: {
          provisioningOrder: this.linearOrder,
          stagesCount: this.stages.length,
          resourceCount: this.graph.size,
          lineCounts: {
            terraform: terraform.split('\n').length,
            dockerCompose: dockerCompose.split('\n').length,
            kubernetes: kubernetes.split('\n').length,
            ansible: ansible.split('\n').length,
            githubActions: githubActions.split('\n').length
          }
        }
      };
    }

    generateTerraform() {
      const lines = [
        '# =========================================================================',
        `# DevOpsDSL Compiled Terraform HCL (${this.env.toUpperCase()} environment)`,
        '# Course: Compiler Design (CSA1422) | Saveetha Engineering College',
        '# =========================================================================\n',
        'terraform {',
        '  required_version = ">= 1.6.0"',
        '  required_providers {',
        '    docker = {',
        '      source  = "kreuzwerker/docker"',
        '      version = "~> 3.0.2"',
        '    }',
        '  }',
        '}\n',
        'provider "docker" {}\n'
      ];

      for (const name of this.linearOrder) {
        const node = this.graph.get(name);
        if (node.type === 'network') {
          lines.push(`resource "docker_network" "${name}" {`);
          lines.push(`  name   = "${name}_${this.env}"`);
          lines.push(`  driver = "${node.attributes.driver || 'bridge'}"`);
          lines.push('}\n');
        } else if (node.type === 'volume' || node.type === 'storage') {
          lines.push(`resource "docker_volume" "${name}" {`);
          lines.push(`  name   = "${name}_${this.env}"`);
          lines.push(`  driver = "${node.attributes.driver || 'local'}"`);
          lines.push('}\n');
        }
      }

      for (const name of this.linearOrder) {
        const node = this.graph.get(name);
        if (['network', 'volume', 'storage'].includes(node.type)) continue;

        lines.push(`resource "docker_image" "img_${name}" {`);
        lines.push(`  name         = "${node.attributes.image || name + ':latest'}"`);
        lines.push('  keep_locally = true');
        lines.push('}\n');

        lines.push(`resource "docker_container" "${name}" {`);
        lines.push(`  name    = "${name}-${this.env}"`);
        lines.push(`  image   = docker_image.img_${name}.image_id`);
        lines.push(`  restart = "${node.attributes.restart || 'unless-stopped'}"`);

        if (node.attributes.port) {
          const internal = node.attributes.port === 8080 ? 80 : node.attributes.port;
          lines.push('  ports {');
          lines.push(`    internal = ${internal}`);
          lines.push(`    external = ${node.attributes.port}`);
          lines.push('  }');
        }

        if (node.attributes.env && Array.isArray(node.attributes.env)) {
          lines.push(`  env = ${JSON.stringify(node.attributes.env)}`);
        }

        if (node.dependencies.length > 0) {
          lines.push('  depends_on = [');
          for (const dep of node.dependencies) {
            const depNode = this.graph.get(dep);
            if (depNode.type === 'network') lines.push(`    docker_network.${dep},`);
            else if (depNode.type === 'volume' || depNode.type === 'storage') lines.push(`    docker_volume.${dep},`);
            else lines.push(`    docker_container.${dep},`);
          }
          lines.push('  ]');
        }
        lines.push('}\n');
      }

      return lines.join('\n');
    }

    generateDockerCompose() {
      const lines = [
        `# DevOpsDSL Synthesized Docker Compose (${this.env.toUpperCase()} environment)`,
        '# Topological Deployment Ordering Verified by Module 4 (IR Optimizer)',
        "version: '3.8'\n",
        'services:'
      ];

      for (const name of this.linearOrder) {
        const node = this.graph.get(name);
        if (['network', 'volume', 'storage'].includes(node.type)) continue;

        lines.push(`  ${name}:`);
        lines.push(`    container_name: ${name}_${this.env}`);
        lines.push(`    image: ${node.attributes.image || name + ':latest'}`);
        lines.push(`    restart: ${node.attributes.restart || 'unless-stopped'}`);

        if (node.attributes.ports && node.attributes.ports.length > 0) {
          lines.push('    ports:');
          node.attributes.ports.forEach(p => lines.push(`      - "${p}"`));
        }

        if (node.attributes.env && Array.isArray(node.attributes.env)) {
          lines.push('    environment:');
          node.attributes.env.forEach(e => lines.push(`      - ${e}`));
        }

        const netDeps = node.dependencies.filter(d => this.graph.get(d)?.type === 'network');
        if (netDeps.length > 0) {
          lines.push('    networks:');
          netDeps.forEach(n => lines.push(`      - ${n}`));
        }

        const svcDeps = node.dependencies.filter(d => {
          const t = this.graph.get(d)?.type;
          return t && !['network', 'volume', 'storage'].includes(t);
        });
        if (svcDeps.length > 0) {
          lines.push('    depends_on:');
          svcDeps.forEach(d => lines.push(`      - ${d}`));
        }

        if (node.attributes.healthcheck) {
          lines.push('    healthcheck:');
          lines.push(`      test: ["CMD-SHELL", "${node.attributes.healthcheck}"]`);
          lines.push('      interval: 30s');
          lines.push('      timeout: 10s');
          lines.push('      retries: 3');
        }
        lines.push('');
      }

      const networks = Array.from(this.graph.values()).filter(n => n.type === 'network');
      if (networks.length > 0) {
        lines.push('networks:');
        networks.forEach(net => {
          lines.push(`  ${net.name}:`);
          lines.push(`    driver: ${net.attributes.driver || 'bridge'}`);
        });
        lines.push('');
      }

      const volumes = Array.from(this.graph.values()).filter(n => n.type === 'volume' || n.type === 'storage');
      if (volumes.length > 0) {
        lines.push('volumes:');
        volumes.forEach(vol => {
          lines.push(`  ${vol.name}:`);
          lines.push(`    driver: ${vol.attributes.driver || 'local'}`);
        });
        lines.push('');
      }

      return lines.join('\n');
    }

    generateKubernetes() {
      const docs = [];

      for (const name of this.linearOrder) {
        const node = this.graph.get(name);
        if (['network', 'volume', 'storage'].includes(node.type)) continue;

        const port = node.attributes.port || 80;
        const targetPort = port === 8080 ? 80 : port;
        const replicas = node.attributes.replicas || 1;
        const memLimit = node.attributes.memory || '512m';
        const cpuLimit = node.attributes.cpu || '500m';

        const depLines = [
          'apiVersion: apps/v1',
          'kind: Deployment',
          'metadata:',
          `  name: ${name}-deployment`,
          '  labels:',
          `    app: ${name}`,
          `    env: ${this.env}`,
          '    managed-by: devopsdsl-compiler',
          'spec:',
          `  replicas: ${replicas}`,
          '  selector:',
          '    matchLabels:',
          `      app: ${name}`,
          '  template:',
          '    metadata:',
          '      labels:',
          `        app: ${name}`,
          '    spec:',
          '      containers:',
          `      - name: ${name}`,
          `        image: ${node.attributes.image || name + ':latest'}`,
          '        ports:',
          `        - containerPort: ${targetPort}`,
          '        resources:',
          '          limits:',
          `            memory: "${memLimit.replace(/m$/i, 'Mi')}"`,
          `            cpu: "${cpuLimit}"`,
          '          requests:',
          '            memory: "128Mi"',
          '            cpu: "100m"'
        ];

        const svcLines = [
          'apiVersion: v1',
          'kind: Service',
          'metadata:',
          `  name: ${name}-service`,
          '  labels:',
          `    app: ${name}`,
          'spec:',
          `  type: ${['server', 'gateway', 'loadbalancer'].includes(node.type) ? 'NodePort' : 'ClusterIP'}`,
          '  selector:',
          `    app: ${name}`,
          '  ports:',
          `  - port: ${port}`,
          `    targetPort: ${targetPort}`
        ];

        docs.push(depLines.join('\n'));
        docs.push(svcLines.join('\n'));
      }

      return docs.join('\n---\n');
    }

    generateAnsible() {
      const lines = [
        '---',
        '# =========================================================================',
        `# DevOpsDSL Synthesized Ansible Playbook (${this.env.toUpperCase()} environment)`,
        '# Staged Idempotent Deployment Verified by Kahn Topological Sort',
        '# =========================================================================\n',
        `- name: Deploy DevOpsDSL Stack (${this.env})`,
        '  hosts: localhost',
        '  connection: local',
        '  become: true',
        '  tasks:'
      ];

      for (const stage of this.stages) {
        lines.push(`    # --- ${stage.stageName} ---`);
        for (const name of stage.resources) {
          const node = this.graph.get(name);
          if (node.type === 'network') {
            lines.push(`    - name: "[${stage.stageName}] Ensure Network ${name}"`);
            lines.push('      community.docker.docker_network:');
            lines.push(`        name: "${name}"`);
            lines.push(`        driver: "${node.attributes.driver || 'bridge'}"`);
            lines.push('        state: present\n');
          } else if (node.type === 'volume' || node.type === 'storage') {
            lines.push(`    - name: "[${stage.stageName}] Ensure Volume ${name}"`);
            lines.push('      community.docker.docker_volume:');
            lines.push(`        name: "${name}"`);
            lines.push('        state: present\n');
          } else {
            lines.push(`    - name: "[${stage.stageName}] Deploy Workload ${name}"`);
            lines.push('      community.docker.docker_container:');
            lines.push(`        name: "${name}"`);
            lines.push(`        image: "${node.attributes.image || name + ':latest'}"`);
            lines.push(`        restart_policy: "${node.attributes.restart || 'unless-stopped'}"`);
            if (node.attributes.ports?.length) {
              lines.push('        published_ports:');
              node.attributes.ports.forEach(p => lines.push(`          - "${p}"`));
            }
            lines.push('        state: started\n');
          }
        }
      }

      lines.push('    - name: "Verify Provisioning Summary"');
      lines.push('      ansible.builtin.debug:');
      lines.push(`        msg: "Provisioned ${this.graph.size} resources across ${this.stages.length} stages."`);
      return lines.join('\n');
    }

    generateGitHubActions() {
      return [
        `# Auto-synthesized CI/CD Delivery Workflow (.github/workflows/deploy-${this.env}.yml)`,
        `name: DevOpsDSL ${this.env.toUpperCase()} Pipeline`,
        'on:',
        '  push:',
        `    branches: [${this.env === 'prod' ? 'main' : 'develop'}]`,
        'jobs:',
        '  compile-and-verify:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - name: Run DevOpsDSL Compiler Verification',
        '        run: node tests/test_compiler.js',
        '      - name: Validate Synthesized Terraform Plan',
        '        run: terraform init -backend=false && terraform validate',
        '      - name: Lint Kubernetes Manifests',
        '        run: kubectl apply --dry-run=client -f k8s-manifest.yaml'
      ].join('\n');
    }
  }

  // =========================================================================
  // SHIFT-LEFT SECURITY LINTER + ONE-CLICK AUTO-REMEDIATION
  // =========================================================================
  class DevOpsLinter {
    constructor(symbolMap, options = {}) {
      this.symbolMap = symbolMap || new Map();
      this.env = options.env || 'dev';
      this.findings = [];
      this.score = 100;
    }

    lint() {
      const networks = Array.from(this.symbolMap.values()).filter(s => s.type === 'network').map(s => s.name);

      for (const [name, sym] of this.symbolMap.entries()) {
        const attrs = sym.attributes;

        // 1. Privileged port check
        if (attrs.port && attrs.port.type === 'NumberLiteral') {
          if (attrs.port.value < 1024 && attrs.port.value !== 80 && attrs.port.value !== 443) {
            this.findings.push({
              id: `fix-port-${name}`,
              level: 'warning',
              category: 'Least Privilege',
              target: name,
              line: attrs.port.line,
              code: 'DEV-SEC-001',
              title: `Privileged Port Binding (${attrs.port.value})`,
              description: `Port ${attrs.port.value} requires elevated kernel capabilities. Use >= 1024 (e.g., 8080) with reverse proxy.`,
              deduction: 6,
              fixable: true,
              fixAction: 'remappedPort'
            });
          }
        }

        // 2. Floating :latest image tag
        if (attrs.image && attrs.image.type === 'StringLiteral') {
          const val = attrs.image.value;
          if (val.endsWith(':latest') || !val.includes(':')) {
            const base = val.split(':')[0];
            const pinned = base.includes('nginx') ? 'nginx:1.25-alpine' : (base.includes('postgres') ? 'postgres:15.6-alpine' : `${base}:1.0.0-alpine`);
            this.findings.push({
              id: `fix-img-${name}`,
              level: 'warning',
              category: 'Supply Chain Immutability',
              target: name,
              line: attrs.image.line,
              code: 'DEV-OPS-002',
              title: `Floating Container Tag ('${val}')`,
              description: `Unpinned tag prevents deterministic rollbacks. Pin to immutable version like '${pinned}'.`,
              deduction: 5,
              fixable: true,
              fixAction: 'pinImage',
              suggestedValue: pinned
            });
          }
        }

        // 3. Single-Replica HA Check
        if (['server', 'gateway', 'loadbalancer'].includes(sym.type)) {
          const rep = attrs.replicas;
          if (!rep || (rep.type === 'NumberLiteral' && rep.value < 2)) {
            this.findings.push({
              id: `fix-ha-${name}`,
              level: this.env === 'prod' ? 'warning' : 'info',
              category: 'High Availability',
              target: name,
              line: sym.line,
              code: 'DEV-REL-003',
              title: `Single Replica Configured on '${name}'`,
              description: `Service runs 1 instance (Single Point of Failure). Set replicas = 2 for zero-downtime rolling upgrades.`,
              deduction: this.env === 'prod' ? 8 : 3,
              fixable: true,
              fixAction: 'addReplicas'
            });
          }
        }

        // 4. Unisolated Database Network Check
        if (sym.type === 'database') {
          const hasNetDep = sym.dependencies.some(d => this.symbolMap.get(d)?.type === 'network');
          if (!attrs.network && !attrs.networks && !hasNetDep) {
            this.findings.push({
              id: `fix-net-${name}`,
              level: 'warning',
              category: 'Network Segmentation',
              target: name,
              line: sym.line,
              code: 'DEV-NET-004',
              title: `Database '${name}' Lacks Private Network Isolation`,
              description: `Attach database to a dedicated private bridge/overlay network${networks.length ? ` (e.g., ${networks[0]})` : ''}.`,
              deduction: 8,
              fixable: networks.length > 0,
              fixAction: 'attachNetwork',
              suggestedNetwork: networks[0] || 'private_net'
            });
          }
        }
      }

      for (const f of this.findings) {
        this.score = Math.max(20, this.score - (f.deduction || 0));
      }

      let grade = 'A+';
      if (this.score < 70) grade = 'C';
      else if (this.score < 80) grade = 'B';
      else if (this.score < 90) grade = 'A-';
      else if (this.score < 97) grade = 'A';

      return {
        score: this.score,
        grade,
        findings: this.findings,
        passedChecks: Math.max(0, (this.symbolMap.size * 4) - this.findings.length),
        summary: `Audited ${this.symbolMap.size} resources (${this.env.toUpperCase()} policy). Score: ${this.score}/100 (${grade}).`
      };
    }

    static applyAutoFix(sourceCode, finding) {
      if (!sourceCode || !finding) return sourceCode;
      const lines = sourceCode.split('\n');
      const idx = Math.max(0, finding.line - 1);

      if (finding.fixAction === 'pinImage' && lines[idx]) {
        lines[idx] = lines[idx].replace(/image\s*=\s*["'][^"']+["']/, `image = "${finding.suggestedValue}"`);
        return lines.join('\n');
      }

      if (finding.fixAction === 'remappedPort' && lines[idx]) {
        lines[idx] = lines[idx].replace(/port\s*=\s*\d+/, 'port = 8080');
        return lines.join('\n');
      }

      if (finding.fixAction === 'addReplicas') {
        // Insert replicas = 2 right after block opening line of target
        const targetRegex = new RegExp(`^\\s*(?:server|gateway|loadbalancer)\\s+${finding.target}\\s*\\{`);
        for (let i = 0; i < lines.length; i++) {
          if (targetRegex.test(lines[i])) {
            // Check if replicas already exists in block
            let j = i + 1;
            let replaced = false;
            while (j < lines.length && !lines[j].includes('}')) {
              if (/^\s*replicas\s*=/.test(lines[j])) {
                lines[j] = '  replicas = 2';
                replaced = true;
                break;
              }
              j++;
            }
            if (!replaced) {
              lines.splice(i + 1, 0, '  replicas = 2');
            }
            return lines.join('\n');
          }
        }
      }

      if (finding.fixAction === 'attachNetwork') {
        const targetRegex = new RegExp(`^\\s*database\\s+${finding.target}\\s*\\{`);
        for (let i = 0; i < lines.length; i++) {
          if (targetRegex.test(lines[i])) {
            lines.splice(i + 1, 0, `  depends_on = [${finding.suggestedNetwork}]`);
            return lines.join('\n');
          }
        }
      }

      return sourceCode;
    }
  }

  // =========================================================================
  // SYNTAX HIGHLIGHTERS (SAFE HTML OUTPUT FOR DSL, HCL, YAML)
  // =========================================================================
  const Highlighters = {
    escape(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },

    highlightDSL(code) {
      const keywords = new Set(['server', 'database', 'network', 'volume', 'cache', 'loadbalancer', 'service', 'storage', 'gateway', 'queue']);
      const booleans = new Set(['true', 'false']);
      return code.split('\n').map(line => {
        let out = '';
        let i = 0;
        while (i < line.length) {
          const ch = line[i];
          if ((ch === '/' && line[i + 1] === '/') || ch === '#') {
            out += `<span class="hl-comment">${this.escape(line.slice(i))}</span>`;
            break;
          }
          if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < line.length && line[j] !== ch) {
              if (line[j] === '\\') j++;
              j++;
            }
            const strTok = line.slice(i, j + 1);
            out += `<span class="hl-string">${this.escape(strTok)}</span>`;
            i = j + 1;
            continue;
          }
          if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z0-9_-]/.test(line[i - 1]))) {
            let j = i;
            while (j < line.length && /[0-9.]/.test(line[j])) j++;
            out += `<span class="hl-number">${this.escape(line.slice(i, j))}</span>`;
            i = j;
            continue;
          }
          if (/[a-zA-Z_]/.test(ch)) {
            let j = i;
            while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
            const word = line.slice(i, j);
            if (keywords.has(word.toLowerCase())) {
              out += `<span class="hl-keyword">${this.escape(word)}</span>`;
            } else if (booleans.has(word.toLowerCase())) {
              out += `<span class="hl-bool">${this.escape(word)}</span>`;
            } else {
              // check if followed by '=' -> attribute key
              const rest = line.slice(j).trimStart();
              if (rest.startsWith('=')) out += `<span class="hl-attr">${this.escape(word)}</span>`;
              else out += `<span class="hl-ident">${this.escape(word)}</span>`;
            }
            i = j;
            continue;
          }
          if ('{}[]=,'.includes(ch)) {
            out += `<span class="hl-punct">${this.escape(ch)}</span>`;
            i++;
            continue;
          }
          out += this.escape(ch);
          i++;
        }
        return out || ' ';
      }).join('\n');
    },

    highlightTarget(code, format) {
      const hclKeywords = new Set(['terraform', 'required_providers', 'provider', 'resource', 'depends_on', 'ports']);
      return code.split('\n').map(line => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('#')) {
          return `<span class="hl-comment">${this.escape(line)}</span>`;
        }
        if (trimmed === '---') {
          return `<span class="hl-punct">---</span>`;
        }

        // Single-pass tokenizing highlighter (never corrupts inserted HTML tags)
        let out = '';
        let i = 0;
        let seenColon = false;
        while (i < line.length) {
          const ch = line[i];
          if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < line.length && line[j] !== ch) {
              if (line[j] === '\\') j++;
              j++;
            }
            out += `<span class="hl-string">${this.escape(line.slice(i, j + 1))}</span>`;
            i = j + 1;
            continue;
          }
          if (ch === '#') {
            out += `<span class="hl-comment">${this.escape(line.slice(i))}</span>`;
            break;
          }
          if (format === 'tf' && /[a-zA-Z_]/.test(ch)) {
            let j = i;
            while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
            const word = line.slice(i, j);
            if (hclKeywords.has(word)) out += `<span class="hl-keyword">${this.escape(word)}</span>`;
            else if (line.slice(j).trimStart().startsWith('=')) out += `<span class="hl-attr">${this.escape(word)}</span>`;
            else out += `<span class="hl-ident">${this.escape(word)}</span>`;
            i = j;
            continue;
          }
          if (format !== 'tf' && !seenColon && /[a-zA-Z0-9_.-]/.test(ch)) {
            // Possible YAML key before colon
            const colonIdx = line.indexOf(':', i);
            if (colonIdx > i && !line.slice(i, colonIdx).includes(' ')) {
              out += `<span class="hl-attr">${this.escape(line.slice(i, colonIdx))}</span><span class="hl-punct">:</span>`;
              i = colonIdx + 1;
              seenColon = true;
              continue;
            }
          }
          if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z0-9_.:/-]/.test(line[i - 1]))) {
            let j = i;
            while (j < line.length && /[0-9.]/.test(line[j])) j++;
            if (j < line.length && /[a-zA-Z_-]/.test(line[j])) {
              out += this.escape(line.slice(i, j));
            } else {
              out += `<span class="hl-number">${this.escape(line.slice(i, j))}</span>`;
            }
            i = j;
            continue;
          }
          out += this.escape(ch);
          i++;
        }
        return out || ' ';
      }).join('\n');
    }
  };

  // =========================================================================
  // PURE-JS PORTABLE ZIP ARCHIVER (WORKS STATICALLY ON GITHUB PAGES & LOCAL)
  // =========================================================================
  const MiniZip = {
    _crcTable: null,
    crc32(bytes) {
      if (!this._crcTable) {
        const tbl = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
          let c = n;
          for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
          tbl[n] = c >>> 0;
        }
        this._crcTable = tbl;
      }
      let crc = 0xffffffff;
      for (let i = 0; i < bytes.length; i++) {
        crc = this._crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
      }
      return (crc ^ 0xffffffff) >>> 0;
    },

    build(files) {
      const enc = new TextEncoder();
      const localParts = [];
      const centralParts = [];
      let offset = 0;

      for (const f of files) {
        const nameBytes = enc.encode(f.name);
        const dataBytes = enc.encode(f.content || '');
        const crc = this.crc32(dataBytes);
        const size = dataBytes.length;

        const lh = new ArrayBuffer(30);
        const lv = new DataView(lh);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0x0800, true); // UTF-8 flag
        lv.setUint16(8, 0, true);      // STORE method
        lv.setUint16(10, 0, true);
        lv.setUint16(12, 0, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, size, true);
        lv.setUint32(22, size, true);
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);

        const lBytes = new Uint8Array(lh);
        localParts.push(lBytes, nameBytes, dataBytes);

        const ch = new ArrayBuffer(46);
        const cv = new DataView(ch);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0x0800, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, size, true);
        cv.setUint32(24, size, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);

        centralParts.push(new Uint8Array(ch), nameBytes);
        offset += 30 + nameBytes.length + size;
      }

      let centralSize = centralParts.reduce((s, p) => s + p.length, 0);
      const eocd = new ArrayBuffer(22);
      const ev = new DataView(eocd);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(4, 0, true);
      ev.setUint16(6, 0, true);
      ev.setUint16(8, files.length, true);
      ev.setUint16(10, files.length, true);
      ev.setUint32(12, centralSize, true);
      ev.setUint32(16, offset, true);
      ev.setUint16(20, 0, true);

      const all = [...localParts, ...centralParts, new Uint8Array(eocd)];
      const total = all.reduce((s, p) => s + p.length, 0);
      const out = new Uint8Array(total);
      let cursor = 0;
      for (const chunk of all) {
        out.set(chunk, cursor);
        cursor += chunk.length;
      }
      return out;
    }
  };

  // =========================================================================
  // UNIFIED 5-PHASE COMPILER PIPELINE
  // =========================================================================
  class DevOpsCompilerPipeline {
    static compile(sourceCode, options = {}) {
      const env = options.env || 'dev';
      const nowFn = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
      const startTime = nowFn();

      const lexer = new DevOpsLexer(sourceCode);
      const lexerResult = lexer.tokenize();

      if (lexerResult.errors.length > 0) {
        return {
          success: false,
          env,
          stageFailed: 'Module 1: Lexical Analysis',
          lexerResult,
          parserResult: null,
          semanticResult: null,
          irResult: null,
          codeGenResult: null,
          linterResult: null,
          allErrors: lexerResult.errors,
          elapsedMs: (nowFn() - startTime).toFixed(2)
        };
      }

      const parser = new DevOpsParser(lexerResult.tokens);
      const parserResult = parser.parse();

      if (parserResult.errors.length > 0) {
        return {
          success: false,
          env,
          stageFailed: 'Module 2: Syntax Analysis',
          lexerResult,
          parserResult,
          semanticResult: null,
          irResult: null,
          codeGenResult: null,
          linterResult: null,
          allErrors: parserResult.errors,
          elapsedMs: (nowFn() - startTime).toFixed(2)
        };
      }

      const semantic = new DevOpsSemanticAnalyzer(parserResult.ast, { env });
      const semanticResult = semantic.analyze();

      if (semanticResult.errors.length > 0) {
        return {
          success: false,
          env,
          stageFailed: 'Module 3: Semantic Analysis',
          lexerResult,
          parserResult,
          semanticResult,
          irResult: null,
          codeGenResult: null,
          linterResult: null,
          allErrors: semanticResult.errors,
          elapsedMs: (nowFn() - startTime).toFixed(2)
        };
      }

      const irOptimizer = new DevOpsIROptimizer(semanticResult.symbolMap, { env });
      const irResult = irOptimizer.buildIR();

      const codeGen = new DevOpsCodeGenerator(irResult);
      const codeGenResult = codeGen.generateAll();

      const linter = new DevOpsLinter(semanticResult.symbolMap, { env });
      const linterResult = linter.lint();

      return {
        success: true,
        env,
        stageFailed: null,
        lexerResult,
        parserResult,
        semanticResult,
        irResult,
        codeGenResult,
        linterResult,
        allErrors: [],
        elapsedMs: (nowFn() - startTime).toFixed(2)
      };
    }
  }

  return {
    Lexer: DevOpsLexer,
    Parser: DevOpsParser,
    SemanticAnalyzer: DevOpsSemanticAnalyzer,
    IROptimizer: DevOpsIROptimizer,
    CodeGenerator: DevOpsCodeGenerator,
    Linter: DevOpsLinter,
    Highlighters,
    MiniZip,
    Pipeline: DevOpsCompilerPipeline
  };
});
