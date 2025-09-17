/**
 * TypeScript → LVG Adapter
 * Parses TypeScript/JavaScript into Lambda View Graph
 */

import * as ts from 'typescript'
import * as crypto from 'crypto'
import { LVG, LVGNode, LVGEdge, LVGAdapter } from '../types'

export class TypeScriptAdapter implements LVGAdapter {
  private nodes: Map<string, LVGNode> = new Map()
  private edges: LVGEdge[] = []

  parse(source: string, path: string): LVG {
    this.nodes.clear()
    this.edges = []

    const sourceFile = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true
    )

    this.visit(sourceFile, path)

    return {
      version: '1.0.0',
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      metadata: {
        repo_cid: '', // Will be filled by caller
        timestamp: Date.now(),
        lang: 'typescript',
        deterministic: true
      }
    }
  }

  private visit(node: ts.Node, filePath: string): void {
    switch (node.kind) {
      case ts.SyntaxKind.ModuleDeclaration:
      case ts.SyntaxKind.SourceFile:
        this.handleModule(node as ts.ModuleDeclaration | ts.SourceFile, filePath)
        break

      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.ArrowFunction:
        this.handleFunction(node as ts.FunctionDeclaration, filePath)
        break

      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
        this.handleType(node as ts.ClassDeclaration | ts.InterfaceDeclaration, filePath)
        break

      case ts.SyntaxKind.ImportDeclaration:
        this.handleImport(node as ts.ImportDeclaration, filePath)
        break

      case ts.SyntaxKind.CallExpression:
        this.handleCall(node as ts.CallExpression, filePath)
        break
    }

    // Recurse
    ts.forEachChild(node, child => this.visit(child, filePath))
  }

  private handleModule(node: ts.ModuleDeclaration | ts.SourceFile, filePath: string): void {
    const name = ts.isSourceFile(node) ? filePath : (node.name as ts.Identifier).text
    const sig = this.computeSignature(node)
    const id = this.computeId('module', sig)

    this.nodes.set(id, {
      id,
      kind: 'module',
      sig,
      attrs: new Map([
        ['name', name],
        ['path', filePath],
        ['size', node.end - node.pos],
        ['complexity', this.calculateComplexity(node)]
      ])
    })
  }

  private handleFunction(node: ts.FunctionDeclaration, filePath: string): void {
    const name = node.name?.text || '<anonymous>'
    const sig = this.computeSignature(node)
    const id = this.computeId('fn', sig)

    this.nodes.set(id, {
      id,
      kind: 'fn',
      sig,
      attrs: new Map([
        ['name', name],
        ['path', filePath],
        ['complexity', this.calculateComplexity(node)],
        ['params', node.parameters.length],
        ['async', !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)]
      ])
    })
  }

  private handleType(node: ts.ClassDeclaration | ts.InterfaceDeclaration, filePath: string): void {
    const name = node.name?.text || '<anonymous>'
    const sig = this.computeSignature(node)
    const id = this.computeId('type', sig)

    this.nodes.set(id, {
      id,
      kind: 'type',
      sig,
      attrs: new Map([
        ['name', name],
        ['path', filePath],
        ['members', node.members?.length || 0],
        ['abstract', ts.isClassDeclaration(node) &&
          !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword)]
      ])
    })
  }

  private handleImport(node: ts.ImportDeclaration, filePath: string): void {
    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text
    const srcId = this.computeId('module', this.hashString(filePath))
    const dstId = this.computeId('module', this.hashString(moduleSpecifier))

    this.edges.push({
      src: srcId,
      dst: dstId,
      rel: 'imports'
    })
  }

  private handleCall(node: ts.CallExpression, filePath: string): void {
    // TODO: Resolve call target and create 'calls' edge
    // This requires symbol resolution which is more complex
  }

  private computeSignature(node: ts.Node): string {
    // Create canonical representation
    const printer = ts.createPrinter({
      removeComments: true,
      newLine: ts.NewLineKind.LineFeed,
      omitTrailingSemicolon: true
    })

    const result = printer.printNode(
      ts.EmitHint.Unspecified,
      node,
      node.getSourceFile()
    )

    // Remove whitespace variations
    const normalized = result
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}();,])\s*/g, '$1')
      .trim()

    return this.hashString(normalized)
  }

  private computeId(kind: string, sig: string): string {
    const input = `${kind}:${sig}`
    return this.hashString(input).slice(0, 16)
  }

  private hashString(input: string): string {
    return crypto.createHash('blake3')
      .update(input)
      .digest('hex')
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1

    const visit = (n: ts.Node) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          complexity++
          break
      }
      ts.forEachChild(n, visit)
    }

    visit(node)
    return complexity
  }

  // Optional: Generate TypeScript from LVG (reverse direction)
  generate?(lvg: LVG): string {
    // TODO: Implement LVG → TypeScript generation
    // This would allow bidirectional transformation
    throw new Error('Not implemented yet')
  }

  // Incremental updates
  patch?(lvg: LVG, change: any): any {
    // TODO: Implement incremental LVG updates
    // For reactive mode
    throw new Error('Not implemented yet')
  }
}