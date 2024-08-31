#!/usr/bin/env node
type LinkMapping = {
    linkDestination: string;
    relativeURL: string;
};
export declare function getURLs(projectReflectionJSON: unknown): Promise<LinkMapping[]>;
export {};
