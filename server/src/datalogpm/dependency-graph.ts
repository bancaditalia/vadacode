// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Generic implementation of a dependency graph.
 */

import { Edge, Graph, Node, NodeAttributes } from "./graph";

/**
 * Class representing a generic dependency graph, where
 * each node (string) can depend on other nodes.
 */
export class DependencyGraph extends Graph {
  addDependencyOfOn(of: string, on: string) {
    this.addEdge(of, on);
  }

  removeDependenciesOf(of: string) {
    this.removeEdgesFrom(of);
  }

  setNodeAttributes(id: string, attributes: NodeAttributes) {
    const node = this.addNode(id);
    node.attributes = Object.assign(node.attributes, attributes);
  }

  getTemporalAtoms() {
    this.traverseRootToLeaves((sourceNode: Node, targetNode: Node) => {
      if (sourceNode.attributes["temporal"]) {
        targetNode.attributes["temporal"] = true;
      }
    });

    const temporalNodes = this.filterNodes((node: Node) => {
      return node.attributes["temporal"];
    });

    return temporalNodes.map((node: Node) => node.id);
  }

  atomsDependingOnThemselves() {
    const recursiveAtoms = this.filterEdges((edge: Edge) => {
      return edge.source.id === edge.target.id;
    });
    return recursiveAtoms.map((edge: Edge) => edge.source.id);
  }
}
