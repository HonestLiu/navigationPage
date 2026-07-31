export interface NavItem {
    id: number;
    name: string;
    url: string;
    icon: string;
    color: string;
    category: string;
    sort_order?: number;
}

export interface Engine {
    id: string;
    name: string;
    url: string;
    icon: string;
    color: string;
    sort_order?: number;
}

export interface Todo {
    id: number;
    text: string;
    done: boolean;
}

export interface Note {
    id: number;
    title: string;
    content: string;
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ClipboardItem {
    id: number;
    text: string;
}

export interface DnsEntry {
    domain: string;
    ip: string;
    note?: string;
}

export interface AirdropFile {
    id: string;
    name: string;
    size: number;
    mime: string;
    expiresAt: number;
    createdAt: number;
    downloadUrl: string;
}

export interface ToolConfig {
    id: string;
    name: string;
    icon: string;
    enabled: boolean;
}
