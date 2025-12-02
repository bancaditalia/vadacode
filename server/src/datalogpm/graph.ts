// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Basic implementation of graph functionality.
 * This package has been implemented to support the analysis of
 * module dependencies and the analysis of symbols.
 */
export type NodeAttributes = { [key: string]: any };
export type EdgeAtributes = { [key: string]: any };

/**
 * Graph node.
 *
 * @remarks A node is a vertex in the graph, has always an id and
 * can have attributes. This implementation stores edges in nodes
 * for faster traversals.
 */
export class Node {
  id: string;
  attributes: NodeAttributes;
  _sourceEdges: Edge[] = [];
  _targetEdges: Edge[] = [];

  /**
   * Creates an instance of Node.
   * @param {string} id unique identifier of the node
   * @param {NodeAttributes} attributes attributes of the node
   */
  constructor(id: string, attributes: NodeAttributes = {}) {
    this.id = id;
    this.attributes = attributes;
  }

  /**
   * Add an edge for which this node is a source.
   * @param edge Edge to add
   */
  _addSourceEdge(edge: Edge) {
    this._sourceEdges.push(edge);
  }

  /**
   * Add an edge for which this node is a target.
   * @param edge Edge to add
   */
  _addTargetEdge(edge: Edge) {
    this._targetEdges.push(edge);
  }

  /**
   * Get the edges arriving to this node.
   */
  get inEdges() {
    return this._targetEdges;
  }

  /**
   * Get the edges starting from this node.
   */
  get outEdges() {
    return this._sourceEdges;
  }

  /**
   * Get the string representation of the node.
   */
  toString() {
    return `Node(${this.id})`;
  }

  /**
   * Set the attributes of the node.
   * @param attributes Attributes to set
   */
  setAttributes(attributes: Partial<NodeAttributes>) {
    this.attributes = { ...this.attributes, ...attributes };
  }
}

/**
 * Graph edge.
 */
export class Edge {
  /** Source node */
  source: Node;
  /** Target node */
  target: Node;
  /** Edge attributes */
  attributes: EdgeAtributes;

  /**
   * Creates an instance of Edge from a source node to a target node.
   * @param source Source node
   * @param target Target node
   * @param attributes Edge attributes
   */
  constructor(source: Node, target: Node, attributes: EdgeAtributes = {}) {
    this.source = source;
    this.target = target;
    this.attributes = attributes;
  }

  /**
   * Get the string representation of the edge.
   * @returns String representation of the edge
   */
  toString() {
    return `Edge(${this.source.id}, ${this.target.id})`;
  }
}

/**
 * Check if an object contains another object (with the same values).
 * @param bigObject Container object
 * @param smallObject Contained object
 * @returns True if the big object contains the small object, false otherwise
 */
function objectContains(bigObject: any, smallObject: any) {
  for (const [key, value] of Object.entries(smallObject)) {
    if (!bigObject[key] || bigObject[key] !== smallObject[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Directed graph data structure.
 */
export class Graph {
  _nodes = new Map<string, Node>();
  _edges: Edge[] = [];

  /**
   * Get the nodes of the graph.
   * @returns Iterator of nodes
   */
  get nodes(): IterableIterator<Node> {
    return this._nodes.values();
  }

  /**
   * Get the edges of the graph.
   * @returns Array of edges
   */
  get edges(): Edge[] {
    return this._edges;
  }

  /**
   * Find a node by its id.
   */
  getNodeById(nodeId: string) {
    return this._nodes.get(nodeId);
  }

  /**
   *Get nodes by attributes.
   * @param attributes Attributes to filter nodes by
   * @returns Array of nodes
   */
  getNodesBy(attributes: Partial<NodeAttributes> = {}): Node[] {
    const nodes = this.filterNodes((node: Node) => {
      return objectContains(node.attributes, attributes);
    });
    return nodes;
  }

  /**
   * Get a node by attributes.
   *
   * @remarks This method returns the first node that matches the attributes.
   *
   * @param attributes Attributes to filter node by
   * @returns Node or undefined if no node matches the attributes
   */
  getNodeBy(attributes: Partial<NodeAttributes> = {}): Node | undefined {
    const nodes = this.getNodesBy(attributes);
    return nodes[0];
  }

  /**
   * Add a node to the graph.
   * @param id Node id
   * @param attributes Node attributes
   * @returns The node added to the graph
   */
  addNode(id: string, attributes: NodeAttributes = {}): Node {
    if (!this._nodes.get(id)) {
      const node = new Node(id, attributes);
      this._nodes.set(id, node);
    }
    return this._nodes.get(id)!;
  }

  /**
   * Add an edge to the graph.
   * @param source Source node
   * @param target Target node
   * @param attributes Edge attributes
   * @returns	The edge added to the graph
   */
  addEdge(
    source: string,
    target: string,
    attributes: EdgeAtributes = {}
  ): Edge {
    const sourceNode = this.addNode(source);
    const targetNode = this.addNode(target);

    const edge = new Edge(sourceNode, targetNode, attributes);
    this._edges.push(edge);

    sourceNode._addSourceEdge(edge);
    targetNode._addTargetEdge(edge);

    return edge;
  }

  /**
   * Remove a node from the graph.
   * @param nodeId Node id
   */
  removeNode(nodeId: string): void {
    this._nodes.delete(nodeId);
    this.removeEdgesFrom(nodeId);
    this.removeEdgesTo(nodeId);
  }

  /**
   * Remove an edge from the graph.
   * @param sourceId Source node id
   * @param targetId Target node id
   */
  removeEdgesTo(targetId: string): void {
    this._edges = this._edges.filter(
      (edge: Edge) => edge.target.id !== targetId
    );
  }

  /**
   * Remove edges from a node.
   * @param sourceId Source node id
   */
  removeEdgesFrom(sourceId: string): void {
    this._edges = this._edges.filter(
      (edge: Edge) => edge.source.id !== sourceId
    );
  }

  /**
   * Filter nodes by a predicate function.
   * @param predicate Predicate function used as a filter
   * @returns Array of nodes
   */
  filterNodes(
    predicate: (value: Node, index: number, array: Node[]) => boolean | unknown
  ): Node[] {
    return Array.from(this._nodes.values()).filter(predicate);
  }

  /**
   * Filter edges by a predicate function.
   * @param predicate Predicate function used as a filter
   * @returns Array of edges
   */
  filterEdges(
    predicate: (edge: Edge, index: number, array: Edge[]) => boolean | unknown
  ): Edge[] {
    return Array.from(this._edges.values()).filter(predicate);
  }

  /**
   * Breadth-first search of the graph.
   * @param start Start node id
   * @returns Traversed node ids
   */
  bfs(start: string): string[] {
    const queue = [start];
    const visited = new Set();
    const result: string[] = [];

    while (queue.length) {
      const vertex = queue.shift();
      if (!vertex) continue;

      if (!visited.has(vertex)) {
        visited.add(vertex);
        result.push(vertex);

        const neighbors = this.filterEdges(
          (edge: Edge) => edge.source.id === vertex
        ).map((edge: Edge) => edge.target.id);
        for (const neighbor of neighbors) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Traverse the graph from root to leaves.
   * @param callback Callback function to call for each edge
   */
  traverseRootToLeaves(callback: (sourceNode: Node, targetNode: Node) => void) {
    // Find nodes which don't depend on any other node
    const rootNodes = this.filterNodes((node: Node) => {
      return node.inEdges.length == 0;
    });
    const index = 0;

    const visitedNodes = new Set();

    function traverse(
      sourceNode: Node,
      callback: (sourceNode: Node, targetNode: Node) => void
    ) {
      visitedNodes.add(sourceNode);

      for (const outEdge of sourceNode.outEdges) {
        const targetNode = outEdge.target;

        callback(sourceNode, targetNode);

        if (!visitedNodes.has(targetNode)) {
          traverse(targetNode, callback);
        }
      }
    }

    for (const node of rootNodes) {
      traverse(node, callback);
    }
  }

  /**
   * Get the string representation of the graph.
   * @returns String representation of the graph
   */
  toString() {
    return `Graph {
	Nodes: ${Array.from(this.nodes)
    .map((node: Node) => `(${node.id})`)
    .join(", ")}
	Edges: ${Array.from(this.edges)
    .map((edge: Edge) => `(${edge.source.id})-[]->(${edge.target.id})`)
    .join(", ")}
}`;
  }

  /**
   * Get the JSON representation of the graph.
   * @param replacer Replacer function
   * @param space Space
   * @returns JSON representation of the graph
   */
  stringify(
    replacer?: undefined | ((this: any, key: string, value: any) => any),
    space?: string | number
  ) {
    return JSON.stringify(
      {
        nodes: Array.from(this.nodes).map((node: Node) => ({
          id: node.id,
          attributes: node.attributes,
        })),
        edges: Array.from(this.edges).map((edge: Edge) => ({
          source: edge.source.id,
          target: edge.target.id,
          attributes: edge.attributes,
        })),
      },
      replacer,
      space
    );
  }
}
