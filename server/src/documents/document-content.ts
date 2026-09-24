import type { DocumentMarkerContentDto } from './dto/update-document-marker.dto';

type JsonObject = Record<string, unknown>;

export type DocumentMarkerContent = {
  type: 'text' | 'inlineMath';
  value: string;
};

export type DocumentMarkerView = {
  id: string;
  label: string | null;
  content: DocumentMarkerContent[];
};

export type DocumentMarkers = {
  documentId: string;
  version: number;
  markers: DocumentMarkerView[];
};

export type DocumentMarkerUpdateResult = {
  operationId: string;
  documentId: string;
  markerId: string;
  version: number;
  applied: boolean;
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function markerAttributes(value: unknown): JsonObject | null {
  if (!isJsonObject(value) || value.type !== 'recognitionMarker') {
    return null;
  }
  return isJsonObject(value.attrs) ? value.attrs : null;
}

function markerContent(value: JsonObject): DocumentMarkerContent[] {
  if (!Array.isArray(value.content)) return [];
  return value.content.flatMap((child): DocumentMarkerContent[] => {
    if (!isJsonObject(child)) return [];
    if (child.type === 'text' && typeof child.text === 'string') {
      return [{ type: 'text', value: child.text }];
    }
    if (
      child.type === 'inlineMath' &&
      isJsonObject(child.attrs) &&
      typeof child.attrs.latex === 'string'
    ) {
      return [{ type: 'inlineMath', value: child.attrs.latex }];
    }
    return [];
  });
}

export function findDocumentMarkers(content: object): DocumentMarkerView[] {
  const markers: DocumentMarkerView[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isJsonObject(value)) return;

    const attributes = markerAttributes(value);
    if (attributes && typeof attributes.id === 'string') {
      markers.push({
        id: attributes.id,
        label: typeof attributes.label === 'string' ? attributes.label : null,
        content: markerContent(value),
      });
      return;
    }
    if (Array.isArray(value.content)) value.content.forEach(visit);
  }

  visit(content);
  return markers;
}

function markerContentNodes(content: DocumentMarkerContentDto[]): JsonObject[] {
  return content.map((item) => {
    if (item.type === 'text') return { type: 'text', text: item.value };
    return { type: 'inlineMath', attrs: { latex: item.value } };
  });
}

export function updateDocumentMarkerContent(
  content: object,
  markerId: string,
  markerContentValue: DocumentMarkerContentDto[],
): { content: object; matches: number } {
  let matches = 0;

  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!isJsonObject(value)) return value;

    const attributes = markerAttributes(value);
    if (attributes?.id === markerId) {
      matches += 1;
      const next = { ...value };
      const nextContent = markerContentNodes(markerContentValue);
      if (nextContent.length > 0) next.content = nextContent;
      else delete next.content;
      return next;
    }
    if (!Array.isArray(value.content)) return { ...value };
    return { ...value, content: value.content.map(visit) };
  }

  const updated = visit(content);
  if (!isJsonObject(updated)) return { content, matches };
  return { content: updated, matches };
}
