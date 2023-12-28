import { GoogleDoc } from "../google_fns";

let currentDoc: GoogleDoc | undefined;
let defaultDoc: GoogleDoc | undefined;

let allDocs: Array<GoogleDoc> = [];

export function getAllDocs() {
  return allDocs;
}

export function setAllDocs(docs: Array<GoogleDoc>) {
  allDocs = docs;
}

export function getCurrentDoc() {
  return currentDoc;
}

export function setCurrentDoc(doc: GoogleDoc) {
  currentDoc = doc;
}

export function getDefaultDoc() {
  return defaultDoc;
}

export function setDefaultDoc(doc: GoogleDoc) {
  defaultDoc = doc;
}
