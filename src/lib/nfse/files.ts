import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/lib/config/env";

export function filesRoot() {
  const root = path.resolve(getEnv().FILES_PATH);
  fs.mkdirSync(path.join(root, "xml"), { recursive: true });
  fs.mkdirSync(path.join(root, "pdf"), { recursive: true });
  return root;
}

export function xmlPathFor(chave: string) {
  return path.join(filesRoot(), "xml", `${chave}.xml`);
}

export function pdfPathFor(chave: string) {
  return path.join(filesRoot(), "pdf", `${chave}.pdf`);
}

export function saveXmlFile(chave: string, xml: string) {
  const filePath = xmlPathFor(chave);
  fs.writeFileSync(filePath, xml, "utf8");
  return filePath;
}

export function savePdfFile(chave: string, pdf: Buffer) {
  const filePath = pdfPathFor(chave);
  fs.writeFileSync(filePath, pdf);
  return filePath;
}

export function readPdfFile(chave: string) {
  const filePath = pdfPathFor(chave);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function readXmlFile(chave: string) {
  const filePath = xmlPathFor(chave);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

export function hasPdfFile(chave: string) {
  return fs.existsSync(pdfPathFor(chave));
}

export function hasXmlFile(chave: string) {
  return fs.existsSync(xmlPathFor(chave));
}
