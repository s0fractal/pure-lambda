/**
 * LVG Type Definitions
 */

export type NodeKind = 'module' | 'fn' | 'type' | 'resource' | 'asset' | 'concept'
export type EdgeRel = 'calls' | 'imports' | 'refines' | 'tests' | 'generates' | 'proves'

export interface LVGNode {
  id: string
  kind: NodeKind
  sig: string
  attrs: Map<string, any>
}

export interface LVGEdge {
  src: string
  dst: string
  rel: EdgeRel
  weight?: number
}

export interface LVG {
  version: string
  nodes: LVGNode[]
  edges: LVGEdge[]
  metadata: {
    repo_cid: string
    timestamp: number
    lang: string
    deterministic: boolean
  }
}

export interface LVGPatch {
  type: 'add' | 'change' | 'remove'
  timestamp: number
  operations: PatchOperation[]
}

export type PatchOperation =
  | { op: 'addNode', node: LVGNode }
  | { op: 'removeNode', nodeId: string }
  | { op: 'updateNode', node: LVGNode }
  | { op: 'addEdge', edge: LVGEdge }
  | { op: 'removeEdge', edge: LVGEdge }

export interface LVGAdapter {
  parse(source: string, path: string): LVG
  generate?(lvg: LVG): string
  patch?(lvg: LVG, change: any): LVGPatch
}