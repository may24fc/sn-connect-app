import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const roots = ['apps/web/src', 'packages/ui/src'];
const onlyMissing = process.argv.includes('--missing');
const summaryOnly = process.argv.includes('--summary');
const textControlNames = new Set(['Input', 'Textarea', 'input', 'textarea']);
const nonTextTypes = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'month',
  'number',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'week',
]);

function collectTsxFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collectTsxFiles(entryPath, files);
    } else if (entry.name.endsWith('.tsx')) {
      files.push(entryPath);
    }
  }

  return files;
}

function getAttributes(node, sourceFile) {
  const attributes = new Map();

  for (const property of node.attributes.properties) {
    if (ts.isJsxAttribute(property)) {
      attributes.set(
        property.name.getText(sourceFile),
        property.initializer?.getText(sourceFile) ?? 'true'
      );
    }
  }

  return attributes;
}

function unquote(value) {
  return value?.replace(/^['"]|['"]$/g, '') ?? '';
}

const findings = [];

for (const filePath of roots.flatMap((root) => collectTsxFiles(root))) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const control = node.tagName.getText(sourceFile);

      if (textControlNames.has(control)) {
        const attributes = getAttributes(node, sourceFile);
        const rawType = attributes.get('type');
        const inputType = rawType ? unquote(rawType) : 'text';

        if (!nonTextTypes.has(inputType)) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          findings.push({
            file: filePath.replaceAll('\\', '/'),
            line: position.line + 1,
            control,
            inputType,
            field:
              attributes.get('name') ??
              attributes.get('id') ??
              attributes.get('value') ??
              attributes.get('placeholder') ??
              '',
            maxLength: attributes.get('maxLength') ?? '',
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (!summaryOnly) {
  console.info('file\tline\tcontrol\ttype\tfield\tmaxLength');
  for (const finding of findings) {
    if (onlyMissing && finding.maxLength) continue;

    console.info(
      [
        finding.file,
        finding.line,
        finding.control,
        finding.inputType,
        finding.field.replaceAll('\t', ' '),
        finding.maxLength,
      ].join('\t')
    );
  }
}

const missingCount = findings.filter((finding) => !finding.maxLength).length;
console.error(
  `Audited ${findings.length} text controls; ${missingCount} have no explicit maxLength.`
);
