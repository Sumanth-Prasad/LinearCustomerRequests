import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DecoratorNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  LexicalNode
} from "lexical";

type SerializedMentionNode = Spread<
  {
    id: string;
    label: string;
    type: "mention";
    version: 1;
  },
  SerializedLexicalNode
>;

export class MentionNode extends DecoratorNode<React.ReactNode> {
  __id: string;
  __label: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode) {
    return new MentionNode(node.__id, node.__label, node.__key);
  }

  constructor(id: string, label: string, key?: NodeKey) {
    super(key);
    this.__id = id;
    this.__label = label;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "inline-block";
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const { id, label } = serializedNode;
    return new MentionNode(id, label);
  }

  exportJSON(): SerializedMentionNode {
    return {
      id: this.__id,
      label: this.__label,
      type: "mention",
      version: 1,
    };
  }

  decorate(): React.ReactNode {
    return (
      <Badge variant="secondary" className="mention-badge cursor-pointer">
        @{this.__label}
      </Badge>
    );
  }
}

// This ensures we have a single global reference 
export const MENTION_NODE_TYPE = MentionNode.getType(); 